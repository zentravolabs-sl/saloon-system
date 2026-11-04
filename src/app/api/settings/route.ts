import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkSalonApproval } from "@/lib/salon-status";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user.salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const salon = await prisma.salon.findUnique({
      where: { id: session.user.salonId },
      include: { subscription: true },
    });

    if (!salon) {
      return NextResponse.json({ error: "Salon not found" }, { status: 404 });
    }

    return NextResponse.json({ salon });
  } catch (error) {
    console.error("Settings fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user.salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const approvalCheck = await checkSalonApproval(session.user.salonId, session.user.role);
    if (!approvalCheck.approved) {
      return NextResponse.json({ error: approvalCheck.error }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, phone, email, address, city, timezone, currency, settings } = body;

    // Preserve the Phase 1 `operations` block (managed via /api/ops/settings) because this
    // endpoint replaces the whole settings JSON.
    let mergedSettings = settings ?? undefined;
    if (settings && typeof settings === "object" && !Array.isArray(settings)) {
      const existing = await prisma.salon.findUnique({
        where: { id: session.user.salonId },
        select: { settings: true },
      });
      const ops =
        existing?.settings && typeof existing.settings === "object" && !Array.isArray(existing.settings)
          ? (existing.settings as Record<string, unknown>).operations
          : undefined;
      if (ops !== undefined && (settings as Record<string, unknown>).operations === undefined) {
        mergedSettings = { ...settings, operations: ops };
      }
    }

    const updated = await prisma.salon.update({
      where: { id: session.user.salonId },
      data: {
        name,
        description,
        phone,
        email,
        address,
        city,
        timezone,
        currency,
        settings: mergedSettings,
      },
    });

    return NextResponse.json({ salon: updated });
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
