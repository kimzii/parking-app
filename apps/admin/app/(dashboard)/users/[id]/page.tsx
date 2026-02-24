"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ChevronLeft,
  User,
  CarFront,
  Home,
  Edit,
  Ban,
  ShieldCheck,
  Phone,
  Mail,
  Loader2,
  AlertCircle,
  Clock,
  XCircle,
  CheckCircle,
  UserCircle
} from "lucide-react";
import api from "../../../../src/lib/api";
import Image from "next/image";

// --- Types aligned with Prisma schema ---
type RoleName = "DRIVER" | "HOST" | "ADMIN";
type VerificationStatus = "PENDING" | "VERIFIED" | "REJECTED" | "SUSPENDED";

interface RoleStatus {
  role: RoleName;
  status: VerificationStatus;
}

interface UserProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  profilePicture: string | null;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  roles: RoleName[];
  roleStatuses: RoleStatus[];
  driver?: {
    id: string;
    licenseNumber: string | null;
    vehicles: { id: string; plateNumber: string | null; brand: string | null; model: string | null; }[];
    reservations: { id: string; startTime: string; totalAmount: number; status: string; parkingLocation?: { title: string; } }[];
  };
  host?: {
    id: string;
    parkingLocations: { id: string; title: string; address: string; status: string; }[];
  };
}

// --- Mock Data (used as fallback until API is ready) ---
const recentBookings = [
  { id: "BKG-001", date: "Oct 24, 2026", host: "Host A", amount: "₱500.00", status: "Completed" },
  { id: "BKG-002", date: "Oct 25, 2026", host: "Host B", amount: "₱350.00", status: "Active" },
  { id: "BKG-003", date: "Oct 28, 2026", host: "Host C", amount: "₱450.00", status: "Completed" },
  { id: "BKG-004", date: "Nov 02, 2026", host: "Host A", amount: "₱500.00", status: "Cancelled" },
  { id: "BKG-005", date: "Nov 05, 2026", host: "Host D", amount: "₱200.00", status: "Completed" },
  { id: "BKG-006", date: "Nov 10, 2026", host: "Host B", amount: "₱350.00", status: "Completed" },
];

const recentListings = [
  { id: "LST-001", name: "Downtown Apartment", date: "Oct 24, 2026", status: "Active", revenue: "₱15,000.00" },
  { id: "LST-002", name: "Suburban Garage Space", date: "Oct 25, 2026", status: "Active", revenue: "₱4,500.00" },
  { id: "LST-003", name: "City Center Parking", date: "Oct 28, 2026", status: "Pending", revenue: "₱0.00" },
  { id: "LST-004", name: "Airport Long-term", date: "Nov 02, 2026", status: "Inactive", revenue: "₱12,000.00" },
  { id: "LST-005", name: "Mall Adjacent Lot", date: "Nov 05, 2026", status: "Active", revenue: "₱8,200.00" },
];

const getVerificationIcon = (status: VerificationStatus) => {
  switch (status) {
    case "VERIFIED": return <CheckCircle size={18} className="text-green-500 shrink-0" />;
    case "PENDING": return <Clock size={18} className="text-yellow-500 shrink-0" />;
    case "REJECTED": return <XCircle size={18} className="text-red-500 shrink-0" />;
    case "SUSPENDED": return <AlertCircle size={18} className="text-gray-500 shrink-0" />;
    default: return <ShieldCheck size={18} className="text-green-500 shrink-0" />;
  }
};

const getStatusColor = (status: VerificationStatus) => {
  switch (status) {
    case "VERIFIED": return "text-green-600";
    case "PENDING": return "text-yellow-600";
    case "REJECTED": return "text-red-600";
    case "SUSPENDED": return "text-gray-600";
    default: return "text-gray-600";
  }
};

