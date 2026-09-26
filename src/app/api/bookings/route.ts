import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { bookingCreateSchema } from "@/lib/validations";
import {
  isSlotAvailable,
  addMinutesToTime,
  generateSafeBookingReference,
} from "@/lib/availability";
import { checkSalonApproval } from "@/lib/salon-status";
import { normalizePhone, getPhoneVariants } from "@/lib/phone";
import { signCustomerToken } from "@/lib/customer-token";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const requestedSalonId = searchParams.get("salonId");

    // Enforce multi-tenant security: Only SUPER_ADMIN can view other salons
    let salonId = session.user.salonId;
    if (session.user.role === "SUPER_ADMIN" && requestedSalonId) {
      salonId = requestedSalonId;
    }

    if (!salonId) {
      return NextResponse.json({ error: "Salon not found" }, { status: 404 });
    }

    const branchId = searchParams.get("branchId");
    const staffId = searchParams.get("staffId");
    const status = searchParams.get("status");
    const date = searchParams.get("date");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: any = { salonId };
    if (branchId) where.branchId = branchId;
    if (staffId) where.staffId = staffId;
    if (status) where.status = status;
    if (date) {
      where.bookingDate = {
        gte: new Date(date + "T00:00:00.000Z"),
        lt: new Date(date + "T23:59:59.999Z"),
      };
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, phone: true, email: true } },
          staff: { select: { id: true, name: true, photo: true, specialization: true } },
          branch: { select: { id: true, name: true, city: true, address: true } },
          services: {
            include: { service: { select: { id: true, name: true, duration: true, price: true } } },
          },
        },
        orderBy: [{ bookingDate: "desc" }, { startTime: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ]);

    return NextResponse.json({ bookings, total, page, limit });
  } catch (error) {
    console.error("Fetch bookings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = bookingCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      branchId,
      staffId,
      serviceIds,
      bookingDate,
      startTime,
      customerName,
      customerPhone,
      customerEmail,
      customerNotes,
      couponCode,
    } = parsed.data;

    // 1. Get and verify the branch
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      include: {
        salon: { select: { id: true, status: true, slug: true, name: true, settings: true } },
      },
    });

    if (!branch) return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    if (branch.status !== "ACTIVE") return NextResponse.json({ error: "Branch is inactive" }, { status: 400 });

    // 2. Ensure salon is approved by Super Admin
    const approvalCheck = await checkSalonApproval(branch.salonId);
    if (!approvalCheck.approved) {
      return NextResponse.json({ error: approvalCheck.error }, { status: 403 });
    }

    // 3. Full server-side availability check (validates all 21 rules)
    const slotCheck = await isSlotAvailable({
      branchId,
      staffId,
      serviceIds,
      date: bookingDate,
      startTime,
    });

    if (!slotCheck.available) {
      return NextResponse.json(
        { error: slotCheck.reason || "This time slot is no longer available. Please select another slot." },
        { status: 409 }
      );
    }

    const services = slotCheck.services!;
    const totalDuration = slotCheck.totalDuration!;
    const endTime = addMinutesToTime(startTime, totalDuration);

    // 4. Calculate subtotal using branch-specific pricing overrides
    let subtotal = 0;
    for (const service of services) {
      const branchService = await prisma.branchService.findUnique({
        where: { branchId_serviceId: { branchId, serviceId: service.id } },
      });
      subtotal += branchService?.price ?? service.price;
    }

    // 5. Apply coupon if provided
    let discountAmount = 0;
    let couponId: string | undefined;
    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { salonId_code: { salonId: branch.salonId, code: couponCode.toUpperCase() } },
      });

      if (coupon && coupon.isActive) {
        // Validate min booking value
        if (!coupon.minBookingValue || subtotal >= coupon.minBookingValue) {
          if (coupon.type === "PERCENTAGE") {
            discountAmount = (subtotal * coupon.value) / 100;
            if (coupon.maxDiscount) discountAmount = Math.min(discountAmount, coupon.maxDiscount);
          } else {
            discountAmount = Math.min(coupon.value, subtotal);
          }
          couponId = coupon.id;
        }
      }
    }

    const totalAmount = Math.max(0, subtotal - discountAmount);

    // 6. Normalize customer phone canonically (Sri Lanka: +94XXXXXXXXX)
    const canonicalPhone = normalizePhone(customerPhone);
    const phoneVariants = getPhoneVariants(customerPhone);

    // 7. Determine autoConfirm setting
    const settings = branch.salon.settings as any;
    const autoConfirm = settings?.autoConfirm === true;
    const initialStatus = autoConfirm ? "CONFIRMED" : "PENDING";

    // 8. Execute in concurrency-safe PostgreSQL transaction with advisory lock
    const booking = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Serialize concurrent booking requests for this staff member and date
      const lockKey = `staff_${staffId}_${bookingDate}`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

      // Conflict check inside locked transaction
      const conflictingBooking = await tx.booking.findFirst({
        where: {
          staffId,
          bookingDate: {
            gte: new Date(bookingDate + "T00:00:00.000Z"),
            lt: new Date(bookingDate + "T23:59:59.999Z"),
          },
          status: { notIn: ["CANCELLED", "REJECTED", "NO_SHOW"] },
          AND: [
            { startTime: { lt: endTime } },
            { endTime: { gt: startTime } },
          ],
        },
      });

      if (conflictingBooking) {
        throw new Error("SLOT_CONFLICT");
      }

      // Safe concurrency booking reference generation
      const reference = await generateSafeBookingReference(
        tx,
        branch.salonId,
        branch.salon.slug || "SAL",
        bookingDate
      );

      // Find or create customer with canonical phone
      let customer = await tx.customer.findFirst({
        where: {
          salonId: branch.salonId,
          phone: { in: phoneVariants },
        },
      });

      if (!customer) {
        customer = await tx.customer.create({
          data: {
            salonId: branch.salonId,
            name: customerName,
            phone: canonicalPhone,
            email: customerEmail || null,
          },
        });
      } else {
        // Upgrade legacy non-canonical phone to canonical representation
        if (customer.phone !== canonicalPhone) {
          await tx.customer.update({
            where: { id: customer.id },
            data: { phone: canonicalPhone },
          });
        }
      }

      // Create Booking record
      const newBooking = await tx.booking.create({
        data: {
          reference,
          salonId: branch.salonId,
          branchId,
          customerId: customer.id,
          staffId,
          bookingDate: new Date(bookingDate),
          startTime,
          endTime,
          status: initialStatus as any,
          source: (body.source as any) || "ONLINE",
          customerNotes,
          subtotal,
          discountAmount,
          totalAmount,
          couponId,
          confirmedAt: autoConfirm ? new Date() : null,
        },
      });

      // Create booking services
      for (const service of services) {
        const branchService = await tx.branchService.findUnique({
          where: { branchId_serviceId: { branchId, serviceId: service.id } },
        });
        await tx.bookingService.create({
          data: {
            bookingId: newBooking.id,
            serviceId: service.id,
            staffId,
            price: branchService?.price ?? service.price,
            duration: service.duration,
            bufferTime: service.bufferTime,
          },
        });
      }

      // Record initial status history
      await tx.bookingStatusHistory.create({
        data: {
          bookingId: newBooking.id,
          status: initialStatus as any,
          notes: "Booking created",
        },
      });

      // Update customer stats
      await tx.customer.update({
        where: { id: customer.id },
        data: { totalBookings: { increment: 1 } },
      });

      // Record coupon usage if applicable
      if (couponId) {
        await tx.couponUsage.create({
          data: {
            couponId,
            customerId: customer.id,
            bookingId: newBooking.id,
          },
        });
      }

      // Create in-app notification for salon admin
      await tx.notification.create({
        data: {
          salonId: branch.salonId,
          branchId,
          bookingId: newBooking.id,
          type: "BOOKING_CREATED",
          title: "New Booking Created",
          message: `Booking ${reference} submitted by ${customerName} for ${bookingDate} at ${startTime}`,
          data: { bookingId: newBooking.id, reference },
        },
      });

      return newBooking;
    });

    const customerToken = signCustomerToken(canonicalPhone);

    const response = NextResponse.json(
      {
        booking: {
          id: booking.id,
          reference: booking.reference,
          status: booking.status,
          totalAmount: booking.totalAmount,
          bookingDate: booking.bookingDate,
          startTime: booking.startTime,
          endTime: booking.endTime,
        },
        customerToken,
        message: autoConfirm
          ? "Booking confirmed successfully"
          : "Booking submitted. Awaiting confirmation.",
      },
      { status: 201 }
    );

    response.cookies.set("customer_token", customerToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 3600,
      path: "/",
    });

    return response;
  } catch (error: any) {
    if (error.message === "SLOT_CONFLICT") {
      return NextResponse.json(
        { error: "This time slot is no longer available. Please select another slot." },
        { status: 409 }
      );
    }
    console.error("Create booking error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
