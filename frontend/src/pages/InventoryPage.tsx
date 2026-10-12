import React, { useEffect, useState } from "react";
import {
  Boxes,
  Search,
  Filter,
  PlusCircle,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  Upload,
  PackagePlus,
} from "lucide-react";
import { api, type Product, type RestockResult } from "../lib/api";
import { formatINR, formatUnits } from "../lib/formatters";
import { RestockModal } from "../components/RestockModal";

interface Props {
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
  onOpenRecordMovement: (product: Product) => void;
  onOpenImportCSV?: () => void;
}

export const InventoryPage: React.FC<Props> = ({
  isAddModalOpen,
  setIsAddModalOpen,
  onOpenRecordMovement,
  onOpenImportCSV,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Product Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [integrityStatus, setIntegrityStatus] = useState<Record<number, { consistent: boolean; sum: number }>>({});

  // Restock Existing Product Modal State
  const [isRestockModalOpen, setIsRestockModalOpen] = useState<boolean>(false);
  const [restockTargetProduct, setRestockTargetProduct] = useState<Product | null>(null);
  const [restockSuccessAlert, setRestockSuccessAlert] = useState<string | null>(null);

  // Form State for Adding Product
  const [newProduct, setNewProduct] = useState({
    sku: "",
    name: "",
    category: "Electronics",
    description: "",
    opening_stock: 10,
    unit_cost: 20.0,
    selling_price: 39.99,
    reorder_threshold: 5,
    supplier_lead_time_days: 7,
    supplier_name: "",
    supplier_contact: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getProducts({
        search: search.trim() || undefined,
        category: selectedCategory !== "all" ? selectedCategory : undefined,
        page,
        size: pageSize,
      });
      setProducts(res.items);
      setTotal(res.total);
      setPages(res.pages);

      // Extract unique categories
      const allCats = Array.from(new Set(res.items.map((p) => p.category))).filter(Boolean);
      if (allCats.length > 0) {
        setCategories((prev) => Array.from(new Set([...prev, ...allCats])));
      }
    } catch (err: any) {
      setError(err.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const handleVerifyIntegrity = async (pId: number) => {
    try {
      const res = await api.verifyStockIntegrity(pId);
      setIntegrityStatus((prev) => ({
        ...prev,
        [pId]: { consistent: res.is_consistent, sum: res.ledger_sum_deltas },
      }));
    } catch (err) {
      alert("Verification failed: " + err);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await api.createProduct(newProduct);
      setIsAddModalOpen(false);
      // Reset form
      setNewProduct({
        sku: "",
        name: "",
        category: "Electronics",
        description: "",
        opening_stock: 10,
        unit_cost: 20.0,
        selling_price: 39.99,
        reorder_threshold: 5,
        supplier_lead_time_days: 7,
        supplier_name: "",
        supplier_contact: "",
      });
      fetchProducts();
    } catch (err: any) {
      setFormError(err.message || "Failed to create product");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setSubmitting(true);
    try {
      await api.updateProduct(editingProduct.id, {
        name: editingProduct.name,
        category: editingProduct.category,
        unit_cost: editingProduct.unit_cost,
        selling_price: editingProduct.selling_price,
        reorder_threshold: editingProduct.reorder_threshold,
        supplier_lead_time_days: editingProduct.supplier_lead_time_days,
        supplier_name: editingProduct.supplier_name,
        supplier_contact: editingProduct.supplier_contact,
      });
      setEditingProduct(null);
      fetchProducts();
    } catch (err: any) {
      alert(err.message || "Failed to update product");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in-up">
      {/* Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-ink tracking-tight flex items-center gap-2">
            <Boxes className="text-coral" size={26} /> Product Catalogue & Inventory
          </h1>
          <p className="text-xs text-ink-muted mt-0.5">
            Total {total} active products tracked in your store
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onOpenImportCSV && (
            <button
              onClick={onOpenImportCSV}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-paper hover:bg-cream border border-cream-dark text-ink rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
            >
              <Upload size={14} className="text-coral" /> Import CSV
            </button>
          )}
          <button
            onClick={() => {
              setRestockTargetProduct(null);
              setIsRestockModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-mint-dark hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition active:scale-95 btn-interactive"
            title="Receive a supplier delivery and increase stock of an existing product"
          >
            <PackagePlus size={15} /> Receive Stock
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-coral hover:bg-coral-hover text-white rounded-xl text-xs font-bold shadow transition active:scale-95"
            title="Create a brand new product not yet in the catalogue"
          >
            <PlusCircle size={15} /> Add New Product
          </button>
        </div>
      </div>

      {/* Restock Success Feedback Banner */}
      {restockSuccessAlert && (
        <div className="p-4 bg-mint/20 border border-mint/40 rounded-xl text-mint-dark text-xs flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{restockSuccessAlert}</span>
          </div>
          <button
            onClick={() => setRestockSuccessAlert(null)}
            className="text-mint-dark hover:underline font-bold text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-paper p-4 rounded-xl border border-cream-dark shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
          <input
            type="text"
            placeholder="Search by SKU code or product name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-cream text-ink text-xs rounded-lg border border-cream-dark focus:outline-none focus:border-coral transition"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter size={15} className="text-ink-subtle" />
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-cream text-ink text-xs rounded-lg border border-cream-dark focus:outline-none focus:border-coral"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              setSearch("");
              setSelectedCategory("all");
              setPage(1);
              fetchProducts();
            }}
            className="px-2.5 py-2 text-ink-subtle hover:text-ink text-xs rounded-lg hover:bg-cream transition"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-paper rounded-2xl border border-cream-dark shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-ink-subtle animate-pulse">Loading catalogue...</div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-coral">{error}</div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center text-ink-subtle space-y-3">
            <Boxes size={40} className="mx-auto text-mauve" />
            <p className="font-semibold text-sm text-ink">No products found in catalogue</p>
            <p className="text-xs text-ink-muted">Add your first product or import inventory CSV to start managing this workspace.</p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 bg-coral hover:bg-coral-hover text-white font-bold rounded-lg text-xs shadow-sm transition"
              >
                Add Your First Product
              </button>
              {onOpenImportCSV && (
                <button
                  onClick={onOpenImportCSV}
                  className="px-4 py-2 bg-cream hover:bg-cream-dark text-ink border border-cream-dark font-semibold rounded-lg text-xs transition"
                >
                  Import Inventory
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-cream/60 border-b border-cream-dark text-ink-muted">
                <tr>
                  <th className="py-3 px-4 font-bold">SKU Code</th>
                  <th className="py-3 px-4 font-bold">Product Name</th>
                  <th className="py-3 px-4 font-bold">Category</th>
                  <th className="py-3 px-4 font-bold">Stock Level</th>
                  <th className="py-3 px-4 font-bold">Cost / Price</th>
                  <th className="py-3 px-4 font-bold">Reorder Alert</th>
                  <th className="py-3 px-4 font-bold">Lead Time</th>
                  <th className="py-3 px-4 font-bold">Ledger Audit</th>
                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-dark/60">
                {products.map((p) => {
                  const isCritical = p.current_stock === 0;
                  const isLow = p.current_stock <= p.reorder_threshold;
                  const verified = integrityStatus[p.id];

                  return (
                    <tr key={p.id} className="hover:bg-cream/30 transition">
                      <td className="py-3 px-4 font-mono font-bold text-ink">{p.sku}</td>
                      <td className="py-3 px-4 font-semibold text-ink max-w-xs break-words min-w-[140px]">{p.name}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-mauve/20 text-mauve-dark whitespace-nowrap">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            isCritical
                              ? "bg-coral/20 text-coral"
                              : isLow
                              ? "bg-amber/20 text-amber-dark"
                              : "bg-mint/20 text-mint-dark"
                          }`}
                        >
                          {isCritical ? <XCircle size={12} /> : isLow ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                          {formatUnits(p.current_stock, 0)} units
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-ink">{formatINR(p.selling_price)}</div>
                        <div className="text-[10px] text-ink-subtle">Cost: {formatINR(p.unit_cost)}</div>
                      </td>
                      <td className="py-3 px-4 font-medium text-ink-muted">
                        ≤ {formatUnits(p.reorder_threshold, 0)} units
                      </td>
                      <td className="py-3 px-4 font-medium text-ink-muted">
                        {p.supplier_lead_time_days} days
                      </td>
                      <td className="py-3 px-4">
                        {verified ? (
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                              verified.consistent ? "text-mint-dark" : "text-coral"
                            }`}
                            title={`Ledger count: ${verified.sum}, Current recorded stock: ${p.current_stock}`}
                          >
                            <ShieldCheck size={14} /> {verified.consistent ? "Stock Verified" : "Discrepancy!"}
                          </span>
                        ) : (
                          <button
                            onClick={() => handleVerifyIntegrity(p.id)}
                            className="text-[10px] text-mauve hover:text-ink font-semibold border border-cream-dark px-2 py-0.5 rounded hover:bg-cream transition btn-interactive"
                          >
                            Verify Stock
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setRestockTargetProduct(p);
                              setIsRestockModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-mint/20 hover:bg-mint-dark text-mint-dark hover:text-white rounded text-[11px] font-bold transition flex items-center gap-1 shadow-xs btn-interactive"
                            title={`Receive Stock for ${p.name}`}
                          >
                            <PackagePlus size={12} /> Restock
                          </button>
                          <button
                            onClick={() => onOpenRecordMovement(p)}
                            className="px-2.5 py-1 bg-coral/10 hover:bg-coral text-coral hover:text-white rounded text-[11px] font-bold transition"
                            title={`Record Sales or Movements for ${p.name}`}
                          >
                            Move
                          </button>
                          <button
                            onClick={() => setEditingProduct(p)}
                            className="p-1 text-ink-subtle hover:text-ink hover:bg-cream rounded transition"
                            title="Edit Product"
                          >
                            <Edit2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pages > 1 && (
          <div className="p-3 bg-cream/40 border-t border-cream-dark flex items-center justify-between text-xs text-ink-muted">
            <span>
              Page {page} of {pages} ({total} items)
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1 rounded hover:bg-cream disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={page >= pages}
                onClick={() => setPage(page + 1)}
                className="p-1 rounded hover:bg-cream disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-aubergine-dark/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-paper w-full max-w-lg rounded-2xl border border-plum-border p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-cream-dark">
              <h2 className="text-base font-bold text-ink flex items-center gap-2">
                <PlusCircle className="text-coral" size={18} /> Create New Product
              </h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-ink-subtle hover:text-ink">
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-coral/15 border border-coral/30 rounded-lg text-coral text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateProduct} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-ink mb-1">SKU Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SKU-101"
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                    className="w-full px-3 py-2 bg-cream rounded-lg border border-cream-dark focus:outline-none focus:border-coral font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold text-ink mb-1">Category *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Electronics"
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    className="w-full px-3 py-2 bg-cream rounded-lg border border-cream-dark focus:outline-none focus:border-coral"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-ink mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ergonomic Bluetooth Mouse"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="w-full px-3 py-2 bg-cream rounded-lg border border-cream-dark focus:outline-none focus:border-coral"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-ink mb-1">Opening Stock</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newProduct.opening_stock}
                    onChange={(e) => setNewProduct({ ...newProduct, opening_stock: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-cream rounded-lg border border-cream-dark focus:outline-none focus:border-coral"
                  />
                </div>
                <div>
                  <label className="block font-bold text-ink mb-1">Unit Cost (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={newProduct.unit_cost}
                    onChange={(e) => setNewProduct({ ...newProduct, unit_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-cream rounded-lg border border-cream-dark focus:outline-none focus:border-coral"
                  />
                </div>
                <div>
                  <label className="block font-bold text-ink mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={newProduct.selling_price}
                    onChange={(e) => setNewProduct({ ...newProduct, selling_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-cream rounded-lg border border-cream-dark focus:outline-none focus:border-coral"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-ink mb-1">Reorder Threshold</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newProduct.reorder_threshold}
                    onChange={(e) => setNewProduct({ ...newProduct, reorder_threshold: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-cream rounded-lg border border-cream-dark focus:outline-none focus:border-coral"
                  />
                </div>
                <div>
                  <label className="block font-bold text-ink mb-1">Lead Time (Days)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newProduct.supplier_lead_time_days}
                    onChange={(e) => setNewProduct({ ...newProduct, supplier_lead_time_days: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-cream rounded-lg border border-cream-dark focus:outline-none focus:border-coral"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-ink mb-1">Supplier Name</label>
                <input
                  type="text"
                  placeholder="e.g. Apex Supplies Ltd"
                  value={newProduct.supplier_name}
                  onChange={(e) => setNewProduct({ ...newProduct, supplier_name: e.target.value })}
                  className="w-full px-3 py-2 bg-cream rounded-lg border border-cream-dark focus:outline-none focus:border-coral"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-cream hover:bg-cream-dark text-ink font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-coral hover:bg-coral-hover text-white font-bold rounded-lg shadow disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-aubergine-dark/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-paper w-full max-w-lg rounded-2xl border border-plum-border p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-cream-dark">
              <h2 className="text-base font-bold text-ink flex items-center gap-2">
                <Edit2 className="text-coral" size={18} /> Edit Product: {editingProduct.sku}
              </h2>
              <button onClick={() => setEditingProduct(null)} className="text-ink-subtle hover:text-ink">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-ink mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full px-3 py-2 bg-cream rounded-lg border border-cream-dark focus:outline-none focus:border-coral"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-ink mb-1">Unit Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editingProduct.unit_cost}
                    onChange={(e) => setEditingProduct({ ...editingProduct, unit_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-cream rounded-lg border border-cream-dark focus:outline-none focus:border-coral"
                  />
                </div>
                <div>
                  <label className="block font-bold text-ink mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editingProduct.selling_price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, selling_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-cream rounded-lg border border-cream-dark focus:outline-none focus:border-coral"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-ink mb-1">Reorder Threshold</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingProduct.reorder_threshold}
                    onChange={(e) => setEditingProduct({ ...editingProduct, reorder_threshold: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-cream rounded-lg border border-cream-dark focus:outline-none focus:border-coral"
                  />
                </div>
                <div>
                  <label className="block font-bold text-ink mb-1">Lead Time (Days)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editingProduct.supplier_lead_time_days}
                    onChange={(e) => setEditingProduct({ ...editingProduct, supplier_lead_time_days: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-cream rounded-lg border border-cream-dark focus:outline-none focus:border-coral"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 bg-cream hover:bg-cream-dark text-ink font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-coral hover:bg-coral-hover text-white font-bold rounded-lg shadow disabled:opacity-50"
                >
                  {submitting ? "Updating..." : "Update Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reusable Restock Modal */}
      <RestockModal
        isOpen={isRestockModalOpen}
        onClose={() => {
          setIsRestockModalOpen(false);
          setRestockTargetProduct(null);
        }}
        preselectedProduct={restockTargetProduct}
        onSuccess={(result: RestockResult) => {
          fetchProducts();
          setRestockSuccessAlert(
            `Stock received successfully: Available quantity of '${result.product_name}' updated from ${result.previous_stock} to ${result.new_stock} units.`
          );
        }}
      />
    </div>
  );
};
