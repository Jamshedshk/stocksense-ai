from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class FastSlowProductItem(BaseModel):
    product_id: int
    sku: str
    name: str
    category: str
    units_sold_30d: int
    current_stock: int
    daily_sales_rate: float
    stock_cover_days: float

class MovementSummaryItem(BaseModel):
    id: int
    product_id: int
    product_sku: str
    product_name: str
    movement_type: str
    quantity: int
    stock_delta: int
    occurred_at: str
    reference: Optional[str] = None

class SalesTrendPoint(BaseModel):
    date: str
    units_sold: int
    revenue: float

class DashboardKPIs(BaseModel):
    total_active_products: int
    total_units_in_stock: int
    total_inventory_value: float
    today_sales_units: int
    today_sales_revenue: float
    low_stock_count: int
    high_risk_count: int
    fast_moving_products: List[FastSlowProductItem]
    slow_moving_products: List[FastSlowProductItem]
    recent_movements: List[MovementSummaryItem]
    sales_trend_30d: List[SalesTrendPoint]
