from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import get_current_business, BusinessIdentity
from app.ai.forecasting.engine import DemandForecastingEngine
from app.schemas.forecast import ForecastResponse, TrainAllForecastsResponse
from app.models.product import Product

router = APIRouter(prefix="/forecast", tags=["Demand Forecasting"])

@router.get("/{product_id}", response_model=ForecastResponse)
def get_or_run_forecast(
    product_id: int,
    horizon_days: int = Query(7, ge=1, le=30),
    db: Session = Depends(get_db),
    business: BusinessIdentity = Depends(get_current_business),
):
    try:
        return DemandForecastingEngine.train_and_forecast(
            db, product_id=product_id, horizon_days=horizon_days, business_id=business.business_id
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/train", response_model=TrainAllForecastsResponse)
def train_all_forecasts(
    horizon_days: int = Query(7, ge=1, le=30),
    db: Session = Depends(get_db),
    business: BusinessIdentity = Depends(get_current_business),
):
    products = db.query(Product).filter(
        Product.is_active == True,
        Product.business_id == business.business_id
    ).all()
    results: List[ForecastResponse] = []
    trained = 0
    insufficient = 0

    for p in products:
        resp = DemandForecastingEngine.train_and_forecast(
            db, product_id=p.id, horizon_days=horizon_days, business_id=business.business_id
        )
        results.append(resp)
        if resp.status == "COMPLETED":
            trained += 1
        else:
            insufficient += 1

    return TrainAllForecastsResponse(
        trained_count=trained,
        insufficient_data_count=insufficient,
        results=results,
    )
