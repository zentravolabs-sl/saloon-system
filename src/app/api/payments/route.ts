import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getLegacyScope } from "@/lib/ops/access";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user.salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scope = await getLegacyScope();
    if (!scope || !["SALON_OWNER", "MANAGER"].includes(scope.role)) {
      return NextResponse.json({ error: "You do not have permission to view payments" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get("bookingId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: any = {
      booking: {
        salonId: session.user.salonId,
        ...(scope.branchIds ? { branchId: { in: scope.branchIds } } : {}),
      },
      ...(bookingId && { bookingId }),
    };

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          booking: {
            include: {
              customer: { select: { id: true, name: true, phone: true } },
              branch: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    return NextResponse.json({ payments, total, page, limit });
  } catch (error) {
    console.error("Payments fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user.salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scope = await getLegacyScope();
    if (!scope || !["SALON_OWNER", "MANAGER", "RECEPTIONIST"].includes(scope.role)) {
      return NextResponse.json({ error: "You do not have permission to take payments" }, { status: 403 });
    }

    const body = await req.json();
    const { bookingId, amount, method = "CASH", reference, notes } = body;
    const discountAmount = Number(body.discountAmount || 0);

    if (!bookingId || !amount) {
      return NextResponse.json({ error: "bookingId and amount are required" }, { status: 400 });
    }
    if (!(Number(amount) > 0)) {
      return NextResponse.json({ error: "Amount must be greater than zero" }, { status: 400 });
    }
    if (!Number.isFinite(discountAmount) || discountAmount < 0) {
      return NextResponse.json({ error: "Discount is not valid" }, { status: 400 });
    }
    // Discounts change the price of an appointment, so only owners and managers may give them
    if (discountAmount > 0 && !["SALON_OWNER", "MANAGER"].includes(scope.role)) {
      return NextResponse.json({ error: "Only the owner or a manager can give a discount" }, { status: 403 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (booking.salonId !== session.user.salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (scope.branchIds && !scope.branchIds.includes(booking.branchId)) {
      return NextResponse.json({ error: "You do not have access to this branch" }, { status: 403 });
    }
    if (discountAmount > booking.totalAmount - booking.paidAmount) {
      return NextResponse.json({ error: "Discount is more than the amount still due" }, { status: 400 });
    }

    const payment = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      let totalAmount = booking.totalAmount;
      if (discountAmount > 0) {
        totalAmount = Math.max(0, booking.totalAmount - discountAmount);
        await tx.booking.update({
          where: { id: bookingId },
          data: {
            discountAmount: booking.discountAmount + discountAmount,
            totalAmount,
          },
        });
        await tx.invoice.updateMany({
          where: { bookingId },
          data: {
            discountAmount: { increment: discountAmount },
            totalAmount,
          },
        });
      }

      const newPayment = await tx.payment.create({
        data: {
          bookingId,
          salonId: session.user.salonId!,
          amount: Number(amount),
          method,
          reference: reference || null,
          notes: notes || null,
        },
      });

      // The new payment is already included in this aggregate
      const totalPaid = await tx.payment.aggregate({
        where: { bookingId },
        _sum: { amount: true },
      });
      const paidAmount = totalPaid._sum.amount || 0;
      const paymentStatus =
        paidAmount >= totalAmount ? "PAID" : paidAmount > 0 ? "PARTIAL" : "UNPAID";

      await tx.booking.update({
        where: { id: bookingId },
        data: {
          paidAmount,
          paymentStatus: paymentStatus as any,
        },
      });

      // Update invoice if exists
      await tx.invoice.updateMany({
        where: { bookingId },
        data: {
          paidAmount,
          balanceAmount: Math.max(0, totalAmount - paidAmount),
        },
      });

      // If the booking is completed, re-evaluate commissions (e.g. if eligibility is COMPLETED_AND_PAID)
      if (booking.status === "COMPLETED") {
        const { evaluateBookingCommissions } = await import("@/lib/ops/commission");
        await evaluateBookingCommissions(tx, bookingId);
      }

      return newPayment;
    });

    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    console.error("Create payment error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
