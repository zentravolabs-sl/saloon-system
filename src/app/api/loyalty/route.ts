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

    const accounts = await prisma.loyaltyAccount.findMany({
      where: {
        salonId: session.user.salonId,
        ...(search && {
          customer: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { phone: { contains: search } },
            ],
          },
        }),
      },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true, totalSpent: true } },
        transactions: { orderBy: { createdAt: "desc" }, take: 5 },
      },
      orderBy: { totalPoints: "desc" },
    });

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error("Loyalty fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
