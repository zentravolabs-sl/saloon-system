import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { action, reason } = body;

    const salon = await prisma.salon.findUnique({ where: { id } });
    if (!salon) {
      return NextResponse.json({ error: "Salon not found" }, { status: 404 });
    }

    let newStatus: string;
    switch (action) {
      case "approve":
        newStatus = "APPROVED";
        break;
      case "reject":
        newStatus = "REJECTED";
        break;
      case "suspend":
        newStatus = "SUSPENDED";
        break;
      case "activate":
        newStatus = "APPROVED";
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const updated = await prisma.salon.update({
      where: { id },
      data: { status: newStatus as any },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        salonId: id,
        action: `SALON_${action.toUpperCase()}`,
        entity: "Salon",
        entityId: id,
        newData: { status: newStatus, reason },
      },
    });

    return NextResponse.json({ salon: updated });
  } catch (error) {
    console.error("Salon action error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const salon = await prisma.salon.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true, phone: true } },
        branches: {
          include: { _count: { select: { staff: true, bookings: true } } },
        },
        subscription: true,
        _count: { select: { staff: true, customers: true, bookings: true } },
      },
    });

    if (!salon) {
      return NextResponse.json({ error: "Salon not found" }, { status: 404 });
    }

    return NextResponse.json({ salon });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
