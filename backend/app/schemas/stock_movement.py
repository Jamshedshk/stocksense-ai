from datetime import datetime
from typing import Optional, List
from enum import Enum
from pydantic import BaseModel, Field

class MovementTypeEnum(str, Enum):
    SALE = "SALE"
    STOCK_RECEIPT = "STOCK_RECEIPT"
    CUSTOMER_RETURN = "CUSTOMER_RETURN"
    DAMAGE_LOSS = "DAMAGE_LOSS"
    ADJUSTMENT = "ADJUSTMENT"
    OPENING_STOCK = "OPENING_STOCK"

class MovementSourceEnum(str, Enum):
    MANUAL = "MANUAL"
    CSV_IMPORT = "CSV_IMPORT"
    POS_INTEGRATION = "POS_INTEGRATION"

class StockMovementCreate(BaseModel):
    product_id: int = Field(..., description="Target product ID")
    movement_type: MovementTypeEnum = Field(..., description="Type of stock movement")
    quantity: int = Field(..., gt=0, description="Positive units involved in movement")
    stock_delta: Optional[int] = Field(None, description="Explicit signed delta (required for ADJUSTMENT, auto-computed for others)")
    occurred_at: Optional[datetime] = Field(None, description="Actual transaction date & time (defaults to now)")
    reference: Optional[str] = Field(None, max_length=128, description="Invoice, receipt or reference ID")
    note: Optional[str] = Field(None, description="Reason or notes")
    unit_price: Optional[float] = Field(None, ge=0.0, description="Actual transaction unit price or purchase cost")
    supplier_name: Optional[str] = Field(None, max_length=255, description="Supplier name for stock receipts")

class StockMovementResponse(BaseModel):
    id: int
    product_id: int
    product_sku: Optional[str] = None
    product_name: Optional[str] = None
    movement_type: str
    quantity: int
    stock_delta: int
    previous_stock: Optional[int] = None
    current_stock: Optional[int] = None
    unit_price: Optional[float] = None
    total_amount: Optional[float] = None
    supplier_name: Optional[str] = None
    occurred_at: datetime
    transaction_date: Optional[str] = None
    reference: Optional[str] = None
    note: Optional[str] = None
    source: str
    import_batch_id: Optional[int] = None
    created_at: datetime
    created_by: Optional[str] = None

    class Config:
        from_attributes = True

class MovementListResponse(BaseModel):
    items: List[StockMovementResponse]
    total: int
    page: int
    size: int
    pages: int

class MovementSummaryResponse(BaseModel):
    transactions_count: int
    units_sold: int
    sales_revenue: float
    units_received: int
    receipt_cost: float
    net_stock_delta: int
    currency: str = "INR"
    currency_symbol: str = "₹"

