"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Phone,
  User,
  DollarSign,
  ImageIcon,
  ExternalLink,
  History,
  Search,
  X,
} from "lucide-react";
import api from "../../../src/lib/api";
import { Breadcrumb } from "../../../src/components/ui/breadcrumb";

// ─── Types ───────────────────────────────────────

interface UserInfo {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phoneNumber: string | null;
}

interface TopUpRequest {
  id: string;
  userId: string;
  amount: string;
  referenceCode: string;
  proofImageUrl: string | null;
  status: "PENDING" | "ACCEPTED" | "APPROVED" | "REJECTED" | "EXPIRED";
  expiresAt: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  user: UserInfo;
}

interface WithdrawRequest {
  id: string;
  userId: string;
  amount: string;
  referenceNumber: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  user: UserInfo;
}

// ─── Helpers ─────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getTimeRemaining(expiresAt: string | null): string {
  if (!expiresAt) return "";
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    PENDING: {
      label: "Pending",
      className: "bg-yellow-100 text-yellow-700 border-yellow-200",
    },
    ACCEPTED: {
      label: "Accepted",
      className: "bg-blue-100 text-blue-700 border-blue-200",
    },
    APPROVED: {
      label: "Approved",
      className: "bg-green-100 text-green-700 border-green-200",
    },
    REJECTED: {
      label: "Rejected",
      className: "bg-red-100 text-red-700 border-red-200",
    },
    EXPIRED: {
      label: "Expired",
      className: "bg-gray-100 text-gray-500 border-gray-200",
    },
  };
  const s = map[status] || {
    label: status,
    className: "bg-gray-100 text-gray-600",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${s.className}`}
    >
      {s.label}
    </span>
  );
}

// ─── Page ────────────────────────────────────────

export default function TransactionsPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const requestId = searchParams.get("requestId");
  const highlightRef = useRef<HTMLDivElement>(null);

  const defaultTab =
    tabParam === "withdraw"
      ? "withdrawals"
      : tabParam === "topup"
        ? "topups"
        : "topups";

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [topUps, setTopUps] = useState<TopUpRequest[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawRequest[]>([]);
  const [allTopUps, setAllTopUps] = useState<TopUpRequest[]>([]);
  const [allWithdraws, setAllWithdraws] = useState<WithdrawRequest[]>([]);
  const [loadingTopUps, setLoadingTopUps] = useState(true);
  const [loadingWithdraws, setLoadingWithdraws] = useState(true);
  const [loadingAll, setLoadingAll] = useState(true);
  const [allPage, setAllPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [timerTick, setTimerTick] = useState(0);
  const [rejectDialog, setRejectDialog] = useState<{ id: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [refSearch, setRefSearch] = useState("");

  const allTransactionsPageSize = 20;

  const allTransactionsSorted = useMemo(() => {
    return [
      ...allTopUps.map((t) => ({ ...t, _type: "topup" as const })),
      ...allWithdraws.map((w) => ({ ...w, _type: "withdraw" as const })),
    ].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [allTopUps, allWithdraws]);

  const allTransactionsTotalPages = Math.max(
    1,
    Math.ceil(allTransactionsSorted.length / allTransactionsPageSize),
  );

  const currentAllPage = Math.min(allPage, allTransactionsTotalPages);

  const allTransactionsPaged = useMemo(() => {
    const start = (currentAllPage - 1) * allTransactionsPageSize;
    return allTransactionsSorted.slice(start, start + allTransactionsPageSize);
  }, [allTransactionsSorted, currentAllPage]);

  useEffect(() => {
    if (allPage > allTransactionsTotalPages) {
      setAllPage(allTransactionsTotalPages);
    }
  }, [allPage, allTransactionsTotalPages]);

  const fetchTopUps = useCallback(async () => {
    try {
      const res = await api.get("/wallet/top-up/pending");
      setTopUps(res.data);
    } catch (err) {
      console.error("Failed to fetch top-ups:", err);
    } finally {
      setLoadingTopUps(false);
    }
  }, []);

  const fetchWithdrawals = useCallback(async () => {
    try {
      const res = await api.get("/wallet/withdraw/pending");
      setWithdrawals(res.data);
    } catch (err) {
      console.error("Failed to fetch withdrawals:", err);
    } finally {
      setLoadingWithdraws(false);
    }
  }, []);

  const fetchAllTransactions = useCallback(async () => {
    try {
      const [topUpRes, withdrawRes] = await Promise.all([
        api.get("/wallet/top-up/all"),
        api.get("/wallet/withdraw/all"),
      ]);
      setAllTopUps(topUpRes.data);
      setAllWithdraws(withdrawRes.data);
    } catch (err) {
      console.error("Failed to fetch all transactions:", err);
    } finally {
      setLoadingAll(false);
    }
  }, []);

  useEffect(() => {
    fetchTopUps();
    fetchWithdrawals();
    fetchAllTransactions();
    // Poll every 10 seconds so pending top-up/withdrawal statuses stay current
    // without requiring a manual page refresh
    const interval = setInterval(() => {
      fetchTopUps();
      fetchWithdrawals();
      fetchAllTransactions();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchTopUps, fetchWithdrawals, fetchAllTransactions]);

  // Timer tick for countdown display
  useEffect(() => {
    const timer = setInterval(() => setTimerTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Scroll to highlighted request from notification deep-link
  useEffect(() => {
    if (!requestId || loadingTopUps || loadingWithdraws) return;
    const el = document.getElementById(`request-${requestId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [requestId, loadingTopUps, loadingWithdraws, activeTab]);

  // ─── Top-Up Actions ────────────────────────────

  const handleAcceptTopUp = async (id: string) => {
    setActionLoading(id);
    try {
      await api.patch(`/wallet/top-up/${id}/accept`);
      await fetchTopUps();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to accept top-up");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReleaseCredits = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to release credits for this top-up? This will add funds to the user's wallet.",
      )
    )
      return;
    setActionLoading(id);
    try {
      await api.patch(`/wallet/top-up/${id}/release`);
      await fetchTopUps();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to release credits");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectTopUp = (id: string) => {
    setRejectReason("");
    setRejectDialog({ id });
  };

  const confirmRejectTopUp = async () => {
    if (!rejectDialog) return;
    const { id } = rejectDialog;
    setRejectDialog(null);
    setActionLoading(id);
    try {
      await api.patch(`/wallet/top-up/${id}/reject`, {
        reason: rejectReason.trim() || undefined,
      });
      await fetchTopUps();
      await fetchAllTransactions();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to reject top-up");
    } finally {
      setActionLoading(null);
      setRejectReason("");
    }
  };

  // ─── Withdraw Actions ──────────────────────────

  const handleApproveWithdraw = async (id: string) => {
    if (
      !confirm(
        "Are you sure? This will deduct from the user's wallet and mark as sent.",
      )
    )
      return;
    setActionLoading(id);
    try {
      await api.patch(`/wallet/withdraw/${id}/approve`);
      await fetchWithdrawals();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to approve withdrawal");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectWithdraw = async (id: string) => {
    if (!confirm("Are you sure you want to reject this withdrawal request?"))
      return;
    setActionLoading(id);
    try {
      await api.patch(`/wallet/withdraw/${id}/reject`);
      await fetchWithdrawals();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to reject withdrawal");
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Render ────────────────────────────────────

  const refQuery = refSearch.trim().toLowerCase();

  const filteredTopUps = refQuery
    ? topUps.filter((t) => t.referenceCode.toLowerCase().includes(refQuery))
    : topUps;

  const filteredWithdrawals = refQuery
    ? withdrawals.filter((w) => w.referenceNumber.toLowerCase().includes(refQuery))
    : withdrawals;

  const filteredAllTransactions = refQuery
    ? allTransactionsPaged.filter((r) => {
        const ref =
          r._type === "topup"
            ? (r as TopUpRequest).referenceCode
            : (r as WithdrawRequest).referenceNumber;
        return ref?.toLowerCase().includes(refQuery);
      })
    : allTransactionsPaged;

  const pendingTopUps = filteredTopUps.filter((t) => t.status === "PENDING");
  const acceptedTopUps = filteredTopUps.filter((t) => t.status === "ACCEPTED");

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Transactions" },
        ]}
      />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage top-up and withdrawal requests from users
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Pending Top-Ups",
            value: pendingTopUps.length,
            icon: Clock,
            color: "text-amber-600",
            bg: "bg-amber-50",
            border: "border-amber-100",
          },
          {
            label: "Awaiting Payment",
            value: acceptedTopUps.length,
            icon: ArrowUpCircle,
            color: "text-blue-600",
            bg: "bg-blue-50",
            border: "border-blue-100",
          },
          {
            label: "Pending Withdrawals",
            value: withdrawals.length,
            icon: ArrowDownCircle,
            color: "text-orange-600",
            bg: "bg-orange-50",
            border: "border-orange-100",
          },
          {
            label: "Total Pending Value",
            value: `₱${[...topUps, ...withdrawals].reduce((s, r) => s + parseFloat(r.amount), 0).toFixed(2)}`,
            icon: DollarSign,
            color: "text-green-600",
            bg: "bg-green-50",
            border: "border-green-100",
          },
        ].map(({ label, value, icon: Icon, color, bg, border }) => (
          <div
            key={label}
            className={`rounded-2xl border ${border} ${bg} p-5 flex items-center gap-4`}
          >
            <div
              className={`w-11 h-11 rounded-xl ${bg} border ${border} flex items-center justify-center flex-shrink-0 shadow-sm`}
            >
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {label}
              </p>
              <p className={`text-2xl font-extrabold mt-0.5 ${color}`}>
                {value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Reference Code Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={refSearch}
          onChange={(e) => setRefSearch(e.target.value)}
          placeholder="Search by reference code…"
          className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#C94B1E]/30 focus:border-[#C94B1E]"
        />
        {refSearch && (
          <button
            onClick={() => setRefSearch("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="topups">
            <ArrowUpCircle className="h-4 w-4 mr-1" />
            Top-Up Requests ({topUps.length})
          </TabsTrigger>
          <TabsTrigger value="withdrawals">
            <ArrowDownCircle className="h-4 w-4 mr-1" />
            Withdrawals ({withdrawals.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            <History className="h-4 w-4 mr-1" />
            All Transactions ({allTopUps.length + allWithdraws.length})
          </TabsTrigger>
        </TabsList>

        {/* ─── Top-Up Tab ─── */}
        <TabsContent value="topups" className="mt-4">
          {loadingTopUps ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : filteredTopUps.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <ArrowUpCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">{refQuery ? "No matching top-up requests" : "No pending top-up requests"}</p>
                <p className="text-sm">
                  {refQuery ? `No reference code matches "${refSearch}"` : "New requests will appear here automatically"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredTopUps.map((req) => {
                const isLoading = actionLoading === req.id;
                const userName =
                  `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim() ||
                  req.user.email;
                const initials =
                  [req.user.firstName, req.user.lastName]
                    .filter(Boolean)
                    .map((n) => n![0])
                    .join("")
                    .toUpperCase() || "?";
                const remaining =
                  req.status === "PENDING"
                    ? getTimeRemaining(req.expiresAt)
                    : null;
                const isExpired = remaining === "Expired";

                return (
                  <div
                    id={`request-${req.id}`}
                    key={req.id}
                    className={`bg-white rounded-2xl border overflow-hidden shadow-sm transition-all ${
                      req.status === "PENDING"
                        ? "border-amber-200"
                        : req.status === "ACCEPTED"
                          ? "border-blue-200"
                          : "border-gray-200"
                    } ${requestId === req.id ? "ring-2 ring-[#C94B1E] ring-offset-2" : ""}`}
                  >
                    {/* Status strip */}
                    <div
                      className={`px-5 py-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${
                        req.status === "PENDING"
                          ? "bg-amber-50 text-amber-700 border-b border-amber-100"
                          : req.status === "ACCEPTED"
                            ? "bg-blue-50 text-blue-700 border-b border-blue-100"
                            : "bg-gray-50 text-gray-500 border-b border-gray-100"
                      }`}
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${req.status === "PENDING" ? "bg-amber-400" : req.status === "ACCEPTED" ? "bg-blue-500" : "bg-gray-400"}`}
                      />
                      {req.status === "PENDING"
                        ? "Pending Review"
                        : req.status === "ACCEPTED"
                          ? "Awaiting Payment Proof"
                          : req.status}
                      {remaining && !isExpired && (
                        <span className="ml-auto font-mono text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full normal-case text-[11px]">
                          ⏱ {remaining}
                        </span>
                      )}
                      {isExpired && (
                        <span className="ml-auto text-gray-400 normal-case">
                          Expired
                        </span>
                      )}
                    </div>

                    <div className="p-5 flex flex-col lg:flex-row gap-5">
                      {/* User + details */}
                      <div className="flex-1 flex gap-4">
                        <div className="w-11 h-11 rounded-full bg-[#F5EDE9] flex items-center justify-center flex-shrink-0 text-[#C94B1E] font-bold text-sm">
                          {initials}
                        </div>
                        <div className="flex-1 space-y-3">
                          <div>
                            <p className="font-bold text-gray-900 text-base leading-tight">
                              {userName}
                            </p>
                            <p className="text-sm text-gray-500 mt-0.5">
                              {req.user.email}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1.5 text-sm text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">
                              <Phone className="h-3.5 w-3.5 text-gray-400" />
                              {req.user.phoneNumber || "No phone"}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-sm text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">
                              <Clock className="h-3.5 w-3.5 text-gray-400" />
                              {formatDate(req.createdAt)}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-xs font-mono text-gray-600 bg-gray-100 border border-gray-200 rounded-lg px-3 py-1.5 tracking-wider">
                              Reference Code: {req.referenceCode}
                            </span>
                          </div>

                          {/* Proof image */}
                          {req.proofImageUrl ? (
                            <div className="flex items-center gap-3">
                              <a
                                href={req.proofImageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex items-center gap-2"
                              >
                                <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex-shrink-0">
                                  <img
                                    src={req.proofImageUrl}
                                    alt="Proof"
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center">
                                    <ExternalLink className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition" />
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-green-700">
                                    Payment Proof Uploaded
                                  </p>
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    Click image to view full size
                                  </p>
                                </div>
                              </a>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 w-fit">
                              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                              Waiting for user to upload payment proof
                            </div>
                          )}

                          {req.status === "ACCEPTED" && (
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800">
                              <p className="font-semibold mb-0.5">
                                Verify before releasing credits:
                              </p>
                              <p>
                                GCash number{" "}
                                <strong>{req.user.phoneNumber || "N/A"}</strong>{" "}
                                sent{" "}
                                <strong>
                                  ₱{parseFloat(req.amount).toFixed(2)}
                                </strong>
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Amount + Actions */}
                      <div className="flex flex-col items-end gap-3 lg:min-w-[180px]">
                        <div className="text-right">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                            Amount
                          </p>
                          <p className="text-3xl font-extrabold text-gray-900 leading-tight">
                            ₱{parseFloat(req.amount).toFixed(2)}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 w-full">
                          {req.status === "PENDING" && (
                            <>
                              <Button
                                onClick={() => handleAcceptTopUp(req.id)}
                                disabled={isLoading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                              >
                                {isLoading ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                ) : (
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                )}
                                Accept Request
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => handleRejectTopUp(req.id)}
                                disabled={isLoading}
                                className="w-full text-red-600 border-red-200 hover:bg-red-50 rounded-xl"
                              >
                                <XCircle className="h-4 w-4 mr-1" /> Reject
                              </Button>
                            </>
                          )}
                          {req.status === "ACCEPTED" && (
                            <>
                              <Button
                                onClick={() => handleReleaseCredits(req.id)}
                                disabled={isLoading}
                                className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl"
                              >
                                {isLoading ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                ) : (
                                  <DollarSign className="h-4 w-4 mr-1" />
                                )}
                                Release Credits
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => handleRejectTopUp(req.id)}
                                disabled={isLoading}
                                className="w-full text-red-600 border-red-200 hover:bg-red-50 rounded-xl"
                              >
                                <XCircle className="h-4 w-4 mr-1" /> Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ─── Withdrawals Tab ─── */}
        <TabsContent value="withdrawals" className="mt-4">
          {loadingWithdraws ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : filteredWithdrawals.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <ArrowDownCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">{refQuery ? "No matching withdrawal requests" : "No pending withdrawal requests"}</p>
                <p className="text-sm">
                  {refQuery ? `No reference code matches "${refSearch}"` : "New requests will appear here automatically"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredWithdrawals.map((req) => {
                const isLoading = actionLoading === req.id;
                const userName =
                  `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim() ||
                  req.user.email;
                const initials =
                  [req.user.firstName, req.user.lastName]
                    .filter(Boolean)
                    .map((n) => n![0])
                    .join("")
                    .toUpperCase() || "?";

                return (
                  <div
                    id={`request-${req.id}`}
                    key={req.id}
                    className={`bg-white rounded-2xl border border-orange-200 overflow-hidden shadow-sm transition-all ${requestId === req.id ? "ring-2 ring-[#C94B1E] ring-offset-2" : ""}`}
                  >
                    {/* Status strip */}
                    <div className="px-5 py-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-orange-50 text-orange-700 border-b border-orange-100">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                      Pending Withdrawal
                      <span className="ml-auto text-gray-400 normal-case font-normal">
                        {formatDate(req.createdAt)}
                      </span>
                    </div>

                    <div className="p-5 flex flex-col lg:flex-row gap-5">
                      {/* User + details */}
                      <div className="flex-1 flex gap-4">
                        <div className="w-11 h-11 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0 text-orange-600 font-bold text-sm border border-orange-100">
                          {initials}
                        </div>
                        <div className="flex-1 space-y-3">
                          <div>
                            <p className="font-bold text-gray-900 text-base leading-tight">
                              {userName}
                            </p>
                            <p className="text-sm text-gray-500 mt-0.5">
                              {req.user.email}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1.5 text-sm text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">
                              <Phone className="h-3.5 w-3.5 text-gray-400" />
                              {req.user.phoneNumber || "No phone"}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-xs font-mono text-gray-600 bg-gray-100 border border-gray-200 rounded-lg px-3 py-1.5 tracking-wider">
                              Reference Code: {req.referenceNumber}
                            </span>
                          </div>

                          {/* GCash send-to block */}
                          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <ArrowDownCircle className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">
                                Send via GCash
                              </p>
                              <p className="text-sm font-bold text-blue-900 mt-0.5">
                                {req.user.phoneNumber || "No phone number"}
                              </p>
                              <p className="text-xs text-blue-600">
                                {userName}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Amount + Actions */}
                      <div className="flex flex-col items-end gap-3 lg:min-w-[180px]">
                        <div className="text-right">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                            Withdraw Amount
                          </p>
                          <p className="text-3xl font-extrabold text-orange-600 leading-tight">
                            ₱{parseFloat(req.amount).toFixed(2)}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 w-full">
                          <Button
                            onClick={() => handleApproveWithdraw(req.id)}
                            disabled={isLoading}
                            className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl"
                          >
                            {isLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-1" />
                            )}
                            Approve & Mark Sent
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleRejectWithdraw(req.id)}
                            disabled={isLoading}
                            className="w-full text-red-600 border-red-200 hover:bg-red-50 rounded-xl"
                          >
                            <XCircle className="h-4 w-4 mr-1" /> Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ─── All Transactions Tab ─── */}
        <TabsContent value="all" className="mt-4">
          {loadingAll ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : allTopUps.length === 0 && allWithdraws.length === 0 && !refQuery ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <History className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No transactions yet</p>
                <p className="text-sm">
                  All top-up and withdrawal requests will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm divide-y divide-gray-100">
                {filteredAllTransactions.length === 0 ? (
                  <div className="py-12 text-center text-gray-500">
                    <Search className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No matching transactions</p>
                    <p className="text-sm">{`No reference code matches "${refSearch}"`}</p>
                  </div>
                ) : null}
                {filteredAllTransactions.map((req) => {
                  const userName =
                    `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim() ||
                    req.user.email;
                  const initials =
                    [req.user.firstName, req.user.lastName]
                      .filter(Boolean)
                      .map((n) => n![0])
                      .join("")
                      .toUpperCase() || "?";
                  const isTopUp = req._type === "topup";

                  return (
                    <div
                      id={`request-${req.id}`}
                      key={`${req._type}-${req.id}`}
                      className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors ${requestId === req.id ? "bg-orange-50/40" : ""}`}
                    >
                      {/* Type icon */}
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isTopUp ? "bg-blue-50" : "bg-orange-50"}`}
                      >
                        {isTopUp ? (
                          <ArrowUpCircle className="h-5 w-5 text-blue-500" />
                        ) : (
                          <ArrowDownCircle className="h-5 w-5 text-orange-500" />
                        )}
                      </div>

                      {/* User avatar */}
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${isTopUp ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}
                      >
                        {initials}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 text-sm truncate">
                            {userName}
                          </span>
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full ${isTopUp ? "bg-blue-50 text-blue-700" : "bg-orange-50 text-orange-700"}`}
                          >
                            {isTopUp ? "Top-Up" : "Withdrawal"}
                          </span>
                          <StatusBadge status={req.status} />
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(req.createdAt)}
                          </span>
                          {isTopUp && "referenceCode" in req && (
                            <span className="font-mono text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                              Reference Code: {(req as TopUpRequest).referenceCode}
                            </span>
                          )}
                          {!isTopUp && "referenceNumber" in req && (
                            <span className="font-mono text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                              Reference Code: {(req as WithdrawRequest).referenceNumber}
                            </span>
                          )}
                          {isTopUp && (req as TopUpRequest).proofImageUrl ? (
                            <a
                              href={(req as TopUpRequest).proofImageUrl!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 hover:text-green-800"
                            >
                              <ImageIcon className="h-3 w-3" /> View Proof{" "}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : isTopUp ? (
                            <span className="text-xs text-amber-600 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" /> No proof
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="text-right flex-shrink-0">
                        <p
                          className={`text-base font-extrabold ${isTopUp ? "text-blue-700" : "text-orange-600"}`}
                        >
                          {isTopUp ? "+" : "−"}₱
                          {parseFloat(req.amount).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {req.user.phoneNumber || "—"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {allTransactionsTotalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-8">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAllPage((p) => Math.max(1, p - 1))}
                    disabled={currentAllPage <= 1 || loadingAll}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {currentAllPage} of {allTransactionsTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setAllPage((p) =>
                        Math.min(allTransactionsTotalPages, p + 1),
                      )
                    }
                    disabled={
                      currentAllPage >= allTransactionsTotalPages || loadingAll
                    }
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Reject Reason Dialog */}
      {rejectDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-50">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Reject Top-Up Request
                </h2>
                <p className="text-sm text-gray-500">
                  The user will be notified with this reason.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Reason{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <Textarea
                placeholder="e.g. Incorrect amount sent, GCash number did not match..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setRejectDialog(null);
                  setRejectReason("");
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={confirmRejectTopUp}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Confirm Reject
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
