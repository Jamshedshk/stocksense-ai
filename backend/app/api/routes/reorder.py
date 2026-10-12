from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import get_current_business, BusinessProfile
from app.ai.prioritization.reorder_engine import ReorderPrioritizationEngine
from app.schemas.ai import ReorderListResponse, ReorderRecommendationItem, ReorderStatusUpdateRequest

router = APIRouter(prefix="/reorder", tags=["Reorder Center & Replenishment Search"])

@router.get("/recommendations", response_model=ReorderListResponse)
def get_reorder_recommendations(
    current_biz: BusinessProfile = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    return ReorderPrioritizationEngine.generate_recommendations(db, business_id=current_biz.id)

@router.post("/recommendations/{rec_id}/status")
def update_recommendation_status(
    rec_id: int,
    status_update: ReorderStatusUpdateRequest,
    current_biz: BusinessProfile = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    try:
        rec = ReorderPrioritizationEngine.update_recommendation_status(
            db, rec_id, status_update.status, business_id=current_biz.id
        )
        return {
            "id": rec.id,
            "status": rec.status,
            "updated_at": rec.reviewed_at or rec.ordered_at or rec.received_at,
            "message": f"Recommendation marked as {rec.status}."
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
