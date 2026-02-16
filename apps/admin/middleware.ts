// apps/admin/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get token from cookies
  const token = request.cookies.get("accessToken")?.value;
  const userCookie = request.cookies.get("user")?.value;

  let isAdmin = false;

  // Check if user has admin role
  if (token && userCookie) {
    try {
      const user = JSON.parse(decodeURIComponent(userCookie));
      isAdmin = user.roles && user.roles.includes("ADMIN");
    } catch (_error) {
      // Invalid user cookie
      isAdmin = false;
    }
  }

  // Root path handling
  if (pathname === "/") {
    if (token && isAdmin) {
      // Has token and is admin, redirect to dashboard
      return NextResponse.redirect(new URL("/dashboard", request.url));
    } else {
      // No token or not admin, redirect to login
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // If accessing login page and already has admin token, redirect to dashboard
  if (pathname === "/login" && token && isAdmin) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If accessing login page, allow access
  if (pathname === "/login") {
    return NextResponse.next();
  }

  // For protected routes, check authentication
  const protectedRoutes = [
    "/dashboard",
    "/listings",
    "/users",
    "/reservations",
    "/reports",
    "/settings",
  ];
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route),
  );

  if (isProtectedRoute) {
    if (!token || !isAdmin) {
      // No token or not admin, redirect to login
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Allow access
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg).*)",
  ],
};
