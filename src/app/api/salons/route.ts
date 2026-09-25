import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { salonRegistrationSchema } from "@/lib/validations";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = salonRegistrationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, ownerName, email, phone, address, city, description, website, logo } = parsed.data;

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    // Generate salon slug from name
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.salon.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter++}`;
    }

    // Create user and salon in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: ownerName,
          email,
          phone,
          password: hashedPassword,
          role: "SALON_OWNER",
        },
      });

      const salon = await tx.salon.create({
        data: {
          name,
          slug,
          description,
          logo,
          website,
          email,
          phone,
          address,
          city,
          status: "PENDING",
          ownerId: user.id,
        },
      });

      // Create default subscription
      await tx.salonSubscription.create({
        data: {
          salonId: salon.id,
          plan: "FREE",
          status: "TRIAL",
        },
      });

      return { user, salon };
    });

    return NextResponse.json(
      {
        message: "Registration submitted successfully. Awaiting admin approval.",
        salonId: result.salon.id,
        // In production, send email with temp password. For now, include in response for dev.
        tempPassword,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Salon registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const city = searchParams.get("city"); // for public booking location filter
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { owner: { name: { contains: search, mode: "insensitive" } } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }
    // Filter by city: match salon city OR any active branch in that city
    if (city) {
      where.OR = [
        ...(where.OR || []),
        { city: { equals: city, mode: "insensitive" } },
        {
          branches: {
            some: {
              city: { equals: city, mode: "insensitive" },
              status: "ACTIVE",
            },
          },
        },
      ];
    }

    const [salons, total] = await Promise.all([
      prisma.salon.findMany({
        where,
        include: {
          owner: { select: { id: true, name: true, email: true } },
          _count: { select: { branches: true, staff: true, bookings: true } },
          subscription: true,
          // Include active branches so public booking wizard can filter by city
          branches: {
            where: { status: "ACTIVE" },
            select: { id: true, name: true, city: true, address: true },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.salon.count({ where }),
    ]);

    return NextResponse.json({ salons, total, page, limit });
  } catch (error) {
    console.error("Get salons error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
