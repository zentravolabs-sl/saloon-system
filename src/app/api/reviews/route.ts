import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const salonId = searchParams.get("salonId");
    const session = await auth();

    const effectiveSalonId = salonId || session?.user?.salonId;
    if (!effectiveSalonId) {
      return NextResponse.json({ error: "Salon ID required" }, { status: 400 });
    }

    const reviews = await prisma.review.findMany({
      where: { salonId: effectiveSalonId },
      include: {
        customer: { select: { id: true, name: true } },
        booking: {
          select: {
            staff: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const mapped = reviews.map((r: (typeof reviews)[number]) => ({
      id: r.id,
      rating: r.salonRating,
      staffRating: r.staffRating,
      serviceRating: r.serviceRating,
      comment: r.comment,
      customer: r.customer,
      staff: r.booking?.staff,
      createdAt: r.createdAt,
    }));

    return NextResponse.json({ reviews: mapped });
  } catch (error) {
    console.error("Reviews fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bookingId, rating, comment, staffRating, serviceRating } = body;

    if (!bookingId || !rating) {
      return NextResponse.json({ error: "Booking ID and rating are required" }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { review: true, services: true },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.status !== "COMPLETED") {
      return NextResponse.json({ error: "Only completed bookings can be reviewed" }, { status: 400 });
    }

    if (booking.review) {
      return NextResponse.json({ error: "This booking has already been reviewed" }, { status: 400 });
    }

    const review = await prisma.review.create({
      data: {
        bookingId,
        salonId: booking.salonId,
        customerId: booking.customerId,
        staffId: booking.staffId,
        salonRating: Number(rating),
        staffRating: staffRating ? Number(staffRating) : null,
        serviceRating: serviceRating ? Number(serviceRating) : null,
        comment,
      },
    });

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    console.error("Create review error:", error);
    return NextResponse.json({ error: "Failed to create review" }, { status: 500 });
  }
}
