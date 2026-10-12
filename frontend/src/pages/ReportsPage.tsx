import React, { useState, useEffect } from "react";
import {
  FileBarChart,
  Download,
  Boxes,
  ArrowLeftRight,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { api, type DashboardKPIs } from "../lib/api";
import { formatINR, formatUnits } from "../lib/formatters";
import { BrandedLoader } from "../components/BrandedLoader";

export const ReportsPage: React.FC = () => {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDashboardKPIs();
      setKpis(data);
    } catch (err: any) {
      setError(err.message || "Failed to load report summary statistics");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (type: string) => {
    setDownloading(type);
    setError(null);
    try {
      await api.downloadReport(type as any);
    } catch (err: any) {
      setError(err.message || "Failed to download CSV report");
    } finally {
      setDownloading(null);
    }
  };

  const reportsList = [
    {
      id: "inventory",
      title: "Current Stock Valuation Report",
      filename: "inventory.csv",
      description:
        "Snapshot of all products in your store, available stock quantities, unit purchase costs, selling prices, and total stock value in INR.",
      icon: Boxes,
      color: "coral",
      url: api.getReportUrl("inventory"),
      stat: kpis ? formatINR(kpis.total_inventory_value) : "...",
      statLabel: "Value of Current Stock",
    },
    {
      id: "movements",
      title: "Sales & Stock History Ledger",
      filename: "movements.csv",
      description:
        "Complete transaction history of all recorded sales, supplier receipts, customer returns, and stock count adjustments.",
      icon: ArrowLeftRight,
      color: "plum",
      url: api.getReportUrl("movements"),
      stat: kpis ? `${formatUnits(kpis.recent_movements.length, 0)} recorded` : "...",
      statLabel: "Recent Activity",
    },
    {
      id: "reorder",
      title: "What to Restock First Report",
      filename: "reorder.csv",
      description:
        "Export products needing attention, recommended order quantities, and supplier delivery windows.",
      icon: ShoppingCart,
      color: "amber",
      url: api.getReportUrl("reorder"),
      stat: kpis ? `${formatUnits(kpis.low_stock_count, 0)} items low` : "...",
      statLabel: "Products Needing Restock",
    },
    {
      id: "forecast",
      title: "Expected Sales Projections Report",
      filename: "forecast.csv",
      description:
        "Summary of expected sales volume, daily sales estimates, and comparison with recent sales averages.",
      icon: TrendingUp,
      color: "mint",
      url: api.getReportUrl("forecast"),
      stat: "7-30 Days",
      statLabel: "How Far Ahead",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8 animate-fade-in-up">
      {/* Header Banner */}
      <div className="bg-hero-dark rounded-2xl p-6 sm:p-8 text-cream border border-plum-border shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-coral/15 border border-coral/30 text-coral text-xs font-semibold">
            <FileBarChart size={14} />
            <span>Auditing & Data Exports</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Reports & CSV Exports
          </h1>
          <p className="text-sm text-mauve/90 max-w-2xl leading-relaxed">
            Generate and download standard CSV exports directly calculated from database records. Suitable for external audits, supplier procurement orders, and executive reporting.
          </p>
        </div>

        <button
          onClick={loadStats}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-coral hover:bg-coral-hover text-white font-semibold text-xs transition shadow-md active:scale-95 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Refresh Metadata</span>
        </button>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 rounded-xl bg-coral/15 border border-coral/40 text-ink text-xs flex items-center gap-3">
          <AlertTriangle size={16} className="text-coral shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Reports Grid */}
      {loading ? (
        <div className="bg-paper rounded-2xl p-8 border border-cream-dark/60 shadow-sm">
          <BrandedLoader
            message="Preparing your store reports..."
            submessage="Retrieving inventory records and valuation summaries"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reportsList.map((rep) => {
            const Icon = rep.icon;
            return (
              <div
                key={rep.id}
                className="bg-paper rounded-2xl p-6 border border-cream-dark/60 shadow-sm flex flex-col justify-between gap-6 hover:border-plum/40 transition"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-plum/10 text-plum flex items-center justify-center font-bold">
                      <Icon size={20} />
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-ink-muted uppercase block">
                        {rep.statLabel}
                      </span>
                      <span className="text-base font-extrabold text-ink">{rep.stat}</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-ink">{rep.title}</h3>
                    <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                      {rep.description}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-cream-dark/60 flex items-center justify-between">
                  <span className="font-mono text-[11px] text-ink-subtle">
                    Format: {rep.filename}
                  </span>
                  <button
                    onClick={() => handleDownload(rep.id)}
                    disabled={downloading === rep.id}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-plum hover:bg-plum-light text-cream font-bold text-xs transition shadow-sm active:scale-95 btn-interactive disabled:opacity-50"
                  >
                    <Download size={14} className={downloading === rep.id ? "animate-bounce" : ""} />
                    <span>{downloading === rep.id ? "Downloading..." : "Download CSV"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Audit Integrity Notice */}
      <div className="bg-cream-light rounded-2xl p-6 border border-cream-dark text-xs text-ink-muted space-y-2">
        <h4 className="font-bold text-ink text-sm">Data Integrity & Compliance Guarantee</h4>
        <p className="leading-relaxed">
          All reports reflect actual persisted SQLite / PostgreSQL database rows. CSV exports are streamed directly from server-side query cursors and include full column headers with standardized ISO 8601 timestamps and decimal-precision monetary values.
        </p>
      </div>
    </div>
  );
};
