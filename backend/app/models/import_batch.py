import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.orm import relationship
from app.db.base import Base

class SalesImportBatch(Base):
    __tablename__ = "sales_import_batches"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(String(64), nullable=False, default="freshmart", index=True)
    batch_type = Column(String(32), nullable=False, default="SALES")  # PRODUCTS or SALES
    filename = Column(String(255), nullable=False)
    imported_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    status = Column(String(32), nullable=False, default="COMPLETED")  # PENDING, COMPLETED, FAILED
    rows_total = Column(Integer, nullable=False, default=0)
    rows_imported = Column(Integer, nullable=False, default=0)
    rows_rejected = Column(Integer, nullable=False, default=0)
    error_report_json = Column(Text, nullable=True)
    file_hash = Column(String(64), nullable=True, index=True)

    movements = relationship("StockMovement", back_populates="import_batch")
