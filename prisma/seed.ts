import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting seed...");

  // Clean up existing data
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.loyaltyTransaction.deleteMany();
  await prisma.loyaltyAccount.deleteMany();
  await prisma.review.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.bookingStatusHistory.deleteMany();
  await prisma.bookingService.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.couponUsage.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.staffBreak.deleteMany();
  await prisma.staffLeave.deleteMany();
  await prisma.staffSchedule.deleteMany();
  await prisma.staffService.deleteMany();
  await prisma.staffBranch.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.branchClosure.deleteMany();
  await prisma.branchSchedule.deleteMany();
  await prisma.branchService.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.service.deleteMany();
  await prisma.serviceCategory.deleteMany();
  await prisma.salonSubscription.deleteMany();
  await prisma.salon.deleteMany();
  await prisma.user.deleteMany();

  console.log("🧹 Cleaned up existing data");

  const hashedPassword = await bcrypt.hash("Admin@123", 12);

  // ============================================================
  // CREATE SUPER ADMIN
  // ============================================================
  const superAdmin = await prisma.user.create({
    data: {
      name: "Super Admin",
      email: "admin@zentravo.com",
      password: hashedPassword,
      role: "SUPER_ADMIN",
      phone: "+94771234567",
    },
  });
  console.log("✅ Super Admin created:", superAdmin.email);

  // ============================================================
  // SALON 1: GLAMOUR CUTS - COLOMBO
  // ============================================================
  const salon1Owner = await prisma.user.create({
    data: {
      name: "Rajesh Perera",
      email: "rajesh@glamourcuts.lk",
      password: hashedPassword,
      role: "SALON_OWNER",
      phone: "+94771112222",
    },
  });

  const salon1 = await prisma.salon.create({
    data: {
      name: "Glamour Cuts",
      slug: "glamour-cuts",
      description: "Premium hair salon with experienced stylists. We offer a complete range of hair care and beauty services.",
      email: "info@glamourcuts.lk",
      phone: "+94112345678",
      address: "123 Galle Road, Colombo 03",
      city: "Colombo",
      status: "APPROVED",
      ownerId: salon1Owner.id,
      timezone: "Asia/Colombo",
      currency: "LKR",
      settings: {
        autoConfirm: false,
        bookingInterval: 30,
        cancellationWindow: 2,
        requireOtp: false,
      },
      subscription: {
        create: {
          plan: "PROFESSIONAL",
          status: "ACTIVE",
          amount: 9900,
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      },
    },
  });

  // Update owner's relation to salon
  await prisma.user.update({
    where: { id: salon1Owner.id },
    data: {},
  });

  console.log("✅ Salon 1 created:", salon1.name);

  // ============================================================
  // SALON 1 - SERVICE CATEGORIES AND SERVICES
  // ============================================================
  const hairCategory = await prisma.serviceCategory.create({
    data: {
      salonId: salon1.id,
      name: "Hair",
      description: "All hair care services",
      sortOrder: 1,
    },
  });

  const beardCategory = await prisma.serviceCategory.create({
    data: {
      salonId: salon1.id,
      name: "Beard",
      description: "Beard grooming services",
      sortOrder: 2,
    },
  });

  const facialCategory = await prisma.serviceCategory.create({
    data: {
      salonId: salon1.id,
      name: "Facial",
      description: "Facial treatments",
      sortOrder: 3,
    },
  });

  const treatmentCategory = await prisma.serviceCategory.create({
    data: {
      salonId: salon1.id,
      name: "Treatments",
      description: "Hair and scalp treatments",
      sortOrder: 4,
    },
  });

  const hairCut = await prisma.service.create({
    data: { salonId: salon1.id, categoryId: hairCategory.id, name: "Hair Cut", price: 1500, duration: 30, bufferTime: 10, sortOrder: 1 },
  });
  const kidsHairCut = await prisma.service.create({
    data: { salonId: salon1.id, categoryId: hairCategory.id, name: "Kids Hair Cut", price: 1000, duration: 20, bufferTime: 5, sortOrder: 2 },
  });
  const hairStyling = await prisma.service.create({
    data: { salonId: salon1.id, categoryId: hairCategory.id, name: "Hair Styling", price: 2500, duration: 45, bufferTime: 10, sortOrder: 3 },
  });
  const hairWash = await prisma.service.create({
    data: { salonId: salon1.id, categoryId: hairCategory.id, name: "Hair Wash", price: 800, duration: 20, bufferTime: 5, sortOrder: 4 },
  });
  const hairColoring = await prisma.service.create({
    data: { salonId: salon1.id, categoryId: hairCategory.id, name: "Hair Coloring", price: 5000, duration: 90, bufferTime: 15, sortOrder: 5 },
  });
  const beardTrim = await prisma.service.create({
    data: { salonId: salon1.id, categoryId: beardCategory.id, name: "Beard Trim", price: 600, duration: 15, bufferTime: 5, sortOrder: 1 },
  });
  const beardStyling = await prisma.service.create({
    data: { salonId: salon1.id, categoryId: beardCategory.id, name: "Beard Styling", price: 1000, duration: 20, bufferTime: 5, sortOrder: 2 },
  });
  const shaving = await prisma.service.create({
    data: { salonId: salon1.id, categoryId: beardCategory.id, name: "Classic Shave", price: 800, duration: 20, bufferTime: 5, sortOrder: 3 },
  });
  const basicFacial = await prisma.service.create({
    data: { salonId: salon1.id, categoryId: facialCategory.id, name: "Basic Facial", price: 2000, duration: 45, bufferTime: 10, sortOrder: 1 },
  });
  const goldFacial = await prisma.service.create({
    data: { salonId: salon1.id, categoryId: facialCategory.id, name: "Gold Facial", price: 3500, duration: 60, bufferTime: 15, sortOrder: 2 },
  });
  const cleanup = await prisma.service.create({
    data: { salonId: salon1.id, categoryId: facialCategory.id, name: "Cleanup", price: 1500, duration: 30, bufferTime: 10, sortOrder: 3 },
  });
  const keratin = await prisma.service.create({
    data: { salonId: salon1.id, categoryId: treatmentCategory.id, name: "Keratin Treatment", price: 8000, duration: 120, bufferTime: 15, sortOrder: 1 },
  });
  const headMassage = await prisma.service.create({
    data: { salonId: salon1.id, categoryId: treatmentCategory.id, name: "Head Massage", price: 1200, duration: 30, bufferTime: 10, sortOrder: 2 },
  });

  console.log("✅ Services created");

  // ============================================================
  // SALON 1 - BRANCH 1: COLOMBO
  // ============================================================
  const branch1 = await prisma.branch.create({
    data: {
      salonId: salon1.id,
      name: "Colombo Branch",
      address: "123 Galle Road, Colombo 03",
      phone: "+94112345678",
      email: "colombo@glamourcuts.lk",
      city: "Colombo",
      latitude: 6.9271,
      longitude: 79.8612,
      status: "ACTIVE",
      bookingInterval: 30,
    },
  });

  // Branch 1 schedule
  await prisma.branchSchedule.createMany({
    data: [
      { branchId: branch1.id, dayOfWeek: 0, isOpen: false, openTime: "09:00", closeTime: "17:00" },
      { branchId: branch1.id, dayOfWeek: 1, isOpen: true, openTime: "09:00", closeTime: "19:00" },
      { branchId: branch1.id, dayOfWeek: 2, isOpen: true, openTime: "09:00", closeTime: "19:00" },
      { branchId: branch1.id, dayOfWeek: 3, isOpen: true, openTime: "09:00", closeTime: "19:00" },
      { branchId: branch1.id, dayOfWeek: 4, isOpen: true, openTime: "09:00", closeTime: "19:00" },
      { branchId: branch1.id, dayOfWeek: 5, isOpen: true, openTime: "09:00", closeTime: "20:00" },
      { branchId: branch1.id, dayOfWeek: 6, isOpen: true, openTime: "09:00", closeTime: "20:00" },
    ],
  });

  // Add services to branch 1
  const branch1Services = [hairCut, kidsHairCut, hairStyling, hairWash, beardTrim, beardStyling, shaving, basicFacial, cleanup, headMassage];
  await prisma.branchService.createMany({
    data: branch1Services.map((s) => ({ branchId: branch1.id, serviceId: s.id })),
  });

  // ============================================================
  // SALON 1 - BRANCH 2: KALUTARA
  // ============================================================
  const branch2 = await prisma.branch.create({
    data: {
      salonId: salon1.id,
      name: "Kalutara Branch",
      address: "45 Main Street, Kalutara",
      phone: "+94342222333",
      email: "kalutara@glamourcuts.lk",
      city: "Kalutara",
      status: "ACTIVE",
      bookingInterval: 30,
    },
  });

  await prisma.branchSchedule.createMany({
    data: [
      { branchId: branch2.id, dayOfWeek: 0, isOpen: false, openTime: "09:00", closeTime: "17:00" },
      { branchId: branch2.id, dayOfWeek: 1, isOpen: true, openTime: "09:00", closeTime: "18:00" },
      { branchId: branch2.id, dayOfWeek: 2, isOpen: true, openTime: "09:00", closeTime: "18:00" },
      { branchId: branch2.id, dayOfWeek: 3, isOpen: true, openTime: "09:00", closeTime: "18:00" },
      { branchId: branch2.id, dayOfWeek: 4, isOpen: true, openTime: "09:00", closeTime: "18:00" },
      { branchId: branch2.id, dayOfWeek: 5, isOpen: true, openTime: "09:00", closeTime: "18:00" },
      { branchId: branch2.id, dayOfWeek: 6, isOpen: true, openTime: "09:00", closeTime: "17:00" },
    ],
  });

  // Branch 2 has different pricing
  await prisma.branchService.createMany({
    data: [
      { branchId: branch2.id, serviceId: hairCut.id, price: 1200 },
      { branchId: branch2.id, serviceId: kidsHairCut.id, price: 800 },
      { branchId: branch2.id, serviceId: beardTrim.id, price: 500 },
      { branchId: branch2.id, serviceId: beardStyling.id, price: 800 },
      { branchId: branch2.id, serviceId: headMassage.id, price: 1000 },
    ],
  });

  console.log("✅ Branches created");

  // ============================================================
  // SALON 1 - STAFF (5 barbers)
  // ============================================================
  const kasun = await prisma.staff.create({
    data: {
      salonId: salon1.id,
      primaryBranchId: branch1.id,
      name: "Kasun Perera",
      email: "kasun@glamourcuts.lk",
      phone: "+94771234001",
      gender: "MALE",
      specialization: "Hair Cutting & Styling",
      status: "ACTIVE",
    },
  });

  const nimal = await prisma.staff.create({
    data: {
      salonId: salon1.id,
      primaryBranchId: branch1.id,
      name: "Nimal Fernando",
      email: "nimal@glamourcuts.lk",
      phone: "+94771234002",
      gender: "MALE",
      specialization: "Beard & Hair",
      status: "ACTIVE",
    },
  });

  const amal = await prisma.staff.create({
    data: {
      salonId: salon1.id,
      primaryBranchId: branch1.id,
      name: "Amal Silva",
      email: "amal@glamourcuts.lk",
      phone: "+94771234003",
      gender: "MALE",
      specialization: "Facial Treatments",
      status: "ACTIVE",
    },
  });

  const saman = await prisma.staff.create({
    data: {
      salonId: salon1.id,
      primaryBranchId: branch2.id,
      name: "Saman Rajapaksa",
      email: "saman@glamourcuts.lk",
      phone: "+94771234004",
      gender: "MALE",
      specialization: "Hair & Beard",
      status: "ACTIVE",
    },
  });

  const priya = await prisma.staff.create({
    data: {
      salonId: salon1.id,
      primaryBranchId: branch1.id,
      name: "Priya Jayawardena",
      email: "priya@glamourcuts.lk",
      phone: "+94771234005",
      gender: "FEMALE",
      specialization: "Hair Coloring & Treatments",
      status: "ACTIVE",
    },
  });

  // Assign staff to branches
  await prisma.staffBranch.createMany({
    data: [
      { staffId: kasun.id, branchId: branch1.id },
      { staffId: nimal.id, branchId: branch1.id },
      { staffId: amal.id, branchId: branch1.id },
      { staffId: saman.id, branchId: branch2.id },
      { staffId: priya.id, branchId: branch1.id },
      { staffId: priya.id, branchId: branch2.id }, // Priya works at both
    ],
  });

  // Assign services to staff
  await prisma.staffService.createMany({
    data: [
      // Kasun: Hair services only
      { staffId: kasun.id, serviceId: hairCut.id },
      { staffId: kasun.id, serviceId: kidsHairCut.id },
      { staffId: kasun.id, serviceId: hairStyling.id },
      { staffId: kasun.id, serviceId: hairWash.id },
      // Nimal: Hair + Beard
      { staffId: nimal.id, serviceId: hairCut.id },
      { staffId: nimal.id, serviceId: beardTrim.id },
      { staffId: nimal.id, serviceId: beardStyling.id },
      { staffId: nimal.id, serviceId: shaving.id },
      { staffId: nimal.id, serviceId: headMassage.id },
      // Amal: Facial specialist
      { staffId: amal.id, serviceId: basicFacial.id },
      { staffId: amal.id, serviceId: goldFacial.id },
      { staffId: amal.id, serviceId: cleanup.id },
      { staffId: amal.id, serviceId: hairCut.id },
      // Saman: Hair + Beard
      { staffId: saman.id, serviceId: hairCut.id },
      { staffId: saman.id, serviceId: kidsHairCut.id },
      { staffId: saman.id, serviceId: beardTrim.id },
      { staffId: saman.id, serviceId: beardStyling.id },
      { staffId: saman.id, serviceId: shaving.id },
      // Priya: Hair color & treatments
      { staffId: priya.id, serviceId: hairCut.id },
      { staffId: priya.id, serviceId: hairColoring.id },
      { staffId: priya.id, serviceId: hairStyling.id },
      { staffId: priya.id, serviceId: keratin.id },
      { staffId: priya.id, serviceId: basicFacial.id },
    ],
  });

  // Staff schedules
  const createStaffSchedule = async (staffId: string, offDay = 3) => {
    await prisma.staffSchedule.createMany({
      data: [0, 1, 2, 3, 4, 5, 6].map((day) => ({
        staffId,
        dayOfWeek: day,
        isWorking: day !== 0 && day !== offDay,
        startTime: "09:00",
        endTime: "18:00",
      })),
    });
  };

  await createStaffSchedule(kasun.id, 3); // Wednesday off
  await createStaffSchedule(nimal.id, 4); // Thursday off
  await createStaffSchedule(amal.id, 2);  // Tuesday off
  await createStaffSchedule(saman.id, 0); // Sunday off
  await createStaffSchedule(priya.id, 5); // Friday off

  // Kasun has a lunch break
  await prisma.staffBreak.create({
    data: {
      staffId: kasun.id,
      dayOfWeek: -1, // Every day
      startTime: "13:00",
      endTime: "13:30",
    },
  });

  console.log("✅ Staff created with schedules");

  // ============================================================
  // STAFF LEAVE
  // ============================================================
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);

  await prisma.staffLeave.create({
    data: {
      staffId: nimal.id,
      salonId: salon1.id,
      leaveType: "ANNUAL",
      reason: "Family vacation",
      isFullDay: true,
      startDate: tomorrow,
      endDate: dayAfter,
      approved: true,
    },
  });

  // ============================================================
  // BRANCH CLOSURE
  // ============================================================
  const nextMonday = new Date();
  nextMonday.setDate(nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7 || 7));

  await prisma.branchClosure.create({
    data: {
      branchId: branch1.id,
      salonId: salon1.id,
      closureType: "PUBLIC_HOLIDAY",
      reason: "Independence Day",
      isFullDay: true,
      date: nextMonday,
    },
  });

  console.log("✅ Leave and closures created");

  // ============================================================
  // CUSTOMERS
  // ============================================================
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        salonId: salon1.id,
        name: "Harsha Gunawardena",
        phone: "+94771234100",
        email: "harsha@gmail.com",
        totalBookings: 8,
        totalSpent: 15600,
      },
    }),
    prisma.customer.create({
      data: {
        salonId: salon1.id,
        name: "Lakshan Wijesekara",
        phone: "+94771234101",
        email: "lakshan@gmail.com",
        totalBookings: 3,
        totalSpent: 4200,
      },
    }),
    prisma.customer.create({
      data: {
        salonId: salon1.id,
        name: "Chamara Bandara",
        phone: "+94771234102",
        totalBookings: 12,
        totalSpent: 22800,
      },
    }),
    prisma.customer.create({
      data: {
        salonId: salon1.id,
        name: "Dinesh Kumara",
        phone: "+94771234103",
        email: "dinesh@yahoo.com",
        totalBookings: 5,
        totalSpent: 8000,
      },
    }),
    prisma.customer.create({
      data: {
        salonId: salon1.id,
        name: "Ruwan Jayasena",
        phone: "+94771234104",
        totalBookings: 2,
        totalSpent: 3200,
      },
    }),
  ]);

  console.log("✅ Customers created");

  // ============================================================
  // BOOKINGS
  // ============================================================
  const createBooking = async (
    customer: any,
    staff: any,
    service: any,
    daysFromNow: number,
    timeSlot: string,
    status: string
  ) => {
    const bookingDate = new Date();
    bookingDate.setDate(bookingDate.getDate() + daysFromNow);
    
    const endTime = (() => {
      const [h, m] = timeSlot.split(":").map(Number);
      const totalMins = h * 60 + m + service.duration + service.bufferTime;
      return `${Math.floor(totalMins / 60).toString().padStart(2, "0")}:${(totalMins % 60).toString().padStart(2, "0")}`;
    })();

    const count = await prisma.booking.count({ where: { salonId: salon1.id } });
    const dateStr = `${bookingDate.getFullYear()}${String(bookingDate.getMonth() + 1).padStart(2, "0")}${String(bookingDate.getDate()).padStart(2, "0")}`;
    const reference = `GLA-${dateStr}-${String(count + 1).padStart(5, "0")}`;

    const booking = await prisma.booking.create({
      data: {
        reference,
        salonId: salon1.id,
        branchId: staff.primaryBranchId || branch1.id,
        customerId: customer.id,
        staffId: staff.id,
        bookingDate,
        startTime: timeSlot,
        endTime,
        status: status as any,
        source: "ONLINE",
        subtotal: service.price,
        totalAmount: service.price,
        confirmedAt: ["CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED"].includes(status) ? new Date() : null,
        completedAt: status === "COMPLETED" ? new Date() : null,
        paidAmount: status === "COMPLETED" ? service.price : 0,
        paymentStatus: status === "COMPLETED" ? "PAID" : "UNPAID",
      },
    });

    await prisma.bookingService.create({
      data: {
        bookingId: booking.id,
        serviceId: service.id,
        staffId: staff.id,
        price: service.price,
        duration: service.duration,
        bufferTime: service.bufferTime,
      },
    });

    await prisma.bookingStatusHistory.create({
      data: { bookingId: booking.id, status: status as any, notes: "Booking created" },
    });

    if (status === "COMPLETED") {
      await prisma.invoice.create({
        data: {
          invoiceNumber: `INV-${String(count + 1).padStart(6, "0")}`,
          bookingId: booking.id,
          salonId: salon1.id,
          subtotal: service.price,
          totalAmount: service.price,
          paidAmount: service.price,
          balanceAmount: 0,
        },
      });
    }

    return booking;
  };

  // Create various bookings
  await createBooking(customers[0], kasun, hairCut, 0, "10:00", "CONFIRMED");
  await createBooking(customers[1], nimal, beardTrim, 0, "11:00", "PENDING");
  await createBooking(customers[2], amal, basicFacial, 0, "14:00", "IN_PROGRESS");
  await createBooking(customers[3], kasun, hairStyling, 1, "10:30", "CONFIRMED");
  await createBooking(customers[4], priya, hairColoring, 1, "13:00", "PENDING");
  await createBooking(customers[0], kasun, hairCut, -1, "09:00", "COMPLETED");
  await createBooking(customers[1], amal, cleanup, -1, "11:00", "COMPLETED");
  await createBooking(customers[2], nimal, beardStyling, -2, "15:00", "COMPLETED");
  await createBooking(customers[3], priya, keratin, -3, "10:00", "CANCELLED");
  await createBooking(customers[4], kasun, hairCut, -4, "16:00", "NO_SHOW");
  await createBooking(customers[0], amal, goldFacial, 3, "10:00", "CONFIRMED");
  await createBooking(customers[2], kasun, hairCut, 5, "11:30", "PENDING");

  console.log("✅ Bookings created");

  // ============================================================
  // COUPON
  // ============================================================
  await prisma.coupon.create({
    data: {
      salonId: salon1.id,
      code: "WELCOME10",
      name: "Welcome Discount",
      description: "10% off for new customers",
      type: "PERCENTAGE",
      value: 10,
      newCustomersOnly: true,
      isActive: true,
      maxUsage: 100,
      perCustomerLimit: 1,
    },
  });

  await prisma.coupon.create({
    data: {
      salonId: salon1.id,
      code: "SAVE500",
      name: "Flat Rs. 500 Off",
      description: "Flat Rs. 500 off on bookings above Rs. 2000",
      type: "FIXED_AMOUNT",
      value: 500,
      minBookingValue: 2000,
      isActive: true,
      maxUsage: 50,
    },
  });

  console.log("✅ Coupons created");

  // ============================================================
  // SALON 2: STYLE ZONE
  // ============================================================
  const salon2Owner = await prisma.user.create({
    data: {
      name: "Malith Senanayake",
      email: "malith@stylezone.lk",
      password: hashedPassword,
      role: "SALON_OWNER",
      phone: "+94772223333",
    },
  });

  const salon2 = await prisma.salon.create({
    data: {
      name: "Style Zone",
      slug: "style-zone",
      description: "Modern unisex salon with the latest trends in hair and beauty.",
      email: "info@stylezone.lk",
      phone: "+94113456789",
      address: "78 High Level Road, Nugegoda",
      city: "Nugegoda",
      status: "APPROVED",
      ownerId: salon2Owner.id,
      subscription: {
        create: {
          plan: "STARTER",
          status: "ACTIVE",
          amount: 4900,
        },
      },
    },
  });

  console.log("✅ Salon 2 created:", salon2.name);

  // ============================================================
  // SALON 3: PENDING REGISTRATION
  // ============================================================
  const salon3Owner = await prisma.user.create({
    data: {
      name: "Chaminda Dissanayake",
      email: "chaminda@luxurybarbers.lk",
      password: hashedPassword,
      role: "SALON_OWNER",
      phone: "+94773334444",
    },
  });

  await prisma.salon.create({
    data: {
      name: "Luxury Barbers",
      slug: "luxury-barbers",
      description: "High-end barbershop experience for the modern gentleman.",
      email: "info@luxurybarbers.lk",
      phone: "+94114567890",
      address: "12 Union Place, Colombo 02",
      city: "Colombo",
      status: "PENDING",
      ownerId: salon3Owner.id,
      subscription: {
        create: {
          plan: "FREE",
          status: "TRIAL",
        },
      },
    },
  });

  console.log("✅ Salon 3 (pending) created");

  // ============================================================
  // NOTIFICATIONS
  // ============================================================
  await prisma.notification.createMany({
    data: [
      {
        salonId: salon1.id,
        type: "BOOKING_CREATED",
        title: "New Booking",
        message: "New booking GLA-20260924-00001 received",
        isRead: false,
      },
      {
        salonId: salon1.id,
        type: "BOOKING_CONFIRMED",
        title: "Booking Confirmed",
        message: "Booking GLA-20260924-00001 has been confirmed",
        isRead: true,
      },
      {
        salonId: salon1.id,
        type: "GENERAL",
        title: "Staff Leave Approved",
        message: "Nimal Fernando's leave request has been approved",
        isRead: false,
      },
    ],
  });

  console.log("✅ Notifications created");

  console.log("\n🎉 Seed completed successfully!\n");
  console.log("Login credentials:");
  console.log("─────────────────────────────────────");
  console.log("Super Admin: admin@zentravo.com / Admin@123");
  console.log("Glamour Cuts Owner: rajesh@glamourcuts.lk / Admin@123");
  console.log("Style Zone Owner: malith@stylezone.lk / Admin@123");
  console.log("─────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
