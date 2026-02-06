"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // This will be handled by middleware, but keep as fallback
    const checkAuthAndRedirect = () => {
      const token = localStorage.getItem("accessToken");
      const userStr = localStorage.getItem("user");

      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);

          // Check if user has ADMIN role
          if (user.roles && user.roles.includes("ADMIN")) {
            // Authenticated admin, redirect to dashboard
            router.replace("/dashboard");
            return;
          }
        } catch (_error) {
          // Invalid user data, clear it
          localStorage.clear();
          // Clear cookies too
          document.cookie =
            "accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          document.cookie =
            "refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          document.cookie =
            "user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        }
      }

      // No valid auth, redirect to login
      router.replace("/login");
    };

    checkAuthAndRedirect();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}
