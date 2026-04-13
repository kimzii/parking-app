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
  UserCircle,
  Star,
  Eye,
  Calendar,
} from "lucide-react";
import api from "../../../../src/lib/api";
import Image from "next/image";
import { Breadcrumb } from "../../../../src/components/ui/breadcrumb";

// --- Types aligned with Prisma schema ---
type RoleName = "DRIVER" | "HOST" | "ADMIN";
type VerificationStatus = "PENDING" | "VERIFIED" | "REJECTED" | "SUSPENDED";

interface RoleStatus {
  roleId: string;
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
  sex: string | null;
  dateOfBirth: string | null;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  termsAcceptedAt: string | null;
  privacyAcceptedAt: string | null;
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
      registrationImageUrl: string | null;
      verificationStatus: "PENDING" | "APPROVED" | "REJECTED";
      rejectionReason: string | null;
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
    averageRating?: number | null;
    totalReviews?: number;
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

interface UserReview {
  id: string;
  reviewType: "DRIVER_TO_LOCATION" | "HOST_TO_DRIVER";
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewer?: {
    firstName: string | null;
    lastName: string | null;
    profilePicture: string | null;
  } | null;
  reservation?: {
    parkingSpace?: {
      parkingLocation?: { title: string } | null;
    } | null;
    driver?: {
      user?: { firstName: string | null; lastName: string | null } | null;
    } | null;
  } | null;
}

const getVerificationIcon = (status: VerificationStatus) => {
  switch (status) {
    case "VERIFIED":
      return <CheckCircle size={18} className="text-green-500 shrink-0" />;
    case "PENDING":
      return <Clock size={18} className="text-yellow-500 shrink-0" />;
    case "REJECTED":
      return <XCircle size={18} className="text-red-500 shrink-0" />;
    case "SUSPENDED":
      return <AlertCircle size={18} className="text-gray-500 shrink-0" />;
    default:
      return <ShieldCheck size={18} className="text-green-500 shrink-0" />;
  }
};

const getStatusColor = (status: VerificationStatus) => {
  switch (status) {
    case "VERIFIED":
      return "text-green-600";
    case "PENDING":
      return "text-yellow-600";
    case "REJECTED":
      return "text-red-600";
    case "SUSPENDED":
      return "text-gray-600";
    default:
      return "text-gray-600";
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
  if (status === "PENDING_PAYMENT") return "Pending Payment";
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

const toDateInputValue = (value?: string | null) => {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (value.includes("T")) return value.slice(0, 10);

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
};

const formatBirthday = (value?: string | null) => {
  if (!value) return "Not provided";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not provided";

  return parsed.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const calculateAge = (value?: string | null) => {
  if (!value) return null;

  const birthday = new Date(value);
  if (Number.isNaN(birthday.getTime())) return null;

  const today = new Date();
  let age = today.getUTCFullYear() - birthday.getUTCFullYear();
  const monthDiff = today.getUTCMonth() - birthday.getUTCMonth();
  const dayDiff = today.getUTCDate() - birthday.getUTCDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  if (age < 0 || age > 150) return null;
  return age;
};

export default function UserProfileView() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "profile" | "vehicle" | "bookings" | "property" | "reviews"
  >("profile");
  const [bookingFilter, setBookingFilter] = useState<
    "all" | "active" | "finished"
  >("all");
  const [actionLoading, setActionLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    dateOfBirth: "",
  });
  const [suspensionForm, setSuspensionForm] = useState({
    suspendDriverReservation: false,
    suspendHostParkingManagement: false,
  });
  const [userReviews, setUserReviews] = useState<{
    given: UserReview[];
    received: UserReview[];
  } | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [deleteReviewId, setDeleteReviewId] = useState<string | null>(null);
  const [deleteReviewLoading, setDeleteReviewLoading] = useState(false);

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

  const fetchUserReviews = useCallback(async () => {
    try {
      setReviewsLoading(true);
      setReviewsError(null);
      const res = await api.get<{
        given: UserReview[];
        received: UserReview[];
      }>(`/reviews/admin/user/${userId}`);
      setUserReviews(res.data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string }; status?: number } })
          ?.response?.data?.message ??
        (err as Error)?.message ??
        "Failed to load reviews";
      setReviewsError(msg);
      setUserReviews({ given: [], received: [] });
    } finally {
      setReviewsLoading(false);
    }
  }, [userId]);

  const handleDeleteReview = async () => {
    if (!deleteReviewId) return;
    try {
      setDeleteReviewLoading(true);
      await api.delete(`/reviews/admin/${deleteReviewId}`);
      setDeleteReviewId(null);
      await fetchUserReviews();
    } catch {
      alert("Failed to delete review.");
    } finally {
      setDeleteReviewLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "reviews" && !userReviews && userId) {
      fetchUserReviews();
    }
  }, [activeTab, userReviews, userId, fetchUserReviews]);

  useEffect(() => {
    if (userId) {
      fetchUserProfile();
    }
  }, [userId, fetchUserProfile]);

  // Update driver verification status
  const handleDriverVerification = async (
    driverId: string,
    status: "VERIFIED" | "REJECTED",
    adminNotes?: string,
  ) => {
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
    const driverRole = user.roleStatuses.find((rs) => rs.role === "DRIVER");
    return driverRole?.status ?? null;
  };

  const getHostStatus = (): VerificationStatus | null => {
    if (!user) return null;
    const hostRole = user.roleStatuses.find((rs) => rs.role === "HOST");
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

  const openEditModal = () => {
    if (!user) return;

    setEditForm({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      phoneNumber: user.phoneNumber || "",
      dateOfBirth: toDateInputValue(user.dateOfBirth),
    });
    setShowEditModal(true);
  };

  const openSuspendModal = () => {
    if (!user) return;

    const currentDriverStatus = getDriverStatus();
    const currentHostStatus = getHostStatus();

    setSuspensionForm({
      suspendDriverReservation: currentDriverStatus === "SUSPENDED",
      suspendHostParkingManagement: currentHostStatus === "SUSPENDED",
    });

    setShowSuspendModal(true);
  };

  const handleEditUser = async () => {
    if (!user) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editForm.email.trim())) {
      alert("Please enter a valid email address.");
      return;
    }

    const birthdayValue = editForm.dateOfBirth.trim();
    if (
      birthdayValue &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(birthdayValue) ||
        Number.isNaN(new Date(birthdayValue).getTime()))
    ) {
      alert("Birthday must be in YYYY-MM-DD format.");
      return;
    }

    try {
      setActionLoading(true);
      await api.put(`/users/${user.id}`, {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        email: editForm.email.trim(),
        phoneNumber: editForm.phoneNumber.trim() || null,
        ...(birthdayValue ? { dateOfBirth: birthdayValue } : {}),
      });

      setShowEditModal(false);
      await fetchUserProfile();
    } catch (err) {
      console.error("Error updating user:", err);
      alert("Failed to update user details. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateSuspensions = async () => {
    if (!user) return;

    const updates: Promise<unknown>[] = [];
    const driverRole = user.roleStatuses.find((rs) => rs.role === "DRIVER");
    const hostRole = user.roleStatuses.find((rs) => rs.role === "HOST");

    try {
      setActionLoading(true);

      if (driverRole?.roleId) {
        const currentDriverStatus = driverRole.status;
        const targetDriverStatus = suspensionForm.suspendDriverReservation
          ? "SUSPENDED"
          : currentDriverStatus === "SUSPENDED"
            ? "VERIFIED"
            : currentDriverStatus;

        if (targetDriverStatus !== currentDriverStatus) {
          updates.push(
            api.put(`/users/${user.id}/roles/${driverRole.roleId}/status`, {
              status: targetDriverStatus,
            }),
          );
        }
      }

      if (hostRole?.roleId) {
        const currentHostStatus = hostRole.status;
        const targetHostStatus = suspensionForm.suspendHostParkingManagement
          ? "SUSPENDED"
          : currentHostStatus === "SUSPENDED"
            ? "VERIFIED"
            : currentHostStatus;

        if (targetHostStatus !== currentHostStatus) {
          updates.push(
            api.put(`/users/${user.id}/roles/${hostRole.roleId}/status`, {
              status: targetHostStatus,
            }),
          );
        }
      }

      await Promise.all(updates);
      setShowSuspendModal(false);
      await fetchUserProfile();
    } catch (err) {
      console.error("Error updating user suspensions:", err);
      alert("Failed to update suspension settings. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-[#F9FAFB] min-h-full font-sans p-8 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#C94B1E] mx-auto" />
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
            className="mt-6 px-6 py-2 bg-[#C94B1E] text-white rounded-lg hover:bg-[#A83A16] transition-colors"
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
    driverStatus && hostStatus && driverStatus !== hostStatus,
  );
  const hostAverageRating = user.host?.averageRating ?? 0;
  const hostTotalReviews = user.host?.totalReviews ?? 0;
  const hostFilledStars =
    isHost && hostTotalReviews > 0
      ? Math.max(0, Math.min(5, Math.round(hostAverageRating)))
      : 0;
  const profileAge = calculateAge(user.dateOfBirth);

  return (
    <div className="bg-[#F9FAFB] min-h-full font-sans p-8">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "User Management", href: "/users" },
          { label: `${user.firstName} ${user.lastName}` },
        ]}
      />

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
                ? "border-[#C94B1E] text-[#C94B1E] bg-white"
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
                  ? "border-[#C94B1E] text-[#C94B1E] bg-white"
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
                  ? "border-[#C94B1E] text-[#C94B1E] bg-white"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Clock size={18} />
              Bookings
            </button>
          )}
          {isHost && (
            <button
              onClick={() => setActiveTab("property")}
              className={`flex items-center gap-2 px-8 py-4 text-sm font-semibold transition-colors border-b-2 ${
                activeTab === "property"
                  ? "border-[#C94B1E] text-[#C94B1E] bg-white"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Home size={18} />
              Property Info
            </button>
          )}
          <button
            onClick={() => setActiveTab("reviews")}
            className={`flex items-center gap-2 px-8 py-4 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === "reviews"
                ? "border-[#C94B1E] text-[#C94B1E] bg-white"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Star size={18} />
            Reviews
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-8">
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

                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  {displayName}
                </h2>
                <div className="mb-8 flex items-center gap-2">
                  <span
                    className={`inline-block px-3 py-1 font-semibold text-sm rounded-full ${
                      isHost
                        ? "bg-orange-100 text-orange-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {primaryRole}
                  </span>
                  {isHost && (
                    <div
                      className="inline-flex items-center gap-1"
                      title="Host rating"
                    >
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={14}
                          className={
                            star <= hostFilledStars
                              ? "text-yellow-500 fill-current"
                              : "text-gray-300"
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="w-full space-y-4 mb-8">
                  <div className="flex items-center gap-3 text-gray-600">
                    <Mail size={18} className="text-gray-400 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                        Email Address
                      </p>
                      <p className="font-medium text-gray-900">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-gray-600">
                    <Phone size={18} className="text-gray-400 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                        Mobile No.
                      </p>
                      <p className="font-medium text-gray-900">
                        {user.phoneNumber || "Not provided"}
                      </p>
                    </div>
                  </div>

                  {user.sex && (
                    <div className="flex items-center gap-3 text-gray-600">
                      <User size={18} className="text-gray-400 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                          Sex
                        </p>
                        {(() => {
                          const normalizedSex = user.sex.trim().toLowerCase();
                          const sexBadgeClass =
                            normalizedSex === "male" || normalizedSex === "m"
                              ? "bg-blue-100 text-blue-700"
                              : normalizedSex === "female" ||
                                  normalizedSex === "f"
                                ? "bg-pink-100 text-pink-700"
                                : "bg-gray-100 text-gray-700";

                          return (
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${sexBadgeClass}`}
                            >
                              {user.sex}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-gray-600">
                    <Calendar size={18} className="text-gray-400 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                        Birthday
                      </p>
                      <p className="font-medium text-gray-900">
                        {formatBirthday(user.dateOfBirth)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-gray-600">
                    <User size={18} className="text-gray-400 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                        Age
                      </p>
                      <p className="font-medium text-gray-900">
                        {profileAge !== null
                          ? `${profileAge} years old`
                          : "Not available"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-gray-600">
                    {getVerificationIcon(profileStatus)}
                    <div>
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                        Verification Status
                      </p>
                      <p
                        className={`font-medium ${getStatusColor(profileStatus)}`}
                      >
                        {profileStatus}
                      </p>
                      {showSecondaryRoleStatus && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Host status: {hostStatus}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <button
                    onClick={openEditModal}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-lg transition-colors border border-gray-200"
                  >
                    <Edit size={18} />
                    Edit User
                  </button>
                  <button
                    onClick={openSuspendModal}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-lg transition-colors border border-red-100"
                  >
                    <Ban size={18} />
                    Suspend User
                  </button>
                </div>

                {((isDriver && user?.driver) || isHost) && (
                  <div className="w-full mt-6 bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <ShieldCheck size={16} className="text-[#C94B1E]" />
                      Verification Actions
                    </h3>

                    <div className="space-y-4">
                      {isDriver && user?.driver && (
                        <div>
                          {getDriverStatus() === "PENDING" ? (
                            <div className="space-y-3">
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                <div className="flex items-start gap-2">
                                  <Clock
                                    size={16}
                                    className="text-yellow-600 shrink-0 mt-0.5"
                                  />
                                  <div>
                                    <p className="font-semibold text-yellow-800 text-sm">
                                      Pending Driver Verification
                                    </p>
                                    <p className="text-xs text-yellow-700 mt-0.5">
                                      Review the license information and take
                                      action.
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() =>
                                  user.driver &&
                                  handleDriverVerification(
                                    user.driver.id,
                                    "VERIFIED",
                                  )
                                }
                                disabled={actionLoading}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-semibold rounded-lg transition-colors"
                              >
                                {actionLoading ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <CheckCircle size={16} />
                                )}
                                Approve Driver
                              </button>
                              <button
                                onClick={() =>
                                  user.driver &&
                                  handleDriverVerification(
                                    user.driver.id,
                                    "REJECTED",
                                    "Driver license verification failed",
                                  )
                                }
                                disabled={actionLoading}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-semibold rounded-lg transition-colors"
                              >
                                {actionLoading ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <XCircle size={16} />
                                )}
                                Reject Driver
                              </button>
                            </div>
                          ) : getDriverStatus() === "VERIFIED" ? (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                              <div className="flex items-start gap-2">
                                <CheckCircle
                                  size={16}
                                  className="text-green-600 shrink-0 mt-0.5"
                                />
                                <div>
                                  <p className="font-semibold text-green-800 text-sm">
                                    Verified Driver
                                  </p>
                                  <p className="text-xs text-green-700 mt-0.5">
                                    Driver has full access to driver features.
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : getDriverStatus() === "REJECTED" ? (
                            <div className="space-y-3">
                              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <div className="flex items-start gap-2">
                                  <XCircle
                                    size={16}
                                    className="text-red-600 shrink-0 mt-0.5"
                                  />
                                  <div>
                                    <p className="font-semibold text-red-800 text-sm">
                                      Driver Verification Rejected
                                    </p>
                                    <p className="text-xs text-red-700 mt-0.5">
                                      You can re-approve if needed.
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() =>
                                  user.driver &&
                                  handleDriverVerification(
                                    user.driver.id,
                                    "VERIFIED",
                                  )
                                }
                                disabled={actionLoading}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-semibold rounded-lg transition-colors"
                              >
                                {actionLoading ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <CheckCircle size={16} />
                                )}
                                Re-approve Driver
                              </button>
                            </div>
                          ) : (
                            <div className="bg-gray-100 border border-gray-200 rounded-lg p-3">
                              <div className="flex items-start gap-2">
                                <AlertCircle
                                  size={16}
                                  className="text-gray-500 shrink-0 mt-0.5"
                                />
                                <div>
                                  <p className="font-semibold text-gray-700 text-sm">
                                    Driver Account Suspended
                                  </p>
                                  <p className="text-xs text-gray-600 mt-0.5">
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
                          {hostStatus === "SUSPENDED" ? (
                            <div className="bg-gray-100 border border-gray-200 rounded-lg p-3">
                              <div className="flex items-start gap-2">
                                <AlertCircle
                                  size={16}
                                  className="text-gray-500 shrink-0 mt-0.5"
                                />
                                <div>
                                  <p className="font-semibold text-gray-700 text-sm">
                                    Host Account Suspended
                                  </p>
                                  <p className="text-xs text-gray-600 mt-0.5">
                                    This host role is currently suspended.
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                              <div className="flex items-start gap-2">
                                <CheckCircle
                                  size={16}
                                  className="text-green-600 shrink-0 mt-0.5"
                                />
                                <div>
                                  <p className="font-semibold text-green-800 text-sm">
                                    Verified Host
                                  </p>
                                  <p className="text-xs text-green-700 mt-0.5">
                                    Host can publish approved listings.
                                    Individual listings require admin approval.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="hidden lg:block lg:col-span-1">
                <div className="h-full w-px bg-gray-200 mx-auto"></div>
              </div>

              <div className="lg:col-span-7 space-y-8">
                {/* Legal Consent Status */}
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <ShieldCheck size={20} className="text-[#C94B1E]" />
                    Legal Consent
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">
                        Terms &amp; Conditions
                      </p>
                      {user.termsAcceptedAt ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle
                            size={16}
                            className="text-green-500 shrink-0"
                          />
                          <div>
                            <p className="text-sm font-semibold text-green-700">
                              Accepted
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {new Date(
                                user.termsAcceptedAt,
                              ).toLocaleDateString("en-PH", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <XCircle
                            size={16}
                            className="text-red-400 shrink-0"
                          />
                          <p className="text-sm font-medium text-red-500">
                            Not accepted
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">
                        Data Privacy Policy
                      </p>
                      {user.privacyAcceptedAt ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle
                            size={16}
                            className="text-green-500 shrink-0"
                          />
                          <div>
                            <p className="text-sm font-semibold text-green-700">
                              Accepted
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {new Date(
                                user.privacyAcceptedAt,
                              ).toLocaleDateString("en-PH", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <XCircle
                            size={16}
                            className="text-red-400 shrink-0"
                          />
                          <p className="text-sm font-medium text-red-500">
                            Not accepted
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {isDriver && user.driver && (
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                      <CarFront size={20} className="text-[#C94B1E]" />
                      Driver License Information
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">
                          License Number
                        </p>
                        <p className="font-semibold text-gray-900 text-lg">
                          {user.driver.licenseNumber || "Not provided"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">
                          Verification Status
                        </p>
                        <div className="flex items-center gap-2">
                          {getVerificationIcon(getDriverStatus() || "PENDING")}
                          <span
                            className={`font-semibold ${getStatusColor(getDriverStatus() || "PENDING")}`}
                          >
                            {getDriverStatus() || "PENDING"}
                          </span>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">
                          License Image
                        </p>
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
                              <p className="text-sm">
                                No license image uploaded
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "bookings" && isDriver && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-500">
                  Filter:
                </label>
                <select
                  value={bookingFilter}
                  onChange={(e) =>
                    setBookingFilter(
                      e.target.value as "all" | "active" | "finished",
                    )
                  }
                  className="text-xs border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C94B1E] focus:border-transparent"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="finished">Finished</option>
                </select>
              </div>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold tracking-wider border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3">Booking ID</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Host</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Active</th>
                      <th className="px-4 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {(() => {
                      const activeStatuses = [
                        "ACTIVE",
                        "CONFIRMED",
                        "PENDING",
                        "PENDING_PAYMENT",
                      ];
                      const allBookings = user.driver?.reservations ?? [];
                      const filtered = allBookings.filter((b) => {
                        const isActive = activeStatuses.includes(b.status);
                        if (bookingFilter === "active") return isActive;
                        if (bookingFilter === "finished") return !isActive;
                        return true;
                      });
                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-4 py-10 text-center text-gray-500"
                            >
                              No bookings found.
                            </td>
                          </tr>
                        );
                      }
                      return filtered.map((booking) => {
                        const isActive = activeStatuses.includes(
                          booking.status,
                        );
                        return (
                          <tr
                            key={booking.id}
                            className="hover:bg-gray-50/50 transition-colors"
                          >
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {booking.id.slice(0, 8).toUpperCase()}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {formatBookingDate(booking)}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {booking.hostName ||
                                booking.propertyTitle ||
                                booking.parkingLocation?.title ||
                                "N/A"}
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {formatBookingAmount(booking.totalAmount)}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                  isActive
                                    ? "bg-green-100 text-green-700"
                                    : "bg-gray-100 text-gray-500"
                                }`}
                              >
                                {isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-2">
                                <span
                                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                    booking.status === "COMPLETED"
                                      ? "bg-green-100 text-green-700"
                                      : booking.status === "ACTIVE" ||
                                          booking.status === "CONFIRMED"
                                        ? "bg-blue-100 text-blue-700"
                                        : booking.status === "PENDING" ||
                                            booking.status === "PENDING_PAYMENT"
                                          ? "bg-yellow-100 text-yellow-700"
                                          : "bg-gray-100 text-gray-700"
                                  }`}
                                >
                                  {formatBookingStatus(booking.status)}
                                </span>
                                <button
                                  onClick={() =>
                                    router.push(
                                      `/sessions?session=${booking.id}`,
                                    )
                                  }
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-[#C94B1E] hover:bg-orange-50 transition-colors"
                                  title="View session"
                                >
                                  <Eye size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Vehicle Info Tab */}
          {activeTab === "vehicle" && isDriver && user?.driver && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Registered Vehicles
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {user.driver.vehicles?.length ?? 0} vehicle
                    {(user.driver.vehicles?.length ?? 0) !== 1 ? "s" : ""} on
                    record
                  </p>
                </div>
              </div>

              {user.driver.vehicles && user.driver.vehicles.length > 0 ? (
                <div className="space-y-4">
                  {user.driver.vehicles.map((vehicle) => {
                    const isApproved =
                      vehicle.verificationStatus === "APPROVED";
                    const isRejected =
                      vehicle.verificationStatus === "REJECTED";
                    const isPending = vehicle.verificationStatus === "PENDING";

                    return (
                      <div
                        key={vehicle.id}
                        className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm"
                      >
                        {/* Status bar at top */}
                        <div
                          className={`px-5 py-2.5 flex items-center gap-2 ${
                            isApproved
                              ? "bg-green-50 border-b border-green-100"
                              : isRejected
                                ? "bg-red-50 border-b border-red-100"
                                : "bg-amber-50 border-b border-amber-100"
                          }`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full ${isApproved ? "bg-green-500" : isRejected ? "bg-red-500" : "bg-amber-400"}`}
                          />
                          <span
                            className={`text-xs font-bold uppercase tracking-wider ${isApproved ? "text-green-700" : isRejected ? "text-red-700" : "text-amber-700"}`}
                          >
                            {isApproved
                              ? "Verified"
                              : isRejected
                                ? "Rejected"
                                : "Pending Verification"}
                          </span>
                          <span className="ml-auto text-xs text-gray-400">
                            Added{" "}
                            {vehicle.createdAt
                              ? new Date(vehicle.createdAt).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  },
                                )
                              : "—"}
                          </span>
                        </div>

                        <div className="p-5">
                          <div className="flex gap-6">
                            {/* Left: vehicle info */}
                            <div className="flex-1 min-w-0">
                              {/* Header */}
                              <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                                  <CarFront
                                    size={24}
                                    className="text-[#C94B1E]"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-gray-900 text-base leading-tight">
                                    {[vehicle.brand, vehicle.model]
                                      .filter(Boolean)
                                      .join(" ") || "Unknown Vehicle"}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="inline-flex items-center gap-1 bg-orange-50 text-[#C94B1E] text-xs font-bold px-2.5 py-0.5 rounded-full border border-orange-100">
                                      {vehicle.plateNumber || "No plate"}
                                    </span>
                                    {vehicle.vehicleType && (
                                      <span className="text-xs text-gray-500 font-medium">
                                        {vehicle.vehicleType}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Details grid */}
                              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                                {[
                                  { label: "Brand", value: vehicle.brand },
                                  { label: "Model", value: vehicle.model },
                                  { label: "Type", value: vehicle.vehicleType },
                                  { label: "Color", value: vehicle.color },
                                  {
                                    label: "Plate No.",
                                    value: vehicle.plateNumber,
                                  },
                                ].map(({ label, value }) => (
                                  <div key={label}>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                                      {label}
                                    </p>
                                    <p className="text-sm font-semibold text-gray-800">
                                      {value || (
                                        <span className="text-gray-300 font-normal">
                                          —
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                ))}
                              </div>

                              {/* Rejection reason */}
                              {isRejected && vehicle.rejectionReason && (
                                <div className="mt-4 flex gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                                  <XCircle
                                    size={15}
                                    className="text-red-500 flex-shrink-0 mt-0.5"
                                  />
                                  <div>
                                    <p className="text-xs font-bold text-red-700 mb-0.5">
                                      Rejection Reason
                                    </p>
                                    <p className="text-sm text-red-600">
                                      {vehicle.rejectionReason}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Action buttons */}
                              <div className="mt-5 flex gap-2.5">
                                {!isApproved &&
                                  vehicle.registrationImageUrl && (
                                    <button
                                      onClick={async () => {
                                        if (
                                          !confirm(
                                            `Approve registration for ${vehicle.plateNumber}?`,
                                          )
                                        )
                                          return;
                                        setActionLoading(true);
                                        try {
                                          await api.put(
                                            `/drivers/admin/vehicles/${vehicle.id}/verify`,
                                            { action: "APPROVED" },
                                          );
                                          await fetchUserProfile();
                                        } catch {
                                          alert("Failed to approve vehicle.");
                                        } finally {
                                          setActionLoading(false);
                                        }
                                      }}
                                      disabled={actionLoading}
                                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition"
                                    >
                                      <CheckCircle size={15} />
                                      Approve
                                    </button>
                                  )}
                                {!isApproved &&
                                  vehicle.registrationImageUrl && (
                                    <button
                                      onClick={async () => {
                                        const reason = prompt(
                                          "Rejection reason (optional):",
                                        );
                                        if (reason === null) return;
                                        setActionLoading(true);
                                        try {
                                          await api.put(
                                            `/drivers/admin/vehicles/${vehicle.id}/verify`,
                                            {
                                              action: "REJECTED",
                                              rejectionReason:
                                                reason || undefined,
                                            },
                                          );
                                          await fetchUserProfile();
                                        } catch {
                                          alert("Failed to reject vehicle.");
                                        } finally {
                                          setActionLoading(false);
                                        }
                                      }}
                                      disabled={actionLoading}
                                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition"
                                    >
                                      <XCircle size={15} />
                                      Reject
                                    </button>
                                  )}
                                {isApproved && (
                                  <button
                                    onClick={async () => {
                                      const reason = prompt(
                                        "Rejection reason (optional):",
                                      );
                                      if (reason === null) return;
                                      setActionLoading(true);
                                      try {
                                        await api.put(
                                          `/drivers/admin/vehicles/${vehicle.id}/verify`,
                                          {
                                            action: "REJECTED",
                                            rejectionReason:
                                              reason || undefined,
                                          },
                                        );
                                        await fetchUserProfile();
                                      } catch {
                                        alert("Failed to revoke approval.");
                                      } finally {
                                        setActionLoading(false);
                                      }
                                    }}
                                    disabled={actionLoading}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-200 text-red-600 bg-red-50 text-sm font-semibold hover:bg-red-100 disabled:opacity-50 transition"
                                  >
                                    <Ban size={15} />
                                    Revoke Approval
                                  </button>
                                )}
                                {!vehicle.registrationImageUrl &&
                                  !isApproved && (
                                    <p className="text-xs text-gray-400 italic self-center">
                                      Awaiting registration upload from driver
                                    </p>
                                  )}
                              </div>
                            </div>

                            {/* Right: registration image */}
                            <div className="w-52 flex-shrink-0">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                                Certificate of Registration
                              </p>
                              {vehicle.registrationImageUrl ? (
                                <a
                                  href={vehicle.registrationImageUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block group"
                                >
                                  <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                                    <img
                                      src={vehicle.registrationImageUrl}
                                      alt="Certificate of Registration"
                                      className="w-full object-contain"
                                      style={{ maxHeight: 200 }}
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center">
                                      <span className="opacity-0 group-hover:opacity-100 transition bg-black/60 text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                                        <Eye size={12} /> View full
                                      </span>
                                    </div>
                                  </div>
                                  <p className="text-xs text-gray-400 mt-1.5 text-center">
                                    Click to view full size
                                  </p>
                                </a>
                              ) : (
                                <div className="h-36 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-300">
                                  <AlertCircle size={24} />
                                  <p className="text-xs font-medium text-center px-3">
                                    No image uploaded yet
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center">
                  <CarFront size={36} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-gray-400">
                    No vehicles registered yet
                  </p>
                  <p className="text-xs text-gray-300 mt-1">
                    Vehicle details will appear here once the driver adds one.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === "reviews" && (
            <div className="space-y-8">
              {reviewsLoading ? (
                <div className="py-12 flex items-center justify-center gap-3 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Loading reviews...</span>
                </div>
              ) : reviewsError ? (
                <div className="py-8 flex items-center gap-3 px-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{reviewsError}</span>
                  <button
                    onClick={() => {
                      setUserReviews(null);
                      setReviewsError(null);
                      fetchUserReviews();
                    }}
                    className="ml-auto text-xs underline"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <>
                  {/* Reviews Given */}
                  <div>
                    <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Star size={16} className="text-yellow-500" />
                      Reviews Given
                      <span className="text-sm font-normal text-gray-400">
                        ({userReviews?.given.length ?? 0})
                      </span>
                    </h3>
                    {!userReviews?.given.length ? (
                      <div className="py-8 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-sm">
                        No reviews given yet.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {userReviews.given.map((review) => {
                          const locationTitle =
                            review.reservation?.parkingSpace?.parkingLocation
                              ?.title;
                          const driverName = review.reservation?.driver?.user
                            ? `${review.reservation.driver.user.firstName ?? ""} ${review.reservation.driver.user.lastName ?? ""}`.trim()
                            : null;
                          const target = locationTitle || driverName || "—";
                          return (
                            <div
                              key={review.id}
                              className="bg-white rounded-xl border border-gray-200 p-4 flex items-start justify-between gap-4"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="flex items-center gap-0.5">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                      <Star
                                        key={s}
                                        size={13}
                                        className={
                                          s <= review.rating
                                            ? "text-yellow-400 fill-current"
                                            : "text-gray-200 fill-current"
                                        }
                                      />
                                    ))}
                                  </div>
                                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                    {review.reviewType === "DRIVER_TO_LOCATION"
                                      ? "Location Review"
                                      : "Driver Review"}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700 mb-1">
                                  {review.comment || (
                                    <span className="italic text-gray-400">
                                      No comment
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-gray-400">
                                  To: {target} ·{" "}
                                  {new Date(
                                    review.createdAt,
                                  ).toLocaleDateString("en-PH", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </p>
                              </div>
                              <button
                                onClick={() => setDeleteReviewId(review.id)}
                                className="shrink-0 px-3 py-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Reviews Received */}
                  <div>
                    <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Star size={16} className="text-[#C94B1E]" />
                      Reviews Received
                      <span className="text-sm font-normal text-gray-400">
                        ({userReviews?.received.length ?? 0})
                      </span>
                    </h3>
                    {!userReviews?.received.length ? (
                      <div className="py-8 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-sm">
                        No reviews received yet.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {userReviews.received.map((review) => {
                          const reviewerName = review.reviewer
                            ? `${review.reviewer.firstName ?? ""} ${review.reviewer.lastName ?? ""}`.trim() ||
                              "Unknown"
                            : "Unknown";
                          const locationTitle =
                            review.reservation?.parkingSpace?.parkingLocation
                              ?.title;
                          return (
                            <div
                              key={review.id}
                              className="bg-white rounded-xl border border-gray-200 p-4 flex items-start justify-between gap-4"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="flex items-center gap-0.5">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                      <Star
                                        key={s}
                                        size={13}
                                        className={
                                          s <= review.rating
                                            ? "text-yellow-400 fill-current"
                                            : "text-gray-200 fill-current"
                                        }
                                      />
                                    ))}
                                  </div>
                                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                    {review.reviewType === "DRIVER_TO_LOCATION"
                                      ? "Location Review"
                                      : "Driver Review"}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700 mb-1">
                                  {review.comment || (
                                    <span className="italic text-gray-400">
                                      No comment
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-gray-400">
                                  From: {reviewerName}
                                  {locationTitle ? ` · ${locationTitle}` : ""}
                                  {" · "}
                                  {new Date(
                                    review.createdAt,
                                  ).toLocaleDateString("en-PH", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </p>
                              </div>
                              <button
                                onClick={() => setDeleteReviewId(review.id)}
                                className="shrink-0 px-3 py-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Property Info Tab (Host only) */}
          {activeTab === "property" && isHost && user?.host && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Home size={20} className="text-[#C94B1E]" />
                  Parking Locations ({user.host.parkingLocations?.length || 0})
                </h3>
                <button
                  onClick={() => router.push("/listings")}
                  className="text-sm text-[#C94B1E] hover:text-[#A83A16] font-medium"
                >
                  View All Pending Listings →
                </button>
              </div>

              <div>
                <h4 className="text-base font-bold text-gray-900 mb-3">
                  Recent Listings
                </h4>
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
                      {user.host.parkingLocations &&
                      user.host.parkingLocations.length > 0 ? (
                        user.host.parkingLocations.map((listing) => (
                          <tr
                            key={listing.id}
                            className="hover:bg-gray-50/50 transition-colors"
                          >
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {listing.id.slice(0, 8).toUpperCase()}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {listing.title}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {formatListingDate(listing.createdAt)}
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {formatListingRevenue(listing.revenueTotal)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                  listing.status === "APPROVED"
                                    ? "bg-green-100 text-green-700"
                                    : listing.status === "PENDING"
                                      ? "bg-yellow-100 text-yellow-700"
                                      : listing.status === "REJECTED"
                                        ? "bg-red-100 text-red-700"
                                        : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {listing.status.charAt(0) +
                                  listing.status.slice(1).toLowerCase()}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-10 text-center text-gray-500"
                          >
                            No recent listings found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {user.host.parkingLocations &&
              user.host.parkingLocations.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {user.host.parkingLocations.map((location) => (
                    <div
                      key={location.id}
                      className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
                        location.status === "APPROVED"
                          ? "border-green-200"
                          : location.status === "PENDING"
                            ? "border-yellow-200"
                            : location.status === "REJECTED"
                              ? "border-red-200"
                              : "border-gray-200"
                      }`}
                    >
                      <div
                        className={`px-4 py-2 flex items-center justify-between ${
                          location.status === "APPROVED"
                            ? "bg-green-50"
                            : location.status === "PENDING"
                              ? "bg-yellow-50"
                              : location.status === "REJECTED"
                                ? "bg-red-50"
                                : "bg-gray-50"
                        }`}
                      >
                        <span className="text-xs font-mono text-gray-400">
                          {location.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            location.status === "APPROVED"
                              ? "bg-green-100 text-green-700"
                              : location.status === "PENDING"
                                ? "bg-yellow-100 text-yellow-700"
                                : location.status === "REJECTED"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {location.status.charAt(0) +
                            location.status.slice(1).toLowerCase()}
                        </span>
                      </div>

                      <div className="p-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                            <Home size={18} className="text-[#C94B1E]" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 text-sm leading-tight">
                              {location.title}
                            </p>
                            <p
                              className="text-xs text-gray-500 mt-0.5 truncate"
                              title={location.address}
                            >
                              {location.address}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-gray-50 rounded-lg p-2">
                            <p className="text-gray-400 font-medium uppercase tracking-wider mb-0.5">
                              Revenue
                            </p>
                            <p className="font-semibold text-gray-900">
                              {formatListingRevenue(location.revenueTotal)}
                            </p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-2">
                            <p className="text-gray-400 font-medium uppercase tracking-wider mb-0.5">
                              Date Added
                            </p>
                            <p className="font-semibold text-gray-900">
                              {formatListingDate(location.createdAt)}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() =>
                            router.push(
                              `/listings?listingId=${encodeURIComponent(location.id)}`,
                            )
                          }
                          className="w-full text-sm text-[#C94B1E] hover:text-[#A83A16] font-medium py-1.5 border border-[#C94B1E]/20 hover:border-[#C94B1E]/40 rounded-lg transition-colors"
                        >
                          View Listing →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 flex flex-col items-center justify-center text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
                  <Home size={48} className="text-gray-300 mb-4" />
                  <p className="text-lg font-medium">
                    No parking locations yet
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    This host hasn&apos;t added any parking locations.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">
                Edit User Information
              </h3>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    First Name
                  </label>
                  <input
                    value={editForm.firstName}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        firstName: e.target.value,
                      }))
                    }
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C94B1E]"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Last Name
                  </label>
                  <input
                    value={editForm.lastName}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        lastName: e.target.value,
                      }))
                    }
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C94B1E]"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C94B1E]"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Mobile Number
                </label>
                <input
                  value={editForm.phoneNumber}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      phoneNumber: e.target.value,
                    }))
                  }
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C94B1E]"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Birthday
                </label>
                <input
                  type="date"
                  value={editForm.dateOfBirth}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      dateOfBirth: e.target.value,
                    }))
                  }
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C94B1E]"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Age</label>
                <input
                  value={
                    calculateAge(editForm.dateOfBirth) !== null
                      ? `${calculateAge(editForm.dateOfBirth)} years old`
                      : ""
                  }
                  readOnly
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                  placeholder="Auto-calculated from birthday"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleEditUser}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#C94B1E] hover:bg-[#A83A16] rounded-lg disabled:opacity-50"
              >
                {actionLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteReviewId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-xl border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Delete Review
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              This review will be permanently deleted. This action cannot be
              undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteReviewId(null)}
                disabled={deleteReviewLoading}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteReview}
                disabled={deleteReviewLoading}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
              >
                {deleteReviewLoading ? "Deleting..." : "Delete Review"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuspendModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">
                Suspend User Activities
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Choose which activities to suspend for this user.
              </p>
            </div>

            <div className="px-6 py-5 space-y-4">
              {isDriver ? (
                <label className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 bg-gray-50">
                  <input
                    type="checkbox"
                    checked={suspensionForm.suspendDriverReservation}
                    onChange={(e) =>
                      setSuspensionForm((prev) => ({
                        ...prev,
                        suspendDriverReservation: e.target.checked,
                      }))
                    }
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium text-gray-900">
                      Suspend Reserving Parking
                    </p>
                    <p className="text-sm text-gray-600">
                      User will be blocked from creating new parking
                      reservations.
                    </p>
                  </div>
                </label>
              ) : null}

              {isHost ? (
                <label className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 bg-gray-50">
                  <input
                    type="checkbox"
                    checked={suspensionForm.suspendHostParkingManagement}
                    onChange={(e) =>
                      setSuspensionForm((prev) => ({
                        ...prev,
                        suspendHostParkingManagement: e.target.checked,
                      }))
                    }
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium text-gray-900">
                      Suspend Parking Space Management
                    </p>
                    <p className="text-sm text-gray-600">
                      User will be blocked from creating, updating, deleting,
                      and toggling parking locations/spaces.
                    </p>
                  </div>
                </label>
              ) : null}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowSuspendModal(false)}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateSuspensions}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
              >
                {actionLoading ? "Updating..." : "Update Suspensions"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
