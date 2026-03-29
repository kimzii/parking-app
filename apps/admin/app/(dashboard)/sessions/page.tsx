"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Activity,
  Clock,
  MapPin,
  Car,
  Eye,
  Loader2,
  RefreshCw,
  Timer,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import api from "../../../src/lib/api";
import Image from "next/image";

// --- Types ---
type RawSession = {
  id: string;
  guestName?: string | null;
  guestProfilePicture?: string | null;
  hostName?: string | null;
  propertyTitle?: string | null;
  status?: string | null;
  sessionStartedAt?: string | null;
  arrivalDeadline?: string | null;
  totalAmount?: number | string | null;
};

interface ActiveSession {
  id: string;
  guestName: string;
  guestProfilePicture: string | null;
  hostName: string;
  propertyTitle: string;
  status: "ACTIVE" | "CONFIRMED";
  sessionStartedAt: string | null;
  arrivalDeadline: string | null;
  totalAmount: number;
}

interface SessionDetails {
  id: string;
  status: string;
  createdAt: string;
  arrivalDeadline: string | null;
  sessionStartedAt: string | null;
  sessionEndedAt: string | null;
  totalAmount: number;
  guest: { name: string; email: string; phone: string | null };
  host: { name: string; email: string; phone: string | null };
  property: { title: string; address: string; slotNumber: number };
}

