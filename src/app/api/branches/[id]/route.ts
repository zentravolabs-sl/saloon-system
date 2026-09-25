import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { branchScheduleSchema } from "@/lib/validations";
import { checkSalonApproval } from "@/lib/salon-status";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        schedules: { orderBy: { dayOfWeek: "asc" } },
        closures: { orderBy: { date: "asc" } },
        staffBranches: {
          include: { staff: { select: { id: true, name: true, status: true } } },
        },
        services: {
          include: { service: { select: { id: true, name: true, price: true } } },
        },
      },
    });

    if (!branch) return NextResponse.json({ error: "Branch not found" }, { status: 404 });

    // Tenant isolation check
    if (session.user.role !== "SUPER_ADMIN" && session.user.salonId !== branch.salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json({ branch });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
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

    const updated = await prisma.branch.update({
      where: { id },
      data: body,
    });

    return NextResponse.json({ branch: updated });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const branch = await prisma.branch.findUnique({ where: { id } });
    if (!branch) return NextResponse.json({ error: "Branch not found" }, { status: 404 });

    if (
      session.user.role !== "SUPER_ADMIN" &&
      session.user.role !== "SALON_OWNER"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (session.user.salonId !== branch.salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const approvalCheck = await checkSalonApproval(branch.salonId, session.user.role);
    if (!approvalCheck.approved) {
      return NextResponse.json({ error: approvalCheck.error }, { status: 403 });
    }

    // Check for active bookings
    const activeBookings = await prisma.booking.count({
      where: {
        branchId: id,
        status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"] },
      },
    });

    if (activeBookings > 0) {
      return NextResponse.json(
        { error: `Cannot delete branch with ${activeBookings} active bookings` },
        { status: 409 }
      );
    }

    await prisma.branch.delete({ where: { id } });

    return NextResponse.json({ message: "Branch deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
