"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

interface User {
  id: string;
  email: string;
  roles: string[];
  status: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("accessToken");
      const userStr = localStorage.getItem("user");

      if (!token || !userStr) {
        router.replace("/login");
        return;
      }

      try {
        const userData = JSON.parse(userStr);

        if (!userData.roles || !userData.roles.includes("ADMIN")) {
          localStorage.clear();
          // Clear cookies too
          document.cookie =
            "accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          document.cookie =
            "refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          document.cookie =
            "user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          router.replace("/login?error=admin_required");
          return;
        }

        setUser(userData);
        setIsLoading(false);
      } catch (_error) {
        localStorage.clear();
        // Clear cookies too
        document.cookie =
          "accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie =
          "refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie =
          "user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        router.replace("/login");
      }
    };

    checkAuth();
  }, [router]);

  const handleLogout = () => {
    localStorage.clear();
    // Clear cookies too
    document.cookie =
      "accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie =
      "refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.replace("/login");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen bg-gray-100">
      {/* SIDEBAR */}
      <Sidebar />
      <div className="">
        {/* HEADER */}
        <Header user={user} onLogout={handleLogout} />
        <main className="ml-64 p-4">{children}</main>
      </div>
    </div>
  );
}
