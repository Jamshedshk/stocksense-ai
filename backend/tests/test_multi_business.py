import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import DEMO_BUSINESSES, generate_session_token, verify_session_token
from app.services.demo_seeder import seed_all_demo_businesses

def test_auth_endpoints_and_token_generation(client):
    # 1. Get list of 4 demo businesses
    resp = client.get("/api/v1/auth/businesses")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 4
    ids = [b["id"] for b in data]
    assert "freshmart" in ids
    assert "urbanthread" in ids
    assert "technest" in ids
    assert "homeease" in ids

    # Check currency INR
    for b in data:
        assert b["currency"] == "INR"
        assert b["currency_symbol"] == "₹"

    # 2. Conventional login with Demo ID and password
    login_req = {"identifier": "freshmart", "password": "demo123"}
    cred_resp = client.post("/api/v1/auth/login", json=login_req)
    assert cred_resp.status_code == 200
    cred_data = cred_resp.json()
    assert cred_data["access_token"]
    assert cred_data["business"]["id"] == "freshmart"

    # Conventional login with Email identifier
    email_req = {"identifier": "urbanthread@stocksense.ai", "password": "demo123"}
    email_resp = client.post("/api/v1/auth/login", json=email_req)
    assert email_resp.status_code == 200
    assert email_resp.json()["business"]["id"] == "urbanthread"

    # Conventional login failure with wrong password
    bad_pwd_resp = client.post("/api/v1/auth/login", json={"identifier": "freshmart", "password": "wrongpassword"})
    assert bad_pwd_resp.status_code == 401
    assert "Invalid email/Demo ID or password" in bad_pwd_resp.json()["detail"]

    # Conventional login failure with unknown identifier
    bad_id_resp = client.post("/api/v1/auth/login", json={"identifier": "unknown_biz", "password": "demo123"})
    assert bad_id_resp.status_code == 401

    # 3. Quick-login shortcut for urbanthread
    quick_resp = client.post("/api/v1/auth/quick-login", json={"business_id": "urbanthread"})
    assert quick_resp.status_code == 200
    quick_data = quick_resp.json()
    token = quick_data["access_token"]
    assert token
    assert quick_data["business"]["id"] == "urbanthread"
    assert verify_session_token(token) == "urbanthread"

    # 4. Auth me with token
    me_resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["id"] == "urbanthread"

def test_multi_business_data_isolation(client, db_session):
    seed_all_demo_businesses(db_session, force_reset=True)

    freshmart_token = generate_session_token("freshmart")
    urbanthread_token = generate_session_token("urbanthread")
    technest_token = generate_session_token("technest")
    homeease_token = generate_session_token("homeease")

    # 1. FreshMart products (Preloaded - 12 products)
    fm_resp = client.get("/api/v1/products", headers={"Authorization": f"Bearer {freshmart_token}"})
    assert fm_resp.status_code == 200
    fm_data = fm_resp.json()
    assert fm_data["total"] == 12
    fm_prods = fm_data["items"]
    assert len(fm_prods) == 12
    fm_skus = [p["sku"] for p in fm_prods]
    assert any("FMG" in s for s in fm_skus)

    # 2. TechNest products (Preloaded - 12 products)
    tn_resp = client.get("/api/v1/products", headers={"Authorization": f"Bearer {technest_token}"})
    assert tn_resp.status_code == 200
    tn_data = tn_resp.json()
    assert tn_data["total"] == 12
    tn_prods = tn_data["items"]
    assert len(tn_prods) == 12
    tn_skus = [p["sku"] for p in tn_prods]
    assert any("TNE" in s for s in tn_skus)

    # 3. UrbanThread products (Clean Workspace - Starts completely empty: 0 products)
    ut_resp = client.get("/api/v1/products", headers={"Authorization": f"Bearer {urbanthread_token}"})
    assert ut_resp.status_code == 200
    ut_data = ut_resp.json()
    assert ut_data["total"] == 0
    assert len(ut_data["items"]) == 0

    # 4. HomeEase products (Clean Workspace - Starts completely empty: 0 products)
    he_resp = client.get("/api/v1/products", headers={"Authorization": f"Bearer {homeease_token}"})
    assert he_resp.status_code == 200
    he_data = he_resp.json()
    assert he_data["total"] == 0
    assert len(he_data["items"]) == 0

    # 5. Create a product in UrbanThread from scratch
    new_garment = {
        "sku": "UTF-NEW-SHIRT",
        "name": "Custom Linen Shirt",
        "category": "Shirts",
        "opening_stock": 25,
        "unit_cost": 450.0,
        "selling_price": 999.0,
        "reorder_threshold": 8,
        "supplier_lead_time_days": 5,
        "supplier_name": "Fabrics Direct",
    }
    ut_create_resp = client.post("/api/v1/products", json=new_garment, headers={"Authorization": f"Bearer {urbanthread_token}"})
    assert ut_create_resp.status_code == 201

    # Verify UrbanThread now has exactly 1 product
    ut_updated = client.get("/api/v1/products", headers={"Authorization": f"Bearer {urbanthread_token}"}).json()
    assert ut_updated["total"] == 1
    assert ut_updated["items"][0]["sku"] == "UTF-NEW-SHIRT"

    # Verify HomeEase, FreshMart, TechNest remain completely unaffected
    he_check = client.get("/api/v1/products", headers={"Authorization": f"Bearer {homeease_token}"}).json()
    assert he_check["total"] == 0
    fm_check = client.get("/api/v1/products", headers={"Authorization": f"Bearer {freshmart_token}"}).json()
    assert fm_check["total"] == 12
    tn_check = client.get("/api/v1/products", headers={"Authorization": f"Bearer {technest_token}"}).json()
    assert tn_check["total"] == 12

