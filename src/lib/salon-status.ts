import { prisma } from "@/lib/prisma";

export async function checkSalonApproval(
  salonId?: string | null,
  userRole?: string
): Promise<{ approved: boolean; status: string | null; error?: string }> {
  // Super admin can always perform all actions
  if (userRole === "SUPER_ADMIN") {
    return { approved: true, status: "APPROVED" };
  }

  if (!salonId) {
    return { approved: false, status: null, error: "Salon ID is required." };
  }

  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: { id: true, name: true, status: true },
  });

  if (!salon) {
    return { approved: false, status: null, error: "Salon not found." };
  }

  if (salon.status !== "APPROVED") {
    const statusMsg =
      salon.status === "PENDING"
        ? "Your salon registration is pending Super Admin approval. Creating or modifying records is disabled until approved."
        : `Your salon is currently ${salon.status.toLowerCase()}. Actions are disabled.`;

    return {
      approved: false,
      status: salon.status,
      error: statusMsg,
    };
  }

  return { approved: true, status: salon.status };
}
