import { prisma } from "@/lib/prisma";
import { route, parseBody } from "@/lib/ops/api";
import { ApiError, assertBranchAccess, branchWhere } from "@/lib/ops/access";
import { audit, nextNumber, userNames } from "@/lib/ops/audit";
import { D, qty, rate4 } from "@/lib/money";
import { transferStock } from "@/lib/ops/inventory";
import { transferSchema } from "@/lib/ops/inventory-schemas";
import { assertProductsInSalon } from "@/lib/ops/lookups";

export const GET = route({ permission: "inventory.view" }, async ({ ctx }) => {
  const scope = await branchWhere(ctx);
  const transfers = await prisma.stockTransfer.findMany({
    where: {
      salonId: ctx.salonId,
      OR: [{ fromBranchId: scope.branchId }, { toBranchId: scope.branchId }],
    },
    include: {
      fromBranch: { select: { id: true, name: true } },
      toBranch: { select: { id: true, name: true } },
      items: { include: { product: { select: { name: true, sku: true, unit: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const names = await userNames(transfers.map((t) => t.createdById));
  return { transfers: transfers.map((t) => ({ ...t, createdByName: names[t.createdById] || null })) };
});

/** Branch-to-branch transfer. Caller must have access to the SOURCE branch. */
export const POST = route({ permission: "inventory.manage", write: true }, async ({ ctx, req }) => {
  const body = await parseBody(req, transferSchema);
  await assertBranchAccess(ctx, body.fromBranchId);
  // Destination must be a branch of the SAME salon (it may be outside the caller's own branch scope)
  const dest = await prisma.branch.findFirst({ where: { id: body.toBranchId, salonId: ctx.salonId }, select: { id: true } });
  if (!dest) throw new ApiError(404, "Destination branch not found");
  if (body.fromBranchId === body.toBranchId) throw new ApiError(400, "Source and destination branch must differ");

  await assertProductsInSalon(ctx, body.items.map((i) => i.productId));

  const transfer = await prisma.$transaction(
    async (tx) => {
      const transferNumber = await nextNumber(tx, ctx.salonId, "TRANSFER", "TRF", 5);
      const created = await tx.stockTransfer.create({
        data: {
          salonId: ctx.salonId,
          fromBranchId: body.fromBranchId,
          toBranchId: body.toBranchId,
          transferNumber,
          notes: body.notes,
          createdById: ctx.userId,
        },
      });
      const out = await transferStock(tx, {
        salonId: ctx.salonId,
        fromBranchId: body.fromBranchId,
        toBranchId: body.toBranchId,
        transferId: created.id,
        userId: ctx.userId,
        reason: body.notes || `Transfer ${transferNumber}`,
        lines: body.items.map((i) => ({ productId: i.productId, quantity: D(i.quantity) })),
      });
      await tx.stockTransferItem.createMany({
        data: Array.from(out.values()).map((r) => ({
          transferId: created.id,
          productId: r.productId,
          quantity: qty(r.quantity),
          unitCost: rate4(r.unitCost),
        })),
      });
      await audit(tx, ctx, "STOCK_TRANSFER", "StockTransfer", created.id, {
        metadata: { from: body.fromBranchId, to: body.toBranchId, lines: body.items.length, number: transferNumber },
        req,
      });
      return created;
    },
    { timeout: 30000 }
  );
  return Response.json({ transfer }, { status: 201 });
});
