import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
      select: { salonId: true },
    });
    if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

    if (session.user.role !== "SUPER_ADMIN" && session.user.salonId !== staff.salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const breaks = await prisma.staffBreak.findMany({
      where: { staffId: id },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    return NextResponse.json({ breaks });
  } catch (error) {
    console.error("Get breaks error:", error);
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

    const staff = await prisma.staff.findUnique({
      where: { id },
      select: { salonId: true },
    });
    if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

    if (session.user.role !== "SUPER_ADMIN" && session.user.salonId !== staff.salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const approvalCheck = await checkSalonApproval(staff.salonId, session.user.role);
    if (!approvalCheck.approved) {
      return NextResponse.json({ error: approvalCheck.error }, { status: 403 });
    }

    const { dayOfWeek, startTime, endTime, isRecurring = true } = body;

    if (dayOfWeek === undefined || !startTime || !endTime) {
      return NextResponse.json({ error: "dayOfWeek, startTime, and endTime are required" }, { status: 400 });
    }

    const breakEntry = await prisma.staffBreak.create({
      data: {
        staffId: id,
        dayOfWeek: Number(dayOfWeek),
        startTime,
        endTime,
        isRecurring,
      },
    });

    return NextResponse.json({ break: breakEntry }, { status: 201 });
  } catch (error) {
    console.error("Create break error:", error);
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
    const { searchParams } = new URL(req.url);
    const breakId = searchParams.get("breakId");

    if (!breakId) return NextResponse.json({ error: "breakId required" }, { status: 400 });

    const breakEntry = await prisma.staffBreak.findUnique({
      where: { id: breakId },
      include: { staff: { select: { salonId: true } } },
    });

    if (!breakEntry || breakEntry.staffId !== id) {
      return NextResponse.json({ error: "Break not found" }, { status: 404 });
    }

    if (session.user.role !== "SUPER_ADMIN" && session.user.salonId !== breakEntry.staff.salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const approvalCheck = await checkSalonApproval(breakEntry.staff.salonId, session.user.role);
    if (!approvalCheck.approved) {
      return NextResponse.json({ error: approvalCheck.error }, { status: 403 });
    }

    await prisma.staffBreak.delete({ where: { id: breakId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete break error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
