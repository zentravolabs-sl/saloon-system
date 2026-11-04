import { NextResponse } from "next/server";
import { ZodError, ZodType } from "zod";
import {
  AccessContext,
  ApiError,
  Permission,
  getAccessContext,
  requireApprovedSalon,
  requirePermission,
} from "@/lib/ops/access";

interface RouteOptions {
  /** Caller must hold at least ONE of these permissions */
  permission: Permission | Permission[];
  /** Mutating route: additionally requires the salon to be APPROVED */
  write?: boolean;
}

export interface RouteArgs<P> {
  ctx: AccessContext;
  req: Request;
  params: P;
}

/**
 * Wraps a route handler with authentication, permission and tenant checks plus
 * uniform, non-leaky error handling.
 */
export function route<P = Record<string, string>>(
  options: RouteOptions,
  handler: (args: RouteArgs<P>) => Promise<unknown>
) {
  return async (req: Request, routeCtx: { params: Promise<P> }) => {
    try {
      const ctx = await getAccessContext();
      requirePermission(ctx, options.permission);
      if (options.write) await requireApprovedSalon(ctx);
      const params = (routeCtx?.params ? await routeCtx.params : {}) as P;
      const result = await handler({ ctx, req, params });
      if (result instanceof Response) return result;
      return NextResponse.json(result ?? { ok: true });
    } catch (error) {
      return errorResponse(error);
    }
  };
}

export function errorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, ...(error.details ? { details: error.details } : {}) },
      { status: error.status }
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Validation failed", details: error.flatten() },
      { status: 400 }
    );
  }
  const code = (error as { code?: string })?.code;
  if (code === "P2002") {
    return NextResponse.json({ error: "A record with these details already exists" }, { status: 409 });
  }
  if (code === "P2025") {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }
  // Do not log request bodies / financial payloads - only the error identity
  console.error("[ops] unhandled error:", (error as Error)?.name, (error as Error)?.message);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new ApiError(400, "Invalid JSON body");
  }
  return schema.parse(json);
}

export function parseQuery<T>(req: Request, schema: ZodType<T>): T {
  const { searchParams } = new URL(req.url);
  const obj: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    if (value !== "") obj[key] = value;
  });
  return schema.parse(obj);
}

export function csvResponse(filename: string, rows: (string | number | null | undefined)[][]) {
  const escape = (v: string | number | null | undefined) => {
    let s = v === null || v === undefined ? "" : String(v);
    // Neutralise spreadsheet formula injection
    if (/^[=+\-@\t\r]/.test(s) && Number.isNaN(Number(s))) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = "\uFEFF" + rows.map((r) => r.map(escape).join(",")).join("\r\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
