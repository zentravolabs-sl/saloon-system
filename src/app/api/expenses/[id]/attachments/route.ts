import { prisma } from "@/lib/prisma";
import { route } from "@/lib/ops/api";
import { ApiError, assertBranchAccess, can } from "@/lib/ops/access";
import { audit } from "@/lib/ops/audit";
import { readUpload, storeFile } from "@/lib/ops/files";

type P = { id: string };

const MAX_ATTACHMENTS = 10;

async function loadOwned(ctx: Parameters<typeof assertBranchAccess>[0], id: string) {
  const expense = await prisma.expense.findFirst({
    where: { id, salonId: ctx.salonId, deletedAt: null },
    select: { id: true, branchId: true, status: true, createdById: true },
  });
  if (!expense) throw new ApiError(404, "Expense not found");
  await assertBranchAccess(ctx, expense.branchId);
  return expense;
}

export const POST = route<P>({ permission: "expense.create", write: true }, async ({ ctx, req, params }) => {
  const expense = await loadOwned(ctx, params.id);
  if (expense.status === "VOIDED") throw new ApiError(409, "Cannot attach files to a voided expense");
  if (expense.createdById !== ctx.userId && !can(ctx.role, "expense.edit")) {
    throw new ApiError(403, "Forbidden");
  }

  const count = await prisma.expenseAttachment.count({ where: { expenseId: expense.id } });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new ApiError(400, "Expected multipart/form-data");
  }
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) throw new ApiError(400, "No files provided");
  if (count + files.length > MAX_ATTACHMENTS) {
    throw new ApiError(400, `At most ${MAX_ATTACHMENTS} attachments per expense`);
  }

  // Validate everything first so a bad file does not leave partial uploads
  const uploads: Array<Awaited<ReturnType<typeof readUpload>>> = [];
  for (const f of files) uploads.push(await readUpload(f, "EXPENSE_RECEIPT"));

  const created = await prisma.$transaction(async (tx) => {
    const out = [];
    for (const u of uploads) {
      const stored = await storeFile(tx, ctx, "EXPENSE_RECEIPT", u);
      out.push(
        await tx.expenseAttachment.create({
          data: {
            expenseId: expense.id,
            fileId: stored.id,
            fileName: stored.fileName,
            mimeType: stored.mimeType,
            size: stored.size,
          },
          select: { id: true, fileId: true, fileName: true, mimeType: true, size: true },
        })
      );
    }
    await audit(tx, ctx, "EXPENSE_ATTACHMENT_ADDED", "Expense", expense.id, {
      metadata: { files: out.map((o) => ({ name: o.fileName, size: o.size })) },
      req,
    });
    return out;
  });
  return Response.json({ attachments: created }, { status: 201 });
});

export const DELETE = route<P>({ permission: "expense.edit", write: true }, async ({ ctx, req, params }) => {
  const expense = await loadOwned(ctx, params.id);
  const attachmentId = new URL(req.url).searchParams.get("attachmentId");
  if (!attachmentId) throw new ApiError(400, "attachmentId is required");
  const att = await prisma.expenseAttachment.findFirst({ where: { id: attachmentId, expenseId: expense.id } });
  if (!att) throw new ApiError(404, "Attachment not found");

  await prisma.$transaction(async (tx) => {
    await tx.expenseAttachment.delete({ where: { id: att.id } });
    await tx.storedFile.delete({ where: { id: att.fileId } });
    await audit(tx, ctx, "EXPENSE_ATTACHMENT_REMOVED", "Expense", expense.id, {
      metadata: { name: att.fileName },
      req,
    });
  });
  return { ok: true };
});
