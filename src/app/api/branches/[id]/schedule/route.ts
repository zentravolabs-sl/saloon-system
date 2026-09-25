import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { branchScheduleSchema } from "@/lib/validations";
import { checkSalonApproval } from "@/lib/salon-status";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const parsed = branchScheduleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const branch = await prisma.branch.findUnique({ where: { id } });
    if (!branch) return NextResponse.json({ error: "Branch not found" }, { status: 404 });

    if (session.user.role !== "SUPER_ADMIN" && session.user.salonId !== branch.salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const approvalCheck = await checkSalonApproval(branch.salonId, session.user.role);
    if (!approvalCheck.approved) {
      return NextResponse.json({ error: approvalCheck.error }, { status: 403 });
    }

    // Upsert each schedule day
    await prisma.$transaction(
      parsed.data.schedules.map((schedule) =>
        prisma.branchSchedule.upsert({
          where: { branchId_dayOfWeek: { branchId: id, dayOfWeek: schedule.dayOfWeek } },
          update: schedule,
          create: { branchId: id, ...schedule },
        })
      )
    );

    const updated = await prisma.branch.findUnique({
      where: { id },
      include: { schedules: { orderBy: { dayOfWeek: "asc" } } },
    });

    return NextResponse.json({ branch: updated });
  } catch (error) {
    console.error("Update schedule error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const schedules = await prisma.branchSchedule.findMany({
      where: { branchId: id },
      orderBy: { dayOfWeek: "asc" },
    });
    return NextResponse.json({ schedules });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
