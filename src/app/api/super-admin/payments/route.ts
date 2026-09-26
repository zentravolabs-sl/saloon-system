import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const method = searchParams.get("method");
    const salonId = searchParams.get("salonId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: any = {};
    if (method) where.method = method;
    if (salonId) where.salonId = salonId;

    const [payments, total, allSalons] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          booking: {
            select: {
              reference: true,
              bookingDate: true,
              totalAmount: true,
              customer: { select: { name: true, phone: true } },
              branch: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payment.count({ where }),
      prisma.salon.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    // Attach salon name
    const salonMap = new Map(allSalons.map((s: (typeof allSalons)[number]) => [s.id, s.name]));
    const enrichedPayments = payments.map((p: (typeof payments)[number]) => ({
      ...p,
      salonName: salonMap.get(p.salonId) || "Unknown Salon",
    }));

    // Aggregate stats
    const totalProcessed = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: "COMPLETED" },
    });

    return NextResponse.json({
      payments: enrichedPayments,
      total,
      salons: allSalons,
      stats: {
        totalVolume: totalProcessed._sum.amount || 0,
        totalTransactions: total,
      },
    });
  } catch (error) {
    console.error("Super admin payments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
