"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Bell,
  Plus,
  LogOut,
  UserPlus,
  MapPin,
  FileText,
  Settings,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
} from "lucide-react";

interface User {
  id: string;
  email: string;
  roles: string[];
  status: string;
}

interface HeaderProps {
  user: User;
  onLogout: () => void;
}

// Mock notifications - in production, fetch from API
const mockNotifications = [
  {
    id: "1",
    type: "pending_listing",
    title: "New Listing Pending",
    message: "Airport Terminal Parking needs approval",
    time: "5 minutes ago",
    read: false,
    link: "/listings",
  },
  {
    id: "2",
    type: "pending_driver",
    title: "Driver Verification",
    message: "John Driver submitted a license for verification",
    time: "1 hour ago",
    read: false,
    link: "/users",
  },
  {
    id: "3",
    type: "completed",
    title: "Listing Approved",
    message: "Downtown Shopping Mall Parking was approved",
    time: "2 hours ago",
    read: true,
    link: "/listings",
  },
  {
    id: "4",
    type: "alert",
    title: "Suspicious Activity",
    message: "Multiple failed login attempts detected",
    time: "1 day ago",
    read: true,
    link: "/reports",
  },
];

export default function Header({ user, onLogout }: HeaderProps) {
  const router = useRouter();
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState(mockNotifications);
  const [searchQuery, setSearchQuery] = useState("");

  const quickActionsRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (quickActionsRef.current && !quickActionsRef.current.contains(event.target as Node)) {
        setShowQuickActions(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Helper to format name from email
  const formatName = (email: string) => {
    if (!email) return "User";
    return email.split('@')[0]
      .replace(/[._]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const getInitials = (email: string) => {
    if (!email) return "U";
    const name = formatName(email);
    return name.split(' ').map(n => n[0]).join('').substring(0, 2);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleNotificationClick = (notification: typeof mockNotifications[0]) => {
    markAsRead(notification.id);
    setShowNotifications(false);
    router.push(notification.link);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "pending_listing":
        return <MapPin size={16} className="text-yellow-500" />;
      case "pending_driver":
        return <Clock size={16} className="text-blue-500" />;
      case "completed":
        return <CheckCircle size={16} className="text-green-500" />;
      case "alert":
        return <AlertCircle size={16} className="text-red-500" />;
      default:
        return <Bell size={16} className="text-gray-500" />;
    }
  };

  const quickActions = [
    { icon: UserPlus, label: "View Pending Users", href: "/users", description: "Review pending verifications" },
    { icon: MapPin, label: "View Pending Listings", href: "/listings", description: "Approve parking locations" },
    { icon: FileText, label: "View Reports", href: "/reports", description: "Check analytics & reports" },
    { icon: Settings, label: "Settings", href: "/settings", description: "Configure system settings" },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Search for users by default
      router.push(`/users?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery("");
    }
  };

  return (
    <header className="bg-white px-8 py-4 sticky top-0 z-10 w-full border-b border-gray-100">
      <div className="flex items-center justify-between gap-8">

       {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative w-[500px]">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users, listings..."
            className="w-full bg-gray-50 pl-12 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#005f56] focus:border-transparent focus:bg-white outline-none text-gray-700 transition-all"
          />
        </form>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Quick Actions Button */}
          <div ref={quickActionsRef} className="relative">
            <button
              onClick={() => {
                setShowQuickActions(!showQuickActions);
                setShowNotifications(false);
              }}
              className={`p-2.5 rounded-lg transition-colors ${
                showQuickActions ? "bg-[#005f56] text-white" : "hover:bg-gray-100 text-gray-500"
              }`}
            >
              <Plus size={20} />
            </button>

            {/* Quick Actions Dropdown */}
            {showQuickActions && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">Quick Actions</h3>
                </div>
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => {
                      router.push(action.href);
                      setShowQuickActions(false);
                    }}
                    className="w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="w-9 h-9 bg-[#005f56]/10 rounded-lg flex items-center justify-center shrink-0">
                      <action.icon size={18} className="text-[#005f56]" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{action.label}</p>
                      <p className="text-xs text-gray-500">{action.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notifications Button */}
          <div ref={notificationsRef} className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowQuickActions(false);
              }}
              className={`p-2.5 rounded-lg relative transition-colors ${
                showNotifications ? "bg-[#005f56] text-white" : "hover:bg-gray-100 text-gray-500"
              }`}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 rounded-full border-2 border-white text-[10px] font-bold text-white flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-[#005f56] hover:text-[#004a43] font-medium"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="max-h-[400px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">
                      <Bell size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No notifications</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`px-4 py-3 flex items-start gap-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50 ${
                          !notification.read ? "bg-blue-50/50" : ""
                        }`}
                      >
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm ${!notification.read ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5"></span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{notification.message}</p>
                          <p className="text-xs text-gray-400 mt-1">{notification.time}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className="p-1 hover:bg-gray-200 rounded transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <X size={14} className="text-gray-400" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                  <button
                    onClick={() => {
                      setShowNotifications(false);
                      // Could navigate to a notifications page if you have one
                    }}
                    className="w-full text-center text-sm text-[#005f56] hover:text-[#004a43] font-medium"
                  >
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 pl-4 border-l border-gray-200 ml-3">
            {/* User Avatar */}
            <div className="w-10 h-10 bg-[#005f56] rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-sm">
              {getInitials(user.email)}
            </div>

            <div className="flex flex-col min-w-[80px]">
              <span className="font-semibold text-gray-800 text-sm leading-tight">
                {formatName(user.email)}
              </span>
              <span className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">
                {user.roles?.[0] || "Admin"}
              </span>
            </div>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}