// --- Live elapsed timer (updates every second) ---
function ElapsedTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    const update = () => {
      const diffMs = Date.now() - new Date(startedAt).getTime();
      const hours = Math.floor(diffMs / 3600000);
      const minutes = Math.floor((diffMs % 3600000) / 60000);
      const seconds = Math.floor((diffMs % 60000) / 1000);
      if (hours > 0) {
        setElapsed(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setElapsed(`${minutes}m ${seconds}s`);
      }
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  return <span className="font-mono font-semibold tabular-nums">{elapsed}</span>;
}

// --- Countdown to arrival deadline ---
function ArrivalCountdown({ deadline }: { deadline: string }) {
  const [remaining, setRemaining] = useState("");
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const update = () => {
      const diffMs = new Date(deadline).getTime() - Date.now();
      if (diffMs <= 0) {
        setExpired(true);
        setRemaining("Overdue");
        return;
      }
      const minutes = Math.floor(diffMs / 60000);
      const seconds = Math.floor((diffMs % 60000) / 1000);
      setRemaining(`${minutes}m ${seconds}s`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  return (
    <span className={`font-mono font-semibold tabular-nums ${expired ? "text-red-500" : "text-yellow-600"}`}>
      {remaining}
    </span>
  );
}

// --- Helpers ---
function parseAmount(value: number | string | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeSession(raw: RawSession): ActiveSession {
  return {
    id: raw.id,
    guestName: raw.guestName || "Unknown Guest",
    guestProfilePicture: raw.guestProfilePicture || null,
    hostName: raw.hostName || "Unknown Host",
    propertyTitle: raw.propertyTitle || "Untitled Property",
    status: (raw.status === "ACTIVE" ? "ACTIVE" : "CONFIRMED") as "ACTIVE" | "CONFIRMED",
    sessionStartedAt: raw.sessionStartedAt || null,
    arrivalDeadline: raw.arrivalDeadline || null,
    totalAmount: parseAmount(raw.totalAmount),
  };
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDateTime(value: string | null) {
  if (!value) return "N/A";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "N/A";
  return d.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// --- Session Card ---
function SessionCard({
  session,
  onViewDetails,
}: {
  session: ActiveSession;
  onViewDetails: (id: string) => void;
}) {
  const isActive = session.status === "ACTIVE";

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${isActive ? "border-green-200" : "border-yellow-200"}`}>
      {/* Card header */}
      <div className={`px-5 py-3 flex items-center justify-between ${isActive ? "bg-green-50" : "bg-yellow-50"}`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isActive ? "bg-green-500 animate-pulse" : "bg-yellow-500 animate-pulse"}`} />
          <span className={`text-xs font-semibold uppercase tracking-wide ${isActive ? "text-green-700" : "text-yellow-700"}`}>
            {isActive ? "Parked" : "Awaiting Arrival"}
          </span>
        </div>
        <span className="text-xs text-gray-400 font-mono">{session.id.slice(0, 8).toUpperCase()}</span>
      </div>

      {/* Card body */}
      <div className="p-5 flex flex-col gap-4">
        {/* Guest */}
        <div className="flex items-center gap-3">
          {session.guestProfilePicture ? (
            <Image
              src={session.guestProfilePicture}
              alt={session.guestName}
              width={40}
              height={40}
              className="rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-semibold shrink-0">
              {session.guestName.charAt(0)}
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-900 text-sm">{session.guestName}</p>
            <p className="text-xs text-gray-500">Host: {session.hostName}</p>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-start gap-2 text-sm text-gray-600">
          <MapPin size={15} className="mt-0.5 shrink-0 text-gray-400" />
          <span className="leading-tight">{session.propertyTitle}</span>
        </div>

        {/* Timer / countdown */}
        <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${isActive ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}>
          {isActive ? <Timer size={15} className="shrink-0" /> : <Clock size={15} className="shrink-0" />}
          <span className="text-xs">{isActive ? "Session duration:" : "Time to arrive:"}</span>
          {isActive && session.sessionStartedAt ? (
            <ElapsedTimer startedAt={session.sessionStartedAt} />
          ) : session.arrivalDeadline ? (
            <ArrivalCountdown deadline={session.arrivalDeadline} />
          ) : (
            <span className="font-mono font-semibold">—</span>
          )}
        </div>

        {/* Escrow / amount */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5 text-gray-500">
            <Car size={14} />
            <span>Paid upfront</span>
          </div>
          <span className="font-semibold text-gray-900">{formatCurrency(session.totalAmount)}</span>
        </div>

        {/* Action */}
        <button
          onClick={() => onViewDetails(session.id)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
        >
          <Eye size={15} />
          View Details
        </button>
      </div>
    </div>
  );
}

// --- Main Page ---
export default function LiveSessionsPage() {
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [confirmedSessions, setConfirmedSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState(0);
  const [selectedSession, setSelectedSession] = useState<SessionDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const tickRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSessions = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const [activeRes, confirmedRes] = await Promise.all([
        api.get<{ reservations: RawSession[]; total: number }>(
          "/dashboard/reservations?status=ACTIVE&limit=100"
        ),
        api.get<{ reservations: RawSession[]; total: number }>(
          "/dashboard/reservations?status=CONFIRMED&limit=100"
        ),
      ]);

      setActiveSessions(activeRes.data.reservations.map(normalizeSession));
      setConfirmedSessions(confirmedRes.data.reservations.map(normalizeSession));
      setLastUpdated(new Date());
      setSecondsSinceUpdate(0);
    } catch {
      setError("Failed to load live sessions. Retrying automatically.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  // Initial fetch + 30s polling
  useEffect(() => {
    fetchSessions();
    pollRef.current = setInterval(() => fetchSessions(false), 30000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchSessions]);

  // "Last updated X seconds ago" ticker
  useEffect(() => {
    tickRef.current = setInterval(() => {
      setSecondsSinceUpdate((s) => s + 1);
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const handleManualRefresh = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    fetchSessions(false);
    pollRef.current = setInterval(() => fetchSessions(false), 30000);
  };

  const handleViewDetails = async (id: string) => {
    try {
      setDetailsLoading(true);
      setSelectedSession(null);
      const res = await api.get<SessionDetails>(`/dashboard/reservations/${id}`);
      setSelectedSession(res.data);
    } catch {
      alert("Failed to load session details.");
    } finally {
      setDetailsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#F9FAFB] min-h-full font-sans p-8 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading live sessions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F9FAFB] min-h-full font-sans p-8">

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold text-gray-900">Live Sessions</h1>
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Live
            </span>
          </div>
          <p className="text-gray-500 text-sm">
            Real-time view of all active and incoming parking sessions.
          </p>
        </div>

        {/* Refresh controls */}
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={handleManualRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors shadow-sm"
          >
            <RefreshCw size={15} />
            Refresh
          </button>
          {lastUpdated && (
            <span className="text-xs text-gray-400">
              Updated {secondsSinceUpdate}s ago · auto-refreshes every 30s
            </span>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Stat pills */}
      <div className="flex flex-wrap gap-4 mb-8">
        <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <Activity size={20} className="text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Currently Parked</p>
            <p className="text-2xl font-bold text-gray-900">{activeSessions.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
          <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
            <Clock size={20} className="text-yellow-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Awaiting Arrival</p>
            <p className="text-2xl font-bold text-gray-900">{confirmedSessions.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <CheckCircle size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Total Active</p>
            <p className="text-2xl font-bold text-gray-900">{activeSessions.length + confirmedSessions.length}</p>
          </div>
        </div>
      </div>

      {/* Currently Parked */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <h2 className="text-lg font-semibold text-gray-800">Currently Parked</h2>
          <span className="text-sm text-gray-400">({activeSessions.length})</span>
        </div>

        {activeSessions.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-200 py-12 text-center text-gray-400">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No active parking sessions right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {activeSessions.map((session) => (
              <SessionCard key={session.id} session={session} onViewDetails={handleViewDetails} />
            ))}
          </div>
        )}
      </section>

      {/* Awaiting Arrival */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
          <h2 className="text-lg font-semibold text-gray-800">Awaiting Arrival</h2>
          <span className="text-sm text-gray-400">({confirmedSessions.length})</span>
        </div>

        {confirmedSessions.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-200 py-12 text-center text-gray-400">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No drivers currently en route.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {confirmedSessions.map((session) => (
              <SessionCard key={session.id} session={session} onViewDetails={handleViewDetails} />
            ))}
          </div>
        )}
      </section>

      {/* Details Modal */}
      {(detailsLoading || selectedSession) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Session Details</h3>
              <button
                onClick={() => setSelectedSession(null)}
                className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>

            {detailsLoading ? (
              <div className="py-10 flex items-center justify-center gap-2 text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Loading session details...</span>
              </div>
            ) : selectedSession ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
                  <p className="text-xs uppercase text-gray-500 mb-2">Booking</p>
                  <p className="font-semibold text-gray-900 mb-1">{selectedSession.id}</p>
                  <p className="text-gray-600">
                    Status:{" "}
                    <span className={`font-medium ${selectedSession.status === "ACTIVE" ? "text-green-600" : "text-yellow-600"}`}>
                      {selectedSession.status}
                    </span>
                  </p>
                  <p className="text-gray-600">Created: {formatDateTime(selectedSession.createdAt)}</p>
                </div>

                <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
                  <p className="text-xs uppercase text-gray-500 mb-2">Guest</p>
                  <p className="font-semibold text-gray-900 mb-1">{selectedSession.guest.name}</p>
                  <p className="text-gray-600">{selectedSession.guest.email}</p>
                  <p className="text-gray-600">{selectedSession.guest.phone || "No phone number"}</p>
                </div>

                <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
                  <p className="text-xs uppercase text-gray-500 mb-2">Host</p>
                  <p className="font-semibold text-gray-900 mb-1">{selectedSession.host.name}</p>
                  <p className="text-gray-600">{selectedSession.host.email}</p>
                  <p className="text-gray-600">{selectedSession.host.phone || "No phone number"}</p>
                </div>

                <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
                  <p className="text-xs uppercase text-gray-500 mb-2">Property</p>
                  <p className="font-semibold text-gray-900 mb-1">{selectedSession.property.title}</p>
                  <p className="text-gray-600">{selectedSession.property.address}</p>
                  <p className="text-gray-600">Slot #{selectedSession.property.slotNumber}</p>
                </div>

                <div className="p-4 rounded-lg bg-gray-50 border border-gray-100 md:col-span-2">
                  <p className="text-xs uppercase text-gray-500 mb-2">Session Timeline</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                    <div>
                      <p className="text-xs text-gray-400">Arrival Deadline</p>
                      <p className="text-gray-700 font-medium">{formatDateTime(selectedSession.arrivalDeadline)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Session Started</p>
                      <p className="text-gray-700 font-medium">{formatDateTime(selectedSession.sessionStartedAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Session Ended</p>
                      <p className="text-gray-700 font-medium">{formatDateTime(selectedSession.sessionEndedAt)}</p>
                    </div>
                  </div>
                  {selectedSession.sessionStartedAt && !selectedSession.sessionEndedAt && (
                    <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-green-50 rounded-lg text-green-700 text-sm">
                      <Timer size={14} />
                      <span>Live duration:</span>
                      <ElapsedTimer startedAt={selectedSession.sessionStartedAt} />
                    </div>
                  )}
                  <p className="text-gray-900 font-semibold mt-3">
                    Amount Paid: {formatCurrency(selectedSession.totalAmount)}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
