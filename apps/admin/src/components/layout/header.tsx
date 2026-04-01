"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
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
  CreditCard,
  ArrowDownLeft,
  CalendarCheck,
  SquareParking,
  Wallet,
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

type NotificationType =
  | "GENERAL"
  | "BOOKING_COMPLETED"
  | "BOOKING_CANCELLED"
  | "BOOKING_PENDING"
  | "BOOKING_APPROVED"
  | "DRIVER_NEARBY"
  | "DRIVER_ARRIVED"
  | "DRIVER_VERIFIED"
  | "LOCATION_APPROVED"
  | "LOCATION_REJECTED"
  | "TOPUP_APPROVED"
  | "TOPUP_REJECTED"
  | "WITHDRAW_APPROVED"
  | "WITHDRAW_REJECTED";

interface ApiNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  data?: Record<string, unknown> | null;
}

interface UiNotification {
  id: string;
  type: NotificationType | "PENDING_LISTING" | "PENDING_DRIVER" | "TOPUP_REQUEST" | "WITHDRAW_REQUEST";
  title: string;
  message: string;
  time: string;
  read: boolean;
  link: string;
  persisted: boolean;
}

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (!Number.isFinite(seconds) || seconds < 0) {
    return "Just now";
  }

  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
};

const mapNotificationLink = (notification: ApiNotification): string => {
  const data = notification.data && typeof notification.data === "object" ? notification.data : {};

  const getString = (key: string) =>
    key in data ? String(data[key]) : null;

  const reservationId = getString("reservationId");
  const locationId = getString("locationId");
  const topUpRequestId = getString("topUpRequestId");
  const withdrawRequestId = getString("withdrawRequestId");
  const driverId = getString("driverId");

  switch (notification.type) {
    case "LOCATION_APPROVED":
    case "LOCATION_REJECTED":
      return locationId ? `/listings?listingId=${locationId}` : "/listings";

    case "DRIVER_VERIFIED":
      return driverId ? `/users?driverId=${driverId}` : "/users";

    case "BOOKING_PENDING":
    case "BOOKING_APPROVED":
    case "BOOKING_CANCELLED":
    case "BOOKING_COMPLETED":
    case "DRIVER_NEARBY":
    case "DRIVER_ARRIVED":
      return reservationId ? `/reservations?reservationId=${reservationId}` : "/reservations";

    case "TOPUP_APPROVED":
    case "TOPUP_REJECTED":
      return topUpRequestId
        ? `/transactions?tab=topup&requestId=${topUpRequestId}`
        : "/transactions?tab=topup";

    case "WITHDRAW_APPROVED":
    case "WITHDRAW_REJECTED":
      return withdrawRequestId
        ? `/transactions?tab=withdraw&requestId=${withdrawRequestId}`
        : "/transactions?tab=withdraw";

    case "GENERAL": {
      const kind = getString("kind");
      if (kind === "PENDING_LISTING") {
        return locationId ? `/listings?listingId=${locationId}` : "/listings";
      }
      if (kind === "PENDING_DRIVER") {
        return driverId ? `/users?driverId=${driverId}` : "/users";
      }
      if (kind === "TOPUP_REQUEST") {
        return topUpRequestId
          ? `/transactions?tab=topup&requestId=${topUpRequestId}`
          : "/transactions?tab=topup";
      }
      if (kind === "WITHDRAW_REQUEST") {
        return withdrawRequestId
          ? `/transactions?tab=withdraw&requestId=${withdrawRequestId}`
          : "/transactions?tab=withdraw";
      }
      return "/dashboard";
    }

    default:
      return "/dashboard";
  }
};

const toUiNotification = (notification: ApiNotification): UiNotification => {
  const kind =
    notification.type === "GENERAL" &&
    notification.data &&
    typeof notification.data === "object" &&
    "kind" in notification.data
      ? String(notification.data.kind)
      : null;

  return {
    id: notification.id,
    type: (kind as UiNotification["type"]) ?? notification.type,
    title: notification.title,
    message: notification.message,
    time: formatTimeAgo(notification.createdAt),
    read: notification.isRead,
    link: mapNotificationLink(notification),
    persisted: true,
  };
};

