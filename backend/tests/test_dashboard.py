import datetime
from app.services.inventory_service import InventoryService
from app.services.dashboard_service import DashboardService
from app.schemas.product import ProductCreate
from app.schemas.stock_movement import StockMovementCreate, MovementTypeEnum

def test_dashboard_kpis_calculation(db_session):
    # Create products
    p1 = InventoryService.create_product(db_session, ProductCreate(
        sku="SKU-D1", name="Product D1", category="Cat A", opening_stock=10, unit_cost=20.0, selling_price=35.0, reorder_threshold=5
    ))
    p2 = InventoryService.create_product(db_session, ProductCreate(
        sku="SKU-D2", name="Product D2", category="Cat B", opening_stock=3, unit_cost=50.0, selling_price=90.0, reorder_threshold=5
    ))

    # Record sale today for p1
    today = datetime.datetime.utcnow()
    InventoryService.record_movement(db_session, StockMovementCreate(
        product_id=p1.id,
        movement_type=MovementTypeEnum.SALE,
        quantity=2,
        occurred_at=today,
    ))

    kpis = DashboardService.get_dashboard_kpis(db_session, business_date=today.date())

    assert kpis.total_active_products == 2
    # p1 has 8, p2 has 3 -> total 11
    assert kpis.total_units_in_stock == 11
    # 8*20 + 3*50 = 160 + 150 = 310
    assert kpis.total_inventory_value == 310.0
    assert kpis.today_sales_units == 2
    assert kpis.today_sales_revenue == 70.0  # 2 * 35.0
    assert kpis.low_stock_count == 1  # p2 has 3 <= threshold 5
    assert len(kpis.recent_movements) >= 1
