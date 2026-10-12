import io
import csv
from typing import Optional
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import get_current_business, BusinessProfile
from app.services.import_service import ImportExportService
from app.ai.prioritization.reorder_engine import ReorderPrioritizationEngine
from app.models.forecast_run import ForecastRun
from app.models.product import Product

router = APIRouter(prefix="/reports", tags=["Reports & CSV Downloads"])

@router.get("/inventory.csv")
def download_inventory_csv(
    current_biz: BusinessProfile = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    content = ImportExportService.export_inventory_csv(db, business_id=current_biz.id)
    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={current_biz.id}_inventory_report.csv"},
    )

@router.get("/movements.csv")
def download_movements_csv(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_biz: BusinessProfile = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    import datetime
    parsed_start = datetime.datetime.strptime(start_date.strip(), "%Y-%m-%d").date() if start_date else None
    parsed_end = datetime.datetime.strptime(end_date.strip(), "%Y-%m-%d").date() if end_date else None
    content = ImportExportService.export_movements_csv(
        db, business_id=current_biz.id, start_date=parsed_start, end_date=parsed_end
    )
    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={current_biz.id}_stock_movements_ledger.csv"},
    )

@router.get("/reorder.csv")
def download_reorder_csv(
    current_biz: BusinessProfile = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    rec_resp = ReorderPrioritizationEngine.generate_recommendations(db, business_id=current_biz.id)
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow([
        "priority_rank", "sku", "name", "category", "current_stock",
        "reorder_threshold", "lead_time_days", "forecast_daily_demand",
        "stock_cover_days", "risk_score", "risk_label", "safety_stock_units",
        "suggested_quantity", "priority_score", "status", "explanation"
    ])
    for r in rec_resp.recommendations:
        writer.writerow([
            r.priority_rank, r.sku, r.name, r.category, r.current_stock,
            r.reorder_threshold, r.lead_time_days, r.forecast_daily_demand,
            r.stock_cover_days, r.risk_score, r.risk_label, r.safety_stock_units,
            r.suggested_quantity, r.priority_score, r.status, r.explanation
        ])
    return Response(
        content=out.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={current_biz.id}_reorder_recommendations.csv"},
    )

@router.get("/forecast.csv")
def download_forecast_csv(
    current_biz: BusinessProfile = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    runs = db.query(ForecastRun, Product).join(
        Product, ForecastRun.product_id == Product.id
    ).filter(
        ForecastRun.business_id == current_biz.id
    ).order_by(ForecastRun.created_at.desc()).all()
    
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow([
        "run_id", "created_at", "sku", "product_name", "model_name",
        "horizon_days", "predicted_total_units", "status", "limitations"
    ])
    for r, p in runs:
        writer.writerow([
            r.id, r.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            p.sku, p.name, r.model_name, r.horizon_days,
            r.predicted_total_units, r.status, r.limitations or ""
        ])
    return Response(
        content=out.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={current_biz.id}_forecast_runs.csv"},
    )
