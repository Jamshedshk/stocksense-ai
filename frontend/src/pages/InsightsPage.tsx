import React, { useState, useEffect } from "react";
import {
  Layers,
  AlertTriangle,
  RefreshCw,
  Zap,
  Flame,
  Clock,
  Snowflake,
  HelpCircle,
  ShieldCheck,
} from "lucide-react";
import {
  api,
  type ClusteringResponse,
  type FuzzyRiskItem,
  type ClusterProduct,
} from "../lib/api";
import {
  formatINR,
  formatUnits,
  formatDailySalesRate,
  formatStockCoverDays,
} from "../lib/formatters";
import { BrandedLoader } from "../components/BrandedLoader";

export const InsightsPage: React.FC = () => {
  const [clustersData, setClustersData] = useState<ClusteringResponse | null>(null);
  const [riskData, setRiskData] = useState<{
    items: FuzzyRiskItem[];
    high_risk_count: number;
    medium_risk_count: number;
    low_risk_count: number;
  } | null>(null);
  const [activeView, setActiveView] = useState<"speed" | "stockout">("speed");
  const [selectedSpeedGroup, setSelectedSpeedGroup] = useState<string>("ALL");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAllInsights();
  }, []);

  const loadAllInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cRes, rRes] = await Promise.all([
        api.getClusters(3),
        api.getStockoutRisk(),
      ]);
      setClustersData(cRes);
      setRiskData(rRes);
    } catch (err: any) {
      setError(err.message || "Failed to load product insights");
    } finally {
      setLoading(false);
    }
  };

  // Dynamically classify products by actual sales pace
  const allProducts: ClusterProduct[] = clustersData?.products || [];

  const categorizeProductByPace = (p: ClusterProduct) => {
    if (!p.demand_rate || p.demand_rate <= 0) {
      return {
        key: "NO_DATA",
        title: "Not Enough Sales History",
        reason: "We need more recorded sales transactions to determine how quickly this item moves.",
        badgeColor: "bg-gray-100 text-gray-700 border-gray-200",
        icon: HelpCircle,
      };
    }
    if (p.demand_rate >= 1.0) {
      return {
        key: "FAST",
        title: "Selling Quickly",
        reason: "High sales volume. Generates quick turnover and needs regular inventory checks.",
        badgeColor: "bg-coral/15 text-coral border-coral/30",
        icon: Flame,
      };
    }
    if (p.demand_rate >= 0.3) {
      return {
        key: "STEADY",
        title: "Selling at a Steady Pace",
        reason: "Consistent and predictable daily sales with dependable demand.",
        badgeColor: "bg-amber/15 text-amber-dark border-amber/30",
        icon: Clock,
      };
    }
    return {
      key: "SLOW",
      title: "Selling Slowly",
      reason: "Low daily sales pace. Capital is tied up in stock; consider smaller order batches or promotions.",
      badgeColor: "bg-mauve/20 text-mauve-dark border-mauve/30",
      icon: Snowflake,
    };
  };

  const fastProducts = allProducts.filter((p) => categorizeProductByPace(p).key === "FAST");
  const steadyProducts = allProducts.filter((p) => categorizeProductByPace(p).key === "STEADY");
  const slowProducts = allProducts.filter((p) => categorizeProductByPace(p).key === "SLOW");
  const noDataProducts = allProducts.filter((p) => categorizeProductByPace(p).key === "NO_DATA");

  const speedGroups = [
    {
      key: "FAST",
      title: "Selling Quickly",
      description: "Generates rapid sales. Check stock frequently to prevent shortages.",
      products: fastProducts,
      icon: Flame,
      accent: "text-coral bg-coral/10 border-coral/30",
    },
    {
      key: "STEADY",
      title: "Selling at a Steady Pace",
      description: "Consistent daily turnover with reliable customer demand.",
      products: steadyProducts,
      icon: Clock,
      accent: "text-amber-dark bg-amber/15 border-amber/30",
    },
    {
      key: "SLOW",
      title: "Selling Slowly",
      description: "Ties up capital longer. Keep order batches conservative.",
      products: slowProducts,
      icon: Snowflake,
      accent: "text-mauve-dark bg-mauve/20 border-mauve/30",
    },
    {
      key: "NO_DATA",
      title: "Not Enough Sales History",
      description: "Newer or unrecorded items. Record sales to classify automatically.",
      products: noDataProducts,
      icon: HelpCircle,
      accent: "text-gray-600 bg-gray-100 border-gray-200",
    },
  ];

  const displayedSpeedProducts =
    selectedSpeedGroup === "ALL"
      ? allProducts
      : allProducts.filter((p) => categorizeProductByPace(p).key === selectedSpeedGroup);

  // Status mapping for "Products That May Run Out"
  const getProductRiskStatus = (item: FuzzyRiskItem) => {
    if (item.daily_demand <= 0) {
      return {
        status: "Not enough information",
        badge: "bg-gray-100 text-gray-700 border-gray-200",
        action: "Record sales to calculate daily pace",
        explanation: "Requires at least a few recorded customer sales to calculate daily demand rate and estimate coverage.",
      };
    }

    if (item.current_stock <= 0 || item.stock_cover_days <= item.lead_time_days || item.risk_label === "CRITICAL") {
      return {
        status: "Urgent",
        badge: "bg-coral text-white border-coral",
        action: "Order stock immediately",
        explanation: `Current stock (${formatUnits(item.current_stock, 0)} units) may run out in ~${formatUnits(item.stock_cover_days, 1)} days, but supplier delivery takes ${formatUnits(item.lead_time_days, 0)} days.`,
      };
    }

    if (item.stock_cover_days <= item.lead_time_days * 1.5 || item.risk_label === "HIGH") {
      return {
        status: "Restock Soon",
        badge: "bg-coral/20 text-coral border-coral/30",
        action: "Order stock this week",
        explanation: `Estimated days of stock remaining (~${formatUnits(item.stock_cover_days, 1)} days) is getting close to the supplier delivery window (${formatUnits(item.lead_time_days, 0)} days).`,
      };
    }

    if (item.stock_cover_days <= item.lead_time_days * 2.5 || item.risk_label === "MEDIUM") {
      return {
        status: "Keep an Eye on This",
        badge: "bg-amber/20 text-amber-dark border-amber/30",
        action: "Monitor sales over the next few days",
        explanation: `Stock should last ~${formatUnits(item.stock_cover_days, 1)} days. Adequate for now, but supplier needs ${formatUnits(item.lead_time_days, 0)} days to ship.`,
      };
    }

    return {
      status: "Stock Healthy",
      badge: "bg-mint/20 text-mint-dark border-mint/30",
      action: "No immediate order needed",
      explanation: `Comfortable stock level covering ${formatStockCoverDays(item.stock_cover_days)} of expected sales.`,
    };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8 animate-fade-in-up">
      {/* Header Banner */}
      <div className="bg-hero-dark rounded-2xl p-6 sm:p-8 text-cream border border-plum-border shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-coral/15 border border-coral/30 text-coral text-xs font-semibold">
            <Zap size={14} />
            <span>Store Insights</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {activeView === "speed" ? "Product Insights" : "Products That May Run Out"}
          </h1>
          <p className="text-sm text-mauve/90 max-w-2xl leading-relaxed">
            {activeView === "speed"
              ? "Find out which products sell quickly, which sell slowly, and where your money is tied up in stock."
              : "Identify products that may run out before you can restock them."}
          </p>
        </div>

        <button
          onClick={loadAllInsights}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-coral hover:bg-coral-hover text-white font-semibold text-xs transition shadow-md active:scale-95 disabled:opacity-50 btn-interactive"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Refresh Insights</span>
        </button>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 rounded-xl bg-coral/15 border border-coral/40 text-ink text-xs flex items-center gap-3">
          <AlertTriangle size={16} className="text-coral shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Primary Section Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-cream-dark/60 pb-1">
        <button
          onClick={() => setActiveView("speed")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm btn-interactive ${
            activeView === "speed"
              ? "bg-plum text-white border border-plum"
              : "bg-paper text-ink-muted border border-cream-dark/60 hover:text-ink"
          }`}
        >
          <Layers size={14} className={activeView === "speed" ? "text-coral" : ""} />
          <span>Group Similar Products</span>
        </button>

        <button
          onClick={() => setActiveView("stockout")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm btn-interactive ${
            activeView === "stockout"
              ? "bg-plum text-white border border-plum"
              : "bg-paper text-ink-muted border border-cream-dark/60 hover:text-ink"
          }`}
        >
          <AlertTriangle size={14} className={activeView === "stockout" ? "text-amber" : ""} />
          <span>Which Products May Run Out?</span>
        </button>
      </div>

      {loading ? (
        <div className="bg-paper rounded-2xl p-8 border border-cream-dark/60 shadow-sm">
          <BrandedLoader
            message="Analyzing product sales pace..."
            submessage="Calculating stock coverage and capital tied up"
          />
        </div>
      ) : activeView === "speed" ? (
        /* ========================================================================= */
        /* VIEW 1: PRODUCT INSIGHTS / GROUP SIMILAR PRODUCTS                         */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* Summary Speed Groups Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {speedGroups.map((g) => {
              const Icon = g.icon;
              const isSelected = selectedSpeedGroup === g.key;
              const totalVal = g.products.reduce((acc, p) => acc + (p.stock_value || 0), 0);
              const totalUnits = g.products.reduce((acc, p) => acc + (p.current_stock || 0), 0);

              return (
                <div
                  key={g.key}
                  onClick={() =>
                    setSelectedSpeedGroup(selectedSpeedGroup === g.key ? "ALL" : g.key)
                  }
                  className={`bg-paper rounded-2xl p-5 border cursor-pointer transition shadow-sm hover:shadow flex flex-col justify-between space-y-3 btn-interactive ${
                    isSelected
                      ? "border-coral ring-2 ring-coral/20 bg-coral/5"
                      : "border-cream-dark/60 hover:border-cream-dark"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${g.accent}`}>
                        <Icon size={16} />
                      </div>
                      <span className="text-xs font-black text-ink">
                        {g.products.length} {g.products.length === 1 ? "Product" : "Products"}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-ink">{g.title}</h3>
                      <p className="text-[11px] text-ink-muted leading-relaxed mt-0.5">
                        {g.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-cream-dark/40 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-ink-subtle uppercase block">Units in Stock</span>
                      <strong className="text-ink">{totalUnits}</strong>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-ink-subtle uppercase block">Value of Current Stock</span>
                      <strong className="text-plum">{formatINR(totalVal)}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Group Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-paper p-4 rounded-xl border border-cream-dark/60 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-ink">Filter View:</span>
              <button
                onClick={() => setSelectedSpeedGroup("ALL")}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  selectedSpeedGroup === "ALL"
                    ? "bg-plum text-white shadow-sm"
                    : "bg-cream-light text-ink hover:bg-cream"
                }`}
              >
                All Products ({allProducts.length})
              </button>
              {speedGroups.map((g) => (
                <button
                  key={g.key}
                  onClick={() => setSelectedSpeedGroup(g.key)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    selectedSpeedGroup === g.key
                      ? "bg-plum text-white shadow-sm"
                      : "bg-cream-light text-ink hover:bg-cream"
                  }`}
                >
                  {g.title} ({g.products.length})
                </button>
              ))}
            </div>

            <span className="text-ink-muted text-[11px]">
              Showing {displayedSpeedProducts.length} of {allProducts.length} products
            </span>
          </div>

          {/* Products Breakdown Table */}
          <div className="bg-paper rounded-2xl border border-cream-dark/60 shadow-sm overflow-hidden">
            {displayedSpeedProducts.length === 0 ? (
              <div className="p-12 text-center text-ink-muted text-xs space-y-2">
                <HelpCircle size={28} className="text-mauve mx-auto" />
                <p className="font-bold text-sm text-ink">No products found in this category</p>
                <p>Record counter sales to see products grouped by their sales pace.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-cream-light border-b border-cream-dark/60 text-ink-muted uppercase text-[11px]">
                    <tr>
                      <th className="py-3 px-4 font-bold">Product</th>
                      <th className="py-3 px-4 font-bold">Sales Pace Category</th>
                      <th className="py-3 px-4 font-bold text-right">Available Stock</th>
                      <th className="py-3 px-4 font-bold text-right">How Quickly It Sells</th>
                      <th className="py-3 px-4 font-bold text-right">Value of Current Stock</th>
                      <th className="py-3 px-4 font-bold text-center">Estimated Days Left</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream-dark/40">
                    {displayedSpeedProducts.map((p) => {
                      const pace = categorizeProductByPace(p);
                      const PaceIcon = pace.icon;

                      return (
                        <tr key={p.product_id} className="hover:bg-cream-light/40 transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-ink">{p.name}</div>
                            <div className="text-[11px] text-ink-muted">
                              {p.sku} • {p.category}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${pace.badgeColor}`}
                            >
                              <PaceIcon size={12} />
                              {pace.title}
                            </span>
                            <div className="text-[10px] text-ink-subtle mt-0.5 max-w-xs">
                              {pace.reason}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="font-extrabold text-ink text-sm">
                              {formatUnits(p.current_stock, 0)}
                            </span>
                            <span className="text-[10px] text-ink-muted ml-1">units</span>
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-ink">
                            {p.demand_rate > 0 ? formatDailySalesRate(p.demand_rate) : "No sales yet"}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-plum">
                            {formatINR(p.stock_value || 0)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                p.stock_cover_days < 10
                                  ? "bg-coral/15 text-coral"
                                  : p.stock_cover_days < 30
                                  ? "bg-amber/15 text-amber-dark"
                                  : "bg-mint/20 text-mint-dark"
                              }`}
                            >
                              {formatStockCoverDays(p.stock_cover_days)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* VIEW 2: PRODUCTS THAT MAY RUN OUT                                         */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* Summary Alert Header */}
          <div className="bg-paper rounded-2xl p-5 border border-cream-dark/60 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-ink">Products That May Run Out</h3>
              <p className="text-xs text-ink-muted mt-0.5">
                Identify products that may run out before you can restock them, based on current stock, sales pace, and supplier delivery times.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-coral/15 text-coral border border-coral/30">
                {riskData?.high_risk_count ?? 0} Needing Restock
              </span>
            </div>
          </div>

          {/* Table of Products at Risk */}
          <div className="bg-paper rounded-2xl border border-cream-dark/60 shadow-sm overflow-hidden">
            {!riskData || riskData.items.length === 0 ? (
              <div className="p-12 text-center text-ink-muted text-xs space-y-2">
                <ShieldCheck size={32} className="text-mint mx-auto" />
                <h4 className="text-sm font-bold text-ink">All Stock Levels Appear Healthy</h4>
                <p>No products are currently at immediate risk of running out before supplier deliveries.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-cream-light border-b border-cream-dark/60 text-ink-muted uppercase text-[11px]">
                    <tr>
                      <th className="py-3 px-4 font-bold">Product</th>
                      <th className="py-3 px-4 font-bold text-center">Current Stock</th>
                      <th className="py-3 px-4 font-bold text-center">Average Daily Sales</th>
                      <th className="py-3 px-4 font-bold text-center">Days of Stock Left</th>
                      <th className="py-3 px-4 font-bold text-center">Supplier Delivery</th>
                      <th className="py-3 px-4 font-bold text-center">Status</th>
                      <th className="py-3 px-4 font-bold">Recommended Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream-dark/40">
                    {riskData.items.map((item) => {
                      const statusInfo = getProductRiskStatus(item);

                      return (
                        <tr key={item.product_id} className="hover:bg-cream-light/40 transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-ink">{item.name}</div>
                            <div className="text-[11px] text-ink-muted">
                              {item.sku} • {item.category}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center font-black text-sm text-ink">
                            {formatUnits(item.current_stock, 0)}
                          </td>
                          <td className="py-3 px-4 text-center font-medium text-ink">
                            {item.daily_demand > 0 ? formatDailySalesRate(item.daily_demand) : "No sales"}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-extrabold text-ink">
                              {formatStockCoverDays(item.stock_cover_days)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-semibold text-ink-muted">
                            {formatUnits(item.lead_time_days, 0)} days
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${statusInfo.badge}`}
                            >
                              {statusInfo.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-ink text-xs">{statusInfo.action}</div>
                            <div className="text-[10px] text-ink-subtle mt-0.5 max-w-sm">
                              {statusInfo.explanation}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
