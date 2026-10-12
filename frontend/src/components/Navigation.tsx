import React, { useState } from "react";
import {
  LayoutDashboard,
  Boxes,
  ArrowLeftRight,
  ShoppingCart,
  FileBarChart,
  BrainCircuit,
  TrendingUp,
  Menu,
  X,
  Store,
  LogOut,
  Settings,
} from "lucide-react";
import { type BusinessProfile } from "../lib/api";

interface NavProps {
  activeBusiness: BusinessProfile;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

export const Navigation: React.FC<NavProps> = ({
  activeBusiness,
  activeTab,
  setActiveTab,
  onLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Exactly 7 primary business navigation items
  const primaryTabs = [
    { id: "dashboard", label: "Overview", icon: LayoutDashboard },
    { id: "inventory", label: "Products", icon: Boxes },
    { id: "movements", label: "Sales & Stock", icon: ArrowLeftRight },
    { id: "forecast", label: "Expected Sales", icon: TrendingUp },
    { id: "insights", label: "Product Insights", icon: BrainCircuit },
    { id: "reorder", label: "What to Restock First", icon: ShoppingCart },
    { id: "reports", label: "Reports", icon: FileBarChart },
  ];

  const getAccentColor = (id: string) => {
    switch (id) {
      case "freshmart":
        return "text-[#9ED8B2]";
      case "urbanthread":
        return "text-[#FF955E]";
      case "technest":
        return "text-[#F2C66D]";
      case "homeease":
      default:
        return "text-[#B7A5C8]";
    }
  };

  return (
    <>
      {/* Sticky Header: Contains Brand, Store Details, Settings, Log Out, and Primary Business Tabs */}
      <header className="sticky top-0 z-40 bg-[#24172F] text-[#F6F0E7] border-b border-[#33253D] shadow-md">
        {/* Top Navbar Row */}
        <div className="px-4 lg:px-8 py-3 border-b border-[#33253D]/60">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            {/* Left Brand & Business Profile */}
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-1.5 text-[#F6F0E7] hover:bg-[#33253D] rounded-lg transition-colors"
                aria-label="Toggle Navigation Menu"
              >
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>

              {/* Brand Logo */}
              <div
                className="flex items-center gap-2.5 cursor-pointer"
                onClick={() => setActiveTab("dashboard")}
                title="StockSense AI Home"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F26B4F] to-[#FF955E] flex items-center justify-center text-[#24172F] font-black shadow-sm">
                  <Boxes size={20} className="text-white" />
                </div>
                <div className="hidden sm:block">
                  <span className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
                    StockSense <span className="text-[#F26B4F]">AI</span>
                  </span>
                  <p className="text-[10px] text-[#B7A5C8]">Intelligent Inventory Management</p>
                </div>
              </div>

              {/* Vertical Divider */}
              <div className="h-7 w-px bg-white/10 hidden md:block"></div>

              {/* Current Business Info */}
              <div className="flex items-center gap-2">
                <div className="bg-[#33253D] border border-white/10 px-3 py-1.5 rounded-xl flex items-center gap-2.5 shadow-inner">
                  <Store size={16} className={getAccentColor(activeBusiness.id)} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs sm:text-sm text-white tracking-tight">
                        {activeBusiness.name}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#B7A5C8] hidden sm:block">
                      {activeBusiness.type} • Currency: ₹ (INR)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Controls: Business Settings & Log Out */}
            <div className="flex items-center gap-2 sm:gap-3 text-xs">
              {/* Business Settings */}
              <button
                onClick={() => setActiveTab("settings")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition border btn-interactive ${
                  activeTab === "settings"
                    ? "bg-[#F26B4F] text-white border-[#F26B4F] shadow-sm"
                    : "bg-[#33253D] hover:bg-[#433250] text-[#F6F0E7] border-white/10"
                }`}
                title="Manage business profile, account details and exports"
              >
                <Settings size={14} className={activeTab === "settings" ? "text-white" : "text-[#B7A5C8]"} />
                <span className="hidden sm:inline">Business Settings</span>
                <span className="sm:hidden">Settings</span>
              </button>

              {/* Log Out Button */}
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[#B7A5C8] hover:text-[#F26B4F] hover:bg-[#33253D] text-xs font-semibold transition btn-interactive"
                title="Log out of business account"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Log Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Navigation Tabs: Primary 7 Business Tabs */}
        <div className="hidden lg:block">
          <div className="max-w-7xl mx-auto px-4 lg:px-8">
            <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none">
              {primaryTabs.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap transition-all border-b-2 btn-interactive ${
                      isActive
                        ? "border-[#F26B4F] text-[#F26B4F] bg-[#33253D]/60 font-bold"
                        : "border-transparent text-[#B7A5C8] hover:text-white hover:bg-[#33253D]/30"
                    }`}
                  >
                    <Icon size={15} className={isActive ? "text-[#F26B4F]" : "text-[#B7A5C8]"} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-[#24172F]/95 backdrop-blur-md flex flex-col p-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-[#33253D]">
            <div className="flex items-center gap-2">
              <Store size={18} className={getAccentColor(activeBusiness.id)} />
              <span className="font-extrabold text-white text-base">{activeBusiness.name}</span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 text-[#F6F0E7] hover:bg-[#33253D] rounded-lg"
              aria-label="Close Navigation Menu"
            >
              <X size={22} />
            </button>
          </div>

          <div className="overflow-y-auto mt-4 space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#8C7A9C] tracking-wider px-3">
                Navigation
              </span>
              {primaryTabs.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                      isActive
                        ? "bg-[#F26B4F] text-white font-semibold shadow-md"
                        : "text-[#F6F0E7]/80 hover:bg-[#33253D] hover:text-white"
                    }`}
                  >
                    <Icon size={18} className={isActive ? "text-white" : "text-[#B7A5C8]"} />
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="pt-4 border-t border-[#33253D] flex flex-col gap-2">
              <button
                onClick={() => {
                  setActiveTab("settings");
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                  activeTab === "settings"
                    ? "bg-[#F26B4F] text-white font-semibold"
                    : "bg-[#33253D] text-white"
                }`}
              >
                <Settings size={18} />
                <span>Business Settings</span>
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-transparent text-[#F26B4F] text-sm font-bold border border-[#F26B4F]/30 hover:bg-[#F26B4F]/10 transition-colors"
              >
                <LogOut size={16} />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navigation;
