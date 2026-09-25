import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const [
      totalSalons,
      activeSalons,
      pendingSalons,
      suspendedSalons,
      totalBranches,
      totalStaff,
      totalCustomers,
      todaysBookings,
      monthlyBookings,
    ] = await Promise.all([
      prisma.salon.count(),
      prisma.salon.count({ where: { status: "APPROVED" } }),
      prisma.salon.count({ where: { status: "PENDING" } }),
      prisma.salon.count({ where: { status: "SUSPENDED" } }),
      prisma.branch.count(),
      prisma.staff.count(),
      prisma.customer.count(),
      prisma.booking.count({
        where: {
          bookingDate: { gte: todayStart, lt: todayEnd },
          status: { notIn: ["CANCELLED", "REJECTED"] },
        },
      }),
      prisma.booking.count({
        where: {
          bookingDate: {
            gte: new Date(today.getFullYear(), today.getMonth(), 1),
          },
          status: { notIn: ["CANCELLED", "REJECTED"] },
        },
      }),
    ]);

    // Platform revenue (sum of completed bookings)
    const revenueResult = await prisma.booking.aggregate({
      _sum: { totalAmount: true },
      where: { status: "COMPLETED" },
    });
    const platformRevenue = revenueResult._sum.totalAmount || 0;

    return NextResponse.json({
      stats: {
        totalSalons,
        activeSalons,
        pendingSalons,
        suspendedSalons,
        totalBranches,
        totalStaff,
        totalCustomers,
        todaysBookings,
        monthlyBookings,
        platformRevenue,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
