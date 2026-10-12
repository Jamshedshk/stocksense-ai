import React, { useState } from "react";
import {
  Boxes,
  ArrowRight,
  ShieldCheck,
  ChevronLeft,
  Loader2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  TrendingUp,
  Package,
} from "lucide-react";
import { api, type BusinessProfile, saveSession } from "../lib/api";

interface LoginPageProps {
  onLoginSuccess: (business: BusinessProfile) => void;
  onBackToHome: () => void;
}

const TEST_ACCOUNTS = [
  { id: "freshmart", name: "FreshMart Grocery" },
  { id: "urbanthread", name: "UrbanThread Fashion" },
  { id: "technest", name: "TechNest Electronics" },
  { id: "homeease", name: "HomeEase Supplies" },
];

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onBackToHome,
}) => {
  const [identifier, setIdentifier] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeQuickLoginId, setActiveQuickLoginId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError("Please enter your email or Demo ID.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const res = await api.login(identifier.trim(), password);
      saveSession(res.access_token, res.business);
      onLoginSuccess(res.business);
    } catch (err: any) {
      setError(err.message || "Invalid email/Demo ID or password.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (businessId: string) => {
    try {
      setActiveQuickLoginId(businessId);
      setError(null);
      const res = await api.quickLogin(businessId);
      saveSession(res.access_token, res.business);
      onLoginSuccess(res.business);
    } catch (err: any) {
      setError(err.message || "Failed to sign into test account workspace.");
      setActiveQuickLoginId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F0E7] text-[#28212D] flex flex-col justify-between selection:bg-[#F26B4F] selection:text-white">
      {/* 1. Top Minimal Header */}
      <header className="p-4 sm:p-6 max-w-7xl mx-auto w-full flex items-center justify-between">
        <button
          onClick={onBackToHome}
          className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#55465E] hover:text-[#24172F] transition-colors px-3 py-1.5 rounded-lg hover:bg-white/60"
        >
          <ChevronLeft size={16} />
          <span>Back to Home</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#24172F] flex items-center justify-center text-white">
            <Boxes size={18} className="text-[#9ED8B2]" />
          </div>
          <span className="font-extrabold text-base text-[#24172F]">
            StockSense <span className="text-[#F26B4F]">AI</span>
          </span>
        </div>
      </header>

      {/* 2. Main Login Card Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 w-full my-auto py-6">
        <div className="bg-white rounded-3xl shadow-xl shadow-[#24172F]/10 border border-[#24172F]/10 overflow-hidden grid grid-cols-1 md:grid-cols-12">
          
          {/* Left Branded Visual Panel (md: 5 cols) */}
          <div className="md:col-span-5 bg-gradient-to-br from-[#24172F] via-[#33253D] to-[#24172F] text-[#F6F0E7] p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">
            {/* Ambient blur accents */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#F26B4F]/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#9ED8B2]/20 rounded-full blur-3xl pointer-events-none"></div>

            {/* Top brand icon */}
            <div className="relative z-10 space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center text-white shadow-md">
                <Boxes size={26} className="text-[#9ED8B2]" />
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-3">
                  Welcome back.
                </h2>
                <p className="text-xs sm:text-sm text-[#F6F0E7]/80 leading-relaxed">
                  Sign in to manage your inventory, track sales, and make smarter restocking decisions.
                </p>
              </div>
            </div>

            {/* Architectural Trust Indicators */}
            <div className="relative z-10 pt-8 border-t border-white/10 space-y-3">
              <div className="flex items-center gap-2.5 text-xs text-[#F6F0E7]/90 font-medium">
                <ShieldCheck size={16} className="text-[#9ED8B2] shrink-0" />
                <span>Strict Workspace Isolation</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-[#F6F0E7]/90 font-medium">
                <TrendingUp size={16} className="text-[#FF955E] shrink-0" />
                <span>Indian Rupees (₹) Ledger</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-[#F6F0E7]/90 font-medium">
                <Package size={16} className="text-[#F2C66D] shrink-0" />
                <span>Deterministic AI Advisory</span>
              </div>
            </div>
          </div>

          {/* Right Authentication Form Panel (md: 7 cols) */}
          <div className="md:col-span-7 p-8 sm:p-10 flex flex-col justify-between bg-white">
            <div>
              {/* Form Header */}
              <div className="mb-6">
                <h1 className="text-2xl font-extrabold text-[#24172F] tracking-tight">
                  Sign In
                </h1>
                <p className="text-xs sm:text-sm text-[#675670] mt-1">
                  Enter your business credentials to access your workspace.
                </p>
              </div>

              {/* Error Banner */}
              {error && (
                <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={15} className="text-red-600 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="text-red-500 hover:text-red-800 font-bold text-xs"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Authentication Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email or Demo ID Field */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4A3B53] mb-1.5">
                    Email or Demo ID
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8C7A9C]">
                      <Mail size={16} />
                    </div>
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. freshmart or name@business.in"
                      disabled={isLoading}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F6F0E7]/40 border border-[#24172F]/15 rounded-xl text-xs sm:text-sm text-[#24172F] placeholder-[#8C7A9C] focus:outline-none focus:border-[#24172F] focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4A3B53] mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8C7A9C]">
                      <Lock size={16} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      disabled={isLoading}
                      className="w-full pl-10 pr-10 py-2.5 bg-[#F6F0E7]/40 border border-[#24172F]/15 rounded-xl text-xs sm:text-sm text-[#24172F] placeholder-[#8C7A9C] focus:outline-none focus:border-[#24172F] focus:bg-white transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#8C7A9C] hover:text-[#24172F] transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Test Credentials Guidance */}
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer text-[#55465E]">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-[#24172F]/20 text-[#24172F] focus:ring-0"
                    />
                    <span>Remember me</span>
                  </label>
                  <span className="text-[11px] text-[#8C7A9C]">
                    Test password: <strong className="text-[#4A3B53]">demo123</strong>
                  </span>
                </div>

                {/* Sign In Button */}
                <button
                  type="submit"
                  disabled={isLoading || activeQuickLoginId !== null}
                  className="w-full py-3 px-4 rounded-xl bg-[#24172F] hover:bg-[#33253D] text-[#F6F0E7] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#24172F]/20 hover:shadow-xl transition-all transform active:scale-[0.98] disabled:opacity-50 mt-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight size={16} className="text-[#FF955E]" />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Secondary Section: Development/Demo Test Account Shortcuts */}
            {(import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_ACCOUNTS === "true") && (
              <div className="pt-6 mt-6 border-t border-[#24172F]/10">
                <div className="mb-3 text-center">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#675670]">
                    Development & Demo Access
                  </h3>
                </div>

                {/* Compact Account Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  {TEST_ACCOUNTS.map((acc) => {
                    const isLoggingInThis = activeQuickLoginId === acc.id;
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => handleQuickLogin(acc.id)}
                        disabled={isLoading || activeQuickLoginId !== null}
                        className="px-3 py-2 text-xs font-semibold rounded-lg border border-[#24172F]/15 bg-[#F6F0E7]/60 hover:bg-[#F6F0E7] text-[#24172F] transition-all hover:border-[#24172F]/30 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 text-center shadow-xs"
                      >
                        {isLoggingInThis ? (
                          <Loader2 size={13} className="animate-spin text-[#F26B4F] shrink-0" />
                        ) : null}
                        <span className="truncate">{acc.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* 3. Footer */}
      <footer className="p-4 sm:p-6 text-center text-xs text-[#8C7A9C]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px]">
          <span>© 2026 StockSense AI. Private Business Inventory Management.</span>
          <span className="text-[#4A3B53] font-medium">Currency: Indian Rupees (₹) • Multi-Tenant Architecture</span>
        </div>
      </footer>
    </div>
  );
};

export default LoginPage;
