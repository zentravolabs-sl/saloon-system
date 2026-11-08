/**
 * Role-based access model shared by the sidebar (UI), the middleware (pages + API)
 * and the server routes. This file is EDGE-SAFE: no Prisma, no Node-only imports.
 *
 * IMPORTANT: hiding a menu item is never the security boundary. The same tables are used
 * by `src/middleware.ts` to block page and API access, and by route handlers via `hasRole`.
 */

export type Role = "SUPER_ADMIN" | "SALON_OWNER" | "MANAGER" | "RECEPTIONIST" | "STAFF";

export const SALON_ROLES: Role[] = ["SALON_OWNER", "MANAGER", "RECEPTIONIST", "STAFF"];

const OWNER: Role = "SALON_OWNER";
const MANAGER: Role = "MANAGER";
const REC: Role = "RECEPTIONIST";
const STAFF: Role = "STAFF";

export function isRole(value: unknown): value is Role {
  return (
    value === "SUPER_ADMIN" ||
    value === "SALON_OWNER" ||
    value === "MANAGER" ||
    value === "RECEPTIONIST" ||
    value === "STAFF"
  );
}

export function hasRole(role: string | null | undefined, allowed: readonly Role[]): boolean {
  return !!role && (allowed as readonly string[]).includes(role);
}

/** Where each role lands after login / when sent away from a page they cannot open */
export function homeFor(role: string | null | undefined): string {
  if (role === "SUPER_ADMIN") return "/super-admin/dashboard";
  if (role === "STAFF") return "/admin/my-appointments";
  return "/admin/dashboard";
}

/* ------------------------------------------------------------------ */
/* Navigation                                                          */
/* ------------------------------------------------------------------ */

export type IconName =
  | "dashboard" | "plus" | "calendar" | "calendarDays" | "customers" | "staff" | "clock"
  | "leave" | "services" | "category" | "branches" | "billing" | "payments" | "receipt"
  | "pos" | "stock" | "supplier" | "buyStock" | "finance" | "expenses" | "salary"
  | "earnings" | "reports" | "trend" | "marketing" | "coupon" | "loyalty" | "review"
  | "bell" | "settings" | "profile";

export interface NavLeaf {
  /** i18n key (see src/lib/i18n/messages.ts) */
  key: string;
  href: string;
  icon: IconName;
}

export interface NavGroup {
  key: string;
  icon: IconName;
  children: NavLeaf[];
}

export type NavEntry = ({ type: "link" } & NavLeaf) | ({ type: "group" } & NavGroup);

const link = (key: string, href: string, icon: IconName): NavEntry => ({ type: "link", key, href, icon });
const group = (key: string, icon: IconName, children: NavLeaf[]): NavEntry => ({
  type: "group",
  key,
  icon,
  children,
});
const leaf = (key: string, href: string, icon: IconName): NavLeaf => ({ key, href, icon });

const L = {
  dashboard: leaf("nav.dashboard", "/admin/dashboard", "dashboard"),
  newBooking: leaf("nav.newBooking", "/admin/bookings/new", "plus"),
  bookings: leaf("nav.bookings", "/admin/bookings", "calendar"),
  appointments: leaf("nav.appointments", "/admin/bookings", "calendar"),
  calendar: leaf("nav.calendar", "/admin/calendar", "calendarDays"),
  customers: leaf("nav.customers", "/admin/customers", "customers"),
  customerList: leaf("nav.customerList", "/admin/customers", "customers"),
  loyalty: leaf("nav.loyalty", "/admin/loyalty", "loyalty"),
  coupons: leaf("nav.coupons", "/admin/coupons", "coupon"),
  reviews: leaf("nav.reviews", "/admin/reviews", "review"),
  notifications: leaf("nav.notifications", "/admin/notifications", "bell"),
  staffProfiles: leaf("nav.staffProfiles", "/admin/staff", "staff"),
  schedules: leaf("nav.schedules", "/admin/staff/schedules", "clock"),
  leaves: leaf("nav.leaves", "/admin/staff/leaves", "leave"),
  earnings: leaf("nav.earnings", "/admin/commissions", "earnings"),
  services: leaf("nav.services", "/admin/services", "services"),
  categories: leaf("nav.categories", "/admin/categories", "category"),
  branches: leaf("nav.branches", "/admin/branches", "branches"),
  takePayment: leaf("nav.takePayment", "/admin/billing", "billing"),
  payments: leaf("nav.payments", "/admin/payments", "payments"),
  receipts: leaf("nav.receipts", "/admin/invoices", "receipt"),
  pos: leaf("nav.pos", "/admin/pos", "pos"),
  inventory: leaf("nav.inventory", "/admin/inventory", "stock"),
  stock: leaf("nav.stockItems", "/admin/inventory", "stock"),
  suppliers: leaf("nav.suppliers", "/admin/inventory/suppliers", "supplier"),
  buyStock: leaf("nav.buyStock", "/admin/inventory/purchase-orders", "buyStock"),
  expenses: leaf("nav.expenses", "/admin/expenses", "expenses"),
  salary: leaf("nav.salary", "/admin/payroll", "salary"),
  businessReports: leaf("nav.businessReports", "/admin/reports/financial", "trend"),
  reports: leaf("nav.reports", "/admin/reports", "reports"),
  settings: leaf("nav.settings", "/admin/settings", "settings"),
  myAppointments: leaf("nav.myAppointments", "/admin/my-appointments", "calendar"),
  mySchedule: leaf("nav.mySchedule", "/admin/my-schedule", "clock"),
  myCommissions: leaf("nav.myCommissions", "/admin/my-commissions", "earnings"),
  myProfile: leaf("nav.myProfile", "/admin/my-profile", "profile"),
};

