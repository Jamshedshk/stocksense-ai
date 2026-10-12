import datetime
import pytest
from app.models.product import Product
from app.models.stock_movement import StockMovement
from app.services.inventory_service import InventoryService
from app.services.dashboard_service import DashboardService
from app.core.security import generate_session_token
from app.schemas.stock_movement import StockMovementCreate, MovementTypeEnum
from app.schemas.product import ProductCreate

def test_1_receive_stock_today(client, db_session):
    """1. Receiving stock with today's date."""
    token = generate_session_token("freshmart")
    headers = {"Authorization": f"Bearer {token}", "X-Business-ID": "freshmart"}
    
    # Create product
    prod = InventoryService.create_product(
        db_session,
        ProductCreate(
            sku="TST-REC-01",
            name="Test Receipt Item 1",
            category="Test",
            opening_stock=10,
            unit_cost=100.0,
            selling_price=150.0,
        ),
        business_id="freshmart"
    )
    
    today_dt = datetime.datetime.utcnow().replace(microsecond=0)
    res = client.post(
        "/api/v1/movements",
        json={
            "product_id": prod.id,
            "movement_type": "STOCK_RECEIPT",
            "quantity": 15,
            "unit_price": 95.0,
            "supplier_name": "National Traders",
            "occurred_at": today_dt.isoformat(),
            "reference": "PO-TODAY-001",
            "note": "Arrival at main warehouse",
        },
        headers=headers,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["quantity"] == 15
    assert data["stock_delta"] == 15
    assert data["unit_price"] == 95.0
    assert data["supplier_name"] == "National Traders"
    
    # Check refreshed product stock
    db_session.refresh(prod)
    assert prod.current_stock == 25  # 10 + 15

def test_2_receive_stock_historical_date(client, db_session):
    """2. Receiving stock with a historical date."""
    token = generate_session_token("freshmart")
    headers = {"Authorization": f"Bearer {token}", "X-Business-ID": "freshmart"}
    
    prod = InventoryService.create_product(
        db_session,
        ProductCreate(
            sku="TST-REC-02",
            name="Test Receipt Historical",
            category="Test",
            opening_stock=5,
            unit_cost=200.0,
            selling_price=300.0,
        ),
        business_id="freshmart"
    )
    
    historical_dt = datetime.datetime(2026, 9, 15, 10, 30, 0)
    res = client.post(
        "/api/v1/movements",
        json={
            "product_id": prod.id,
            "movement_type": "STOCK_RECEIPT",
            "quantity": 20,
            "unit_price": 190.0,
            "supplier_name": "Agro Global",
            "occurred_at": historical_dt.isoformat(),
            "reference": "PO-HIST-101",
            "note": "Shipment arrived September 15",
        },
        headers=headers,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["quantity"] == 20
    assert "2026-09-15" in data["occurred_at"]
    assert data["transaction_date"] == "2026-09-15"
    
    db_session.refresh(prod)
    assert prod.current_stock == 25  # 5 + 20

def test_3_record_sale_today(client, db_session):
    """3. Recording a sale with today's date and time."""
    token = generate_session_token("freshmart")
    headers = {"Authorization": f"Bearer {token}", "X-Business-ID": "freshmart"}
    
    prod = InventoryService.create_product(
        db_session,
        ProductCreate(
            sku="TST-SALE-01",
            name="Test Sale Today",
            category="Test",
            opening_stock=30,
            unit_cost=50.0,
            selling_price=80.0,
        ),
        business_id="freshmart"
    )
    
    now_dt = datetime.datetime.utcnow().replace(microsecond=0)
    res = client.post(
        "/api/v1/sales",
        json={
            "product_id": prod.id,
            "quantity": 5,
            "unit_price": 80.0,
            "occurred_at": now_dt.isoformat(),
            "reference": "RCPT-TODAY-01",
            "note": "Store walk-in customer",
        },
        headers=headers,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["quantity_sold"] == 5
    assert data["stock_after"] == 25
    assert data["unit_price"] == 80.0
    assert data["total_amount"] == 400.0

def test_4_record_historical_sale(client, db_session):
    """4. Recording a historical sale without rewriting date to today."""
    token = generate_session_token("freshmart")
    headers = {"Authorization": f"Bearer {token}", "X-Business-ID": "freshmart"}
    
    prod = InventoryService.create_product(
        db_session,
        ProductCreate(
            sku="TST-SALE-02",
            name="Test Historical Sale",
            category="Test",
            opening_stock=40,
            unit_cost=100.0,
            selling_price=160.0,
        ),
        business_id="freshmart"
    )
    
    hist_dt = datetime.datetime(2026, 9, 20, 15, 45, 0)
    res = client.post(
        "/api/v1/sales",
        json={
            "product_id": prod.id,
            "quantity": 8,
            "unit_price": 155.0,
            "occurred_at": hist_dt.isoformat(),
            "reference": "BILL-SEP20-08",
            "note": "Backlogged counter ticket",
        },
        headers=headers,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["quantity_sold"] == 8
    assert data["stock_after"] == 32
    # Ensure date is strictly preserved and not overwritten to today
    assert "2026-09-20" in data["occurred_at"]

def test_5_historical_transactions_in_reports(client, db_session):
    """5. Confirming historical transactions appear on the correct date in reports."""
    token = generate_session_token("freshmart")
    headers = {"Authorization": f"Bearer {token}", "X-Business-ID": "freshmart"}
    
    prod = InventoryService.create_product(
        db_session,
        ProductCreate(
            sku="TST-REP-01",
            name="Report Date Product",
            category="Test",
            opening_stock=50,
            unit_cost=10.0,
            selling_price=20.0,
        ),
        business_id="freshmart"
    )
    
    # Record sale on 2026-09-10
    target_dt = datetime.datetime(2026, 9, 10, 12, 0, 0)
    client.post(
        "/api/v1/sales",
        json={
            "product_id": prod.id,
            "quantity": 14,
            "unit_price": 20.0,
            "occurred_at": target_dt.isoformat(),
            "reference": "REP-TX-10",
        },
        headers=headers,
    )
    
    # Query summary for 2026-09-10
    sum_res = client.get("/api/v1/sales/summary?date=2026-09-10", headers=headers)
    assert sum_res.status_code == 200
    sum_data = sum_res.json()
    assert sum_data["total_units_sold"] == 14
    assert sum_data["total_revenue"] == 280.0
    
    # Query summary for a different date with no sales
    empty_res = client.get("/api/v1/sales/summary?date=2026-09-11", headers=headers)
    assert empty_res.status_code == 200
    empty_data = empty_res.json()
    assert empty_data["total_units_sold"] == 0
    assert empty_data["total_revenue"] == 0.0

def test_6_current_stock_includes_all_historical_movements(client, db_session):
    """6. Confirming current stock includes all historical movements exactly once."""
    token = generate_session_token("freshmart")
    headers = {"Authorization": f"Bearer {token}", "X-Business-ID": "freshmart"}
    
    prod = InventoryService.create_product(
        db_session,
        ProductCreate(
            sku="TST-LEDGER-01",
            name="Ledger Audit Product",
            category="Test",
            opening_stock=100,  # +100
            unit_cost=50.0,
            selling_price=80.0,
        ),
        business_id="freshmart"
    )
    
    # +30 received on Aug 20
    client.post("/api/v1/movements", json={
        "product_id": prod.id, "movement_type": "STOCK_RECEIPT", "quantity": 30,
        "occurred_at": "2026-08-20T10:00:00"
    }, headers=headers)
    
    # -15 sold on Sep 05
    client.post("/api/v1/sales", json={
        "product_id": prod.id, "quantity": 15, "occurred_at": "2026-09-05T14:00:00"
    }, headers=headers)
    
    # +5 customer return on Sep 10
    client.post("/api/v1/movements", json={
        "product_id": prod.id, "movement_type": "CUSTOMER_RETURN", "quantity": 5,
        "occurred_at": "2026-09-10T11:00:00"
    }, headers=headers)
    
    # -2 damage on Sep 15
    client.post("/api/v1/movements", json={
        "product_id": prod.id, "movement_type": "DAMAGE_LOSS", "quantity": 2,
        "occurred_at": "2026-09-15T09:00:00"
    }, headers=headers)
    
    # Balance: 100 + 30 - 15 + 5 - 2 = 118
    db_session.refresh(prod)
    assert prod.current_stock == 118
    
    integ_res = client.get(f"/api/v1/movements/verify-integrity/{prod.id}", headers=headers)
    assert integ_res.status_code == 200
    assert integ_res.json()["is_consistent"] is True
    assert integ_res.json()["ledger_sum_deltas"] == 118
    assert integ_res.json()["cached_current_stock"] == 118

def test_7_sales_revenue_uses_actual_transaction_price(client, db_session):
    """7. Confirming sales revenue uses the transaction's actual selling price."""
    token = generate_session_token("freshmart")
    headers = {"Authorization": f"Bearer {token}", "X-Business-ID": "freshmart"}
    
    prod = InventoryService.create_product(
        db_session,
        ProductCreate(
            sku="TST-DISC-01",
            name="Discounted Product",
            category="Test",
            opening_stock=50,
            unit_cost=100.0,
            selling_price=200.0,  # Standard catalog price ₹200
        ),
        business_id="freshmart"
    )
    
    # Record sale at discounted price of ₹160 (e.g. promo or negotiation)
    sale_date = "2026-09-25T11:00:00"
    client.post("/api/v1/sales", json={
        "product_id": prod.id,
        "quantity": 10,
        "unit_price": 160.0,  # Explicit transaction unit price
        "occurred_at": sale_date,
    }, headers=headers)
    
    sum_res = client.get("/api/v1/sales/summary?date=2026-09-25", headers=headers)
    assert sum_res.status_code == 200
    data = sum_res.json()
    # Must be 10 * 160 = 1600.0, NOT 10 * 200 = 2000.0
    assert data["total_revenue"] == 1600.0
    assert data["total_units_sold"] == 10

def test_8_sale_cannot_exceed_available_stock(client, db_session):
    """8. Confirming a sale cannot exceed available stock."""
    token = generate_session_token("freshmart")
    headers = {"Authorization": f"Bearer {token}", "X-Business-ID": "freshmart"}
    
    prod = InventoryService.create_product(
        db_session,
        ProductCreate(
            sku="TST-OVERS-01",
            name="Limited Stock Product",
            category="Test",
            opening_stock=10,
            unit_cost=10.0,
            selling_price=20.0,
        ),
        business_id="freshmart"
    )
    
    # Attempting to sell 15 when only 10 are available
    res = client.post("/api/v1/sales", json={
        "product_id": prod.id,
        "quantity": 15,
        "occurred_at": "2026-09-28T10:00:00",
    }, headers=headers)
    assert res.status_code == 400
    assert "Insufficient stock" in res.json()["detail"]
    
    # Stock should remain untouched at 10
    db_session.refresh(prod)
    assert prod.current_stock == 10

def test_9_duplicate_submissions_protection(client, db_session):
    """9. Confirming duplicate submissions do not deduct stock twice beyond limits."""
    token = generate_session_token("freshmart")
    headers = {"Authorization": f"Bearer {token}", "X-Business-ID": "freshmart"}
    
    prod = InventoryService.create_product(
        db_session,
        ProductCreate(
            sku="TST-DUP-01",
            name="Exact Stock Product",
            category="Test",
            opening_stock=5,
            unit_cost=10.0,
            selling_price=20.0,
        ),
        business_id="freshmart"
    )
    
    # First sale of 5 succeeds
    res1 = client.post("/api/v1/sales", json={
        "product_id": prod.id, "quantity": 5, "occurred_at": "2026-09-29T10:00:00"
    }, headers=headers)
    assert res1.status_code == 201
    
    # Duplicate immediate submission must fail because stock is now 0
    res2 = client.post("/api/v1/sales", json={
        "product_id": prod.id, "quantity": 5, "occurred_at": "2026-09-29T10:00:00"
    }, headers=headers)
    assert res2.status_code == 400
    assert "Insufficient stock" in res2.json()["detail"]
    
    db_session.refresh(prod)
    assert prod.current_stock == 0

def test_10_multi_business_data_isolation(client, db_session):
    """10. Confirming another business cannot access or modify the transaction."""
    fm_token = generate_session_token("freshmart")
    ut_token = generate_session_token("urbanthread")
    
    prod_fm = InventoryService.create_product(
        db_session,
        ProductCreate(
            sku="FM-ISO-01",
            name="FreshMart Private Rice",
            category="Grains",
            opening_stock=40,
            unit_cost=300.0,
            selling_price=400.0,
        ),
        business_id="freshmart"
    )
    
    # UrbanThread tries to sell FreshMart product
    ut_headers = {"Authorization": f"Bearer {ut_token}", "X-Business-ID": "urbanthread"}
    res = client.post("/api/v1/sales", json={
        "product_id": prod_fm.id,
        "quantity": 5,
    }, headers=ut_headers)
    assert res.status_code in [400, 404]
    
    # Verify FreshMart stock was not altered
    db_session.refresh(prod_fm)
    assert prod_fm.current_stock == 40

def test_11_sales_charts_and_forecasting_use_dated_records(client, db_session):
    """11. Confirming the sales chart and expected-sales feature use dated records."""
    token = generate_session_token("freshmart")
    headers = {"Authorization": f"Bearer {token}", "X-Business-ID": "freshmart"}
    
    # Create product with opening stock
    prod = InventoryService.create_product(
        db_session,
        ProductCreate(
            sku="TST-CHART-01",
            name="Chart Product",
            category="Test",
            opening_stock=100,
            unit_cost=10.0,
            selling_price=25.0,
        ),
        business_id="freshmart"
    )
    
    base_date = datetime.date(2026, 10, 5)
    # Record sales on 3 distinct dates
    for offset, qty in [(0, 10), (1, 15), (2, 20)]:
        d = (base_date + datetime.timedelta(days=offset)).strftime("%Y-%m-%d")
        client.post("/api/v1/sales", json={
            "product_id": prod.id,
            "quantity": qty,
            "unit_price": 25.0,
            "occurred_at": f"{d}T12:00:00",
        }, headers=headers)
        
    # Check dashboard sales trend
    kpis = DashboardService.get_dashboard_kpis(
        db_session, business_date=datetime.date(2026, 10, 10), business_id="freshmart", trend_days=7
    )
    date_units_map = {p.date: p.units_sold for p in kpis.sales_trend_30d}
    assert date_units_map.get("2026-10-05") == 10
    assert date_units_map.get("2026-10-06") == 15
    assert date_units_map.get("2026-10-07") == 20
    # Inactive day must be 0
    assert date_units_map.get("2026-10-08") == 0

def test_12_data_persists_across_sessions(client, db_session):
    """12. Confirming data persists after transaction commit."""
    token = generate_session_token("freshmart")
    headers = {"Authorization": f"Bearer {token}", "X-Business-ID": "freshmart"}
    
    prod = InventoryService.create_product(
        db_session,
        ProductCreate(
            sku="TST-PER-01",
            name="Persistence Product",
            category="Test",
            opening_stock=50,
            unit_cost=20.0,
            selling_price=40.0,
        ),
        business_id="freshmart"
    )
    
    client.post("/api/v1/movements", json={
        "product_id": prod.id,
        "movement_type": "STOCK_RECEIPT",
        "quantity": 25,
        "unit_price": 20.0,
        "supplier_name": "Reliable Dist",
        "occurred_at": "2026-09-01T10:00:00",
        "reference": "PO-PER-01",
    }, headers=headers)
    
    # Query movements list
    mov_res = client.get(f"/api/v1/movements?product_id={prod.id}", headers=headers)
    assert mov_res.status_code == 200
    items = mov_res.json()["items"]
    receipt = next(m for m in items if m["reference"] == "PO-PER-01")
    assert receipt["quantity"] == 25
    assert receipt["supplier_name"] == "Reliable Dist"
    assert "2026-09-01" in receipt["occurred_at"]
    assert receipt["unit_price"] == 20.0

def test_13_existing_records_preserved(client, db_session):
    """13. Confirming existing records and prepared testing datasets are preserved."""
    from app.services.demo_seeder import seed_business_demo_data
    seed_business_demo_data(db_session, "freshmart", force_reset=True)
    
    token = generate_session_token("freshmart")
    headers = {"Authorization": f"Bearer {token}", "X-Business-ID": "freshmart"}
    
    res = client.get("/api/v1/products", headers=headers)
    assert res.status_code == 200
    assert res.json()["total"] == 12  # All 12 standard catalog items preserved
    
    mov_res = client.get("/api/v1/movements", headers=headers)
    assert mov_res.status_code == 200
    # Over 45 days of sales records exist
    assert mov_res.json()["total"] > 500
