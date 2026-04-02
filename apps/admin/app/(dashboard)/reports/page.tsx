"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Download,
  TrendingUp,
  TrendingDown,
  Hourglass,
  Loader2,
  AlertCircle,
  FileText,
  Sheet,
  DollarSign,
  Percent,
} from "lucide-react";
import api from "../../../src/lib/api";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  ChartContainer,
  type ChartConfig,
} from "../../../src/components/ui/chart";

// --- Interfaces ---
interface FinancialStats {
  totalRevenue: number;
  totalCommission: number;
  totalPlatformFee: number;
  totalHostPayout: number;
  commissionRate: number;
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
  platformFee: number;
  hostPayout: number;
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

// Chart configs
const trendChartConfig: ChartConfig = {
  revenue: { label: "Total Revenue", color: "#C94B1E" },
  platformFee: { label: "Platform Fee", color: "#f59e0b" },
  hostPayout: { label: "Host Payout", color: "#3b82f6" },
};

const distributionChartConfig: ChartConfig = {
  platformFee: { label: "Platform Fee", color: "#f59e0b" },
  hostPayout: { label: "Host Payout", color: "#C94B1E" },
};

const PIE_COLORS = ["#C94B1E", "#f59e0b"];

// Custom tooltip for area chart
const AreaTooltipContent = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
      <p className="mb-1.5 font-medium text-foreground">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 py-0.5">
          <span
            className="h-2 w-2 shrink-0 rounded-[2px]"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">
            {trendChartConfig[entry.name]?.label ?? entry.name}:
          </span>
          <span className="ml-auto font-mono font-medium tabular-nums">
            {formatCurrencyPlain(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

// Custom tooltip for pie chart
const PieTooltipContent = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
}) => {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
      <p className="font-medium">{entry.name}</p>
      <p className="font-mono font-medium tabular-nums text-muted-foreground">
        {formatCurrencyPlain(entry.value)}
      </p>
    </div>
  );
};