export default function Header({ user, onLogout }: HeaderProps) {
  const router = useRouter();
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<UiNotification[]>([]);
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
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

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setIsNotificationsLoading(true);
        const [notificationsRes, unreadCountRes] = await Promise.all([
          api.get<ApiNotification[]>("/notifications"),
          api.get<{ count: number }>("/notifications/unread-count"),
        ]);

        const unreadIds = new Set(
          notificationsRes.data
            .filter((n) => !n.isRead)
            .map((n) => n.id)
        );

        if (unreadCountRes.data.count > unreadIds.size) {
          notificationsRes.data.forEach((n) => {
            if (!n.isRead) {
              unreadIds.add(n.id);
            }
          });
        }

        const apiNotifications = notificationsRes.data.map((n) => ({
          ...toUiNotification(n),
          read: !unreadIds.has(n.id),
        }));

        setNotifications(apiNotifications);
        setNotificationsError(null);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
        setNotificationsError("Failed to load notifications");
      } finally {
        setIsNotificationsLoading(false);
      }
    };

    fetchNotifications();
    const intervalId = window.setInterval(fetchNotifications, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
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

  const markAsRead = async (notificationId: string) => {
    const target = notifications.find((n) => n.id === notificationId);

    if (target && !target.persisted) {
      return;
    }

    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );

    try {
      await api.patch(`/notifications/${notificationId}/read`);
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: false } : n)
      );
    }
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => (n.persisted ? { ...n, read: true } : n)));

    try {
      await api.patch("/notifications/read-all");
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
      setNotificationsError("Failed to update notifications");
    }
  };

  const handleNotificationClick = async (notification: UiNotification) => {
    await markAsRead(notification.id);
    setShowNotifications(false);
    router.push(notification.link);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "LOCATION_APPROVED":
      case "LOCATION_REJECTED":
      case "PENDING_LISTING":
        return <MapPin size={16} className="text-yellow-500" />;
      case "BOOKING_PENDING":
      case "BOOKING_APPROVED":
      case "BOOKING_COMPLETED":
      case "BOOKING_CANCELLED":
        return <Clock size={16} className="text-blue-500" />;
      case "DRIVER_VERIFIED":
      case "PENDING_DRIVER":
        return <CheckCircle size={16} className="text-green-500" />;
      case "DRIVER_NEARBY":
      case "DRIVER_ARRIVED":
        return <AlertCircle size={16} className="text-red-500" />;
      case "TOPUP_APPROVED":
      case "TOPUP_REJECTED":
      case "TOPUP_REQUEST":
        return <CreditCard size={16} className="text-purple-500" />;
      case "WITHDRAW_APPROVED":
      case "WITHDRAW_REJECTED":
      case "WITHDRAW_REQUEST":
        return <ArrowDownLeft size={16} className="text-orange-500" />;
      default:
        return <Bell size={16} className="text-gray-500" />;
    }
  };

  const quickActions = [
    { icon: UserPlus, label: "Users", href: "/users", description: "Review pending verifications" },
    { icon: MapPin, label: "Listings", href: "/listings", description: "Approve parking locations" },
    { icon: CalendarCheck, label: "Reservations", href: "/reservations", description: "Manage booking reservations" },
    { icon: SquareParking, label: "Sessions", href: "/sessions", description: "View active parking sessions" },
    { icon: Wallet, label: "Transactions", href: "/transactions", description: "Top-ups & withdrawals" },
    { icon: FileText, label: "Reports", href: "/reports", description: "Analytics & financial reports" },
    { icon: Settings, label: "Settings", href: "/settings", description: "Configure system settings" },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery("");
    }
  };

  return (
    <header className="bg-white px-8 py-4 sticky top-0 z-10 w-full border-b border-gray-100">
      <div className="flex items-center justify-between gap-8">

       {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative w-full max-w-[500px]">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users, listings, drivers, reservations, IDs..."
            className="w-full bg-gray-50 pl-12 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#C94B1E] focus:border-transparent focus:bg-white outline-none text-gray-700 transition-all"
          />
        </form>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Quick Actions Button — commented out: duplicates sidebar navigation */}
          {/* <div ref={quickActionsRef} className="relative">
            <button
              onClick={() => {
                setShowQuickActions(!showQuickActions);
                setShowNotifications(false);
              }}
              className={`p-2.5 rounded-lg transition-colors ${
                showQuickActions ? "bg-[#C94B1E] text-white" : "hover:bg-gray-100 text-gray-500"
              }`}
            >
              <Plus size={20} />
            </button>

            {showQuickActions && (
              <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-xl shadow-lg border border-gray-200 py-1.5 z-50">
                <div className="px-3 py-1.5 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900 text-xs uppercase tracking-wider">Quick Actions</h3>
                </div>
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => {
                      router.push(action.href);
                      setShowQuickActions(false);
                    }}
                    className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="w-7 h-7 bg-[#C94B1E]/10 rounded-md flex items-center justify-center shrink-0">
                      <action.icon size={14} className="text-[#C94B1E]" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-xs">{action.label}</p>
                      <p className="text-[10px] text-gray-400 leading-tight">{action.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div> */}

          {/* Notifications Button */}
          <div ref={notificationsRef} className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowQuickActions(false);
              }}
              className={`p-2.5 rounded-lg relative transition-colors ${
                showNotifications ? "bg-[#C94B1E] text-white" : "hover:bg-gray-100 text-gray-500"
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
                      className="text-xs text-[#C94B1E] hover:text-[#A83A16] font-medium"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="max-h-[400px] overflow-y-auto">
                  {notificationsError && (
                    <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-b border-red-100">
                      {notificationsError}
                    </div>
                  )}

                  {isNotificationsLoading && notifications.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">
                      <p className="text-sm">Loading notifications...</p>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">
                      <Bell size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No notifications</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => void handleNotificationClick(notification)}
                        className={`group px-4 py-3 flex items-start gap-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50 ${
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
                            void markAsRead(notification.id);
                          }}
                          className="p-1 hover:bg-gray-200 rounded transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <X size={14} className="text-gray-400" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* View all notifications — commented out: no /notifications page exists yet */}
                {/* <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                  <button
                    onClick={() => {
                      setShowNotifications(false);
                      router.push("/notifications");
                    }}
                    className="w-full text-center text-sm text-[#C94B1E] hover:text-[#A83A16] font-medium"
                  >
                    View all notifications
                  </button>
                </div> */}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 pl-4 border-l border-gray-200 ml-3">
            {/* User Avatar */}
            <div className="w-10 h-10 bg-[#C94B1E] rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-sm">
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