import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/locations
 * Returns distinct cities/districts from approved salons & their branches
 * Used by the public booking wizard for location filtering
 */
export async function GET() {
  try {
    // Get distinct cities from approved salons
    const salonCities = await prisma.salon.findMany({
      where: { status: "APPROVED", city: { not: null } },
      select: { city: true },
      distinct: ["city"],
    });

    // Get distinct cities from branches of approved salons
    const branchCities = await prisma.branch.findMany({
      where: {
        status: "ACTIVE",
        city: { not: null },
        salon: { status: "APPROVED" },
      },
      select: { city: true },
      distinct: ["city"],
    });

    // Merge and deduplicate
    const allCities = new Set();
    salonCities.forEach((s) => s.city && allCities.add(s.city));
    branchCities.forEach((b) => b.city && allCities.add(b.city));

    const cities = Array.from(allCities).sort();

    return NextResponse.json({ cities });
  } catch (error) {
    console.error("Get locations error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
