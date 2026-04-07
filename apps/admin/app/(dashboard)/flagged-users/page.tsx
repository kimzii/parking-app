"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  Star,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertCircle,
  Shield,
  ShieldOff,
  ShieldCheck,
  MessageSquareWarning,
  Calendar,
  X,
} from "lucide-react";
import api from "../../../src/lib/api";
import { Breadcrumb } from "../../../src/components/ui/breadcrumb";

type FlaggedRole = "DRIVER" | "HOST";
type UserStatus = "VERIFIED" | "SUSPENDED" | "PENDING" | "REJECTED";

interface RecentReview {
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewer?: { firstName: string | null; lastName: string | null };
}

interface FlaggedUser {
  userId: string;
  name: string;
  email: string;
  role: FlaggedRole;
  roleId: string;
  averageRating: number;
  totalReviews: number;
  currentStatus: UserStatus;
  suspendedAt: string | null;
  suspendUntil: string | null;
  suspensionReason: string | null;
  recentReviews: RecentReview[];
}

// ─── Star display ───────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={14}
          className={
            n <= Math.round(rating)
              ? "fill-amber-400 text-amber-400"
              : "fill-gray-200 text-gray-200"
          }
        />
      ))}
      <span className="ml-1 text-sm font-medium text-gray-700">
        {rating.toFixed(1)}
      </span>
    </div>
  );
}

// ─── Modals ──────────────────────────────────────────────────────────────────

function WarnModal({
  user,
  onClose,
  onConfirm,
}: {
  user: FlaggedUser;
  onClose: () => void;
  onConfirm: (message?: string) => Promise<void>;
}) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setLoading(true);
    await onConfirm(message.trim() || undefined);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Send Warning</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-3">
          Sending a warning to <span className="font-medium">{user.name}</span> ({user.role.toLowerCase()}).
        </p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Custom message (optional — leave blank for default warning)"
          rows={4}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handle}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-60"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Send Warning
          </button>
        </div>
      </div>
    </div>
  );
}