const asLink = (l: NavLeaf): NavEntry => ({ type: "link", ...l });

export const NAV_BY_ROLE: Record<Exclude<Role, "SUPER_ADMIN">, NavEntry[]> = {
  SALON_OWNER: [
    asLink(L.dashboard),
    asLink(L.bookings),
    asLink(L.calendar),
    asLink(L.customers),
    group("nav.staff", "staff", [L.staffProfiles, L.schedules, L.leaves]),
    group("nav.services", "services", [L.services, L.categories]),
    group("nav.billing", "billing", [L.takePayment, L.payments, L.receipts, L.pos]),
    asLink(L.inventory),
    group("nav.finance", "finance", [L.expenses, L.salary, L.earnings, L.businessReports]),
    asLink(L.reports),
    group("nav.marketing", "marketing", [L.coupons, L.loyalty, L.reviews, L.notifications]),
    asLink(L.settings),
  ],
  MANAGER: [
    asLink(L.dashboard),
    asLink(L.bookings),
    asLink(L.calendar),
    group("nav.customers", "customers", [L.customerList, L.loyalty, L.coupons, L.reviews]),
    group("nav.staff", "staff", [L.staffProfiles, L.schedules, L.leaves, L.earnings]),
    group("nav.services", "services", [L.services, L.categories]),
    group("nav.billing", "billing", [L.takePayment, L.receipts, L.pos]),
    asLink(L.inventory),
    asLink(L.expenses),
    asLink(L.reports),
    asLink(L.settings),
  ],
  RECEPTIONIST: [
    asLink(L.dashboard),
    asLink(L.newBooking),
    asLink(L.appointments),
    asLink(L.calendar),
    asLink(L.customers),
    asLink({ ...L.takePayment, key: "nav.billingPos" }),
  ],
  STAFF: [
    asLink(L.myAppointments),
    asLink(L.mySchedule),
    asLink(L.myCommissions),
    asLink(L.myProfile),
  ],
};

export function navFor(role: string | null | undefined): NavEntry[] {
  if (role && role in NAV_BY_ROLE) return NAV_BY_ROLE[role as keyof typeof NAV_BY_ROLE];
  return [];
}

export function flattenNav(entries: NavEntry[]): NavLeaf[] {
  return entries.flatMap((e) => (e.type === "link" ? [e] : e.children));
}

/**
 * Tab bar shown above pages that belong to a group, so related screens are one tap apart
 * (important on mobile where the sidebar is hidden).
 */
