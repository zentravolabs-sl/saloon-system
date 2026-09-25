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
    const search = searchParams.get("search") || "";

    const invoices = await prisma.invoice.findMany({
      where: {
        booking: { salonId: session.user.salonId },
        OR: search
          ? [
              { invoiceNumber: { contains: search, mode: "insensitive" } },
              { booking: { customer: { name: { contains: search, mode: "insensitive" } } } },
              { booking: { customer: { phone: { contains: search, mode: "insensitive" } } } },
            ]
          : undefined,
      },
      include: {
        booking: {
          include: {
            customer: true,
            branch: true,
            staff: true,
            services: { include: { service: true } },
            payments: true,
          },
        },
      },
      orderBy: { issuedAt: "desc" },
    });

    return NextResponse.json({ invoices });
  } catch (error) {
    console.error("Invoices fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}
