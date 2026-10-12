const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api/v1";

export interface Product {
  id: number;
  sku: string;
  name: string;
  category: string;
  description?: string;
  current_stock: number;
  unit_cost: number;
  selling_price: number;
  reorder_threshold: number;
  supplier_lead_time_days: number;
  supplier_name?: string;
  supplier_contact?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: number;
  product_id: number;
  product_sku?: string;
  product_name?: string;
  movement_type: "SALE" | "STOCK_RECEIPT" | "CUSTOMER_RETURN" | "DAMAGE_LOSS" | "ADJUSTMENT" | "OPENING_STOCK";
  quantity: number;
  stock_delta: number;
  previous_stock?: number;
  current_stock?: number;
  unit_price?: number;
  total_amount?: number;
  supplier_name?: string;
  occurred_at: string;
  transaction_date?: string;
  created_at?: string;
  reference?: string;
  note?: string;
  source: string;
}

export interface RestockResult {
  product_id: number;
  product_sku: string;
  product_name: string;
  quantity_received: number;
  previous_stock: number;
  new_stock: number;
  unit_cost: number;
  total_cost: number;
  supplier_name?: string;
  occurred_at: string;
  movement_id: number;
  reference?: string;
  note?: string;
  message: string;
}

export interface MovementSummary {
  transactions_count: number;
  units_sold: number;
  sales_revenue: number;
  units_received: number;
  receipt_cost: number;
  net_stock_delta: number;
  currency: string;
  currency_symbol: string;
}

export interface DashboardKPIs {
  total_active_products: number;
  total_units_in_stock: number;
  total_inventory_value: number;
  today_sales_units: number;
  today_sales_revenue: number;
  low_stock_count: number;
  high_risk_count: number;
  fast_moving_products: Array<{
    product_id: number;
    sku: string;
    name: string;
    category: string;
    units_sold_30d: number;
    current_stock: number;
    daily_sales_rate: number;
    stock_cover_days: number;
  }>;
  slow_moving_products: Array<{
    product_id: number;
    sku: string;
    name: string;
    category: string;
    units_sold_30d: number;
    current_stock: number;
    daily_sales_rate: number;
    stock_cover_days: number;
  }>;
  recent_movements: Array<{
    id: number;
    product_id: number;
    product_sku: string;
    product_name: string;
    movement_type: string;
    quantity: number;
    stock_delta: number;
    occurred_at: string;
    reference?: string;
  }>;
  sales_trend_30d: Array<{
    date: string;
    units_sold: number;
    revenue: number;
  }>;
}

export interface ForecastPoint {
  date: string;
  predicted_units: number;
  baseline_units: number;
}

export interface ForecastResponse {
  product_id: number;
  sku: string;
  product_name: string;
  model_name: string;
  model_version: string;
  horizon_days: number;
  training_start?: string;
  training_end?: string;
  training_rows: number;
  predicted_total_units: number;
  metrics?: { mae: number; rmse: number; test_days: number };
  baseline_metrics?: { baseline_mae: number; baseline_rmse: number; baseline_method: string };
  daily_forecast: ForecastPoint[];
  status: "COMPLETED" | "INSUFFICIENT_DATA" | "FAILED";
  limitations?: string;
}

export interface ClusterSummary {
  cluster_id: number;
  name: string;
  description: string;
  size: number;
  avg_demand_rate: number;
  avg_variability: number;
  avg_stock_cover: number;
  avg_stock_value: number;
}

export interface ClusterProduct {
  product_id: number;
  sku: string;
  name: string;
  category: string;
  current_stock: number;
  demand_rate: number;
  demand_variability: number;
  stock_cover_days: number;
  stock_value: number;
  cluster_id: number;
  cluster_label: string;
}

export interface ClusteringResponse {
  total_products: number;
  clusters: ClusterSummary[];
  products: ClusterProduct[];
}

