import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizePhone, getPhoneVariants } from "@/lib/phone";
import { customerSchema } from "@/lib/validations";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user.salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get("search") || "").trim();
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");

    const isPaginated = pageParam !== null || limitParam !== null;
    const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
    const limit = Math.max(1, parseInt(limitParam || "7", 10) || 7);

    const digitsOnly = search.replace(/\D/g, "");
    const strippedZero = digitsOnly.startsWith("0")
      ? digitsOnly.slice(1)
      : digitsOnly.startsWith("94") && digitsOnly.length > 9
      ? digitsOnly.slice(2)
      : digitsOnly;
    const phoneVariants = search ? getPhoneVariants(search) : [];

    const where = {
      salonId: session.user.salonId,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { phone: { contains: search, mode: "insensitive" as const } },
              ...(strippedZero.length >= 3
                ? [{ phone: { contains: strippedZero, mode: "insensitive" as const } }]
                : []),
              ...(phoneVariants.length > 0
                ? [{ phone: { in: phoneVariants } }]
                : []),
              { email: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        include: {
          bookings: {
            select: {
              id: true,
              reference: true,
              bookingDate: true,
              status: true,
              totalAmount: true,
            },
            orderBy: { bookingDate: "desc" },
          },
          loyaltyAccount: true,
        },
        orderBy: { createdAt: "desc" },
        ...(isPaginated ? { skip: (page - 1) * limit, take: limit } : {}),
      }),
    ]);

    const mapped = customers.map((c: (typeof customers)[number]) => {
      const completed = c.bookings.filter((b: (typeof c.bookings)[number]) => b.status === "COMPLETED");
      const totalSpend = completed.reduce((sum: number, b: (typeof completed)[number]) => sum + b.totalAmount, 0);
      const noShows = c.bookings.filter((b: (typeof c.bookings)[number]) => b.status === "NO_SHOW").length;
      const cancelled = c.bookings.filter((b: (typeof c.bookings)[number]) => b.status === "CANCELLED").length;

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        notes: c.notes,
        totalBookings: c.bookings.length,
        completedBookings: completed.length,
        noShows,
        cancelled,
        totalSpend,
        loyaltyPoints: c.loyaltyAccount?.balance || 0,
        recentBookings: c.bookings.slice(0, 5),
      };
    });

    const totalPages = isPaginated ? Math.max(1, Math.ceil(total / limit)) : 1;

    return NextResponse.json({
      customers: mapped,
      total,
      page,
      limit: isPaginated ? limit : total,
      totalPages,
      pagination: {
        total,
        page,
        limit: isPaginated ? limit : total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Customers fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user.salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = customerSchema.safeParse(body);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json({ error: errorMsg || "Invalid customer details" }, { status: 400 });
    }

    const { name, phone, email, gender, notes } = parsed.data;
    const salonId = session.user.salonId;
    const canonicalPhone = normalizePhone(phone);
    const variants = getPhoneVariants(phone);

    let customer = await prisma.customer.findFirst({
      where: {
        salonId,
        phone: { in: variants.length > 0 ? variants : [canonicalPhone, phone.trim()] },
      },
    });

    if (customer) {
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          name: name.trim(),
          phone: canonicalPhone || phone.trim(),
          ...(email ? { email } : {}),
          ...(notes ? { notes } : {}),
        },
      });
      return NextResponse.json({ customer, existing: true }, { status: 200 });
    }

    customer = await prisma.customer.create({
      data: {
        salonId,
        name: name.trim(),
        phone: canonicalPhone || phone.trim(),
        email: email || null,
        gender: gender || null,
        notes: notes || null,
      },
    });

    return NextResponse.json({ customer, existing: false }, { status: 201 });
  } catch (error) {
    console.error("Customer create error:", error);
    return NextResponse.json({ error: "Failed to add customer" }, { status: 500 });
  }
}
