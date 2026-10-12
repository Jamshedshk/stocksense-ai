import datetime
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.product import Product
from app.models.stock_movement import StockMovement
from app.schemas.ai import ClusteringResponse, ClusterSummary, ClusterProductItem

class ProductClusteringEngine:
    @classmethod
    def analyze_clusters(cls, db: Session, n_clusters: int = 3, business_id: str = None) -> ClusteringResponse:
        query = db.query(Product).filter(Product.is_active == True)
        if business_id:
            query = query.filter(Product.business_id == business_id)
        products = query.all()
        if not products:
            return ClusteringResponse(total_products=0, clusters=[], products=[])

        if len(products) < n_clusters:
            n_clusters = max(1, len(products))

        thirty_days_ago = datetime.datetime.utcnow() - datetime.timedelta(days=30)
        
        # Calculate demand metrics per product over past 30 days
        mov_query = db.query(
            StockMovement.product_id,
            func.date(StockMovement.occurred_at).label("sale_date"),
            func.sum(StockMovement.quantity).label("units")
        ).filter(
            StockMovement.movement_type == "SALE",
            StockMovement.occurred_at >= thirty_days_ago
        )
        if business_id:
            mov_query = mov_query.filter(StockMovement.business_id == business_id)
        movements = mov_query.group_by(
            StockMovement.product_id, func.date(StockMovement.occurred_at)
        ).all()

        # Build demand statistics
        sales_by_prod: Dict[int, List[float]] = {p.id: [] for p in products}
        for p_id, _, units in movements:
            if p_id in sales_by_prod:
                sales_by_prod[p_id].append(float(units))

        product_features = []
        for p in products:
            sales_list = sales_by_prod.get(p.id, [])
            total_sold = sum(sales_list)
            demand_rate = round(total_sold / 30.0, 2)
            demand_var = round(float(np.std(sales_list)) if sales_list else 0.0, 2)
            stock_cover = round(p.current_stock / demand_rate, 1) if demand_rate > 0 else (999.0 if p.current_stock > 0 else 0.0)
            # Cap extreme stock cover for cluster stability
            stock_cover_capped = min(stock_cover, 120.0)
            stock_val = round(p.current_stock * p.unit_cost, 2)

            product_features.append({
                "product_id": p.id,
                "sku": p.sku,
                "name": p.name,
                "category": p.category,
                "current_stock": p.current_stock,
                "demand_rate": demand_rate,
                "demand_variability": demand_var,
                "stock_cover_days": stock_cover,
                "stock_cover_capped": stock_cover_capped,
                "stock_value": stock_val,
            })

        df = pd.DataFrame(product_features)
        feature_matrix = df[["demand_rate", "demand_variability", "stock_cover_capped", "stock_value"]].values

        if len(products) <= 2 or n_clusters == 1:
            # Single cluster fallback
            clusters = [
                ClusterSummary(
                    cluster_id=0,
                    name="Standard Catalogue",
                    description="Baseline cluster for inventory catalogue",
                    size=len(products),
                    avg_demand_rate=float(df["demand_rate"].mean()),
                    avg_variability=float(df["demand_variability"].mean()),
                    avg_stock_cover=float(df["stock_cover_days"].mean()),
                    avg_stock_value=float(df["stock_value"].mean()),
                )
            ]
            prod_items = [
                ClusterProductItem(
                    product_id=row["product_id"],
                    sku=row["sku"],
                    name=row["name"],
                    category=row["category"],
                    current_stock=row["current_stock"],
                    demand_rate=row["demand_rate"],
                    demand_variability=row["demand_variability"],
                    stock_cover_days=row["stock_cover_days"],
                    stock_value=row["stock_value"],
                    cluster_id=0,
                    cluster_label="Standard Catalogue",
                )
                for _, row in df.iterrows()
            ]
            return ClusteringResponse(total_products=len(products), clusters=clusters, products=prod_items)

        # Scale features
        scaler = StandardScaler()
        scaled_features = scaler.fit_transform(feature_matrix)

        # Fit KMeans
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        labels = kmeans.fit_predict(scaled_features)
        df["cluster_id"] = labels

        # Label clusters dynamically based on actual centroid characteristics
        cluster_summaries: List[ClusterSummary] = []
        cluster_labels_map: Dict[int, str] = {}

        for cid in range(n_clusters):
            c_df = df[df["cluster_id"] == cid]
            avg_demand = float(c_df["demand_rate"].mean())
            avg_var = float(c_df["demand_variability"].mean())
            avg_cover = float(c_df["stock_cover_days"].mean())
            avg_val = float(c_df["stock_value"].mean())

            # Dynamic interpretation based on measured centroid data
            if avg_demand > df["demand_rate"].median() and avg_cover < 30:
                name = "Fast-Moving & High-Turn"
                desc = "High velocity demand with tighter coverage days. Monitor replenishment closely."
            elif avg_val > df["stock_value"].median() and avg_demand < df["demand_rate"].median():
                name = "High-Value Capital Tied / Slow-Moving"
                desc = "Significant inventory value locked in stock relative to consumption rate."
            elif avg_cover > 45:
                name = "Extended Stock Cover / Overstock Risk"
                desc = "Ample or excess stock buffer. Low near-term stockout risk."
            else:
                name = "Balanced Core Inventory"
                desc = "Moderate daily demand with steady coverage buffer."

            cluster_labels_map[cid] = name
            cluster_summaries.append(
                ClusterSummary(
                    cluster_id=cid,
                    name=name,
                    description=desc,
                    size=len(c_df),
                    avg_demand_rate=round(avg_demand, 2),
                    avg_variability=round(avg_var, 2),
                    avg_stock_cover=round(avg_cover, 1),
                    avg_stock_value=round(avg_val, 2),
                )
            )

        product_items: List[ClusterProductItem] = []
        for _, row in df.iterrows():
            cid = int(row["cluster_id"])
            product_items.append(
                ClusterProductItem(
                    product_id=int(row["product_id"]),
                    sku=row["sku"],
                    name=row["name"],
                    category=row["category"],
                    current_stock=int(row["current_stock"]),
                    demand_rate=row["demand_rate"],
                    demand_variability=row["demand_variability"],
                    stock_cover_days=row["stock_cover_days"],
                    stock_value=row["stock_value"],
                    cluster_id=cid,
                    cluster_label=cluster_labels_map[cid],
                )
            )

        return ClusteringResponse(
            total_products=len(products),
            clusters=cluster_summaries,
            products=product_items,
        )
