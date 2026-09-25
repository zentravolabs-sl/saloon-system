import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { staffLeaveSchema } from "@/lib/validations";
import { checkSalonApproval } from "@/lib/salon-status";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const salonId = session.user.salonId;
    const staffId = searchParams.get("staffId");

    if (!salonId) return NextResponse.json({ error: "Salon not found" }, { status: 404 });

    const where: any = { salonId };
    if (staffId) where.staffId = staffId;

    const leaves = await prisma.staffLeave.findMany({
      where,
      include: {
        staff: { select: { id: true, name: true, photo: true } },
      },
      orderBy: { startDate: "desc" },
    });

    return NextResponse.json({ leaves });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = staffLeaveSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { staffId } = body;
    if (!staffId) return NextResponse.json({ error: "Staff ID is required" }, { status: 400 });

    const staff = await prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

    if (session.user.salonId !== staff.salonId && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const approvalCheck = await checkSalonApproval(staff.salonId, session.user.role);
    if (!approvalCheck.approved) {
      return NextResponse.json({ error: approvalCheck.error }, { status: 403 });
    }

    // Check for conflicting bookings during leave period
    const startDate = new Date(parsed.data.startDate);
    const endDate = new Date(parsed.data.endDate);

    const conflictingBookings = await prisma.booking.count({
      where: {
        staffId,
        bookingDate: { gte: startDate, lte: endDate },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
    });

    const leave = await prisma.staffLeave.create({
      data: {
        staffId,
        salonId: staff.salonId,
        ...parsed.data,
        startDate,
        endDate,
        approved: true,
        approvedBy: session.user.id,
      },
      include: {
        staff: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(
      {
        leave,
        conflictingBookings,
        warning:
          conflictingBookings > 0
            ? `${conflictingBookings} bookings are affected during this leave period.`
            : null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create leave error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
