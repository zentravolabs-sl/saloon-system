import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const subscriptions = await prisma.salonSubscription.findMany({
      include: {
        salon: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            email: true,
            phone: true,
            owner: { select: { name: true, email: true } },
            _count: { select: { branches: true, staff: true, bookings: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const totalMRR = subscriptions
      .filter((s: (typeof subscriptions)[number]) => s.status === "ACTIVE")
      .reduce((sum: number, s: (typeof subscriptions)[number]) => sum + s.amount, 0);

    return NextResponse.json({
      subscriptions,
      stats: {
        total: subscriptions.length,
        active: subscriptions.filter((s: (typeof subscriptions)[number]) => s.status === "ACTIVE").length,
        trial: subscriptions.filter((s: (typeof subscriptions)[number]) => s.status === "TRIAL").length,
        mrr: totalMRR,
      },
    });
  } catch (error) {
    console.error("Super admin subscriptions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { id, plan, status, amount, daysToAdd } = body;

    if (!id) {
      return NextResponse.json({ error: "Subscription ID required" }, { status: 400 });
    }

    const currentSub = await prisma.salonSubscription.findUnique({ where: { id } });
    if (!currentSub) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    let endDate = currentSub.endDate;
    if (daysToAdd && Number(daysToAdd) > 0) {
      const base = currentSub.endDate && currentSub.endDate > new Date() ? currentSub.endDate : new Date();
      endDate = new Date(base.getTime() + Number(daysToAdd) * 24 * 60 * 60 * 1000);
    }

    const updated = await prisma.salonSubscription.update({
      where: { id },
      data: {
        ...(plan && { plan }),
        ...(status && { status }),
        ...(amount !== undefined && { amount: Number(amount) }),
        ...(daysToAdd && { endDate }),
      },
      include: {
        salon: { select: { name: true } },
      },
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        salonId: currentSub.salonId,
        action: "SUBSCRIPTION_UPDATED",
        entity: "SalonSubscription",
        entityId: id,
        oldData: { plan: currentSub.plan, status: currentSub.status },
        newData: { plan: updated.plan, status: updated.status },
      },
    });

    return NextResponse.json({ success: true, subscription: updated });
  } catch (error) {
    console.error("Update subscription error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
