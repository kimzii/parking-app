"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
} from "lucide-react";
import api from "../../../src/lib/api";

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
    PENDING: { label: "Pending", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    ACCEPTED: { label: "Accepted", className: "bg-blue-100 text-blue-700 border-blue-200" },
    APPROVED: { label: "Approved", className: "bg-green-100 text-green-700 border-green-200" },
    REJECTED: { label: "Rejected", className: "bg-red-100 text-red-700 border-red-200" },
    EXPIRED: { label: "Expired", className: "bg-gray-100 text-gray-500 border-gray-200" },
  };
  const s = map[status] || { label: status, className: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${s.className}`}>
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
    tabParam === "withdraw" ? "withdrawals" :
    tabParam === "topup" ? "topups" :
    "topups";

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [topUps, setTopUps] = useState<TopUpRequest[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawRequest[]>([]);
  const [allTopUps, setAllTopUps] = useState<TopUpRequest[]>([]);
  const [allWithdraws, setAllWithdraws] = useState<WithdrawRequest[]>([]);
  const [loadingTopUps, setLoadingTopUps] = useState(true);
  const [loadingWithdraws, setLoadingWithdraws] = useState(true);
  const [loadingAll, setLoadingAll] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [timerTick, setTimerTick] = useState(0);
  const [rejectDialog, setRejectDialog] = useState<{ id: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

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
    if (!confirm("Are you sure you want to release credits for this top-up? This will add funds to the user's wallet.")) return;
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
      await api.patch(`/wallet/top-up/${id}/reject`, { reason: rejectReason.trim() || undefined });
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
    if (!confirm("Are you sure? This will deduct from the user's wallet and mark as sent.")) return;
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
    if (!confirm("Are you sure you want to reject this withdrawal request?")) return;
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

  const pendingTopUps = topUps.filter((t) => t.status === "PENDING");
  const acceptedTopUps = topUps.filter((t) => t.status === "ACCEPTED");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage top-up and withdrawal requests from users
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-50">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending Top-Ups</p>
                <p className="text-2xl font-bold">{pendingTopUps.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50">
                <ArrowUpCircle className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Accepted (Awaiting Payment)</p>
                <p className="text-2xl font-bold">{acceptedTopUps.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-50">
                <ArrowDownCircle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending Withdrawals</p>
                <p className="text-2xl font-bold">{withdrawals.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Pending Value</p>
                <p className="text-2xl font-bold">
                  ₱{[...topUps, ...withdrawals]
                    .reduce((sum, r) => sum + parseFloat(r.amount), 0)
                    .toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
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
          ) : topUps.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <ArrowUpCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No pending top-up requests</p>
                <p className="text-sm">New requests will appear here automatically</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {topUps.map((req) => {
                const isLoading = actionLoading === req.id;
                const userName = `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim() || req.user.email;
                const remaining = req.status === "PENDING" ? getTimeRemaining(req.expiresAt) : null;

                return (
                  <Card id={`request-${req.id}`} key={req.id} className={`border-l-4 transition-all ${
                    req.status === "PENDING" ? "border-l-yellow-400" :
                    req.status === "ACCEPTED" ? "border-l-blue-400" : "border-l-gray-300"
                  } ${requestId === req.id ? "ring-2 ring-[#005f56] ring-offset-2" : ""}`}>
                    <CardContent className="pt-5 pb-4">
                      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                        {/* Left: Info */}
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <StatusBadge status={req.status} />
                            <span className="text-2xl font-bold text-gray-900">
                              ₱{parseFloat(req.amount).toFixed(2)}
                            </span>
                            {remaining && remaining !== "Expired" && (
                              <span className="text-sm font-mono text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                                ⏱ {remaining}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2 text-gray-600">
                              <User className="h-4 w-4" />
                              <span className="font-medium">{userName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <Phone className="h-4 w-4" />
                              <span className="font-medium">{req.user.phoneNumber || "No phone"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-500">
                              <Clock className="h-4 w-4" />
                              <span>{formatDate(req.createdAt)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-500">
                              <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{req.referenceCode}</span>
                            </div>
                          </div>

                          {/* Proof Status */}
                          <div className="mt-3 flex items-center gap-3">
                            {req.proofImageUrl ? (
                              <>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                                  <ImageIcon className="h-3.5 w-3.5" />
                                  Proof Sent
                                </span>
                                <a
                                  href={req.proofImageUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
                                >
                                  View Proof <ExternalLink className="h-3 w-3" />
                                </a>
                              </>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                                <AlertCircle className="h-3.5 w-3.5" />
                                No Proof Yet
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex flex-col gap-2 lg:min-w-[200px]">
                          {req.status === "PENDING" && (
                            <>
                              <Button
                                onClick={() => handleAcceptTopUp(req.id)}
                                disabled={isLoading}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
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
                                className="text-red-600 border-red-200 hover:bg-red-50"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                          {req.status === "ACCEPTED" && (
                            <>
                              <div className="text-xs text-gray-500 mb-1">
                                Verify: sender's GCash number matches <strong>{req.user.phoneNumber}</strong> and amount is <strong>₱{parseFloat(req.amount).toFixed(2)}</strong>
                              </div>
                              <Button
                                onClick={() => handleReleaseCredits(req.id)}
                                disabled={isLoading}
                                className="bg-green-600 hover:bg-green-700 text-white"
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
                                className="text-red-600 border-red-200 hover:bg-red-50"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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
          ) : withdrawals.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <ArrowDownCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No pending withdrawal requests</p>
                <p className="text-sm">New requests will appear here automatically</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {withdrawals.map((req) => {
                const isLoading = actionLoading === req.id;
                const userName = `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim() || req.user.email;

                return (
                  <Card id={`request-${req.id}`} key={req.id} className={`border-l-4 border-l-orange-400 transition-all ${requestId === req.id ? "ring-2 ring-[#005f56] ring-offset-2" : ""}`}>
                    <CardContent className="pt-5 pb-4">
                      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                        {/* Left: Info */}
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3">
                            <StatusBadge status={req.status} />
                            <span className="text-2xl font-bold text-gray-900">
                              ₱{parseFloat(req.amount).toFixed(2)}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2 text-gray-600">
                              <User className="h-4 w-4" />
                              <span className="font-medium">{userName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <Phone className="h-4 w-4" />
                              <span className="font-medium">{req.user.phoneNumber || "No phone"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-500">
                              <Clock className="h-4 w-4" />
                              <span>{formatDate(req.createdAt)}</span>
                            </div>
                          </div>

                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                            <strong>Send to GCash:</strong> {req.user.phoneNumber || "N/A"} ({userName})
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex flex-col gap-2 lg:min-w-[200px]">
                          <Button
                            onClick={() => handleApproveWithdraw(req.id)}
                            disabled={isLoading}
                            className="bg-green-600 hover:bg-green-700 text-white"
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
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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
          ) : allTopUps.length === 0 && allWithdraws.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <History className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No transactions yet</p>
                <p className="text-sm">All top-up and withdrawal requests will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {[
                ...allTopUps.map((t) => ({ ...t, _type: "topup" as const })),
                ...allWithdraws.map((w) => ({ ...w, _type: "withdraw" as const })),
              ]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((req) => {
                  const userName = `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim() || req.user.email;
                  const isTopUp = req._type === "topup";

                  return (
                    <Card id={`request-${req.id}`} key={req.id} className={`border-l-4 transition-all ${
                      isTopUp ? "border-l-blue-300" : "border-l-orange-300"
                    } ${requestId === req.id ? "ring-2 ring-[#005f56] ring-offset-2" : ""}`}>
                      <CardContent className="pt-5 pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
                                isTopUp ? "bg-blue-50 text-blue-700" : "bg-orange-50 text-orange-700"
                              }`}>
                                {isTopUp ? (
                                  <><ArrowUpCircle className="h-3.5 w-3.5" /> Top-Up</>
                                ) : (
                                  <><ArrowDownCircle className="h-3.5 w-3.5" /> Withdrawal</>
                                )}
                              </span>
                              <StatusBadge status={req.status} />
                              <span className="text-xl font-bold text-gray-900">
                                ₱{parseFloat(req.amount).toFixed(2)}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                              <div className="flex items-center gap-2 text-gray-600">
                                <User className="h-4 w-4" />
                                <span className="font-medium">{userName}</span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-600">
                                <Phone className="h-4 w-4" />
                                <span>{req.user.phoneNumber || "No phone"}</span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-500">
                                <Clock className="h-4 w-4" />
                                <span>{formatDate(req.createdAt)}</span>
                              </div>
                            </div>

                            {isTopUp && "referenceCode" in req && (
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                                  {(req as TopUpRequest).referenceCode}
                                </span>
                                {(req as TopUpRequest).proofImageUrl ? (
                                  <>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                                      <ImageIcon className="h-3 w-3" />
                                      Proof Sent
                                    </span>
                                    <a
                                      href={(req as TopUpRequest).proofImageUrl!}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                                    >
                                      View Proof <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                                    <AlertCircle className="h-3 w-3" />
                                    No Proof
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
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
                <h2 className="text-lg font-bold text-gray-900">Reject Top-Up Request</h2>
                <p className="text-sm text-gray-500">The user will be notified with this reason.</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Reason <span className="text-gray-400 font-normal">(optional)</span>
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
                onClick={() => { setRejectDialog(null); setRejectReason(""); }}
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
