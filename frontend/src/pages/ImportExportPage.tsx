import React, { useState } from "react";
import {
  FileSpreadsheet,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle2,
  FileDown,
  ArrowRight,
} from "lucide-react";
import { api } from "../lib/api";
import { formatINR, formatUnits, formatDateTime } from "../lib/formatters";

interface Props {
  onDataChanged: () => void;
}

export const ImportExportPage: React.FC<Props> = ({ onDataChanged }) => {
  const [activeSubTab, setActiveSubTab] = useState<"products" | "sales">("products");

  // Products CSV state
  const [prodFile, setProdFile] = useState<File | null>(null);
  const [prodPreview, setProdPreview] = useState<any | null>(null);
  const [prodLoading, setProdLoading] = useState(false);
  const [prodMessage, setProdMessage] = useState<string | null>(null);
  const [prodError, setProdError] = useState<string | null>(null);

  // Sales CSV state
  const [salesFile, setSalesFile] = useState<File | null>(null);
  const [salesPreview, setSalesPreview] = useState<any | null>(null);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesMessage, setSalesMessage] = useState<string | null>(null);
  const [salesError, setSalesError] = useState<string | null>(null);

  // Handle Products Preview
  const handleProdPreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodFile) return;
    setProdLoading(true);
    setProdError(null);
    setProdMessage(null);
    try {
      const res = await api.previewProductsCSV(prodFile);
      setProdPreview(res);
    } catch (err: any) {
      setProdError(err.message || "Failed to preview CSV");
    } finally {
      setProdLoading(false);
    }
  };

  // Handle Products Commit
  const handleProdCommit = async () => {
    if (!prodFile) return;
    setProdLoading(true);
    setProdError(null);
    try {
      const res = await api.commitProductsCSV(prodFile);
      setProdMessage(`Successfully committed batch #${res.batch_id}: ${res.rows_imported} products imported.`);
      setProdPreview(null);
      setProdFile(null);
      onDataChanged();
    } catch (err: any) {
      setProdError(err.message || "Failed to commit CSV");
    } finally {
      setProdLoading(false);
    }
  };

  // Handle Sales Preview
  const handleSalesPreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salesFile) return;
    setSalesLoading(true);
    setSalesError(null);
    setSalesMessage(null);
    try {
      const res = await api.previewSalesCSV(salesFile);
      setSalesPreview(res);
    } catch (err: any) {
      setSalesError(err.message || "Failed to preview sales CSV");
    } finally {
      setSalesLoading(false);
    }
  };

  // Handle Sales Commit
  const handleSalesCommit = async () => {
    if (!salesFile) return;
    setSalesLoading(true);
    setSalesError(null);
    try {
      const res = await api.commitSalesCSV(salesFile);
      setSalesMessage(`Successfully committed batch #${res.batch_id}: ${res.rows_imported} transactions recorded.`);
      setSalesPreview(null);
      setSalesFile(null);
      onDataChanged();
    } catch (err: any) {
      setSalesError(err.message || "Failed to commit sales CSV");
    } finally {
      setSalesLoading(false);
    }
  };

  const handleDownloadTemplate = (type: "products" | "sales") => {
    const csvContent =
      type === "products"
        ? "sku,name,category,opening_stock,unit_cost,selling_price,reorder_threshold,supplier_lead_time_days,supplier_name,supplier_contact\nSKU-1001,Premium Keyboard,Electronics,25,35.00,59.99,8,5,LogiTech,orders@logitech.example.com\n"
        : "transaction_id,occurred_at,sku,quantity,unit_price,transaction_type\nTX-5001,2026-09-01T10:15:00,SKU-1001,2,59.99,SALE\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `stocksense_${type}_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-ink tracking-tight flex items-center gap-2">
          <FileSpreadsheet className="text-coral" size={26} /> CSV Import, Export & Data Operations
        </h1>
        <p className="text-xs text-ink-muted mt-0.5">
          Bulk catalogue import, historical sales series ingestion with duplicate batch hashing, and automated report downloads.
        </p>
      </div>

      {/* Export Reports Strip */}
      <div className="bg-paper rounded-2xl border border-cream-dark p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-cream-dark">
          <div>
            <h2 className="text-sm font-bold text-ink">CSV Reports Export</h2>
            <p className="text-xs text-ink-muted">Download live operational records matching active database state</p>
          </div>
          <Download size={16} className="text-coral" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <a
            href={api.getReportUrl("inventory")}
            download
            className="p-3.5 rounded-xl border border-cream-dark hover:border-coral bg-cream/30 hover:bg-cream transition flex items-center justify-between text-xs font-semibold text-ink group"
          >
            <span>Inventory Report CSV</span>
            <FileDown size={16} className="text-mauve group-hover:text-coral transition" />
          </a>

          <a
            href={api.getReportUrl("movements")}
            download
            className="p-3.5 rounded-xl border border-cream-dark hover:border-coral bg-cream/30 hover:bg-cream transition flex items-center justify-between text-xs font-semibold text-ink group"
          >
            <span>Movements Ledger CSV</span>
            <FileDown size={16} className="text-mauve group-hover:text-coral transition" />
          </a>

          <a
            href={api.getReportUrl("reorder")}
            download
            className="p-3.5 rounded-xl border border-cream-dark hover:border-coral bg-cream/30 hover:bg-cream transition flex items-center justify-between text-xs font-semibold text-ink group"
          >
            <span>Reorder Advice CSV</span>
            <FileDown size={16} className="text-mauve group-hover:text-coral transition" />
          </a>

          <a
            href={api.getReportUrl("forecast")}
            download
            className="p-3.5 rounded-xl border border-cream-dark hover:border-coral bg-cream/30 hover:bg-cream transition flex items-center justify-between text-xs font-semibold text-ink group"
          >
            <span>Forecast Runs CSV</span>
            <FileDown size={16} className="text-mauve group-hover:text-coral transition" />
          </a>
        </div>
      </div>

      {/* Import Tabs */}
      <div className="bg-paper rounded-2xl border border-cream-dark shadow-sm overflow-hidden">
        <div className="flex border-b border-cream-dark bg-cream/30 text-xs font-bold">
          <button
            onClick={() => setActiveSubTab("products")}
            className={`flex-1 py-3.5 text-center transition border-b-2 ${
              activeSubTab === "products"
                ? "border-coral text-coral bg-paper font-black"
                : "border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            1. Product Catalogue CSV Import
          </button>
          <button
            onClick={() => setActiveSubTab("sales")}
            className={`flex-1 py-3.5 text-center transition border-b-2 ${
              activeSubTab === "sales"
                ? "border-coral text-coral bg-paper font-black"
                : "border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            2. Historical Sales Transactions CSV Import
          </button>
        </div>

        <div className="p-6 space-y-6">
          {activeSubTab === "products" ? (
            /* Product Catalogue Import View */
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-cream border border-cream-dark">
                <div>
                  <h3 className="text-xs font-bold text-ink">Catalogue CSV Format & Requirements</h3>
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    Required headers: <code className="font-mono bg-paper px-1 py-0.5 rounded text-coral">sku, name, category, opening_stock, unit_cost, selling_price, reorder_threshold, supplier_lead_time_days</code>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownloadTemplate("products")}
                  className="px-3 py-1.5 bg-paper hover:bg-cream-dark text-ink font-bold text-xs rounded-lg border border-cream-dark flex items-center gap-1.5 shadow-sm"
                >
                  <Download size={13} /> Download Template
                </button>
              </div>

              {prodError && (
                <div className="p-3 bg-coral/15 border border-coral/30 rounded-xl text-coral text-xs flex items-center gap-2">
                  <AlertTriangle size={15} />
                  <span>{prodError}</span>
                </div>
              )}

              {prodMessage && (
                <div className="p-3 bg-mint/20 border border-mint/40 rounded-xl text-mint-dark text-xs flex items-center gap-2">
                  <CheckCircle2 size={15} />
                  <span>{prodMessage}</span>
                </div>
              )}

              {/* Upload Input */}
              <form onSubmit={handleProdPreview} className="space-y-4">
                <div className="border-2 border-dashed border-cream-dark rounded-2xl p-6 text-center hover:border-coral transition bg-cream/20">
                  <Upload size={32} className="mx-auto text-mauve mb-2" />
                  <p className="text-xs font-bold text-ink">Select Product Catalogue CSV File</p>
                  <p className="text-[11px] text-ink-subtle mt-0.5">Validates uniqueness, positive costs, and row integrity</p>
                  <input
                    type="file"
                    accept=".csv"
                    required
                    onChange={(e) => setProdFile(e.target.files?.[0] || null)}
                    className="mt-3 text-xs text-ink file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-coral file:text-white hover:file:bg-coral-hover cursor-pointer"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="submit"
                    disabled={!prodFile || prodLoading}
                    className="px-5 py-2.5 bg-plum hover:bg-plum-light text-cream rounded-xl text-xs font-bold border border-plum-border shadow transition disabled:opacity-40"
                  >
                    {prodLoading ? "Validating..." : "Preview & Validate CSV"}
                  </button>
                </div>
              </form>

              {/* Preview Table */}
              {prodPreview && (
                <div className="space-y-4 pt-4 border-t border-cream-dark">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-ink">
                        Validation Preview: {prodPreview.filename}
                      </h4>
                      <p className="text-[11px] text-ink-muted">
                        Total {prodPreview.total_rows} rows • {prodPreview.valid_rows} valid •{" "}
                        {prodPreview.invalid_rows} errors
                      </p>
                    </div>

                    <button
                      onClick={handleProdCommit}
                      disabled={!prodPreview.is_valid_for_commit || prodLoading}
                      className="px-5 py-2 bg-coral hover:bg-coral-hover text-white rounded-xl text-xs font-bold shadow transition disabled:opacity-40 flex items-center gap-1.5"
                    >
                      Commit Validated Catalogue <ArrowRight size={14} />
                    </button>
                  </div>

                  {prodPreview.errors.length > 0 && (
                    <div className="p-3 bg-coral/10 border border-coral/30 rounded-xl space-y-1">
                      <div className="font-bold text-coral text-xs flex items-center gap-1">
                        <AlertTriangle size={13} /> Row-Level Validation Errors:
                      </div>
                      <ul className="text-[11px] text-coral list-disc list-inside space-y-0.5 max-h-32 overflow-y-auto">
                        {prodPreview.errors.map((err: any, idx: number) => (
                          <li key={idx}>
                            Row {err.row_number}: {err.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="overflow-x-auto border border-cream-dark rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-cream/60 border-b border-cream-dark text-ink-muted">
                        <tr>
                          <th className="py-2.5 px-3">Row</th>
                          <th className="py-2.5 px-3">SKU</th>
                          <th className="py-2.5 px-3">Name</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3">Opening Stock</th>
                          <th className="py-2.5 px-3">Cost</th>
                          <th className="py-2.5 px-3">Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-cream-dark">
                        {prodPreview.preview_data.map((row: any) => (
                          <tr key={row.row_number}>
                            <td className="py-2 px-3 font-mono">{row.row_number}</td>
                            <td className="py-2 px-3 font-mono font-bold">{row.sku}</td>
                            <td className="py-2 px-3">{row.name}</td>
                            <td className="py-2 px-3">{row.category}</td>
                            <td className="py-2 px-3">{formatUnits(row.opening_stock, 0)}</td>
                            <td className="py-2 px-3">{formatINR(row.unit_cost)}</td>
                            <td className="py-2 px-3">{formatINR(row.selling_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Historical Sales Import View */
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-cream border border-cream-dark">
                <div>
                  <h3 className="text-xs font-bold text-ink">Sales CSV Format & Requirements</h3>
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    Required headers: <code className="font-mono bg-paper px-1 py-0.5 rounded text-coral">transaction_id, occurred_at, sku, quantity, unit_price, transaction_type</code>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownloadTemplate("sales")}
                  className="px-3 py-1.5 bg-paper hover:bg-cream-dark text-ink font-bold text-xs rounded-lg border border-cream-dark flex items-center gap-1.5 shadow-sm"
                >
                  <Download size={13} /> Download Template
                </button>
              </div>

              {salesError && (
                <div className="p-3 bg-coral/15 border border-coral/30 rounded-xl text-coral text-xs flex items-center gap-2">
                  <AlertTriangle size={15} />
                  <span>{salesError}</span>
                </div>
              )}

              {salesMessage && (
                <div className="p-3 bg-mint/20 border border-mint/40 rounded-xl text-mint-dark text-xs flex items-center gap-2">
                  <CheckCircle2 size={15} />
                  <span>{salesMessage}</span>
                </div>
              )}

              {/* Upload Input */}
              <form onSubmit={handleSalesPreview} className="space-y-4">
                <div className="border-2 border-dashed border-cream-dark rounded-2xl p-6 text-center hover:border-coral transition bg-cream/20">
                  <Upload size={32} className="mx-auto text-mauve mb-2" />
                  <p className="text-xs font-bold text-ink">Select Historical Sales CSV File</p>
                  <p className="text-[11px] text-ink-subtle mt-0.5">
                    Verifies date parsing, positive quantities, SKU presence in catalogue, and batch hash deduplication
                  </p>
                  <input
                    type="file"
                    accept=".csv"
                    required
                    onChange={(e) => setSalesFile(e.target.files?.[0] || null)}
                    className="mt-3 text-xs text-ink file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-coral file:text-white hover:file:bg-coral-hover cursor-pointer"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="submit"
                    disabled={!salesFile || salesLoading}
                    className="px-5 py-2.5 bg-plum hover:bg-plum-light text-cream rounded-xl text-xs font-bold border border-plum-border shadow transition disabled:opacity-40"
                  >
                    {salesLoading ? "Validating..." : "Preview & Validate Sales CSV"}
                  </button>
                </div>
              </form>

              {/* Sales Preview Table */}
              {salesPreview && (
                <div className="space-y-4 pt-4 border-t border-cream-dark">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-ink">
                        Validation Preview: {salesPreview.filename}
                      </h4>
                      <p className="text-[11px] text-ink-muted">
                        Total {salesPreview.total_rows} rows • {salesPreview.valid_rows} valid •{" "}
                        {salesPreview.invalid_rows} errors
                      </p>
                    </div>

                    <button
                      onClick={handleSalesCommit}
                      disabled={!salesPreview.is_valid_for_commit || salesLoading}
                      className="px-5 py-2 bg-coral hover:bg-coral-hover text-white rounded-xl text-xs font-bold shadow transition disabled:opacity-40 flex items-center gap-1.5"
                    >
                      Commit Historical Transactions <ArrowRight size={14} />
                    </button>
                  </div>

                  {salesPreview.errors.length > 0 && (
                    <div className="p-3 bg-coral/10 border border-coral/30 rounded-xl space-y-1">
                      <div className="font-bold text-coral text-xs flex items-center gap-1">
                        <AlertTriangle size={13} /> Row-Level Validation Errors:
                      </div>
                      <ul className="text-[11px] text-coral list-disc list-inside space-y-0.5 max-h-32 overflow-y-auto">
                        {salesPreview.errors.map((err: any, idx: number) => (
                          <li key={idx}>
                            Row {err.row_number}: {err.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="overflow-x-auto border border-cream-dark rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-cream/60 border-b border-cream-dark text-ink-muted">
                        <tr>
                          <th className="py-2.5 px-3">Row</th>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">SKU</th>
                          <th className="py-2.5 px-3">Qty</th>
                          <th className="py-2.5 px-3">Type</th>
                          <th className="py-2.5 px-3">Tx ID</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-cream-dark">
                        {salesPreview.preview_data.map((row: any) => (
                          <tr key={row.row_number}>
                            <td className="py-2 px-3 font-mono">{row.row_number}</td>
                            <td className="py-2 px-3 whitespace-nowrap">{formatDateTime(row.occurred_at)}</td>
                            <td className="py-2 px-3 font-mono font-bold">{row.sku}</td>
                            <td className="py-2 px-3 font-bold">{formatUnits(row.quantity, 0)}</td>
                            <td className="py-2 px-3 font-semibold">{row.transaction_type}</td>
                            <td className="py-2 px-3 font-mono text-[10px] text-ink-subtle">{row.transaction_id}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
