import datetime
from sqlalchemy import Column, Integer, Float, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.db.base import Base

class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(String(64), nullable=False, default="freshmart", index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    
    # SALE | STOCK_RECEIPT | CUSTOMER_RETURN | DAMAGE_LOSS | ADJUSTMENT | OPENING_STOCK
    movement_type = Column(String(32), nullable=False, index=True)
    
    # Positive magnitude of units affected
    quantity = Column(Integer, nullable=False)
    
    # Signed change applied to stock (e.g. -5 for SALE, +10 for STOCK_RECEIPT)
    stock_delta = Column(Integer, nullable=False)
    
    # Unit price at transaction time (actual selling price for SALE, purchase cost for RECEIPT)
    unit_price = Column(Float, nullable=True)
    
    # When movement occurred
    occurred_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False, index=True)
    
    # External reference or invoice / receipt id or OPENING_STOCK
    reference = Column(String(128), nullable=True, index=True)
    
    # Optional note or reasoning
    note = Column(Text, nullable=True)
    
    # MANUAL | CSV_IMPORT | POS_INTEGRATION
    source = Column(String(32), nullable=False, default="MANUAL")
    
    import_batch_id = Column(Integer, ForeignKey("sales_import_batches.id"), nullable=True)
    
    supplier_name = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    created_by = Column(String(128), nullable=True)

    # Helper properties
    @property
    def transaction_date(self) -> str:
        return self.occurred_at.strftime("%Y-%m-%d") if self.occurred_at else ""

    @property
    def total_amount(self) -> float:
        if self.unit_price is not None:
            return round(abs(self.quantity) * self.unit_price, 2)
        return 0.0

    # Relationships
    product = relationship("Product", back_populates="movements")
    import_batch = relationship("SalesImportBatch", back_populates="movements")

    __table_args__ = (
        Index("ix_movements_prod_time", "product_id", "occurred_at"),
        Index("ix_movements_business_time", "business_id", "occurred_at"),
    )
