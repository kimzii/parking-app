// apps/admin/components/layout/sidebar.tsx
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge } from "@/components/ui/badge";
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Calendar, 
  DollarSign, 
  Settings,
  ParkingCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigationItems = [
  {
    href: '/dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
  },
  {
    href: '/listings',
    icon: FileText,
    label: 'Listings',
    badge: 'Pending/Active',
  },
  {
    href: '/users',
    icon: Users,
    label: 'Users',
    badge: 'Drivers/Hosts',
  },
  {
    href: '/reservations',
    icon: Calendar,
    label: 'Reservations',
  },
  {
    href: '/reports',
    icon: DollarSign,
    label: 'Financial Reports',
  },
  {
    href: '/settings',
    icon: Settings,
    label: 'Settings',
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 h-screen bg-white shadow-sm border-r">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-8">
          <ParkingCircle className="h-8 w-8 text-blue-600" />
          <span className="text-xl font-bold text-gray-900">ParkUp</span>
        </div>
        
        <nav className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                  isActive
                    ? "bg-blue-100 text-blue-700 font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
                {item.badge && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}