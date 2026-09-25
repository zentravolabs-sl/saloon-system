import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { staffScheduleSchema } from "@/lib/validations";
import { checkSalonApproval } from "@/lib/salon-status";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const schedules = await prisma.staffSchedule.findMany({
      where: { staffId: id },
      orderBy: { dayOfWeek: "asc" },
    });
    return NextResponse.json({ schedules });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const parsed = staffScheduleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const staff = await prisma.staff.findUnique({ where: { id } });
    if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

    if (session.user.role !== "SUPER_ADMIN" && session.user.salonId !== staff.salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const approvalCheck = await checkSalonApproval(staff.salonId, session.user.role);
    if (!approvalCheck.approved) {
      return NextResponse.json({ error: approvalCheck.error }, { status: 403 });
    }

    await prisma.$transaction(
      parsed.data.schedules.map((schedule) =>
        prisma.staffSchedule.upsert({
          where: { staffId_dayOfWeek: { staffId: id, dayOfWeek: schedule.dayOfWeek } },
          update: schedule,
          create: { staffId: id, ...schedule },
        })
      )
    );

    const updated = await prisma.staffSchedule.findMany({
      where: { staffId: id },
      orderBy: { dayOfWeek: "asc" },
    });

    return NextResponse.json({ schedules: updated });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
