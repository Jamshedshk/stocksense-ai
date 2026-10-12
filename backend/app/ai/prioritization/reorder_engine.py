import math
import json
import datetime
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from app.models.product import Product
from app.models.stock_movement import StockMovement
from app.models.reorder_recommendation import ReorderRecommendation
from app.ai.fuzzy.controller import FuzzyStockoutRiskController
from app.schemas.ai import ReorderRecommendationItem, ReorderListResponse

class ReorderPrioritizationEngine:
    @classmethod
    def generate_recommendations(cls, db: Session, business_id: str = "freshmart") -> ReorderListResponse:
        bid = (business_id or "freshmart").lower().strip()
        products = db.query(Product).filter(
            Product.business_id == bid,
            Product.is_active == True
        ).all()
        if not products:
            return ReorderListResponse(recommendations=[], pending_count=0, total_suggested_units=0, total_estimated_cost=0.0)

        # 30-day historical demand per product for this business
        thirty_days_ago = datetime.datetime.utcnow() - datetime.timedelta(days=30)
        recent_sales = db.query(
            StockMovement.product_id,
            StockMovement.quantity
        ).filter(
            StockMovement.business_id == bid,
            StockMovement.movement_type == "SALE",
            StockMovement.occurred_at >= thirty_days_ago
        ).all()

        sales_sum: Dict[int, int] = {}
        for p_id, qty in recent_sales:
            sales_sum[p_id] = sales_sum.get(p_id, 0) + qty

        candidates = []
        for p in products:
            sold_30d = sales_sum.get(p.id, 0)
            daily_demand = max(0.2, round(sold_30d / 30.0, 2)) if sold_30d > 0 else 0.5
            lead_time = max(1, p.supplier_lead_time_days)
            stock_cover = round(p.current_stock / daily_demand, 1)

            # Evaluate Fuzzy Risk
            risk_score, risk_label, membership, rules_fired = FuzzyStockoutRiskController.evaluate(
                stock_cover_days=stock_cover,
                lead_time_days=lead_time,
                daily_demand=daily_demand,
            )

            # Check if replenishment is needed (either risk >= 50, or stock <= threshold, or stock_cover <= lead_time)
            needs_reorder = (
                p.current_stock <= p.reorder_threshold or
                stock_cover <= lead_time or
                risk_score >= 50.0
            )

            if needs_reorder:
                # Deterministic Priority Score calculation
                comp_risk = (risk_score / 100.0) * 40.0
                shortage_gap = max(0.0, float(lead_time) - stock_cover)
                comp_shortage = min(40.0, (shortage_gap / lead_time) * 40.0)
                comp_velocity = min(20.0, (daily_demand / 10.0) * 20.0)
                priority_score = round(comp_risk + comp_shortage + comp_velocity, 2)

                # Suggested reorder quantity adhering to standard replenishment equation
                # Target Stock = Expected Demand During Lead Time + Safety Stock
                safety_stock = max(p.reorder_threshold, math.ceil(daily_demand * lead_time * 0.5))
                lead_demand = math.ceil(daily_demand * lead_time)
                target_stock = lead_demand + safety_stock
                suggested_qty = max(0, target_stock - p.current_stock)

                # User-friendly status label (no technical jargon)
                if risk_score >= 80.0:
                    friendly_label = "Urgent"
                elif risk_score >= 60.0:
                    friendly_label = "Restock Soon"
                elif risk_score >= 35.0:
                    friendly_label = "Keep an Eye on This"
                else:
                    friendly_label = "Stock Healthy"

                explanation = (
                    f"Stock ({p.current_stock} units) covers ~{stock_cover} days. "
                    f"Supplier delivery takes {lead_time} days. "
                    f"Status: {friendly_label}. "
                    f"Target stock buffer is {target_stock} units (including {safety_stock} safety stock buffer)."
                )

                rule_trace = {
                    "stock_cover_days": stock_cover,
                    "lead_time_days": lead_time,
                    "daily_demand": daily_demand,
                    "risk_score": risk_score,
                    "risk_label": friendly_label,
                    "priority_breakdown": {
                        "risk_component": round(comp_risk, 2),
                        "shortage_gap_component": round(comp_shortage, 2),
                        "demand_velocity_component": round(comp_velocity, 2),
                        "total_priority_score": priority_score,
                    },
                    "rules_fired": [r.model_dump() for r in rules_fired],
                }

                candidates.append({
                    "product": p,
                    "risk_score": risk_score,
                    "risk_label": risk_label,
                    "daily_demand": daily_demand,
                    "stock_cover": stock_cover,
                    "lead_time": lead_time,
                    "safety_stock": safety_stock,
                    "suggested_qty": suggested_qty,
                    "priority_score": priority_score,
                    "explanation": explanation,
                    "rule_trace": rule_trace,
                })

        # Deterministic ranking: Sort by priority_score DESC, then tie-break by SKU ASC
        candidates.sort(key=lambda x: (-x["priority_score"], x["product"].sku))

        # Check existing active recommendations to preserve or update for this business
        existing_recs = db.query(ReorderRecommendation).filter(
            ReorderRecommendation.business_id == bid,
            ReorderRecommendation.status.in_(["PENDING", "REVIEWED"])
        ).all()
        existing_by_pid = {r.product_id: r for r in existing_recs}

        rec_items: List[ReorderRecommendationItem] = []
        total_units = 0
        total_cost = 0.0

        for rank, cand in enumerate(candidates, start=1):
            p = cand["product"]
            total_units += cand["suggested_qty"]
            total_cost += cand["suggested_qty"] * p.unit_cost

            if p.id in existing_by_pid:
                db_rec = existing_by_pid[p.id]
                db_rec.risk_score = cand["risk_score"]
                db_rec.risk_label = cand["risk_label"]
                db_rec.forecast_daily_demand = cand["daily_demand"]
                db_rec.stock_cover_days = cand["stock_cover"]
                db_rec.lead_time_days = cand["lead_time"]
                db_rec.safety_stock_units = cand["safety_stock"]
                db_rec.suggested_quantity = cand["suggested_qty"]
                db_rec.priority_rank = rank
                db_rec.priority_score = cand["priority_score"]
                db_rec.explanation = cand["explanation"]
                db_rec.rule_trace_json = json.dumps(cand["rule_trace"])
            else:
                db_rec = ReorderRecommendation(
                    business_id=bid,
                    product_id=p.id,
                    status="PENDING",
                    risk_score=cand["risk_score"],
                    risk_label=cand["risk_label"],
                    forecast_daily_demand=cand["daily_demand"],
                    stock_cover_days=cand["stock_cover"],
                    lead_time_days=cand["lead_time"],
                    safety_stock_units=cand["safety_stock"],
                    suggested_quantity=cand["suggested_qty"],
                    priority_rank=rank,
                    priority_score=cand["priority_score"],
                    explanation=cand["explanation"],
                    rule_trace_json=json.dumps(cand["rule_trace"]),
                    created_at=datetime.datetime.utcnow(),
                )
                db.add(db_rec)
            
            db.flush()

            rec_items.append(
                ReorderRecommendationItem(
                    id=db_rec.id,
                    product_id=p.id,
                    sku=p.sku,
                    name=p.name,
                    category=p.category,
                    current_stock=p.current_stock,
                    reorder_threshold=p.reorder_threshold,
                    lead_time_days=cand["lead_time"],
                    forecast_daily_demand=cand["daily_demand"],
                    stock_cover_days=cand["stock_cover"],
                    risk_score=cand["risk_score"],
                    risk_label=cand["risk_label"],
                    safety_stock_units=cand["safety_stock"],
                    suggested_quantity=cand["suggested_qty"],
                    priority_rank=rank,
                    priority_score=cand["priority_score"],
                    explanation=cand["explanation"],
                    rule_trace=cand["rule_trace"],
                    status=db_rec.status,
                    created_at=db_rec.created_at,
                    reviewed_at=db_rec.reviewed_at,
                    ordered_at=db_rec.ordered_at,
                    received_at=db_rec.received_at,
                )
            )

        db.commit()

        pending_count = sum(1 for r in rec_items if r.status == "PENDING")

        return ReorderListResponse(
            recommendations=rec_items,
            pending_count=pending_count,
            total_suggested_units=total_units,
            total_estimated_cost=round(total_cost, 2),
        )

    @classmethod
    def update_recommendation_status(
        cls, db: Session, rec_id: int, new_status: str, business_id: Optional[str] = None
    ) -> ReorderRecommendation:
        query = db.query(ReorderRecommendation).filter(ReorderRecommendation.id == rec_id)
        if business_id:
            query = query.filter(ReorderRecommendation.business_id == business_id.lower().strip())
        rec = query.first()
        if not rec:
            raise ValueError(f"Recommendation {rec_id} not found.")

        valid_statuses = {"PENDING", "REVIEWED", "ORDERED", "RECEIVED", "DISMISSED"}
        if new_status.upper() not in valid_statuses:
            raise ValueError(f"Invalid status '{new_status}'. Allowed: {', '.join(valid_statuses)}")

        rec.status = new_status.upper()
        now = datetime.datetime.utcnow()
        if rec.status == "REVIEWED":
            rec.reviewed_at = now
        elif rec.status == "ORDERED":
            rec.ordered_at = now
        elif rec.status == "RECEIVED":
            rec.received_at = now
        
        db.commit()
        db.refresh(rec)
        return rec
