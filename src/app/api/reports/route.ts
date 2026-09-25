import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, format } from "date-fns";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user.salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "bookings";
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const branchId = searchParams.get("branchId");
    const staffId = searchParams.get("staffId");

    const salonId = session.user.salonId;
    const dateFrom = from ? new Date(from) : subDays(new Date(), 30);
    const dateTo = to ? new Date(to) : new Date();

    const baseWhere: any = {
      salonId,
      bookingDate: {
        gte: startOfDay(dateFrom),
        lte: endOfDay(dateTo),
      },
      ...(branchId && { branchId }),
      ...(staffId && { staffId }),
    };

    if (type === "bookings") {
      // Daily booking counts
      const bookings = await prisma.booking.findMany({
        where: baseWhere,
        select: {
          bookingDate: true,
          status: true,
          totalAmount: true,
          branchId: true,
          branch: { select: { name: true } },
        },
        orderBy: { bookingDate: "asc" },
      });

      // Group by date
      const byDate: Record<string, any> = {};
      for (const b of bookings) {
        const d = format(b.bookingDate, "yyyy-MM-dd");
        if (!byDate[d]) byDate[d] = { date: d, total: 0, completed: 0, cancelled: 0, pending: 0, confirmed: 0, noShow: 0 };
        byDate[d].total++;
        if (b.status === "COMPLETED") byDate[d].completed++;
        if (b.status === "CANCELLED") byDate[d].cancelled++;
        if (b.status === "PENDING") byDate[d].pending++;
        if (b.status === "CONFIRMED") byDate[d].confirmed++;
        if (b.status === "NO_SHOW") byDate[d].noShow++;
      }

      const statusSummary = {
        total: bookings.length,
        completed: bookings.filter((b) => b.status === "COMPLETED").length,
        cancelled: bookings.filter((b) => b.status === "CANCELLED").length,
        pending: bookings.filter((b) => b.status === "PENDING").length,
        confirmed: bookings.filter((b) => b.status === "CONFIRMED").length,
        noShow: bookings.filter((b) => b.status === "NO_SHOW").length,
        inProgress: bookings.filter((b) => b.status === "IN_PROGRESS").length,
        checkedIn: bookings.filter((b) => b.status === "CHECKED_IN").length,
      };

      return NextResponse.json({
        daily: Object.values(byDate),
        summary: statusSummary,
      });
    }

    if (type === "revenue") {
      const bookings = await prisma.booking.findMany({
        where: { ...baseWhere, status: "COMPLETED" },
        select: {
          bookingDate: true,
          totalAmount: true,
          branchId: true,
          branch: { select: { name: true } },
        },
        orderBy: { bookingDate: "asc" },
      });

      // Daily revenue
      const byDate: Record<string, any> = {};
      const byBranch: Record<string, any> = {};
      let totalRevenue = 0;

      for (const b of bookings) {
        const d = format(b.bookingDate, "yyyy-MM-dd");
        totalRevenue += b.totalAmount;

        if (!byDate[d]) byDate[d] = { date: d, revenue: 0 };
        byDate[d].revenue += b.totalAmount;

        if (!byBranch[b.branchId]) byBranch[b.branchId] = { branchId: b.branchId, name: b.branch.name, revenue: 0, bookings: 0 };
        byBranch[b.branchId].revenue += b.totalAmount;
        byBranch[b.branchId].bookings++;
      }

      return NextResponse.json({
        daily: Object.values(byDate),
        byBranch: Object.values(byBranch),
        totalRevenue,
        bookingCount: bookings.length,
      });
    }

    if (type === "staff") {
      const bookings = await prisma.booking.findMany({
        where: baseWhere,
        select: {
          staffId: true,
          status: true,
          totalAmount: true,
          staff: { select: { name: true, photo: true } },
        },
      });

      const byStaff: Record<string, any> = {};
      for (const b of bookings) {
        if (!byStaff[b.staffId]) {
          byStaff[b.staffId] = {
            staffId: b.staffId,
            name: b.staff.name,
            photo: b.staff.photo,
            total: 0,
            completed: 0,
            cancelled: 0,
            noShow: 0,
            revenue: 0,
          };
        }
        byStaff[b.staffId].total++;
        if (b.status === "COMPLETED") { byStaff[b.staffId].completed++; byStaff[b.staffId].revenue += b.totalAmount; }
        if (b.status === "CANCELLED") byStaff[b.staffId].cancelled++;
        if (b.status === "NO_SHOW") byStaff[b.staffId].noShow++;
      }

      return NextResponse.json({ staff: Object.values(byStaff) });
    }

    if (type === "services") {
      const bookingServices = await prisma.bookingService.findMany({
        where: {
          booking: {
            salonId,
            bookingDate: {
              gte: startOfDay(dateFrom),
              lte: endOfDay(dateTo),
            },
            status: "COMPLETED",
          },
        },
        include: {
          service: { select: { id: true, name: true, category: { select: { name: true } } } },
        },
      });

      const byService: Record<string, any> = {};
      for (const bs of bookingServices) {
        const sid = bs.serviceId;
        if (!byService[sid]) {
          byService[sid] = {
            serviceId: sid,
            name: bs.service.name,
            category: bs.service.category.name,
            count: 0,
            revenue: 0,
          };
        }
        byService[sid].count++;
        byService[sid].revenue += bs.price;
      }

      const sorted = Object.values(byService).sort((a: any, b: any) => b.count - a.count);
      return NextResponse.json({ services: sorted });
    }

    return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  } catch (error) {
    console.error("Reports error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
