"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Car,
  Home,
  Shield,
  Search,
  ChevronDown,
  Eye,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Trash2,
} from "lucide-react";
import api from "../../../src/lib/api";
import Image from "next/image";

// --- Types aligned with Prisma schema ---
type RoleName = "DRIVER" | "HOST" | "ADMIN";
type VerificationStatus = "PENDING" | "VERIFIED" | "REJECTED" | "SUSPENDED";
type VerificationFilter = "" | "PENDING" | "VERIFIED" | "REJECTED";

interface RoleStatus {
  role: RoleName;
  status: VerificationStatus;
}

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  profilePicture: string | null; // S3 URL
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  roles: RoleName[];
  roleStatuses: RoleStatus[];
}

interface UserStatistics {
  total: number;
  byRoleStatus: {
    pending: number;
    verified: number;
    rejected: number;
  };
  byRole: {
    drivers: number;
    hosts: number;
    admins: number;
  };
}

interface UsersResponse {
  data: User[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// --- Components ---
const StatCard = ({
  title,
  value,
  icon,
  iconBg,
  iconColor,
  loading,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  loading?: boolean;
}) => (
  <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 h-[120px]">
    <div className={`w-14 h-14 rounded-lg flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}>
      {icon}
    </div>
    <div className="flex flex-col">
      <span className="text-gray-500 text-sm font-medium leading-tight">{title}</span>
      {loading ? (
        <Loader2 className="w-6 h-6 animate-spin text-gray-400 mt-2" />
      ) : (
        <span className="text-3xl font-bold text-gray-900 mt-1">{value}</span>
      )}
    </div>
  </div>
);

const getVerificationBadge = (status: VerificationStatus) => {
  const styles = {
    VERIFIED: { bg: "bg-green-100", text: "text-green-700", icon: CheckCircle },
    PENDING: { bg: "bg-yellow-100", text: "text-yellow-700", icon: Clock },
    REJECTED: { bg: "bg-red-100", text: "text-red-700", icon: XCircle },
    SUSPENDED: { bg: "bg-gray-100", text: "text-gray-600", icon: AlertCircle },
  };
  const style = styles[status] || styles.PENDING;
  const Icon = style.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
      <Icon size={12} />
      {status}
    </span>
  );
};

const getRoleBadge = (role: RoleName) => {
  const styles = {
    DRIVER: { bg: "bg-blue-100", text: "text-blue-700" },
    HOST: { bg: "bg-orange-100", text: "text-orange-700" },
    ADMIN: { bg: "bg-purple-100", text: "text-purple-700" },
  };
  const style = styles[role] || styles.DRIVER;
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
      {role}
    </span>
  );
};

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [statistics, setStatistics] = useState<UserStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleName | "">("");
  const [statusFilter, setStatusFilter] = useState<VerificationFilter>("");
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (search) params.append("search", search);
      if (roleFilter) params.append("role", roleFilter);
      if (statusFilter) params.append("status", statusFilter);

      const response = await api.get<UsersResponse>(`/users?${params}`);
      setUsers(response.data.data);
      setTotal(response.data.meta.total);
      setTotalPages(response.data.meta.totalPages);
    } catch (err) {
      setError("Failed to fetch users. Please try again.");
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, roleFilter, statusFilter]);

  // Fetch statistics
  const fetchStatistics = useCallback(async () => {
    try {
      setStatsLoading(true);
      const response = await api.get<UserStatistics>("/users/statistics");
      setStatistics(response.data);
    } catch (err) {
      console.error("Error fetching statistics:", err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleRoleFilter = (role: RoleName | "") => {
    setRoleFilter(role);
    setShowRoleDropdown(false);
    setPage(1);
  };

  const handleStatusFilter = (status: VerificationFilter) => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    setDeleting(true);
    try {
      await api.delete(`/users/${userToDelete.id}`);
      setDeleteModalOpen(false);
      setUserToDelete(null);
      // Refresh the users list and statistics
      fetchUsers();
      fetchStatistics();
    } catch (err: unknown) {
      const message: string =
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof (err as { response?: { data?: { message?: string } } }).response?.data?.message === "string"
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? "Failed to delete user")
          : "Failed to delete user";
      setError(message);
    } finally {
      setDeleting(false);
    }
  };

  const getUserDisplayName = (user: User) => {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ""} ${user.lastName || ""}`.trim();
    }
    return user.email.split("@")[0];
  };

  const getRoleStatus = (roleStatuses: RoleStatus[], role: RoleName): VerificationStatus | null => {
    return roleStatuses.find((rs) => rs.role === role)?.status ?? null;
  };

  const startIndex = (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, total);

  return (
    <div className="bg-[#F9FAFB] min-h-full font-sans p-8">
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Users"
          value={statistics?.total.toLocaleString() || 0}
          icon={<Users size={28} />}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          loading={statsLoading}
        />
        <StatCard
          title="Total Hosts"
          value={statistics?.byRole.hosts.toLocaleString() || 0}
          icon={<Home size={28} />}
          iconBg="bg-orange-100"
          iconColor="text-orange-600"
          loading={statsLoading}
        />
        <StatCard
          title="Total Drivers"
          value={statistics?.byRole.drivers.toLocaleString() || 0}
          icon={<Car size={28} />}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          loading={statsLoading}
        />
        <StatCard
          title="Total Admins"
          value={statistics?.byRole.admins.toLocaleString() || 0}
          icon={<Shield size={28} />}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
          loading={statsLoading}
        />
      </div>

      {/* Verification Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-yellow-600" />
            <span className="text-gray-600 font-medium">Pending Verification</span>
          </div>
          <span className="text-2xl font-bold text-yellow-600">
            {statsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : statistics?.byRoleStatus.pending || 0}
          </span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-gray-600 font-medium">Verified</span>
          </div>
          <span className="text-2xl font-bold text-green-600">
            {statsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : statistics?.byRoleStatus.verified || 0}
          </span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-600" />
            <span className="text-gray-600 font-medium">Rejected</span>
          </div>
          <span className="text-2xl font-bold text-red-600">
            {statsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : statistics?.byRoleStatus.rejected || 0}
          </span>
        </div>
      </div>

      {/* Main Users Table Container */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        {/* Table Controls (Search & Filter) */}
        <div className="p-6 border-b border-gray-50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          {/* Search Bar */}
          <div className="relative w-full sm:w-[400px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-gray-50 pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#005f56] focus:border-transparent outline-none text-gray-700 transition-all"
            />
          </div>

          {/* Filter Controls */}
          <div className="w-full lg:w-auto flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                className="flex items-center gap-2 bg-gray-50 border border-gray-200 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="text-sm font-medium">
                  {roleFilter ? `Role: ${roleFilter}` : "Filter by Role"}
                </span>
                <ChevronDown size={18} className="text-gray-500" />
              </button>

              {showRoleDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <button
                    onClick={() => handleRoleFilter("")}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700"
                  >
                    All Roles
                  </button>
                  <button
                    onClick={() => handleRoleFilter("DRIVER")}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700"
                  >
                    Drivers
                  </button>
                  <button
                    onClick={() => handleRoleFilter("HOST")}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700"
                  >
                    Hosts
                  </button>
                  <button
                    onClick={() => handleRoleFilter("ADMIN")}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700"
                  >
                    Admins
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleStatusFilter("")}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                  statusFilter === ""
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                All Statuses
              </button>
              <button
                onClick={() => handleStatusFilter("PENDING")}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                  statusFilter === "PENDING"
                    ? "bg-yellow-500 text-white border-yellow-500"
                    : "bg-white text-yellow-700 border-yellow-200 hover:bg-yellow-50"
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => handleStatusFilter("VERIFIED")}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                  statusFilter === "VERIFIED"
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-white text-green-700 border-green-200 hover:bg-green-50"
                }`}
              >
                Verified
              </button>
              <button
                onClick={() => handleStatusFilter("REJECTED")}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                  statusFilter === "REJECTED"
                    ? "bg-red-600 text-white border-red-600"
                    : "bg-white text-red-700 border-red-200 hover:bg-red-50"
                }`}
              >
                Rejected
              </button>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-2" />
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchUsers}
              className="mt-4 px-4 py-2 bg-[#005f56] text-white rounded-lg hover:bg-[#004a43] transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && !error && (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#005f56] mx-auto" />
            <p className="text-gray-500 mt-2">Loading users...</p>
          </div>
        )}

        {/* Users Table */}
        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Roles</th>
                  <th className="px-6 py-4">Email Address</th>
                  <th className="px-6 py-4">Email Verified</th>
                  <th className="px-6 py-4">Verification</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    return (
                    <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                      {/* Avatar & Name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {user.profilePicture ? (
                            <Image
                              src={user.profilePicture}
                              alt={getUserDisplayName(user)}
                              width={40}
                              height={40}
                              className="w-10 h-10 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-sm font-medium shrink-0">
                              {(getUserDisplayName(user) || "?").charAt(0)}
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-900">
                              {getUserDisplayName(user)}
                            </span>
                            {user.phoneNumber && (
                              <span className="text-xs text-gray-500">{user.phoneNumber}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Roles */}
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map((role) => (
                            <React.Fragment key={role}>{getRoleBadge(role)}</React.Fragment>
                          ))}
                        </div>
                      </td>

                      {/* Email Address */}
                      <td className="px-6 py-4 text-gray-600">{user.email}</td>

                      {/* Email Verified */}
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            user.emailVerified
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {user.emailVerified ? "Verified" : "Pending"}
                        </span>
                      </td>

                      {/* Role Verification Status */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-medium text-gray-500 min-w-[44px]">Driver</span>
                            {getRoleStatus(user.roleStatuses, "DRIVER") ? (
                              getVerificationBadge(getRoleStatus(user.roleStatuses, "DRIVER") as VerificationStatus)
                            ) : (
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">N/A</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-medium text-gray-500 min-w-[44px]">Host</span>
                            {getRoleStatus(user.roleStatuses, "HOST") ? (
                              getVerificationBadge(getRoleStatus(user.roleStatuses, "HOST") as VerificationStatus)
                            ) : (
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">N/A</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => router.push(`/users/${user.id}`)}
                            className="p-2 text-gray-400 hover:text-[#005f56] hover:bg-green-50 rounded-full transition-colors"
                            title="View Profile"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(user)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                            title="Delete User"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && users.length > 0 && (
          <div className="p-4 border-t border-gray-50 flex items-center justify-between text-sm text-gray-500 bg-gray-50/30">
            <span>
              Showing {startIndex} to {endIndex} of {total.toLocaleString()} users
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <span className="px-3 py-1 text-gray-700">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && userToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete User</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-gray-600 mb-6">
              Are you sure you want to delete{" "}
              <span className="font-semibold">
                {userToDelete.firstName || userToDelete.lastName
                  ? `${userToDelete.firstName || ""} ${userToDelete.lastName || ""}`.trim()
                  : userToDelete.email}
              </span>
              ? All associated data including roles, wallets, and reservations will be permanently removed.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setUserToDelete(null);
                }}
                disabled={deleting}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete User
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}