from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db
from app.ai.prolog.runner import PrologEngine
from app.core.config import settings

router = APIRouter(tags=["Health & Metadata"])

@router.get("/health")
def get_health(db: Session = Depends(get_db)):
    db_status = "healthy"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    prolog_stat = PrologEngine.check_status()

    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "environment": settings.APP_ENV,
        "database": db_status,
        "prolog_runtime": {
            "available": prolog_stat.available,
            "runtime": prolog_stat.runtime,
            "version": prolog_stat.version,
            "rules_loaded": prolog_stat.rules_loaded,
            "sample_query_success": prolog_stat.sample_query_success,
        },
    }

@router.get("/meta")
def get_metadata():
    return {
        "project": settings.PROJECT_NAME,
        "version": "1.0.0",
        "author": "StockSense AI Engineering Team",
        "features": {
            "inventory_management": True,
            "stock_movement_ledger": True,
            "csv_import_export": True,
            "demand_forecasting_mlp": True,
            "product_clustering_kmeans": True,
            "stockout_risk_assessment": True,
            "reorder_prioritization": True,
        },
        "pos_integration_status": "Planned Roadmap Extension (Not claimed as live)",
    }
