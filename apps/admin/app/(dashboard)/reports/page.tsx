"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Download,
  TrendingUp,
  TrendingDown,
  Hourglass,
  Loader2,
  AlertCircle,
  FileText,
  Sheet,
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

const getDefaultStartDate = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
};

const getDefaultEndDate = () => {
  return new Date().toISOString().split("T")[0];
};

const formatCurrencyPlain = (amount: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);

export default function FinancialReportsPage() {
  const [financialStats, setFinancialStats] = useState<FinancialStats | null>(null);
  const [transactions, setTransactions] = useState<RecentTransaction[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrendPoint[]>([]);
  const [transactionActorFilter, setTransactionActorFilter] = useState<"ALL" | "DRIVER" | "HOST">("ALL");
  const [startDate, setStartDate] = useState(getDefaultStartDate());
  const [endDate, setEndDate] = useState(getDefaultEndDate());
  const [currentPage, setCurrentPage] = useState(1);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 30;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchFinancialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const endOfDay = `${endDate}T23:59:59`;

      const [statsRes, transactionsRes, trendRes] = await Promise.all([
        api.get<FinancialStats>(`/dashboard/financial-stats?startDate=${startDate}&endDate=${endOfDay}`),
        api.get<RecentTransaction[]>(`/dashboard/recent-transactions?includeAll=true&actorType=${transactionActorFilter}&startDate=${startDate}&endDate=${endOfDay}`),
        api.get<RevenueTrendPoint[]>(`/dashboard/revenue-trend?startDate=${startDate}&endDate=${endOfDay}`),
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
  }, [transactionActorFilter, startDate, endDate]);

  useEffect(() => {
    fetchFinancialData();
  }, [fetchFinancialData]);

  const formatCurrency = (amount: number) => formatCurrencyPlain(amount);

  const dateRangeLabel = `${startDate} to ${endDate}`;
  const reportTitle = `Financial Report — ${dateRangeLabel}`;

  // --- Export helpers ---

  const getExportData = () => ({
    summary: [
      ["Metric", "Value"],
      ["Total Revenue", formatCurrencyPlain(financialStats?.totalRevenue || 0)],
      ["Total Commission (10%)", formatCurrencyPlain(financialStats?.totalCommission || 0)],
      ["Pending Payouts to Hosts", formatCurrencyPlain(financialStats?.pendingPayouts || 0)],
      ["Revenue Change vs Prior Period", `${(financialStats?.revenueChange || 0) >= 0 ? "+" : ""}${financialStats?.revenueChange || 0}%`],
      ["Commission Change vs Prior Period", `${(financialStats?.commissionChange || 0) >= 0 ? "+" : ""}${financialStats?.commissionChange || 0}%`],
    ],
    trend: [
      ["Date", "Revenue (PHP)", "Commission (PHP)"],
      ...revenueTrend.map((p) => [p.date, p.revenue, p.commission]),
    ],
    transactions: [
      ["Transaction ID", "Username", "Role", "Email", "Type", "Amount (PHP)"],
      ...transactions.map((t) => [
        t.id,
        t.userName,
        t.userRole,
        t.email,
        t.status.replace(/_/g, " "),
        t.amount,
      ]),
    ],
  });

  const exportPDF = async () => {
    setExporting(true);
    setShowExportMenu(false);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ orientation: "landscape" });
      const data = getExportData();

      const headerColor: [number, number, number] = [0, 95, 86];

      // Title
      doc.setFontSize(18);
      doc.setTextColor(30, 30, 30);
      doc.text(reportTitle, 14, 18);

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleString("en-PH")}`, 14, 25);

      // Summary table
      doc.setFontSize(13);
      doc.setTextColor(30, 30, 30);
      doc.text("Summary", 14, 34);

      autoTable(doc, {
        startY: 38,
        head: [data.summary[0] as string[]],
        body: data.summary.slice(1) as string[][],
        headStyles: { fillColor: headerColor, textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [245, 250, 249] },
        margin: { left: 14, right: 14 },
      });

      // Revenue trend table
      const afterSummary = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
      doc.setFontSize(13);
      doc.setTextColor(30, 30, 30);
      doc.text("Daily Revenue & Commission Trend", 14, afterSummary);

      autoTable(doc, {
        startY: afterSummary + 4,
        head: [data.trend[0] as string[]],
        body: data.trend.slice(1) as (string | number)[][],
        headStyles: { fillColor: headerColor, textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [245, 250, 249] },
        margin: { left: 14, right: 14 },
      });

      // Transactions table — new page
      doc.addPage();
      doc.setFontSize(13);
      doc.setTextColor(30, 30, 30);
      doc.text("Transactions", 14, 18);

      autoTable(doc, {
        startY: 22,
        head: [data.transactions[0] as string[]],
        body: data.transactions.slice(1) as (string | number)[][],
        headStyles: { fillColor: headerColor, textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [245, 250, 249] },
        margin: { left: 14, right: 14 },
        columnStyles: { 0: { cellWidth: 60 } },
      });

      doc.save(`financial-report-${startDate}-${endDate}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  const exportExcel = async () => {
    setExporting(true);
    setShowExportMenu(false);
    try {
      const XLSX = await import("xlsx");
      const data = getExportData();
      const wb = XLSX.utils.book_new();

      // Summary sheet
      const summaryWs = XLSX.utils.aoa_to_sheet([
        [reportTitle],
        [`Generated: ${new Date().toLocaleString("en-PH")}`],
        [],
        ...data.summary,
      ]);
      summaryWs["!cols"] = [{ wch: 36 }, { wch: 22 }];
      XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

      // Trend sheet
      const trendWs = XLSX.utils.aoa_to_sheet(data.trend);
      trendWs["!cols"] = [{ wch: 14 }, { wch: 18 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(wb, trendWs, "Daily Trend");

      // Transactions sheet
      const trxWs = XLSX.utils.aoa_to_sheet(data.transactions);
      trxWs["!cols"] = [{ wch: 38 }, { wch: 22 }, { wch: 10 }, { wch: 30 }, { wch: 22 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, trxWs, "Transactions");

      XLSX.writeFile(wb, `financial-report-${startDate}-${endDate}.xlsx`);
    } catch (err) {
      console.error("Excel export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  // Line chart data
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
        labels: { usePointStyle: true, padding: 20 },
      },
      tooltip: {
        callbacks: {
          label: (context: { dataset: { label?: string }; parsed: { y: number | null } }) => {
            const label = context.dataset.label || "";
            const value = context.parsed.y;
            return `${label}: ${formatCurrencyPlain(value || 0)}`;
          },
        },
      },
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: number | string) =>
            typeof value === "number" ? `₱${value.toLocaleString()}` : value,
        },
      },
    },
  }), []);

  const doughnutChartData = useMemo(() => {
    const totalRevenue = financialStats?.totalRevenue || 0;
    const totalCommission = financialStats?.totalCommission || 0;
    const hostPayout = totalRevenue - totalCommission;
    return {
      labels: ["Host Payout (90%)", "Platform Commission (10%)"],
      datasets: [{
        data: [hostPayout, totalCommission],
        backgroundColor: ["#005f56", "#f59e0b"],
        borderColor: ["#ffffff", "#ffffff"],
        borderWidth: 3,
        hoverOffset: 8,
      }],
    };
  }, [financialStats]);

  const doughnutChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: "60%",
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: { usePointStyle: true, padding: 20 },
      },
      tooltip: {
        callbacks: {
          label: (context: { label?: string; parsed: number }) =>
            `${context.label || ""}: ${formatCurrencyPlain(context.parsed || 0)}`,
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

        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          {/* Date Range Filter */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-lg shadow-sm">
            <label className="text-xs font-medium text-gray-500 shrink-0">From</label>
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
              className="text-sm text-gray-700 outline-none bg-transparent cursor-pointer"
            />
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-lg shadow-sm">
            <label className="text-xs font-medium text-gray-500 shrink-0">To</label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
              className="text-sm text-gray-700 outline-none bg-transparent cursor-pointer"
            />
          </div>

          {/* Export Button with dropdown */}
          <div ref={exportMenuRef} className="relative">
            <button
              onClick={() => setShowExportMenu((v) => !v)}
              disabled={exporting}
              className="flex items-center gap-2 px-3 py-2 bg-[#005f56] hover:bg-[#004d40] disabled:opacity-60 text-white rounded-lg transition-colors shadow-sm text-sm font-medium"
              title="Export Report"
            >
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Export
            </button>

            {showExportMenu && (
              <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-xl shadow-lg border border-gray-200 py-1.5 z-50">
                <p className="px-3 pt-1 pb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  Export as
                </p>
                <button
                  onClick={exportPDF}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-7 h-7 bg-red-50 rounded-md flex items-center justify-center shrink-0">
                    <FileText size={14} className="text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">PDF</p>
                    <p className="text-[10px] text-gray-400">Formatted report</p>
                  </div>
                </button>
                <button
                  onClick={exportExcel}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-7 h-7 bg-green-50 rounded-md flex items-center justify-center shrink-0">
                    <Sheet size={14} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Excel</p>
                    <p className="text-[10px] text-gray-400">3 sheets: summary, trend, transactions</p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
          <h3 className="text-gray-500 text-sm font-medium mb-2">Total Revenue</h3>
          <p className="text-3xl font-bold text-gray-900 mb-4">
            {formatCurrency(financialStats?.totalRevenue || 0)}
          </p>
          <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium ${
            (financialStats?.revenueChange || 0) >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}>
            {(financialStats?.revenueChange || 0) >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            {(financialStats?.revenueChange || 0) >= 0 ? "+" : ""}{financialStats?.revenueChange || 0}%
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
          <h3 className="text-gray-500 text-sm font-medium mb-2">Total Commission (10%)</h3>
          <p className="text-3xl font-bold text-gray-900 mb-4">
            {formatCurrency(financialStats?.totalCommission || 0)}
          </p>
          <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium ${
            (financialStats?.commissionChange || 0) >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}>
            {(financialStats?.commissionChange || 0) >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            {(financialStats?.commissionChange || 0) >= 0 ? "+" : ""}{financialStats?.commissionChange || 0}%
          </div>
        </div>

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
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-gray-900">Transactions</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">User Type</span>
              <select
                value={transactionActorFilter}
                onChange={(e) => {
                  setTransactionActorFilter(e.target.value as "ALL" | "DRIVER" | "HOST");
                  setCurrentPage(1);
                }}
                className="bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#005f56]"
              >
                <option value="ALL">All</option>
                <option value="DRIVER">Drivers</option>
                <option value="HOST">Hosts</option>
              </select>
            </div>
          </div>
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
                transactions
                  .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
                  .map((trx) => (
                    <tr key={trx.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{trx.id}</td>
                      <td className="px-6 py-4 font-semibold text-gray-900">{trx.userName}</td>
                      <td className="px-6 py-4 text-gray-600">{trx.userRole}</td>
                      <td className="px-6 py-4 text-gray-600">{trx.email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          trx.status === "HOST_PAYOUT" ? "bg-green-100 text-green-700" :
                          trx.status === "RESERVATION_PAYMENT" ? "bg-blue-100 text-blue-700" :
                          trx.status === "REFUND" ? "bg-yellow-100 text-yellow-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {trx.status.replace(/_/g, " ")}
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

        {transactions.length > 0 && (() => {
          const totalPages = Math.ceil(transactions.length / PAGE_SIZE);
          const start = (currentPage - 1) * PAGE_SIZE + 1;
          const end = Math.min(currentPage * PAGE_SIZE, transactions.length);
          return (
            <div className="p-4 border-t border-gray-50 flex items-center justify-between text-sm text-gray-500 bg-gray-50/30">
              <span>Showing {start}–{end} of {transactions.length} entries</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => p - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-gray-600 font-medium">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          );
        })()}
      </div>

    </div>
  );
}
