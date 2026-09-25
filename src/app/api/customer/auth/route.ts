import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPhoneVariants, normalizePhone } from "@/lib/phone";
import { signCustomerToken } from "@/lib/customer-token";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, otp, action, name } = body;

    if (!phone) {
      return NextResponse.json({ error: "Mobile number is required" }, { status: 400 });
    }

    const canonicalPhone = normalizePhone(phone);
    const phoneVariants = getPhoneVariants(phone);

    // 1. Action: Send OTP
    if (action === "send_otp") {
      // In production, integrate with SMS gateway (Dialog, Mobitel, Twilio)
      // For demonstration, standard 6-digit code:
      const demoCode = "123456";
      return NextResponse.json({
        success: true,
        message: "Verification code sent to " + phone.trim(),
        code: demoCode,
      });
    }

    // 2. Action: Verify OTP / Login
    if (otp !== "123456" && otp !== "000000") {
      return NextResponse.json(
        { error: "Invalid verification code. Please check and try again (Demo code: 123456)" },
        { status: 400 }
      );
    }

    // Generate signed customer token
    const token = signCustomerToken(canonicalPhone);

    // Find all customer records associated with this phone number across salons
    const customers = await prisma.customer.findMany({
      where: { phone: { in: phoneVariants } },
      include: {
        salon: { select: { id: true, name: true, slug: true } },
        loyaltyAccount: true,
      },
    });

    const primaryCustomer = customers[0] || null;

    const response = NextResponse.json({
      success: true,
      token,
      customer: {
        phone: canonicalPhone,
        name: primaryCustomer?.name || name || "Customer",
        email: primaryCustomer?.email || null,
        totalBookings: customers.reduce((sum, c) => sum + c.totalBookings, 0),
        totalSpent: customers.reduce((sum, c) => sum + c.totalSpent, 0),
      },
      salons: customers.map((c) => ({
        salonId: c.salonId,
        salonName: c.salon.name,
        loyaltyPoints: c.loyaltyAccount?.balance || 0,
      })),
    });

    // Set secure HTTP-only cookie
    response.cookies.set("customer_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 3600, // 30 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Customer auth error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
