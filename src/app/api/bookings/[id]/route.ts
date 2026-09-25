import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bookingStatusUpdateSchema } from "@/lib/validations";
import { isSlotAvailable, addMinutesToTime } from "@/lib/availability";
import { getPhoneVariants } from "@/lib/phone";
import { format } from "date-fns";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");
    const session = await auth();

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        customer: true,
        staff: { select: { id: true, name: true, photo: true, specialization: true } },
        branch: true,
        salon: { select: { id: true, name: true, logo: true, phone: true, address: true, slug: true } },
        services: { include: { service: { include: { category: true } } } },
        statusHistory: { orderBy: { createdAt: "asc" } },
        payments: { orderBy: { createdAt: "desc" } },
        invoice: true,
        review: true,
        coupon: { select: { code: true, type: true, value: true } },
      },
    });

    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    // Multi-tenant & customer privacy authorization check:
    // 1. If staff/admin session is present:
    if (session) {
      if (session.user.role !== "SUPER_ADMIN" && session.user.salonId !== booking.salonId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
      return NextResponse.json({ booking });
    }

    // 2. If customer accessing: must provide matching phone
    if (phone) {
      const variants = getPhoneVariants(phone);
      if (variants.includes(booking.customer.phone)) {
        return NextResponse.json({ booking });
      }
    }

    // If neither staff session nor matching customer phone:
    return NextResponse.json(
      { error: "Authentication or verification required to view appointment details" },
      { status: 401 }
    );
  } catch (error) {
    console.error("Get booking error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        services: true,
        salon: { select: { slug: true } },
      },
    });

    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    // Tenant isolation
    if (session.user.role !== "SUPER_ADMIN" && session.user.salonId !== booking.salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Case 1: Rescheduling requested (new bookingDate and/or startTime)
    if (body.action === "RESCHEDULE" || (body.newDate && body.newTime)) {
      const targetDate = body.newDate || format(new Date(booking.bookingDate), "yyyy-MM-dd");
      const targetTime = body.newTime || booking.startTime;
      const targetStaffId = body.staffId || booking.staffId;

      const serviceIds = booking.services.map((s) => s.serviceId);

      // Re-run full availability validation!
      const availCheck = await isSlotAvailable({
        branchId: booking.branchId,
        staffId: targetStaffId,
        serviceIds,
        date: targetDate,
        startTime: targetTime,
        excludeBookingId: id, // exclude current booking from conflict check
      });

      if (!availCheck.available) {
        return NextResponse.json(
          { error: availCheck.reason || "The selected reschedule slot is not available." },
          { status: 409 }
        );
      }

      const totalDuration = availCheck.totalDuration || 30;
      const targetEndTime = addMinutesToTime(targetTime, totalDuration);

      const rescheduled = await prisma.$transaction(async (tx) => {
        const updated = await tx.booking.update({
          where: { id },
          data: {
            bookingDate: new Date(targetDate),
            startTime: targetTime,
            endTime: targetEndTime,
            staffId: targetStaffId,
            status: "CONFIRMED",
          },
        });

        await tx.bookingStatusHistory.create({
          data: {
            bookingId: id,
            status: "CONFIRMED",
            changedBy: session.user.id,
            reason: body.reason || "Appointment rescheduled",
            notes: `Moved to ${targetDate} at ${targetTime}`,
          },
        });

        await tx.notification.create({
          data: {
            salonId: booking.salonId,
            branchId: booking.branchId,
            bookingId: id,
            type: "BOOKING_RESCHEDULED",
            title: "Appointment Rescheduled",
            message: `Booking ${booking.reference} rescheduled to ${targetDate} at ${targetTime}`,
          },
        });

        return updated;
      });

      return NextResponse.json({ booking: rescheduled, message: "Appointment rescheduled successfully" });
    }

    // Case 2: Status update (CONFIRMED, CHECKED_IN, IN_PROGRESS, COMPLETED, CANCELLED, REJECTED, NO_SHOW)
    const parsed = bookingStatusUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { status, reason, notes } = parsed.data;

    const timestamps: Record<string, any> = {};
    if (status === "CONFIRMED") timestamps.confirmedAt = new Date();
    if (status === "CHECKED_IN") timestamps.checkedInAt = new Date();
    if (status === "IN_PROGRESS") timestamps.inProgressAt = new Date();
    if (status === "COMPLETED") timestamps.completedAt = new Date();
    if (status === "CANCELLED") {
      timestamps.cancelledAt = new Date();
      timestamps.cancellationReason = reason || null;
    }
    if (status === "REJECTED") {
      timestamps.rejectionReason = reason || null;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedBooking = await tx.booking.update({
        where: { id },
        data: {
          status: status as any,
          staffNotes: notes || booking.staffNotes,
          ...timestamps,
        },
      });

      // Record status history
      await tx.bookingStatusHistory.create({
        data: {
          bookingId: id,
          status: status as any,
          changedBy: session.user.id,
          reason,
          notes,
        },
      });

      // Customer stats update
      if (status === "COMPLETED") {
        await tx.customer.update({
          where: { id: booking.customerId },
          data: { totalSpent: { increment: booking.totalAmount } },
        });

        // Loyalty points update: 1 point per 100 LKR
        const earnedPoints = Math.floor(booking.totalAmount / 100);
        if (earnedPoints > 0) {
          const loyaltyAcc = await tx.loyaltyAccount.upsert({
            where: { customerId: booking.customerId },
            update: {
              totalPoints: { increment: earnedPoints },
              balance: { increment: earnedPoints },
            },
            create: {
              customerId: booking.customerId,
              salonId: booking.salonId,
              totalPoints: earnedPoints,
              usedPoints: 0,
              balance: earnedPoints,
            },
          });

          await tx.loyaltyTransaction.create({
            data: {
              accountId: loyaltyAcc.id,
              points: earnedPoints,
              description: `Earned from completed appointment ${booking.reference}`,
              bookingId: id,
            },
          });
        }
      }

      if (status === "NO_SHOW") {
        await tx.customer.update({
          where: { id: booking.customerId },
          data: { noShowCount: { increment: 1 } },
        });
      }

      if (status === "CANCELLED") {
        await tx.customer.update({
          where: { id: booking.customerId },
          data: { cancelCount: { increment: 1 } },
        });
      }

      // Generate invoice on completion with collision-safe unique invoice number
      if (status === "COMPLETED") {
        const slug = (booking.salon?.slug || "SAL").toUpperCase().substring(0, 3);
        const dateStr = format(new Date(), "yyyyMMdd");
        const invRandom = Math.random().toString(36).substring(2, 6).toUpperCase();
        const invoiceNumber = `INV-${slug}-${dateStr}-${invRandom}`;

        await tx.invoice.upsert({
          where: { bookingId: id },
          update: {
            subtotal: booking.subtotal,
            discountAmount: booking.discountAmount,
            taxAmount: booking.taxAmount,
            totalAmount: booking.totalAmount,
            paidAmount: booking.paidAmount,
            balanceAmount: Math.max(0, booking.totalAmount - booking.paidAmount),
          },
          create: {
            invoiceNumber,
            bookingId: id,
            salonId: booking.salonId,
            subtotal: booking.subtotal,
            discountAmount: booking.discountAmount,
            taxAmount: booking.taxAmount,
            totalAmount: booking.totalAmount,
            paidAmount: booking.paidAmount,
            balanceAmount: Math.max(0, booking.totalAmount - booking.paidAmount),
          },
        });
      }

      // Create notification
      const notificationMessages: Record<string, string> = {
        CONFIRMED: `Booking ${booking.reference} confirmed`,
        REJECTED: `Booking ${booking.reference} rejected`,
        CANCELLED: `Booking ${booking.reference} cancelled`,
        COMPLETED: `Booking ${booking.reference} completed`,
        CHECKED_IN: `Customer checked in for ${booking.reference}`,
        IN_PROGRESS: `Treatment started for ${booking.reference}`,
      };

      if (notificationMessages[status]) {
        await tx.notification.create({
          data: {
            salonId: booking.salonId,
            branchId: booking.branchId,
            bookingId: id,
            type: (`BOOKING_${status}` as any) || "GENERAL",
            title: `Booking ${status.charAt(0) + status.slice(1).toLowerCase().replace("_", " ")}`,
            message: notificationMessages[status],
          },
        });
      }

      return updatedBooking;
    });

    return NextResponse.json({ booking: updated });
  } catch (error) {
    console.error("Update booking error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
