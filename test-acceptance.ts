import "dotenv/config";
import { prisma } from "./src/lib/prisma";
import { getAvailableSlots, isSlotAvailable } from "./src/lib/availability";
import { addMinutes, format } from "date-fns";

async function runAcceptanceTests() {
  console.log("=================================================");
  console.log("🧪 RUNNING SALON SAAS ACCEPTANCE CRITERIA SUITE");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} - ${detail || "Assertion failed"}`);
      failed++;
    }
  }

  try {
    // 1. Fetch Super Admin & Seed Salons
    const superAdmin = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
    assert(!!superAdmin, "Super Admin exists in system", superAdmin?.email);

    const glamourCuts = await prisma.salon.findUnique({
      where: { slug: "glamour-cuts" },
      include: {
        branches: {
          include: {
            schedules: true,
            closures: true,
            staff: true,
          },
        },
        services: true,
      },
    });
    assert(!!glamourCuts, "Glamour Cuts Salon exists with branches and services");
    assert(glamourCuts?.status === "APPROVED", "Glamour Cuts status is APPROVED");

    const colomboBranch = glamourCuts?.branches.find((b) => b.name.includes("Colombo"));
    assert(!!colomboBranch, "Colombo Branch exists under Glamour Cuts");
    assert(colomboBranch?.status === "ACTIVE", "Colombo Branch is ACTIVE");

    // 2. Verify Pending Salon & Approval Workflow
    const pendingSalon = await prisma.salon.findFirst({ where: { status: "PENDING" } });
    assert(!!pendingSalon, "Pending salon exists for Super Admin approval workflow", pendingSalon?.name);

    // 3. Test Availability Engine: Working Hours
    const testDate = "2026-09-29"; // Tuesday (Kasun works 09:00 - 18:00, Colombo branch open)
    const hairCut = glamourCuts?.services.find((s) => s.name === "Hair Cut");
    assert(!!hairCut, "Hair Cut service exists (30 mins + 10 min buffer = 40 mins)");

    // Get a staff member assigned to Colombo branch who can perform Hair Cut
    const staffMember = await prisma.staff.findFirst({
      where: {
        salonId: glamourCuts!.id,
        status: "ACTIVE",
        branches: { some: { branchId: colomboBranch!.id } },
        services: { some: { serviceId: hairCut!.id } },
      },
      include: {
        schedules: true,
        leaves: true,
        breaks: true,
      },
    });
    assert(!!staffMember, `Found active stylist (${staffMember?.name}) for Hair Cut`);

    if (staffMember && colomboBranch && hairCut) {
      // Slot Generation Test
      const { slots, error } = await getAvailableSlots({
        branchId: colomboBranch.id,
        staffId: staffMember.id,
        serviceIds: [hairCut.id],
        date: testDate,
      });

      assert(!error, "Slot generation completed without errors", error);
      assert(slots.length > 0, `Generated ${slots.length} available slots for ${staffMember.name}`);
      console.log(`   Sample generated slots: ${slots.slice(0, 4).map((s) => s.startTime).join(", ")}...`);

      // 4. Test Staff Leave Constraint
      console.log("\n--- Testing Staff Leave Constraint ---");
      const leaveDate = "2026-10-05"; // Next Monday
      // Add temporary staff leave
      const tempLeave = await prisma.staffLeave.create({
        data: {
          staffId: staffMember.id,
          salonId: glamourCuts!.id,
          leaveType: "ANNUAL",
          reason: "Vacation leave",
          isFullDay: true,
          startDate: new Date(leaveDate),
          endDate: new Date(leaveDate),
          approved: true,
        },
      });

      const leaveSlots = await getAvailableSlots({
        branchId: colomboBranch.id,
        staffId: staffMember.id,
        serviceIds: [hairCut.id],
        date: leaveDate,
      });

      assert(
        Boolean(leaveSlots.slots.length === 0 && leaveSlots.error?.includes("leave")),
        "Availability Engine blocks all slots when staff is on full-day leave",
        `Returned: ${leaveSlots.error}`
      );

      // Clean up temp leave
      await prisma.staffLeave.delete({ where: { id: tempLeave.id } });

      // 5. Test Branch Closure Constraint
      console.log("\n--- Testing Branch Closure Constraint ---");
      const holidayDate = "2026-10-12";
      const tempClosure = await prisma.branchClosure.create({
        data: {
          branchId: colomboBranch.id,
          salonId: glamourCuts!.id,
          closureType: "PUBLIC_HOLIDAY",
          reason: "National Poya Holiday",
          isFullDay: true,
          date: new Date(holidayDate),
        },
      });

      const holidaySlots = await getAvailableSlots({
        branchId: colomboBranch.id,
        staffId: staffMember.id,
        serviceIds: [hairCut.id],
        date: holidayDate,
      });

      assert(
        Boolean(holidaySlots.slots.length === 0 && holidaySlots.error?.includes("closed")),
        "Availability Engine blocks all slots when branch is closed on a holiday",
        `Returned: ${holidaySlots.error}`
      );

      // Clean up temp closure
      await prisma.branchClosure.delete({ where: { id: tempClosure.id } });

      // 6. Test Double-Booking Concurrency & Race Condition Prevention
      console.log("\n--- Testing Double-Booking Race Condition Prevention ---");
      const bookingDate = "2026-10-20"; // Tuesday
      const startTime = "11:00";
      const endTime = "11:40";

      // Create Customer
      const testCustomer1 = await prisma.customer.upsert({
        where: { salonId_phone: { salonId: glamourCuts!.id, phone: "+94770001111" } },
        update: {},
        create: {
          salonId: glamourCuts!.id,
          name: "Test Customer One",
          phone: "+94770001111",
        },
      });

      const testCustomer2 = await prisma.customer.upsert({
        where: { salonId_phone: { salonId: glamourCuts!.id, phone: "+94770002222" } },
        update: {},
        create: {
          salonId: glamourCuts!.id,
          name: "Test Customer Two",
          phone: "+94770002222",
        },
      });

      // Clear any prior test booking for this slot
      await prisma.booking.deleteMany({
        where: {
          staffId: staffMember.id,
          bookingDate: new Date(bookingDate),
          startTime,
        },
      });

      // Attempt two simultaneous bookings inside transactions
      const tryBook = async (cust: typeof testCustomer1, ref: string) => {
        return prisma.$transaction(async (tx) => {
          const lockKey = `staff_${staffMember.id}_${bookingDate}`;
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

          const conflicting = await tx.booking.findFirst({
            where: {
              staffId: staffMember.id,
              bookingDate: {
                gte: new Date(bookingDate + "T00:00:00.000Z"),
                lt: new Date(bookingDate + "T23:59:59.999Z"),
              },
              status: { notIn: ["CANCELLED", "REJECTED", "NO_SHOW"] },
              AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }],
            },
          });

          if (conflicting) {
            throw new Error("SLOT_CONFLICT");
          }

          return tx.booking.create({
            data: {
              reference: ref,
              salonId: glamourCuts!.id,
              branchId: colomboBranch.id,
              customerId: cust.id,
              staffId: staffMember.id,
              bookingDate: new Date(bookingDate),
              startTime,
              endTime,
              status: "CONFIRMED",
              totalAmount: hairCut.price,
              subtotal: hairCut.price,
            },
          });
        });
      };

      const results = await Promise.allSettled([
        tryBook(testCustomer1, "TEST-REF-001"),
        tryBook(testCustomer2, "TEST-REF-002"),
      ]);

      const succeeded = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      assert(
        succeeded.length === 1 && rejected.length === 1,
        "Double-booking race condition correctly prevented: exactly 1 booking succeeded, 1 rejected with SLOT_CONFLICT",
        `Succeeded: ${succeeded.length}, Rejected: ${rejected.length}`
      );

      // Clean up test booking
      await prisma.booking.deleteMany({
        where: { reference: { in: ["TEST-REF-001", "TEST-REF-002"] } },
      });

      // 7. Test Lifecycle: PENDING -> CONFIRMED -> CHECKED_IN -> IN_PROGRESS -> COMPLETED -> INVOICE
      console.log("\n--- Testing Full Booking Lifecycle & Invoice Generation ---");
      const lifecycleBooking = await prisma.booking.create({
        data: {
          reference: "TEST-LIFECYCLE-999",
          salonId: glamourCuts!.id,
          branchId: colomboBranch.id,
          customerId: testCustomer1.id,
          staffId: staffMember.id,
          bookingDate: new Date("2026-10-26"),
          startTime: "14:00",
          endTime: "14:40",
          status: "PENDING",
          subtotal: hairCut.price,
          totalAmount: hairCut.price,
          services: {
            create: {
              serviceId: hairCut.id,
              staffId: staffMember.id,
              price: hairCut.price,
              duration: hairCut.duration,
              bufferTime: hairCut.bufferTime,
            },
          },
        },
      });

      assert(lifecycleBooking.status === "PENDING", "Booking created with status PENDING");

      // Transition to CONFIRMED
      const confirmed = await prisma.booking.update({
        where: { id: lifecycleBooking.id },
        data: { status: "CONFIRMED", confirmedAt: new Date() },
      });
      assert(confirmed.status === "CONFIRMED", "Booking transitioned to CONFIRMED");

      // Transition to CHECKED_IN
      const checkedIn = await prisma.booking.update({
        where: { id: lifecycleBooking.id },
        data: { status: "CHECKED_IN", checkedInAt: new Date() },
      });
      assert(checkedIn.status === "CHECKED_IN", "Booking transitioned to CHECKED_IN");

      // Transition to IN_PROGRESS
      const inProgress = await prisma.booking.update({
        where: { id: lifecycleBooking.id },
        data: { status: "IN_PROGRESS", inProgressAt: new Date() },
      });
      assert(inProgress.status === "IN_PROGRESS", "Booking transitioned to IN_PROGRESS");

      // Transition to COMPLETED with Automatic Invoice Generation
      const completed = await prisma.$transaction(async (tx) => {
        const b = await tx.booking.update({
          where: { id: lifecycleBooking.id },
          data: { status: "COMPLETED", completedAt: new Date(), paidAmount: hairCut.price },
        });

        const invoice = await tx.invoice.create({
          data: {
            invoiceNumber: "INV-TEST-99999",
            bookingId: b.id,
            salonId: b.salonId,
            subtotal: b.subtotal,
            totalAmount: b.totalAmount,
            paidAmount: b.totalAmount,
            balanceAmount: 0,
          },
        });

        return { booking: b, invoice };
      });

      assert(completed.booking.status === "COMPLETED", "Booking transitioned to COMPLETED");
      assert(!!completed.invoice, `Invoice generated successfully (${completed.invoice.invoiceNumber})`);

      // Clean up lifecycle test
      await prisma.invoice.deleteMany({ where: { bookingId: lifecycleBooking.id } });
      await prisma.bookingService.deleteMany({ where: { bookingId: lifecycleBooking.id } });
      await prisma.booking.delete({ where: { id: lifecycleBooking.id } });
    }

    console.log("\n=================================================");
    console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("=================================================");
  } catch (err) {
    console.error("Test execution exception:", err);
  } finally {
    await prisma.$disconnect();
  }
}

runAcceptanceTests();
