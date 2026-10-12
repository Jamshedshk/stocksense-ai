import datetime
from sqlalchemy import Column, Integer, String, Float, Text, Boolean, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(String(64), nullable=False, default="freshmart", index=True)
    sku = Column(String(64), index=True, nullable=False)
    name = Column(String(255), nullable=False, index=True)
    category = Column(String(100), nullable=False, default="Uncategorized", index=True)
    description = Column(Text, nullable=True)
    
    # Authoritative stock is sum of movements; current_stock is cached for fast lookup & verified
    current_stock = Column(Integer, nullable=False, default=0)
    
    unit_cost = Column(Float, nullable=False, default=0.0)
    selling_price = Column(Float, nullable=False, default=0.0)
    reorder_threshold = Column(Integer, nullable=False, default=5)
    supplier_lead_time_days = Column(Integer, nullable=False, default=7)
    supplier_name = Column(String(255), nullable=True)
    supplier_contact = Column(String(255), nullable=True)
    
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    # Relationships
    movements = relationship("StockMovement", back_populates="product", cascade="all, delete-orphan", order_by="desc(StockMovement.occurred_at)")
    forecast_runs = relationship("ForecastRun", back_populates="product", cascade="all, delete-orphan")
    reorder_recommendations = relationship("ReorderRecommendation", back_populates="product", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("business_id", "sku", name="uix_business_sku"),
    )