export function tabsFor(role: string | null | undefined, pathname: string): NavLeaf[] | null {
  for (const entry of navFor(role)) {
    if (entry.type !== "group" || entry.children.length < 2) continue;
    if (entry.children.some((c) => pathMatches(pathname, c.href))) return entry.children;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Page access (/admin/**)                                             */
/* ------------------------------------------------------------------ */

export function pathMatches(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

/** Extra pages a role may open that are not direct sidebar entries */
const EXTRA_PAGES: Record<string, string[]> = {
  SALON_OWNER: ["/admin"],
  MANAGER: ["/admin/notifications"],
  RECEPTIONIST: ["/admin/pos", "/admin/invoices", "/admin/notifications"],
  STAFF: ["/admin/notifications"],
};

export function canAccessPage(role: string | null | undefined, pathname: string): boolean {
  if (!role) return false;
  if (role === "SALON_OWNER") return pathname === "/admin" || pathname.startsWith("/admin/");
  const hrefs = [
    ...flattenNav(navFor(role)).map((l) => l.href),
    ...(EXTRA_PAGES[role] || []),
  ];
  if (pathname === "/admin") return true; // redirects to the role home
  return hrefs.some((h) => pathMatches(pathname, h));
}

/* ------------------------------------------------------------------ */
/* API access                                                          */
/* ------------------------------------------------------------------ */

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
const WRITE: Method[] = ["POST", "PUT", "PATCH", "DELETE"];
const ALL_METHODS: Method[] = ["GET", ...WRITE];

interface ApiRule {
  pattern: RegExp;
  methods: Method[];
  roles: Role[];
}

const OM: Role[] = [OWNER, MANAGER];
const OMR: Role[] = [OWNER, MANAGER, REC];
const ALL_SALON: Role[] = [OWNER, MANAGER, REC, STAFF];

/**
 * Role rules for the "classic" (pre-operations) API routes. Several of these prefixes also
 * serve the public booking site, so rules are method-specific and only cover calls that the
 * public site never makes. Operations routes (/api/expenses, /api/inventory, /api/payroll,
 * /api/pos, /api/commissions, /api/ops, /api/reports/financial) enforce their own
 * fine-grained permissions in `src/lib/ops/access.ts`.
 *
 * First matching rule wins. SUPER_ADMIN is always allowed through this table (the routes
 * themselves still enforce tenant isolation).
 */
export const API_RULES: ApiRule[] = [
  // Money & reports
  { pattern: /^\/api\/reports$/, methods: ALL_METHODS, roles: OM },
  { pattern: /^\/api\/payments$/, methods: ["GET"], roles: OM },
  { pattern: /^\/api\/payments$/, methods: ["POST"], roles: OMR },
  { pattern: /^\/api\/invoices(\/.*)?$/, methods: ALL_METHODS, roles: OMR },
  { pattern: /^\/api\/loyalty$/, methods: ALL_METHODS, roles: OMR },

  // People
  { pattern: /^\/api\/customers(\/.*)?$/, methods: ALL_METHODS, roles: OMR },
  { pattern: /^\/api\/staff\/leaves$/, methods: ["POST"], roles: OM },
  { pattern: /^\/api\/staff\/[^/]+(\/(schedule|breaks))?$/, methods: WRITE, roles: OM },

  // Business set-up
  { pattern: /^\/api\/settings$/, methods: ["PUT"], roles: [OWNER] },
  { pattern: /^\/api\/settings$/, methods: ["GET"], roles: OM },
  { pattern: /^\/api\/branches(\/.*)?$/, methods: WRITE, roles: [OWNER] },
  { pattern: /^\/api\/services(\/.*)?$/, methods: WRITE, roles: OM },
  { pattern: /^\/api\/categories$/, methods: WRITE, roles: OM },
  { pattern: /^\/api\/coupons$/, methods: ["POST"], roles: OM },
  { pattern: /^\/api\/reviews\/[^/]+$/, methods: WRITE, roles: OM },

  // Day-to-day
  { pattern: /^\/api\/bookings\/[^/]+$/, methods: ["PATCH"], roles: ALL_SALON },
  { pattern: /^\/api\/admin\/stats$/, methods: ["GET"], roles: OM },
  { pattern: /^\/api\/dashboard$/, methods: ["GET"], roles: ALL_SALON },
];

/**
 * Returns "ok", "unauthenticated" or "forbidden" for an API call that matches a rule,
 * or null when no rule applies (the route handles its own checks).
 */
export function checkApiAccess(
  role: string | null | undefined,
  method: string,
  pathname: string
): "ok" | "unauthenticated" | "forbidden" | null {
  const m = method.toUpperCase() as Method;
  const rule = API_RULES.find((r) => r.pattern.test(pathname) && r.methods.includes(m));
  if (!rule) return null;
  if (!role) return "unauthenticated";
  if (role === "SUPER_ADMIN") return "ok";
  return rule.roles.includes(role as Role) ? "ok" : "forbidden";
}
