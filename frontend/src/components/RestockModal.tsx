import React, { useState, useEffect } from "react";
import {
  PackagePlus,
  X,
  Search,
  Calendar,
  IndianRupee,
  Truck,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { api, type Product, type RestockResult } from "../lib/api";
import { formatINR, formatUnits } from "../lib/formatters";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  preselectedProduct?: Product | null;
  suggestedQuantity?: number;
  onSuccess?: (result: RestockResult) => void;
}

function getLocalISODate(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const RestockModal: React.FC<Props> = ({
  isOpen,
  onClose,
  preselectedProduct,
  suggestedQuantity,
  onSuccess,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedProductId, setSelectedProductId] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(10);
  const [receiptDate, setReceiptDate] = useState<string>(getLocalISODate());
  const [unitCost, setUnitCost] = useState<number>(0);
  const [supplierName, setSupplierName] = useState<string>("");
  const [reference, setReference] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const [loadingProducts, setLoadingProducts] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<RestockResult | null>(null);

  // Load products list whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setFormError(null);
      setSuccessInfo(null);
      setReceiptDate(getLocalISODate());
      setReference("");
      setNote("");
      loadProducts();
    }
  }, [isOpen]);

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      const res = await api.getProducts({ size: 200 });
      setProducts(res.items);

      if (preselectedProduct) {
        setSelectedProductId(preselectedProduct.id);
        setUnitCost(preselectedProduct.unit_cost || 0);
        setSupplierName(preselectedProduct.supplier_name || "");
        if (suggestedQuantity && suggestedQuantity > 0) {
          setQuantity(suggestedQuantity);
        } else {
          setQuantity(10);
        }
      } else if (res.items.length > 0) {
        const first = res.items[0];
        setSelectedProductId(first.id);
        setUnitCost(first.unit_cost || 0);
        setSupplierName(first.supplier_name || "");
        setQuantity(10);
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to load catalogue products");
    } finally {
      setLoadingProducts(false);
    }
  };

  const activeProduct = products.find((p) => p.id === selectedProductId) || preselectedProduct;

  const handleProductSelect = (pId: number) => {
    setSelectedProductId(pId);
    const prod = products.find((p) => p.id === pId);
    if (prod) {
      setUnitCost(prod.unit_cost || 0);
      setSupplierName(prod.supplier_name || "");
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const previousStock = activeProduct ? activeProduct.current_stock : 0;
  const newStock = previousStock + (Number(quantity) || 0);
  const totalCost = (Number(quantity) || 0) * (Number(unitCost) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedProductId) {
      setFormError("Please select an existing product from the catalogue.");
      return;
    }
    if (!quantity || quantity <= 0) {
      setFormError("Quantity received must be greater than zero.");
      return;
    }
    if (!receiptDate) {
      setFormError("Please provide a valid receipt date.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.restockProduct(selectedProductId, {
        quantity,
        occurred_at: `${receiptDate}T12:00:00`,
        unit_cost: Number(unitCost) >= 0 ? Number(unitCost) : undefined,
        supplier_name: supplierName.trim() || undefined,
        reference: reference.trim() || undefined,
        note: note.trim() || undefined,
      });

      setSuccessInfo(result);
      if (onSuccess) {
        onSuccess(result);
      }

      // Close after briefly presenting positive feedback
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      setFormError(err.message || "Failed to record stock receipt");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-paper rounded-2xl border border-cream-dark shadow-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto animate-scale-in">
        {/* Modal Header */}
        <div className="p-5 border-b border-cream-dark flex items-center justify-between sticky top-0 bg-paper z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-mint/20 text-mint-dark flex items-center justify-center font-bold">
              <PackagePlus size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-ink">
                  Receive Stock / Restock Product
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-mint/20 text-mint-dark uppercase tracking-wider">
                  Existing Item
                </span>
              </div>
              <p className="text-xs text-ink-muted">
                Increase inventory for a product already in your catalogue
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-subtle hover:text-ink hover:bg-cream transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs">
          {formError && (
            <div className="p-3 bg-coral/15 border border-coral/30 rounded-xl text-coral text-xs flex items-center gap-2 animate-fade-in">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {successInfo && (
            <div className="p-4 bg-mint/20 border border-mint/40 rounded-xl text-mint-dark space-y-1 animate-fade-in">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 size={18} />
                <span>Stock Received Successfully!</span>
              </div>
              <p className="text-xs">
                Available quantity of <strong>{successInfo.product_name}</strong> updated from{" "}
                <span className="font-mono font-bold">{successInfo.previous_stock}</span> to{" "}
                <span className="font-mono font-bold text-mint-dark">{successInfo.new_stock} units</span>.
              </p>
            </div>
          )}

          {!successInfo && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Product Selector */}
              <div>
                <label className="block font-bold text-ink mb-1">
                  Target Product (Existing Catalogue) *
                </label>

                {products.length === 0 ? (
                  <div className="p-3 bg-cream rounded-lg text-ink-subtle text-xs">
                    {loadingProducts ? "Loading products..." : "No products available to restock."}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {products.length > 8 && (
                      <div className="relative">
                        <Search
                          size={14}
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-subtle"
                        />
                        <input
                          type="text"
                          placeholder="Search products by SKU or name..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 bg-cream rounded-lg border border-cream-dark focus:outline-none focus:border-coral text-xs"
                        />
                      </div>
                    )}

                    <select
                      value={selectedProductId}
                      onChange={(e) => handleProductSelect(parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-cream rounded-lg border border-cream-dark focus:outline-none focus:border-coral text-xs font-medium text-ink"
                    >
                      {filteredProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku}) — Available: {formatUnits(p.current_stock, 0)} units
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {activeProduct && (
                  <div className="mt-2 p-3 bg-cream/70 rounded-xl border border-cream-dark flex items-center justify-between">
                    <div>
                      <span className="font-bold text-ink text-xs">{activeProduct.name}</span>
                      <div className="text-[11px] text-ink-subtle font-mono">
                        SKU: {activeProduct.sku} • Category: {activeProduct.category}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-ink-muted uppercase font-bold block">
                        Current Stock
                      </span>
                      <span className="text-sm font-black text-ink">
                        {formatUnits(activeProduct.current_stock, 0)} units
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Live Stock Calculation Preview */}
              <div className="p-3.5 bg-mint/10 border border-mint/30 rounded-xl space-y-1.5">
                <div className="text-[11px] font-bold text-mint-dark uppercase tracking-wider flex items-center gap-1.5">
                  <PackagePlus size={13} /> Stock Calculation Equation
                </div>
                <div className="flex items-center justify-between text-xs font-semibold text-ink">
                  <div>
                    <span className="text-ink-muted block text-[10px]">Previous Available</span>
                    <span className="font-bold">{formatUnits(previousStock, 0)} units</span>
                  </div>
                  <span className="text-mint-dark font-black text-base">+</span>
                  <div>
                    <span className="text-ink-muted block text-[10px]">Quantity Received</span>
                    <span className="font-bold text-mint-dark">+{formatUnits(quantity || 0, 0)} units</span>
                  </div>
                  <ArrowRight size={14} className="text-mint-dark" />
                  <div className="text-right">
                    <span className="text-ink-muted block text-[10px]">New Available Stock</span>
                    <span className="font-black text-sm text-ink">{formatUnits(newStock, 0)} units</span>
                  </div>
                </div>
              </div>

              {/* Quantity Received & Receipt Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-ink">Quantity Received *</label>
                    {suggestedQuantity && suggestedQuantity > 0 && (
                      <span className="text-[10px] text-coral font-bold flex items-center gap-1">
                        <Sparkles size={11} /> Suggested: {suggestedQuantity}
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-cream rounded-lg border border-cream-dark focus:outline-none focus:border-coral text-xs font-bold text-ink"
                  />
                  {suggestedQuantity && suggestedQuantity > 0 && (
                    <span className="mt-1 block text-[10px] text-ink-subtle">
                      Pre-filled with AI recommendation. You can adjust the quantity.
                    </span>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-ink mb-1 flex items-center gap-1">
                    <Calendar size={13} className="text-coral" /> Date Received *
                  </label>
                  <input
                    type="date"
                    required
                    value={receiptDate}
                    onChange={(e) => setReceiptDate(e.target.value)}
                    className="w-full px-3 py-2 bg-cream rounded-lg border border-cream-dark focus:outline-none focus:border-coral text-xs font-mono text-ink"
                  />
                  <span className="mt-1 block text-[10px] text-ink-subtle">
                    Defaults to today. Editable for past arrivals.
                  </span>
                </div>
              </div>

              {/* Purchase Cost & Supplier */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-ink mb-1 flex items-center gap-1">
                    <IndianRupee size={12} className="text-coral" /> Purchase Cost / Unit (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={unitCost}
                    onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-cream rounded-lg border border-cream-dark focus:outline-none focus:border-coral text-xs font-mono"
                  />
                  <div className="mt-1 text-[11px] font-bold text-ink flex items-center justify-between">
                    <span className="text-ink-subtle font-normal">Total Batch Cost:</span>
                    <span className="text-mint-dark font-bold">{formatINR(totalCost)}</span>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-ink mb-1 flex items-center gap-1">
                    <Truck size={13} className="text-coral" /> Supplier Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Metro Wholesale, Local Distributor"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full px-3 py-2 bg-cream rounded-lg border border-cream-dark focus:outline-none focus:border-coral text-xs"
                  />
                </div>
              </div>

              {/* Reference & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-ink mb-1 flex items-center gap-1">
                    <FileText size={13} className="text-coral" /> Invoice / PO Reference
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PO-4001 or INV-8921"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full px-3 py-2 bg-cream rounded-lg border border-cream-dark focus:outline-none focus:border-coral text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-ink mb-1">Notes / Remarks</label>
                  <input
                    type="text"
                    placeholder="e.g. Shipment verified by manager"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full px-3 py-2 bg-cream rounded-lg border border-cream-dark focus:outline-none focus:border-coral text-xs"
                  />
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-cream-dark">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-cream hover:bg-cream-dark text-ink font-semibold rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedProductId || quantity <= 0}
                  className="px-6 py-2.5 bg-mint-dark hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  <PackagePlus size={15} />
                  {submitting
                    ? "Receiving Stock..."
                    : `Confirm Stock Receipt (+${formatUnits(quantity || 0, 0)} units)`}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
