import React, { useState, useEffect } from "react";
import {
  ShoppingCart,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Download,
  RefreshCw,
  Info,
  PackagePlus,
} from "lucide-react";
import { api, type ReorderRecommendation, type Product, type RestockResult } from "../lib/api";
import { formatINR, formatUnits } from "../lib/formatters";
import { BrandedLoader } from "../components/BrandedLoader";
import { RestockModal } from "../components/RestockModal";

export const ReorderPage: React.FC = () => {
  const [recommendations, setRecommendations] = useState<ReorderRecommendation[]>([]);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [totalSuggestedUnits, setTotalSuggestedUnits] = useState<number>(0);
  const [totalEstimatedCost, setTotalEstimatedCost] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Restock Existing Product Modal State
  const [isRestockModalOpen, setIsRestockModalOpen] = useState<boolean>(false);
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [restockSuggestedQty, setRestockSuggestedQty] = useState<number>(0);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const handleOpenRestock = (r?: ReorderRecommendation) => {
    if (r) {
      setRestockProduct({
        id: r.product_id,
        sku: r.sku,
        name: r.name,
        category: r.category,
        current_stock: r.current_stock,
        unit_cost: 0,
        selling_price: 0,
        reorder_threshold: r.reorder_threshold,
        supplier_lead_time_days: r.lead_time_days,
        is_active: true,
        created_at: "",
        updated_at: "",
      });
      setRestockSuggestedQty(r.suggested_quantity || 10);
    } else {
      setRestockProduct(null);
      setRestockSuggestedQty(0);
    }
    setIsRestockModalOpen(true);
  };

  const handleRestockSuccess = async (result: RestockResult) => {
    setActionMessage(
      `Stock received successfully: Available quantity of '${result.product_name}' updated from ${result.previous_stock} to ${result.new_stock} units.`
    );
    await loadRecommendations();
  };

  const loadRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getReorderRecommendations();
      setRecommendations(data.recommendations || []);
      setPendingCount(data.pending_count || 0);
      setTotalSuggestedUnits(data.total_suggested_units || 0);
      setTotalEstimatedCost(data.total_estimated_cost || 0);
    } catch (err: any) {
      setError(err.message || "Failed to load restocking recommendations");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    setActionLoadingId(id);
    setActionMessage(null);
    try {
      await api.updateReorderStatus(id, newStatus);
      setActionMessage(`Item #${id} updated to ${newStatus}`);
      await loadRecommendations();
    } catch (err: any) {
      setError(err.message || `Failed to update status to ${newStatus}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const filtered = recommendations.filter((r) => {
    if (filterStatus === "ALL") return true;
    return r.status === filterStatus;
  });

  const getPriorityBadge = (r: ReorderRecommendation) => {
    if (r.risk_label === "CRITICAL" || r.risk_score >= 80) {
      return {
        label: "Urgent",
        className: "bg-coral text-white border-coral font-extrabold",
      };
    }
    if (r.risk_label === "HIGH" || (r.risk_score >= 60 && r.risk_score < 80)) {
      return {
        label: "High Priority",
        className: "bg-coral/20 text-coral border-coral/30 font-bold",
      };
    }
    if (r.risk_label === "MEDIUM" || (r.risk_score >= 40 && r.risk_score < 60)) {
      return {
        label: "Medium Priority",
        className: "bg-amber/20 text-amber-dark border-amber/30 font-bold",
      };
    }
    return {
      label: "Normal",
      className: "bg-mint/20 text-mint-dark border-mint/30 font-bold",
    };
  };

  const getPlainReason = (r: ReorderRecommendation) => {
    if (r.explanation && !r.explanation.includes("Mamdani") && !r.explanation.includes("fuzzy")) {
      return r.explanation;
    }
    const expectedSalesBeforeArrival = Math.round(r.lead_time_days * r.forecast_daily_demand);
    if (r.current_stock <= 0) {
      return `Currently out of stock. Supplier takes ${r.lead_time_days} days to deliver. Order urgently.`;
    }
    if (r.current_stock < expectedSalesBeforeArrival) {
      return `Stock (${r.current_stock} units) may not cover the ~${expectedSalesBeforeArrival} units expected to sell during the ${r.lead_time_days}-day delivery time.`;
    }
    return `Stock is below safety buffer (${r.reorder_threshold} units). Supplier takes ${r.lead_time_days} days to deliver.`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8 animate-fade-in-up">
      {/* Hero Header */}
      <div className="bg-hero-dark rounded-2xl p-6 sm:p-8 text-cream border border-plum-border shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-coral/15 border border-coral/30 text-coral text-xs font-semibold">
            <ShoppingCart size={14} />
            <span>Smart Restocking</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            What Should I Restock First?
          </h1>
          <p className="text-sm text-mauve/90 max-w-2xl leading-relaxed">
            See which products need attention and how much stock you may need to order.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleOpenRestock()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-mint-dark hover:bg-emerald-700 text-white font-bold text-xs transition shadow-md active:scale-95 btn-interactive"
            title="Receive a supplier delivery for any existing product"
          >
            <PackagePlus size={15} />
            <span>Receive Stock</span>
          </button>
          <a
            href={api.getReportUrl("reorder")}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-plum hover:bg-plum-light text-cream font-semibold text-xs transition border border-plum-border shadow-sm active:scale-95 btn-interactive"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </a>
          <button
            onClick={loadRecommendations}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-coral hover:bg-coral-hover text-white font-semibold text-xs transition shadow-md active:scale-95 disabled:opacity-50 btn-interactive"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh List</span>
          </button>
        </div>
      </div>

      {/* Action Notification */}
      {actionMessage && (
        <div className="p-4 rounded-xl bg-mint/15 border border-mint/40 text-ink text-xs flex items-center gap-3">
          <CheckCircle2 size={16} className="text-mint-dark shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-coral/15 border border-coral/40 text-ink text-xs flex items-center gap-3">
          <AlertTriangle size={16} className="text-coral shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Products Needing Attention */}
        <div className="bg-paper rounded-2xl p-5 border border-cream-dark/60 shadow-sm space-y-1">
          <span className="text-xs font-bold text-ink-muted uppercase">Products Needing Attention</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-coral">
              {pendingCount}
            </span>
            <span className="text-xs text-ink-muted">items to restock</span>
          </div>
          <p className="text-[11px] text-ink-subtle">
            Ranked by urgency and risk of running out
          </p>
        </div>

        {/* Total Units to Order */}
        <div className="bg-paper rounded-2xl p-5 border border-cream-dark/60 shadow-sm space-y-1">
          <span className="text-xs font-bold text-ink-muted uppercase">Suggested Order Total</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-ink">
              {formatUnits(totalSuggestedUnits, 0)}
            </span>
            <span className="text-xs text-ink-muted">total units</span>
          </div>
          <p className="text-[11px] text-ink-subtle">
            Includes delivery window sales + safety buffer
          </p>
        </div>

        {/* Estimated Order Cost */}
        <div className="bg-paper rounded-2xl p-5 border border-cream-dark/60 shadow-sm space-y-1">
          <span className="text-xs font-bold text-ink-muted uppercase">Estimated Order Cost</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-plum">
              {formatINR(totalEstimatedCost)}
            </span>
          </div>
          <p className="text-[11px] text-ink-subtle">
            Estimated purchase cost at catalog unit rates
          </p>
        </div>
      </div>

      {/* Restock Advice Notice */}
      <div className="p-4 rounded-xl bg-amber/10 border border-amber/30 text-ink text-xs flex items-center gap-3">
        <Info size={18} className="text-amber-dark shrink-0" />
        <span className="text-ink-muted">
          <strong className="text-ink">Note for shopkeepers:</strong> StockSense AI calculates recommendations based on your sales pace and supplier delivery times. Orders are not automatically placed with suppliers — please confirm and place orders with your vendors directly.
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {["ALL", "PENDING", "REVIEWED", "ORDERED", "RECEIVED", "DISMISSED"].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-sm whitespace-nowrap btn-interactive ${
              filterStatus === st
                ? "bg-plum text-white border border-plum"
                : "bg-paper text-ink-muted border border-cream-dark/60 hover:text-ink hover:bg-cream-light"
            }`}
          >
            {st === "ALL" ? "All Recommendations" : st.charAt(0) + st.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Easy-to-Read Recommendations Table */}
      <div className="bg-paper rounded-2xl border border-cream-dark/60 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8">
            <BrandedLoader
              message="Checking restock priorities..."
              submessage="Calculating suggested order quantities"
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-ink-muted text-xs space-y-3">
            <ShieldCheck size={32} className="text-mint mx-auto" />
            <h4 className="text-sm font-bold text-ink">No Products Need Restocking Right Now</h4>
            <p className="max-w-md mx-auto">
              Inventory levels across all catalog items are currently above their safety thresholds.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-cream-light border-b border-cream-dark/60 text-ink-muted uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4 font-bold">Priority</th>
                  <th className="py-3 px-4 font-bold">Product</th>
                  <th className="py-3 px-4 font-bold text-center">Available Stock</th>
                  <th className="py-3 px-4 font-bold text-center">Expected Sales Before Delivery</th>
                  <th className="py-3 px-4 font-bold text-center">How Many Should I Order?</th>
                  <th className="py-3 px-4 font-bold">Reason for Recommendation</th>
                  <th className="py-3 px-4 font-bold text-center">Status</th>
                  <th className="py-3 px-4 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-dark/40">
                {filtered.map((r) => {
                  const priority = getPriorityBadge(r);
                  const expectedSalesBeforeArrival = Math.round(
                    r.lead_time_days * r.forecast_daily_demand
                  );
                  const reason = getPlainReason(r);

                  return (
                    <tr key={r.id} className="hover:bg-cream-light/40 transition">
                      {/* Priority */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[11px] ${
                              r.priority_rank <= 3
                                ? "bg-coral text-white"
                                : "bg-cream-dark text-ink"
                            }`}
                          >
                            #{r.priority_rank}
                          </span>
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] border ${priority.className}`}
                          >
                            {priority.label}
                          </span>
                        </div>
                      </td>

                      {/* Product */}
                      <td className="py-3 px-4 min-w-[130px] max-w-xs">
                        <div className="font-bold text-ink break-words">{r.name}</div>
                        <div className="text-[11px] text-ink-muted">{r.sku} • {r.category}</div>
                      </td>

                      {/* Available Stock */}
                      <td className="py-3 px-4 text-center">
                        <div className="font-black text-sm text-ink">
                          {formatUnits(r.current_stock, 0)}
                        </div>
                        <div className="text-[10px] text-ink-subtle">
                          Buffer: {formatUnits(r.reorder_threshold, 0)} units
                        </div>
                      </td>

                      {/* Expected Sales Before Next Delivery */}
                      <td className="py-3 px-4 text-center">
                        <div className="font-semibold text-ink">
                          ~{formatUnits(expectedSalesBeforeArrival, 0)} units
                        </div>
                        <div className="text-[10px] text-ink-muted">
                          over {formatUnits(r.lead_time_days, 0)} days delivery
                        </div>
                      </td>

                      {/* How Many Should I Order? */}
                      <td className="py-3 px-4 text-center">
                        <div className="text-sm font-black text-coral">
                          +{formatUnits(r.suggested_quantity, 0)} units
                        </div>
                        <div className="text-[10px] text-ink-subtle">
                          Includes {formatUnits(r.safety_stock_units, 0)}u buffer
                        </div>
                      </td>

                      {/* Reason for the Recommendation */}
                      <td className="py-3 px-4 max-w-xs">
                        <p className="text-xs text-ink-muted leading-relaxed">
                          {reason}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            r.status === "PENDING"
                              ? "bg-amber/15 text-amber-dark"
                              : r.status === "REVIEWED"
                              ? "bg-plum/15 text-plum"
                              : r.status === "ORDERED"
                              ? "bg-coral/15 text-coral"
                              : r.status === "RECEIVED"
                              ? "bg-mint/20 text-mint-dark"
                              : "bg-cream-dark text-ink-muted"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {r.status !== "RECEIVED" && (
                            <button
                              onClick={() => handleOpenRestock(r)}
                              className="px-2.5 py-1 bg-mint-dark hover:bg-emerald-700 text-white rounded text-[11px] font-bold transition shadow-xs flex items-center gap-1 btn-interactive"
                              title={`Receive stock delivery for ${r.name} (Suggested: ${r.suggested_quantity} units)`}
                            >
                              <PackagePlus size={12} /> Receive Stock
                            </button>
                          )}
                          {r.status === "PENDING" && (
                            <button
                              onClick={() => handleUpdateStatus(r.id, "ORDERED")}
                              disabled={actionLoadingId === r.id}
                              className="px-2.5 py-1 bg-coral/15 hover:bg-coral text-coral hover:text-white rounded text-[11px] font-bold transition shadow-xs btn-interactive"
                            >
                              Mark Ordered
                            </button>
                          )}
                          {r.status !== "DISMISSED" && r.status !== "RECEIVED" && (
                            <button
                              onClick={() => handleUpdateStatus(r.id, "DISMISSED")}
                              disabled={actionLoadingId === r.id}
                              className="px-2 py-1 text-ink-subtle hover:text-ink text-[11px] rounded transition btn-interactive"
                            >
                              Dismiss
                            </button>
                          )}
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

      {/* Reusable Restock Modal */}
      <RestockModal
        isOpen={isRestockModalOpen}
        onClose={() => {
          setIsRestockModalOpen(false);
          setRestockProduct(null);
          setRestockSuggestedQty(0);
        }}
        preselectedProduct={restockProduct}
        suggestedQuantity={restockSuggestedQty}
        onSuccess={handleRestockSuccess}
      />
    </div>
  );
};
