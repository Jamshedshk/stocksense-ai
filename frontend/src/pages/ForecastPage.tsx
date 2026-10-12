import React, { useState, useEffect } from "react";
import {
  Calendar,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Info,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import { api, type Product, type ForecastResponse, type ForecastPoint } from "../lib/api";
import { BrandedLoader } from "../components/BrandedLoader";
import {
  formatUnits,
  formatDailySalesRate,
  formatPredictionError,
  formatDate,
} from "../lib/formatters";

export const ForecastPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [horizon, setHorizon] = useState<number>(7);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [trainingAll, setTrainingAll] = useState<boolean>(false);
  const [trainSummary, setTrainSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load products list on mount
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const res = await api.getProducts({ size: 100 });
      setProducts(res.items);
      if (res.items.length > 0 && !selectedProductId) {
        setSelectedProductId(res.items[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load products list");
    }
  };

  // Fetch forecast whenever selected product or horizon changes
  useEffect(() => {
    if (selectedProductId) {
      loadForecast(selectedProductId, horizon);
    }
  }, [selectedProductId, horizon]);

  const loadForecast = async (productId: number, h: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getForecast(productId, h);
      setForecast(data);
    } catch (err: any) {
      setError(err.message || "Failed to calculate expected sales");
      setForecast(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculateAll = async () => {
    setTrainingAll(true);
    setTrainSummary(null);
    try {
      const res = await api.trainAllForecasts(horizon);
      setTrainSummary(
        `Sales estimates updated: ${res.trained_count} products calculated, ${res.insufficient_data_count} products need more sales records.`
      );
      if (selectedProductId) {
        loadForecast(selectedProductId, horizon);
      }
    } catch (err: any) {
      setError(err.message || "Failed to recalculate estimates");
    } finally {
      setTrainingAll(false);
    }
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const currentStock = selectedProduct?.current_stock ?? 0;
  const expectedTotalUnits = forecast?.predicted_total_units ?? 0;
  const stockDifference = currentStock - expectedTotalUnits;
  const isStockSufficient = stockDifference >= 0;

  // SVG Chart rendering for daily expected sales
  const renderForecastChart = (daily: ForecastPoint[]) => {
    if (!daily || daily.length === 0) return null;

    const maxVal = Math.max(
      ...daily.map((d) => Math.max(d.predicted_units, d.baseline_units)),
      5
    );
    const chartHeight = 160;
    const chartWidth = 580;
    const padding = 35;
    const usableWidth = chartWidth - padding * 2;
    const usableHeight = chartHeight - padding * 2;

    const pointsForecast = daily
      .map((d, i) => {
        const x = padding + (i / Math.max(1, daily.length - 1)) * usableWidth;
        const y = chartHeight - padding - (d.predicted_units / maxVal) * usableHeight;
        return `${x},${y}`;
      })
      .join(" ");

    const pointsBaseline = daily
      .map((d, i) => {
        const x = padding + (i / Math.max(1, daily.length - 1)) * usableWidth;
        const y = chartHeight - padding - (d.baseline_units / maxVal) * usableHeight;
        return `${x},${y}`;
      })
      .join(" ");

    return (
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-48 select-none">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = chartHeight - padding - pct * usableHeight;
            const val = Math.round(pct * maxVal);
            return (
              <g key={idx}>
                <line
                  x1={padding}
                  y1={y}
                  x2={chartWidth - padding}
                  y2={y}
                  stroke="#4A3857"
                  strokeDasharray="3 3"
                  strokeOpacity="0.3"
                />
                <text x={padding - 6} y={y + 3} textAnchor="end" fontSize="10" fill="#9B91A0">
                  {val}
                </text>
              </g>
            );
          })}

          {/* Recent Sales Baseline path (dashed amber) */}
          <polyline
            fill="none"
            stroke="#F2C66D"
            strokeWidth="2"
            strokeDasharray="4 4"
            points={pointsBaseline}
          />

          {/* Expected Sales Forecast path (solid coral) */}
          <polyline
            fill="none"
            stroke="#F26B4F"
            strokeWidth="2.5"
            points={pointsForecast}
          />

          {/* Data Points */}
          {daily.map((d, i) => {
            const x = padding + (i / Math.max(1, daily.length - 1)) * usableWidth;
            const yForecast = chartHeight - padding - (d.predicted_units / maxVal) * usableHeight;
            const yBase = chartHeight - padding - (d.baseline_units / maxVal) * usableHeight;
            return (
              <g key={i}>
                <circle cx={x} cy={yBase} r="3" fill="#F2C66D" />
                <circle cx={x} cy={yForecast} r="4" fill="#F26B4F" stroke="#24172F" strokeWidth="1.5" />
                <text
                  x={x}
                  y={chartHeight - 12}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#9B91A0"
                >
                  {d.date.slice(5)}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-2 text-xs text-ink-muted">
          <div className="flex items-center gap-2">
            <span className="w-3 h-1 bg-[#F26B4F] rounded"></span>
            <span className="font-semibold text-ink">Expected Sales</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-1 bg-[#F2C66D] border-b border-dashed border-[#d8aa4a]"></span>
            <span className="font-semibold text-ink">Compare with Recent Sales (7-Day Average)</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8 animate-fade-in-up">
      {/* Header Banner */}
      <div className="bg-hero-dark rounded-2xl p-6 sm:p-8 text-cream border border-plum-border shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-coral/15 border border-coral/30 text-coral text-xs font-semibold">
            <TrendingUp size={14} />
            <span>Sales Prediction</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Expected Sales
          </h1>
          <p className="text-sm text-mauve/90 max-w-2xl leading-relaxed">
            See how many units you may sell in the coming days, based on your recorded sales.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleRecalculateAll}
            disabled={trainingAll}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-coral hover:bg-coral-hover text-white font-semibold text-xs transition shadow-md active:scale-95 disabled:opacity-50 btn-interactive"
          >
            {trainingAll ? (
              <RefreshCw size={15} className="animate-spin" />
            ) : (
              <Sparkles size={15} />
            )}
            <span>{trainingAll ? "Updating Estimates..." : "Recalculate All Estimates"}</span>
          </button>
        </div>
      </div>

      {/* Train Summary Alert */}
      {trainSummary && (
        <div className="p-4 rounded-xl bg-mint/15 border border-mint/40 text-ink text-xs flex items-center gap-3">
          <CheckCircle2 size={16} className="text-mint-dark shrink-0" />
          <span>{trainSummary}</span>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="p-4 rounded-xl bg-coral/15 border border-coral/40 text-ink text-xs flex items-center gap-3">
          <AlertTriangle size={16} className="text-coral shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Controls Bar: Product Selector & Horizon */}
      <div className="bg-paper rounded-2xl p-5 border border-cream-dark/60 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Product Dropdown */}
        <div className="flex-1 max-w-md space-y-1.5">
          <label className="text-xs font-bold text-ink uppercase tracking-wider">
            Select Product
          </label>
          <select
            value={selectedProductId || ""}
            onChange={(e) => setSelectedProductId(Number(e.target.value))}
            className="w-full px-3.5 py-2.5 rounded-xl border border-cream-dark bg-white text-ink font-medium text-sm focus:outline-none focus:ring-2 focus:ring-coral/40 shadow-sm"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku}) — {p.current_stock} in stock
              </option>
            ))}
          </select>
        </div>

        {/* How Far Ahead? (Horizon Selector) */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-ink uppercase tracking-wider">
            How Far Ahead?
          </label>
          <div className="flex items-center gap-2">
            {[7, 14, 30].map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm btn-interactive ${
                  horizon === h
                    ? "bg-plum text-white border border-plum shadow"
                    : "bg-white text-ink border border-cream-dark hover:bg-cream-light"
                }`}
              >
                {h} Days
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Forecast Content Area */}
      {loading ? (
        <div className="bg-paper rounded-2xl p-8 border border-cream-dark/60 shadow-sm">
          <BrandedLoader
            message="Calculating expected sales..."
            submessage={`Analyzing past sales records over the next ${horizon} days`}
          />
        </div>
      ) : forecast?.status === "INSUFFICIENT_DATA" ? (
        /* Honest Not Enough Sales History State */
        <div className="bg-paper rounded-2xl p-8 border border-amber/40 shadow-sm space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber/20 text-amber-dark flex items-center justify-center shrink-0">
              <ShieldAlert size={22} />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-ink">
                Not Enough Sales History Yet for {selectedProduct?.name} ({selectedProduct?.sku})
              </h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                We need more sales history to estimate future demand reliably. Continue recording sales or import past sales records.
              </p>
            </div>
          </div>

          <div className="bg-amber/10 rounded-xl p-4 border border-amber/20 text-xs text-ink space-y-2">
            <p className="font-semibold text-amber-dark">What you can do:</p>
            <ul className="list-disc list-inside space-y-1 text-ink-muted">
              <li>Record your daily customer sales under the <strong>Sales & Stock</strong> tab.</li>
              <li>Import previous sales spreadsheets through the <strong>Import CSV</strong> option.</li>
              <li>Record more sales over the coming days to improve future estimates.</li>
            </ul>
          </div>
        </div>
      ) : forecast ? (
        <div className="space-y-6">
          {/* Stock Adequacy Alert Banner */}
          <div
            className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm ${
              isStockSufficient
                ? "bg-mint/15 border-mint/40 text-ink"
                : "bg-coral/15 border-coral/40 text-ink"
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                  isStockSufficient ? "bg-mint/20 text-mint-dark" : "bg-coral/20 text-coral"
                }`}
              >
                {isStockSufficient ? <CheckCircle2 size={22} /> : <AlertTriangle size={22} />}
              </div>
              <div>
                <h4 className="font-bold text-sm">
                  {isStockSufficient
                    ? `Current stock looks sufficient for the next ${horizon} days.`
                    : "Your current stock may not last until your next delivery."}
                </h4>
                <p className="text-xs text-ink-muted mt-0.5">
                  You have <strong className="text-ink">{formatUnits(currentStock, 0)} units</strong> available right now, and you may sell around <strong className="text-ink">{formatUnits(expectedTotalUnits, 1)} units</strong> over the next {horizon} days
                  {!isStockSufficient && ` (short by approximately ${formatUnits(Math.abs(stockDifference), 1)} units)`}.
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold ${
                  isStockSufficient ? "bg-mint text-emerald-900" : "bg-coral text-white"
                }`}
              >
                {isStockSufficient ? "Stock Sufficient" : "Restock Advised"}
              </span>
            </div>
          </div>

          {/* Top 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Expected Units to Sell */}
            <div className="bg-paper rounded-2xl p-5 border border-cream-dark/60 shadow-sm space-y-1">
              <span className="text-xs font-bold text-ink-muted uppercase">Expected Units to Sell</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-coral">
                  {formatUnits(forecast.predicted_total_units, 1)}
                </span>
                <span className="text-xs font-semibold text-ink-muted">units</span>
              </div>
              <p className="text-[11px] text-ink-subtle">
                You may sell around {formatDailySalesRate(forecast.predicted_total_units / horizon, { prefixApprox: false, suffix: "units each day" })}
              </p>
            </div>

            {/* Current Stock */}
            <div className="bg-paper rounded-2xl p-5 border border-cream-dark/60 shadow-sm space-y-1">
              <span className="text-xs font-bold text-ink-muted uppercase">Current Stock on Hand</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-ink">
                  {formatUnits(currentStock, 0)}
                </span>
                <span className="text-xs font-semibold text-ink-muted">units</span>
              </div>
              <p className={`text-[11px] font-medium ${isStockSufficient ? "text-mint-dark" : "text-coral"}`}>
                {isStockSufficient ? "✓ Enough for forecast period" : `Short by ~${formatUnits(Math.abs(stockDifference), 1)} units`}
              </p>
            </div>

            {/* Compare with Recent Sales */}
            <div className="bg-paper rounded-2xl p-5 border border-cream-dark/60 shadow-sm space-y-1">
              <span className="text-xs font-bold text-ink-muted uppercase">Compare with Recent Sales</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-plum">
                  {formatUnits(forecast.daily_forecast.reduce((a, b) => a + b.baseline_units, 0), 1)}
                </span>
                <span className="text-xs font-semibold text-ink-muted">units</span>
              </div>
              <p className="text-[11px] text-ink-muted">
                Based on your recent 7-day sales pace
              </p>
            </div>

            {/* Prediction Accuracy */}
            <div className="bg-paper rounded-2xl p-5 border border-cream-dark/60 shadow-sm space-y-1">
              <span className="text-xs font-bold text-ink-muted uppercase">Prediction Accuracy</span>
              <div className="text-sm font-extrabold text-ink truncate mt-1">
                {formatPredictionError(forecast.metrics?.mae)}
              </div>
              <p className="text-[11px] text-ink-muted">
                Tested against later sales records
              </p>
            </div>
          </div>

          {/* Visualization Section */}
          <div className="bg-paper rounded-2xl p-6 border border-cream-dark/60 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-cream-dark/40">
              <div>
                <h3 className="text-base font-bold text-ink">
                  Expected Sales: Next {horizon} Days
                </h3>
                <p className="text-xs text-ink-muted">
                  Daily expected sales volume compared with your recent sales average.
                </p>
              </div>
              <div className="text-xs font-semibold text-ink-muted">
                Available on shelves: <strong className="text-ink">{formatUnits(currentStock, 0)}</strong> units
              </div>
            </div>

            {renderForecastChart(forecast.daily_forecast)}
          </div>

          {/* Daily Schedule Table & Explanation */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Daily Table */}
            <div className="lg:col-span-2 bg-paper rounded-2xl p-6 border border-cream-dark/60 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-ink uppercase tracking-wider">
                Daily Expected Sales Schedule
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-cream-dark/60 text-ink-muted">
                      <th className="py-2.5 font-bold">Date</th>
                      <th className="py-2.5 font-bold text-right">Expected to Sell</th>
                      <th className="py-2.5 font-bold text-right">Recent Average</th>
                      <th className="py-2.5 font-bold text-right">Estimated Stock Left</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream-dark/40">
                    {forecast.daily_forecast.map((pt, idx) => {
                      const cumForecast = forecast.daily_forecast
                        .slice(0, idx + 1)
                        .reduce((acc, curr) => acc + curr.predicted_units, 0);
                      const stockRem = currentStock - cumForecast;

                      return (
                        <tr key={idx} className="hover:bg-cream-light/60 transition">
                          <td className="py-2.5 font-medium text-ink flex items-center gap-1.5">
                            <Calendar size={13} className="text-mauve" />
                            {formatDate(pt.date)}
                          </td>
                          <td className="py-2.5 font-bold text-coral text-right">
                            {formatUnits(pt.predicted_units, 1)} units
                          </td>
                          <td className="py-2.5 text-ink-muted text-right">
                            {formatUnits(pt.baseline_units, 1)} units
                          </td>
                          <td className="py-2.5 text-right">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                stockRem <= 0
                                  ? "bg-coral/20 text-coral"
                                  : stockRem <= (selectedProduct?.reorder_threshold || 10)
                                  ? "bg-amber/20 text-amber-dark"
                                  : "bg-mint/20 text-mint-dark"
                              }`}
                            >
                              {stockRem <= 0 ? "Runs out" : `~${formatUnits(stockRem, 1)} units left`}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Explanation & Calculation Card */}
            <div className="bg-paper rounded-2xl p-6 border border-cream-dark/60 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
                <Info size={15} className="text-coral" />
                <span>How This Estimate Works</span>
              </h3>

              <div className="space-y-3 text-xs text-ink-muted">
                <div className="p-3.5 rounded-xl bg-cream-light border border-cream-dark/60 space-y-1">
                  <p className="font-bold text-ink">Calculation Method</p>
                  <p className="text-[11px] leading-relaxed">
                    Calculated using daily sales patterns from your store, taking into account day-of-week trends and recent sales volume over {forecast.training_rows} recorded sales days.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-cream-light border border-cream-dark/60 space-y-1">
                  <p className="font-bold text-ink">Test Using Later Sales Records</p>
                  <p className="text-[11px] leading-relaxed">
                    Tested against {forecast.metrics?.test_days || 7} later sales days to verify accuracy. Predictions were {formatPredictionError(forecast.metrics?.mae).toLowerCase()}.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-coral/10 border border-coral/20 space-y-1 text-ink">
                  <p className="font-bold text-coral">Practical Advice</p>
                  <p className="text-[11px] leading-relaxed text-ink-muted">
                    Record your counter sales regularly every day. Consistent daily records help improve future sales estimates and protect your business from running out of stock unexpectedly.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
