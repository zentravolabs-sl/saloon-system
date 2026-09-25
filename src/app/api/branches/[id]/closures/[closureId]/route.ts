import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkSalonApproval } from "@/lib/salon-status";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; closureId: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, closureId } = await params;

    const closure = await prisma.branchClosure.findUnique({
      where: { id: closureId },
      include: { branch: { select: { salonId: true } } },
    });

    if (!closure) return NextResponse.json({ error: "Closure not found" }, { status: 404 });
    if (closure.branchId !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (session.user.role !== "SUPER_ADMIN" && session.user.salonId !== closure.branch.salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const approvalCheck = await checkSalonApproval(closure.branch.salonId, session.user.role);
    if (!approvalCheck.approved) {
      return NextResponse.json({ error: approvalCheck.error }, { status: 403 });
    }

    await prisma.branchClosure.delete({ where: { id: closureId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete closure error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
