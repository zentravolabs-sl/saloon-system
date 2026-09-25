import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Super Admin has full approval rights
    if (session.user.role === "SUPER_ADMIN") {
      return NextResponse.json({
        salon: {
          id: "super-admin",
          name: "Platform Administration",
          slug: "platform",
          status: "APPROVED",
          isApproved: true,
        },
      });
    }

    const salonId = session.user.salonId;
    if (!salonId) {
      return NextResponse.json({ error: "Salon not found" }, { status: 404 });
    }

    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        createdAt: true,
      },
    });

    if (!salon) {
      return NextResponse.json({ error: "Salon not found" }, { status: 404 });
    }

    return NextResponse.json({
      salon: {
        id: salon.id,
        name: salon.name,
        slug: salon.slug,
        status: salon.status,
        isApproved: salon.status === "APPROVED",
        createdAt: salon.createdAt,
      },
    });
  } catch (error) {
    console.error("Get salon status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
