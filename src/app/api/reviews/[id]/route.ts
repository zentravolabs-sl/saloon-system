import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user.salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { isPublished, isModerated } = body;

    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });

    if (review.salonId !== session.user.salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const updated = await prisma.review.update({
      where: { id },
      data: {
        ...(isPublished !== undefined && { isPublished }),
        ...(isModerated !== undefined && {
          isModerated,
          moderatedBy: session.user.id,
        }),
      },
    });

    return NextResponse.json({ review: updated });
  } catch (error) {
    console.error("Update review error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
