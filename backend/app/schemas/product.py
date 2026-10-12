from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class ProductBase(BaseModel):
    sku: str = Field(..., min_length=1, max_length=64, description="Unique SKU code")
    name: str = Field(..., min_length=1, max_length=255, description="Product Name")
    category: str = Field(default="Uncategorized", max_length=100)
    description: Optional[str] = None
    unit_cost: float = Field(default=0.0, ge=0.0, description="Cost price per unit")
    selling_price: float = Field(default=0.0, ge=0.0, description="Selling price per unit")
    reorder_threshold: int = Field(default=5, ge=0, description="Minimum stock threshold before alert")
    supplier_lead_time_days: int = Field(default=7, ge=0, description="Expected supplier delivery lead time in days")
    supplier_name: Optional[str] = None
    supplier_contact: Optional[str] = None

class ProductCreate(ProductBase):
    opening_stock: int = Field(default=0, ge=0, description="Initial stock quantity upon creation")

class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    category: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    unit_cost: Optional[float] = Field(None, ge=0.0)
    selling_price: Optional[float] = Field(None, ge=0.0)
    reorder_threshold: Optional[int] = Field(None, ge=0)
    supplier_lead_time_days: Optional[int] = Field(None, ge=0)
    supplier_name: Optional[str] = None
    supplier_contact: Optional[str] = None
    is_active: Optional[bool] = None

class ProductResponse(ProductBase):
    id: int
    business_id: str = "freshmart"
    current_stock: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ProductListResponse(BaseModel):
    items: List[ProductResponse]
    total: int
    page: int
    size: int
    pages: int

class ProductRestockRequest(BaseModel):
    product_id: Optional[int] = Field(None, description="Product ID to restock (if not in URL path)")
    quantity: int = Field(..., gt=0, description="Quantity of units received from supplier")
    occurred_at: Optional[datetime] = Field(None, description="Actual date received (defaults to now)")
    unit_cost: Optional[float] = Field(None, ge=0.0, description="Purchase cost per unit for this receipt")
    supplier_name: Optional[str] = Field(None, max_length=255, description="Supplier name")
    reference: Optional[str] = Field(None, max_length=128, description="PO / invoice reference")
    note: Optional[str] = Field(None, description="Optional notes or remarks")

class ProductRestockResponse(BaseModel):
    product_id: int
    product_sku: str
    product_name: str
    quantity_received: int
    previous_stock: int
    new_stock: int
    unit_cost: float
    total_cost: float
    supplier_name: Optional[str] = None
    occurred_at: datetime
    movement_id: int
    reference: Optional[str] = None
    note: Optional[str] = None
    message: str