export default function UserProfileView() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "vehicle" | "property">("profile");

  const fetchUserProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<UserProfile>(`/users/${userId}`);
      setUser(response.data);
    } catch (err) {
      console.error("Error fetching user profile:", err);
      setError("Failed to fetch user profile. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchUserProfile();
    }
  }, [userId, fetchUserProfile]);

  // Determine user roles from fetched data
  const isDriver = user?.roles.includes("DRIVER") ?? false;
  const isHost = user?.roles.includes("HOST") ?? false;

  // Get primary verification status
  const getPrimaryStatus = (roleStatuses: RoleStatus[]): VerificationStatus => {
    if (roleStatuses.some(rs => rs.status === "SUSPENDED")) return "SUSPENDED";
    if (roleStatuses.some(rs => rs.status === "REJECTED")) return "REJECTED";
    if (roleStatuses.some(rs => rs.status === "PENDING")) return "PENDING";
    return "VERIFIED";
  };

  const getUserDisplayName = (user: UserProfile) => {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ""} ${user.lastName || ""}`.trim();
    }
    return user.email.split("@")[0];
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-[#F9FAFB] min-h-full font-sans p-8 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#005f56] mx-auto" />
          <p className="text-gray-500 mt-4">Loading user profile...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !user) {
    return (
      <div className="bg-[#F9FAFB] min-h-full font-sans p-8">
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-red-600 text-lg">{error || "User not found"}</p>
          <button
            onClick={() => router.push("/users")}
            className="mt-6 px-6 py-2 bg-[#005f56] text-white rounded-lg hover:bg-[#004a43] transition-colors"
          >
            Back to Users
          </button>
        </div>
      </div>
    );
  }

  const primaryStatus = getPrimaryStatus(user.roleStatuses);
  const displayName = getUserDisplayName(user);
  const primaryRole = isHost ? "Host" : isDriver ? "Driver" : "User";

  return (
    <div className="bg-[#F9FAFB] min-h-full font-sans p-8">

      {/* Header Area */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/users")}
            className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-600 shadow-sm"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">User Profile</h1>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50/50">
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2 px-8 py-4 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === "profile"
                ? "border-[#005f56] text-[#005f56] bg-white"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <User size={18} />
            Profile
          </button>
          {isDriver && (
            <button
              onClick={() => setActiveTab("vehicle")}
              className={`flex items-center gap-2 px-8 py-4 text-sm font-semibold transition-colors border-b-2 ${
                activeTab === "vehicle"
                  ? "border-[#005f56] text-[#005f56] bg-white"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <CarFront size={18} />
              Vehicle Info
            </button>
          )}
          {isHost && (
            <button
              onClick={() => setActiveTab("property")}
              className={`flex items-center gap-2 px-8 py-4 text-sm font-semibold transition-colors border-b-2 ${
                activeTab === "property"
                  ? "border-[#005f56] text-[#005f56] bg-white"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Home size={18} />
              Property Info
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="p-8">
          {activeTab === "profile" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

              {/* Left Column: User Details */}
              <div className="lg:col-span-4 flex flex-col items-center lg:items-start text-center lg:text-left">

                {/* Profile Picture */}
                <div className="w-32 h-32 bg-gray-200 rounded-full mb-6 border-4 border-white shadow-md overflow-hidden flex items-center justify-center">
                  {user.profilePicture ? (
                    <Image
                      src={user.profilePicture}
                      alt={displayName}
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserCircle size={64} className="text-gray-400" />
                  )}
                </div>

                {/* Name & Role */}
                <h2 className="text-2xl font-bold text-gray-900 mb-1">{displayName}</h2>
                <span className={`inline-block px-3 py-1 font-semibold text-sm rounded-full mb-8 ${
                  isHost
                    ? "bg-orange-100 text-orange-700"
                    : "bg-blue-100 text-blue-700"
                }`}>
                  {primaryRole}
                </span>

                {/* Contact Info Details */}
                <div className="w-full space-y-4 mb-8">
                  <div className="flex items-center gap-3 text-gray-600">
                    <Mail size={18} className="text-gray-400 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Email Address</p>
                      <p className="font-medium text-gray-900">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-gray-600">
                    <Phone size={18} className="text-gray-400 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Mobile No.</p>
                      <p className="font-medium text-gray-900">{user.phoneNumber || "Not provided"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-gray-600">
                    {getVerificationIcon(primaryStatus)}
                    <div>
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Verification Status</p>
                      <p className={`font-medium ${getStatusColor(primaryStatus)}`}>{primaryStatus}</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-lg transition-colors border border-gray-200">
                    <Edit size={18} />
                    Edit User
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-lg transition-colors border border-red-100">
                    <Ban size={18} />
                    Suspend User
                  </button>
                </div>
              </div>

              {/* Divider (Hidden on mobile, visible on lg screens) */}
              <div className="hidden lg:block lg:col-span-1">
                <div className="h-full w-px bg-gray-200 mx-auto"></div>
              </div>

              {/* Right Column: Recent Activity (Bookings for Driver, Listings for Host) */}
              <div className="lg:col-span-7">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">
                    {isDriver ? "Recent Bookings" : "Recent Listings"}
                  </h3>
                </div>

                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  {isDriver ? (
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold tracking-wider border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3">Booking ID</th>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Host</th>
                          <th className="px-4 py-3">Amount</th>
                          <th className="px-4 py-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-sm">
                        {recentBookings.map((booking, index) => (
                          <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-900">{booking.id}</td>
                            <td className="px-4 py-3 text-gray-600">{booking.date}</td>
                            <td className="px-4 py-3 text-gray-600">{booking.host}</td>
                            <td className="px-4 py-3 font-medium text-gray-900">{booking.amount}</td>
                            <td className="px-4 py-3 text-right">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                booking.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                booking.status === 'Active' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {booking.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold tracking-wider border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3">Listing ID</th>
                          <th className="px-4 py-3">Property Name</th>
                          <th className="px-4 py-3">Date Added</th>
                          <th className="px-4 py-3">Revenue</th>
                          <th className="px-4 py-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-sm">
                        {recentListings.map((listing, index) => (
                          <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-900">{listing.id}</td>
                            <td className="px-4 py-3 text-gray-600">{listing.name}</td>
                            <td className="px-4 py-3 text-gray-600">{listing.date}</td>
                            <td className="px-4 py-3 font-medium text-gray-900">{listing.revenue}</td>
                            <td className="px-4 py-3 text-right">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                listing.status === 'Active' ? 'bg-green-100 text-green-700' :
                                listing.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {listing.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Empty State for Vehicle Info Tab (Driver only) */}
          {activeTab === "vehicle" && isDriver && (
            <div className="py-20 flex flex-col items-center justify-center text-gray-500">
              <CarFront size={48} className="text-gray-300 mb-4" />
              <p className="text-lg font-medium">No vehicle information provided.</p>
            </div>
          )}

          {/* Empty State for Property Info Tab (Host only) */}
          {activeTab === "property" && isHost && (
            <div className="py-20 flex flex-col items-center justify-center text-gray-500">
              <Home size={48} className="text-gray-300 mb-4" />
              <p className="text-lg font-medium">Detailed property information will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
