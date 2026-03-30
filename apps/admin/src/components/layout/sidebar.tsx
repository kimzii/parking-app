"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  CalendarDays,
  BarChart3,
  Settings,
  Crown,
  ArrowLeftRight,
  Activity,
} from "lucide-react";

const navigationItems = [
  {
    href: "/dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
  },
  {
    href: "/listings",
    icon: FileText,
    label: "Listings",
    badge: "Pending/Active",
  },
  {
    href: "/users",
    icon: Users,
    label: "Users",
    badge: "Drivers/Hosts",
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
    badge: "Live",
  },
  {
    href: "/transactions",
    icon: ArrowLeftRight,
    label: "Transactions",
    badge: "Top-Up/Withdraw",
  },
  {
    href: "/reports",
    icon: BarChart3,
    label: "Financial Reports",
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
        <div className="h-14 w-14 bg-[#005f56] rounded-[4px] flex items-center justify-center relative shadow-sm">
          <span className="text-white text-3xl font-serif font-bold pt-1">
            P
          </span>
          <Crown
            className="absolute -top-3 text-white h-10 w-5 fill-current"
            strokeWidth={1.5}
          />
        </div>
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
                  ? "bg-[#E6F4F1] text-[#005f56] font-semibold"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Icon
                size={20}
                className={isActive ? "text-[#005f56]" : "text-gray-500 group-hover:text-gray-700"}
              />
              <span className="text-[15px]">{item.label}</span>

              {/* Optional Badge rendering if needed */}
              {item.badge && (
                <span className={`ml-auto text-[11px] px-2 py-0.5 rounded-full font-medium ${
                    isActive ? "bg-[#005f56]/10 text-[#005f56]" : "bg-gray-100 text-gray-500"
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