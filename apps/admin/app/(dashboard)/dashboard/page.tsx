"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  Users,
  ArrowUpRight,
  MapPin,
  TrendingUp,
  List,
  Info,
  DollarSign,
  Loader2,
  X
} from "lucide-react";
import { GoogleMap, MarkerF, useJsApiLoader } from "@react-google-maps/api";
import api from "../../../src/lib/api";

// --- Components ---

interface StatCardProps {
  title: string;
  value: string | number;
  footerLabel: string;
  footerColor: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}

const StatCard = ({ title, value, footerLabel, footerColor, icon, iconBg, iconColor }: StatCardProps) => (
  <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between h-[155px]">
    <div className="flex items-start gap-4">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}>
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="text-gray-500 text-sm font-medium leading-tight">{title}</span>
        <span className="text-2xl font-bold text-gray-900 mt-1">{value}</span>
      </div>
    </div>

    <div className="mt-2 pt-3 border-t border-gray-50 flex items-center gap-2 text-xs font-medium">
      {footerLabel.includes("Positive") ? (
        <TrendingUp className={`w-4 h-4 ${footerColor}`} />
      ) : footerLabel.includes("Revenue") ? (
        <Info className={`w-4 h-4 ${footerColor}`} />
      ) : (
        <List className={`w-4 h-4 ${footerColor}`} />
      )}
      <span className={footerColor}>
        {footerLabel}
      </span>
    </div>
  </div>
);

const ActivityItem = ({ user, action, time }: { user: string, action: string, time: string }) => (
  <div className="flex gap-4 relative pb-8 last:pb-0 group">
    <div className="absolute left-[19px] top-8 bottom-0 w-[1px] bg-gray-200 z-0 group-last:hidden"></div>
    <div className="relative z-[1] w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0 text-gray-500">
      <Users size={18} />
    </div>
    <div className="pt-1">
      <p className="text-sm text-gray-800 leading-snug">
        <span className="font-semibold">{user}</span> {action}
      </p>
      <span className="text-xs text-gray-400 mt-1 block">{time}</span>
    </div>
  </div>
);

interface DashboardStats {
  totalActiveListings: number;
  currentActiveReservations: number;
  totalUsers: number;
  totalRevenueThisMonth: number;
}

interface RecentListing {
  id: string;
  title: string;
  address: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  hostName: string;
  status: string;
  createdAt: string;
}

interface RecentActivity {
  id: string;
  user: string;
  action: string;
  time: string;
}

interface AdminListingsResponse {
  data: RecentListing[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

type MappableListing = RecentListing & {
  latitude: number;
  longitude: number;
};

const DEFAULT_MAP_CENTER = { lat: 7.0739, lng: 125.6123 };

const parseCoordinate = (value: number | string | null | undefined): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
};

export default function DashboardPage() {
  const router = useRouter();
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentListings, setRecentListings] = useState<RecentListing[]>([]);
  const [allListings, setAllListings] = useState<RecentListing[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMapListing, setSelectedMapListing] = useState<MappableListing | null>(null);
  const [isClient, setIsClient] = useState(false);

  const mappableListings: MappableListing[] = allListings
    .map((listing) => {
      const latitude = parseCoordinate(listing.latitude ?? listing.lat);
      const longitude = parseCoordinate(listing.longitude ?? listing.lng);

      if (latitude === null || longitude === null) {
        return null;
      }

      return {
        ...listing,
        latitude,
        longitude,
      };
    })
    .filter((listing): listing is MappableListing => listing !== null);

  const mapCenter = mappableListings.length > 0
    ? { lat: mappableListings[0].latitude, lng: mappableListings[0].longitude }
    : DEFAULT_MAP_CENTER;

  const { isLoaded: isMapLoaded, loadError } = useJsApiLoader({
    id: "parking-admin-google-map-script",
    googleMapsApiKey,
  });

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const fetchAllListings = async (): Promise<RecentListing[]> => {
        const limit = 100;
        const firstPage = await api.get<AdminListingsResponse>(
          `/hosts/admin/locations?page=1&limit=${limit}`
        );

        const totalPages = firstPage.data.pagination?.totalPages ?? 1;
        const all = [...firstPage.data.data];

        if (totalPages > 1) {
          const pageRequests: Promise<{ data: AdminListingsResponse }>[] = [];
          for (let page = 2; page <= totalPages; page += 1) {
            pageRequests.push(
              api.get<AdminListingsResponse>(`/hosts/admin/locations?page=${page}&limit=${limit}`)
            );
          }

          const remainingPages = await Promise.all(pageRequests);
          remainingPages.forEach((response) => {
            all.push(...response.data.data);
          });
        }

        return all;
      };

      try {
        setLoading(true);
        const [statsRes, listingsRes, activityRes, allListingsRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/dashboard/recent-listings?limit=4'),
          api.get('/dashboard/recent-activity?limit=5'),
          fetchAllListings(),
        ]);

        setStats(statsRes.data);
        setRecentListings(listingsRes.data);
        setRecentActivity(activityRes.data);
        setAllListings(allListingsRes);
        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        let errorMessage = 'Failed to load dashboard data';
        if (err && typeof err === 'object' && 'response' in err) {
          const response = (err as { response?: { data?: { message?: string } } }).response;
          errorMessage = response?.data?.message || errorMessage;
        }
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="bg-[#F9FAFB] min-h-full font-sans flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="animate-spin" size={24} />
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#F9FAFB] min-h-full font-sans p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          <p className="font-semibold">Error loading dashboard</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F9FAFB] min-h-full font-sans">

