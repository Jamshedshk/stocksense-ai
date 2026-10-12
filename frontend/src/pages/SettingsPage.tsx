import React from "react";
import {
  Store,
  ShieldCheck,
  FileSpreadsheet,
  LogOut,
  IndianRupee,
  Package,
} from "lucide-react";
import { type BusinessProfile } from "../lib/api";

interface SettingsPageProps {
  activeBusiness: BusinessProfile;
  onLogout: () => void;
  onOpenImportExport: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  activeBusiness,
  onLogout,
  onOpenImportExport,
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in-up">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#24172F]/10 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#24172F] tracking-tight">
            Business Settings
          </h1>
          <p className="text-sm text-[#675670] mt-1">
            Manage your business account information, store details, and inventory data exports.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition-all active:scale-95"
          >
            <LogOut size={14} />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Business Profile Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Current Business Details */}
          <div className="bg-white rounded-2xl p-6 border border-[#24172F]/10 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-[#24172F]/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#F6F0E7] flex items-center justify-center text-[#24172F]">
                  <Store size={26} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#24172F]">{activeBusiness.name}</h2>
                  <span className="text-xs text-[#7A6A88] font-medium">{activeBusiness.type}</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#9ED8B2]/20 text-emerald-800 border border-emerald-300">
                Verified Account
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-[#F6F0E7]/60 p-3.5 rounded-xl border border-[#24172F]/5 space-y-1">
                <span className="text-[#7A6A88] font-semibold">Account Identifier</span>
                <p className="font-mono font-bold text-[#24172F]">{activeBusiness.id}</p>
              </div>

              <div className="bg-[#F6F0E7]/60 p-3.5 rounded-xl border border-[#24172F]/5 space-y-1">
                <span className="text-[#7A6A88] font-semibold">Currency & Formatting</span>
                <p className="font-bold text-[#24172F] flex items-center gap-1">
                  <IndianRupee size={13} className="text-[#F26B4F]" /> Indian Rupees (₹ / INR)
                </p>
              </div>

              <div className="bg-[#F6F0E7]/60 p-3.5 rounded-xl border border-[#24172F]/5 space-y-1 sm:col-span-2">
                <span className="text-[#7A6A88] font-semibold">Product Categories</span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {activeBusiness.categories.map((c, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-white text-[#24172F] border border-[#24172F]/10 font-medium text-xs"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <p className="text-xs text-[#55465E] leading-relaxed">
                {activeBusiness.description}
              </p>
            </div>
          </div>

          {/* Card: Inventory Data & Ledgers */}
          <div className="bg-white rounded-2xl p-6 border border-[#24172F]/10 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-[#24172F] flex items-center gap-2">
              <Package size={18} className="text-[#F26B4F]" />
              <span>Inventory Data & Stock Movement Ledger</span>
            </h3>

            <p className="text-xs text-[#55465E] leading-relaxed">
              All inventory records, stock movements, and sales transactions are strictly scoped to your business account.
              Every stock movement records an auditable balance ledger entry ensuring accurate real-time inventory tracking.
            </p>

            <div className="pt-2 flex flex-wrap gap-3">
              <button
                onClick={onOpenImportExport}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#24172F] hover:bg-[#33253D] text-white font-bold text-xs shadow-md transition-all active:scale-95"
              >
                <FileSpreadsheet size={14} className="text-[#FF955E]" />
                <span>Bulk CSV Import & Catalog Tools</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Account Security & Scope */}
        <div className="space-y-6">
          {/* Card: Security & Privacy */}
          <div className="bg-white rounded-2xl p-6 border border-[#24172F]/10 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-[#24172F] flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-600" />
              <span>Account Privacy & Security</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[#24172F]/5">
                <span className="text-[#7A6A88]">Data Isolation:</span>
                <span className="font-bold text-emerald-700">Strictly Enforced</span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-[#24172F]/5">
                <span className="text-[#7A6A88]">Session Validation:</span>
                <span className="font-bold text-emerald-700">Encrypted Token</span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-[#24172F]/5">
                <span className="text-[#7A6A88]">Ledger Reconciliation:</span>
                <span className="font-bold text-[#24172F]">Continuous Double-Check</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#7A6A88]">Currency Standard:</span>
                <span className="font-bold text-[#24172F]">INR (₹)</span>
              </div>
            </div>
          </div>

          {/* Card: Sign Out */}
          <div className="bg-white rounded-2xl p-6 border border-[#24172F]/10 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-[#24172F]">Account Session</h3>
            <p className="text-xs text-[#7A6A88]">
              Sign out of your session on this device. Your inventory records remain securely saved.
            </p>

            <button
              onClick={onLogout}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-xs border border-red-200 transition-colors"
            >
              <span>Log Out of Account</span>
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
