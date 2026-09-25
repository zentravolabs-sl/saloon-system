import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { code, salonId, totalAmount } = await req.json();

    if (!code || !salonId) {
      return NextResponse.json({ valid: false, error: "Code and salonId required" }, { status: 400 });
    }

    const coupon = await prisma.coupon.findFirst({
      where: {
        code: code.trim().toUpperCase(),
        salonId,
        isActive: true,
      },
      include: {
        _count: { select: { usages: true } },
      },
    });

    if (!coupon) {
      return NextResponse.json({ valid: false, error: "Invalid coupon code" }, { status: 404 });
    }

    // Check expiry
    if (coupon.endDate && new Date() > new Date(coupon.endDate)) {
      return NextResponse.json({ valid: false, error: "Coupon has expired" }, { status: 400 });
    }

    // Check max usages
    if (coupon.maxUsage && coupon._count.usages >= coupon.maxUsage) {
      return NextResponse.json({ valid: false, error: "Coupon usage limit reached" }, { status: 400 });
    }

    // Check min booking value
    const amount = Number(totalAmount || 0);
    if (coupon.minBookingValue && amount < coupon.minBookingValue) {
      return NextResponse.json({
        valid: false,
        error: `Minimum booking value of ${coupon.minBookingValue} required`,
      }, { status: 400 });
    }

    // Calculate discount
    let discount = 0;
    if (coupon.type === "PERCENTAGE") {
      discount = (amount * coupon.value) / 100;
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      discount = Math.min(coupon.value, amount);
    }

    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.type,
        discountValue: coupon.value,
        calculatedDiscount: discount,
      },
    });
  } catch (error) {
    console.error("Validate coupon error:", error);
    return NextResponse.json({ valid: false, error: "Validation failed" }, { status: 500 });
  }
}
