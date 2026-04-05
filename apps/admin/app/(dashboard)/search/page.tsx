"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Users,
  MapPin,
  Car,
  CalendarClock,
  Activity,
  ArrowLeftRight,
  Loader2,
} from "lucide-react";
import api from "../../../src/lib/api";
import { Breadcrumb } from "../../../src/components/ui/breadcrumb";

// --- Types ---

type UserResult = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  roles?: string[];
};

type ListingResult = {
  id: string;
  title: string;
  address: string;
  status: string;
};

type DriverResult = {
  id: string;
  licenseNumber: string | null;
  user: {
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
};

type ReservationResult = {
  id: string;
  guestName: string;
  hostName: string;
  propertyTitle: string;
  status: string;
};

type SessionResult = {
  id: string;
  guestName: string;
  hostName: string;
  propertyTitle: string;
  status: string;
  sessionStartedAt: string | null;
  totalAmount: number;
};

type TopUpResult = {
  id: string;
  amount: string;
  referenceCode: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
};

type WithdrawResult = {
  id: string;
  amount: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
};

// --- API response shapes ---

type UsersResponse = { data: UserResult[]; meta: { total: number } };
type ListingsResponse = { data: ListingResult[]; pagination: { total: number } };
type DriversResponse = { drivers: DriverResult[]; pagination: { total: number } };
type ReservationsResponse = { reservations: ReservationResult[]; total: number };
type SessionsResponse = { reservations: SessionResult[]; total: number };

// --- Helpers ---

function getUserName(user: UserResult) {
  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  return fullName || user.email;
}

function getDriverName(driver: DriverResult) {
  const fullName = `${driver.user.firstName || ""} ${driver.user.lastName || ""}`.trim();
  return fullName || driver.user.email;
}

function getTxUserName(user: { firstName: string | null; lastName: string | null; email: string }) {
  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  return fullName || user.email;
}

function getListingRoute(listing: ListingResult) {
  const tab = listing.status === "PENDING" ? "pending" : "recent";
  return `/listings?tab=${tab}&listingId=${listing.id}`;
}

function matchesQuery(query: string, ...fields: (string | null | undefined)[]) {
  const q = query.toLowerCase();
  return fields.some((f) => f && f.toLowerCase().includes(q));
}

// --- Component ---

export default function GlobalSearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const query = (searchParams.get("q") || "").trim();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [users, setUsers] = useState<UserResult[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);

  const [listings, setListings] = useState<ListingResult[]>([]);
  const [listingsTotal, setListingsTotal] = useState(0);

  const [drivers, setDrivers] = useState<DriverResult[]>([]);
  const [driversTotal, setDriversTotal] = useState(0);

  const [reservations, setReservations] = useState<ReservationResult[]>([]);
  const [reservationsTotal, setReservationsTotal] = useState(0);

  const [sessions, setSessions] = useState<SessionResult[]>([]);
  const [sessionsTotal, setSessionsTotal] = useState(0);

  const [topUps, setTopUps] = useState<TopUpResult[]>([]);
  const [withdraws, setWithdraws] = useState<WithdrawResult[]>([]);

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!query) {
        setUsers([]); setUsersTotal(0);
        setListings([]); setListingsTotal(0);
        setDrivers([]); setDriversTotal(0);
        setReservations([]); setReservationsTotal(0);
        setSessions([]); setSessionsTotal(0);
        setTopUps([]);
        setWithdraws([]);
        setError(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const encoded = encodeURIComponent(query);

        const [
          usersRes,
          listingsRes,
          driversRes,
          reservationsRes,
          sessionsRes,
          topUpsRes,
          withdrawsRes,
        ] = await Promise.all([
          api.get<UsersResponse>(`/users?page=1&limit=5&search=${encoded}`),
          api.get<ListingsResponse>(`/hosts/admin/locations?page=1&limit=5&search=${encoded}`),
          api.get<DriversResponse>(`/drivers/admin/all?page=1&limit=5&search=${encoded}`),
          api.get<ReservationsResponse>(`/dashboard/reservations?page=1&limit=5&search=${encoded}`),
          api.get<SessionsResponse>(`/dashboard/reservations?page=1&limit=5&search=${encoded}&status=ACTIVE`),
          api.get<TopUpResult[]>(`/wallet/top-up/all`),
          api.get<WithdrawResult[]>(`/wallet/withdraw/all`),
        ]);

        setUsers(usersRes.data.data);
        setUsersTotal(usersRes.data.meta.total || 0);

        setListings(listingsRes.data.data);
        setListingsTotal(listingsRes.data.pagination.total || 0);

        setDrivers(driversRes.data.drivers);
        setDriversTotal(driversRes.data.pagination.total || 0);

        setReservations(reservationsRes.data.reservations);
        setReservationsTotal(reservationsRes.data.total || 0);

        setSessions(sessionsRes.data.reservations);
        setSessionsTotal(sessionsRes.data.total || 0);

        // Client-side filter for transactions since the endpoints don't support search
        const filteredTopUps = (topUpsRes.data || []).filter((t) =>
          matchesQuery(query, t.referenceCode, t.amount, t.user.email, t.user.firstName, t.user.lastName, t.id)
        ).slice(0, 5);
        setTopUps(filteredTopUps);

        const filteredWithdraws = (withdrawsRes.data || []).filter((w) =>
          matchesQuery(query, w.amount, w.user.email, w.user.firstName, w.user.lastName, w.id)
        ).slice(0, 5);
        setWithdraws(filteredWithdraws);

      } catch (err) {
        console.error("Global search failed:", err);
        setError("Failed to fetch search results");
      } finally {
        setLoading(false);
      }
    };

    fetchSearchResults();
  }, [query]);

  const totalResults = useMemo(
    () => usersTotal + listingsTotal + driversTotal + reservationsTotal + sessionsTotal + topUps.length + withdraws.length,
    [usersTotal, listingsTotal, driversTotal, reservationsTotal, sessionsTotal, topUps.length, withdraws.length]
  );

  return (
    <div className="bg-[#F9FAFB] min-h-full font-sans">
      <Breadcrumb items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Search Results" }]} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Search Results</h1>
        <p className="text-sm text-gray-500 mt-1">
          {query ? `Results for "${query}"` : "Type a keyword in the header search"}
        </p>
      </div>

      {!query ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
          <Search className="mx-auto mb-2 text-gray-300" size={28} />
          Start searching users, listings, drivers, reservations, sessions, transactions, and more.
        </div>
      ) : loading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
          <Loader2 className="mx-auto mb-2 animate-spin" size={26} />
          Loading search results...
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          {error}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-sm text-gray-600">
            Total matches: <span className="font-semibold text-gray-900">{totalResults}</span>
          </div>

          {/* Users */}
          <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-800 font-semibold">
                <Users size={16} /> Users
              </div>
              <button
                onClick={() => router.push(`/users?search=${encodeURIComponent(query)}`)}
                className="text-sm text-[#C94B1E] hover:underline"
              >
                View all ({usersTotal})
              </button>
            </div>
            <div className="p-4 space-y-3">
              {users.length === 0 ? (
                <p className="text-sm text-gray-500">No users found.</p>
              ) : (
                users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => router.push(`/users/${user.id}`)}
                    className="w-full text-left border border-gray-100 rounded-lg px-3 py-2 hover:bg-gray-50"
                  >
                    <p className="text-sm font-semibold text-gray-900">{getUserName(user)}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                    <p className="text-xs text-gray-400">ID: {user.id}</p>
                  </button>
                ))
              )}
            </div>
          </section>

          {/* Listings */}
          <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-800 font-semibold">
                <MapPin size={16} /> Listings
              </div>
              <button
                onClick={() =>
                  listingsTotal === 1 && listings[0]
                    ? router.push(getListingRoute(listings[0]))
                    : router.push(`/listings?search=${encodeURIComponent(query)}`)
                }
                className="text-sm text-[#C94B1E] hover:underline"
              >
                View all ({listingsTotal})
              </button>
            </div>
            <div className="p-4 space-y-3">
              {listings.length === 0 ? (
                <p className="text-sm text-gray-500">No listings found.</p>
              ) : (
                listings.map((listing) => (
                  <button
                    key={listing.id}
                    onClick={() => router.push(getListingRoute(listing))}
                    className="w-full text-left border border-gray-100 rounded-lg px-3 py-2 hover:bg-gray-50"
                  >
                    <p className="text-sm font-semibold text-gray-900">{listing.title}</p>
                    <p className="text-xs text-gray-500">{listing.address}</p>
                    <p className="text-xs text-gray-400">ID: {listing.id}</p>
                  </button>
                ))
              )}
            </div>
          </section>

          {/* Drivers */}
          <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-800 font-semibold">
                <Car size={16} /> Drivers
              </div>
              <button
                onClick={() => router.push(`/users?search=${encodeURIComponent(query)}`)}
                className="text-sm text-[#C94B1E] hover:underline"
              >
                View all ({driversTotal})
              </button>
            </div>
            <div className="p-4 space-y-3">
              {drivers.length === 0 ? (
                <p className="text-sm text-gray-500">No drivers found.</p>
              ) : (
                drivers.map((driver) => (
                  <button
                    key={driver.id}
                    onClick={() => router.push(`/users?search=${encodeURIComponent(query)}`)}
                    className="w-full text-left border border-gray-100 rounded-lg px-3 py-2 hover:bg-gray-50"
                  >
                    <p className="text-sm font-semibold text-gray-900">{getDriverName(driver)}</p>
                    <p className="text-xs text-gray-500">{driver.user.email}</p>
                    <p className="text-xs text-gray-400">
                      ID: {driver.id}
                      {driver.licenseNumber ? ` | License: ${driver.licenseNumber}` : ""}
                    </p>
                  </button>
                ))
              )}
            </div>
          </section>

          {/* Reservations */}
          <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-800 font-semibold">
                <CalendarClock size={16} /> Reservations
              </div>
              <button
                onClick={() => router.push(`/reservations?search=${encodeURIComponent(query)}`)}
                className="text-sm text-[#C94B1E] hover:underline"
              >
                View all ({reservationsTotal})
              </button>
            </div>
            <div className="p-4 space-y-3">
              {reservations.length === 0 ? (
                <p className="text-sm text-gray-500">No reservations found.</p>
              ) : (
                reservations.map((reservation) => (
                  <button
                    key={reservation.id}
                    onClick={() => router.push(`/reservations?reservationId=${reservation.id}`)}
                    className="w-full text-left border border-gray-100 rounded-lg px-3 py-2 hover:bg-gray-50"
                  >
                    <p className="text-sm font-semibold text-gray-900">{reservation.propertyTitle}</p>
                    <p className="text-xs text-gray-500">
                      Guest: {reservation.guestName} | Host: {reservation.hostName}
                    </p>
                    <p className="text-xs text-gray-400">ID: {reservation.id}</p>
                  </button>
                ))
              )}
            </div>
          </section>

          {/* Live Sessions */}
          <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-800 font-semibold">
                <Activity size={16} /> Live Sessions
              </div>
              <button
                onClick={() => router.push(`/sessions`)}
                className="text-sm text-[#C94B1E] hover:underline"
              >
                View all ({sessionsTotal})
              </button>
            </div>
            <div className="p-4 space-y-3">
              {sessions.length === 0 ? (
                <p className="text-sm text-gray-500">No active sessions found.</p>
              ) : (
                sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => router.push(`/sessions`)}
                    className="w-full text-left border border-gray-100 rounded-lg px-3 py-2 hover:bg-gray-50"
                  >
                    <p className="text-sm font-semibold text-gray-900">{session.propertyTitle}</p>
                    <p className="text-xs text-gray-500">
                      Guest: {session.guestName} | Host: {session.hostName}
                    </p>
                    <p className="text-xs text-gray-400">ID: {session.id}</p>
                  </button>
                ))
              )}
            </div>
          </section>

          {/* Transactions */}
          <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-800 font-semibold">
                <ArrowLeftRight size={16} /> Transactions
              </div>
              <button
                onClick={() => router.push(`/transactions`)}
                className="text-sm text-[#C94B1E] hover:underline"
              >
                View all ({topUps.length + withdraws.length})
              </button>
            </div>
            <div className="p-4 space-y-3">
              {topUps.length === 0 && withdraws.length === 0 ? (
                <p className="text-sm text-gray-500">No transactions found.</p>
              ) : (
                <>
                  {topUps.map((t) => (
                    <button
                      key={`topup-${t.id}`}
                      onClick={() => router.push(`/transactions?tab=topup&requestId=${t.id}`)}
                      className="w-full text-left border border-gray-100 rounded-lg px-3 py-2 hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900">{getTxUserName(t.user)}</p>
                        <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                          Top-Up
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        ₱{t.amount} · Ref: {t.referenceCode}
                      </p>
                      <p className="text-xs text-gray-400">ID: {t.id}</p>
                    </button>
                  ))}
                  {withdraws.map((w) => (
                    <button
                      key={`withdraw-${w.id}`}
                      onClick={() => router.push(`/transactions?tab=withdraw&requestId=${w.id}`)}
                      className="w-full text-left border border-gray-100 rounded-lg px-3 py-2 hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900">{getTxUserName(w.user)}</p>
                        <span className="text-xs font-medium text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full">
                          Withdraw
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">₱{w.amount}</p>
                      <p className="text-xs text-gray-400">ID: {w.id}</p>
                    </button>
                  ))}
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
