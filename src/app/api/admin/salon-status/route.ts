import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function findSalonWithRetry(salonId: string, retries = 1) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await prisma.salon.findUnique({
        where: { id: salonId },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          createdAt: true,
        },
      });
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  return null;
}

export async function GET() {
  let session = null;
  try {
    session = await auth();
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

    const salon = await findSalonWithRetry(salonId);

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

    // Graceful fallback to JWT session salon data if DB is still waking from a Neon cold start
    if (session?.user?.salonId) {
      const fallbackStatus = session.user.salonStatus || "APPROVED";
      return NextResponse.json({
        salon: {
          id: session.user.salonId,
          name: session.user.salonName || "Salon",
          slug: session.user.salonSlug || "salon",
          status: fallbackStatus,
          isApproved: fallbackStatus === "APPROVED",
        },
        fromSessionFallback: true,
      });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
