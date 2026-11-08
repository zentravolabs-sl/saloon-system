import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

const TRANSIENT_ERROR_PATTERNS = [
  "Connection terminated",
  "ConnectionReset",
  "ECONNRESET",
  "ETIMEDOUT",
  "EPIPE",
  "57P01", // admin_shutdown when Neon suspends compute
  "08006", // connection_failure
  "08003", // connection_does_not_exist
];

function isTransientConnectionError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const message =
    (err as { message?: string }).message ||
    String((err as { cause?: unknown }).cause || "");
  return TRANSIENT_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}

function createPool() {
  const p = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 20000,
    connectionTimeoutMillis: 30000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  });

  // Neon scales compute to zero when idle and drops open sockets; handle
  // background idle-client errors so the pool opens a fresh connection on
  // the next query instead of throwing an unhandled error.
  p.on("error", (err) => {
    console.warn(
      "[prisma/pg-pool] Idle client error (likely Neon scale-to-zero):",
      err.message
    );
  });

  return p;
}

function createPrismaClient(poolInstance: Pool): PrismaClient {
  const adapter = new PrismaPg(poolInstance);
  const baseClient = new PrismaClient({
    adapter,
    transactionOptions: { maxWait: 30000, timeout: 30000 },
  });

  return baseClient.$extends({
    query: {
      $allOperations: async ({ args, query }) => {
        try {
          return await query(args);
        } catch (err) {
          if (isTransientConnectionError(err)) {
            console.warn(
              "[prisma] Transient DB connection error (Neon cold start/wake-up), retrying once..."
            );
            await new Promise((resolve) => setTimeout(resolve, 400));
            return await query(args);
          }
          throw err;
        }
      },
    },
  }) as unknown as PrismaClient;
}

const pool = globalForPrisma.pool ?? createPool();

export const prisma = globalForPrisma.prisma ?? createPrismaClient(pool);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}
