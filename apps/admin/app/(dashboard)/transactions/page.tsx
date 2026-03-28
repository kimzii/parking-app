"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Image as ImageIcon,
  ExternalLink,
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
  const [topUps, setTopUps] = useState<TopUpRequest[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawRequest[]>([]);
  const [loadingTopUps, setLoadingTopUps] = useState(true);
  const [loadingWithdraws, setLoadingWithdraws] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const [timerTick, setTimerTick] = useState(0);

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

  useEffect(() => {
    fetchTopUps();
    fetchWithdrawals();
    // Poll every 10 seconds for new requests
    const interval = setInterval(() => {
      fetchTopUps();
      fetchWithdrawals();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchTopUps, fetchWithdrawals]);

  // Timer tick for countdown display
  useEffect(() => {
    const timer = setInterval(() => setTimerTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

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

  const handleRejectTopUp = async (id: string) => {
    if (!confirm("Are you sure you want to reject this top-up request?")) return;
    setActionLoading(id);
    try {
      await api.patch(`/wallet/top-up/${id}/reject`);
      await fetchTopUps();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to reject top-up");
    } finally {
      setActionLoading(null);
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
          <CardContent className="pt-6">
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
      <Tabs defaultValue="topups">
        <TabsList>
          <TabsTrigger value="topups">
            <ArrowUpCircle className="h-4 w-4 mr-1" />
            Top-Up Requests ({topUps.length})
          </TabsTrigger>
          <TabsTrigger value="withdrawals">
            <ArrowDownCircle className="h-4 w-4 mr-1" />
            Withdrawals ({withdrawals.length})
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
                  <Card key={req.id} className={`border-l-4 ${
                    req.status === "PENDING" ? "border-l-yellow-400" :
                    req.status === "ACCEPTED" ? "border-l-blue-400" : "border-l-gray-300"
                  }`}>
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

                          {/* Proof Image */}
                          {req.proofImageUrl ? (
                            <div className="mt-3">
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Payment Proof</p>
                              <a
                                href={req.proofImageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <img
                                  src={req.proofImageUrl}
                                  alt="Payment proof"
                                  className="rounded-lg border border-gray-200 shadow-sm max-w-[280px] max-h-[360px] object-contain hover:opacity-90 transition-opacity cursor-pointer"
                                />
                              </a>
                              <a
                                href={req.proofImageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium mt-1"
                              >
                                Open full size <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          ) : req.status === "ACCEPTED" ? (
                            <div className="mt-3 flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                              <AlertCircle className="h-4 w-4" />
                              <span>No proof uploaded yet — user may still be paying</span>
                            </div>
                          ) : null}
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
                  <Card key={req.id} className="border-l-4 border-l-orange-400">
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
      </Tabs>
    </div>
  );
}