export interface FuzzyRiskItem {
  product_id: number;
  sku: string;
  name: string;
  category: string;
  current_stock: number;
  daily_demand: number;
  lead_time_days: number;
  stock_cover_days: number;
  risk_score: number;
  risk_label: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  membership: Record<string, Record<string, number>>;
  triggered_rules: Array<{
    rule_number: number;
    rule_text: string;
    weight: number;
    consequent: string;
  }>;
}

export interface ReorderRecommendation {
  id: number;
  product_id: number;
  sku: string;
  name: string;
  category: string;
  current_stock: number;
  reorder_threshold: number;
  lead_time_days: number;
  forecast_daily_demand: number;
  stock_cover_days: number;
  risk_score: number;
  risk_label: string;
  safety_stock_units: number;
  suggested_quantity: number;
  priority_rank: number;
  priority_score: number;
  explanation?: string;
  status: "PENDING" | "REVIEWED" | "ORDERED" | "RECEIVED" | "DISMISSED";
  created_at: string;
}

export interface PrologStatus {
  available: boolean;
  runtime: string;
  version?: string;
  binary_path?: string;
  rules_file: string;
  rules_loaded: boolean;
  sample_query_success: boolean;
  diagnostic_message?: string;
}

export interface BusinessProfile {
  id: string;
  name: string;
  type: string;
  tag: string;
  accent: "mint" | "coral" | "amber" | "mauve" | string;
  description: string;
  categories: string[];
  has_preloaded_data?: boolean;
  currency: string;
  currency_symbol: string;
}

export const SESSION_TOKEN_KEY = "stocksense_auth_token";
export const SESSION_BUSINESS_KEY = "stocksense_business_profile";

export function getSessionToken(): string | null {
  return localStorage.getItem(SESSION_TOKEN_KEY);
}