def test_isolated_sales_and_oversell_prevention(client, db_session):
    seed_all_demo_businesses(db_session, force_reset=True)
    freshmart_token = generate_session_token("freshmart")
    technest_token = generate_session_token("technest")

    # Get a FreshMart product
    fm_prods = client.get("/api/v1/products", headers={"Authorization": f"Bearer {freshmart_token}"}).json()["items"]
    test_prod = fm_prods[0]
    initial_stock = test_prod["current_stock"]
    assert initial_stock > 0

    # 1. Record a valid sale of 5 units
    sale_payload = {
        "product_id": test_prod["id"],
        "quantity": 5,
        "unit_price": test_prod["selling_price"],
        "reference": "TEST-BILL-001",
    }
    sale_resp = client.post("/api/v1/sales", json=sale_payload, headers={"Authorization": f"Bearer {freshmart_token}"})
    assert sale_resp.status_code == 201
    assert sale_resp.json()["stock_after"] == initial_stock - 5

    # Verify product stock updated in DB
    refreshed_prod = client.get(f"/api/v1/products/{test_prod['id']}", headers={"Authorization": f"Bearer {freshmart_token}"}).json()
    assert refreshed_prod["current_stock"] == initial_stock - 5

    # 2. Attempt to sell more than available stock (Overselling rejection)
    oversell_payload = {
        "product_id": test_prod["id"],
        "quantity": initial_stock + 100,  # exceeds available stock
        "reference": "TEST-OVERSELL-FAIL",
    }
    oversell_resp = client.post("/api/v1/sales", json=oversell_payload, headers={"Authorization": f"Bearer {freshmart_token}"})
    assert oversell_resp.status_code == 400
    assert "Insufficient stock" in oversell_resp.json()["detail"]

    # Verify stock remained unchanged after failed sale
    unchanged_prod = client.get(f"/api/v1/products/{test_prod['id']}", headers={"Authorization": f"Bearer {freshmart_token}"}).json()
    assert unchanged_prod["current_stock"] == initial_stock - 5

    # 3. Check TechNest is unaffected by FreshMart sale
    tn_dash = client.get("/api/v1/dashboard/kpis", headers={"Authorization": f"Bearer {technest_token}"}).json()
    assert tn_dash["total_active_products"] == 12

def test_strict_cross_workspace_tamper_rejection(client, db_session):
    seed_all_demo_businesses(db_session, force_reset=True)
    freshmart_token = generate_session_token("freshmart")
    urbanthread_token = generate_session_token("urbanthread")

    # Get a FreshMart product ID
    fm_prods = client.get("/api/v1/products", headers={"Authorization": f"Bearer {freshmart_token}"}).json()["items"]
    fm_prod_id = fm_prods[0]["id"]

    # 1. UrbanThread user attempts to read FreshMart product directly
    cross_read = client.get(f"/api/v1/products/{fm_prod_id}", headers={"Authorization": f"Bearer {urbanthread_token}"})
    assert cross_read.status_code == 404

    # 2. UrbanThread user attempts to update FreshMart product
    cross_patch = client.patch(
        f"/api/v1/products/{fm_prod_id}",
        json={"name": "Tampered Product Name"},
        headers={"Authorization": f"Bearer {urbanthread_token}"}
    )
    assert cross_patch.status_code == 404

    # 3. UrbanThread user attempts to record a sale on FreshMart product
    cross_sale = client.post(
        "/api/v1/sales",
        json={"product_id": fm_prod_id, "quantity": 1},
        headers={"Authorization": f"Bearer {urbanthread_token}"}
    )
    assert cross_sale.status_code == 400
    assert "not found" in cross_sale.json()["detail"].lower()

    # 4. UrbanThread user attempts header spoofing with X-Business-ID: freshmart
    tamper_header = client.get(
        "/api/v1/products",
        headers={"Authorization": f"Bearer {urbanthread_token}", "X-Business-ID": "freshmart"}
    )
    assert tamper_header.status_code == 403
    assert "Workspace isolation violation" in tamper_header.json()["detail"]

    # 5. UrbanThread user attempts query parameter spoofing with ?business_id=freshmart
    tamper_query = client.get(
        "/api/v1/products?business_id=freshmart",
        headers={"Authorization": f"Bearer {urbanthread_token}"}
    )
    assert tamper_query.status_code == 403

    # 6. Unauthenticated request attempting to claim workspace via X-Business-ID
    unauth_header = client.get("/api/v1/products", headers={"X-Business-ID": "freshmart"})
    assert unauth_header.status_code == 401

    # 7. Request with invalid or corrupted session token
    invalid_token_req = client.get("/api/v1/products", headers={"Authorization": "Bearer totally_invalid_token_123"})
    assert invalid_token_req.status_code == 401


