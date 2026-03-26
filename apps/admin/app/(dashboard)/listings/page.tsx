"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Image as ImageIcon,
  User,
  CheckCircle,
  MapPin,
  Home,
  Car,
  FileCheck,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Clock,
  XCircle,
  History,
  UserCheck,
  CreditCard,
} from "lucide-react";
import { GoogleMap, MarkerF, useJsApiLoader } from "@react-google-maps/api";
import api from "../../../src/lib/api";
import Image from "next/image";

type TabType = "pending" | "recent" | "recentDrivers";

// --- Types (Aligned with Prisma Schema & API Response) ---
type ParkingLocationImage = {
  id: string;
  imageUrl: string;
  isPrimary: boolean;
};

type UserModel = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phoneNumber?: string | null;
  profilePicture?: string | null;
  userRoles?: Array<{
    status: "PENDING" | "VERIFIED" | "REJECTED" | "SUSPENDED";
    role?: {
      name: string;
    } | null;
  }>;
};

type Host = {
  id: string;
  user: UserModel;
};

type ParkingLocation = {
  id: string;
  title: string;
  description: string | null;
  address: string;
  latitude: number;
  longitude: number;
  basePricePerHour: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  totalSlots: number | null;
  availableSlots: number | null;
  isMultiLevel: boolean;
  numberOfLevels: number | null;
  proofOfResidenceUrl: string | null;
  createdAt: string;
  host: Host;
  images: ParkingLocationImage[];
  _count?: {
    parkingSpaces: number;
  };
};

type RawParkingLocation = Omit<ParkingLocation, "latitude" | "longitude"> & {
  latitude?: number | string | null;
  longitude?: number | string | null;
  lat?: number | string | null;
  lng?: number | string | null;
};

interface ListingsResponse {
  data: RawParkingLocation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Driver types
type DriverVehicle = {
  id: string;
  plateNumber: string | null;
  vehicleType: string | null;
  isActive: boolean;
};

type DriverUserRole = {
  status: "PENDING" | "VERIFIED" | "REJECTED" | "SUSPENDED";
  assignedAt: string;
};

type DriverUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  profilePicture: string | null;
  userRoles: DriverUserRole[];
};

type Driver = {
  id: string;
  licenseNumber: string | null;
  licenseImageUrl: string | null;
  createdAt: string;
  user: DriverUser;
  vehicles: DriverVehicle[];
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED" | "SUSPENDED";
  _count?: {
    vehicles: number;
    reservations: number;
  };
};

interface DriversResponse {
  drivers: Driver[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function PendingListings() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const listingId = searchParams.get("listingId");
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const { isLoaded: isMapLoaded, loadError } = useJsApiLoader({
    id: "parking-admin-google-map-script",
    googleMapsApiKey,
  });

  // State
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [listings, setListings] = useState<ParkingLocation[]>([]);
  const [recentListings, setRecentListings] = useState<ParkingLocation[]>([]);
  const [recentDrivers, setRecentDrivers] = useState<Driver[]>([]);
  const [selectedListing, setSelectedListing] = useState<ParkingLocation | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentLoading, setRecentLoading] = useState(false);
  const [driversLoading, setDriversLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [driversError, setDriversError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [recentPage, setRecentPage] = useState(1);
  const [recentTotalPages, setRecentTotalPages] = useState(1);
  const [recentTotal, setRecentTotal] = useState(0);
  const [driversPage, setDriversPage] = useState(1);
  const [driversTotalPages, setDriversTotalPages] = useState(1);
  const [driversTotal, setDriversTotal] = useState(0);

  const toCoordinate = (value: number | string | null | undefined) => {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const normalizeLocation = (location: RawParkingLocation): ParkingLocation => {
    const latitude =
      toCoordinate(location.latitude) ?? toCoordinate(location.lat) ?? 0;
    const longitude =
      toCoordinate(location.longitude) ?? toCoordinate(location.lng) ?? 0;

    return {
      ...location,
      latitude,
      longitude,
    };
  };

  // Fetch pending listings from API
  const fetchListings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get<ListingsResponse>(
        `/hosts/admin/locations?status=PENDING&page=${page}&limit=10`
      );

      setListings(response.data.data.map(normalizeLocation));
      setTotalPages(response.data.pagination.totalPages);
      setTotal(response.data.pagination.total);
    } catch (err) {
      console.error("Error fetching listings:", err);
      setError("Failed to load pending listings");
    } finally {
      setLoading(false);
    }
  }, [page]);