export function getActiveBusiness(): BusinessProfile | null {
  const data = localStorage.getItem(SESSION_BUSINESS_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function saveSession(token: string, business: BusinessProfile) {
  localStorage.setItem(SESSION_TOKEN_KEY, token);
  localStorage.setItem(SESSION_BUSINESS_KEY, JSON.stringify(business));
}

export function clearSession() {
  localStorage.removeItem(SESSION_TOKEN_KEY);
  localStorage.removeItem(SESSION_BUSINESS_KEY);
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const token = getSessionToken();
  const activeBiz = getActiveBusiness();

  const authHeaders: Record<string, string> = {};
  if (token) {
    authHeaders["Authorization"] = `Bearer ${token}`;
  }
  if (activeBiz?.id) {
    authHeaders["X-Business-ID"] = activeBiz.id;
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("stocksense-session-expired"));
      }
    }
    let errorDetail = "An unexpected server error occurred.";
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || JSON.stringify(errJson);
    } catch {
      errorDetail = await response.text();
    }
    throw new Error(errorDetail || `HTTP error ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Authentication & Workspaces
  login: (identifier: string, password: string) =>
    request<{ access_token: string; token_type: string; business: BusinessProfile }>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ identifier, password }),
      }
    ),
  quickLogin: (businessId: string) =>
    request<{ access_token: string; token_type: string; business: BusinessProfile }>(
      "/auth/quick-login",
      {
        method: "POST",
        body: JSON.stringify({ business_id: businessId }),
      }
    ),
  getDemoBusinesses: () => request<BusinessProfile[]>("/auth/businesses"),
  loginDemo: (businessId: string) =>
    request<{ access_token: string; token_type: string; business: BusinessProfile }>(
      "/auth/quick-login",
      {
        method: "POST",
        body: JSON.stringify({ business_id: businessId }),
      }
    ),
  getMe: () => request<BusinessProfile>("/auth/me"),
  getMeta: () => request<any>("/meta"),

  // Dashboard
  getDashboardKPIs: (params?: { date?: string; trend_days?: number } | string) => {
    const q = new URLSearchParams();
    if (typeof params === "string") {
      if (params) q.set("date", params);
    } else if (params) {
      if (params.date) q.set("date", params.date);
      if (params.trend_days) q.set("trend_days", params.trend_days.toString());
    }
    const qs = q.toString();
    return request<DashboardKPIs>(`/dashboard/kpis${qs ? `?${qs}` : ""}`);
  },

  // Products
  getProducts: (params?: { search?: string; category?: string; page?: number; size?: number }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    if (params?.category) q.set("category", params.category);
    if (params?.page) q.set("page", params.page.toString());
    if (params?.size) q.set("size", params.size.toString());
    return request<{ items: Product[]; total: number; page: number; size: number; pages: number }>(`/products?${q.toString()}`);
  },
  getProduct: (id: number) => request<Product>(`/products/${id}`),
  createProduct: (data: Partial<Product> & { opening_stock: number }) =>
    request<Product>("/products", { method: "POST", body: JSON.stringify(data) }),
  updateProduct: (id: number, data: Partial<Product>) =>
    request<Product>(`/products/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  restockProduct: (
    productId: number,
    data: {
      quantity: number;
      occurred_at?: string;
      unit_cost?: number;
      supplier_name?: string;
      reference?: string;
      note?: string;
    }
  ) => request<RestockResult>(`/products/${productId}/restock`, { method: "POST", body: JSON.stringify(data) }),

  // Movements & Sales
  getMovements: (params?: { product_id?: number; movement_type?: string; start_date?: string; end_date?: string; page?: number; size?: number }) => {
    const q = new URLSearchParams();
    if (params?.product_id) q.set("product_id", params.product_id.toString());
    if (params?.movement_type) q.set("movement_type", params.movement_type);
    if (params?.start_date) q.set("start_date", params.start_date);
    if (params?.end_date) q.set("end_date", params.end_date);
    if (params?.page) q.set("page", params.page.toString());
    if (params?.size) q.set("size", params.size.toString());
    return request<{ items: StockMovement[]; total: number; page: number; size: number; pages: number }>(`/movements?${q.toString()}`);
  },
  getMovementsSummary: (params?: { product_id?: number; movement_type?: string; start_date?: string; end_date?: string }) => {
    const q = new URLSearchParams();
    if (params?.product_id) q.set("product_id", params.product_id.toString());
    if (params?.movement_type) q.set("movement_type", params.movement_type);
    if (params?.start_date) q.set("start_date", params.start_date);
    if (params?.end_date) q.set("end_date", params.end_date);
    const qs = q.toString();
    return request<MovementSummary>(`/movements/summary${qs ? `?${qs}` : ""}`);
  },
  recordMovement: (data: {
    product_id: number;
    movement_type: string;
    quantity: number;
    occurred_at?: string;
    unit_price?: number;
    supplier_name?: string;
    reference?: string;
    note?: string;
    stock_delta?: number;
  }) => request<StockMovement>("/movements", { method: "POST", body: JSON.stringify(data) }),
  verifyStockIntegrity: (productId: number) =>
    request<{ product_id: number; cached_current_stock: number; ledger_sum_deltas: number; is_consistent: boolean }>(
      `/movements/verify-integrity/${productId}`
    ),

  // CSV Preview & Commit
  previewProductsCSV: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const token = getSessionToken();
    const activeBiz = getActiveBusiness();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (activeBiz?.id) headers["X-Business-ID"] = activeBiz.id;
    const res = await fetch(`${API_BASE}/products/import/preview`, { method: "POST", body: formData, headers });
    if (!res.ok) throw new Error((await res.json()).detail || "Failed to preview CSV");
    return res.json();
  },
  commitProductsCSV: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const token = getSessionToken();
    const activeBiz = getActiveBusiness();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (activeBiz?.id) headers["X-Business-ID"] = activeBiz.id;
    const res = await fetch(`${API_BASE}/products/import/commit`, { method: "POST", body: formData, headers });
    if (!res.ok) throw new Error((await res.json()).detail || "Failed to commit CSV");
    return res.json();
  },
  previewSalesCSV: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const token = getSessionToken();
    const activeBiz = getActiveBusiness();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (activeBiz?.id) headers["X-Business-ID"] = activeBiz.id;
    const res = await fetch(`${API_BASE}/sales/import/preview`, { method: "POST", body: formData, headers });
    if (!res.ok) throw new Error((await res.json()).detail || "Failed to preview Sales CSV");
    return res.json();
  },
  commitSalesCSV: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const token = getSessionToken();
    const activeBiz = getActiveBusiness();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (activeBiz?.id) headers["X-Business-ID"] = activeBiz.id;
    const res = await fetch(`${API_BASE}/sales/import/commit`, { method: "POST", body: formData, headers });
    if (!res.ok) throw new Error((await res.json()).detail || "Failed to commit Sales CSV");
    return res.json();
  },

  // Direct Sales Operations
  recordDirectSale: (data: {
    product_id: number;
    quantity: number;
    occurred_at?: string;
    unit_price?: number;
    reference?: string;
    note?: string;
  }) => request<any>("/sales", { method: "POST", body: JSON.stringify(data) }),
  getSalesSummary: (params?: { date?: string; start_date?: string; end_date?: string } | string) => {
    const q = new URLSearchParams();
    if (typeof params === "string") {
      if (params) q.set("date", params);
    } else if (params) {
      if (params.date) q.set("date", params.date);
      if (params.start_date) q.set("start_date", params.start_date);
      if (params.end_date) q.set("end_date", params.end_date);
    }
    const qs = q.toString();
    return request<any>(`/sales/summary${qs ? `?${qs}` : ""}`);
  },

  // Forecast & AI
  getForecast: (productId: number, horizon: number = 7) =>
    request<ForecastResponse>(`/forecast/${productId}?horizon_days=${horizon}`),
  trainAllForecasts: (horizon: number = 7) =>
    request<{ trained_count: number; insufficient_data_count: number; results: ForecastResponse[] }>(
      `/forecast/train?horizon_days=${horizon}`,
      { method: "POST" }
    ),
  getClusters: (k: number = 3) => request<ClusteringResponse>(`/analytics/clusters?k=${k}`),
  getStockoutRisk: () => request<{ items: FuzzyRiskItem[]; high_risk_count: number; medium_risk_count: number; low_risk_count: number }>("/analytics/stockout-risk"),
  getReorderRecommendations: () => request<{ recommendations: ReorderRecommendation[]; pending_count: number; total_suggested_units: number; total_estimated_cost: number }>("/reorder/recommendations"),
  updateReorderStatus: (id: number, status: string) =>
    request<any>(`/reorder/recommendations/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ status }),
    }),

  // AI Methods Lab
  getPrologStatus: () => request<PrologStatus>("/ai/prolog/status"),
  runPracticalMethod: (name: string, payload: any) =>
    request<any>(`/ai/methods/${name}/run`, { method: "POST", body: JSON.stringify(payload) }),

  // Demo Controls
  loadDemoData: () => request<any>("/demo/load", { method: "POST" }),
  resetWorkspace: () => request<any>("/demo/reset", { method: "POST" }),
  resetAndReloadDemo: () => request<any>("/demo/reset-and-reload", { method: "POST" }),

  // Reports
  getReportUrl: (type: "inventory" | "movements" | "reorder" | "forecast") => `${API_BASE}/reports/${type}.csv`,
  downloadReport: async (type: "inventory" | "movements" | "reorder" | "forecast") => {
    const token = getSessionToken();
    const activeBiz = getActiveBusiness();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (activeBiz?.id) headers["X-Business-ID"] = activeBiz.id;

    const res = await fetch(`${API_BASE}/reports/${type}.csv`, { headers });
    if (!res.ok) {
      if (res.status === 401) {
        clearSession();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("stocksense-session-expired"));
        }
      }
      let errorDetail = "Failed to download report.";
      try {
        const errJson = await res.json();
        errorDetail = errJson.detail || errorDetail;
      } catch {
        errorDetail = (await res.text()) || errorDetail;
      }
      throw new Error(errorDetail);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}_${activeBiz?.id || "report"}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};
