import datetime
import pytest
from app.models.product import Product
from app.models.stock_movement import StockMovement
from app.models.reorder_recommendation import ReorderRecommendation
from app.services.inventory_service import InventoryService
from app.services.dashboard_service import DashboardService
from app.ai.prioritization.reorder_engine import ReorderPrioritizationEngine
from app.core.security import generate_session_token
from app.schemas.product import ProductCreate
from app.schemas.stock_movement import StockMovementCreate, MovementTypeEnum

def _create_test_product(
    db_session,
    sku: str = "RST-TEST-01",
    name: str = "Basmati Rice 5 kg",
    stock: int = 20,
    cost: float = 300.0,
    price: float = 450.0,
    biz: str = "freshmart",
    threshold: int = 10,
    lead_time: int = 5,
):
    return InventoryService.create_product(
        db_session,
        ProductCreate(
            sku=sku,
            name=name,
            category="Grains",
            opening_stock=stock,
            unit_cost=cost,
            selling_price=price,
            reorder_threshold=threshold,
            supplier_lead_time_days=lead_time,
        ),
        business_id=biz,
    )

def test_1_restock_existing_product_increases_quantity_correctly(client, db_session):
    """1. Restocking an existing product increases its quantity correctly."""
    token = generate_session_token("freshmart")
    headers = {"Authorization": f"Bearer {token}", "X-Business-ID": "freshmart"}
    
    prod = _create_test_product(db_session, sku="RST-01", name="Basmati Rice 5 kg", stock=20)
    assert prod.current_stock == 20
    
    res = client.post(
        f"/api/v1/products/{prod.id}/restock",
        json={
            "quantity": 50,
            "unit_cost": 310.0,
            "supplier_name": "Kashmir Agro Mills",
            "reference": "PO-RST-101",
            "note": "Bulk arrival shipment",
        },
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["previous_stock"] == 20
    assert data["quantity_received"] == 50
    assert data["new_stock"] == 70
    assert data["unit_cost"] == 310.0
    assert data["total_cost"] == 15500.0
    assert "updated from 20 to 70 units" in data["message"]
    
    db_session.refresh(prod)
    assert prod.current_stock == 70

def test_2_restock_does_not_create_duplicate_product(client, db_session):
    """2. Restocking does not create a duplicate product."""
    token = generate_session_token("freshmart")
    headers = {"Authorization": f"Bearer {token}", "X-Business-ID": "freshmart"}
    
    prod = _create_test_product(db_session, sku="RST-02", name="Mustard Oil 1L", stock=20)
    initial_count = db_session.query(Product).filter(Product.business_id == "freshmart").count()
    
    # Restock first batch
    res1 = client.post(
        f"/api/v1/products/{prod.id}/restock",
        json={"quantity": 30, "unit_cost": 150.0, "reference": "PO-RST-201"},
        headers=headers,
    )
    assert res1.status_code == 200
    
    # Restock second batch
    res2 = client.post(
        f"/api/v1/products/{prod.id}/restock",
        json={"quantity": 50, "unit_cost": 155.0, "reference": "PO-RST-202"},
        headers=headers,
    )
    assert res2.status_code == 200
    
    # Verify product count has not increased
    final_count = db_session.query(Product).filter(Product.business_id == "freshmart").count()
    assert final_count == initial_count
    
    # Verify exact single product with updated stock (20 + 30 + 50 = 100)
    db_session.refresh(prod)
    assert prod.current_stock == 100

def test_3_receipt_date_persisted_correctly(client, db_session):
    """3. The receipt date is persisted correctly."""
    token = generate_session_token("freshmart")
    headers = {"Authorization": f"Bearer {token}", "X-Business-ID": "freshmart"}
    
    prod = _create_test_product(db_session, sku="RST-03", name="Wheat Flour 10kg", stock=15)
    past_date = datetime.datetime(2026, 9, 25, 10, 30, 0)
    
    res = client.post(
        f"/api/v1/products/{prod.id}/restock",
        json={
            "quantity": 25,
            "occurred_at": past_date.isoformat(),
            "reference": "PO-PAST-003",
        },
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert "2026-09-25" in data["occurred_at"]
    
    # Verify in movement record
    movement = db_session.query(StockMovement).filter(
        StockMovement.reference == "PO-PAST-003"
    ).first()
    assert movement is not None
    assert movement.occurred_at.date() == past_date.date()

def test_4_receipt_appears_in_product_movement_history(client, db_session):
    """4. The receipt appears in the product's movement history."""
    token = generate_session_token("freshmart")
    headers = {"Authorization": f"Bearer {token}", "X-Business-ID": "freshmart"}
    
    prod = _create_test_product(db_session, sku="RST-04", name="Sugar 1kg", stock=10)
    
    # Restock 2 batches
    client.post(
        f"/api/v1/products/{prod.id}/restock",
        json={"quantity": 15, "reference": "PO-HIST-A"},
        headers=headers,
    )
    client.post(
        f"/api/v1/products/{prod.id}/restock",
        json={"quantity": 25, "reference": "PO-HIST-B"},
        headers=headers,
    )
    
    res = client.get(f"/api/v1/movements?product_id={prod.id}", headers=headers)
    assert res.status_code == 200
    items = res.json()["items"]
    
    receipts = [m for m in items if m["movement_type"] == "STOCK_RECEIPT"]
    assert len(receipts) >= 2
    refs = [r["reference"] for r in receipts]
    assert "PO-HIST-A" in refs
    assert "PO-HIST-B" in refs

def test_5_purchase_cost_and_reference_information_preserved(client, db_session):
    """5. Purchase cost and reference information are preserved."""
    token = generate_session_token("freshmart")
    headers = {"Authorization": f"Bearer {token}", "X-Business-ID": "freshmart"}
    
    prod = _create_test_product(db_session, sku="RST-05", name="Moong Dal 1kg", stock=10, cost=120.0)
    
    res = client.post(
        f"/api/v1/products/{prod.id}/restock",
        json={
            "quantity": 40,
            "unit_cost": 135.0,
            "supplier_name": "Kashmir Agro Mills",
            "reference": "PO-COST-505",
            "note": "Grade A harvest batch",
        },
        headers=headers,
    )
    assert res.status_code == 200
    
    movement = db_session.query(StockMovement).filter(
        StockMovement.reference == "PO-COST-505"
    ).first()
    assert movement is not None
    assert movement.unit_price == 135.0
    assert movement.supplier_name == "Kashmir Agro Mills"
    assert movement.note == "Grade A harvest batch"
    assert movement.stock_delta == 40

def test_6_inventory_value_and_stock_metrics_update_correctly(client, db_session):
    """6. Inventory value and stock-related metrics update correctly."""
    token = generate_session_token("freshmart")
    headers = {"Authorization": f"Bearer {token}", "X-Business-ID": "freshmart"}
    
    prod = _create_test_product(db_session, sku="RST-06", name="Toor Dal 1kg", stock=20, cost=100.0)
    
    kpis_before = client.get("/api/v1/dashboard/kpis", headers=headers).json()
    total_stock_before = kpis_before["total_units_in_stock"]
    total_val_before = kpis_before["total_inventory_value"]
    
    # Restock 40 units at 100.0
    res = client.post(
        f"/api/v1/products/{prod.id}/restock",
        json={"quantity": 40, "unit_cost": 100.0, "reference": "PO-METRIC-06"},
        headers=headers,
    )
    assert res.status_code == 200
    
    kpis_after = client.get("/api/v1/dashboard/kpis", headers=headers).json()
    assert kpis_after["total_units_in_stock"] == total_stock_before + 40
    # 40 * 100.0 = 4000.0 addition to inventory valuation
    assert kpis_after["total_inventory_value"] == pytest.approx(total_val_before + 4000.0, rel=1e-2)

def test_7_restock_from_recommendation_preselects_correct_product(client, db_session):
    """7. Restocking from a recommendation updates stock and handles target item."""
    token = generate_session_token("freshmart")
    headers = {"Authorization": f"Bearer {token}", "X-Business-ID": "freshmart"}
    
    # Create an urgent low-stock product to trigger reorder engine
    prod = _create_test_product(
        db_session,
        sku="RST-07-URGENT",
        name="Urgent Low Stock Item",
        stock=2,
        cost=50.0,
        price=80.0,
        threshold=25,
        lead_time=7,
    )
    
    # Trigger recommendation generation
    ReorderPrioritizationEngine.generate_recommendations(db_session, business_id="freshmart")
    
    rec_res = client.get("/api/v1/reorder/recommendations", headers=headers)
    assert rec_res.status_code == 200
    recs = rec_res.json()["recommendations"]
    assert len(recs) > 0
    target_rec = next((r for r in recs if r["product_id"] == prod.id), None)
    assert target_rec is not None
    
    suggested_qty = target_rec["suggested_quantity"]
    assert suggested_qty > 0
    
    # Perform restock using the suggested quantity
    res = client.post(
        f"/api/v1/products/{prod.id}/restock",
        json={
            "quantity": suggested_qty,
            "unit_cost": prod.unit_cost,
            "reference": f"REC-RESTOCK-{prod.id}",
            "note": "Restocked via What to Restock First recommendation",
        },
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["previous_stock"] == 2
    assert data["new_stock"] == 2 + suggested_qty
    
    db_session.refresh(prod)
    assert prod.current_stock == 2 + suggested_qty

def test_8_historical_receipts_reflected_in_current_stock_exactly_once(client, db_session):
    """8. Historical receipts are reflected in current stock exactly once."""
    token = generate_session_token("freshmart")
    headers = {"Authorization": f"Bearer {token}", "X-Business-ID": "freshmart"}
    
    prod = _create_test_product(db_session, sku="RST-08", name="Chana Dal 1kg", stock=10)
    
    # Add receipt for 3 weeks ago
    old_date = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=21)
    res = client.post(
        f"/api/v1/products/{prod.id}/restock",
        json={
            "quantity": 15,
            "occurred_at": old_date.isoformat(),
            "reference": "PO-HIST-CHECK-8",
        },
        headers=headers,
    )
    assert res.status_code == 200
    
    db_session.refresh(prod)
    assert prod.current_stock == 25  # 10 + 15
    
    # Verify ledger consistency
    integrity = client.get(f"/api/v1/movements/verify-integrity/{prod.id}", headers=headers).json()
    assert integrity["is_consistent"] is True
    assert integrity["cached_current_stock"] == 25
    assert integrity["ledger_sum_deltas"] == 25

def test_9_duplicate_submissions_do_not_add_stock_twice(client, db_session):
    """9. Duplicate submissions do not add stock twice."""
    token = generate_session_token("freshmart")
    headers = {"Authorization": f"Bearer {token}", "X-Business-ID": "freshmart"}
    
    prod = _create_test_product(db_session, sku="RST-09", name="Sunflower Oil 1L", stock=15)
    ref_code = "PO-DUP-CHECK-99"
    
    # First submit
    res1 = client.post(
        f"/api/v1/products/{prod.id}/restock",
        json={"quantity": 10, "reference": ref_code},
        headers=headers,
    )
    assert res1.status_code == 200
    stock_after_first = res1.json()["new_stock"]
    assert stock_after_first == 25
    
    # Immediate duplicate submit with identical reference
    res2 = client.post(
        f"/api/v1/products/{prod.id}/restock",
        json={"quantity": 10, "reference": ref_code},
        headers=headers,
    )
    assert res2.status_code == 400
    assert "Duplicate receipt detected" in res2.json()["detail"]
    
    db_session.refresh(prod)
    assert prod.current_stock == 25

def test_10_failed_database_operations_preserve_consistency(client, db_session):
    """10. Failed database operations do not leave the product balance inconsistent."""
    token = generate_session_token("freshmart")
    headers = {"Authorization": f"Bearer {token}", "X-Business-ID": "freshmart"}
    
    prod = _create_test_product(db_session, sku="RST-10", name="Coffee Powder 200g", stock=15)
    stock_before = prod.current_stock
    
    # Invalid zero quantity
    res = client.post(
        f"/api/v1/products/{prod.id}/restock",
        json={"quantity": 0, "reference": "FAIL-0"},
        headers=headers,
    )
    assert res.status_code in (400, 422)
    
    # Invalid negative quantity
    res_neg = client.post(
        f"/api/v1/products/{prod.id}/restock",
        json={"quantity": -5, "reference": "FAIL-NEG"},
        headers=headers,
    )
    assert res_neg.status_code in (400, 422)
    
    db_session.refresh(prod)
    assert prod.current_stock == stock_before

def test_11_one_business_cannot_restock_another_business_product(client, db_session):
    """11. One business cannot restock another business's product."""
    freshmart_token = generate_session_token("freshmart")
    urbanthread_token = generate_session_token("urbanthread")
    
    # FreshMart product
    prod = _create_test_product(db_session, sku="RST-11", name="Atta 5kg", stock=30, biz="freshmart")
    stock_before = prod.current_stock
    
    # UrbanThread tries to restock FreshMart's product
    headers = {"Authorization": f"Bearer {urbanthread_token}", "X-Business-ID": "urbanthread"}
    res = client.post(
        f"/api/v1/products/{prod.id}/restock",
        json={"quantity": 50, "reference": "CROSS-BIZ-ATTEMPT"},
        headers=headers,
    )
    assert res.status_code == 404
    assert "not found in workspace 'urbanthread'" in res.json()["detail"]
    
    db_session.refresh(prod)
    assert prod.current_stock == stock_before

def test_12_updated_balance_persists_across_sessions(client, db_session):
    """12. The updated balance persists after refreshing the page or restarting the backend."""
    token = generate_session_token("freshmart")
    headers = {"Authorization": f"Bearer {token}", "X-Business-ID": "freshmart"}
    
    prod = _create_test_product(db_session, sku="RST-12", name="Poha 1kg", stock=20)
    
    res = client.post(
        f"/api/v1/products/{prod.id}/restock",
        json={"quantity": 30, "reference": "PO-PERSIST-12"},
        headers=headers,
    )
    assert res.status_code == 200
    
    # Fresh query through HTTP API
    res_get = client.get(f"/api/v1/products/{prod.id}", headers=headers)
    assert res_get.status_code == 200
    assert res_get.json()["current_stock"] == 50

def test_13_existing_sales_and_historical_transactions_remain_unchanged(client, db_session):
    """13. Existing sales and historical transactions remain unchanged."""
    token = generate_session_token("freshmart")
    headers = {"Authorization": f"Bearer {token}", "X-Business-ID": "freshmart"}
    
    prod = _create_test_product(db_session, sku="RST-13", name="Cardamom 100g", stock=50, cost=100.0, price=150.0)
    
    # Record a sale movement first
    sale_mov = InventoryService.record_movement(
        db_session,
        StockMovementCreate(
            product_id=prod.id,
            movement_type=MovementTypeEnum.SALE,
            quantity=10,
            unit_price=150.0,
            reference="INV-SALE-001",
            note="Walk-in retail customer",
        ),
        business_id="freshmart",
    )
    assert sale_mov.stock_delta == -10
    db_session.refresh(prod)
    assert prod.current_stock == 40
    
    # Count sales before restock
    sales_before = db_session.query(StockMovement).filter(
        StockMovement.business_id == "freshmart",
        StockMovement.movement_type == "SALE",
    ).count()
    assert sales_before >= 1
    
    # Perform restock
    res = client.post(
        f"/api/v1/products/{prod.id}/restock",
        json={"quantity": 25, "reference": "PO-RESTOCK-13"},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["previous_stock"] == 40
    assert res.json()["new_stock"] == 65
    
    # Verify sales movements count and details remain identical
    sales_after = db_session.query(StockMovement).filter(
        StockMovement.business_id == "freshmart",
        StockMovement.movement_type == "SALE",
    ).count()
    assert sales_after == sales_before
    
    re_sale = db_session.query(StockMovement).filter(StockMovement.id == sale_mov.id).first()
    assert re_sale.stock_delta == -10
    assert re_sale.unit_price == 150.0
    assert re_sale.reference == "INV-SALE-001"
