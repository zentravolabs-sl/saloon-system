import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            customer: true,
            staff: { select: { id: true, name: true, photo: true, specialization: true } },
            branch: true,
            salon: { select: { id: true, name: true, logo: true, phone: true, address: true, email: true } },
            services: {
              include: {
                service: { include: { category: { select: { name: true } } } },
              },
            },
            payments: true,
            coupon: { select: { code: true, type: true, value: true } },
          },
        },
      },
    });

    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    const session = await auth();
    if (session) {
      if (session.user.role !== "SUPER_ADMIN" && session.user.salonId !== invoice.booking.salonId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    return NextResponse.json({ invoice });
  } catch (error) {
    console.error("Invoice fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
