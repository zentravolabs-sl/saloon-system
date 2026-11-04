import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import type { AccessContext } from "@/lib/ops/access";

type Client = Prisma.TransactionClient | typeof prisma;

/**
 * Writes an audit record for sensitive financial / stock operations.
 * Pass the transaction client so the audit row commits atomically with the change.
 * Never put customer PII or secrets in oldData/newData/metadata.
 */
export async function audit(
  client: Client,
  ctx: Pick<AccessContext, "userId" | "salonId">,
  action: string,
  entity: string,
  entityId: string | null,
  data?: { oldData?: unknown; newData?: unknown; metadata?: unknown; req?: Request }
) {
  const headers = data?.req?.headers;
  await client.auditLog.create({
    data: {
      userId: ctx.userId,
      salonId: ctx.salonId,
      action,
      entity,
      entityId,
      oldData: toJson(data?.oldData),
      newData: toJson(data?.newData),
      metadata: toJson(data?.metadata),
      ipAddress: headers?.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      userAgent: headers?.get("user-agent")?.slice(0, 250) || null,
    },
  });
}

function toJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;
  // Decimal/Date safe serialisation
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

/** Resolves user IDs (createdBy / approvedBy ...) to display names in one query */
export async function userNames(ids: (string | null | undefined)[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(ids.filter((x): x is string => !!x)));
  if (unique.length === 0) return {};
  const users = await prisma.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, name: true },
  });
  return Object.fromEntries(users.map((u) => [u.id, u.name]));
}

/** Atomic, gap-free-on-rollback per-salon document numbers e.g. SALE-000012 */
export async function nextNumber(
  tx: Prisma.TransactionClient,
  salonId: string,
  kind: string,
  prefix: string,
  pad = 6
): Promise<string> {
  const row = await tx.documentSequence.upsert({
    where: { salonId_kind: { salonId, kind } },
    create: { salonId, kind, lastValue: 1 },
    update: { lastValue: { increment: 1 } },
  });
  return `${prefix}-${String(row.lastValue).padStart(pad, "0")}`;
}
