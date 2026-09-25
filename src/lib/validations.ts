import { z } from "zod";

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().optional(),
});

// Salon schemas
export const salonRegistrationSchema = z.object({
  name: z.string().min(2, "Salon name is required"),
  ownerName: z.string().min(2, "Owner name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(7, "Valid phone number is required"),
  address: z.string().min(5, "Address is required"),
  province: z.string().optional(),
  district: z.string().optional(),
  city: z.string().optional(),
  area: z.string().optional(),
  postalCode: z.string().optional(),
  description: z.string().optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  logo: z.string().optional(),
});

export const salonUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  province: z.string().optional(),
  district: z.string().optional(),
  city: z.string().optional(),
  area: z.string().optional(),
  postalCode: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  logo: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
});

// Branch schemas
export const branchSchema = z.object({
  name: z.string().min(2, "Branch name is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  province: z.string().optional(),
  district: z.string().optional(),
  city: z.string().optional(),
  area: z.string().optional(),
  postalCode: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  timezone: z.string().default("Asia/Colombo"),
  bookingInterval: z.number().min(5).max(120).default(30),
  minNoticeHours: z.number().min(0).default(1),
  maxAdvanceDays: z.number().min(1).max(365).default(30),
});

export const branchScheduleSchema = z.object({
  schedules: z.array(
    z.object({
      dayOfWeek: z.number().min(0).max(6),
      isOpen: z.boolean(),
      openTime: z.string().regex(/^\d{2}:\d{2}$/).default("09:00"),
      closeTime: z.string().regex(/^\d{2}:\d{2}$/).default("18:00"),
      hasBreak: z.boolean().default(false),
      breakStart: z
        .string()
        .regex(/^\d{2}:\d{2}$/)
        .optional()
        .nullable(),
      breakEnd: z
        .string()
        .regex(/^\d{2}:\d{2}$/)
        .optional()
        .nullable(),
    })
  ),
});

export const branchClosureSchema = z.object({
  closureType: z.enum([
    "WEEKLY_OFF",
    "PUBLIC_HOLIDAY",
    "SPECIAL_HOLIDAY",
    "EMERGENCY_CLOSURE",
    "MAINTENANCE",
    "OTHER",
  ]),
  reason: z.string().optional(),
  isFullDay: z.boolean().default(true),
  date: z.string(), // ISO date string
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

// Staff schemas
export const staffSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  specialization: z.string().optional(),
  bio: z.string().optional(),
  primaryBranchId: z.string().optional(),
  branchIds: z.array(z.string()).default([]),
  serviceIds: z.array(z.string()).default([]),
});

export const staffScheduleSchema = z.object({
  schedules: z.array(
    z.object({
      dayOfWeek: z.number().min(0).max(6),
      isWorking: z.boolean(),
      startTime: z.string().regex(/^\d{2}:\d{2}$/).default("09:00"),
      endTime: z.string().regex(/^\d{2}:\d{2}$/).default("18:00"),
    })
  ),
});

export const staffLeaveSchema = z.object({
  leaveType: z.enum(["ANNUAL", "SICK", "PERSONAL", "EMERGENCY", "OTHER"]),
  reason: z.string().optional(),
  isFullDay: z.boolean().default(true),
  startDate: z.string(),
  endDate: z.string(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

// Service schemas
export const serviceCategorySchema = z.object({
  name: z.string().min(2, "Category name is required"),
  description: z.string().optional(),
  image: z.string().optional(),
  sortOrder: z.number().default(0),
});

export const serviceSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  name: z.string().min(2, "Service name is required"),
  description: z.string().optional(),
  image: z.string().optional(),
  price: z.number().min(0, "Price must be positive"),
  duration: z.number().min(5, "Duration must be at least 5 minutes"),
  bufferTime: z.number().min(0).default(0),
  staffIds: z.array(z.string()).default([]),
  branchIds: z.array(z.string()).default([]),
});

// Customer schemas
export const customerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z
    .string()
    .min(7, "Valid phone number is required")
    .max(15, "Phone number too long"),
  email: z.string().email().optional().or(z.literal("")),
  gender: z.string().optional(),
  notes: z.string().optional(),
});

// Booking schemas
export const bookingCreateSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  staffId: z.string().min(1, "Staff is required"),
  serviceIds: z.array(z.string()).min(1, "At least one service required"),
  bookingDate: z.string(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format"),
  customerName: z.string().min(2, "Name is required"),
  customerPhone: z
    .string()
    .min(7, "Valid phone number is required"),
  customerEmail: z.string().email().optional().or(z.literal("")),
  customerNotes: z.string().optional(),
  couponCode: z.string().optional(),
});

export const bookingStatusUpdateSchema = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "REJECTED",
    "CANCELLED",
    "CHECKED_IN",
    "IN_PROGRESS",
    "COMPLETED",
    "NO_SHOW",
  ]),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

// Availability check schema
export const availabilityCheckSchema = z.object({
  branchId: z.string().min(1),
  staffId: z.string().min(1),
  serviceIds: z.array(z.string()).min(1),
  date: z.string(),
});

// Coupon schemas
export const couponSchema = z.object({
  code: z.string().min(3).max(20).toUpperCase(),
  name: z.string().min(2),
  description: z.string().optional(),
  type: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
  value: z.number().min(0),
  minBookingValue: z.number().min(0).optional(),
  maxDiscount: z.number().min(0).optional(),
  newCustomersOnly: z.boolean().default(false),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  maxUsage: z.number().min(1).optional(),
  perCustomerLimit: z.number().min(1).optional(),
});

// Review schema
export const reviewSchema = z.object({
  bookingId: z.string(),
  salonRating: z.number().min(1).max(5),
  staffRating: z.number().min(1).max(5).optional(),
  serviceRating: z.number().min(1).max(5).optional(),
  comment: z.string().max(1000).optional(),
});

// Booking lookup schema
export const bookingLookupSchema = z.object({
  phone: z.string().min(7),
  reference: z.string().min(5),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type SalonRegistrationInput = z.infer<typeof salonRegistrationSchema>;
export type BranchInput = z.infer<typeof branchSchema>;
export type StaffInput = z.infer<typeof staffSchema>;
export type ServiceInput = z.infer<typeof serviceSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
export type BookingCreateInput = z.infer<typeof bookingCreateSchema>;
export type AvailabilityCheckInput = z.infer<typeof availabilityCheckSchema>;
