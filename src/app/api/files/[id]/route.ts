import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ApiError, getAccessContext, assertBranchAccess, can } from "@/lib/ops/access";
import { errorResponse } from "@/lib/ops/api";

/**
 * Authenticated, tenant-checked file download for receipts and product images.
 * Files are never publicly addressable.
 */
export async function GET(req: Request, routeCtx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await routeCtx.params;
    await auth();
    const ctx = await getAccessContext();

    const file = await prisma.storedFile.findFirst({ where: { id, salonId: ctx.salonId } });
    if (!file) throw new ApiError(404, "File not found");

    if (file.kind === "EXPENSE_RECEIPT") {
      if (!can(ctx.role, "expense.view")) throw new ApiError(403, "Forbidden");
      const att = await prisma.expenseAttachment.findFirst({
        where: { fileId: file.id },
        select: { expense: { select: { branchId: true } } },
      });
      if (att) await assertBranchAccess(ctx, att.expense.branchId);
    } else if (file.kind === "PRODUCT_IMAGE") {
      if (!can(ctx.role, "inventory.view") && !can(ctx.role, "pos.sell")) throw new ApiError(403, "Forbidden");
    } else {
      throw new ApiError(403, "Forbidden");
    }

    const inline = new URL(req.url).searchParams.get("download") !== "1";
    return new Response(new Uint8Array(file.data), {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Length": String(file.size),
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${encodeURIComponent(file.fileName)}"`,
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