function SuspendModal({
  user,
  onClose,
  onConfirm,
}: {
  user: FlaggedUser;
  onClose: () => void;
  onConfirm: (days: number, reason: string) => Promise<void>;
}) {
  const [days, setDays] = useState(7);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    await onConfirm(days, reason.trim());
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Suspend Account</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Suspending <span className="font-medium">{user.name}</span>&apos;s {user.role.toLowerCase()} account.
        </p>
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Duration (days)
          </label>
          <input
            type="number"
            min={1}
            value={days}
            onChange={(e) => setDays(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter reason for suspension..."
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handle}
            disabled={loading || !reason.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Suspend
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function FlaggedUserRow({
  user,
  onAction,
}: {
  user: FlaggedUser;
  onAction: (type: "warn" | "suspend" | "unsuspend", user: FlaggedUser) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isSuspended = user.currentStatus === "SUSPENDED";

  const suspendUntilDate = user.suspendUntil
    ? new Date(user.suspendUntil).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <>
      <tr
        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Expand toggle */}
        <td className="px-4 py-3 w-8 text-gray-400">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </td>

        {/* Name / Email */}
        <td className="px-4 py-3">
          <p className="text-sm font-medium text-gray-900">{user.name || "—"}</p>
          <p className="text-xs text-gray-500">{user.email}</p>
        </td>

        {/* Role */}
        <td className="px-4 py-3">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              user.role === "DRIVER"
                ? "bg-blue-100 text-blue-700"
                : "bg-purple-100 text-purple-700"
            }`}
          >
            {user.role}
          </span>
        </td>

        {/* Avg Rating */}
        <td className="px-4 py-3">
          <StarRating rating={user.averageRating} />
        </td>

        {/* Total Reviews */}
        <td className="px-4 py-3 text-sm text-gray-700">{user.totalReviews}</td>

        {/* Status */}
        <td className="px-4 py-3">
          {isSuspended ? (
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                <ShieldOff size={11} /> Suspended
              </span>
              {suspendUntilDate && (
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                  <Calendar size={10} /> Until {suspendUntilDate}
                </p>
              )}
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
              <ShieldCheck size={11} /> {user.currentStatus}
            </span>
          )}
        </td>

        {/* Actions */}
        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onAction("warn", user)}
              title="Send Warning"
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200"
            >
              <MessageSquareWarning size={13} />
              Warn
            </button>
            {isSuspended ? (
              <button
                onClick={() => onAction("unsuspend", user)}
                title="Unsuspend"
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
              >
                <ShieldCheck size={13} />
                Unsuspend
              </button>
            ) : (
              <button
                onClick={() => onAction("suspend", user)}
                title="Suspend"
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
              >
                <Shield size={13} />
                Suspend
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded: suspension info + recent reviews */}
      {expanded && (
        <tr className="bg-gray-50 border-b border-gray-100">
          <td colSpan={7} className="px-8 py-4">
            {isSuspended && user.suspensionReason && (
              <div className="mb-3 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
                <span className="font-medium">Suspension reason:</span>{" "}
                {user.suspensionReason}
                {suspendUntilDate && (
                  <span className="ml-2 text-red-500">— until {suspendUntilDate}</span>
                )}
              </div>
            )}

            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Last {user.recentReviews.length} Reviews
            </p>

            {user.recentReviews.length === 0 ? (
              <p className="text-sm text-gray-400">No reviews yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {user.recentReviews.map((review, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 bg-white border border-gray-100 rounded-lg px-4 py-3"
                  >
                    <div className="shrink-0 mt-0.5">
                      <StarRating rating={review.rating} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700">
                        {review.comment || (
                          <span className="italic text-gray-400">No comment</span>
                        )}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                        {review.reviewer && (
                          <span>
                            {review.reviewer.firstName} {review.reviewer.lastName}
                          </span>
                        )}
                        <span>·</span>
                        <span>
                          {new Date(review.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type ActiveModal =
  | { type: "warn"; user: FlaggedUser }
  | { type: "suspend"; user: FlaggedUser }
  | null;

export default function FlaggedUsersPage() {
  const [users, setUsers] = useState<FlaggedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  const showToast = (message: string, ok = true) => {
    setToast({ message, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchFlaggedUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/dashboard/flagged-users");
      setUsers(res.data as FlaggedUser[]);
    } catch {
      setError("Failed to load flagged users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchFlaggedUsers();
  }, [fetchFlaggedUsers]);

  const handleWarn = async (message?: string) => {
    if (!activeModal) return;
    try {
      await api.post(`/dashboard/users/${activeModal.user.userId}/warn`, {
        roleId: activeModal.user.roleId,
        message,
      });
      showToast(`Warning sent to ${activeModal.user.name}.`);
    } catch {
      showToast("Failed to send warning.", false);
    } finally {
      setActiveModal(null);
    }
  };

  const handleSuspend = async (days: number, reason: string) => {
    if (!activeModal) return;
    try {
      await api.post(`/dashboard/users/${activeModal.user.userId}/suspend`, {
        roleId: activeModal.user.roleId,
        days,
        reason,
      });
      showToast(`${activeModal.user.name} suspended for ${days} day${days === 1 ? "" : "s"}.`);
      await fetchFlaggedUsers();
    } catch {
      showToast("Failed to suspend user.", false);
    } finally {
      setActiveModal(null);
    }
  };

  const handleUnsuspend = async (user: FlaggedUser) => {
    try {
      await api.post(`/dashboard/users/${user.userId}/unsuspend`, {
        roleId: user.roleId,
      });
      showToast(`${user.name} has been reactivated.`);
      await fetchFlaggedUsers();
    } catch {
      showToast("Failed to unsuspend user.", false);
    }
  };

  const handleAction = (
    type: "warn" | "suspend" | "unsuspend",
    user: FlaggedUser,
  ) => {
    if (type === "unsuspend") {
      void handleUnsuspend(user);
    } else {
      setActiveModal({ type, user });
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Flagged Users" }]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Flagged Users</h1>
            <p className="text-sm text-gray-500">
              Users with ≥10 reviews averaging below 2.5 stars
            </p>
          </div>
        </div>
        <button
          onClick={() => void fetchFlaggedUsers()}
          className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
        >
          Refresh
        </button>
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-[#C94B1E]" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <ShieldCheck size={40} className="mb-3 text-green-400" />
          <p className="text-base font-medium text-gray-500">No flagged users</p>
          <p className="text-sm">All users are within acceptable rating thresholds.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 w-8" />
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  User
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Role
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Avg Rating
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Reviews
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <FlaggedUserRow
                  key={`${user.userId}-${user.role}`}
                  user={user}
                  onAction={handleAction}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {activeModal?.type === "warn" && (
        <WarnModal
          user={activeModal.user}
          onClose={() => setActiveModal(null)}
          onConfirm={handleWarn}
        />
      )}
      {activeModal?.type === "suspend" && (
        <SuspendModal
          user={activeModal.user}
          onClose={() => setActiveModal(null)}
          onConfirm={handleSuspend}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm text-white transition-all ${
            toast.ok ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.ok ? <ShieldCheck size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}
    </div>
  );
}
