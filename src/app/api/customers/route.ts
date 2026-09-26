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

    const customers = await prisma.customer.findMany({
      where: {
        salonId: session.user.salonId,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
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
    });

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

    return NextResponse.json({ customers: mapped });
  } catch (error) {
    console.error("Customers fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}
