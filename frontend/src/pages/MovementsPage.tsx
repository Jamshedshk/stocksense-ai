import React, { useEffect, useState } from "react";
import {
  ArrowLeftRight,
  TrendingUp,
  PackagePlus,
  RotateCcw,
  AlertOctagon,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Filter,
  RefreshCw,
  Plus,
  Calendar,
  IndianRupee,
  Truck,
  FileText,
  Clock,
  Layers,
} from "lucide-react";
import {
  api,
  type Product,
  type StockMovement,
  type MovementSummary,
} from "../lib/api";
import {
  formatINR,
  formatUnits,
  formatDateTime,
  formatDate,
} from "../lib/formatters";

interface Props {
  initialProduct?: Product | null;
}

// Helpers for local date/time string representations without UTC offset drift
function getLocalISODate(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getLocalISODateTime(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${mins}`;
}

export const MovementsPage: React.FC<Props> = ({ initialProduct }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filter State
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [filterProductId, setFilterProductId] = useState<number>(0);
  const [datePreset, setDatePreset] = useState<"ALL" | "TODAY" | "7D" | "30D" | "90D" | "CUSTOM">("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Period Summary State
  const [summary, setSummary] = useState<MovementSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Form State
  const [selectedProductId, setSelectedProductId] = useState<number>(initialProduct?.id || 0);
  const [movementType, setMovementType] = useState<string>("SALE");
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [supplierName, setSupplierName] = useState<string>("");
  const [transactionDate, setTransactionDate] = useState<string>(getLocalISODate());
  const [transactionDateTime, setTransactionDateTime] = useState<string>(getLocalISODateTime());
  const [reference, setReference] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const activeProduct = products.find((p) => p.id === selectedProductId);

  // Populate default product prices & suppliers when activeProduct or movementType changes
  useEffect(() => {
    if (activeProduct) {
      if (movementType === "SALE") {
        setUnitPrice(activeProduct.selling_price || 0);
      } else if (movementType === "STOCK_RECEIPT") {
        setUnitPrice(activeProduct.unit_cost || 0);
        setSupplierName(activeProduct.supplier_name || "");
      }
    }
  }, [activeProduct, movementType]);

  const fetchProducts = async () => {
    try {
      const res = await api.getProducts({ size: 200 });
      setProducts(res.items);
      if (!selectedProductId && res.items.length > 0) {
        setSelectedProductId(res.items[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMovements = async () => {
    try {
      setLoading(true);
      const res = await api.getMovements({
        product_id: filterProductId > 0 ? filterProductId : undefined,
        movement_type: selectedType !== "ALL" ? selectedType : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        page,
        size: 15,
      });
      setMovements(res.items);
      setTotal(res.total);
      setPages(res.pages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      setSummaryLoading(true);
      const res = await api.getMovementsSummary({
        product_id: filterProductId > 0 ? filterProductId : undefined,
        movement_type: selectedType !== "ALL" ? selectedType : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      setSummary(res);
    } catch (err) {
      console.error("Failed to fetch movement summary:", err);
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchMovements();
    fetchSummary();
  }, [page, selectedType, filterProductId, startDate, endDate]);

  const handlePresetChange = (preset: "ALL" | "TODAY" | "7D" | "30D" | "90D" | "CUSTOM") => {
    setDatePreset(preset);
    setPage(1);
    const today = new Date();
    if (preset === "ALL") {
      setStartDate("");
      setEndDate("");
    } else if (preset === "TODAY") {
      const todayStr = getLocalISODate(today);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "7D") {
      const past = new Date();
      past.setDate(today.getDate() - 7);
      setStartDate(getLocalISODate(past));
      setEndDate(getLocalISODate(today));
    } else if (preset === "30D") {
      const past = new Date();
      past.setDate(today.getDate() - 30);
      setStartDate(getLocalISODate(past));
      setEndDate(getLocalISODate(today));
    } else if (preset === "90D") {
      const past = new Date();
      past.setDate(today.getDate() - 90);
      setStartDate(getLocalISODate(past));
      setEndDate(getLocalISODate(today));
    }
    // "CUSTOM" preserves whatever start/end date user manually inputs
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!selectedProductId) {
      setFormError("Please select a target product.");
      return;
    }
    if (quantity <= 0) {
      setFormError("Quantity must be greater than zero.");
      return;
    }

    if (movementType === "SALE") {
      if (activeProduct && quantity > activeProduct.current_stock) {
        setFormError(
          `Insufficient stock! Product "${activeProduct.name}" only has ${formatUnits(
            activeProduct.current_stock,
            0
          )} units available.`
        );
        return;
      }
      if (!transactionDateTime) {
        setFormError("Please enter a valid Sale Date and Time.");
        return;
      }
    } else if (movementType === "STOCK_RECEIPT") {
      if (!transactionDate) {
        setFormError("Please enter a valid Date Received.");
        return;
      }
    }

    setSubmitting(true);
    try {
      // Prepare timestamp
      let occurredAt: string;
      if (movementType === "STOCK_RECEIPT") {
        occurredAt = `${transactionDate}T12:00:00`;
      } else if (movementType === "SALE") {
        occurredAt = transactionDateTime.length === 16 ? `${transactionDateTime}:00` : transactionDateTime;
      } else {
        occurredAt = transactionDateTime.length === 16 ? `${transactionDateTime}:00` : transactionDateTime;
      }

      const created = await api.recordMovement({
        product_id: selectedProductId,
        movement_type: movementType,
        quantity,
        occurred_at: occurredAt,
        unit_price: Number(unitPrice) >= 0 ? Number(unitPrice) : undefined,
        supplier_name: movementType === "STOCK_RECEIPT" ? supplierName.trim() || undefined : undefined,
        reference: reference.trim() || undefined,
        note: note.trim() || undefined,
      });

      const dateLabel = formatDate(created.occurred_at);
      if (
        movementType === "STOCK_RECEIPT" &&
        created.previous_stock !== undefined &&
        created.previous_stock !== null &&
        created.current_stock !== undefined &&
        created.current_stock !== null
      ) {
        setSuccessMessage(
          `Stock received successfully. Available quantity of '${created.product_name || activeProduct?.name}' updated from ${created.previous_stock} to ${created.current_stock} units.`
        );
      } else {
        setSuccessMessage(
          `Successfully recorded ${movementType.replace("_", " ")} on ${dateLabel}: ${formatUnits(
            quantity,
            0
          )} units (Stock change: ${created.stock_delta > 0 ? "+" : ""}${created.stock_delta}).`
        );
      }

      // Reset form defaults
      setQuantity(1);
      setReference("");
      setNote("");
      setTransactionDate(getLocalISODate());
      setTransactionDateTime(getLocalISODateTime());

      // Refresh data across the board
      await fetchProducts();
      await fetchMovements();
      await fetchSummary();
    } catch (err: any) {
      setFormError(err.message || "Failed to record movement");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in-up">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black text-ink tracking-tight flex items-center gap-2">
          <ArrowLeftRight className="text-coral" size={26} /> Sales & Stock Operations
        </h1>
        <p className="text-xs text-ink-muted mt-0.5">
          Record counter sales, stock receipts, customer returns, or inventory count adjustments with dated ledger auditing.
        </p>
      </div>

      {/* Transaction Recording Form Card */}
      <div className="bg-paper rounded-2xl border border-cream-dark p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-cream-dark">
          <h2 className="text-sm font-bold text-ink flex items-center gap-2">
            <Plus className="text-coral" size={16} /> Record Transaction
          </h2>
          <span className="text-xs text-ink-muted font-medium flex items-center gap-1.5">
            <Clock size={13} className="text-coral" /> Dated & Audited Ledger
          </span>
        </div>

        {formError && (
          <div className="p-3 bg-coral/15 border border-coral/30 rounded-xl text-coral text-xs flex items-center gap-2 animate-fade-in">
            <AlertTriangle size={15} />
            <span>{formError}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-mint/20 border border-mint/40 rounded-xl text-mint-dark text-xs flex items-center gap-2 animate-fade-in">
            <CheckCircle2 size={15} />
            <span>{successMessage}</span>
          </div>
        )}

        {products.length === 0 ? (
          <div className="p-8 text-center bg-cream/40 rounded-xl border border-dashed border-cream-dark space-y-2">
            <p className="font-bold text-sm text-ink">No products found in this workspace</p>
            <p className="text-xs text-ink-muted">
              Add your first product in the Products tab before recording stock movements or counter sales.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Movement Type Selector Pills */}
            <div>
              <label className="block font-bold text-ink mb-1.5">Action Type *</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  {
                    type: "SALE",
                    label: "Counter Sale",
                    desc: "Deducts stock",
                    icon: TrendingUp,
                  },
                  {
                    type: "STOCK_RECEIPT",
                    label: "Receive Stock",
                    desc: "Adds restock",
                    icon: PackagePlus,
                  },
                  {
                    type: "CUSTOMER_RETURN",
                    label: "Customer Return",
                    desc: "Restores stock",
                    icon: RotateCcw,
                  },
                  {
                    type: "DAMAGE_LOSS",
                    label: "Damaged / Lost",
                    desc: "Deducts units",
                    icon: AlertOctagon,
                  },
                  {
                    type: "ADJUSTMENT",
                    label: "Count Adjustment",
                    desc: "Corrects balance",
                    icon: Sliders,
                  },
                ].map((m) => {
                  const Icon = m.icon;
                  const isSelected = movementType === m.type;
                  return (
                    <button
                      key={m.type}
                      type="button"
                      onClick={() => {
                        setMovementType(m.type);
                        setFormError(null);
                        setSuccessMessage(null);
                      }}
                      className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                        isSelected
                          ? "bg-aubergine text-white border-aubergine shadow-sm"
                          : "bg-cream/40 border-cream-dark text-ink hover:bg-cream"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">{m.label}</span>
                        <Icon size={14} className={isSelected ? "text-coral" : "text-ink-subtle"} />
                      </div>
                      <span className="text-[10px] text-ink-subtle mt-1">{m.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Product */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-ink mb-1">Target Product *</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => {
                    const id = parseInt(e.target.value);
                    setSelectedProductId(id);
                    const prod = products.find((p) => p.id === id);
                    if (prod) {
                      if (movementType === "SALE") setUnitPrice(prod.selling_price || 0);
                      if (movementType === "STOCK_RECEIPT") {
                        setUnitPrice(prod.unit_cost || 0);
                        setSupplierName(prod.supplier_name || "");
                      }
                    }
                  }}
                  className="w-full px-3 py-2 bg-cream rounded-lg border border-cream-dark focus:outline-none focus:border-coral text-xs"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) — Stock: {formatUnits(p.current_stock, 0)}
                    </option>
                  ))}
                </select>
                {activeProduct && (
                  <div className="mt-1 text-[11px] text-ink-subtle flex flex-wrap gap-2">
                    <span>
                      Stock: <strong className="text-ink">{formatUnits(activeProduct.current_stock, 0)} units</strong>
                    </span>
                    <span>
                      Cost: <strong className="text-ink">{formatINR(activeProduct.unit_cost)}</strong>
                    </span>
                    <span>
                      Price: <strong className="text-ink">{formatINR(activeProduct.selling_price)}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Quantity */}
              <div>
                <label className="block font-bold text-ink mb-1">
                  {movementType === "SALE"
                    ? "Quantity Sold *"
                    : movementType === "STOCK_RECEIPT"
                    ? "Quantity Received *"
                    : "Quantity (Units) *"}
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-cream rounded-lg border border-cream-dark focus:outline-none focus:border-coral text-xs"
                />
                {activeProduct && (
                  <div className="mt-1 text-[11px] font-medium">
                    {movementType === "SALE" ? (
                      quantity > activeProduct.current_stock ? (
                        <span className="text-coral font-bold flex items-center gap-1">
                          <AlertTriangle size={12} /> Insufficient stock ({formatUnits(activeProduct.current_stock, 0)} available)
                        </span>
                      ) : (
                        <span className="text-ink-subtle">
                          Stock after sale: <strong className="text-ink">{formatUnits(activeProduct.current_stock - quantity, 0)} units</strong>
                        </span>
                      )
                    ) : movementType === "STOCK_RECEIPT" ? (
                      <span className="text-mint-dark">
                        Stock after receipt: <strong className="text-ink">{formatUnits(activeProduct.current_stock + quantity, 0)} units</strong>
                      </span>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Date & Time Picker */}
              <div>
                {movementType === "STOCK_RECEIPT" ? (
                  <>
                    <label className="block font-bold text-ink mb-1 flex items-center gap-1">
                      <Calendar size={13} className="text-coral" /> Date Received *
                    </label>
                    <input
                      type="date"
                      required
                      value={transactionDate}
                      onChange={(e) => setTransactionDate(e.target.value)}
                      className="w-full px-3 py-2 bg-cream rounded-lg border border-cream-dark focus:outline-none focus:border-coral text-xs font-mono"
                    />
                    <span className="mt-1 block text-[10px] text-ink-subtle">
                      Defaults to today. Editable for past shipments.
                    </span>
                  </>
                ) : (
                  <>
                    <label className="block font-bold text-ink mb-1 flex items-center gap-1">
                      <Calendar size={13} className="text-coral" />
                      {movementType === "SALE" ? "Sale Date & Time *" : "Transaction Date & Time *"}
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={transactionDateTime}
                      onChange={(e) => setTransactionDateTime(e.target.value)}
                      className="w-full px-3 py-2 bg-cream rounded-lg border border-cream-dark focus:outline-none focus:border-coral text-xs font-mono"
                    />
                    <span className="mt-1 block text-[10px] text-ink-subtle">
                      Defaults to now. Editable for historical records.
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Financial & Supplier Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              {/* Unit Price / Cost */}
              <div>
                <label className="block font-bold text-ink mb-1 flex items-center gap-1">
                  <IndianRupee size={12} className="text-coral" />
                  {movementType === "SALE"
                    ? "Actual Selling Price / Unit (₹)"
                    : movementType === "STOCK_RECEIPT"
                    ? "Purchase Cost / Unit (₹)"
                    : "Unit Value (₹, optional)"}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-cream rounded-lg border border-cream-dark focus:outline-none focus:border-coral text-xs font-mono"
                />
                <div className="mt-1 text-[11px] font-bold text-ink flex items-center justify-between">
                  <span className="text-ink-subtle font-normal">
                    {movementType === "SALE" ? "Total Revenue:" : "Total Amount:"}
                  </span>
                  <span className={movementType === "SALE" ? "text-coral font-bold" : "text-mint-dark font-bold"}>
                    {formatINR(quantity * unitPrice)}
                  </span>
                </div>
              </div>

              {/* Supplier (for stock receipts) or Reference */}
              {movementType === "STOCK_RECEIPT" ? (
                <div>
                  <label className="block font-bold text-ink mb-1 flex items-center gap-1">
                    <Truck size={13} className="text-coral" /> Supplier Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Metro Cash & Carry, Local Distributor"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full px-3 py-2 bg-cream rounded-lg border border-cream-dark focus:outline-none focus:border-coral text-xs"
                  />
                  <span className="mt-1 block text-[10px] text-ink-subtle">
                    Preloaded from product supplier if available.
                  </span>
                </div>
              ) : (
                <div>
                  <label className="block font-bold text-ink mb-1 flex items-center gap-1">
                    <FileText size={13} className="text-coral" /> Receipt / Invoice Ref
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. BILL-1024 or CASH-99"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full px-3 py-2 bg-cream rounded-lg border border-cream-dark focus:outline-none focus:border-coral text-xs font-mono"
                  />
                  <span className="mt-1 block text-[10px] text-ink-subtle">
                    Optional reference for easy reconciliation.
                  </span>
                </div>
              )}

              {/* Reference (for receipts) or Notes */}
              {movementType === "STOCK_RECEIPT" ? (
                <div>
                  <label className="block font-bold text-ink mb-1 flex items-center gap-1">
                    <FileText size={13} className="text-coral" /> Purchase Order / Invoice Ref
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PO-4001 or GRN-882"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full px-3 py-2 bg-cream rounded-lg border border-cream-dark focus:outline-none focus:border-coral text-xs font-mono"
                  />
                </div>
              ) : (
                <div>
                  <label className="block font-bold text-ink mb-1">Notes / Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Counter sale, regular customer"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full px-3 py-2 bg-cream rounded-lg border border-cream-dark focus:outline-none focus:border-coral text-xs"
                  />
                </div>
              )}
            </div>

            {movementType === "STOCK_RECEIPT" && (
              <div>
                <label className="block font-bold text-ink mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Delivery verified by store manager, batch intact"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-2 bg-cream rounded-lg border border-cream-dark focus:outline-none focus:border-coral text-xs"
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-cream-dark/60">
              <div className="text-[11px] text-ink-muted">
                System records creation timestamp separately from entered transaction date.
              </div>
              <button
                type="submit"
                disabled={
                  submitting ||
                  (movementType === "SALE" && activeProduct && quantity > activeProduct.current_stock)
                }
                className="px-6 py-2.5 bg-coral hover:bg-coral-hover text-white rounded-xl font-bold shadow transition active:scale-95 disabled:opacity-50"
              >
                {submitting
                  ? "Saving..."
                  : movementType === "SALE"
                  ? `Confirm Sale (${formatINR(quantity * unitPrice)})`
                  : movementType === "STOCK_RECEIPT"
                  ? `Confirm Receipt (${formatINR(quantity * unitPrice)})`
                  : `Confirm ${movementType.replace("_", " ")}`}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Period Summary KPI Strip */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-ink flex items-center gap-2">
              <Layers size={18} className="text-coral" /> Movement & Sales Summary
            </h2>
            <p className="text-xs text-ink-muted">
              Live period statistics derived from actual transaction dates and recorded prices
            </p>
          </div>

          {/* Date Filter Presets */}
          <div className="flex flex-wrap items-center gap-1.5 bg-cream/70 p-1 rounded-xl border border-cream-dark">
            {[
              { id: "ALL", label: "All Time" },
              { id: "TODAY", label: "Today" },
              { id: "7D", label: "Last 7 Days" },
              { id: "30D", label: "Last 30 Days" },
              { id: "90D", label: "Last 90 Days" },
              { id: "CUSTOM", label: "Custom Range" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePresetChange(p.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  datePreset === p.id
                    ? "bg-aubergine text-white shadow-xs"
                    : "text-ink-muted hover:text-ink hover:bg-cream"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range Inputs */}
        {datePreset === "CUSTOM" && (
          <div className="p-3 bg-paper rounded-xl border border-cream-dark flex flex-wrap items-center gap-3 text-xs">
            <span className="font-bold text-ink flex items-center gap-1">
              <Calendar size={13} className="text-coral" /> Filter by Date:
            </span>
            <div className="flex items-center gap-1.5">
              <label className="text-ink-muted">From:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1 bg-cream rounded border border-cream-dark font-mono text-xs focus:outline-none focus:border-coral"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-ink-muted">To:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1 bg-cream rounded border border-cream-dark font-mono text-xs focus:outline-none focus:border-coral"
              />
            </div>
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setDatePreset("ALL");
                }}
                className="text-coral hover:underline text-[11px] font-semibold"
              >
                Reset Dates
              </button>
            )}
          </div>
        )}

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-paper rounded-xl border border-cream-dark shadow-xs space-y-1">
            <span className="text-[11px] font-semibold text-ink-muted block">Sales During This Period</span>
            <div className="text-lg font-black text-coral">
              {summaryLoading ? "..." : formatINR(summary?.sales_revenue || 0)}
            </div>
            <span className="text-xs text-ink font-medium block">
              {summaryLoading ? "..." : `${formatUnits(summary?.units_sold || 0, 0)} units sold`}
            </span>
          </div>

          <div className="p-4 bg-paper rounded-xl border border-cream-dark shadow-xs space-y-1">
            <span className="text-[11px] font-semibold text-ink-muted block">Stock Received This Period</span>
            <div className="text-lg font-black text-mint-dark">
              {summaryLoading ? "..." : formatINR(summary?.receipt_cost || 0)}
            </div>
            <span className="text-xs text-ink font-medium block">
              {summaryLoading ? "..." : `${formatUnits(summary?.units_received || 0, 0)} units received`}
            </span>
          </div>

          <div className="p-4 bg-paper rounded-xl border border-cream-dark shadow-xs space-y-1">
            <span className="text-[11px] font-semibold text-ink-muted block">Net Stock Delta</span>
            <div
              className={`text-lg font-black ${
                (summary?.net_stock_delta || 0) >= 0 ? "text-mint-dark" : "text-coral"
              }`}
            >
              {summaryLoading
                ? "..."
                : `${(summary?.net_stock_delta || 0) > 0 ? "+" : ""}${formatUnits(
                    summary?.net_stock_delta || 0,
                    0
                  )} units`}
            </div>
            <span className="text-xs text-ink-muted block">Balance impact in period</span>
          </div>

          <div className="p-4 bg-paper rounded-xl border border-cream-dark shadow-xs space-y-1">
            <span className="text-[11px] font-semibold text-ink-muted block">Transactions Recorded</span>
            <div className="text-lg font-black text-ink">
              {summaryLoading ? "..." : summary?.transactions_count || 0}
            </div>
            <span className="text-xs text-ink-muted block">Audited ledger entries</span>
          </div>
        </div>
      </div>

      {/* Movement Ledger Table */}
      <div className="bg-paper rounded-2xl border border-cream-dark shadow-sm overflow-hidden space-y-3 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-cream-dark">
          <div>
            <h2 className="text-base font-bold text-ink">Transaction History Ledger</h2>
            <p className="text-xs text-ink-muted">
              Complete auditable trail with transaction dates, prices, and system timestamps ({total} records)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Filter size={14} className="text-ink-subtle" />

            {/* Product Filter */}
            <select
              value={filterProductId}
              onChange={(e) => {
                setFilterProductId(parseInt(e.target.value) || 0);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-cream rounded-lg border border-cream-dark text-xs focus:outline-none focus:border-coral max-w-[160px] truncate"
            >
              <option value="0">All Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-cream rounded-lg border border-cream-dark text-xs focus:outline-none focus:border-coral"
            >
              <option value="ALL">All Types</option>
              <option value="SALE">SALE</option>
              <option value="STOCK_RECEIPT">STOCK_RECEIPT</option>
              <option value="CUSTOMER_RETURN">CUSTOMER_RETURN</option>
              <option value="DAMAGE_LOSS">DAMAGE_LOSS</option>
              <option value="ADJUSTMENT">ADJUSTMENT</option>
              <option value="OPENING_STOCK">OPENING_STOCK</option>
            </select>

            <button
              onClick={() => {
                fetchMovements();
                fetchSummary();
              }}
              className="p-1.5 rounded-lg bg-cream hover:bg-cream-dark text-ink-subtle hover:text-ink transition"
              title="Refresh Ledger"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-ink-subtle animate-pulse">Loading ledger records...</div>
        ) : movements.length === 0 ? (
          <div className="p-8 text-center text-xs text-ink-subtle">
            No movements found matching the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-ink-muted border-b border-cream-dark">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Transaction Date</th>
                  <th className="py-2.5 px-3 font-semibold">Product</th>
                  <th className="py-2.5 px-3 font-semibold">Type</th>
                  <th className="py-2.5 px-3 font-semibold">Units</th>
                  <th className="py-2.5 px-3 font-semibold">Unit Price / Cost</th>
                  <th className="py-2.5 px-3 font-semibold">Total Amount</th>
                  <th className="py-2.5 px-3 font-semibold">Stock Delta</th>
                  <th className="py-2.5 px-3 font-semibold">Supplier / Ref</th>
                  <th className="py-2.5 px-3 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-dark/60">
                {movements.map((m) => {
                  const isPositive = m.stock_delta > 0;
                  return (
                    <tr key={m.id} className="hover:bg-cream/40 transition">
                      {/* Transaction Date & Recorded Timestamp */}
                      <td className="py-2.5 px-3 text-ink whitespace-nowrap">
                        <div className="font-semibold text-ink">
                          {formatDateTime(m.occurred_at)}
                        </div>
                        {m.created_at && (
                          <div className="text-[10px] text-ink-subtle font-mono" title={`System recorded at: ${m.created_at}`}>
                            Rec: {formatDateTime(m.created_at)}
                          </div>
                        )}
                      </td>

                      {/* Product Name & SKU */}
                      <td className="py-2.5 px-3 min-w-[140px] max-w-xs">
                        <div className="font-semibold text-ink break-words">{m.product_name}</div>
                        <div className="text-[10px] font-mono text-ink-subtle">{m.product_sku}</div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            m.movement_type === "SALE"
                              ? "bg-coral/15 text-coral"
                              : m.movement_type === "STOCK_RECEIPT"
                              ? "bg-mint/20 text-mint-dark"
                              : m.movement_type === "CUSTOMER_RETURN"
                              ? "bg-amber/20 text-amber-dark"
                              : m.movement_type === "OPENING_STOCK"
                              ? "bg-plum/20 text-cream-dark"
                              : "bg-mauve/20 text-mauve-dark"
                          }`}
                        >
                          {m.movement_type}
                        </span>
                      </td>

                      {/* Units */}
                      <td className="py-2.5 px-3 font-bold text-ink whitespace-nowrap">
                        {formatUnits(m.quantity, 0)}
                      </td>

                      {/* Unit Price / Cost */}
                      <td className="py-2.5 px-3 font-mono text-ink whitespace-nowrap">
                        {m.unit_price !== undefined && m.unit_price !== null
                          ? formatINR(m.unit_price)
                          : "—"}
                      </td>

                      {/* Total Amount */}
                      <td className="py-2.5 px-3 font-mono font-bold whitespace-nowrap">
                        {m.total_amount !== undefined && m.total_amount !== null
                          ? formatINR(m.total_amount)
                          : m.unit_price !== undefined && m.unit_price !== null
                          ? formatINR(m.quantity * m.unit_price)
                          : "—"}
                      </td>

                      {/* Stock Delta */}
                      <td className={`py-2.5 px-3 font-black whitespace-nowrap ${isPositive ? "text-mint-dark" : "text-coral"}`}>
                        {isPositive ? `+${formatUnits(m.stock_delta, 0)}` : formatUnits(m.stock_delta, 0)}
                      </td>

                      {/* Supplier / Ref */}
                      <td className="py-2.5 px-3 text-ink-muted whitespace-nowrap">
                        {m.supplier_name ? (
                          <div className="font-medium text-ink flex items-center gap-1">
                            <Truck size={11} className="text-mint-dark shrink-0" />
                            <span className="truncate max-w-[120px]">{m.supplier_name}</span>
                          </div>
                        ) : null}
                        {m.reference ? (
                          <div className="font-mono text-[10px] text-ink-subtle">{m.reference}</div>
                        ) : !m.supplier_name ? (
                          "—"
                        ) : null}
                      </td>

                      {/* Notes */}
                      <td className="py-2.5 px-3 text-ink-muted max-w-xs truncate" title={m.note || ""}>
                        {m.note || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-3 bg-cream-light border-t border-cream-dark/60 flex items-center justify-between text-xs text-ink-muted">
          <span>
            Showing page <strong>{page}</strong> of <strong>{pages}</strong> ({total} total movements)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-2.5 py-1 rounded-lg border border-cream-dark bg-white font-medium hover:bg-cream disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages}
              className="px-2.5 py-1 rounded-lg border border-cream-dark bg-white font-medium hover:bg-cream disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
