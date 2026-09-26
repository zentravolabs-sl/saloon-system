import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkSalonApproval } from "@/lib/salon-status";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const salonId = searchParams.get("salonId");
    const branchId = searchParams.get("branchId");
    const categoryId = searchParams.get("categoryId");

    const session = await auth();
    const effectiveSalonId = salonId || session?.user?.salonId;

    if (!effectiveSalonId) {
      return NextResponse.json({ error: "Salon ID is required" }, { status: 400 });
    }

    const where: any = {
      salonId: effectiveSalonId,
      isActive: true,
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (branchId) {
      where.branchServices = {
        some: { branchId, isActive: true },
      };
    }

    const services = await prisma.service.findMany({
      where,
      include: {
        category: true,
        branchServices: branchId ? { where: { branchId } } : true,
        staffServices: {
          include: {
            staff: {
              select: { id: true, name: true, photo: true, status: true },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const mapped = services.map((s: (typeof services)[number]) => {
      const branchSpec = s.branchServices.find((bs: (typeof s.branchServices)[number]) => bs.branchId === branchId);
      return {
        ...s,
        price: branchSpec?.price ?? s.price,
        duration: s.duration,
        bufferTime: s.bufferTime,
        assignedStaff: s.staffServices.map((st: (typeof s.staffServices)[number]) => st.staff),
      };
    });

    return NextResponse.json({ services: mapped });
  } catch (error) {
    console.error("Fetch services error:", error);
    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 });
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
    const { name, description, price, duration, bufferTime, categoryId, staffIds, branchIds } = body;

    if (!name || price === undefined || !duration || !categoryId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const service = await prisma.service.create({
      data: {
        salonId: session.user.salonId,
        name,
        description,
        price: Number(price),
        duration: Number(duration),
        bufferTime: Number(bufferTime || 0),
        categoryId,
        staffServices: staffIds?.length
          ? {
              create: staffIds.map((id: string) => ({ staffId: id })),
            }
          : undefined,
        branchServices: branchIds?.length
          ? {
              create: branchIds.map((id: string) => ({
                branchId: id,
                isActive: true,
              })),
            }
          : undefined,
      },
      include: {
        category: true,
        staffServices: { include: { staff: true } },
      },
    });

    return NextResponse.json({ service }, { status: 201 });
  } catch (error) {
    console.error("Create service error:", error);
    return NextResponse.json({ error: "Failed to create service" }, { status: 500 });
  }
}
