import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { ApiError, type AccessContext } from "@/lib/ops/access";

export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB

type Kind = "EXPENSE_RECEIPT" | "PRODUCT_IMAGE";

const RECEIPT_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Detects the real type from magic bytes; the client-declared MIME type is never trusted */
export function sniffMime(buf: Uint8Array): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  )
    return "image/png";
  if (
    buf.length >= 12 &&
    String.fromCharCode(...buf.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...buf.slice(8, 12)) === "WEBP"
  )
    return "image/webp";
  if (buf.length >= 5 && String.fromCharCode(...buf.slice(0, 5)) === "%PDF-") return "application/pdf";
  return null;
}

export function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() || "file";
  return base.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "file";
}

export async function readUpload(file: File, kind: Kind) {
  const maxBytes = kind === "EXPENSE_RECEIPT" ? MAX_RECEIPT_BYTES : MAX_IMAGE_BYTES;
  const allowed = kind === "EXPENSE_RECEIPT" ? RECEIPT_TYPES : IMAGE_TYPES;
  if (file.size === 0) throw new ApiError(400, "The uploaded file is empty");
  if (file.size > maxBytes) {
    throw new ApiError(413, `File is too large (max ${Math.round(maxBytes / 1024 / 1024)} MB)`);
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffMime(bytes);
  if (!mime || !allowed.includes(mime)) {
    throw new ApiError(
      415,
      kind === "EXPENSE_RECEIPT"
        ? "Unsupported file type. Allowed: PDF, JPEG, PNG, WEBP"
        : "Unsupported image type. Allowed: JPEG, PNG, WEBP"
    );
  }
  return { bytes, mime, size: file.size, fileName: safeFileName(file.name) };
}

export async function storeFile(
  client: Prisma.TransactionClient | typeof prisma,
  ctx: Pick<AccessContext, "salonId" | "userId">,
  kind: Kind,
  upload: Awaited<ReturnType<typeof readUpload>>
) {
  return client.storedFile.create({
    data: {
      salonId: ctx.salonId,
      kind,
      fileName: upload.fileName,
      mimeType: upload.mime,
      size: upload.size,
      data: Buffer.from(upload.bytes),
      uploadedById: ctx.userId,
    },
    select: { id: true, fileName: true, mimeType: true, size: true },
  });
}
