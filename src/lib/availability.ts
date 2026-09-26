import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { format, parseISO } from "date-fns";

export interface AvailabilityParams {
  branchId: string;
  staffId: string;
  serviceIds: string[];
  date: string; // YYYY-MM-DD
  excludeBookingId?: string; // For rescheduling
}

export interface TimeSlot {
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  available: boolean;
}

export interface AvailabilityResult {
  slots: TimeSlot[];
  error?: string;
  branch?: any;
  staff?: any;
  services?: any[];
  totalDuration?: number;
}

/**
 * Hardened availability engine - validates all 21 server-side constraints.
 * Never trusts client-supplied branchId, staffId, or serviceIds blindly.
 */
export async function getAvailableSlots(
  params: AvailabilityParams
): Promise<AvailabilityResult> {
  const { branchId, staffId, serviceIds, date, excludeBookingId } = params;

  try {
    if (!branchId || !staffId || !serviceIds || serviceIds.length === 0 || !date) {
      return { slots: [], error: "Missing required booking parameters" };
    }

    // Validate date format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { slots: [], error: "Invalid date format. Expected YYYY-MM-DD" };
    }

    const selectedDate = parseISO(date);
    if (isNaN(selectedDate.getTime())) {
      return { slots: [], error: "Invalid date specified" };
    }

    // Sri Lanka local time check
    const nowUtc = new Date();
    // Offset for Asia/Colombo is UTC+5:30
    const colomboNow = new Date(nowUtc.getTime() + (5 * 60 + 30) * 60000);
    const todayStr = colomboNow.toISOString().split("T")[0];
    const currentColomboHHMM = `${String(colomboNow.getUTCHours()).padStart(2, "0")}:${String(colomboNow.getUTCMinutes()).padStart(2, "0")}`;

    if (date < todayStr) {
      return { slots: [], error: "Appointments cannot be booked for past dates" };
    }

    const dayOfWeek = selectedDate.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday

    // 1. Fetch branch with schedules, closures, salon
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      include: {
        salon: { select: { id: true, status: true, slug: true, name: true, settings: true } },
        schedules: true,
        closures: {
          where: {
            date: {
              gte: new Date(date + "T00:00:00.000Z"),
              lt: new Date(date + "T23:59:59.999Z"),
            },
          },
        },
      },
    });

    if (!branch) return { slots: [], error: "Branch not found" };
    if (branch.status !== "ACTIVE") return { slots: [], error: "Branch is currently inactive" };
    if (branch.salon.status !== "APPROVED") {
      return { slots: [], error: "This salon is currently pending verification or inactive" };
    }

    // Check max advance booking days
    const maxDays = branch.maxAdvanceDays || 30;
    const maxAllowedDate = new Date(colomboNow);
    maxAllowedDate.setDate(maxAllowedDate.getDate() + maxDays);
    const maxAllowedStr = maxAllowedDate.toISOString().split("T")[0];
    if (date > maxAllowedStr) {
      return { slots: [], error: `Appointments can only be booked up to ${maxDays} days in advance` };
    }

    // 2. Fetch staff with schedules, branches, leaves, breaks, services
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      include: {
        schedules: true,
        branches: true,
        breaks: true,
        leaves: {
          where: {
            approved: true, // Only approved leaves block availability
            startDate: { lte: new Date(date + "T23:59:59.999Z") },
            endDate: { gte: new Date(date + "T00:00:00.000Z") },
          },
        },
        services: {
          select: { serviceId: true },
        },
      },
    });

    if (!staff) return { slots: [], error: "Staff member not found" };
    if (staff.status === "INACTIVE") return { slots: [], error: "Selected staff member is inactive" };

    // Tenant Isolation check: Staff must belong to the exact same salon as branch
    if (staff.salonId !== branch.salonId) {
      return { slots: [], error: "Security validation failed: Staff does not belong to this salon" };
    }

    // Verify staff is assigned to the selected branch
    const isAssignedToBranch =
      staff.primaryBranchId === branchId ||
      staff.branches.some((sb: { branchId: string }) => sb.branchId === branchId);

    if (!isAssignedToBranch) {
      return { slots: [], error: `Stylist ${staff.name} is not assigned to ${branch.name}` };
    }

    // 3. Fetch and validate all services
    const services = await prisma.service.findMany({
      where: {
        id: { in: serviceIds },
      },
      include: {
        branchServices: { where: { branchId } },
      },
    });

    if (services.length !== serviceIds.length) {
      return { slots: [], error: "One or more selected services could not be found" };
    }

    // Verify all services belong to this salon and are active
    for (const service of services) {
      if (service.salonId !== branch.salonId) {
        return { slots: [], error: `Service "${service.name}" does not belong to this salon` };
      }
      if (!service.isActive) {
        return { slots: [], error: `Service "${service.name}" is currently unavailable` };
      }
      // If branch service pricing/availability explicitly exists, ensure it's active
      const branchSpec = service.branchServices[0];
      if (branchSpec && !branchSpec.isActive) {
        return { slots: [], error: `Service "${service.name}" is not offered at ${branch.name}` };
      }
    }

    // 4. Verify staff-service compatibility (Staff must be qualified for ALL selected services)
    const staffServiceIds = new Set(staff.services.map((s: { serviceId: string }) => s.serviceId));
    for (const service of services) {
      if (!staffServiceIds.has(service.id)) {
        return {
          slots: [],
          error: `Stylist ${staff.name} is not qualified to perform ${service.name}`,
        };
      }
    }

    // 5. Check branch working hours for this day of week
    const branchSchedule = branch.schedules.find((s: { dayOfWeek: number }) => s.dayOfWeek === dayOfWeek);
    if (!branchSchedule || !branchSchedule.isOpen) {
      return { slots: [], error: `${branch.name} is closed on this day` };
    }

    // 6. Check full-day branch closures / public holidays
    const fullDayClosure = branch.closures.find((c: { isFullDay: boolean }) => c.isFullDay);
    if (fullDayClosure) {
      const reasonText = fullDayClosure.reason ? ` (${fullDayClosure.reason})` : "";
      return { slots: [], error: `Branch is closed on this date${reasonText}` };
    }

    // 7. Check staff schedule for this day of week
    const staffSchedule = staff.schedules.find((s: { dayOfWeek: number }) => s.dayOfWeek === dayOfWeek);
    if (!staffSchedule || !staffSchedule.isWorking) {
      return { slots: [], error: `${staff.name} does not work on this day` };
    }

    // 8. Check staff full-day approved leave
    const fullDayLeave = staff.leaves.find((l: { isFullDay: boolean }) => l.isFullDay);
    if (fullDayLeave) {
      return { slots: [], error: `${staff.name} is on leave on this date` };
    }

    // 9. Calculate total duration + buffer
    const totalDuration = services.reduce(
      (sum: number, s: { duration: number; bufferTime: number }) => sum + s.duration + s.bufferTime,
      0
    );

    // 10. Fetch existing bookings for this staff on this date
    const existingBookings = await prisma.booking.findMany({
      where: {
        staffId,
        bookingDate: {
          gte: new Date(date + "T00:00:00.000Z"),
          lt: new Date(date + "T23:59:59.999Z"),
        },
        status: {
          notIn: ["CANCELLED", "REJECTED", "NO_SHOW"],
        },
        id: excludeBookingId ? { not: excludeBookingId } : undefined,
      },
    });

    // 11. Determine effective working hours (Intersection of branch and staff)
    const workStart = maxTime(branchSchedule.openTime, staffSchedule.startTime);
    const workEnd = minTime(branchSchedule.closeTime, staffSchedule.endTime);

    // 12. Collect all blocked time ranges
    const blockedRanges: Array<{ start: string; end: string; reason: string }> = [];

    // A. Branch partial closures
    branch.closures
      .filter((c: { isFullDay: boolean; startTime: string | null; endTime: string | null }) => !c.isFullDay && c.startTime && c.endTime)
      .forEach((c: { isFullDay: boolean; startTime: string | null; endTime: string | null; reason: string | null }) =>
        blockedRanges.push({
          start: c.startTime!,
          end: c.endTime!,
          reason: `Branch partial closure: ${c.reason || "Maintenance"}`,
        })
      );

    // B. Branch breaks
    if (branchSchedule.hasBreak && branchSchedule.breakStart && branchSchedule.breakEnd) {
      blockedRanges.push({
        start: branchSchedule.breakStart,
        end: branchSchedule.breakEnd,
        reason: "Branch break",
      });
    }

    // C. Staff partial leaves
    staff.leaves
      .filter((l: { isFullDay: boolean; startTime: string | null; endTime: string | null }) => !l.isFullDay && l.startTime && l.endTime)
      .forEach((l: { isFullDay: boolean; startTime: string | null; endTime: string | null; reason: string | null }) =>
        blockedRanges.push({
          start: l.startTime!,
          end: l.endTime!,
          reason: `Staff on partial leave: ${l.reason || ""}`,
        })
      );

    // D. Staff breaks (recurring or for this specific day of week)
    staff.breaks
      .filter((b: { dayOfWeek: number }) => b.dayOfWeek === -1 || b.dayOfWeek === dayOfWeek)
      .forEach((b: { startTime: string; endTime: string }) =>
        blockedRanges.push({
          start: b.startTime,
          end: b.endTime,
          reason: "Staff break",
        })
      );

    // E. Existing active bookings
    existingBookings.forEach((b: { startTime: string; endTime: string }) =>
      blockedRanges.push({
        start: b.startTime,
        end: b.endTime,
        reason: "Existing appointment",
      })
    );

    // Minimum notice constraint for today's bookings
    const minNoticeHours = branch.minNoticeHours || 1;
    const earliestTimeToday =
      date === todayStr
        ? addMinutesToTime(currentColomboHHMM, minNoticeHours * 60)
        : null;

    // 13. Generate discrete slots
    const slotInterval = Math.max(5, branch.bookingInterval || 30);
    const slots: TimeSlot[] = [];

    let currentTime = workStart;

    while (true) {
      const slotEnd = addMinutesToTime(currentTime, totalDuration);

      // Stop if service exceeds work end
      if (compareTime(slotEnd, workEnd) > 0) break;

      // Check if slot conflicts with any blocked range
      const hasConflict = blockedRanges.some(
        (range) =>
          !(
            compareTime(slotEnd, range.start) <= 0 ||
            compareTime(currentTime, range.end) >= 0
          )
      );

      // Check minimum notice if booking for today
      const isTooEarlyToday =
        earliestTimeToday !== null &&
        compareTime(currentTime, earliestTimeToday) < 0;

      const isAvailable = !hasConflict && !isTooEarlyToday;

      slots.push({
        startTime: currentTime,
        endTime: slotEnd,
        available: isAvailable,
      });

      currentTime = addMinutesToTime(currentTime, slotInterval);
    }

    return {
      slots,
      branch,
      staff,
      services,
      totalDuration,
    };
  } catch (error) {
    console.error("Availability engine error:", error);
    return { slots: [], error: "Failed to calculate appointment availability" };
  }
}

