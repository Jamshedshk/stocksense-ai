import json
import datetime
import numpy as np
import pandas as pd
from typing import Dict, Any, Optional, Tuple, List
from sklearn.neural_network import MLPRegressor
from sklearn.metrics import mean_absolute_error, root_mean_squared_error
from sklearn.preprocessing import StandardScaler
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.product import Product
from app.models.stock_movement import StockMovement
from app.models.forecast_run import ForecastRun
from app.schemas.forecast import ForecastResponse, ForecastPoint

class DemandForecastingEngine:
    MIN_HISTORICAL_DAYS = 14

    @staticmethod
    def get_daily_sales_series(db: Session, product_id: int) -> pd.DataFrame:
        """Extracts and aggregates daily historical sales into a continuous date-indexed DataFrame."""
        movements = db.query(
            func.date(StockMovement.occurred_at).label("sale_date"),
            func.sum(StockMovement.quantity).label("units")
        ).filter(
            StockMovement.product_id == product_id,
            StockMovement.movement_type == "SALE"
        ).group_by(
            func.date(StockMovement.occurred_at)
        ).order_by(
            func.date(StockMovement.occurred_at).asc()
        ).all()

        if not movements:
            return pd.DataFrame(columns=["sale_date", "units"])

        df = pd.DataFrame(movements, columns=["sale_date", "units"])
        df["sale_date"] = pd.to_datetime(df["sale_date"])
        df["units"] = df["units"].astype(float)
        
        # Set continuous date index, filling zero sales days
        df = df.set_index("sale_date").asfreq("D", fill_value=0.0).reset_index()
        return df

    @staticmethod
    def create_features(df: pd.DataFrame) -> pd.DataFrame:
        """Engineers time and lag features without lookahead leakage."""
        df = df.copy()
        df["day_of_week"] = df["sale_date"].dt.dayofweek
        df["day_of_month"] = df["sale_date"].dt.day
        df["is_weekend"] = df["day_of_week"].isin([5, 6]).astype(int)

        # Lag features
        df["lag_1"] = df["units"].shift(1)
        df["lag_7"] = df["units"].shift(7)
        
        # Rolling features (shifted by 1 to prevent data leakage)
        df["rolling_mean_7"] = df["units"].shift(1).rolling(window=7, min_periods=1).mean()
        df["rolling_std_7"] = df["units"].shift(1).rolling(window=7, min_periods=1).std().fillna(0.0)

        return df

    @classmethod
    def train_and_forecast(
        cls, db: Session, product_id: int, horizon_days: int = 7, business_id: Optional[str] = None
    ) -> ForecastResponse:
        query = db.query(Product).filter(Product.id == product_id)
        if business_id:
            query = query.filter(Product.business_id == business_id)
        product = query.first()
        if not product:
            raise ValueError(f"Product {product_id} not found.")

        df = cls.get_daily_sales_series(db, product_id)
        
        # Check sufficient data
        non_zero_days = (df["units"] > 0).sum() if not df.empty else 0
        total_days = len(df)

        if total_days < cls.MIN_HISTORICAL_DAYS or non_zero_days < 5:
            # Handle insufficient data honestly as required by acceptance criteria
            reason = (
                f"Insufficient historical sales data. Only {total_days} total trading days and {non_zero_days} active sales days recorded. "
                f"At least {cls.MIN_HISTORICAL_DAYS} continuous days are required to reliably train the neural demand model without overfitting."
            )
            run = ForecastRun(
                business_id=product.business_id,
                product_id=product.id,
                model_name="MLPRegressor",
                model_version="1.0",
                horizon_days=horizon_days,
                training_rows=total_days,
                predicted_total_units=0.0,
                status="INSUFFICIENT_DATA",
                limitations=reason,
                created_at=datetime.datetime.utcnow(),
            )
            db.add(run)
            db.commit()

            return ForecastResponse(
                product_id=product.id,
                sku=product.sku,
                product_name=product.name,
                model_name="MLPRegressor",
                model_version="1.0",
                horizon_days=horizon_days,
                training_rows=total_days,
                predicted_total_units=0.0,
                metrics=None,
                baseline_metrics=None,
                daily_forecast=[],
                status="INSUFFICIENT_DATA",
                limitations=reason,
            )

        # Feature engineering
        feat_df = cls.create_features(df).dropna()
        feature_cols = ["day_of_week", "day_of_month", "is_weekend", "lag_1", "lag_7", "rolling_mean_7", "rolling_std_7"]
        
        X = feat_df[feature_cols].values
        y = feat_df["units"].values

        # Chronological train/test split: strictly chronological, no random shuffle
        test_size = min(max(3, int(len(X) * 0.2)), 14)
        X_train, X_test = X[:-test_size], X[-test_size:]
        y_train, y_test = y[:-test_size], y[-test_size:]

        # Baseline: trailing 7-day average from lag features
        y_baseline_pred = X_test[:, feature_cols.index("rolling_mean_7")]

        # Scale features using training statistics only (avoids leakage)
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)

        # Train Multi-Layer Perceptron (MLP)
        model = MLPRegressor(
            hidden_layer_sizes=(32, 16),
            activation="relu",
            solver="adam",
            max_iter=200,
            tol=1e-3,
            random_state=42,
            early_stopping=True,
            n_iter_no_change=5,
        )
        model.fit(X_train_scaled, y_train)

        # Evaluate on held-out test data
        y_test_pred = np.maximum(0.0, model.predict(X_test_scaled))
        
        mae = float(mean_absolute_error(y_test, y_test_pred))
        rmse = float(root_mean_squared_error(y_test, y_test_pred))
        baseline_mae = float(mean_absolute_error(y_test, y_baseline_pred))
        baseline_rmse = float(root_mean_squared_error(y_test, y_baseline_pred))

        metrics = {
            "mae": round(mae, 2),
            "rmse": round(rmse, 2),
            "test_days": test_size,
        }
        baseline_metrics = {
            "baseline_mae": round(baseline_mae, 2),
            "baseline_rmse": round(baseline_rmse, 2),
            "baseline_method": "7-day Trailing Mean",
        }

        # Multi-step autoregressive rollout for forecast horizon
        last_date = df["sale_date"].max()
        history_units = list(df["units"].values)
        daily_forecast_points: List[ForecastPoint] = []
        total_predicted = 0.0

        for step in range(1, horizon_days + 1):
            future_date = last_date + datetime.timedelta(days=step)
            dow = future_date.weekday()
            dom = future_date.day
            weekend = 1 if dow in [5, 6] else 0

            l1 = history_units[-1] if len(history_units) >= 1 else 0.0
            l7 = history_units[-7] if len(history_units) >= 7 else l1
            rm7 = np.mean(history_units[-7:]) if len(history_units) >= 7 else l1
            rstd7 = np.std(history_units[-7:]) if len(history_units) >= 7 else 0.0

            feat_vector = np.array([[dow, dom, weekend, l1, l7, rm7, rstd7]])
            feat_vector_scaled = scaler.transform(feat_vector)

            pred_unit = float(np.maximum(0.0, model.predict(feat_vector_scaled)[0]))
            base_unit = float(max(0.0, rm7))

            # Store point
            daily_forecast_points.append(
                ForecastPoint(
                    date=future_date.strftime("%Y-%m-%d"),
                    predicted_units=round(pred_unit, 1),
                    baseline_units=round(base_unit, 1),
                )
            )
            total_predicted += pred_unit
            history_units.append(pred_unit)

        total_predicted = round(total_predicted, 1)

        limitations = (
            f"Forecast generated using scikit-learn MLPRegressor over {len(df)} daily records. "
            f"Chronological test holdout: {test_size} days. "
            "Exogenous variables (weather, external promo) are excluded. Predictions clamped at >= 0."
        )

        # Save ForecastRun in database
        run = ForecastRun(
            business_id=product.business_id,
            product_id=product.id,
            model_name="MLPRegressor",
            model_version="1.0",
            horizon_days=horizon_days,
            training_start=df["sale_date"].min().to_pydatetime(),
            training_end=df["sale_date"].max().to_pydatetime(),
            training_rows=len(df),
            predicted_total_units=total_predicted,
            metrics_json=json.dumps(metrics),
            baseline_metrics_json=json.dumps(baseline_metrics),
            daily_forecast_json=json.dumps([p.model_dump() for p in daily_forecast_points]),
            status="COMPLETED",
            limitations=limitations,
            created_at=datetime.datetime.utcnow(),
        )
        db.add(run)
        db.commit()

        return ForecastResponse(
            product_id=product.id,
            sku=product.sku,
            product_name=product.name,
            model_name="MLPRegressor",
            model_version="1.0",
            horizon_days=horizon_days,
            training_start=df["sale_date"].min().strftime("%Y-%m-%d"),
            training_end=df["sale_date"].max().strftime("%Y-%m-%d"),
            training_rows=len(df),
            predicted_total_units=total_predicted,
            metrics=metrics,
            baseline_metrics=baseline_metrics,
            daily_forecast=daily_forecast_points,
            status="COMPLETED",
            limitations=limitations,
        )
