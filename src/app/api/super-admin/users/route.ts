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
    const search = searchParams.get("search");

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        ownedSalons: { select: { id: true, name: true } },
        staffProfile: {
          include: { salon: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const mapped = users.map((u: (typeof users)[number]) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      isActive: u.isActive,
      salonName: u.ownedSalons[0]?.name || u.staffProfile?.salon?.name || "Platform",
      createdAt: u.createdAt,
    }));

    return NextResponse.json({ users: mapped });
  } catch (error) {
    console.error("Super admin users error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
