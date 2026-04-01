"use client";

import { useState, useEffect, useCallback } from "react";
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

  const clearCookie = useCallback((name: string) => {
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=strict`;
  }, []);

  const clearAuthAndRedirect = useCallback((path: string) => {
    localStorage.clear();
    clearCookie("accessToken");
    clearCookie("refreshToken");
    clearCookie("user");
    setIsLoading(false);
    router.replace(path);
  }, [clearCookie, router]);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = () => {
      const token = localStorage.getItem("accessToken");
      const userStr = localStorage.getItem("user");

      if (!token || !userStr) {
        clearAuthAndRedirect("/login");
        return;
      }

      try {
        const userData = JSON.parse(userStr);

        if (!userData.roles || !userData.roles.includes("ADMIN")) {
          clearAuthAndRedirect("/login?error=admin_required");
          return;
        }

        if (isMounted) {
          setUser(userData);
          setIsLoading(false);
        }
      } catch {
        clearAuthAndRedirect("/login");
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [clearAuthAndRedirect]);

  const handleLogout = useCallback(() => {
    clearAuthAndRedirect("/login");
  }, [clearAuthAndRedirect]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C94B1E]"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* SIDEBAR */}
      <Sidebar />
      <div className="flex flex-col min-h-screen pl-[280px]">
        {/* HEADER */}
        <Header user={user} onLogout={handleLogout} />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}