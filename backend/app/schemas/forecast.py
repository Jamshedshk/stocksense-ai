from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class ForecastPoint(BaseModel):
    date: str
    predicted_units: float
    baseline_units: float

class ForecastResponse(BaseModel):
    product_id: int
    sku: str
    product_name: str
    model_name: str
    model_version: str
    horizon_days: int
    training_start: Optional[str] = None
    training_end: Optional[str] = None
    training_rows: int
    predicted_total_units: float
    metrics: Optional[Dict[str, Any]] = None  # MAE, RMSE
    baseline_metrics: Optional[Dict[str, Any]] = None
    daily_forecast: List[ForecastPoint] = []
    status: str  # COMPLETED, INSUFFICIENT_DATA, FAILED
    limitations: Optional[str] = None

class TrainAllForecastsResponse(BaseModel):
    trained_count: int
    insufficient_data_count: int
    results: List[ForecastResponse]
