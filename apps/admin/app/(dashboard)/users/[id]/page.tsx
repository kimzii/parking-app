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
    licenseImageUrl: string | null;
    vehicles: {
      id: string;
      plateNumber: string | null;
      vehicleType: "CAR" | "MOTORCYCLE" | "SUV" | null;
      brand: string | null;
      model: string | null;
      color: string | null;
      isActive: boolean;
      createdAt: string;
    }[];
    reservations: {
      id: string;
      startTime?: string | null;
      endTime?: string | null;
      arrivalDeadline?: string;
      totalAmount: number;
      status: string;
      hostName?: string;
      propertyTitle?: string;
      parkingLocation?: { title: string; address?: string } | null;
    }[];
  };
  host?: {
    id: string;
    parkingLocations: {
      id: string;
      title: string;
      address: string;
      status: string;
      createdAt?: string;
      revenueTotal?: number;
    }[];
  };
}

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

const formatBookingDate = (reservation: {
  startTime?: string | null;
  arrivalDeadline?: string;
}) => {
  const sourceDate = reservation.startTime || reservation.arrivalDeadline;
  if (!sourceDate) return "N/A";

  const parsed = new Date(sourceDate);
  if (Number.isNaN(parsed.getTime())) return "N/A";

  return parsed.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatBookingAmount = (amount: number) => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount || 0);
};

const formatBookingStatus = (status: string) => {
  return status.charAt(0) + status.slice(1).toLowerCase();
};

const formatListingDate = (value?: string) => {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return parsed.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatListingRevenue = (amount?: number) => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount || 0);
};

