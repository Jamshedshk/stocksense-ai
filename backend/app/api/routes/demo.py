from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import get_current_business, BusinessProfile, DEMO_BUSINESSES
from app.services.demo_seeder import seed_business_demo_data, seed_all_demo_businesses
from app.models.product import Product
from app.models.stock_movement import StockMovement
from app.models.import_batch import SalesImportBatch
from app.models.forecast_run import ForecastRun
from app.models.reorder_recommendation import ReorderRecommendation

router = APIRouter(prefix="/demo", tags=["Demo Data Management"])

@router.post("/load")
def load_demo_dataset(
    business_id: Optional[str] = Query(None),
    current_biz: BusinessProfile = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    """
    Populates inventory and 45 days of sales records in Indian Rupees (₹)
    strictly for the authenticated business workspace.
    """
    target_bid = current_biz.id
    if business_id and business_id.lower().strip() != target_bid:
        raise HTTPException(status_code=403, detail="Forbidden: Cannot load data into a different workspace.")
    
    result = seed_business_demo_data(db, target_bid, force_reset=False)
    return result

@router.post("/reset")
def reset_workspace(
    business_id: Optional[str] = Query(None),
    current_biz: BusinessProfile = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    """
    Purges records strictly for the active business workspace, keeping other businesses completely isolated.
    Gated to development/demo environments.
    """
    from app.core.config import settings
    if not settings.ENABLE_DEMO_RESETS:
        raise HTTPException(status_code=403, detail="Database resets are disabled.")

    target_bid = current_biz.id
    if business_id and business_id.lower().strip() != target_bid:
        raise HTTPException(status_code=403, detail="Forbidden: Cannot reset a different workspace.")

    db.query(ReorderRecommendation).filter(ReorderRecommendation.business_id == target_bid).delete()
    db.query(ForecastRun).filter(ForecastRun.business_id == target_bid).delete()
    db.query(StockMovement).filter(StockMovement.business_id == target_bid).delete()
    db.query(Product).filter(Product.business_id == target_bid).delete()
    db.query(SalesImportBatch).filter(SalesImportBatch.business_id == target_bid).delete()
    db.commit()

    return {
        "status": "success",
        "business_id": target_bid,
        "business_name": DEMO_BUSINESSES[target_bid].name,
        "message": f"Workspace '{DEMO_BUSINESSES[target_bid].name}' wiped clean. Other businesses remain intact.",
    }

@router.post("/reset-and-reload")
def reset_and_reload_workspace(
    business_id: Optional[str] = Query(None),
    current_biz: BusinessProfile = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    """Resets and freshly seeds the active business workspace in INR."""
    from app.core.config import settings
    if not settings.ENABLE_DEMO_RESETS:
        raise HTTPException(status_code=403, detail="Database resets are disabled.")

    target_bid = current_biz.id
    if business_id and business_id.lower().strip() != target_bid:
        raise HTTPException(status_code=403, detail="Forbidden: Cannot reset a different workspace.")
    result = seed_business_demo_data(db, target_bid, force_reset=True)
    return result

@router.post("/init-all")
def initialize_all_demo_businesses(db: Session = Depends(get_db)):
    """Ensures all 4 demo businesses are seeded in the database."""
    return seed_all_demo_businesses(db, force_reset=False)
