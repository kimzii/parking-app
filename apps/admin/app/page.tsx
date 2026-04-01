// This root route redirects to /login.
// The full login form that was previously here is a duplicate of app/login/page.tsx
// and has been commented out below.

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return null;
}

/*
// apps/admin/app/login/page.tsx
"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axios from "axios";
import { Crown, Eye, EyeOff, AlertCircle } from "lucide-react";

// Corrected imports for Monorepo structure
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Validation schema
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const apiBaseUrl = "/api/proxy";
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const cookieFlags =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; secure; samesite=strict"
      : "; samesite=lax";

  const clearAuthCookies = () => {
    document.cookie =
      "accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax";
    document.cookie =
      "refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax";
    document.cookie = "user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax";
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "admin_required") {
      setError("Access denied. Only administrators can access this portal.");
    }
  }, [searchParams]);

  useEffect(() => {
    const checkExistingAuth = () => {
      const token = localStorage.getItem("accessToken");
      const userStr = localStorage.getItem("user");

      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user.roles && user.roles.includes("ADMIN")) {
            router.replace("/dashboard");
          } else {
            localStorage.clear();
            clearAuthCookies();
          }
        } catch (_error) {
          localStorage.clear();
          clearAuthCookies();
        }
      }
    };

    checkExistingAuth();
  }, [router]);

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setIsLoading(true);
      setError("");

      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      clearAuthCookies();

      const response = await axios.post(
        `${apiBaseUrl}/auth/login`,
        {
          email: data.email,
          password: data.password,
        },
      );

      const { user, accessToken, refreshToken } = response.data;

      if (!user.roles || !user.roles.includes("ADMIN")) {
        setError("Access denied. Only administrators can access this portal.");
        return;
      }

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("user", JSON.stringify(user));

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
      const expires = expiryDate.toUTCString();

      document.cookie = `accessToken=${accessToken}; path=/; expires=${expires}${cookieFlags}`;
      document.cookie = `refreshToken=${refreshToken}; path=/; expires=${expires}${cookieFlags}`;
      document.cookie = `user=${encodeURIComponent(JSON.stringify(user))}; path=/; expires=${expires}${cookieFlags}`;

      await new Promise((resolve) => setTimeout(resolve, 500));
      router.push("/dashboard");
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          setError("Invalid email or password. Please try again.");
        } else {
          setError("Login failed. Please try again later.");
        }
      } else {
        setError("Login failed. Please try again later.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="flex flex-col items-center mb-8">
        <div className="h-16 w-16 bg-[#C94B1E] rounded-md flex items-center justify-center relative shadow-sm mb-4">
          <span className="text-white text-4xl font-serif font-bold pt-2">
            P
          </span>
          <Crown
            className="absolute -top-3 text-white h-6 w-6 fill-current"
            strokeWidth={1.5}
          />
        </div>
      </div>

      <Card className="w-full max-w-[420px] shadow-xl border-gray-100 rounded-xl">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Admin Login
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-6 px-8 pb-10">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-gray-900">
                Username
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@parkup.com"
                {...register("email")}
                disabled={isLoading}
                className={`h-12 border-gray-300 focus-visible:ring-[#C94B1E] ${errors.email ? "border-red-500" : ""}`}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-gray-900">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...register("password")}
                  disabled={isLoading}
                  className={`h-12 border-gray-300 pr-10 focus-visible:ring-[#C94B1E] ${errors.password ? "border-red-500" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>

            <div className="flex justify-start">
              <a href="#" className="text-sm font-medium text-[#C94B1E] hover:underline">
                Forgot Password?
              </a>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold bg-[#C94B1E] hover:bg-[#A83A16] text-white"
              disabled={isLoading}
            >
              {isLoading ? "Logging in..." : "Log In"}
            </Button>
          </form>

          <div className="mt-8 text-center text-sm text-gray-400">
            © 2026 ParkUp. All rights reserved.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
*/
