import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user.salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");

    const isPaginated = pageParam !== null || limitParam !== null;
    const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
    const limit = Math.max(1, parseInt(limitParam || "7", 10) || 7);

    const where = {
      salonId: session.user.salonId,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { phone: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        include: {
          bookings: {
            select: {
              id: true,
              reference: true,
              bookingDate: true,
              status: true,
              totalAmount: true,
            },
            orderBy: { bookingDate: "desc" },
          },
          loyaltyAccount: true,
        },
        orderBy: { createdAt: "desc" },
        ...(isPaginated ? { skip: (page - 1) * limit, take: limit } : {}),
      }),
    ]);

    const mapped = customers.map((c: (typeof customers)[number]) => {
      const completed = c.bookings.filter((b: (typeof c.bookings)[number]) => b.status === "COMPLETED");
      const totalSpend = completed.reduce((sum: number, b: (typeof completed)[number]) => sum + b.totalAmount, 0);
      const noShows = c.bookings.filter((b: (typeof c.bookings)[number]) => b.status === "NO_SHOW").length;
      const cancelled = c.bookings.filter((b: (typeof c.bookings)[number]) => b.status === "CANCELLED").length;

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        notes: c.notes,
        totalBookings: c.bookings.length,
        completedBookings: completed.length,
        noShows,
        cancelled,
        totalSpend,
        loyaltyPoints: c.loyaltyAccount?.balance || 0,
        recentBookings: c.bookings.slice(0, 5),
      };
    });

    const totalPages = isPaginated ? Math.max(1, Math.ceil(total / limit)) : 1;

    return NextResponse.json({
      customers: mapped,
      total,
      page,
      limit: isPaginated ? limit : total,
      totalPages,
      pagination: {
        total,
        page,
        limit: isPaginated ? limit : total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Customers fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}
