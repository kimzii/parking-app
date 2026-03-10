"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  MoreHorizontal,
  Eye,
  Calendar,
  Zap,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import api from "../../../src/lib/api";
import Image from "next/image";

// --- Interfaces ---
interface ReservationStats {
  totalReservations: number;
  activeReservations: number;
  completedReservations: number;
  cancelledReservations: number;
}

interface Reservation {
  id: string;
  guestName: string;
  guestProfilePicture: string | null;
  hostName: string;
  propertyTitle: string;
  startTime: string;
  endTime: string;
  status: "PENDING" | "CONFIRMED" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  totalAmount: number;
}

// --- Components ---
const StatCard = ({ title, value, icon, iconBg, iconColor, loading }: {
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
        <div className="w-16 h-8 bg-gray-200 animate-pulse rounded mt-1" />
      ) : (
        <span className="text-3xl font-bold text-gray-900 mt-1">{value.toLocaleString()}</span>
      )}
    </div>
  </div>
);

export default function ReservationsOverviewPage() {
  const [stats, setStats] = useState<ReservationStats | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const limit = 10;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (statusFilter) params.append("status", statusFilter);
      if (search) params.append("search", search);

      const [statsRes, reservationsRes] = await Promise.all([
        api.get<ReservationStats>("/dashboard/reservations/stats"),
        api.get<{ reservations: Reservation[]; total: number }>(
          `/dashboard/reservations?${params.toString()}`
        ),
      ]);

      setStats(statsRes.data);
      setReservations(reservationsRes.data.reservations);
      setTotal(reservationsRes.data.total);
    } catch (err) {
      console.error("Error fetching reservations:", err);
      setError("Failed to load reservations");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const startStr = startDate.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
    const endStr = endDate.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });

    if (startDate.toDateString() === endDate.toDateString()) {
      return startStr + ", " + startDate.getFullYear();
    }
    return `${startStr} - ${endStr}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "ACTIVE":
      case "CONFIRMED":
        return "bg-blue-100 text-blue-700";
      case "COMPLETED":
        return "bg-green-100 text-green-700";
      case "PENDING":
        return "bg-yellow-100 text-yellow-700";
      case "CANCELLED":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const formatStatus = (status: string) => {
    return status.charAt(0) + status.slice(1).toLowerCase();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  if (error && !loading) {
    return (
      <div className="bg-[#F9FAFB] min-h-full font-sans p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-red-500">
          <AlertCircle className="w-8 h-8" />
          <p>{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-[#005f56] text-white rounded-lg hover:bg-[#004d40]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-[#F9FAFB] min-h-full font-sans p-8">

      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Reservations Overview</h1>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Reservations"
          value={stats?.totalReservations || 0}
          icon={<Calendar size={28} />}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          loading={loading && !stats}
        />
        <StatCard
          title="Active Reservations"
          value={stats?.activeReservations || 0}
          icon={<Zap size={28} />}
          iconBg="bg-yellow-100"
          iconColor="text-yellow-600"
          loading={loading && !stats}
        />
        <StatCard
          title="Completed"
          value={stats?.completedReservations || 0}
          icon={<CheckCircle size={28} />}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          loading={loading && !stats}
        />
        <StatCard
          title="Cancelled"
          value={stats?.cancelledReservations || 0}
          icon={<XCircle size={28} />}
          iconBg="bg-red-100"
          iconColor="text-red-600"
          loading={loading && !stats}
        />
      </div>

      {/* Main Reservations Table Container */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">

        {/* Table Controls (Search & Filter) */}
        <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="relative w-full sm:w-[400px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search reservations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-50 pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#005f56] focus:border-transparent outline-none text-gray-700 transition-all"
            />
          </form>

          {/* Filter Dropdown */}
          <div className="flex gap-3 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="flex-1 sm:flex-none bg-gray-50 border border-gray-200 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium appearance-none cursor-pointer"
            >
              <option value="">Any Status</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Reservations Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">Booking ID</th>
                <th className="px-6 py-4">Guest</th>
                <th className="px-6 py-4">Host</th>
                <th className="px-6 py-4">Property</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-500">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Loading reservations...</span>
                    </div>
                  </td>
                </tr>
              ) : reservations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No reservations found
                  </td>
                </tr>
              ) : (
                reservations.map((reservation) => (
                  <tr key={reservation.id} className="hover:bg-gray-50/50 transition-colors">

                    {/* ID */}
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {reservation.id.slice(0, 8).toUpperCase()}
                    </td>

                    {/* Guest with Profile Picture */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {reservation.guestProfilePicture ? (
                          <Image
                            src={reservation.guestProfilePicture}
                            alt={reservation.guestName}
                            width={32}
                            height={32}
                            className="rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-sm font-medium">
                            {reservation.guestName.charAt(0)}
                          </div>
                        )}
                        <span className="text-gray-700 font-medium">{reservation.guestName}</span>
                      </div>
                    </td>

                    {/* Host */}
                    <td className="px-6 py-4 text-gray-600">
                      {reservation.hostName}
                    </td>

                    {/* Property */}
                    <td className="px-6 py-4 text-gray-600">
                      {reservation.propertyTitle}
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                      {formatDateRange(reservation.startTime, reservation.endTime)}
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusStyles(reservation.status)}`}>
                        {formatStatus(reservation.status)}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {formatCurrency(reservation.totalAmount)}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 text-gray-400 hover:text-[#005f56] hover:bg-green-50 rounded-full transition-colors" title="View Details">
                          <Eye size={18} />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors" title="More Options">
                          <MoreHorizontal size={18} />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-gray-50 flex items-center justify-between text-sm text-gray-500 bg-gray-50/30">
          <span>
            Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total.toLocaleString()} reservations
          </span>
          <div className="flex gap-2">
            <button
              className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-50"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Prev
            </button>
            <button
              className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-50"
              disabled={page * limit >= total}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}