export default function FinancialReportsPage() {
  const [financialStats, setFinancialStats] = useState<FinancialStats | null>(
    null,
  );
  const [transactions, setTransactions] = useState<RecentTransaction[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrendPoint[]>([]);
  const [transactionActorFilter, setTransactionActorFilter] = useState<
    "ALL" | "DRIVER" | "HOST"
  >("ALL");
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
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(e.target as Node)
      ) {
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
        api.get<FinancialStats>(
          `/dashboard/financial-stats?startDate=${startDate}&endDate=${endOfDay}`,
        ),
        api.get<RecentTransaction[]>(
          `/dashboard/recent-transactions?includeAll=true&actorType=${transactionActorFilter}&startDate=${startDate}&endDate=${endOfDay}`,
        ),
        api.get<RevenueTrendPoint[]>(
          `/dashboard/revenue-trend?startDate=${startDate}&endDate=${endOfDay}`,
        ),
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

  const dateRangeLabel = `${startDate} to ${endDate}`;
  const reportTitle = `Financial Report — ${dateRangeLabel}`;

  // Chart data derived from trend
  const trendChartData = useMemo(
    () =>
      revenueTrend.map((point) => ({
        date: new Date(point.date).toLocaleDateString("en-PH", {
          month: "short",
          day: "numeric",
        }),
        revenue: point.revenue,
        platformFee: point.platformFee,
        hostPayout: point.hostPayout,
      })),
    [revenueTrend],
  );

  const distributionData = useMemo(() => {
    const platformFee =
      financialStats?.totalPlatformFee ?? financialStats?.totalCommission ?? 0;
    const hostPayout = financialStats?.totalHostPayout ?? 0;
    return [
      { name: "Host Payout", value: hostPayout },
      { name: "Platform Fee", value: platformFee },
    ];
  }, [financialStats]);

  // Bar chart: daily platformFee vs hostPayout breakdown (last 7 data points)
  const breakdownData = useMemo(() => {
    const sliced = trendChartData.slice(-Math.min(14, trendChartData.length));
    return sliced.filter((d) => d.revenue > 0);
  }, [trendChartData]);

  // --- Export helpers ---
  const getExportData = () => ({
    summary: [
      ["Metric", "Value"],
      ["Total Revenue", formatCurrencyPlain(financialStats?.totalRevenue || 0)],
      [
        "Total Platform Fee",
        formatCurrencyPlain(
          financialStats?.totalPlatformFee ?? financialStats?.totalCommission ?? 0,
        ),
      ],
      [
        "Total Host Payout",
        formatCurrencyPlain(financialStats?.totalHostPayout || 0),
      ],
      [
        "Commission Rate",
        `${((financialStats?.commissionRate || 0.1) * 100).toFixed(1)}%`,
      ],
      [
        "Pending Payouts to Hosts",
        formatCurrencyPlain(financialStats?.pendingPayouts || 0),
      ],
      [
        "Revenue Change vs Prior Period",
        `${(financialStats?.revenueChange || 0) >= 0 ? "+" : ""}${financialStats?.revenueChange || 0}%`,
      ],
    ],
    trend: [
      ["Date", "Revenue (PHP)", "Platform Fee (PHP)", "Host Payout (PHP)"],
      ...revenueTrend.map((p) => [p.date, p.revenue, p.platformFee, p.hostPayout]),
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

      doc.setFontSize(18);
      doc.setTextColor(30, 30, 30);
      doc.text(reportTitle, 14, 18);

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleString("en-PH")}`, 14, 25);

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

      const afterSummary =
        ((
          doc as InstanceType<typeof jsPDF> & {
            lastAutoTable?: { finalY: number };
          }
        ).lastAutoTable?.finalY ?? 38) + 10;
      doc.setFontSize(13);
      doc.setTextColor(30, 30, 30);
      doc.text("Daily Revenue Trend", 14, afterSummary);

      autoTable(doc, {
        startY: afterSummary + 4,
        head: [data.trend[0] as string[]],
        body: data.trend.slice(1) as (string | number)[][],
        headStyles: { fillColor: headerColor, textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [245, 250, 249] },
        margin: { left: 14, right: 14 },
      });

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

      const summaryWs = XLSX.utils.aoa_to_sheet([
        [reportTitle],
        [`Generated: ${new Date().toLocaleString("en-PH")}`],
        [],
        ...data.summary,
      ]);
      summaryWs["!cols"] = [{ wch: 36 }, { wch: 22 }];
      XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

      const trendWs = XLSX.utils.aoa_to_sheet(data.trend);
      trendWs["!cols"] = [{ wch: 14 }, { wch: 18 }, { wch: 20 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(wb, trendWs, "Daily Trend");

      const trxWs = XLSX.utils.aoa_to_sheet(data.transactions);
      trxWs["!cols"] = [
        { wch: 38 },
        { wch: 22 },
        { wch: 10 },
        { wch: 30 },
        { wch: 22 },
        { wch: 16 },
      ];
      XLSX.utils.book_append_sheet(wb, trxWs, "Transactions");

      XLSX.writeFile(wb, `financial-report-${startDate}-${endDate}.xlsx`);
    } catch (err) {
      console.error("Excel export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#F9FAFB] min-h-full font-sans p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#C94B1E]" />
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
            className="px-4 py-2 bg-[#C94B1E] text-white rounded-lg hover:bg-[#A83A16]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const platformFee =
    financialStats?.totalPlatformFee ?? financialStats?.totalCommission ?? 0;
  const hostPayout = financialStats?.totalHostPayout ?? 0;
  const commissionRatePct = ((financialStats?.commissionRate ?? 0.1) * 100).toFixed(1);
  const hostRatePct = (100 - parseFloat(commissionRatePct)).toFixed(1);

  return (
    <div className="bg-[#F9FAFB] min-h-full font-sans p-8">
      {/* Page Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Financial Reports</h1>

        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-lg shadow-sm">
            <label className="text-xs font-medium text-gray-500 shrink-0">
              From
            </label>
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="text-sm text-gray-700 outline-none bg-transparent cursor-pointer"
            />
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-lg shadow-sm">
            <label className="text-xs font-medium text-gray-500 shrink-0">
              To
            </label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="text-sm text-gray-700 outline-none bg-transparent cursor-pointer"
            />
          </div>

          <div ref={exportMenuRef} className="relative">
            <button
              onClick={() => setShowExportMenu((v) => !v)}
              disabled={exporting}
              className="flex items-center gap-2 px-3 py-2 bg-[#C94B1E] hover:bg-[#A83A16] disabled:opacity-60 text-white rounded-lg transition-colors shadow-sm text-sm font-medium"
              title="Export Report"
            >
              {exporting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
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
                    <p className="text-[10px] text-gray-400">
                      3 sheets: summary, trend, transactions
                    </p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {/* Total Revenue */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-500 text-sm font-medium">Total Revenue</h3>
            <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center">
              <DollarSign size={18} className="text-[#C94B1E]" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-3">
            {formatCurrencyPlain(financialStats?.totalRevenue || 0)}
          </p>
          <div
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
              (financialStats?.revenueChange || 0) >= 0
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {(financialStats?.revenueChange || 0) >= 0 ? (
              <TrendingUp size={13} />
            ) : (
              <TrendingDown size={13} />
            )}
            {(financialStats?.revenueChange || 0) >= 0 ? "+" : ""}
            {financialStats?.revenueChange || 0}% vs prior period
          </div>
        </div>

        {/* Platform Fee */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-500 text-sm font-medium">Platform Fee</h3>
            <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center">
              <Percent size={18} className="text-amber-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-3">
            {formatCurrencyPlain(platformFee)}
          </p>
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
            <span className="font-semibold">{commissionRatePct}%</span>
            <span>commission rate</span>
          </div>
        </div>

        {/* Host Payout */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-500 text-sm font-medium">Host Payout</h3>
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
              <DollarSign size={18} className="text-blue-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-3">
            {formatCurrencyPlain(hostPayout)}
          </p>
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
            <span className="font-semibold">{hostRatePct}%</span>
            <span>of total revenue</span>
          </div>
        </div>

        {/* Pending Payouts */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-500 text-sm font-medium">Pending Payouts</h3>
            <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center shrink-0">
              <Hourglass size={18} className="text-orange-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-3">
            {formatCurrencyPlain(financialStats?.pendingPayouts || 0)}
          </p>
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-600">
            Awaiting host payout
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Area Chart: Revenue Trend */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-1">
            Revenue Trend
          </h3>
          <p className="text-xs text-gray-400 mb-5">
            Daily breakdown of total revenue, platform fee, and host payout
          </p>
          {trendChartData.filter((d) => d.revenue > 0).length > 0 ? (
            <ChartContainer config={trendChartConfig} className="h-[280px] w-full">
              <AreaChart
                data={trendChartData}
                margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`}
                  width={48}
                />
                <Tooltip content={<AreaTooltipContent />} />
                <Legend
                  formatter={(value) =>
                    trendChartConfig[value]?.label ?? value
                  }
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#C94B1E"
                  fill="rgba(201,75,30,0.1)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Area
                  type="monotone"
                  dataKey="platformFee"
                  stroke="#f59e0b"
                  fill="rgba(245,158,11,0.1)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Area
                  type="monotone"
                  dataKey="hostPayout"
                  stroke="#3b82f6"
                  fill="rgba(59,130,246,0.08)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ChartContainer>
          ) : (
            <div className="h-[280px] bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-center text-gray-400 text-sm">
              No revenue data in this period
            </div>
          )}
        </div>

        {/* Pie Chart: Revenue Distribution */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-1">
            Revenue Split
          </h3>
          <p className="text-xs text-gray-400 mb-5">
            Platform fee vs host payout
          </p>
          {(financialStats?.totalRevenue || 0) > 0 ? (
            <>
              <div className="flex justify-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={distributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {distributionData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-2 mt-3">
                {distributionData.map((entry, idx) => (
                  <div key={entry.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-[2px] shrink-0"
                        style={{ backgroundColor: PIE_COLORS[idx] }}
                      />
                      <span className="text-gray-600">{entry.name}</span>
                    </div>
                    <span className="font-mono font-semibold text-gray-800">
                      {formatCurrencyPlain(entry.value)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[200px] bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-center text-gray-400 text-sm">
              No revenue data
            </div>
          )}
        </div>
      </div>

      {/* Bar Chart: Daily Fee Breakdown */}
      {breakdownData.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8">
          <h3 className="text-base font-bold text-gray-900 mb-1">
            Daily Fee Breakdown
          </h3>
          <p className="text-xs text-gray-400 mb-5">
            Comparison of platform fee vs host payout per active day
          </p>
          <ChartContainer config={distributionChartConfig} className="h-[240px] w-full">
            <BarChart
              data={breakdownData}
              margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`}
                width={48}
              />
              <Tooltip content={<AreaTooltipContent />} />
              <Legend
                formatter={(value) =>
                  distributionChartConfig[value]?.label ?? value
                }
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="platformFee" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              <Bar dataKey="hostPayout" fill="#C94B1E" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-50">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-gray-900">Transactions</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">User Type</span>
              <select
                value={transactionActorFilter}
                onChange={(e) => {
                  setTransactionActorFilter(
                    e.target.value as "ALL" | "DRIVER" | "HOST",
                  );
                  setCurrentPage(1);
                }}
                className="bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#C94B1E]"
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
                    <tr
                      key={trx.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {trx.id}
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {trx.userName}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{trx.userRole}</td>
                      <td className="px-6 py-4 text-gray-600">{trx.email}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            trx.status === "HOST_PAYOUT"
                              ? "bg-green-100 text-green-700"
                              : trx.status === "RESERVATION_PAYMENT"
                                ? "bg-blue-100 text-blue-700"
                                : trx.status === "REFUND"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {trx.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900">
                        {formatCurrencyPlain(trx.amount)}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>

        {transactions.length > 0 &&
          (() => {
            const totalPages = Math.ceil(transactions.length / PAGE_SIZE);
            const start = (currentPage - 1) * PAGE_SIZE + 1;
            const end = Math.min(currentPage * PAGE_SIZE, transactions.length);
            return (
              <div className="p-4 border-t border-gray-50 flex items-center justify-between text-sm text-gray-500 bg-gray-50/30">
                <span>
                  Showing {start}–{end} of {transactions.length} entries
                </span>
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
