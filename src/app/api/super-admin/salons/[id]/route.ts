import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { status, rejectionReason } = body;

    const validStatuses = ["PENDING", "APPROVED", "REJECTED", "SUSPENDED", "INACTIVE"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Fetch salon with owner before updating
    const existingSalon = await prisma.salon.findUnique({
      where: { id },
      include: { owner: { select: { id: true } } },
    });
    if (!existingSalon) {
      return NextResponse.json({ error: "Salon not found" }, { status: 404 });
    }

    // Update salon status
    const salon = await prisma.salon.update({
      where: { id },
      data: { status },
    });

    // Build notification message
    const notifMessages: Record<string, string> = {
      APPROVED: `🎉 Congratulations! Your salon "${salon.name}" has been approved. You can now create branches, add staff, and accept bookings.`,
      REJECTED: `Your salon "${salon.name}" registration has been rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : ""} Please contact support for more information.`,
      SUSPENDED: `Your salon "${salon.name}" has been suspended. Please contact support.`,
      INACTIVE: `Your salon "${salon.name}" has been marked as inactive.`,
    };

    // Notify salon owner
    if (notifMessages[status] && existingSalon.owner?.id) {
      await prisma.notification.create({
        data: {
          salonId: id,
          userId: existingSalon.owner.id,
          type: "GENERAL",
          title: `Salon ${status.charAt(0) + status.slice(1).toLowerCase()}`,
          message: notifMessages[status],
          data: { status, rejectionReason: rejectionReason || null },
        },
      });
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `SALON_STATUS_${status}`,
        entity: "Salon",
        entityId: id,
        salonId: id,
        metadata: { status, rejectionReason },
      },
    });

    return NextResponse.json({ salon });
  } catch (error) {
    console.error("Update salon status error:", error);
    return NextResponse.json({ error: "Failed to update salon status" }, { status: 500 });
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const salon = await prisma.salon.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true, phone: true } },
        subscription: true,
        branches: { select: { id: true, name: true, status: true, city: true } },
        _count: { select: { branches: true, staff: true, bookings: true, services: true } },
      },
    });

    if (!salon) {
      return NextResponse.json({ error: "Salon not found" }, { status: 404 });
    }

    return NextResponse.json({ salon });
  } catch (error) {
    console.error("Fetch salon error:", error);
    return NextResponse.json({ error: "Failed to fetch salon" }, { status: 500 });
  }
}
