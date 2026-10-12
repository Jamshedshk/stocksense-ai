import React, { useState, useEffect } from "react";
import {
  Boxes,
  TrendingUp,
  AlertCircle,
  PackageCheck,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  BarChart3,
  Menu,
  X,
  Home,
} from "lucide-react";

interface HomePageProps {
  onGetStarted: () => void;
  onExploreFeatures: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onGetStarted,
  onExploreFeatures,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Handle direct hash navigation on initial render
  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.replace("#", "");
      const el = document.getElementById(id);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth" });
        }, 80);
      }
    }
  }, []);

  const handleNavigateHome = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (window.location.hash) {
      window.history.pushState(null, "", window.location.pathname);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    setMobileMenuOpen(false);
  };

  const scrollToSection = (id: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      window.history.pushState(null, "", `#${id}`);
    }
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F6F0E7] text-[#28212D] flex flex-col selection:bg-[#F26B4F] selection:text-white">
      {/* 1. Marketing Navigation */}
      <header className="sticky top-0 z-40 bg-[#F6F0E7]/90 backdrop-blur-md border-b border-[#24172F]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo - Returns cleanly to Home */}
          <div
            onClick={handleNavigateHome}
            className="flex items-center gap-3 cursor-pointer select-none group"
            role="button"
            tabIndex={0}
            title="StockSense AI Home"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#24172F] to-[#33253D] flex items-center justify-center shadow-md shadow-[#24172F]/20 text-white group-hover:scale-105 transition-transform">
              <Boxes size={22} className="text-[#9ED8B2]" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-[#24172F] flex items-center gap-1.5">
                StockSense <span className="text-[#F26B4F]">AI</span>
              </span>
              <span className="text-[10px] uppercase tracking-wider block font-semibold text-[#8C7A9C]">
                Smart Inventory & Demand
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#4A3B53]">
            <button
              onClick={handleNavigateHome}
              className="text-[#24172F] font-bold hover:text-[#F26B4F] transition-colors flex items-center gap-1.5"
            >
              <Home size={15} />
              <span>Home</span>
            </button>
            <a
              href="#features"
              onClick={(e) => scrollToSection("features", e)}
              className="hover:text-[#24172F] transition-colors"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => scrollToSection("how-it-works", e)}
              className="hover:text-[#24172F] transition-colors"
            >
              How It Works
            </a>
            <a
              href="#benefits"
              onClick={(e) => scrollToSection("benefits", e)}
              className="hover:text-[#24172F] transition-colors"
            >
              Benefits
            </a>
          </nav>

          {/* Actions & Mobile Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={onGetStarted}
              className="hidden sm:inline-block text-xs sm:text-sm font-semibold text-[#33253D] hover:text-[#24172F] px-3 sm:px-4 py-2 rounded-lg transition-colors"
            >
              Log In
            </button>
            <button
              onClick={onGetStarted}
              className="flex items-center gap-2 bg-[#24172F] hover:bg-[#33253D] text-[#F6F0E7] text-xs sm:text-sm font-bold px-4 sm:px-5 py-2.5 rounded-xl shadow-lg shadow-[#24172F]/25 hover:shadow-xl hover:shadow-[#24172F]/30 transition-all transform active:scale-95"
            >
              <span>Get Started</span>
              <ArrowRight size={15} className="text-[#FF955E]" />
            </button>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[#24172F] hover:bg-[#24172F]/10 rounded-xl transition"
              aria-label="Toggle Public Menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#24172F]/10 bg-[#F6F0E7] px-4 py-4 space-y-2 animate-fade-in-up shadow-xl">
            <button
              onClick={handleNavigateHome}
              className="w-full text-left py-2.5 px-3 rounded-xl font-bold text-sm text-[#24172F] bg-white/70 flex items-center gap-2"
            >
              <Home size={16} className="text-[#F26B4F]" />
              <span>Home</span>
            </button>
            <a
              href="#features"
              onClick={(e) => scrollToSection("features", e)}
              className="block py-2.5 px-3 rounded-xl font-medium text-sm text-[#4A3B53] hover:bg-white/50"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => scrollToSection("how-it-works", e)}
              className="block py-2.5 px-3 rounded-xl font-medium text-sm text-[#4A3B53] hover:bg-white/50"
            >
              How It Works
            </a>
            <a
              href="#benefits"
              onClick={(e) => scrollToSection("benefits", e)}
              className="block py-2.5 px-3 rounded-xl font-medium text-sm text-[#4A3B53] hover:bg-white/50"
            >
              Benefits
            </a>
            <div className="pt-2 border-t border-[#24172F]/10 flex flex-col gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onGetStarted();
                }}
                className="w-full text-center py-2.5 rounded-xl font-bold text-sm text-[#24172F] bg-white border border-[#24172F]/15"
              >
                Log In
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onGetStarted();
                }}
                className="w-full text-center py-2.5 rounded-xl font-bold text-sm text-white bg-[#24172F] shadow"
              >
                Get Started
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-24 lg:pt-24 lg:pb-32">
        {/* Soft Decorative Ambient Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 pointer-events-none opacity-40">
          <div className="absolute -top-24 left-1/4 w-96 h-96 bg-[#9ED8B2]/50 rounded-full blur-3xl"></div>
          <div className="absolute top-10 right-1/4 w-96 h-96 bg-[#FF955E]/40 rounded-full blur-3xl"></div>
          <div className="absolute top-32 left-1/3 w-80 h-80 bg-[#B7A5C8]/40 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Pill Tag */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 border border-[#24172F]/10 shadow-sm text-xs font-semibold text-[#24172F]">
              <span className="w-2 h-2 rounded-full bg-[#9ED8B2] animate-pulse"></span>
              <span>Intelligent Inventory in Indian Rupees (₹)</span>
              <span className="text-[#8C7A9C]">•</span>
              <span className="text-[#F26B4F] font-bold">Multi-Workspace Architecture</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#24172F] leading-[1.15]">
              Smarter Inventory. <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-[#24172F] via-[#F26B4F] to-[#FF955E] bg-clip-text text-transparent">
                Better Business Decisions.
              </span>
            </h1>

            {/* Supporting Text */}
            <p className="text-base sm:text-lg text-[#55465E] leading-relaxed max-w-2xl mx-auto">
              Manage your products, track sales, predict demand, and discover what needs restocking —
              all from one genuine inventory management platform built for modern business owners.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
              <button
                onClick={onGetStarted}
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 bg-gradient-to-r from-[#24172F] to-[#33253D] hover:from-[#33253D] hover:to-[#24172F] text-white font-bold text-sm sm:text-base px-8 py-3.5 rounded-xl shadow-xl shadow-[#24172F]/30 hover:shadow-2xl transition-all transform active:scale-95"
              >
                <span>Get Started with StockSense AI</span>
                <ArrowRight size={18} className="text-[#FF955E]" />
              </button>
              <button
                onClick={onExploreFeatures}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/80 hover:bg-white text-[#24172F] border border-[#24172F]/15 font-semibold text-sm sm:text-base px-7 py-3.5 rounded-xl shadow-sm hover:shadow transition-all"
              >
                <span>Explore Features</span>
              </button>
            </div>

            {/* Subtext info */}
            <p className="text-xs text-[#8C7A9C] font-medium pt-1">
              Deterministic Ledger Tracking • Indian Rupees (₹) Native • Instant Workspace Access
            </p>
          </div>

          {/* Architectural Pillars (Clean value highlights replacing the fake preview) */}
          <div className="mt-16 max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white/85 backdrop-blur-sm p-6 rounded-2xl border border-[#24172F]/10 shadow-sm text-left space-y-2.5 hover:shadow-md transition">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <ShieldCheck size={20} />
              </div>
              <h3 className="font-extrabold text-sm text-[#24172F]">Strict Workspace Isolation</h3>
              <p className="text-xs text-[#675670] leading-relaxed">
                Every business workspace is securely isolated at the server and database layer with independent ledgers.
              </p>
            </div>
            <div className="bg-white/85 backdrop-blur-sm p-6 rounded-2xl border border-[#24172F]/10 shadow-sm text-left space-y-2.5 hover:shadow-md transition">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#F26B4F] flex items-center justify-center font-bold">
                <TrendingUp size={20} />
              </div>
              <h3 className="font-extrabold text-sm text-[#24172F]">Real-Time Stock Ledger</h3>
              <p className="text-xs text-[#675670] leading-relaxed">
                Recorded sales, stock receipts, and adjustments immediately update persisted inventory without fake delays.
              </p>
            </div>
            <div className="bg-white/85 backdrop-blur-sm p-6 rounded-2xl border border-[#24172F]/10 shadow-sm text-left space-y-2.5 hover:shadow-md transition">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                <Boxes size={20} />
              </div>
              <h3 className="font-extrabold text-sm text-[#24172F]">Deterministic AI Advisory</h3>
              <p className="text-xs text-[#675670] leading-relaxed">
                Reorder recommendations and demand forecasts computed directly from actual sales history and lead times.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Features Section */}
      <section id="features" className="py-20 bg-white border-y border-[#24172F]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#F26B4F]">Everything You Need</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#24172F]">
              Designed for Everyday Business Owners
            </h2>
            <p className="text-sm sm:text-base text-[#675670]">
              No confusing data science jargon. Just the practical tools you need to avoid running out of stock and keep your customers happy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-[#F6F0E7]/50 border border-[#24172F]/10 hover:border-[#F26B4F]/40 transition-all hover:shadow-lg group">
              <div className="w-12 h-12 rounded-xl bg-[#24172F] flex items-center justify-center text-white mb-5 group-hover:scale-105 transition-transform">
                <Boxes size={24} className="text-[#9ED8B2]" />
              </div>
              <h3 className="text-lg font-bold text-[#24172F] mb-2">Simple Inventory Management</h3>
              <p className="text-sm text-[#55465E] leading-relaxed">
                Add and manage your catalog with sensible categories, SKUs, purchase costs, and selling prices in Indian Rupees (₹).
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-[#F6F0E7]/50 border border-[#24172F]/10 hover:border-[#F26B4F]/40 transition-all hover:shadow-lg group">
              <div className="w-12 h-12 rounded-xl bg-[#24172F] flex items-center justify-center text-white mb-5 group-hover:scale-105 transition-transform">
                <TrendingUp size={24} className="text-[#FF955E]" />
              </div>
              <h3 className="text-lg font-bold text-[#24172F] mb-2">Quick Sales & Stock Tracking</h3>
              <p className="text-sm text-[#55465E] leading-relaxed">
                Record daily sales in seconds. Stock levels deduct atomically, keeping your inventory numbers accurate and up-to-date.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-[#F6F0E7]/50 border border-[#24172F]/10 hover:border-[#F26B4F]/40 transition-all hover:shadow-lg group">
              <div className="w-12 h-12 rounded-xl bg-[#24172F] flex items-center justify-center text-white mb-5 group-hover:scale-105 transition-transform">
                <BarChart3 size={24} className="text-[#F2C66D]" />
              </div>
              <h3 className="text-lg font-bold text-[#24172F] mb-2">Demand Forecasting</h3>
              <p className="text-sm text-[#55465E] leading-relaxed">
                Predict upcoming 7 to 30-day demand from your recorded transactions to plan your purchase orders without guesswork.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl bg-[#F6F0E7]/50 border border-[#24172F]/10 hover:border-[#F26B4F]/40 transition-all hover:shadow-lg group">
              <div className="w-12 h-12 rounded-xl bg-[#24172F] flex items-center justify-center text-white mb-5 group-hover:scale-105 transition-transform">
                <AlertCircle size={24} className="text-[#F26B4F]" />
              </div>
              <h3 className="text-lg font-bold text-[#24172F] mb-2">Low-Stock Alerts</h3>
              <p className="text-sm text-[#55465E] leading-relaxed">
                Never lose a sale due to an empty shelf. Immediate visual highlights tell you exactly which products are dipping below safe limits.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-2xl bg-[#F6F0E7]/50 border border-[#24172F]/10 hover:border-[#F26B4F]/40 transition-all hover:shadow-lg group">
              <div className="w-12 h-12 rounded-xl bg-[#24172F] flex items-center justify-center text-white mb-5 group-hover:scale-105 transition-transform">
                <PackageCheck size={24} className="text-[#9ED8B2]" />
              </div>
              <h3 className="text-lg font-bold text-[#24172F] mb-2">Smart Reorder Recommendations</h3>
              <p className="text-sm text-[#55465E] leading-relaxed">
                Get a prioritized restocking list with suggested quantities, supplier lead times, and plain-English reasons for every recommendation.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-2xl bg-[#F6F0E7]/50 border border-[#24172F]/10 hover:border-[#F26B4F]/40 transition-all hover:shadow-lg group">
              <div className="w-12 h-12 rounded-xl bg-[#24172F] flex items-center justify-center text-white mb-5 group-hover:scale-105 transition-transform">
                <FileSpreadsheet size={24} className="text-[#B7A5C8]" />
              </div>
              <h3 className="text-lg font-bold text-[#24172F] mb-2">Business Reports & CSV Export</h3>
              <p className="text-sm text-[#55465E] leading-relaxed">
                Download your product catalogs, stock ledgers, and reorder sheets anytime. Easy CSV import allows quick bulk additions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. How It Works Section */}
      <section id="how-it-works" className="py-20 bg-[#F6F0E7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#F26B4F]">Simple Workflow</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#24172F]">
              Up and Running in 3 Easy Steps
            </h2>
            <p className="text-sm sm:text-base text-[#675670]">
              Managing your shop's stock does not have to be a full-time headache.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="bg-white p-8 rounded-2xl border border-[#24172F]/10 shadow-sm relative space-y-4">
              <div className="w-10 h-10 rounded-full bg-[#24172F] text-white flex items-center justify-center font-bold text-lg">
                1
              </div>
              <h3 className="text-xl font-bold text-[#24172F]">Add Products or Import</h3>
              <p className="text-sm text-[#55465E] leading-relaxed">
                Enter your items through the intuitive product form or upload an existing CSV spreadsheet with your initial quantities and ₹ prices.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white p-8 rounded-2xl border border-[#24172F]/10 shadow-sm relative space-y-4">
              <div className="w-10 h-10 rounded-full bg-[#F26B4F] text-white flex items-center justify-center font-bold text-lg">
                2
              </div>
              <h3 className="text-xl font-bold text-[#24172F]">Record Sales & Restocks</h3>
              <p className="text-sm text-[#55465E] leading-relaxed">
                Log daily customer purchases and incoming supplier deliveries. Stock counts and cash valuation update immediately on the dashboard.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white p-8 rounded-2xl border border-[#24172F]/10 shadow-sm relative space-y-4">
              <div className="w-10 h-10 rounded-full bg-[#9ED8B2] text-[#24172F] flex items-center justify-center font-bold text-lg">
                3
              </div>
              <h3 className="text-xl font-bold text-[#24172F]">Get Actionable Restock Advice</h3>
              <p className="text-sm text-[#55465E] leading-relaxed">
                Check your Smart Restocking tab to see which products need ordering before they run dry, complete with suggested quantities.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Benefits for Small Businesses */}
      <section id="benefits" className="py-20 bg-white border-y border-[#24172F]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <span className="text-xs font-bold uppercase tracking-wider text-[#F26B4F]">Business Value</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#24172F] leading-tight">
                Built to Save Hours of Manual Count Checks Every Week
              </h2>
              <p className="text-sm sm:text-base text-[#55465E] leading-relaxed">
                Running a retail store or boutique requires staying on top of hundreds of moving items. StockSense AI helps store managers make informed inventory decisions without over-committing working capital.
              </p>

              <div className="space-y-3.5 pt-2">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-[#24172F]">Prevent Stockouts During Peak Hours</h4>
                    <p className="text-xs text-[#675670]">Catch fast-moving items before shelves run empty on busy weekends.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-[#24172F]">Avoid Tying Up Cash in Dead Stock</h4>
                    <p className="text-xs text-[#675670]">Identify sluggish items so you don't over-order products that take months to sell.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-[#24172F]">Transparent & Traceable Ledger</h4>
                    <p className="text-xs text-[#675670]">Every single sale, receipt, damage, and return is permanently recorded for audits.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Side Card Highlight */}
            <div className="bg-gradient-to-br from-[#24172F] to-[#33253D] p-8 rounded-3xl text-white shadow-xl space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white/10 text-[#9ED8B2]">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Honest, Data-Driven Models</h3>
                  <span className="text-xs text-[#B7A5C8]">Verified Small-Business Integrity</span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-[#F6F0E7]/80 leading-relaxed">
                Unlike tools that fabricate random predictions, StockSense AI relies strictly on your recorded sales history. When historical sales data is limited, the platform honestly flags an insufficient-data state instead of guessing.
              </p>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-xs space-y-2 text-[#F6F0E7]/90">
                <div className="flex justify-between">
                  <span className="text-[#B7A5C8]">Currency Support:</span>
                  <span className="font-semibold text-white">Indian Rupees (₹ / INR)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#B7A5C8]">Persistence:</span>
                  <span className="font-semibold text-white">SQLite + SQLAlchemy Database</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#B7A5C8]">Multi-Tenant Isolation:</span>
                  <span className="font-semibold text-white">Enforced Per Business Workspace</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Final Call to Action */}
      <section className="py-20 bg-gradient-to-br from-[#24172F] via-[#33253D] to-[#24172F] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to Take Control of Your Inventory?
          </h2>
          <p className="text-base text-[#F6F0E7]/80 max-w-xl mx-auto">
            Sign in to StockSense AI now to start managing your stock, sales, and replenishment in Indian Rupees.
          </p>
          <div className="pt-2">
            <button
              onClick={onGetStarted}
              className="inline-flex items-center gap-2 bg-[#F26B4F] hover:bg-[#d95338] text-white font-bold text-base px-8 py-3.5 rounded-xl shadow-xl hover:shadow-2xl transition-all transform active:scale-95"
            >
              <span>Sign In to StockSense AI</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* 8. Polished Footer */}
      <footer className="border-t border-[#24172F]/10 bg-[#F6F0E7] py-10 text-xs text-[#7A6A88]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#24172F]">StockSense AI</span>
            <span>—</span>
            <span>Intelligent Inventory Management & Demand Forecasting</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Multi-Tenant Architecture</span>
            <span>•</span>
            <span>Currency: ₹ (INR)</span>
            <span>•</span>
            <span className="text-[#F26B4F] font-semibold">FastAPI + React</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
