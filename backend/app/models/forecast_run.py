import datetime
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class ForecastRun(Base):
    __tablename__ = "forecast_runs"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(String(64), nullable=False, default="freshmart", index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    model_name = Column(String(64), nullable=False, default="MLPRegressor")
    model_version = Column(String(32), nullable=False, default="1.0")
    horizon_days = Column(Integer, nullable=False, default=7)
    
    training_start = Column(DateTime, nullable=True)
    training_end = Column(DateTime, nullable=True)
    training_rows = Column(Integer, nullable=False, default=0)
    
    predicted_total_units = Column(Float, nullable=False, default=0.0)
    metrics_json = Column(Text, nullable=True)  # MAE, RMSE, MAPE
    baseline_metrics_json = Column(Text, nullable=True)  # Baseline MAE, RMSE
    daily_forecast_json = Column(Text, nullable=True)  # Array of {date, predicted_units, baseline_units}
    
    status = Column(String(32), nullable=False, default="COMPLETED")  # COMPLETED, INSUFFICIENT_DATA, FAILED
    limitations = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    product = relationship("Product", back_populates="forecast_runs")
