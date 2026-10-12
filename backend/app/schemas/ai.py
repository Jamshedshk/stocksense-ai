from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# Clustering schemas
class ClusterProductItem(BaseModel):
    product_id: int
    sku: str
    name: str
    category: str
    current_stock: int
    demand_rate: float
    demand_variability: float
    stock_cover_days: float
    stock_value: float
    cluster_id: int
    cluster_label: str

class ClusterSummary(BaseModel):
    cluster_id: int
    name: str
    description: str
    size: int
    avg_demand_rate: float
    avg_variability: float
    avg_stock_cover: float
    avg_stock_value: float

class ClusteringResponse(BaseModel):
    total_products: int
    clusters: List[ClusterSummary]
    products: List[ClusterProductItem]

# Fuzzy Risk schemas
class FuzzyMembershipDetails(BaseModel):
    stock_cover_membership: Dict[str, float]
    lead_time_membership: Dict[str, float]
    demand_membership: Dict[str, float]

class TriggeredRuleItem(BaseModel):
    rule_number: int
    rule_text: str
    weight: float
    consequent: str

class FuzzyRiskItem(BaseModel):
    product_id: int
    sku: str
    name: str
    category: str
    current_stock: int
    daily_demand: float
    lead_time_days: int
    stock_cover_days: float
    risk_score: float
    risk_label: str
    membership: Dict[str, Any]
    triggered_rules: List[TriggeredRuleItem]

class FuzzyRiskListResponse(BaseModel):
    items: List[FuzzyRiskItem]
    high_risk_count: int
    medium_risk_count: int
    low_risk_count: int

# Reorder Recommendation schemas
class ReorderRecommendationItem(BaseModel):
    id: int
    product_id: int
    sku: str
    name: str
    category: str
    current_stock: int
    reorder_threshold: int
    lead_time_days: int
    forecast_daily_demand: float
    stock_cover_days: float
    risk_score: float
    risk_label: str
    safety_stock_units: int
    suggested_quantity: int
    priority_rank: int
    priority_score: float
    explanation: Optional[str] = None
    rule_trace: Optional[Dict[str, Any]] = None
    status: str
    created_at: datetime
    reviewed_at: Optional[datetime] = None
    ordered_at: Optional[datetime] = None
    received_at: Optional[datetime] = None

class ReorderStatusUpdateRequest(BaseModel):
    status: str = Field(..., description="Target status: REVIEWED, ORDERED, RECEIVED, DISMISSED")

class ReorderListResponse(BaseModel):
    recommendations: List[ReorderRecommendationItem]
    pending_count: int
    total_suggested_units: int
    total_estimated_cost: float

# PROLOG status & query schemas
class PrologStatusResponse(BaseModel):
    available: bool
    runtime: str
    version: Optional[str] = None
    binary_path: Optional[str] = None
    rules_file: str
    rules_loaded: bool
    sample_query_success: bool
    diagnostic_message: Optional[str] = None

class PrologQueryRequest(BaseModel):
    query: str

class PrologQueryResponse(BaseModel):
    success: bool
    query: str
    results: List[Dict[str, Any]]
    output: str
    error: Optional[str] = None
