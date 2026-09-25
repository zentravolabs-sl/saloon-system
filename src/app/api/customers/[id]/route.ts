import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user.salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        loyaltyAccount: {
          include: {
            transactions: { orderBy: { createdAt: "desc" }, take: 10 },
          },
        },
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        bookings: {
          include: {
            branch: { select: { id: true, name: true } },
            staff: { select: { id: true, name: true, photo: true } },
            services: { include: { service: { select: { id: true, name: true } } } },
            invoice: { select: { id: true, invoiceNumber: true } },
          },
          orderBy: { bookingDate: "desc" },
          take: 20,
        },
      },
    });

    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    // Tenant isolation
    if (customer.salonId !== session.user.salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json({ customer });
  } catch (error) {
    console.error("Customer detail error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user.salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    if (customer.salonId !== session.user.salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        name: body.name || customer.name,
        email: body.email !== undefined ? body.email : customer.email,
        gender: body.gender !== undefined ? body.gender : customer.gender,
        notes: body.notes !== undefined ? body.notes : customer.notes,
      },
    });

    return NextResponse.json({ customer: updated });
  } catch (error) {
    console.error("Customer update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
