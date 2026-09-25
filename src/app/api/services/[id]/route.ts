import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkSalonApproval } from "@/lib/salon-status";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session || !session.user.salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const approvalCheck = await checkSalonApproval(session.user.salonId, session.user.role);
    if (!approvalCheck.approved) {
      return NextResponse.json({ error: approvalCheck.error }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, price, duration, bufferTime, categoryId, isActive, staffIds } = body;

    const existing = await prisma.service.findFirst({
      where: { id, salonId: session.user.salonId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Update service
    const service = await prisma.service.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        description: description ?? existing.description,
        price: price !== undefined ? Number(price) : existing.price,
        duration: duration !== undefined ? Number(duration) : existing.duration,
        bufferTime: bufferTime !== undefined ? Number(bufferTime) : existing.bufferTime,
        categoryId: categoryId ?? existing.categoryId,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
      },
    });

    // If staffIds is provided, update staff assignment
    if (staffIds && Array.isArray(staffIds)) {
      await prisma.staffService.deleteMany({ where: { serviceId: id } });
      await prisma.staffService.createMany({
        data: staffIds.map((staffId: string) => ({ serviceId: id, staffId })),
      });
    }

    return NextResponse.json({ service });
  } catch (error) {
    console.error("Update service error:", error);
    return NextResponse.json({ error: "Failed to update service" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session || !session.user.salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const approvalCheck = await checkSalonApproval(session.user.salonId, session.user.role);
    if (!approvalCheck.approved) {
      return NextResponse.json({ error: approvalCheck.error }, { status: 403 });
    }

    // Soft delete by setting isActive to false
    await prisma.service.updateMany({
      where: { id, salonId: session.user.salonId },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete service error:", error);
    return NextResponse.json({ error: "Failed to delete service" }, { status: 500 });
  }
}
