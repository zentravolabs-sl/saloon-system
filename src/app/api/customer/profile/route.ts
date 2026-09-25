import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPhoneVariants } from "@/lib/phone";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json({ error: "Phone number required" }, { status: 400 });
    }

    const cleanPhone = phone.trim();
    const phoneVariants = getPhoneVariants(cleanPhone);

    const customers = await prisma.customer.findMany({
      where: { phone: { in: phoneVariants } },
      include: {
        salon: { select: { id: true, name: true, slug: true } },
        loyaltyAccount: {
          include: {
            transactions: {
              orderBy: { createdAt: "desc" },
              take: 10,
            },
          },
        },
        _count: { select: { bookings: true, reviews: true } },
      },
    });

    if (customers.length === 0) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const primary = customers[0];
    const totalBookings = customers.reduce((sum, c) => sum + c.totalBookings, 0);
    const totalSpent = customers.reduce((sum, c) => sum + c.totalSpent, 0);
    const totalPoints = customers.reduce((sum, c) => sum + (c.loyaltyAccount?.balance || 0), 0);

    const loyaltyTransactions = customers.flatMap((c) =>
      (c.loyaltyAccount?.transactions || []).map((t) => ({
        ...t,
        salonName: c.salon.name,
      }))
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      profile: {
        name: primary.name,
        phone: primary.phone,
        email: primary.email,
        totalBookings,
        totalSpent,
        totalPoints,
        salons: customers.map((c) => ({
          salonName: c.salon.name,
          points: c.loyaltyAccount?.balance || 0,
        })),
        recentTransactions: loyaltyTransactions.slice(0, 10),
      },
    });
  } catch (error) {
    console.error("Customer profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { phone, name, email } = body;

    if (!phone) {
      return NextResponse.json({ error: "Phone number required" }, { status: 400 });
    }

    await prisma.customer.updateMany({
      where: { phone: phone.trim() },
      data: {
        ...(name && { name: name.trim() }),
        ...(email !== undefined && { email: email?.trim() || null }),
      },
    });

    return NextResponse.json({ success: true, message: "Profile updated" });
  } catch (error) {
    console.error("Update customer profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
