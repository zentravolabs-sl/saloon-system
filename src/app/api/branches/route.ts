import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { branchSchema } from "@/lib/validations";
import { checkSalonApproval } from "@/lib/salon-status";

// GET /api/branches - list branches for current salon or by salonId (public)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const salonId = searchParams.get("salonId");
    const city = searchParams.get("city"); // optional city filter for public booking

    const session = await auth();
    const effectiveSalonId = salonId || session?.user?.salonId;

    // Public access is allowed when salonId is explicitly provided in query
    if (!salonId) {
      // No explicit salonId — require auth
      if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      if (session.user.role !== "SUPER_ADMIN" && session.user.salonId !== effectiveSalonId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    if (!effectiveSalonId) return NextResponse.json({ error: "Salon not found" }, { status: 404 });

    const where: any = { salonId: effectiveSalonId, status: "ACTIVE" };
    if (city) {
      where.city = { equals: city, mode: "insensitive" };
    }

    const branches = await prisma.branch.findMany({
      where,
      include: {
        schedules: true,
        _count: { select: { staff: true, bookings: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ branches });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/branches - create a new branch
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowedRoles = ["SALON_OWNER", "MANAGER", "SUPER_ADMIN"];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = branchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const salonId = body.salonId || session.user.salonId;
    if (!salonId) return NextResponse.json({ error: "Salon not found" }, { status: 404 });

    // Verify salon ownership
    if (session.user.role !== "SUPER_ADMIN" && session.user.salonId !== salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Verify salon approval
    const approvalCheck = await checkSalonApproval(salonId, session.user.role);
    if (!approvalCheck.approved) {
      return NextResponse.json({ error: approvalCheck.error }, { status: 403 });
    }

    const branch = await prisma.$transaction(async (tx) => {
      const newBranch = await tx.branch.create({
        data: {
          salonId,
          ...parsed.data,
        },
      });

      // Create default weekly schedule (Mon-Fri: 9-6, Sat: 9-5, Sun: closed)
      const defaultSchedules = [
        { dayOfWeek: 0, isOpen: false, openTime: "09:00", closeTime: "17:00" }, // Sun
        { dayOfWeek: 1, isOpen: true, openTime: "09:00", closeTime: "18:00" },  // Mon
        { dayOfWeek: 2, isOpen: true, openTime: "09:00", closeTime: "18:00" },  // Tue
        { dayOfWeek: 3, isOpen: true, openTime: "09:00", closeTime: "18:00" },  // Wed
        { dayOfWeek: 4, isOpen: true, openTime: "09:00", closeTime: "18:00" },  // Thu
        { dayOfWeek: 5, isOpen: true, openTime: "09:00", closeTime: "18:00" },  // Fri
        { dayOfWeek: 6, isOpen: true, openTime: "09:00", closeTime: "17:00" },  // Sat
      ];

      await tx.branchSchedule.createMany({
        data: defaultSchedules.map((s) => ({ ...s, branchId: newBranch.id })),
      });

      return newBranch;
    });

    return NextResponse.json({ branch }, { status: 201 });
  } catch (error) {
    console.error("Create branch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
