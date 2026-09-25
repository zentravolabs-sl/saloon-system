import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { staffLeaveSchema, staffScheduleSchema } from "@/lib/validations";
import { checkSalonApproval } from "@/lib/salon-status";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const staff = await prisma.staff.findUnique({
      where: { id },
      include: {
        branches: { include: { branch: true } },
        services: { include: { service: { include: { category: true } } } },
        schedules: { orderBy: { dayOfWeek: "asc" } },
        leaves: { orderBy: { startDate: "desc" } },
        breaks: { orderBy: { dayOfWeek: "asc" } },
        _count: {
          select: {
            bookings: true,
          },
        },
      },
    });

    if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

    if (session.user.role !== "SUPER_ADMIN" && session.user.salonId !== staff.salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json({ staff });
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

    const staff = await prisma.staff.findUnique({ where: { id } });
    if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

    if (session.user.role !== "SUPER_ADMIN" && session.user.salonId !== staff.salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const approvalCheck = await checkSalonApproval(staff.salonId, session.user.role);
    if (!approvalCheck.approved) {
      return NextResponse.json({ error: approvalCheck.error }, { status: 403 });
    }

    const { branchIds, serviceIds, ...staffData } = body;

    const updated = await prisma.$transaction(async (tx) => {
      const updatedStaff = await tx.staff.update({
        where: { id },
        data: staffData,
      });

      // Update branches if provided
      if (branchIds !== undefined) {
        await tx.staffBranch.deleteMany({ where: { staffId: id } });
        if (branchIds.length > 0) {
          await tx.staffBranch.createMany({
            data: branchIds.map((branchId: string) => ({ staffId: id, branchId })),
          });
        }
      }

      // Update services if provided
      if (serviceIds !== undefined) {
        await tx.staffService.deleteMany({ where: { staffId: id } });
        if (serviceIds.length > 0) {
          await tx.staffService.createMany({
            data: serviceIds.map((serviceId: string) => ({ staffId: id, serviceId })),
          });
        }
      }

      return updatedStaff;
    });

    return NextResponse.json({ staff: updated });
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
    const staff = await prisma.staff.findUnique({ where: { id } });
    if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

    if (session.user.role !== "SUPER_ADMIN" && session.user.salonId !== staff.salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const approvalCheck = await checkSalonApproval(staff.salonId, session.user.role);
    if (!approvalCheck.approved) {
      return NextResponse.json({ error: approvalCheck.error }, { status: 403 });
    }

    const activeBookings = await prisma.booking.count({
      where: {
        staffId: id,
        status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"] },
      },
    });

    if (activeBookings > 0) {
      return NextResponse.json(
        { error: `Cannot delete staff with ${activeBookings} active bookings` },
        { status: 409 }
      );
    }

    await prisma.staff.delete({ where: { id } });

    return NextResponse.json({ message: "Staff deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
