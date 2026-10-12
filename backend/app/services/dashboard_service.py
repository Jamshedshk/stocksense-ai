import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.product import Product
from app.models.stock_movement import StockMovement
from app.models.reorder_recommendation import ReorderRecommendation
from app.schemas.dashboard import DashboardKPIs, FastSlowProductItem, MovementSummaryItem, SalesTrendPoint
from app.schemas.stock_movement import MovementTypeEnum

class DashboardService:
    @staticmethod
    def get_dashboard_kpis(
        db: Session,
        business_date: datetime.date = None,
        business_id: str = "freshmart",
        trend_days: int = 30,
    ) -> DashboardKPIs:
        bid = (business_id or "freshmart").lower().strip()
        trend_days = max(7, min(90, trend_days or 30))
        if not business_date:
            business_date = datetime.datetime.utcnow().date()

        # Active products for this business
        active_products = db.query(Product).filter(
            Product.business_id == bid,
            Product.is_active == True
        ).all()
        total_active_products = len(active_products)
        total_units_in_stock = sum(p.current_stock for p in active_products)
        total_inventory_value = sum(p.current_stock * p.unit_cost for p in active_products)

        # Low stock products count
        low_stock_count = sum(1 for p in active_products if p.current_stock <= p.reorder_threshold)

        # High risk products count
        high_risk_count = db.query(ReorderRecommendation).filter(
            ReorderRecommendation.business_id == bid,
            ReorderRecommendation.status.in_(["PENDING", "REVIEWED"]),
            ReorderRecommendation.risk_score >= 60.0,
        ).count()

        # Fallback if no recommendations generated yet
        if high_risk_count == 0:
            high_risk_count = sum(1 for p in active_products if p.current_stock == 0 or p.current_stock < p.reorder_threshold)

        # Today's recorded sales
        start_of_day = datetime.datetime.combine(business_date, datetime.time.min)
        end_of_day = datetime.datetime.combine(business_date, datetime.time.max)

        today_sales = db.query(StockMovement, Product).join(
            Product, StockMovement.product_id == Product.id
        ).filter(
            StockMovement.business_id == bid,
            StockMovement.movement_type == MovementTypeEnum.SALE.value,
            StockMovement.occurred_at >= start_of_day,
            StockMovement.occurred_at <= end_of_day,
        ).all()

        today_sales_units = sum(m.quantity for m, _ in today_sales)
        today_sales_revenue = sum(
            m.quantity * (m.unit_price if m.unit_price is not None else p.selling_price)
            for m, p in today_sales
        )

        # Past 30 days demand per product for fast/slow moving classification
        thirty_days_ago = datetime.datetime.combine(
            business_date - datetime.timedelta(days=29), datetime.time.min
        )
        sales_30d = db.query(
            StockMovement.product_id,
            func.coalesce(func.sum(StockMovement.quantity), 0).label("units_sold")
        ).filter(
            StockMovement.business_id == bid,
            StockMovement.movement_type == MovementTypeEnum.SALE.value,
            StockMovement.occurred_at >= thirty_days_ago
        ).group_by(StockMovement.product_id).all()

        sales_map = {p_id: units for p_id, units in sales_30d}

        product_sales_stats = []
        for p in active_products:
            sold_30d = sales_map.get(p.id, 0)
            daily_rate = round(sold_30d / 30.0, 2)
            cover_days = round(p.current_stock / daily_rate, 1) if daily_rate > 0 else (999.0 if p.current_stock > 0 else 0.0)
            product_sales_stats.append({
                "product_id": p.id,
                "sku": p.sku,
                "name": p.name,
                "category": p.category,
                "units_sold_30d": sold_30d,
                "current_stock": p.current_stock,
                "daily_sales_rate": daily_rate,
                "stock_cover_days": cover_days,
            })

        # Sort for fast and slow moving
        sorted_by_sales = sorted(product_sales_stats, key=lambda x: x["units_sold_30d"], reverse=True)
        fast_moving = [FastSlowProductItem(**item) for item in sorted_by_sales[:5] if item["units_sold_30d"] > 0]
        slow_moving = [FastSlowProductItem(**item) for item in sorted_by_sales[-5:]] if sorted_by_sales else []

        # Recent 10 movements for this business
        recent_mov_rows = db.query(StockMovement, Product).join(
            Product, StockMovement.product_id == Product.id
        ).filter(
            StockMovement.business_id == bid
        ).order_by(StockMovement.occurred_at.desc()).limit(10).all()

        recent_movements = [
            MovementSummaryItem(
                id=m.id,
                product_id=p.id,
                product_sku=p.sku,
                product_name=p.name,
                movement_type=m.movement_type,
                quantity=m.quantity,
                stock_delta=m.stock_delta,
                occurred_at=m.occurred_at.strftime("%Y-%m-%d %H:%M"),
                reference=m.reference,
            )
            for m, p in recent_mov_rows
        ]

        # Daily sales trend for this business across trend_days
        trend_start_dt = datetime.datetime.combine(
            business_date - datetime.timedelta(days=trend_days - 1), datetime.time.min
        )
        daily_sales_rows = db.query(
            func.date(StockMovement.occurred_at).label("sale_date"),
            func.coalesce(func.sum(StockMovement.quantity), 0).label("units"),
            func.coalesce(
                func.sum(StockMovement.quantity * func.coalesce(StockMovement.unit_price, Product.selling_price)), 0.0
            ).label("revenue")
        ).join(
            Product, StockMovement.product_id == Product.id
        ).filter(
            StockMovement.business_id == bid,
            StockMovement.movement_type == MovementTypeEnum.SALE.value,
            StockMovement.occurred_at >= trend_start_dt
        ).group_by(func.date(StockMovement.occurred_at)).order_by(func.date(StockMovement.occurred_at).asc()).all()

        sales_by_date = {
            str(r.sale_date): (int(r.units), round(float(r.revenue), 2))
            for r in daily_sales_rows
        }

        # Continuous sequence ending on business_date, with zero sales for inactive days
        sales_trend_30d = []
        for offset in range(trend_days - 1, -1, -1):
            d_str = (business_date - datetime.timedelta(days=offset)).strftime("%Y-%m-%d")
            units, rev = sales_by_date.get(d_str, (0, 0.0))
            sales_trend_30d.append(
                SalesTrendPoint(
                    date=d_str,
                    units_sold=units,
                    revenue=rev
                )
            )

        return DashboardKPIs(
            total_active_products=total_active_products,
            total_units_in_stock=total_units_in_stock,
            total_inventory_value=round(total_inventory_value, 2),
            today_sales_units=today_sales_units,
            today_sales_revenue=round(today_sales_revenue, 2),
            low_stock_count=low_stock_count,
            high_risk_count=high_risk_count,
            fast_moving_products=fast_moving,
            slow_moving_products=slow_moving,
            recent_movements=recent_movements,
            sales_trend_30d=sales_trend_30d,
        )
