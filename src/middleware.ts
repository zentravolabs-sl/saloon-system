import { auth } from "@/lib/auth-edge";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default auth((req: NextRequest & { auth: any }) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

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

  const role = session.user?.role as string;

  // Super admin routes
  if (pathname.startsWith("/super-admin")) {
    if (role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  // Admin routes (salon staff)
  if (pathname.startsWith("/admin")) {
    const allowedRoles = ["SALON_OWNER", "MANAGER", "RECEPTIONIST", "STAFF"];
    if (!allowedRoles.includes(role)) {
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
