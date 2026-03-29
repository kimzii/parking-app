"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axios from "axios";
import { Crown, Eye, EyeOff, AlertCircle, ShieldCheck } from "lucide-react";

// --- 1. LOCAL UI COMPONENTS (Keep these to avoid module errors) ---

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 ${className}`}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={`flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}
      {...props}
    />
  )
);
Label.displayName = "Label";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={`rounded-xl border bg-card text-card-foreground shadow-sm ${className}`}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={`p-6 pt-0 ${className}`} {...props} />
  )
);
CardContent.displayName = "CardContent";

const Alert = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "destructive" }>(
  ({ className, variant = "default", ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={`relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground ${
        variant === "destructive"
          ? "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive"
          : "bg-background text-foreground"
      } ${className}`}
      {...props}
    />
  )
);
Alert.displayName = "Alert";

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={`text-sm [&_p]:leading-relaxed ${className}`}
      {...props}
    />
  )
);
AlertDescription.displayName = "AlertDescription";

// --- 2. BACKGROUND COMPONENT ---

const BackgroundGraphic = () => {
  const rectangleStyle: React.CSSProperties = {
    position: "absolute",
    width: "100%",
    height: "100%",
    left: "0px",
    top: "0px",
    background: "#FFFFFF",
    zIndex: 0,
  };

  return (
    <div style={rectangleStyle}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1440 1024"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <rect width="1440" height="1024" fill="white"/>
      </svg>
    </div>
  );
};

// --- 3. PAGE LOGIC ---

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

  const clearAuthCookies = () => {
    document.cookie = "accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax";
    document.cookie = "refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax";
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

  // Auth check logic
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
        } catch {
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

      // Set cookies for middleware authentication (30 days to outlive the access token)
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
      const expires = expiryDate.toUTCString();

      document.cookie = `accessToken=${accessToken}; path=/; expires=${expires}; samesite=strict`;
      document.cookie = `refreshToken=${refreshToken}; path=/; expires=${expires}; samesite=strict`;
      document.cookie = `user=${encodeURIComponent(JSON.stringify(user))}; path=/; expires=${expires}; samesite=strict`;

      await new Promise((resolve) => setTimeout(resolve, 500));
      router.push("/dashboard");
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          setError("Invalid email or password.");
        } else {
          setError("Login failed. Please try again later.");
        }
      } else {
        setError("Login failed.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans overflow-hidden bg-gray-50/50">

      <BackgroundGraphic />

      {/* Main Content Container */}
      <div className="relative z-10 w-full flex flex-col items-center">

        {/* 1. Logo Section (Outside Card) */}
        <div className="h-14 w-14 bg-[#005f56] rounded-[4px] flex items-center justify-center relative shadow-sm mb-6">
          <span className="text-white text-3xl font-serif font-bold pt-1">
            P
          </span>
          <Crown
            className="absolute -top-3 text-white h-5 w-5 fill-current"
            strokeWidth={1.5}
          />
        </div>

        {/* 2. Login Card */}
        <Card className="w-full max-w-[440px] shadow-lg border-gray-100 rounded-xl bg-white">
          <CardContent className="pt-10 px-10 pb-10">

            {/* Header Text */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Admin Portal
              </h1>
              <p className="text-gray-500 text-sm">
                Sign in to access the ParkUp admin dashboard
              </p>

              {/* Admin Badge */}
              <div className="flex items-center justify-center gap-2 mt-4 text-gray-500 text-sm">
                <ShieldCheck className="w-4 h-4" />
                <span>Admin access Only</span>
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

              {/* Email Address */}
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-bold text-gray-900"
                >
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  // Placeholder matches your screenshot example
                  placeholder="admin123"
                  {...register("email")}
                  disabled={isLoading}
                  className={`h-11 rounded-md border-gray-300 focus-visible:ring-[#005f56] px-4 ${errors.email ? "border-red-500" : ""}`}
                />
                {errors.email && (
                  <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-sm font-bold text-gray-900"
                >
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    {...register("password")}
                    disabled={isLoading}
                    className={`h-11 rounded-md border-gray-300 pr-10 focus-visible:ring-[#005f56] px-4 ${errors.password ? "border-red-500" : ""}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full h-11 text-base font-semibold bg-[#005f56] hover:bg-[#004d40] text-white rounded-md"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </div>
            </form>

            {/* Footer Copyright */}
            <div className="mt-8 text-center text-xs text-gray-400">
              © 2026 ParkUp. All rights reserved.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}