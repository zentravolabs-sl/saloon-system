import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { branchClosureSchema } from "@/lib/validations";
import { checkSalonApproval } from "@/lib/salon-status";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const branch = await prisma.branch.findUnique({ where: { id } });
    if (!branch) return NextResponse.json({ error: "Branch not found" }, { status: 404 });

    if (session.user.role !== "SUPER_ADMIN" && session.user.salonId !== branch.salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const closures = await prisma.branchClosure.findMany({
      where: {
        branchId: id,
        ...(from || to
          ? {
              date: {
                ...(from && { gte: new Date(from) }),
                ...(to && { lte: new Date(to) }),
              },
            }
          : {}),
      },
      orderBy: { date: "asc" },
    });

    return NextResponse.json({ closures });
  } catch (error) {
    console.error("Get closures error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const branch = await prisma.branch.findUnique({ where: { id } });
    if (!branch) return NextResponse.json({ error: "Branch not found" }, { status: 404 });

    if (session.user.role !== "SUPER_ADMIN" && session.user.salonId !== branch.salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const approvalCheck = await checkSalonApproval(branch.salonId, session.user.role);
    if (!approvalCheck.approved) {
      return NextResponse.json({ error: approvalCheck.error }, { status: 403 });
    }

    const parsed = branchClosureSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const closureDate = new Date(parsed.data.date);

    // Check for affected bookings
    const affectedBookings = await prisma.booking.count({
      where: {
        branchId: id,
        bookingDate: {
          gte: new Date(parsed.data.date + "T00:00:00.000Z"),
          lt: new Date(parsed.data.date + "T23:59:59.999Z"),
        },
        status: { notIn: ["CANCELLED", "REJECTED", "NO_SHOW"] },
        ...(parsed.data.isFullDay
          ? {}
          : {
              AND: [
                { startTime: { lt: parsed.data.endTime! } },
                { endTime: { gt: parsed.data.startTime! } },
              ],
            }),
      },
    });

    // If there are affected bookings and caller didn't explicitly force, return warning
    if (affectedBookings > 0 && !body.force) {
      return NextResponse.json(
        {
          warning: true,
          affectedBookings,
          message: `${affectedBookings} existing booking(s) will be affected by this closure.`,
        },
        { status: 200 }
      );
    }

    const closure = await prisma.branchClosure.create({
      data: {
        branchId: id,
        salonId: branch.salonId,
        closureType: parsed.data.closureType,
        reason: parsed.data.reason,
        isFullDay: parsed.data.isFullDay,
        date: closureDate,
        startTime: parsed.data.startTime || null,
        endTime: parsed.data.endTime || null,
      },
    });

    // If force=true and cancelBookings=true, cancel affected bookings
    if (body.force && body.cancelBookings) {
      const bookingsToCancel = await prisma.booking.findMany({
        where: {
          branchId: id,
          bookingDate: {
            gte: new Date(parsed.data.date + "T00:00:00.000Z"),
            lt: new Date(parsed.data.date + "T23:59:59.999Z"),
          },
          status: { notIn: ["CANCELLED", "REJECTED", "NO_SHOW"] },
        },
      });

      for (const booking of bookingsToCancel) {
        await prisma.$transaction([
          prisma.booking.update({
            where: { id: booking.id },
            data: {
              status: "CANCELLED",
              cancellationReason: `Branch closed: ${parsed.data.reason || parsed.data.closureType}`,
              cancelledAt: new Date(),
            },
          }),
          prisma.bookingStatusHistory.create({
            data: {
              bookingId: booking.id,
              status: "CANCELLED",
              changedBy: session.user.id,
              reason: `Branch closed: ${parsed.data.reason || parsed.data.closureType}`,
            },
          }),
          prisma.notification.create({
            data: {
              salonId: branch.salonId,
              branchId: id,
              bookingId: booking.id,
              type: "BRANCH_CLOSURE",
              title: "Booking Cancelled - Branch Closure",
              message: `Your booking ${booking.reference} has been cancelled due to branch closure: ${parsed.data.reason || parsed.data.closureType}`,
            },
          }),
        ]);
      }
    }

    return NextResponse.json({ closure }, { status: 201 });
  } catch (error) {
    console.error("Create closure error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
