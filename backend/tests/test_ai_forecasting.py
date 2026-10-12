import datetime
from app.services.inventory_service import InventoryService
from app.ai.forecasting.engine import DemandForecastingEngine
from app.schemas.product import ProductCreate
from app.schemas.stock_movement import StockMovementCreate, MovementTypeEnum

def test_forecast_insufficient_data(db_session):
    prod = InventoryService.create_product(db_session, ProductCreate(
        sku="SKU-FC-FEW", name="Few Sales", opening_stock=50
    ))
    # Only 2 sales
    now = datetime.datetime.utcnow()
    InventoryService.record_movement(db_session, StockMovementCreate(
        product_id=prod.id, movement_type=MovementTypeEnum.SALE, quantity=1, occurred_at=now - datetime.timedelta(days=2)
    ))
    InventoryService.record_movement(db_session, StockMovementCreate(
        product_id=prod.id, movement_type=MovementTypeEnum.SALE, quantity=1, occurred_at=now - datetime.timedelta(days=1)
    ))

    resp = DemandForecastingEngine.train_and_forecast(db_session, prod.id, horizon_days=7)
    assert resp.status == "INSUFFICIENT_DATA"
    assert resp.metrics is None
    assert "Insufficient historical sales data" in resp.limitations

def test_forecast_sufficient_data_mlp(db_session):
    prod = InventoryService.create_product(db_session, ProductCreate(
        sku="SKU-FC-RICH", name="Rich Sales Item", opening_stock=500
    ))

    # Add 25 days of sales
    start = datetime.datetime.utcnow() - datetime.timedelta(days=30)
    for i in range(25):
        day = start + datetime.timedelta(days=i)
        qty = 2 + (i % 3)  # deterministic pattern
        InventoryService.record_movement(db_session, StockMovementCreate(
            product_id=prod.id,
            movement_type=MovementTypeEnum.SALE,
            quantity=qty,
            occurred_at=day,
        ))

    resp = DemandForecastingEngine.train_and_forecast(db_session, prod.id, horizon_days=7)
    assert resp.status == "COMPLETED"
    assert resp.metrics is not None
    assert "mae" in resp.metrics
    assert "rmse" in resp.metrics
    assert resp.baseline_metrics is not None
    assert len(resp.daily_forecast) == 7
    # Assert all forecast values are >= 0 (no negative demand)
    for pt in resp.daily_forecast:
        assert pt.predicted_units >= 0.0
        assert pt.baseline_units >= 0.0
