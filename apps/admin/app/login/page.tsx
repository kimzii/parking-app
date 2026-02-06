// apps/admin/app/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ParkingCircle, AlertCircle, Shield } from "lucide-react";

// Validation schema
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  // Check for error parameters on page load
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "admin_required") {
      setError("Access denied. Only administrators can access this portal.");
    }
  }, [searchParams]);

  // Check if already authenticated on page load
  useEffect(() => {
    const checkExistingAuth = () => {
      const token = localStorage.getItem("accessToken");
      const userStr = localStorage.getItem("user");

      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user.roles && user.roles.includes("ADMIN")) {
            // Already authenticated as admin, redirect to dashboard
            router.replace("/dashboard");
          } else {
            // Not admin, clear storage
            localStorage.clear();
            // Clear cookies too
            document.cookie =
              "accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            document.cookie =
              "refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            document.cookie =
              "user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          }
        } catch (_error) {
          // Invalid user data, clear storage
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
    };

    checkExistingAuth();
  }, [router]);

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setIsLoading(true);
      setError("");

      console.log("🔵 Starting login with:", data.email);

      // Clear any existing auth data
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");

      // Clear cookies too
      document.cookie =
        "accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie =
        "refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

      // Make direct API call
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/login`,
        {
          email: data.email,
          password: data.password,
        },
      );

      console.log("✅ Login response:", response.data);

      const { user, accessToken, refreshToken } = response.data;

      console.log("👤 User data:", user);
      console.log("🔑 Has access token:", !!accessToken);
      console.log("🎫 User roles:", user.roles);

      // Check if user has ADMIN role
      if (!user.roles || !user.roles.includes("ADMIN")) {
        console.log("❌ User is not an admin:", user.roles);
        setError("Access denied. Only administrators can access this portal.");
        return;
      }

      console.log("✅ Admin role verified");

      // Store tokens in localStorage
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("user", JSON.stringify(user));

      // Set cookies for server-side access (expire in 7 days)
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);
      const expires = expiryDate.toUTCString();

      document.cookie = `accessToken=${accessToken}; path=/; expires=${expires}; secure; samesite=strict`;
      document.cookie = `refreshToken=${refreshToken}; path=/; expires=${expires}; secure; samesite=strict`;
      document.cookie = `user=${encodeURIComponent(JSON.stringify(user))}; path=/; expires=${expires}; secure; samesite=strict`;

      console.log("💾 Tokens stored in both localStorage and cookies");
      console.log("🚀 Redirecting to dashboard...");

      // Add small delay to see the logs
      await new Promise((resolve) => setTimeout(resolve, 500));

      router.push("/dashboard");
    } catch (error: unknown) {
      console.log("❌ Login error:", error);

      // Type guard for axios error
      if (axios.isAxiosError(error)) {
        console.log("📄 Error response:", error.response?.data);
        console.log("📊 Error status:", error.response?.status);

        if (error.response?.status === 401) {
          setError("Invalid email or password. Please try again.");
        } else {
          setError("Login failed. Please try again later.");
        }
      } else {
        console.log("📄 Unknown error:", error);
        setError("Login failed. Please try again later.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <ParkingCircle className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Admin Portal
          </CardTitle>
          <CardDescription>
            Sign in to access the ParkUp admin dashboard
          </CardDescription>
          <div className="flex items-center justify-center gap-2 mt-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-sm text-blue-700">
            <Shield className="h-4 w-4" />
            Admin access only
          </div>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@parkup.com"
                {...register("email")}
                disabled={isLoading}
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register("password")}
                disabled={isLoading}
                className={errors.password ? "border-red-500" : ""}
              />
              {errors.password && (
                <p className="text-sm text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
