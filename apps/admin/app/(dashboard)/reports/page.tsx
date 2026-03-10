"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Download,
  Calendar,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Hourglass,
  Loader2,
  AlertCircle,
} from "lucide-react";
import api from "../../../src/lib/api";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
} from "chart.js";
import { Line, Doughnut } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

// --- Interfaces ---
interface FinancialStats {
  totalRevenue: number;
  totalCommission: number;
  pendingPayouts: number;
  revenueChange: number;
  commissionChange: number;
}

interface RecentTransaction {
  id: string;
  userName: string;
  userRole: string;
  email: string;
  status: string;
  amount: number;
  createdAt: string;
}

interface RevenueTrendPoint {
  date: string;
  revenue: number;
  commission: number;
}

export default function FinancialReportsPage() {
  const [financialStats, setFinancialStats] = useState<FinancialStats | null>(null);
  const [transactions, setTransactions] = useState<RecentTransaction[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dateFilter = "This Month";

  const fetchFinancialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsRes, transactionsRes, trendRes] = await Promise.all([
        api.get<FinancialStats>("/dashboard/financial-stats"),
        api.get<RecentTransaction[]>("/dashboard/recent-transactions?limit=10"),
        api.get<RevenueTrendPoint[]>("/dashboard/revenue-trend"),
      ]);

      setFinancialStats(statsRes.data);
      setTransactions(transactionsRes.data);
      setRevenueTrend(trendRes.data);
    } catch (err) {
      console.error("Error fetching financial data:", err);
      setError("Failed to load financial data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFinancialData();
  }, [fetchFinancialData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Line chart data for Revenue & Commission Trend
  const lineChartData = useMemo(() => ({
    labels: revenueTrend.map((point) => {
      const date = new Date(point.date);
      return date.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
    }),
    datasets: [
      {
        label: "Revenue",
        data: revenueTrend.map((point) => point.revenue),
        borderColor: "#005f56",
        backgroundColor: "rgba(0, 95, 86, 0.1)",
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: "#005f56",
      },
      {
        label: "Commission",
        data: revenueTrend.map((point) => point.commission),
        borderColor: "#f59e0b",
        backgroundColor: "rgba(245, 158, 11, 0.1)",
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: "#f59e0b",
      },
    ],
  }), [revenueTrend]);

  const lineChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        callbacks: {
          label: (context: { dataset: { label?: string }; parsed: { y: number | null } }) => {
            const label = context.dataset.label || "";
            const value = context.parsed.y;
            return `${label}: ${formatCurrency(value || 0)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: number | string) => {
            if (typeof value === "number") {
              return `₱${value.toLocaleString()}`;
            }
            return value;
          },
        },
      },
    },
  }), []);

  // Doughnut chart data for Revenue by Host Type
  const doughnutChartData = useMemo(() => {
    const totalRevenue = financialStats?.totalRevenue || 0;
    const totalCommission = financialStats?.totalCommission || 0;
    const hostPayout = totalRevenue - totalCommission;

    return {
      labels: ["Host Payout (90%)", "Platform Commission (10%)"],
      datasets: [
        {
          data: [hostPayout, totalCommission],
          backgroundColor: ["#005f56", "#f59e0b"],
          borderColor: ["#ffffff", "#ffffff"],
          borderWidth: 3,
          hoverOffset: 8,
        },
      ],
    };
  }, [financialStats]);

  const doughnutChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: "60%",
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        callbacks: {
          label: (context: { label?: string; parsed: number }) => {
            const label = context.label || "";
            const value = context.parsed;
            return `${label}: ${formatCurrency(value || 0)}`;
          },
        },
      },
    },
  }), []);

  if (loading) {
    return (
      <div className="bg-[#F9FAFB] min-h-full font-sans p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#005f56]" />
          <p className="text-gray-600">Loading financial data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#F9FAFB] min-h-full font-sans p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-red-500">
          <AlertCircle className="w-8 h-8" />
          <p>{error}</p>
          <button
            onClick={fetchFinancialData}
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

      {/* Page Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Financial Reports</h1>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Date Filter */}
          <button className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
            <Calendar size={18} className="text-gray-500" />
            <span className="text-sm font-medium">{dateFilter}</span>
            <ChevronDown size={18} className="text-gray-500 ml-2" />
          </button>

          {/* Location Filter */}
          <button className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
            <span className="text-sm font-medium">All Locations</span>
            <ChevronDown size={18} className="text-gray-500 ml-2" />
          </button>

          {/* Export Button */}
          <button className="flex items-center justify-center p-2 bg-[#005f56] hover:bg-[#004d40] text-white rounded-lg transition-colors shadow-sm" title="Export Report">
            <Download size={20} />
          </button>
        </div>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

        {/* Total Revenue Card */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
          <h3 className="text-gray-500 text-sm font-medium mb-2">Total Revenue</h3>
          <p className="text-3xl font-bold text-gray-900 mb-4">
            {formatCurrency(financialStats?.totalRevenue || 0)}
          </p>
          <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium ${
            (financialStats?.revenueChange || 0) >= 0
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}>
            {(financialStats?.revenueChange || 0) >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            {(financialStats?.revenueChange || 0) >= 0 ? '+' : ''}{financialStats?.revenueChange || 0}%
          </div>
        </div>

        {/* Total Commission Card */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
          <h3 className="text-gray-500 text-sm font-medium mb-2">Total Commission (10%)</h3>
          <p className="text-3xl font-bold text-gray-900 mb-4">
            {formatCurrency(financialStats?.totalCommission || 0)}
          </p>
          <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium ${
            (financialStats?.commissionChange || 0) >= 0
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}>
            {(financialStats?.commissionChange || 0) >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            {(financialStats?.commissionChange || 0) >= 0 ? '+' : ''}{financialStats?.commissionChange || 0}%
          </div>
        </div>

        {/* Pending Payouts Card */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
          <div>
            <h3 className="text-gray-500 text-sm font-medium mb-2">Pending Payouts to Hosts</h3>
            <p className="text-3xl font-bold text-gray-900">
              {formatCurrency(financialStats?.pendingPayouts || 0)}
            </p>
          </div>
          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600 shrink-0">
            <Hourglass size={24} />
          </div>
        </div>

      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

        {/* Line Chart */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Revenue & Commission Trend</h3>
          <div className="w-full h-[300px]">
            {revenueTrend.length > 0 ? (
              <Line data={lineChartData} options={lineChartOptions} />
            ) : (
              <div className="w-full h-full bg-gray-50 rounded-lg border border-gray-100 flex flex-col items-center justify-center text-gray-400">
                <p className="text-sm font-medium">No data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Doughnut Chart */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Revenue Distribution</h3>
          <div className="w-full h-[300px]">
            {(financialStats?.totalRevenue || 0) > 0 ? (
              <Doughnut data={doughnutChartData} options={doughnutChartOptions} />
            ) : (
              <div className="w-full h-full bg-gray-50 rounded-lg border border-gray-100 flex flex-col items-center justify-center text-gray-400">
                <p className="text-sm font-medium">No revenue data available</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-50">
          <h2 className="text-xl font-bold text-gray-900">Recent Transactions</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">Transaction ID</th>
                <th className="px-6 py-4">Username</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Email Address</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No transactions found
                  </td>
                </tr>
              ) : (
                transactions.map((trx) => (
                  <tr key={trx.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{trx.id}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900">{trx.userName}</td>
                    <td className="px-6 py-4 text-gray-600">{trx.userRole}</td>
                    <td className="px-6 py-4 text-gray-600">{trx.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        trx.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                        trx.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {trx.status.charAt(0) + trx.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900">
                      {formatCurrency(trx.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Placeholder */}
        <div className="p-4 border-t border-gray-50 flex items-center justify-between text-sm text-gray-500 bg-gray-50/30">
          <span>Showing 1 to {transactions.length} of {transactions.length} entries</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-50" disabled>Previous</button>
            <button className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-100">Next</button>
          </div>
        </div>
      </div>

    </div>
  );
}