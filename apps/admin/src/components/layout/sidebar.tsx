"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  CalendarDays,
  BarChart3,
  Settings,
  ArrowLeftRight,
  Activity,
  AlertTriangle,
} from "lucide-react";

const navigationItems: { href: string; icon: React.ComponentType<{ size?: number; className?: string }>; label: string; badge?: string }[] = [
  {
    href: "/dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
  },
  {
    href: "/listings",
    icon: FileText,
    label: "Approvals",
    // badge: "Pending/Active",
  },
  {
    href: "/users",
    icon: Users,
    label: "Users",
    // badge: "Drivers/Hosts",
  },
  {
    href: "/reservations",
    icon: CalendarDays,
    label: "Reservations",
  },
  {
    href: "/sessions",
    icon: Activity,
    label: "Live Sessions",
    // badge: "Live",
  },
  {
    href: "/transactions",
    icon: ArrowLeftRight,
    label: "Transactions",
    // badge: "Top-Up/Withdraw",
  },
  {
    href: "/reports",
    icon: BarChart3,
    label: "Financial Reports",
  },
  {
    href: "/flagged-users",
    icon: AlertTriangle,
    label: "Flagged Users",
  },
  {
    href: "/settings",
    icon: Settings,
    label: "Settings",
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-[280px] flex-col flex-shrink-0 border-r border-gray-200 bg-white">

      {/* Logo Section */}
      <div className="p-6 flex justify-left mb-2">
        <Image
          src="/icon.png"
          alt="Parklink"
          width={56}
          height={56}
          className="rounded-[4px] shadow-sm"
          priority
        />
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-3 px-5">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-lg transition-colors group ${
                isActive
                  ? "bg-[#FEF0E8] text-[#C94B1E] font-semibold"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Icon
                size={20}
                className={isActive ? "text-[#C94B1E]" : "text-gray-500 group-hover:text-gray-700"}
              />
              <span className="text-[15px]">{item.label}</span>

              {/* Optional Badge rendering if needed */}
              {item.badge && (
                <span className={`ml-auto text-[11px] px-2 py-0.5 rounded-full font-medium ${
                    isActive ? "bg-[#C94B1E]/10 text-[#C94B1E]" : "bg-gray-100 text-gray-500"
                }`}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}