        {/* Page Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Main Overview</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Active Listings"
            value={stats?.totalActiveListings || 0}
            footerLabel="Currently approved"
            footerColor="text-green-600"
            icon={<ArrowUpRight size={24} />}
            iconBg="bg-green-100"
            iconColor="text-green-600"
          />
          <StatCard
            title="Current Active Reservations"
            value={stats?.currentActiveReservations || 0}
            footerLabel="Active or confirmed"
            footerColor="text-green-600"
            icon={<ArrowUpRight size={24} />}
            iconBg="bg-green-100"
            iconColor="text-green-600"
          />
          <StatCard
            title="Total Users"
            value={stats?.totalUsers.toLocaleString() || 0}
            footerLabel="All registered users"
            footerColor="text-gray-500"
            icon={<Users size={24} />}
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
          />
          <StatCard
            title="Total Revenue this Month"
            value={`₱${stats?.totalRevenueThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`}
            footerLabel="Revenue this Month"
            footerColor="text-gray-500"
            icon={<DollarSign size={24} />}
            iconBg="bg-gray-100"
            iconColor="text-gray-600"
          />
        </div>

        {/* Content Split: Listings & Activity */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

          {/* Recent Listings Table */}
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                <h2 className="font-bold text-lg text-gray-900">Recent Listings</h2>
                <Link href="/listings" className="text-sm text-[#C94B1E] font-medium hover:underline">
                  View All
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50/50 text-gray-400 text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-6 py-4">Property</th>
                      <th className="px-6 py-4">Host</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-sm">
                    {recentListings.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                          No recent listings found
                        </td>
                      </tr>
                    ) : (
                      recentListings.map((listing) => (
                        <tr
                          key={listing.id}
                          className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                          onClick={() => router.push(`/listings?listingId=${encodeURIComponent(listing.id)}`)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              router.push(`/listings?listingId=${encodeURIComponent(listing.id)}`);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          aria-label={`Open listing details for ${listing.title}`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-100 rounded-md flex-shrink-0 flex items-center justify-center text-gray-400">
                                <MapPin size={16} />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{listing.title}</p>
                                <p className="text-gray-500 text-xs">{listing.address}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-600">{listing.hostName}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                              listing.status === 'APPROVED'
                                ? 'bg-green-100 text-green-700'
                                : listing.status === 'PENDING'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {listing.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-500">
                            {new Date(listing.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                <h2 className="font-bold text-lg text-gray-900">Listings Map</h2>
                <span className="text-xs text-gray-500">{mappableListings.length} pinned locations</span>
              </div>
              <div className="h-[340px]">
                {!googleMapsApiKey ? (
                  <div className="h-full flex items-center justify-center text-sm text-gray-500 px-6 text-center">
                    Google Maps key is missing. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in admin .env.local.
                  </div>
                ) : mappableListings.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-gray-500 px-6 text-center">
                    No listing coordinates are available from the backend yet.
                  </div>
                ) : loadError ? (
                  <div className="h-full flex items-center justify-center text-sm text-red-600 px-6 text-center">
                    Failed to load Google Maps. Please verify the API key and allowed referrers.
                  </div>
                ) : !isMapLoaded ? (
                  <div className="h-full flex items-center justify-center text-sm text-gray-500 px-6 text-center">
                    Loading map...
                  </div>
                ) : (
                  <GoogleMap
                    mapContainerStyle={{ width: "100%", height: "100%" }}
                    center={mapCenter}
                    zoom={13}
                    onClick={() => setSelectedMapListing(null)}
                    options={{
                      streetViewControl: false,
                      mapTypeControl: false,
                      fullscreenControl: false,
                    }}
                  >
                    {mappableListings.map((listing) => (
                      <MarkerF
                        key={listing.id}
                        position={{ lat: listing.latitude, lng: listing.longitude }}
                        title={`${listing.title} - ${listing.address}`}
                        onClick={() => setSelectedMapListing(listing)}
                      />
                    ))}
                  </GoogleMap>
                )}
              </div>
            </div>

            {isClient && selectedMapListing && createPortal(
              <div className="fixed inset-0 z-[9999] m-0 flex items-center justify-center bg-black/55 p-4">
                <div className="w-full max-w-md rounded-xl bg-white shadow-xl border border-gray-100">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h3 className="text-base font-semibold text-gray-900">Listing Quick Info</h3>
                    <button
                      onClick={() => setSelectedMapListing(null)}
                      className="p-1 rounded-md text-gray-500 hover:bg-gray-100"
                      aria-label="Close listing info modal"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="px-5 py-4 space-y-2">
                    <p className="text-sm font-semibold text-gray-900">{selectedMapListing.title}</p>
                    <p className="text-sm text-gray-600">{selectedMapListing.address}</p>
                    <p className="text-xs text-gray-500">Host: {selectedMapListing.hostName}</p>
                    <p className="text-xs text-gray-500">Status: {selectedMapListing.status}</p>
                  </div>

                  <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-2">
                    <button
                      onClick={() => setSelectedMapListing(null)}
                      className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        router.push(`/listings?listingId=${selectedMapListing.id}`);
                        setSelectedMapListing(null);
                      }}
                      className="px-3 py-2 text-sm font-medium text-white bg-[#C94B1E] rounded-md hover:bg-[#A83A16]"
                    >
                      View Listing Details
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )}
          </div>

          {/* Recent Activity Timeline */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-fit">
            <h2 className="font-bold text-lg mb-6 text-gray-900">Recent Activity</h2>

            <div className="flex flex-col">
              {recentActivity.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No recent activity</p>
              ) : (
                recentActivity.map((activity) => (
                  <ActivityItem
                    key={activity.id}
                    user={activity.user}
                    action={activity.action}
                    time={formatTimeAgo(activity.time)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
    </div>
  );
}