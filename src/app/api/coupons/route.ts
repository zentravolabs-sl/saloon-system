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

    const coupons = await prisma.coupon.findMany({
      where: { salonId: session.user.salonId },
      include: {
        _count: { select: { usages: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const mapped = coupons.map((c: (typeof coupons)[number]) => ({
      ...c,
      discountType: c.type,
      discountValue: c.value,
      maxUses: c.maxUsage,
      validUntil: c.endDate,
    }));

    return NextResponse.json({ coupons: mapped });
  } catch (error) {
    console.error("Coupons fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch coupons" }, { status: 500 });
  }
}

export async function POST(req: Request) {
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
    const { code, discountType, discountValue, minBookingValue, maxDiscount, maxUses, validUntil } = body;

    if (!code || !discountType || discountValue === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const coupon = await prisma.coupon.create({
      data: {
        salonId: session.user.salonId,
        code: code.trim().toUpperCase(),
        name: code.trim().toUpperCase(),
        type: discountType as any,
        value: Number(discountValue),
        minBookingValue: minBookingValue ? Number(minBookingValue) : null,
        maxDiscount: maxDiscount ? Number(maxDiscount) : null,
        maxUsage: maxUses ? Number(maxUses) : null,
        endDate: validUntil ? new Date(validUntil) : null,
      },
    });

    return NextResponse.json({ coupon }, { status: 201 });
  } catch (error) {
    console.error("Create coupon error:", error);
    return NextResponse.json({ error: "Failed to create coupon" }, { status: 500 });
  }
}
