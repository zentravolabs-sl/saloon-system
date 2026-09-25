import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bookingLookupSchema } from "@/lib/validations";
import { getPhoneVariants } from "@/lib/phone";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");
    const reference = searchParams.get("reference");

    if (!phone || !reference) {
      return NextResponse.json(
        { error: "Please provide a valid phone number and booking reference" },
        { status: 400 }
      );
    }

    const phoneVariants = getPhoneVariants(phone);
    const cleanRef = reference.trim();

    const booking = await prisma.booking.findFirst({
      where: {
        reference: { equals: cleanRef, mode: "insensitive" },
        customer: { phone: { in: phoneVariants } },
      },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        staff: { select: { id: true, name: true, photo: true, specialization: true } },
        branch: { select: { id: true, name: true, address: true, phone: true, email: true } },
        salon: { select: { id: true, name: true, logo: true, phone: true, address: true } },
        services: {
          include: {
            service: { select: { id: true, name: true, duration: true, price: true } },
          },
        },
        statusHistory: { orderBy: { createdAt: "asc" } },
        invoice: true,
        review: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "No booking found with this phone number and reference" },
        { status: 404 }
      );
    }

    return NextResponse.json({ booking });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = bookingLookupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please provide a valid phone number and booking reference" },
        { status: 400 }
      );
    }

    const { phone, reference } = parsed.data;
    const phoneVariants = getPhoneVariants(phone);
    const cleanRef = reference.trim();

    const booking = await prisma.booking.findFirst({
      where: {
        reference: { equals: cleanRef, mode: "insensitive" },
        customer: { phone: { in: phoneVariants } },
      },
      include: {
        customer: { select: { name: true, phone: true } },
        staff: { select: { name: true, photo: true } },
        branch: { select: { name: true, address: true, phone: true } },
        salon: { select: { name: true, logo: true, phone: true } },
        services: {
          include: {
            service: { select: { name: true, duration: true } },
          },
        },
        statusHistory: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "No booking found with this phone number and reference" },
        { status: 404 }
      );
    }

    return NextResponse.json({ booking });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
