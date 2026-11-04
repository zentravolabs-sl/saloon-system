import { auth } from "@/lib/auth-edge";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { canAccessPage, checkApiAccess, homeFor } from "@/lib/rbac";

export default auth((req: NextRequest & { auth: any }) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const role = session?.user?.role as string | undefined;

  // Role rules for API routes. These run BEFORE the public-route shortcut below because some
  // public prefixes (e.g. /api/staff, /api/services) also contain staff-only write endpoints.
  if (pathname.startsWith("/api/")) {
    const decision = checkApiAccess(role, req.method, pathname);
    if (decision === "unauthenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (decision === "forbidden") {
      return NextResponse.json(
        { error: "You do not have permission to do this" },
        { status: 403 }
      );
    }
  }

  // Public routes - allow without salon owner / staff login
  const publicRoutes = [
    "/",
    "/auth/login",
    "/auth/register",
    "/salons",
    "/booking",
    "/booking/success",
    "/booking/lookup",
    "/booking/review",
    "/customer",
    "/api/auth",
    "/api/availability",
    "/api/salons",
    "/api/branches",
    "/api/services",
    "/api/staff",
    "/api/categories",
    "/api/coupons",
    "/api/reviews",
    "/api/bookings",
    "/api/bookings/lookup",
    "/api/customer",
  ];

  const isPublicRoute =
    publicRoutes.some((route) => pathname === route || pathname.startsWith(route + "/")) ||
    pathname.startsWith("/salons") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon");

  if (isPublicRoute) return NextResponse.next();

  // Protected routes - require auth
  if (!session) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Super admin routes
  if (pathname.startsWith("/super-admin")) {
    if (role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  // Admin routes (salon staff) - each role only reaches the pages in its own navigation
  if (pathname.startsWith("/admin")) {
    const allowedRoles = ["SALON_OWNER", "MANAGER", "RECEPTIONIST", "STAFF"];
    if (!role || !allowedRoles.includes(role)) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
    if (pathname === "/admin" || pathname === "/admin/") {
      return NextResponse.redirect(new URL(homeFor(role), req.url));
    }
    if (!canAccessPage(role, pathname)) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
