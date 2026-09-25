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
    const bookingId = searchParams.get("bookingId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: any = {
      booking: { salonId: session.user.salonId },
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

    const body = await req.json();
    const { bookingId, amount, method = "CASH", reference, notes } = body;

    if (!bookingId || !amount) {
      return NextResponse.json({ error: "bookingId and amount are required" }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (booking.salonId !== session.user.salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const payment = await prisma.$transaction(async (tx) => {
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

      // Update booking paid amount
      const totalPaid = await tx.payment.aggregate({
        where: { bookingId },
        _sum: { amount: true },
      });
      const paidAmount = (totalPaid._sum.amount || 0) + Number(amount);
      const paymentStatus =
        paidAmount >= booking.totalAmount
          ? "PAID"
          : paidAmount > 0
          ? "PARTIAL"
          : "UNPAID";

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
          balanceAmount: Math.max(0, booking.totalAmount - paidAmount),
        },
      });

      return newPayment;
    });

    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    console.error("Create payment error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
