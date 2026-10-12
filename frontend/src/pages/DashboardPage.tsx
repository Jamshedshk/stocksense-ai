import React, { useEffect, useState } from "react";
import {
  Boxes,
  TrendingUp,
  AlertTriangle,
  Flame,
  Snowflake,
  ArrowUpRight,
  ArrowDownRight,
  PlusCircle,
  FileSpreadsheet,
  ShoppingCart,
  Sparkles,
  PackagePlus,
} from "lucide-react";
import { api, type DashboardKPIs } from "../lib/api";
import {
  formatINR,
  formatUnits,
  formatDailySalesRate,
  formatStockCoverDays,
  formatDateTime,
} from "../lib/formatters";
import { BrandedLoader } from "../components/BrandedLoader";

interface Props {
  onNavigate: (tab: string) => void;
  onOpenAddProduct: () => void;
  onOpenRecordSale: () => void;
  onOpenReceiveStock?: () => void;
}

export const DashboardPage: React.FC<Props> = ({
  onNavigate,
  onOpenAddProduct,
  onOpenRecordSale,
  onOpenReceiveStock,
}) => {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trendDays, setTrendDays] = useState<number>(30);

  const fetchKPIs = async (days: number = trendDays) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getDashboardKPIs({ trend_days: days });
      setKpis(data);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleTrendDaysChange = (days: number) => {
    setTrendDays(days);
    fetchKPIs(days);
  };

  useEffect(() => {
    fetchKPIs(30);
  }, []);

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <BrandedLoader
          message="Loading your store overview..."
          submessage="Preparing your sales and stock balances"
        />
      </div>
    );
  }

  if (error || !kpis) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="p-6 rounded-2xl bg-coral/10 border border-coral/30 text-coral space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <AlertTriangle size={20} /> Unable to load live metrics
          </h2>
          <p className="text-sm">{error}</p>
          <button
            onClick={() => fetchKPIs()}
            className="px-4 py-2 bg-coral text-white font-semibold rounded-lg text-sm shadow hover:bg-coral-hover transition"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-150">
      {/* Hero Strip */}
      <div className="relative overflow-hidden rounded-2xl bg-hero-dark border border-plum-border p-6 sm:p-8 shadow-lg text-white">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-coral/20 border border-coral/30 text-coral text-xs font-bold uppercase tracking-wider">
              <Sparkles size={13} /> Live Store Overview
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Inventory & Sales Overview
            </h1>
            <p className="text-mauve text-sm sm:text-base leading-relaxed">
              See which products may run out soon, what you should restock, and manage your daily sales in Indian Rupees (₹).
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onOpenRecordSale}
              className="flex items-center gap-2 px-4 py-2.5 bg-coral hover:bg-coral-hover text-white rounded-xl font-bold text-sm shadow-md transition active:scale-95 btn-interactive"
            >
              <TrendingUp size={16} /> Record Sale
            </button>
            {onOpenReceiveStock && (
              <button
                onClick={onOpenReceiveStock}
                className="flex items-center gap-2 px-4 py-2.5 bg-mint-dark hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md transition active:scale-95 btn-interactive"
              >
                <PackagePlus size={16} /> Receive Stock
              </button>
            )}
            <button
              onClick={onOpenAddProduct}
              className="flex items-center gap-2 px-4 py-2.5 bg-plum hover:bg-plum-light text-cream rounded-xl font-semibold text-sm border border-plum-border transition active:scale-95 btn-interactive"
            >
              <PlusCircle size={16} /> Add Product
            </button>
            <button
              onClick={() => onNavigate("import-export")}
              className="flex items-center gap-2 px-4 py-2.5 bg-plum hover:bg-plum-light text-cream rounded-xl font-semibold text-sm border border-plum-border transition active:scale-95 btn-interactive"
            >
              <FileSpreadsheet size={16} /> Import CSV
            </button>
          </div>
        </div>
      </div>

      {/* Clean Workspace Empty State Onboarding */}
      {kpis.total_active_products === 0 && (
        <div className="bg-white rounded-2xl border-2 border-dashed border-[#F26B4F]/40 p-8 shadow-sm text-center space-y-4 animate-in fade-in">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#F26B4F]/10 text-[#F26B4F] flex items-center justify-center font-bold">
            <Boxes size={28} />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h2 className="text-xl font-extrabold text-[#24172F]">Your Workspace is Ready</h2>
            <p className="text-xs sm:text-sm text-[#675670] leading-relaxed">
              This workspace starts completely clean with 0 products. Add your first item, import an inventory catalog, or record a sale to test the workflow from scratch.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={onOpenAddProduct}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#F26B4F] hover:bg-[#d95338] text-white rounded-xl font-bold text-xs sm:text-sm shadow-md transition active:scale-95"
            >
              <PlusCircle size={16} /> Add Your First Product
            </button>
            <button
              onClick={() => onNavigate("import-export")}
              className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-gray-50 text-[#24172F] border border-[#24172F]/20 rounded-xl font-semibold text-xs sm:text-sm shadow-sm transition active:scale-95"
            >
              <FileSpreadsheet size={16} /> Import Inventory (CSV)
            </button>
            <button
              onClick={onOpenRecordSale}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#33253D] hover:bg-[#24172F] text-white rounded-xl font-semibold text-xs sm:text-sm shadow-sm transition active:scale-95"
            >
              <TrendingUp size={16} /> Record Your First Sale
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
        {/* Products Listed */}
        <div className="bg-paper p-4 rounded-xl border border-cream-dark shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between text-ink-muted text-xs font-semibold">
            <span>Products Listed</span>
            <Boxes size={15} className="text-mauve" />
          </div>
          <div className="text-2xl font-black text-ink mt-2">{kpis.total_active_products}</div>
          <div className="text-[11px] text-ink-subtle mt-1">Active items in store</div>
        </div>

        {/* Units Available */}
        <div className="bg-paper p-4 rounded-xl border border-cream-dark shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between text-ink-muted text-xs font-semibold">
            <span>Units Available</span>
            <Boxes size={15} className="text-amber" />
          </div>
          <div className="text-2xl font-black text-ink mt-2">
            {formatUnits(kpis.total_units_in_stock, 0)}
          </div>
          <div className="text-[11px] text-ink-subtle mt-1">Total physical stock on hand</div>
        </div>

        {/* Value of Current Stock */}
        <div className="bg-paper p-4 rounded-xl border border-cream-dark shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between text-ink-muted text-xs font-semibold">
            <span>Value of Current Stock</span>
            <span className="font-bold text-sm text-mint-dark">₹</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-ink mt-2 tracking-tight">
            {formatINR(kpis.total_inventory_value)}
          </div>
          <div className="text-[11px] text-ink-subtle mt-1">Valuation at purchase cost</div>
        </div>

        {/* Sales Today */}
        <div className="bg-paper p-4 rounded-xl border border-cream-dark shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between text-ink-muted text-xs font-semibold">
            <span>Sales Today</span>
            <TrendingUp size={15} className="text-coral" />
          </div>
          <div className="text-lg sm:text-xl font-black text-coral mt-2 tracking-tight">
            {formatINR(kpis.today_sales_revenue)}
          </div>
          <div className="text-[11px] text-ink-subtle mt-1">
            {formatUnits(kpis.today_sales_units, 0)} units sold today
          </div>
        </div>

        {/* Products Running Low */}
        <div
          onClick={() => onNavigate("inventory")}
          className={`p-4 rounded-xl border shadow-sm cursor-pointer transition ${
            kpis.low_stock_count > 0
              ? "bg-amber/10 border-amber/40 hover:bg-amber/15"
              : "bg-paper border-cream-dark"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className={kpis.low_stock_count > 0 ? "text-amber-dark" : "text-ink-muted"}>
              Products Running Low
            </span>
            <AlertTriangle size={15} className={kpis.low_stock_count > 0 ? "text-amber" : "text-ink-subtle"} />
          </div>
          <div className={`text-2xl font-black mt-2 ${kpis.low_stock_count > 0 ? "text-amber-dark" : "text-ink"}`}>
            {kpis.low_stock_count}
          </div>
          <div className="text-[11px] text-ink-subtle mt-1">Below safety buffer</div>
        </div>

        {/* Products to Restock */}
        <div
          onClick={() => onNavigate("reorder")}
          className={`p-4 rounded-xl border shadow-sm cursor-pointer transition ${
            kpis.high_risk_count > 0
              ? "bg-coral/10 border-coral/40 hover:bg-coral/15"
              : "bg-paper border-cream-dark"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className={kpis.high_risk_count > 0 ? "text-coral" : "text-ink-muted"}>
              Products to Restock
            </span>
            <ShoppingCart size={15} className={kpis.high_risk_count > 0 ? "text-coral" : "text-ink-subtle"} />
          </div>
          <div className={`text-2xl font-black mt-2 ${kpis.high_risk_count > 0 ? "text-coral" : "text-ink"}`}>
            {kpis.high_risk_count}
          </div>
          <div className="text-[11px] text-ink-subtle mt-1">Chance of running out soon</div>
        </div>
      </div>

      {/* Main Analytics Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 30-Day Sales Trend Chart */}
        <div className="lg:col-span-2 bg-paper rounded-2xl border border-cream-dark p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-ink">{trendDays}-Day Sales Revenue Trend</h2>
              <p className="text-xs text-ink-muted">Historical daily revenue computed from persisted sales ledger</p>
            </div>
            <div className="flex items-center gap-1.5 bg-cream/70 p-1 rounded-xl border border-cream-dark">
              {[7, 30, 90].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => handleTrendDaysChange(days)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    trendDays === days
                      ? "bg-aubergine text-white shadow-xs"
                      : "text-ink-muted hover:text-ink hover:bg-cream"
                  }`}
                >
                  {days}D
                </button>
              ))}
            </div>
          </div>

          {kpis.sales_trend_30d.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-ink-subtle border border-dashed border-cream-dark rounded-xl">
              <TrendingUp size={36} className="text-mauve mb-2" />
              <p className="font-semibold text-sm">No historical sales recorded in the past {trendDays} days</p>
              <p className="text-xs mt-1">Record a manual sale or import historical transactions to view trend charts.</p>
              <button
                onClick={onOpenRecordSale}
                className="mt-3 px-3 py-1.5 text-xs bg-coral text-white font-semibold rounded-lg shadow hover:bg-coral-hover"
              >
                Record Sale
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {/* SVG Trend Visualization */}
              <div className="h-60 w-full pt-4">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 600 180" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F26B4F" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#F26B4F" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal gridlines */}
                  <line x1="0" y1="40" x2="600" y2="40" stroke="#E5DCD0" strokeDasharray="3 3" />
                  <line x1="0" y1="90" x2="600" y2="90" stroke="#E5DCD0" strokeDasharray="3 3" />
                  <line x1="0" y1="140" x2="600" y2="140" stroke="#E5DCD0" strokeDasharray="3 3" />

                  {(() => {
                    const maxRev = Math.max(...kpis.sales_trend_30d.map((d) => d.revenue), 10);
                    const pts = kpis.sales_trend_30d.map((d, i) => {
                      const x = (i / Math.max(1, kpis.sales_trend_30d.length - 1)) * 600;
                      const y = 160 - (d.revenue / maxRev) * 140;
                      return `${x},${y}`;
                    });
                    const areaPath = `0,160 ${pts.join(" ")} 600,160`;
                    const linePath = pts.join(" ");

                    return (
                      <>
                        <polygon points={areaPath} fill="url(#trendGradient)" />
                        <polyline fill="none" stroke="#F26B4F" strokeWidth="2.5" points={linePath} />
                        {kpis.sales_trend_30d.map((d, idx) => {
                          const x = (idx / Math.max(1, kpis.sales_trend_30d.length - 1)) * 600;
                          const y = 160 - (d.revenue / maxRev) * 140;
                          return (
                            <circle
                              key={idx}
                              cx={x}
                              cy={y}
                              r="3.5"
                              fill="#24172F"
                              stroke="#F26B4F"
                              strokeWidth="2"
                              className="hover:r-5 transition-all cursor-pointer"
                            >
                              <title>{`${d.date}: ${formatINR(d.revenue)} (${d.units_sold} units)`}</title>
                            </circle>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
              </div>
              <div className="flex justify-between text-[11px] text-ink-subtle px-1">
                <span>{kpis.sales_trend_30d[0]?.date}</span>
                <span>{kpis.sales_trend_30d[Math.floor(kpis.sales_trend_30d.length / 2)]?.date}</span>
                <span>{kpis.sales_trend_30d[kpis.sales_trend_30d.length - 1]?.date}</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Inventory Risk Card */}
        <div className="bg-paper rounded-2xl border border-cream-dark p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-base font-bold text-ink">What Should I Restock First?</h2>
            <p className="text-xs text-ink-muted mt-0.5">Products that may run out before your next supplier delivery arrives</p>
          </div>

          <div className="p-4 rounded-xl bg-cream border border-cream-dark space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-ink-muted">Items Needing Restock</span>
              <span className="font-bold text-coral">{kpis.high_risk_count} Urgent</span>
            </div>
            <div className="w-full bg-cream-dark h-2 rounded-full overflow-hidden">
              <div
                className="bg-coral h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (kpis.high_risk_count / Math.max(1, kpis.total_active_products)) * 100)}%`,
                }}
              ></div>
            </div>
            <p className="text-[11px] text-ink-muted leading-relaxed">
              Based on your recent sales pace, available stock, and how many days your suppliers take to deliver.
            </p>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => onNavigate("reorder")}
              className="w-full py-2.5 bg-coral text-white rounded-xl text-xs font-bold shadow hover:bg-coral-hover transition flex items-center justify-center gap-1.5 btn-interactive active:scale-95"
            >
              View What to Restock First <ArrowUpRight size={14} />
            </button>
            <button
              onClick={() => onNavigate("forecast")}
              className="w-full py-2.5 bg-plum hover:bg-plum-light text-cream rounded-xl text-xs font-semibold border border-plum-border transition flex items-center justify-center gap-1.5 btn-interactive active:scale-95"
            >
              Check Expected Sales <TrendingUp size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Fast & Slow Moving Products Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fast Moving */}
        <div className="bg-paper rounded-2xl border border-cream-dark p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-coral/10 text-coral flex items-center justify-center font-bold">
                <Flame size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink">Products Selling Quickly</h3>
                <p className="text-[11px] text-ink-muted">Highest sales volume over past 30 days</p>
              </div>
            </div>
          </div>

          {kpis.fast_moving_products.length === 0 ? (
            <p className="text-xs text-ink-subtle italic p-4 text-center">No sales recorded in the past 30 days.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-cream-dark text-ink-muted">
                    <th className="pb-2 font-semibold">Product</th>
                    <th className="pb-2 font-semibold">Sold (30d)</th>
                    <th className="pb-2 font-semibold">How Quickly It Sells</th>
                    <th className="pb-2 font-semibold">Estimated Days Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-dark/50">
                  {kpis.fast_moving_products.map((p) => (
                    <tr key={p.product_id} className="hover:bg-cream/40 transition">
                      <td className="py-2.5">
                        <div className="font-semibold text-ink">{p.name}</div>
                        <div className="text-[10px] text-ink-subtle">{p.sku}</div>
                      </td>
                      <td className="py-2.5 font-bold text-coral">{formatUnits(p.units_sold_30d, 0)} units</td>
                      <td className="py-2.5">{formatDailySalesRate(p.daily_sales_rate)}</td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.stock_cover_days < 10 ? "bg-coral/15 text-coral" : "bg-mint/20 text-mint-dark"
                        }`}>
                          {formatStockCoverDays(p.stock_cover_days)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Slow Moving */}
        <div className="bg-paper rounded-2xl border border-cream-dark p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-mauve/20 text-mauve-dark flex items-center justify-center font-bold">
                <Snowflake size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink">Products Selling Slowly</h3>
                <p className="text-[11px] text-ink-muted">Items with stock available but lower sales volume</p>
              </div>
            </div>
          </div>

          {kpis.slow_moving_products.length === 0 ? (
            <p className="text-xs text-ink-subtle italic p-4 text-center">No slow-moving products identified.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-cream-dark text-ink-muted">
                    <th className="pb-2 font-semibold">Product</th>
                    <th className="pb-2 font-semibold">Available Stock</th>
                    <th className="pb-2 font-semibold">Sold (30d)</th>
                    <th className="pb-2 font-semibold">Estimated Days Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-dark/50">
                  {kpis.slow_moving_products.map((p) => (
                    <tr key={p.product_id} className="hover:bg-cream/40 transition">
                      <td className="py-2.5">
                        <div className="font-semibold text-ink">{p.name}</div>
                        <div className="text-[10px] text-ink-subtle">{p.sku}</div>
                      </td>
                      <td className="py-2.5 font-bold">{formatUnits(p.current_stock, 0)} units</td>
                      <td className="py-2.5 text-ink-muted">{formatUnits(p.units_sold_30d, 0)}</td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cream text-ink-muted">
                          {p.stock_cover_days > 60 ? "Overstock" : formatStockCoverDays(p.stock_cover_days)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Recent Ledger Feed */}
      <div className="bg-paper rounded-2xl border border-cream-dark p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-ink">Recent Movements Ledger</h3>
            <p className="text-xs text-ink-muted">Latest verified atomic stock changes</p>
          </div>
          <button
            onClick={() => onNavigate("movements")}
            className="text-xs text-coral hover:underline font-semibold flex items-center gap-1"
          >
            View full ledger <ArrowUpRight size={13} />
          </button>
        </div>

        {kpis.recent_movements.length === 0 ? (
          <p className="text-xs text-ink-subtle italic py-4 text-center">No stock movements recorded yet.</p>
        ) : (
          <div className="divide-y divide-cream-dark">
            {kpis.recent_movements.slice(0, 5).map((m) => {
              const isPositive = m.stock_delta > 0;
              return (
                <div key={m.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                        isPositive ? "bg-mint/20 text-mint-dark" : "bg-coral/15 text-coral"
                      }`}
                    >
                      {isPositive ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-ink truncate">{m.product_name}</div>
                      <div className="text-[10px] text-ink-subtle flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="font-mono">{m.product_sku}</span>
                        <span>•</span>
                        <span className="font-semibold">{m.movement_type}</span>
                        <span>•</span>
                        <span>{formatDateTime(m.occurred_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className={`font-bold text-sm shrink-0 ml-3 ${isPositive ? "text-mint-dark" : "text-coral"}`}>
                    {isPositive ? `+${formatUnits(m.quantity, 0)}` : `-${formatUnits(m.quantity, 0)}`}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
