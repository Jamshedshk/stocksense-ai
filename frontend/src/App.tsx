import { useState, useEffect } from "react";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { Navigation } from "./components/Navigation";
import { DashboardPage } from "./pages/DashboardPage";
import { InventoryPage } from "./pages/InventoryPage";
import { MovementsPage } from "./pages/MovementsPage";
import { ImportExportPage } from "./pages/ImportExportPage";
import { ForecastPage } from "./pages/ForecastPage";
import { ReorderPage } from "./pages/ReorderPage";
import { InsightsPage } from "./pages/InsightsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";
import {
  type Product,
  type BusinessProfile,
  getActiveBusiness,
  clearSession,
} from "./lib/api";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";
import { BrandedLoader } from "./components/BrandedLoader";

export function App() {
  // Session verification on initial load
  const [isVerifyingSession, setIsVerifyingSession] = useState<boolean>(true);

  // 3-Stage User Journey: "home" -> "login" -> "dashboard"
  const [currentView, setCurrentView] = useState<"home" | "login" | "dashboard">("home");
  const [activeBusiness, setActiveBusiness] = useState<BusinessProfile | null>(null);

  // Business Dashboard internal tab
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState<boolean>(false);
  const [selectedProductForMovement, setSelectedProductForMovement] = useState<Product | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Check persisted session on mount
  useEffect(() => {
    const saved = getActiveBusiness();
    if (saved) {
      setActiveBusiness(saved);
      setCurrentView("dashboard");
    } else {
      setCurrentView("home");
    }

    // Release loading screen after session verification
    setIsVerifyingSession(false);

    const handleExpired = () => {
      clearSession();
      setActiveBusiness(null);
      setCurrentView("login");
      showToast("error", "Your session has expired. Please sign in again.");
    };
    window.addEventListener("stocksense-session-expired", handleExpired);
    return () => window.removeEventListener("stocksense-session-expired", handleExpired);
  }, []);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Toast Component
  const toastElement = toast && (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-xs font-semibold ${
          toast.type === "success"
            ? "bg-[#24172F] text-[#F6F0E7] border-[#9ED8B2]/40"
            : "bg-[#24172F] text-[#F6F0E7] border-[#F26B4F]/40"
        }`}
      >
        {toast.type === "success" ? (
          <CheckCircle2 size={16} className="text-[#9ED8B2] shrink-0" />
        ) : (
          <AlertTriangle size={16} className="text-[#F26B4F] shrink-0" />
        )}
        <span>{toast.text}</span>
        <button onClick={() => setToast(null)} className="ml-2 text-[#B7A5C8] hover:text-white">
          <X size={14} />
        </button>
      </div>
    </div>
  );

  // Session Verification Splash
  if (isVerifyingSession) {
    return (
      <BrandedLoader
        fullScreen
        message="Preparing your inventory workspace..."
        submessage="Checking session and store data"
      />
    );
  }

  // 1. Stage 1: Public Marketing Home Page
  if (currentView === "home") {
    return (
      <>
        {toastElement}
        <HomePage
          onGetStarted={() => {
            setCurrentView("login");
          }}
          onExploreFeatures={() => {
            const el = document.getElementById("features");
            if (el) {
              el.scrollIntoView({ behavior: "smooth" });
            }
          }}
        />
      </>
    );
  }

  // 2. Stage 2: Conventional Login / Account Access
  if (currentView === "login" || !activeBusiness) {
    return (
      <>
        {toastElement}
        <LoginPage
          onLoginSuccess={(biz) => {
            if (window.location.hash) {
              window.history.replaceState(null, "", window.location.pathname);
            }
            window.scrollTo({ top: 0, behavior: "instant" });
            setActiveBusiness(biz);
            setCurrentView("dashboard");
            setActiveTab("dashboard");
            setSelectedProductForMovement(null);
            setIsAddProductModalOpen(false);
            showToast("success", `Signed in to ${biz.name} (${biz.type})`);
          }}
          onBackToHome={() => {
            if (window.location.hash) {
              window.history.replaceState(null, "", window.location.pathname);
            }
            window.scrollTo({ top: 0, behavior: "instant" });
            setCurrentView("home");
          }}
        />
      </>
    );
  }

  // 3. Stage 3: Authenticated Business Dashboard
  return (
    <div className="min-h-screen bg-[#F6F0E7] text-[#28212D] flex flex-col selection:bg-[#F26B4F] selection:text-white">
      {toastElement}

      {/* Main Top Navigation */}
      <Navigation
        activeBusiness={activeBusiness}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={() => {
          clearSession();
          setActiveBusiness(null);
          if (window.location.hash) {
            window.history.replaceState(null, "", window.location.pathname);
          }
          window.scrollTo({ top: 0, behavior: "instant" });
          setCurrentView("home");
          showToast("success", "Logged out of your business account.");
        }}
      />

      {/* Main Page Content Body with smooth transition on tab change */}
      <main className="flex-1 pb-16">
        <div key={activeTab} className="animate-fade-in-up">
          {activeTab === "dashboard" && (
            <DashboardPage
              onNavigate={(tab) => setActiveTab(tab)}
              onOpenAddProduct={() => {
                setActiveTab("inventory");
                setIsAddProductModalOpen(true);
              }}
              onOpenRecordSale={() => {
                setActiveTab("movements");
              }}
              onOpenReceiveStock={() => {
                setActiveTab("inventory");
              }}
            />
          )}

          {activeTab === "inventory" && (
            <InventoryPage
              isAddModalOpen={isAddProductModalOpen}
              setIsAddModalOpen={setIsAddProductModalOpen}
              onOpenRecordMovement={(prod) => {
                setSelectedProductForMovement(prod);
                setActiveTab("movements");
              }}
              onOpenImportCSV={() => {
                setActiveTab("import-export");
              }}
            />
          )}

          {activeTab === "movements" && (
            <MovementsPage initialProduct={selectedProductForMovement} />
          )}

          {activeTab === "reorder" && <ReorderPage />}

          {activeTab === "reports" && <ReportsPage />}

          {activeTab === "settings" && (
            <SettingsPage
              activeBusiness={activeBusiness}
              onLogout={() => {
                clearSession();
                setActiveBusiness(null);
                if (window.location.hash) {
                  window.history.replaceState(null, "", window.location.pathname);
                }
                window.scrollTo({ top: 0, behavior: "instant" });
                setCurrentView("home");
              }}
              onOpenImportExport={() => setActiveTab("import-export")}
            />
          )}

          {/* Business-facing AI views */}
          {activeTab === "forecast" && <ForecastPage />}

          {activeTab === "insights" && <InsightsPage />}

          {activeTab === "import-export" && (
            <ImportExportPage
              onDataChanged={() => {
                showToast("success", "Catalog data updated successfully.");
              }}
            />
          )}
        </div>
      </main>

      {/* Global Footer */}
      <footer className="border-t border-[#33253D]/10 bg-white py-6 text-xs text-[#8C7A9C]">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#24172F]">StockSense AI</span>
            <span>—</span>
            <span className="font-medium text-[#24172F]">{activeBusiness.name}</span>
            <span>({activeBusiness.type})</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-emerald-700 font-semibold">Private Account Session</span>
            <span>•</span>
            <span className="text-[#F26B4F] font-bold">Currency: ₹ (INR)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