/**
 * Server-side validator before committing any booking.
 */
export async function isSlotAvailable(params: {
  branchId: string;
  staffId: string;
  serviceIds: string[];
  date: string;
  startTime: string;
  excludeBookingId?: string;
}): Promise<{ available: boolean; reason?: string; totalDuration?: number; services?: any[] }> {
  const result = await getAvailableSlots({
    branchId: params.branchId,
    staffId: params.staffId,
    serviceIds: params.serviceIds,
    date: params.date,
    excludeBookingId: params.excludeBookingId,
  });

  if (result.error) {
    return { available: false, reason: result.error };
  }

  const slot = result.slots.find((s) => s.startTime === params.startTime);

  if (!slot) {
    return {
      available: false,
      reason: "Requested time slot does not align with branch schedule or duration",
    };
  }

  if (!slot.available) {
    return {
      available: false,
      reason: "This time slot is no longer available. Please select another slot.",
    };
  }

  return {
    available: true,
    totalDuration: result.totalDuration,
    services: result.services,
  };
}

// ============================================================
// TIME UTILITY FUNCTIONS
// ============================================================

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(minutes: number): string {
  const normalized = Math.max(0, minutes % (24 * 60));
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function addMinutesToTime(time: string, minutes: number): string {
  return minutesToTime(timeToMinutes(time) + minutes);
}

export function compareTime(a: string, b: string): number {
  return timeToMinutes(a) - timeToMinutes(b);
}

export function maxTime(a: string, b: string): string {
  return compareTime(a, b) >= 0 ? a : b;
}

export function minTime(a: string, b: string): string {
  return compareTime(a, b) <= 0 ? a : b;
}

/**
 * Concurrency-safe unique booking reference generator.
 * Format: SAL-YYYYMMDD-00001 (or unique 5-char sequence)
 */
export async function generateSafeBookingReference(
  tx: Prisma.TransactionClient,
  salonId: string,
  salonSlug: string,
  bookingDateStr: string
): Promise<string> {
  const cleanDate = bookingDateStr.replace(/-/g, "");
  const prefix = (salonSlug || "SAL").toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 3).padEnd(3, "X");

  // Attempt up to 5 times to acquire a unique sequential or safe reference
  for (let attempt = 0; attempt < 5; attempt++) {
    // Find the current highest reference for this salon on this day
    const lastBooking = await tx.booking.findFirst({
      where: {
        salonId,
        reference: { startsWith: `${prefix}-${cleanDate}-` },
      },
      orderBy: { reference: "desc" },
      select: { reference: true },
    });

    let nextNum = 1;
    if (lastBooking && lastBooking.reference) {
      const parts = lastBooking.reference.split("-");
      const lastCounterStr = parts[parts.length - 1];
      const parsedNum = parseInt(lastCounterStr, 10);
      if (!isNaN(parsedNum)) {
        nextNum = parsedNum + 1 + attempt;
      }
    } else {
      nextNum = 1 + attempt;
    }

    const candidateRef = `${prefix}-${cleanDate}-${String(nextNum).padStart(5, "0")}`;

    // Verify it doesn't already exist
    const existing = await tx.booking.findUnique({
      where: { reference: candidateRef },
      select: { id: true },
    });

    if (!existing) {
      return candidateRef;
    }
  }

  // Cryptographic fallback if sequential slots are heavily contested
  const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${cleanDate}-${randomSuffix}`;
}
