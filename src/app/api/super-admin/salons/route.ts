import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const salons = await prisma.salon.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, email: true, phone: true } },
        subscription: true,
        _count: {
          select: {
            branches: true,
            staff: true,
            bookings: true,
            services: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ salons });
  } catch (error) {
    console.error("Super admin salons fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch salons" }, { status: 500 });
  }
}
