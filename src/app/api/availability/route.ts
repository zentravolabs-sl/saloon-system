import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { availabilityCheckSchema } from "@/lib/validations";
import { getAvailableSlots } from "@/lib/availability";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");
    const staffId = searchParams.get("staffId");
    const serviceIdsParam = searchParams.get("serviceIds");
    const date = searchParams.get("date");
    const excludeBookingId = searchParams.get("excludeBookingId") || undefined;

    if (!branchId || !staffId || !serviceIdsParam || !date) {
      return NextResponse.json(
        { error: "Missing required query parameters: branchId, staffId, serviceIds, date" },
        { status: 400 }
      );
    }

    const serviceIds = serviceIdsParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (serviceIds.length === 0) {
      return NextResponse.json(
        { error: "At least one serviceId must be provided" },
        { status: 400 }
      );
    }

    const result = await getAvailableSlots({
      branchId,
      staffId,
      serviceIds,
      date,
      excludeBookingId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Availability GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = availabilityCheckSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { branchId, staffId, serviceIds, date } = parsed.data;

    const result = await getAvailableSlots({
      branchId,
      staffId,
      serviceIds,
      date,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Availability check error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
