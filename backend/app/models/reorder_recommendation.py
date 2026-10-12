import datetime
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class ReorderRecommendation(Base):
    __tablename__ = "reorder_recommendations"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(String(64), nullable=False, default="freshmart", index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    
    # PENDING | REVIEWED | ORDERED | RECEIVED | DISMISSED
    status = Column(String(32), nullable=False, default="PENDING", index=True)
    
    risk_score = Column(Float, nullable=False, default=0.0)
    risk_label = Column(String(32), nullable=False, default="LOW")  # LOW, MEDIUM, HIGH, CRITICAL
    
    forecast_daily_demand = Column(Float, nullable=False, default=0.0)
    stock_cover_days = Column(Float, nullable=False, default=0.0)
    lead_time_days = Column(Integer, nullable=False, default=7)
    safety_stock_units = Column(Integer, nullable=False, default=0)
    suggested_quantity = Column(Integer, nullable=False, default=0)
    
    priority_rank = Column(Integer, nullable=False, default=1)
    priority_score = Column(Float, nullable=False, default=0.0)
    
    calculation_json = Column(Text, nullable=True)
    explanation = Column(Text, nullable=True)
    rule_trace_json = Column(Text, nullable=True)
    
    reviewed_at = Column(DateTime, nullable=True)
    ordered_at = Column(DateTime, nullable=True)
    received_at = Column(DateTime, nullable=True)

    product = relationship("Product", back_populates="reorder_recommendations")
