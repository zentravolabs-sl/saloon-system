import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { staffSchema } from "@/lib/validations";
import { checkSalonApproval } from "@/lib/salon-status";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const salonId = searchParams.get("salonId");
    const branchId = searchParams.get("branchId");
    const search = searchParams.get("search");

    const session = await auth();
    const effectiveSalonId = salonId || session?.user?.salonId;

    if (!effectiveSalonId) return NextResponse.json({ error: "Salon not found" }, { status: 404 });

    // Authorization check for staff dashboard access without explicit salonId
    if (session && !salonId && session.user.role !== "SUPER_ADMIN" && session.user.salonId !== effectiveSalonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const where: any = { salonId: effectiveSalonId };
    if (branchId) {
      where.branches = { some: { branchId } };
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const staff = await prisma.staff.findMany({
      where,
      include: {
        branches: {
          include: { branch: { select: { id: true, name: true } } },
        },
        services: {
          include: { service: { select: { id: true, name: true } } },
        },
        schedules: true,
        _count: { select: { bookings: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ staff });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowedRoles = ["SALON_OWNER", "MANAGER", "SUPER_ADMIN"];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = staffSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const salonId = body.salonId || session.user.salonId;
    if (!salonId) return NextResponse.json({ error: "Salon not found" }, { status: 404 });

    if (session.user.role !== "SUPER_ADMIN" && session.user.salonId !== salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const approvalCheck = await checkSalonApproval(salonId, session.user.role);
    if (!approvalCheck.approved) {
      return NextResponse.json({ error: approvalCheck.error }, { status: 403 });
    }

    const { branchIds, serviceIds, ...staffData } = parsed.data;

    const staff = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const newStaff = await tx.staff.create({
        data: {
          salonId,
          ...staffData,
          primaryBranchId:
            staffData.primaryBranchId ||
            (branchIds && branchIds.length > 0 ? branchIds[0] : null),
        },
      });

      // Assign branches
      if (branchIds && branchIds.length > 0) {
        await tx.staffBranch.createMany({
          data: branchIds.map((branchId) => ({
            staffId: newStaff.id,
            branchId,
          })),
        });
      }

      // Assign services
      if (serviceIds.length > 0) {
        await tx.staffService.createMany({
          data: serviceIds.map((serviceId) => ({
            staffId: newStaff.id,
            serviceId,
          })),
        });
      }

      // Create default weekly schedule
      const defaultSchedules = [0, 1, 2, 3, 4, 5, 6].map((day) => ({
        staffId: newStaff.id,
        dayOfWeek: day,
        isWorking: day !== 0, // Sunday off by default
        startTime: "09:00",
        endTime: "18:00",
      }));

      await tx.staffSchedule.createMany({ data: defaultSchedules });

      return newStaff;
    });

    const fullStaff = await prisma.staff.findUnique({
      where: { id: staff.id },
      include: {
        branches: { include: { branch: true } },
        services: { include: { service: true } },
        schedules: true,
      },
    });

    return NextResponse.json({ staff: fullStaff }, { status: 201 });
  } catch (error) {
    console.error("Create staff error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
