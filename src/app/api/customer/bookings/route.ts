import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPhoneVariants, normalizePhone } from "@/lib/phone";
import { verifyCustomerToken } from "@/lib/customer-token";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");
    const reference = searchParams.get("reference");
    const status = searchParams.get("status");

    if (!phone) {
      return NextResponse.json({ error: "Mobile number is required" }, { status: 400 });
    }

    // Check for Customer authentication token via:
    // 1. Authorization header: Bearer <token>
    // 2. Cookie: customer_token
    // 3. Query param: token
    const authHeader = req.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const cookieHeader = req.headers.get("cookie") || "";
    const cookieMatch = cookieHeader.match(/customer_token=([^;]+)/);
    const cookieToken = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
    const queryToken = searchParams.get("token");

    const activeToken = bearerToken || cookieToken || queryToken;
    const verifiedSession = verifyCustomerToken(activeToken);

    const canonicalPhone = normalizePhone(phone);
    const phoneVariants = getPhoneVariants(phone);

    // Security check: Must have valid OTP token OR provide a specific booking reference
    const hasValidToken =
      verifiedSession &&
      getPhoneVariants(verifiedSession.phone).some((v) => phoneVariants.includes(v));

    if (!hasValidToken && !reference) {
      return NextResponse.json(
        {
          error:
            "Access restricted for security. Please sign in via SMS OTP or provide your booking reference to view appointments.",
          requiresAuth: true,
        },
        { status: 401 }
      );
    }

    const where: any = {
      customer: {
        phone: { in: phoneVariants },
      },
    };

    if (reference) {
      where.reference = reference.trim().toUpperCase();
    }

    if (status && status !== "ALL") {
      if (status === "UPCOMING") {
        where.status = { in: ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"] };
      } else if (status === "COMPLETED") {
        where.status = "COMPLETED";
      } else if (status === "CANCELLED") {
        where.status = { in: ["CANCELLED", "REJECTED", "NO_SHOW"] };
      } else {
        where.status = status;
      }
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        salon: { select: { id: true, name: true, slug: true, phone: true, logo: true } },
        branch: { select: { id: true, name: true, address: true, city: true, phone: true } },
        staff: { select: { id: true, name: true, photo: true, specialization: true } },
        services: {
          include: {
            service: { select: { id: true, name: true, duration: true, price: true } },
          },
        },
        invoice: true,
        review: true,
        statusHistory: { orderBy: { createdAt: "asc" } },
      },
      orderBy: [{ bookingDate: "desc" }, { startTime: "asc" }],
    });

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error("Customer bookings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
