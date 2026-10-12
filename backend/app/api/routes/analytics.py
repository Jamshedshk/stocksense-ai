from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import get_current_business, BusinessIdentity
from app.ai.clustering.engine import ProductClusteringEngine
from app.ai.fuzzy.controller import FuzzyStockoutRiskController
from app.models.product import Product
from app.models.stock_movement import StockMovement
from app.schemas.ai import ClusteringResponse, FuzzyRiskListResponse, FuzzyRiskItem

router = APIRouter(prefix="/analytics", tags=["AI Analytics: Clustering & Fuzzy Risk"])

@router.get("/clusters", response_model=ClusteringResponse)
def get_product_clusters(
    k: int = Query(3, ge=2, le=5),
    db: Session = Depends(get_db),
    business: BusinessIdentity = Depends(get_current_business),
):
    return ProductClusteringEngine.analyze_clusters(db, n_clusters=k, business_id=business.business_id)

@router.get("/stockout-risk", response_model=FuzzyRiskListResponse)
def get_stockout_risk_assessment(
    db: Session = Depends(get_db),
    business: BusinessIdentity = Depends(get_current_business),
):
    products = db.query(Product).filter(
        Product.is_active == True,
        Product.business_id == business.business_id
    ).all()
    
    # Calculate daily demand per product over past 30 days
    recent_sales = db.query(
        StockMovement.product_id,
        StockMovement.quantity
    ).filter(
        StockMovement.movement_type == "SALE",
        StockMovement.business_id == business.business_id
    ).all()

    sales_map: Dict[int, int] = {}
    for p_id, qty in recent_sales:
        sales_map[p_id] = sales_map.get(p_id, 0) + qty

    items: List[FuzzyRiskItem] = []
    high_count = 0
    med_count = 0
    low_count = 0

    for p in products:
        sold = sales_map.get(p.id, 0)
        daily_demand = max(0.2, round(sold / 30.0, 2)) if sold > 0 else 0.5
        stock_cover = round(p.current_stock / daily_demand, 1)

        risk_score, risk_label, membership, rules_fired = FuzzyStockoutRiskController.evaluate(
            stock_cover_days=stock_cover,
            lead_time_days=p.supplier_lead_time_days,
            daily_demand=daily_demand,
        )

        if risk_label in ("HIGH", "CRITICAL"):
            high_count += 1
        elif risk_label == "MEDIUM":
            med_count += 1
        else:
            low_count += 1

        items.append(
            FuzzyRiskItem(
                product_id=p.id,
                sku=p.sku,
                name=p.name,
                category=p.category,
                current_stock=p.current_stock,
                daily_demand=daily_demand,
                lead_time_days=p.supplier_lead_time_days,
                stock_cover_days=stock_cover,
                risk_score=risk_score,
                risk_label=risk_label,
                membership=membership,
                triggered_rules=rules_fired,
            )
        )

    # Sort by risk score descending
    items.sort(key=lambda x: -x.risk_score)

    return FuzzyRiskListResponse(
        items=items,
        high_risk_count=high_count,
        medium_risk_count=med_count,
        low_risk_count=low_count,
    )
