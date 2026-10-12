import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import get_current_business, BusinessProfile
from app.services.dashboard_service import DashboardService
from app.schemas.dashboard import DashboardKPIs

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/kpis", response_model=DashboardKPIs)
def get_dashboard_kpis(
    date_str: Optional[str] = Query(None, alias="date", description="Target business date YYYY-MM-DD"),
    trend_days: int = Query(30, ge=7, le=90, description="Trend horizon days (7, 14, 30, or 90)"),
    current_biz: BusinessProfile = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    business_date = datetime.datetime.strptime(date_str, "%Y-%m-%d").date() if date_str else None
    return DashboardService.get_dashboard_kpis(
        db, business_date=business_date, business_id=current_biz.id, trend_days=trend_days
    )