  // Fetch recently verified/rejected listings from API
  const fetchRecentListings = useCallback(async () => {
    try {
      setRecentLoading(true);
      setRecentError(null);

      // Fetch both APPROVED and REJECTED listings
      const [approvedResponse, rejectedResponse] = await Promise.all([
        api.get<ListingsResponse>(
          `/hosts/admin/locations?status=APPROVED&page=${recentPage}&limit=5`
        ),
        api.get<ListingsResponse>(
          `/hosts/admin/locations?status=REJECTED&page=${recentPage}&limit=5`
        ),
      ]);

      // Combine and sort by most recent
      const combinedListings = [
        ...approvedResponse.data.data,
        ...rejectedResponse.data.data,
      ]
        .map(normalizeLocation)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setRecentListings(combinedListings);
      setRecentTotalPages(Math.max(
        approvedResponse.data.pagination.totalPages,
        rejectedResponse.data.pagination.totalPages
      ));
      setRecentTotal(
        approvedResponse.data.pagination.total + rejectedResponse.data.pagination.total
      );
    } catch (err) {
      console.error("Error fetching recent listings:", err);
      setRecentError("Failed to load recently verified/rejected listings");
    } finally {
      setRecentLoading(false);
    }
  }, [recentPage]);

  // Fetch recently verified/rejected drivers from API
  const fetchRecentDrivers = useCallback(async () => {
    try {
      setDriversLoading(true);
      setDriversError(null);

      // Fetch both VERIFIED and REJECTED drivers
      const [verifiedResponse, rejectedResponse] = await Promise.all([
        api.get<DriversResponse>(
          `/drivers/admin/all?status=VERIFIED&page=${driversPage}&limit=5`
        ),
        api.get<DriversResponse>(
          `/drivers/admin/all?status=REJECTED&page=${driversPage}&limit=5`
        ),
      ]);

      // Combine and sort by most recent
      const combinedDrivers = [
        ...verifiedResponse.data.drivers,
        ...rejectedResponse.data.drivers,
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setRecentDrivers(combinedDrivers);
      setDriversTotalPages(Math.max(
        verifiedResponse.data.pagination.totalPages,
        rejectedResponse.data.pagination.totalPages
      ));
      setDriversTotal(
        verifiedResponse.data.pagination.total + rejectedResponse.data.pagination.total
      );
    } catch (err) {
      console.error("Error fetching recent drivers:", err);
      setDriversError("Failed to load recently verified/rejected driver applications");
    } finally {
      setDriversLoading(false);
    }
  }, [driversPage]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  useEffect(() => {
    if (tabParam === "pending" || tabParam === "recent" || tabParam === "recentDrivers") {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    const fetchListingFromQuery = async () => {
      if (!listingId) {
        return;
      }

      try {
        const encodedListingId = encodeURIComponent(listingId);
        const [pendingRes, approvedRes, rejectedRes, fallbackRes] = await Promise.all([
          api.get<ListingsResponse>(`/hosts/admin/locations?status=PENDING&page=1&limit=1&search=${encodedListingId}`),
          api.get<ListingsResponse>(`/hosts/admin/locations?status=APPROVED&page=1&limit=1&search=${encodedListingId}`),
          api.get<ListingsResponse>(`/hosts/admin/locations?status=REJECTED&page=1&limit=1&search=${encodedListingId}`),
          api.get<ListingsResponse>(`/hosts/admin/locations?page=1&limit=1&search=${encodedListingId}`),
        ]);

        const matchedListing =
          pendingRes.data.data[0] ||
          approvedRes.data.data[0] ||
          rejectedRes.data.data[0] ||
          fallbackRes.data.data[0];

        if (matchedListing) {
          const normalizedListing = normalizeLocation(matchedListing);
          setSelectedListing(normalizedListing);
          setActiveTab(normalizedListing.status === "PENDING" ? "pending" : "recent");
        }
      } catch (err) {
        console.error("Error loading listing from query:", err);
      }
    };

    fetchListingFromQuery();
  }, [listingId]);

  useEffect(() => {
    if (activeTab === "recent") {
      fetchRecentListings();
    }

    if (activeTab === "recentDrivers") {
      fetchRecentDrivers();
    }
  }, [activeTab, fetchRecentListings, fetchRecentDrivers]);

  // Approve listing
  const handleApprove = async (locationId: string) => {
    try {
      setActionLoading(true);
      await api.put(`/hosts/admin/locations/${locationId}/status`, {
        status: "APPROVED",
        adminNotes: "Approved by admin",
      });

      // Remove from list and go back
      setListings((prev) => prev.filter((l) => l.id !== locationId));
      setSelectedListing(null);
      setTotal((prev) => prev - 1);
    } catch (err) {
      console.error("Error approving listing:", err);
      alert("Failed to approve listing. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  // Reject listing
  const handleReject = async (locationId: string) => {
    try {
      setActionLoading(true);
      await api.put(`/hosts/admin/locations/${locationId}/status`, {
        status: "REJECTED",
        adminNotes: rejectionReason || "Rejected by admin",
      });

      // Remove from list and go back
      setListings((prev) => prev.filter((l) => l.id !== locationId));
      setSelectedListing(null);
      setRejectionReason("");
      setTotal((prev) => prev - 1);
    } catch (err) {
      console.error("Error rejecting listing:", err);
      alert("Failed to reject listing. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  // Get primary image URL
  const getPrimaryImage = (images: ParkingLocationImage[]) => {
    const primary = images.find((img) => img.isPrimary);
    return primary?.imageUrl || images[0]?.imageUrl || null;
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // --- 1. DETAILED VIEW RENDER ---
  if (selectedListing) {
    const listingLatitude = toCoordinate(selectedListing.latitude);
    const listingLongitude = toCoordinate(selectedListing.longitude);
    const hasValidCoordinates =
      listingLatitude !== null && listingLongitude !== null;
    const hostVerificationStatus =
      selectedListing.host.user.userRoles?.find((userRole) => userRole.role?.name === "HOST")
        ?.status ?? selectedListing.host.user.userRoles?.[0]?.status ?? "PENDING";

    const isPending = selectedListing.status === "PENDING";
    const statusConfig = {
      PENDING: { bg: "bg-yellow-100", text: "text-yellow-800", icon: Clock },
      APPROVED: { bg: "bg-green-100", text: "text-green-800", icon: CheckCircle },
      REJECTED: { bg: "bg-red-100", text: "text-red-800", icon: XCircle },
    };
    const hostVerificationConfig = {
      PENDING: { bg: "bg-yellow-100", text: "text-yellow-800", icon: Clock },
      VERIFIED: { bg: "bg-green-100", text: "text-green-800", icon: CheckCircle },
      REJECTED: { bg: "bg-red-100", text: "text-red-800", icon: XCircle },
      SUSPENDED: { bg: "bg-orange-100", text: "text-orange-800", icon: AlertCircle },
    };
    const statusStyle = statusConfig[selectedListing.status];
    const hostVerificationStyle = hostVerificationConfig[hostVerificationStatus];
    const StatusIcon = statusStyle.icon;
    const HostVerificationIcon = hostVerificationStyle.icon;

    return (
      <div className="bg-[#F8F9FA] min-h-screen p-6 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedListing(null)}
              className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-100 transition"
              title="Back to Listings"
              disabled={actionLoading}
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              Listing Details{isPending ? " - Pending Approval" : ""}: {selectedListing.title}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
              <StatusIcon className="w-3 h-3" />
              {selectedListing.status}
            </span>
            <button
              onClick={() => setSelectedListing(null)}
              className="text-sm text-gray-600 hover:text-gray-900"
              disabled={actionLoading}
            >
              Back to List View
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-1 space-y-6">
            {/* Host Information */}
            <Card className="shadow-sm border-gray-100">
              <CardHeader>
                <CardTitle>Host Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start space-x-4 mb-4">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden border border-gray-200">
                    {selectedListing.host.user.profilePicture ? (
                      <Image
                        src={selectedListing.host.user.profilePicture}
                        alt="Host"
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <User className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {selectedListing.host.user.firstName} {selectedListing.host.user.lastName}
                    </h3>
                    <p className="text-sm text-gray-600">{selectedListing.host.user.phoneNumber || "No Phone"}</p>
                    <p className="text-sm text-gray-600">{selectedListing.host.user.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">Verification Status:</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${hostVerificationStyle.bg} ${hostVerificationStyle.text}`}
                  >
                    <HostVerificationIcon className="w-3 h-3" />
                    {hostVerificationStatus}
                  </span>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm font-medium text-gray-700 mb-2">Proof of Residence</p>
                  {selectedListing.proofOfResidenceUrl ? (
                    <a
                      href={selectedListing.proofOfResidenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                      <FileCheck className="w-4 h-4" />
                      View Document
                    </a>
                  ) : (
                    <p className="text-sm text-gray-500">No proof of residence uploaded.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Property Details */}
            <Card className="shadow-sm border-gray-100">
              <CardHeader>
                <CardTitle>Property Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Title</p>
                    <p className="text-sm text-gray-900">{selectedListing.title}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Description</p>
                    <p className="text-sm text-gray-900">{selectedListing.description || "No description"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Address</p>
                    <p className="text-sm text-gray-900">{selectedListing.address}</p>
                  </div>

                  <div className="w-full h-48 bg-slate-50 rounded-lg overflow-hidden border border-gray-200">
                    {!googleMapsApiKey ? (
                      <div className="h-full flex items-center justify-center text-center px-4">
                        <div>
                          <MapPin className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm text-gray-500">Google Maps key is missing</p>
                        </div>
                      </div>
                    ) : loadError ? (
                      <div className="h-full flex items-center justify-center text-center px-4">
                        <div>
                          <MapPin className="w-10 h-10 mx-auto mb-2 text-red-400" />
                          <p className="text-sm text-red-600">Failed to load Google Maps</p>
                        </div>
                      </div>
                    ) : !isMapLoaded ? (
                      <div className="h-full flex items-center justify-center text-center px-4">
                        <div>
                          <Loader2 className="w-6 h-6 mx-auto mb-2 text-gray-500 animate-spin" />
                          <p className="text-sm text-gray-500">Loading map...</p>
                        </div>
                      </div>
                    ) : !hasValidCoordinates ? (
                      <div className="h-full flex items-center justify-center text-center px-4">
                        <div>
                          <MapPin className="w-10 h-10 mx-auto mb-2 text-amber-500" />
                          <p className="text-sm text-amber-700">Location coordinates are unavailable from API</p>
                        </div>
                      </div>
                    ) : (
                      <GoogleMap
                        mapContainerStyle={{ width: "100%", height: "100%" }}
                        center={{
                          lat: listingLatitude,
                          lng: listingLongitude,
                        }}
                        zoom={16}
                        options={{
                          streetViewControl: false,
                          mapTypeControl: false,
                          fullscreenControl: false,
                        }}
                      >
                        <MarkerF
                          position={{
                            lat: listingLatitude,
                            lng: listingLongitude,
                          }}
                          title={`${selectedListing.title} - ${selectedListing.address}`}
                        />
                      </GoogleMap>
                    )}
                  </div>

                  {hasValidCoordinates && (
                    <p className="text-xs text-gray-400 -mt-2">
                      {listingLatitude.toFixed(4)}, {listingLongitude.toFixed(4)}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Capacity</p>
                      <p className="text-sm text-gray-900">{selectedListing.totalSlots || 0} Vehicle Slot(s)</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Price/Hour</p>
                      <p className="text-sm text-gray-900">{formatCurrency(selectedListing.basePricePerHour)}</p>
                    </div>
                  </div>
                  {selectedListing.isMultiLevel && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Multi-Level</p>
                      <p className="text-sm text-gray-900">{selectedListing.numberOfLevels} Levels</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Property Images */}
            <Card className="shadow-sm border-gray-100">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Property Images ({selectedListing.images.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {selectedListing.images.length > 0 ? (
                    selectedListing.images.map((img, index) => (
                      <div
                        key={img.id}
                        className="aspect-video bg-slate-50 rounded-lg overflow-hidden border border-gray-200 relative"
                      >
                        <Image
                          src={img.imageUrl}
                          alt={`Property ${index + 1}`}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover"
                          unoptimized
                        />
                        {img.isPrimary && (
                          <span className="absolute top-2 left-2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded">
                            Primary
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="aspect-video bg-slate-50 rounded-lg overflow-hidden flex items-center justify-center border border-gray-200">
                        <Home className="w-12 h-12 text-gray-400" />
                      </div>
                      <div className="aspect-video bg-slate-50 rounded-lg overflow-hidden flex items-center justify-center border border-gray-200">
                        <Car className="w-12 h-12 text-gray-400" />
                      </div>
                      <div className="aspect-video bg-slate-50 rounded-lg overflow-hidden flex items-center justify-center border border-gray-200">
                        <FileCheck className="w-12 h-12 text-gray-400" />
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Decision Action - Only for pending listings */}
            {isPending && (
              <Card className="shadow-sm border-gray-100">
                <CardHeader>
                  <CardTitle>Decision Action</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rejection Reason (Optional)
                      </label>
                      <textarea
                        rows={4}
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter reason for rejection..."
                        disabled={actionLoading}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        onClick={() => handleApprove(selectedListing.id)}
                        disabled={actionLoading}
                        className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-base font-semibold"
                      >
                        {actionLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        ) : (
                          <CheckCircle className="w-5 h-5 mr-2" />
                        )}
                        Approve Listing
                      </Button>
                      <Button
                        onClick={() => handleReject(selectedListing.id)}
                        disabled={actionLoading}
                        variant="destructive"
                        className="w-full h-12 text-base font-semibold"
                      >
                        {actionLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        ) : (
                          <XCircle className="w-5 h-5 mr-2" />
                        )}
                        Reject Listing
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Status Summary - For non-pending listings */}
            {!isPending && (
              <Card className="shadow-sm border-gray-100">
                <CardHeader>
                  <CardTitle>Listing Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50">
                    <div className={`p-3 rounded-full ${statusStyle.bg}`}>
                      <StatusIcon className={`w-6 h-6 ${statusStyle.text}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {selectedListing.status === "APPROVED" ? "Listing Approved" : "Listing Rejected"}
                      </p>
                      <p className="text-sm text-gray-600">
                        This listing has been {selectedListing.status.toLowerCase()} by an admin.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- 1.5 DRIVER DETAILED VIEW RENDER ---
  if (selectedDriver) {
    const driverStatusConfig = {
      PENDING: { bg: "bg-yellow-100", text: "text-yellow-800", icon: Clock },
      VERIFIED: { bg: "bg-green-100", text: "text-green-800", icon: CheckCircle },
      REJECTED: { bg: "bg-red-100", text: "text-red-800", icon: XCircle },
      SUSPENDED: { bg: "bg-orange-100", text: "text-orange-800", icon: AlertCircle },
    };
    const driverStatusStyle = driverStatusConfig[selectedDriver.verificationStatus];
    const DriverStatusIcon = driverStatusStyle.icon;

    return (
      <div className="bg-[#F8F9FA] min-h-screen p-6 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedDriver(null)}
              className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-100 transition"
              title="Back to Driver Applications"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              Driver Application Details: {selectedDriver.user.firstName} {selectedDriver.user.lastName}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${driverStatusStyle.bg} ${driverStatusStyle.text}`}>
              <DriverStatusIcon className="w-3 h-3" />
              {selectedDriver.verificationStatus}
            </span>
            <button
              onClick={() => setSelectedDriver(null)}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Back to List View
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-1 space-y-6">
            {/* Driver Information */}
            <Card className="shadow-sm border-gray-100">
              <CardHeader>
                <CardTitle>Driver Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start space-x-4 mb-4">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden border border-gray-200">
                    {selectedDriver.user.profilePicture ? (
                      <Image
                        src={selectedDriver.user.profilePicture}
                        alt="Driver"
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <User className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {selectedDriver.user.firstName} {selectedDriver.user.lastName}
                    </h3>
                    <p className="text-sm text-gray-600">{selectedDriver.user.phoneNumber || "No Phone"}</p>
                    <p className="text-sm text-gray-600">{selectedDriver.user.email}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">License Number:</span>
                    <span className="text-sm text-gray-900">{selectedDriver.licenseNumber || "Not provided"}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">Total Vehicles:</span>
                    <span className="text-sm text-gray-900">{selectedDriver._count?.vehicles || 0}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">Total Reservations:</span>
                    <span className="text-sm text-gray-900">{selectedDriver._count?.reservations || 0}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">Applied At:</span>
                    <span className="text-sm text-gray-900">
                      {new Date(selectedDriver.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Vehicles */}
            <Card className="shadow-sm border-gray-100">
              <CardHeader>
                <CardTitle>Registered Vehicles ({selectedDriver.vehicles.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDriver.vehicles.length > 0 ? (
                  <div className="space-y-3">
                    {selectedDriver.vehicles.map((vehicle) => (
                      <div
                        key={vehicle.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <Car className="w-5 h-5 text-gray-500" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {vehicle.plateNumber || "No Plate Number"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {vehicle.vehicleType || "Unknown Type"}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            vehicle.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {vehicle.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No vehicles registered</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* License Image */}
            <Card className="shadow-sm border-gray-100">
              <CardHeader>
                <CardTitle>Driver&apos;s License</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-slate-50 rounded-lg overflow-hidden border border-gray-200 relative max-w-2xl">
                  {selectedDriver.licenseImageUrl ? (
                    <Image
                      src={selectedDriver.licenseImageUrl}
                      alt="Driver License"
                      fill
                      sizes="(max-width: 768px) 100vw, 66vw"
                      className="object-contain"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <CreditCard className="w-16 h-16 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">No license image uploaded</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Application Status */}
            <Card className="shadow-sm border-gray-100">
              <CardHeader>
                <CardTitle>Application Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50">
                  <div className={`p-3 rounded-full ${driverStatusStyle.bg}`}>
                    <DriverStatusIcon className={`w-6 h-6 ${driverStatusStyle.text}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {selectedDriver.verificationStatus === "VERIFIED"
                        ? "Application Verified"
                        : selectedDriver.verificationStatus === "REJECTED"
                        ? "Application Rejected"
                        : selectedDriver.verificationStatus === "SUSPENDED"
                        ? "Application Suspended"
                        : "Application Pending"}
                    </p>
                    <p className="text-sm text-gray-600">
                      This driver application has been {selectedDriver.verificationStatus.toLowerCase()}.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // --- 2. MAIN LIST VIEW RENDER ---
  return (
    <div className="bg-[#F8F9FA] min-h-screen p-8 font-sans">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1a202c]">
          Parking Location Listings
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "pending"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Pending Approval
            {total > 0 && (
              <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                {total}
              </span>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab("recent")}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "recent"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Recently Verified/Rejected Listings
            {recentTotal > 0 && (
              <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                {recentTotal}
              </span>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab("recentDrivers")}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "recentDrivers"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            Recently Verified/Rejected Drivers
            {driversTotal > 0 && (
              <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                {driversTotal}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Pending Tab Content */}
      {activeTab === "pending" && (
        <>
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm text-gray-600">
              {total} pending listing{total !== 1 ? "s" : ""}
            </span>
            <Button
              onClick={fetchListings}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
            </Button>
          </div>

          {/* Loading state */}
          {loading && listings.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
              <p className="text-gray-600">Loading pending listings...</p>
            </div>
          )}

          {/* Error state */}
          {error && listings.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-red-500">
              <AlertCircle className="w-8 h-8 mb-4" />
              <p>{error}</p>
              <Button onClick={fetchListings} variant="outline" className="mt-4">
                Retry
              </Button>
            </div>
          )}

          {/* Empty state */}
          {listings.length === 0 && !loading && !error && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">All Caught Up!</h2>
              <p className="text-gray-600">No pending listings to review at this time.</p>
            </div>
          )}

          {/* Listing Cards Wrapper */}
          <div className="flex flex-col gap-4 max-w-5xl">
            {listings.map((listing) => {
              const primaryImage = getPrimaryImage(listing.images);

              return (
                <div
                  key={listing.id}
                  onClick={() => setSelectedListing(listing)}
                  className="w-full bg-white rounded-xl border border-gray-100 flex items-center p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                >
                  {/* Host Profile Picture */}
                  <div className="flex flex-col items-center mr-6">
                    <div className="w-14 h-14 bg-slate-50 border border-gray-100 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                      {listing.host.user.profilePicture ? (
                        <Image
                          src={listing.host.user.profilePicture}
                          alt="Host"
                          width={56}
                          height={56}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <Users className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Host & Location Details */}
                  <div className="flex-1 flex flex-col justify-center gap-1 overflow-hidden">
                    <h2 className="text-lg font-bold text-gray-900 truncate">
                      {listing.host.user.firstName} {listing.host.user.lastName}
                    </h2>
                    <p className="text-sm font-medium text-gray-700 truncate">{listing.title}</p>
                    <p className="text-sm text-gray-500 truncate max-w-[500px]">
                      {listing.address}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                      <span className="truncate">{listing.host.user.phoneNumber || "No Phone Number"}</span>
                      <span className="truncate">{listing.host.user.email}</span>
                    </div>
                  </div>

                  {/* Picture of the Property */}
                  <div className="w-[120px] h-[75px] bg-slate-50 rounded-lg flex items-center justify-center flex-col shrink-0 ml-4 border border-gray-100 overflow-hidden">
                    {primaryImage ? (
                      <Image
                        src={primaryImage}
                        alt={listing.title}
                        width={120}
                        height={75}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <>
                        <ImageIcon className="w-6 h-6 text-gray-400 mb-1" />
                        <span className="text-[10px] text-gray-500 text-center px-2">
                          Property Image
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Recent Tab Content */}
      {activeTab === "recent" && (
        <>
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm text-gray-600">
              {recentTotal} recently verified/rejected listing{recentTotal !== 1 ? "s" : ""}
            </span>
            <Button
              onClick={fetchRecentListings}
              variant="outline"
              size="sm"
              disabled={recentLoading}
            >
              {recentLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
            </Button>
          </div>

          {/* Loading state */}
          {recentLoading && recentListings.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
              <p className="text-gray-600">Loading recent listings...</p>
            </div>
          )}

          {/* Error state */}
          {recentError && recentListings.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-red-500">
              <AlertCircle className="w-8 h-8 mb-4" />
              <p>{recentError}</p>
              <Button onClick={fetchRecentListings} variant="outline" className="mt-4">
                Retry
              </Button>
            </div>
          )}

          {/* Empty state */}
          {recentListings.length === 0 && !recentLoading && !recentError && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <History className="w-16 h-16 text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No Recent Activity</h2>
              <p className="text-gray-600">No recently verified or rejected listings found.</p>
            </div>
          )}

          {/* Recent Listing Cards Wrapper */}
          <div className="flex flex-col gap-4 max-w-5xl">
            {recentListings.map((listing) => {
              const primaryImage = getPrimaryImage(listing.images);

              return (
                <div
                  key={listing.id}
                  onClick={() => setSelectedListing(listing)}
                  className="w-full bg-white rounded-xl border border-gray-100 flex items-center p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                >
                  {/* Host Profile Picture */}
                  <div className="flex flex-col items-center mr-6">
                    <div className="w-14 h-14 bg-slate-50 border border-gray-100 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                      {listing.host.user.profilePicture ? (
                        <Image
                          src={listing.host.user.profilePicture}
                          alt="Host"
                          width={56}
                          height={56}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <Users className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Host & Location Details */}
                  <div className="flex-1 flex flex-col justify-center gap-1 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-gray-900 truncate">
                        {listing.host.user.firstName} {listing.host.user.lastName}
                      </h2>
                      {/* Status Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          listing.status === "APPROVED"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {listing.status === "APPROVED" ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        {listing.status}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-700 truncate">{listing.title}</p>
                    <p className="text-sm text-gray-500 truncate max-w-[500px]">
                      {listing.address}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                      <span className="truncate">{listing.host.user.phoneNumber || "No Phone Number"}</span>
                      <span className="truncate">{listing.host.user.email}</span>
                    </div>
                  </div>

                  {/* Picture of the Property */}
                  <div className="w-[120px] h-[75px] bg-slate-50 rounded-lg flex items-center justify-center flex-col shrink-0 ml-4 border border-gray-100 overflow-hidden">
                    {primaryImage ? (
                      <Image
                        src={primaryImage}
                        alt={listing.title}
                        width={120}
                        height={75}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <>
                        <ImageIcon className="w-6 h-6 text-gray-400 mb-1" />
                        <span className="text-[10px] text-gray-500 text-center px-2">
                          Property Image
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent Pagination */}
          {recentTotalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRecentPage((p) => Math.max(1, p - 1))}
                disabled={recentPage <= 1 || recentLoading}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {recentPage} of {recentTotalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRecentPage((p) => Math.min(recentTotalPages, p + 1))}
                disabled={recentPage >= recentTotalPages || recentLoading}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Recent Drivers Tab Content */}
      {activeTab === "recentDrivers" && (
        <>
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm text-gray-600">
              {driversTotal} recently verified/rejected driver application{driversTotal !== 1 ? "s" : ""}
            </span>
            <Button
              onClick={fetchRecentDrivers}
              variant="outline"
              size="sm"
              disabled={driversLoading}
            >
              {driversLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
            </Button>
          </div>

          {/* Loading state */}
          {driversLoading && recentDrivers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
              <p className="text-gray-600">Loading recent driver applications...</p>
            </div>
          )}

          {/* Error state */}
          {driversError && recentDrivers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-red-500">
              <AlertCircle className="w-8 h-8 mb-4" />
              <p>{driversError}</p>
              <Button onClick={fetchRecentDrivers} variant="outline" className="mt-4">
                Retry
              </Button>
            </div>
          )}

          {/* Empty state */}
          {recentDrivers.length === 0 && !driversLoading && !driversError && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <UserCheck className="w-16 h-16 text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No Recent Activity</h2>
              <p className="text-gray-600">No recently verified or rejected driver applications found.</p>
            </div>
          )}

          {/* Recent Drivers Cards Wrapper */}
          <div className="flex flex-col gap-4 max-w-5xl">
            {recentDrivers.map((driver) => (
              <div
                key={driver.id}
                onClick={() => setSelectedDriver(driver)}
                className="w-full bg-white rounded-xl border border-gray-100 flex items-center p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              >
                {/* Driver Profile Picture */}
                <div className="flex flex-col items-center mr-6">
                  <div className="w-14 h-14 bg-slate-50 border border-gray-100 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                    {driver.user.profilePicture ? (
                      <Image
                        src={driver.user.profilePicture}
                        alt="Driver"
                        width={56}
                        height={56}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <User className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Driver Details */}
                <div className="flex-1 flex flex-col justify-center gap-1 overflow-hidden">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-gray-900 truncate">
                      {driver.user.firstName} {driver.user.lastName}
                    </h2>
                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        driver.verificationStatus === "VERIFIED"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {driver.verificationStatus === "VERIFIED" ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      {driver.verificationStatus}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-700 truncate">
                    License: {driver.licenseNumber || "Not provided"}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                    <span className="truncate">{driver.user.phoneNumber || "No Phone Number"}</span>
                    <span className="truncate">{driver.user.email}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Car className="w-3 h-3" />
                      {driver._count?.vehicles || 0} vehicle{(driver._count?.vehicles || 0) !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <CreditCard className="w-3 h-3" />
                      {driver._count?.reservations || 0} reservation{(driver._count?.reservations || 0) !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {/* License Image */}
                <div className="w-[120px] h-[75px] bg-slate-50 rounded-lg flex items-center justify-center flex-col shrink-0 ml-4 border border-gray-100 overflow-hidden">
                  {driver.licenseImageUrl ? (
                    <Image
                      src={driver.licenseImageUrl}
                      alt="License"
                      width={120}
                      height={75}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <>
                      <CreditCard className="w-6 h-6 text-gray-400 mb-1" />
                      <span className="text-[10px] text-gray-500 text-center px-2">
                        No License Image
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Drivers Pagination */}
          {driversTotalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDriversPage((p) => Math.max(1, p - 1))}
                disabled={driversPage <= 1 || driversLoading}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {driversPage} of {driversTotalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDriversPage((p) => Math.min(driversTotalPages, p + 1))}
                disabled={driversPage >= driversTotalPages || driversLoading}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}