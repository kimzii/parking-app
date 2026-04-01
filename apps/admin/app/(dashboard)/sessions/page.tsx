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
  XCircle,
  ChevronDown,
  ChevronRight,
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
  sessionEndedAt?: string | null;
  arrivalDeadline?: string | null;
  totalAmount?: number | string | null;
};

type SessionStatus = "ACTIVE" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

interface Session {
  id: string;
  guestName: string;
  guestProfilePicture: string | null;
  hostName: string;
  propertyTitle: string;
  status: SessionStatus;
  sessionStartedAt: string | null;
  sessionEndedAt: string | null;
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

function normalizeSession(raw: RawSession): Session {
  const status = (["ACTIVE", "CONFIRMED", "COMPLETED", "CANCELLED"].includes(raw.status ?? "")
    ? raw.status
    : "CONFIRMED") as SessionStatus;
  return {
    id: raw.id,
    guestName: raw.guestName || "Unknown Guest",
    guestProfilePicture: raw.guestProfilePicture || null,
    hostName: raw.hostName || "Unknown Host",
    propertyTitle: raw.propertyTitle || "Untitled Property",
    status,
    sessionStartedAt: raw.sessionStartedAt || null,
    sessionEndedAt: raw.sessionEndedAt || null,
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

function formatDuration(startedAt: string | null, endedAt: string | null): string {
  if (!startedAt || !endedAt) return "N/A";
  const diffMs = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  if (diffMs <= 0) return "N/A";
  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// --- Active/Confirmed Session Card ---
function SessionCard({
  session,
  onViewDetails,
  onCancel,
}: {
  session: Session;
  onViewDetails: (id: string) => void;
  onCancel: (session: Session) => void;
}) {
  const isActive = session.status === "ACTIVE";

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${isActive ? "border-green-200" : "border-yellow-200"}`}>
      <div className={`px-5 py-3 flex items-center justify-between ${isActive ? "bg-green-50" : "bg-yellow-50"}`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isActive ? "bg-green-500 animate-pulse" : "bg-yellow-500 animate-pulse"}`} />
          <span className={`text-xs font-semibold uppercase tracking-wide ${isActive ? "text-green-700" : "text-yellow-700"}`}>
            {isActive ? "Parked" : "Awaiting Arrival"}
          </span>
        </div>
        <span className="text-xs text-gray-400 font-mono">{session.id.slice(0, 8).toUpperCase()}</span>
      </div>

      <div className="p-5 flex flex-col gap-4">
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

        <div className="flex items-start gap-2 text-sm text-gray-600">
          <MapPin size={15} className="mt-0.5 shrink-0 text-gray-400" />
          <span className="leading-tight">{session.propertyTitle}</span>
        </div>

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

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5 text-gray-500">
            <Car size={14} />
            <span>Paid upfront</span>
          </div>
          <span className="font-semibold text-gray-900">{formatCurrency(session.totalAmount)}</span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onViewDetails(session.id)}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <Eye size={15} />
            View Details
          </button>
          <button
            onClick={() => onCancel(session)}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-red-200 text-sm text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors"
          >
            <XCircle size={15} />
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Completed / Cancelled Session Card ---
function HistoryCard({
  session,
  onViewDetails,
}: {
  session: Session;
  onViewDetails: (id: string) => void;
}) {
  const isCompleted = session.status === "COMPLETED";
  const duration = formatDuration(session.sessionStartedAt, session.sessionEndedAt);

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${isCompleted ? "border-blue-100" : "border-red-100"}`}>
      <div className={`px-5 py-3 flex items-center justify-between ${isCompleted ? "bg-blue-50" : "bg-red-50"}`}>
        <div className="flex items-center gap-2">
          {isCompleted
            ? <CheckCircle size={14} className="text-blue-500" />
            : <XCircle size={14} className="text-red-400" />}
          <span className={`text-xs font-semibold uppercase tracking-wide ${isCompleted ? "text-blue-700" : "text-red-500"}`}>
            {isCompleted ? "Completed" : "Cancelled"}
          </span>
        </div>
        <span className="text-xs text-gray-400 font-mono">{session.id.slice(0, 8).toUpperCase()}</span>
      </div>

      <div className="p-5 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          {session.guestProfilePicture ? (
            <Image
              src={session.guestProfilePicture}
              alt={session.guestName}
              width={36}
              height={36}
              className="rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-semibold text-sm shrink-0">
              {session.guestName.charAt(0)}
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-900 text-sm">{session.guestName}</p>
            <p className="text-xs text-gray-500">Host: {session.hostName}</p>
          </div>
        </div>

        <div className="flex items-start gap-2 text-sm text-gray-600">
          <MapPin size={14} className="mt-0.5 shrink-0 text-gray-400" />
          <span className="leading-tight text-xs">{session.propertyTitle}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {isCompleted && (
            <div className="bg-blue-50 rounded-lg px-3 py-2">
              <p className="text-gray-400 mb-0.5">Duration</p>
              <p className="font-semibold text-blue-700">{duration}</p>
            </div>
          )}
          <div className={`rounded-lg px-3 py-2 ${isCompleted ? "bg-gray-50 col-span-1" : "bg-red-50 col-span-2"}`}>
            <p className="text-gray-400 mb-0.5">{isCompleted ? "Ended" : "Cancelled at"}</p>
            <p className="font-medium text-gray-700">{formatDateTime(session.sessionEndedAt)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-xs text-gray-400">Amount</span>
          <span className={`font-semibold text-sm ${isCompleted ? "text-gray-900" : "text-gray-400 line-through"}`}>
            {formatCurrency(session.totalAmount)}
          </span>
        </div>

        <button
          onClick={() => onViewDetails(session.id)}
          className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-colors"
        >
          <Eye size={13} />
          View Details
        </button>
      </div>
    </div>
  );
}

// --- Main Page ---
export default function LiveSessionsPage() {
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);
  const [confirmedSessions, setConfirmedSessions] = useState<Session[]>([]);
  const [completedSessions, setCompletedSessions] = useState<Session[]>([]);
  const [cancelledSessions, setCancelledSessions] = useState<Session[]>([]);
  const [completedOpen, setCompletedOpen] = useState(false);
  const [cancelledOpen, setCancelledOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState(0);
  const [selectedSession, setSelectedSession] = useState<SessionDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Session | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSessions = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const [activeRes, confirmedRes, completedRes, cancelledRes] = await Promise.all([
        api.get<{ reservations: RawSession[]; total: number }>(
          "/dashboard/reservations?status=ACTIVE&limit=100"
        ),
        api.get<{ reservations: RawSession[]; total: number }>(
          "/dashboard/reservations?status=CONFIRMED&limit=100"
        ),
        api.get<{ reservations: RawSession[]; total: number }>(
          "/dashboard/reservations?status=COMPLETED&limit=50"
        ),
        api.get<{ reservations: RawSession[]; total: number }>(
          "/dashboard/reservations?status=CANCELLED&limit=50"
        ),
      ]);

      setActiveSessions(activeRes.data.reservations.map(normalizeSession));
      setConfirmedSessions(confirmedRes.data.reservations.map(normalizeSession));
      setCompletedSessions(completedRes.data.reservations.map(normalizeSession));
      setCancelledSessions(cancelledRes.data.reservations.map(normalizeSession));
      setLastUpdated(new Date());
      setSecondsSinceUpdate(0);
    } catch {
      setError("Failed to load sessions. Retrying automatically.");
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

  const handleCancelSession = async () => {
    if (!cancelTarget) return;
    try {
      setCancelLoading(true);
      await api.delete(`/dashboard/reservations/${cancelTarget.id}`);
      setCancelTarget(null);
      await fetchSessions(false);
    } catch {
      alert("Failed to cancel session. Please try again.");
    } finally {
      setCancelLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#F9FAFB] min-h-full font-sans p-8 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading sessions...</span>
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
            <h1 className="text-3xl font-bold text-gray-900">Sessions</h1>
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Live
            </span>
          </div>
          <p className="text-gray-500 text-sm">
            Real-time view of all parking sessions — active, incoming, completed, and cancelled.
          </p>
        </div>

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
            <p className="text-xs text-gray-500 font-medium">Completed</p>
            <p className="text-2xl font-bold text-gray-900">{completedSessions.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
          <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
            <XCircle size={20} className="text-red-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Cancelled</p>
            <p className="text-2xl font-bold text-gray-900">{cancelledSessions.length}</p>
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
              <SessionCard key={session.id} session={session} onViewDetails={handleViewDetails} onCancel={setCancelTarget} />
            ))}
          </div>
        )}
      </section>

      {/* Awaiting Arrival */}
      <section className="mb-10">
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
              <SessionCard key={session.id} session={session} onViewDetails={handleViewDetails} onCancel={setCancelTarget} />
            ))}
          </div>
        )}
      </section>

      {/* Completed */}
      <section className="mb-10">
        <button
          onClick={() => setCompletedOpen((o) => !o)}
          className="w-full flex items-center gap-2 mb-4 group"
        >
          <CheckCircle size={16} className="text-blue-500 shrink-0" />
          <h2 className="text-lg font-semibold text-gray-800">Completed</h2>
          <span className="text-sm text-gray-400">({completedSessions.length})</span>
          <span className="text-xs text-gray-400 ml-1">· most recent 50</span>
          <span className="ml-auto text-gray-400 group-hover:text-gray-600 transition-colors">
            {completedOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </span>
        </button>

        {completedOpen && (
          completedSessions.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-200 py-12 text-center text-gray-400">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No completed sessions yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {completedSessions.map((session) => (
                <HistoryCard key={session.id} session={session} onViewDetails={handleViewDetails} />
              ))}
            </div>
          )
        )}
      </section>

      {/* Cancelled */}
      <section className="mb-10">
        <button
          onClick={() => setCancelledOpen((o) => !o)}
          className="w-full flex items-center gap-2 mb-4 group"
        >
          <XCircle size={16} className="text-red-400 shrink-0" />
          <h2 className="text-lg font-semibold text-gray-800">Cancelled</h2>
          <span className="text-sm text-gray-400">({cancelledSessions.length})</span>
          <span className="text-xs text-gray-400 ml-1">· most recent 50</span>
          <span className="ml-auto text-gray-400 group-hover:text-gray-600 transition-colors">
            {cancelledOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </span>
        </button>

        {cancelledOpen && (
          cancelledSessions.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-200 py-12 text-center text-gray-400">
              <XCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No cancelled sessions.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {cancelledSessions.map((session) => (
                <HistoryCard key={session.id} session={session} onViewDetails={handleViewDetails} />
              ))}
            </div>
          )
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
                    <span className={`font-medium ${
                      selectedSession.status === "ACTIVE" ? "text-green-600" :
                      selectedSession.status === "CONFIRMED" ? "text-yellow-600" :
                      selectedSession.status === "COMPLETED" ? "text-blue-600" :
                      "text-red-500"
                    }`}>
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
                  {selectedSession.sessionStartedAt && selectedSession.sessionEndedAt && (
                    <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-blue-50 rounded-lg text-blue-700 text-sm">
                      <Timer size={14} />
                      <span>Total duration:</span>
                      <span className="font-semibold">{formatDuration(selectedSession.sessionStartedAt, selectedSession.sessionEndedAt)}</span>
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

      {/* Cancel Confirmation Modal */}
      {cancelTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !cancelLoading && setCancelTarget(null)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-4 mb-5">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <XCircle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Cancel Session</h3>
                <p className="text-sm text-gray-500 mt-1">
                  This will permanently cancel the session for <span className="font-semibold text-gray-700">{cancelTarget.guestName}</span> at <span className="font-semibold text-gray-700">{cancelTarget.propertyTitle}</span>. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-5 text-sm text-red-700">
              <strong>Warning:</strong> Only cancel sessions in case of a genuine error or emergency. The driver will be notified.
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setCancelTarget(null)}
                disabled={cancelLoading}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Keep Session
              </button>
              <button
                onClick={handleCancelSession}
                disabled={cancelLoading}
                className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {cancelLoading ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
                {cancelLoading ? "Cancelling..." : "Cancel Session"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
