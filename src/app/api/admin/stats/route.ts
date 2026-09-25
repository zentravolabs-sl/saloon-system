import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const salonId = session.user.salonId;
    if (!salonId) return NextResponse.json({ error: "Salon not found" }, { status: 404 });

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const [
      todaysBookings,
      pending,
      confirmed,
      checkedIn,
      inProgress,
      completed,
      cancelled,
      rejected,
      noShow,
      todayRevenue,
      availableStaff,
      busyStaff,
      upcomingBookings,
    ] = await Promise.all([
      prisma.booking.count({
        where: {
          salonId,
          bookingDate: { gte: todayStart, lt: todayEnd },
        },
      }),
      prisma.booking.count({ where: { salonId, status: "PENDING" } }),
      prisma.booking.count({
        where: { salonId, status: "CONFIRMED", bookingDate: { gte: todayStart, lt: todayEnd } },
      }),
      prisma.booking.count({
        where: { salonId, status: "CHECKED_IN", bookingDate: { gte: todayStart, lt: todayEnd } },
      }),
      prisma.booking.count({
        where: { salonId, status: "IN_PROGRESS", bookingDate: { gte: todayStart, lt: todayEnd } },
      }),
      prisma.booking.count({
        where: { salonId, status: "COMPLETED", bookingDate: { gte: todayStart, lt: todayEnd } },
      }),
      prisma.booking.count({
        where: { salonId, status: "CANCELLED", bookingDate: { gte: todayStart, lt: todayEnd } },
      }),
      prisma.booking.count({
        where: { salonId, status: "REJECTED", bookingDate: { gte: todayStart, lt: todayEnd } },
      }),
      prisma.booking.count({
        where: { salonId, status: "NO_SHOW", bookingDate: { gte: todayStart, lt: todayEnd } },
      }),
      prisma.booking.aggregate({
        _sum: { totalAmount: true },
        where: { salonId, status: "COMPLETED", bookingDate: { gte: todayStart, lt: todayEnd } },
      }),
      prisma.staff.count({ where: { salonId, status: "ACTIVE" } }),
      prisma.booking.groupBy({
        by: ["staffId"],
        where: {
          salonId,
          status: "IN_PROGRESS",
          bookingDate: { gte: todayStart, lt: todayEnd },
        },
      }),
      prisma.booking.findMany({
        where: {
          salonId,
          bookingDate: { gte: today },
          status: { in: ["CONFIRMED", "PENDING"] },
        },
        include: {
          customer: { select: { name: true, phone: true } },
          staff: { select: { name: true, photo: true } },
          services: { include: { service: { select: { name: true } } } },
        },
        orderBy: [{ bookingDate: "asc" }, { startTime: "asc" }],
        take: 10,
      }),
    ]);

    // Monthly booking trend (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d;
    }).reverse();

    const bookingTrend = await Promise.all(
      last7Days.map(async (d) => {
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
        const count = await prisma.booking.count({
          where: {
            salonId,
            bookingDate: { gte: start, lt: end },
            status: { notIn: ["CANCELLED", "REJECTED"] },
          },
        });
        const revenue = await prisma.booking.aggregate({
          _sum: { totalAmount: true },
          where: { salonId, bookingDate: { gte: start, lt: end }, status: "COMPLETED" },
        });
        return {
          date: d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" }),
          bookings: count,
          revenue: revenue._sum.totalAmount || 0,
        };
      })
    );

    return NextResponse.json({
      stats: {
        todaysBookings,
        pending,
        confirmed,
        checkedIn,
        inProgress,
        completed,
        cancelled,
        rejected,
        noShow,
        todayRevenue: todayRevenue._sum.totalAmount || 0,
        availableStaff: availableStaff - busyStaff.length,
        busyStaff: busyStaff.length,
      },
      upcomingBookings,
      bookingTrend,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
