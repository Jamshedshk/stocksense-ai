from app.core.security import generate_session_token
from app.ai.methods_lab.practical_demos import AIMethodsLabService

def test_api_health_and_meta(client):
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "online"
    assert data["database"] == "healthy"

    res_meta = client.get("/api/v1/meta")
    assert res_meta.status_code == 200
    meta = res_meta.json()
    assert meta["version"] == "1.0.0"

def test_unauthenticated_requests_are_rejected(client):
    # Protected endpoints MUST reject requests without valid Bearer tokens
    assert client.get("/api/v1/dashboard/kpis").status_code == 401
    assert client.get("/api/v1/products").status_code == 401
    assert client.get("/api/v1/reports/inventory.csv").status_code == 401
    assert client.post("/api/v1/sales", json={"product_id": 1, "quantity": 1}).status_code == 401

def test_api_product_crud_and_movement(client):
    token = generate_session_token("freshmart")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create product
    payload = {
        "sku": "API-SKU-1",
        "name": "API Mouse",
        "category": "Electronics",
        "opening_stock": 20,
        "unit_cost": 15.0,
        "selling_price": 29.99,
        "reorder_threshold": 5,
        "supplier_lead_time_days": 4,
    }
    create_res = client.post("/api/v1/products", json=payload, headers=headers)
    assert create_res.status_code == 201
    prod = create_res.json()
    assert prod["sku"] == "API-SKU-1"
    assert prod["current_stock"] == 20
    pid = prod["id"]

    # 2. Get product
    get_res = client.get(f"/api/v1/products/{pid}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "API Mouse"

    # 3. Record a Sale
    mov_res = client.post("/api/v1/movements", json={
        "product_id": pid,
        "movement_type": "SALE",
        "quantity": 3,
        "reference": "SALE-API-01"
    }, headers=headers)
    assert mov_res.status_code == 201
    mov_data = mov_res.json()
    assert mov_data["stock_delta"] == -3

    # 4. Verify stock updated
    get_res2 = client.get(f"/api/v1/products/{pid}", headers=headers)
    assert get_res2.json()["current_stock"] == 17

    # 5. Verify integrity check
    integ_res = client.get(f"/api/v1/movements/verify-integrity/{pid}", headers=headers)
    assert integ_res.status_code == 200
    assert integ_res.json()["is_consistent"] is True

def test_api_dashboard_kpis(client):
    token = generate_session_token("freshmart")
    headers = {"Authorization": f"Bearer {token}"}
    res = client.get("/api/v1/dashboard/kpis", headers=headers)
    assert res.status_code == 200
    kpis = res.json()
    assert "total_active_products" in kpis
    assert "total_inventory_value" in kpis
    assert "sales_trend_30d" in kpis
    # 30 day sequence length check
    assert len(kpis["sales_trend_30d"]) == 30

def test_api_reports_download(client):
    token = generate_session_token("freshmart")
    headers = {"Authorization": f"Bearer {token}"}
    res = client.get("/api/v1/reports/inventory.csv", headers=headers)
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/csv")
    assert "sku,name,category" in res.text

def test_academic_ai_lab_routes_disabled(client):
    # Customer-facing app disabled academic lab routes
    res = client.post("/api/v1/ai/methods/minimax/run", json={
        "board": ["O", "O", " ", "X", "X", " ", " ", " ", " "],
        "player_to_move": "O"
    })
    assert res.status_code == 404

    # Internal academic module remains testable for coursework requirements
    minimax_res = AIMethodsLabService.run_minimax(
        ["O", "O", " ", "X", "X", " ", " ", " ", " "], "O"
    )
    assert minimax_res.best_move == 2