export default function UserProfileView() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "vehicle" | "bookings" | "property">("profile");
  const [actionLoading, setActionLoading] = useState(false);

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

  // Update driver verification status
  const handleDriverVerification = async (driverId: string, status: "VERIFIED" | "REJECTED", adminNotes?: string) => {
    try {
      setActionLoading(true);
      await api.put(`/drivers/admin/${driverId}/status`, {
        status,
        adminNotes: adminNotes || `Driver ${status.toLowerCase()} by admin`,
      });
      // Refresh user data
      await fetchUserProfile();
    } catch (err) {
      console.error("Error updating driver status:", err);
      alert(`Failed to ${status.toLowerCase()} driver. Please try again.`);
    } finally {
      setActionLoading(false);
    }
  };

  // Get driver role status
  const getDriverStatus = (): VerificationStatus | null => {
    if (!user) return null;
    const driverRole = user.roleStatuses.find(rs => rs.role === "DRIVER");
    return driverRole?.status ?? null;
  };

  const getHostStatus = (): VerificationStatus | null => {
    if (!user) return null;
    const hostRole = user.roleStatuses.find(rs => rs.role === "HOST");
    return hostRole?.status ?? null;
  };

  // Determine user roles from fetched data
  const isDriver = user?.roles.includes("DRIVER") ?? false;
  const isHost = user?.roles.includes("HOST") ?? false;

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

  const displayName = getUserDisplayName(user);
  const primaryRole = isHost ? "Host" : isDriver ? "Driver" : "User";
  const driverStatus = getDriverStatus();
  const hostStatus = getHostStatus();
  const profileStatus = driverStatus ?? hostStatus ?? "PENDING";
  const showSecondaryRoleStatus = Boolean(
    driverStatus && hostStatus && driverStatus !== hostStatus
  );

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
          {isDriver && (
            <button
              onClick={() => setActiveTab("bookings")}
              className={`flex items-center gap-2 px-8 py-4 text-sm font-semibold transition-colors border-b-2 ${
                activeTab === "bookings"
                  ? "border-[#005f56] text-[#005f56] bg-white"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Clock size={18} />
              Recent Bookings
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
          {(isDriver && user?.driver) || isHost ? (
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <ShieldCheck size={20} className="text-[#005f56]" />
                Verification Actions
              </h3>

              <div className={`grid gap-4 ${isDriver && user?.driver && isHost ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
                {isDriver && user?.driver && (
                  <div>
                    {getDriverStatus() === "PENDING" ? (
                      <div className="space-y-6">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <Clock size={20} className="text-yellow-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-semibold text-yellow-800">Pending Driver Verification</p>
                              <p className="text-sm text-yellow-700 mt-1">
                                This driver is awaiting verification. Please review the license information and take action.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <button
                            onClick={() => user.driver && handleDriverVerification(user.driver.id, "VERIFIED")}
                            disabled={actionLoading}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold rounded-lg transition-colors"
                          >
                            {actionLoading ? (
                              <Loader2 size={20} className="animate-spin" />
                            ) : (
                              <CheckCircle size={20} />
                            )}
                            Approve Driver Verification
                          </button>

                          <button
                            onClick={() => user.driver && handleDriverVerification(user.driver.id, "REJECTED", "Driver license verification failed")}
                            disabled={actionLoading}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold rounded-lg transition-colors"
                          >
                            {actionLoading ? (
                              <Loader2 size={20} className="animate-spin" />
                            ) : (
                              <XCircle size={20} />
                            )}
                            Reject Driver Verification
                          </button>
                        </div>
                      </div>
                    ) : getDriverStatus() === "VERIFIED" ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <CheckCircle size={20} className="text-green-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-green-800">Verified Driver</p>
                            <p className="text-sm text-green-700 mt-1">
                              This driver has been verified and can access all driver features.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : getDriverStatus() === "REJECTED" ? (
                      <div className="space-y-6">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <XCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-semibold text-red-800">Driver Verification Rejected</p>
                              <p className="text-sm text-red-700 mt-1">
                                This driver&apos;s verification was rejected. You can re-approve if needed.
                              </p>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => user.driver && handleDriverVerification(user.driver.id, "VERIFIED")}
                          disabled={actionLoading}
                          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold rounded-lg transition-colors"
                        >
                          {actionLoading ? (
                            <Loader2 size={20} className="animate-spin" />
                          ) : (
                            <CheckCircle size={20} />
                          )}
                          Re-approve Driver
                        </button>
                      </div>
                    ) : (
                      <div className="bg-gray-100 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <AlertCircle size={20} className="text-gray-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-gray-700">Driver Account Suspended</p>
                            <p className="text-sm text-gray-600 mt-1">
                              This driver account is currently suspended.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {isHost && (
                  <div>
                    {hostStatus === "VERIFIED" ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <CheckCircle size={20} className="text-green-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-green-800">Verified Host</p>
                            <p className="text-sm text-green-700 mt-1">
                              This host has been verified and can publish approved listings.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : hostStatus === "PENDING" ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <Clock size={20} className="text-yellow-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-yellow-800">Pending Host Verification</p>
                            <p className="text-sm text-yellow-700 mt-1">
                              This host role is pending verification.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : hostStatus === "REJECTED" ? (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <XCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-red-800">Host Verification Rejected</p>
                            <p className="text-sm text-red-700 mt-1">
                              This host role has been rejected and cannot create active listings.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-100 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <AlertCircle size={20} className="text-gray-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-gray-700">Host Account Suspended</p>
                            <p className="text-sm text-gray-600 mt-1">
                              This host role is currently suspended.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {activeTab === "profile" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              <div className="lg:col-span-4 flex flex-col items-center lg:items-start text-center lg:text-left">
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

                <h2 className="text-2xl font-bold text-gray-900 mb-1">{displayName}</h2>
                <span className={`inline-block px-3 py-1 font-semibold text-sm rounded-full mb-8 ${
                  isHost
                    ? "bg-orange-100 text-orange-700"
                    : "bg-blue-100 text-blue-700"
                }`}>
                  {primaryRole}
                </span>

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
                    {getVerificationIcon(profileStatus)}
                    <div>
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Verification Status</p>
                      <p className={`font-medium ${getStatusColor(profileStatus)}`}>{profileStatus}</p>
                      {showSecondaryRoleStatus && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Host status: {hostStatus}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

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

              <div className="hidden lg:block lg:col-span-1">
                <div className="h-full w-px bg-gray-200 mx-auto"></div>
              </div>

              <div className="lg:col-span-7 space-y-8">
                {isDriver && user.driver && (
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                      <CarFront size={20} className="text-[#005f56]" />
                      Driver License Information
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">License Number</p>
                        <p className="font-semibold text-gray-900 text-lg">
                          {user.driver.licenseNumber || "Not provided"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Verification Status</p>
                        <div className="flex items-center gap-2">
                          {getVerificationIcon(getDriverStatus() || "PENDING")}
                          <span className={`font-semibold ${getStatusColor(getDriverStatus() || "PENDING")}`}>
                            {getDriverStatus() || "PENDING"}
                          </span>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">License Image</p>
                        {user.driver.licenseImageUrl ? (
                          <div className="relative w-full h-64 bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <Image
                              src={user.driver.licenseImageUrl}
                              alt="Driver License"
                              fill
                              className="object-contain"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="w-full h-64 bg-white rounded-lg border border-gray-200 flex items-center justify-center">
                            <div className="text-center text-gray-400">
                              <AlertCircle size={32} className="mx-auto mb-2" />
                              <p className="text-sm">No license image uploaded</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {isHost && (
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-gray-900">Recent Listings</h3>
                    </div>

                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
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
                          {user.host?.parkingLocations && user.host.parkingLocations.length > 0 ? (
                            user.host.parkingLocations.map((listing) => (
                              <tr key={listing.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-4 py-3 font-medium text-gray-900">{listing.id.slice(0, 8).toUpperCase()}</td>
                                <td className="px-4 py-3 text-gray-600">{listing.title}</td>
                                <td className="px-4 py-3 text-gray-600">{formatListingDate(listing.createdAt)}</td>
                                <td className="px-4 py-3 font-medium text-gray-900">{formatListingRevenue(listing.revenueTotal)}</td>
                                <td className="px-4 py-3 text-right">
                                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                    listing.status === "APPROVED" ? "bg-green-100 text-green-700" :
                                    listing.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                                    listing.status === "REJECTED" ? "bg-red-100 text-red-700" :
                                    "bg-gray-100 text-gray-700"
                                  }`}>
                                    {listing.status.charAt(0) + listing.status.slice(1).toLowerCase()}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                                No recent listings found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === "bookings" && isDriver && (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
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
                  {user.driver?.reservations && user.driver.reservations.length > 0 ? (
                    user.driver.reservations.map((booking) => (
                      <tr key={booking.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{booking.id.slice(0, 8).toUpperCase()}</td>
                        <td className="px-4 py-3 text-gray-600">{formatBookingDate(booking)}</td>
                        <td className="px-4 py-3 text-gray-600">{booking.hostName || booking.propertyTitle || booking.parkingLocation?.title || "N/A"}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{formatBookingAmount(booking.totalAmount)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            booking.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                            booking.status === "ACTIVE" || booking.status === "CONFIRMED" ? "bg-blue-100 text-blue-700" :
                            booking.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                            "bg-gray-100 text-gray-700"
                          }`}>
                            {formatBookingStatus(booking.status)}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                        No recent bookings found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Vehicle Info Tab (Driver only) - Driver Verification */}
          {activeTab === "vehicle" && isDriver && user?.driver && (
            <div className="grid grid-cols-1 gap-8">
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                {/* Vehicle List */}
                <div className="mt-8">
                  <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Registered Vehicles</h4>
                  {user.driver.vehicles && user.driver.vehicles.length > 0 ? (
                    <div className="space-y-3">
                      {user.driver.vehicles.map((vehicle) => (
                        <div key={vehicle.id} className="bg-white rounded-lg border border-gray-200 p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                <CarFront size={20} className="text-gray-500" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {vehicle.brand || "Unknown Brand"} {vehicle.model || "Unknown Model"}
                                </p>
                                <p className="text-sm text-gray-500">ID: {vehicle.id.slice(0, 8)}...</p>
                              </div>
                            </div>
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                vehicle.isActive
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {vehicle.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                            <div>
                              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Brand</p>
                              <p className="text-gray-800 font-medium">{vehicle.brand || "Not specified"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Car Model</p>
                              <p className="text-gray-800 font-medium">{vehicle.model || "Not specified"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Vehicle Type</p>
                              <p className="text-gray-800 font-medium">{vehicle.vehicleType || "Not specified"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Plate Number</p>
                              <p className="text-gray-800 font-medium">{vehicle.plateNumber || "Not provided"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Color</p>
                              <p className="text-gray-800 font-medium">{vehicle.color || "Not specified"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Vehicle Status</p>
                              <p className="text-gray-800 font-medium">{vehicle.isActive ? "Active" : "Inactive"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Date Added</p>
                              <p className="text-gray-800 font-medium">
                                {vehicle.createdAt
                                  ? new Date(vehicle.createdAt).toLocaleDateString()
                                  : "Unknown"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Vehicle ID</p>
                              <p className="text-gray-800 font-medium break-all">{vehicle.id}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                      No registered vehicles yet. Vehicle details (car model, vehicle type, plate number, and more) will appear here once a vehicle is added.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Property Info Tab (Host only) */}
          {activeTab === "property" && isHost && user?.host && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Home size={20} className="text-[#005f56]" />
                  Parking Locations ({user.host.parkingLocations?.length || 0})
                </h3>
                <button
                  onClick={() => router.push("/listings")}
                  className="text-sm text-[#005f56] hover:text-[#004a43] font-medium"
                >
                  View All Pending Listings →
                </button>
              </div>

              {user.host.parkingLocations && user.host.parkingLocations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {user.host.parkingLocations.map((location) => (
                    <div
                      key={location.id}
                      className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-semibold text-gray-900 line-clamp-1">{location.title}</h4>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          location.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                          location.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {location.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-2">{location.address}</p>
                      {location.status === "PENDING" && (
                        <button
                          onClick={() => router.push("/listings")}
                          className="mt-4 w-full px-4 py-2 bg-[#005f56] hover:bg-[#004a43] text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          Review in Listings
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 flex flex-col items-center justify-center text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
                  <Home size={48} className="text-gray-300 mb-4" />
                  <p className="text-lg font-medium">No parking locations yet</p>
                  <p className="text-sm text-gray-400 mt-1">This host hasn&apos;t added any parking locations.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
