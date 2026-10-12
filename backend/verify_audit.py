"""
StockSense AI — Complete System Audit & Verification Script
Verifies:
1. Multi-tenant isolation & authentication security
2. Stock ledger balance equation & atomic updates
3. Exact KPI mathematical calculations
4. 30-day zero-filled historical sales trend
5. Reorder logic & user-friendly risk levels
6. Academic and demo reset endpoint gating
7. Report CSV download authentication
"""
import sys
import datetime
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import generate_session_token, verify_session_token, DEMO_BUSINESSES
from app.core.config import settings
from app.db.session import SessionLocal, init_db
from app.services.demo_seeder import seed_all_demo_businesses
from app.models.product import Product
from app.models.stock_movement import StockMovement
from app.services.inventory_service import InventoryService
from app.services.dashboard_service import DashboardService

def run_audit():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    print("=" * 70)
    print("STOCKSENSE AI — COMPREHENSIVE TECHNICAL AUDIT & VERIFICATION")
    print("=" * 70)

    db = SessionLocal()
    client = TestClient(app)

    passed_checks = 0
    total_checks = 0

    def assert_check(title, condition, detail=""):
        nonlocal passed_checks, total_checks
        total_checks += 1
        if condition:
            passed_checks += 1
            print(f"  [PASS] {title}")
        else:
            print(f"  [FAIL] {title} - {detail}")
            raise AssertionError(f"Check failed: {title} ({detail})")

    # Reset test database deterministically
    print("\n--- Phase 1: Database & Test Account Initialization ---")
    init_db()
    seed_all_demo_businesses(db, force_reset=True)

    fm_token = generate_session_token("freshmart")
    ut_token = generate_session_token("urbanthread")
    tn_token = generate_session_token("technest")
    he_token = generate_session_token("homeease")

    # 1. Verify 4 test accounts and clean workspace boundaries
    print("\n--- Phase 2: Multi-Tenant Privacy & Isolation ---")
    fm_prods = client.get("/api/v1/products", headers={"Authorization": f"Bearer {fm_token}"}).json()
    assert_check("FreshMart has 12 preloaded products", fm_prods["total"] == 12)

    tn_prods = client.get("/api/v1/products", headers={"Authorization": f"Bearer {tn_token}"}).json()
    assert_check("TechNest has 12 preloaded products", tn_prods["total"] == 12)

    ut_prods = client.get("/api/v1/products", headers={"Authorization": f"Bearer {ut_token}"}).json()
    assert_check("UrbanThread starts clean (0 products)", ut_prods["total"] == 0)

    he_prods = client.get("/api/v1/products", headers={"Authorization": f"Bearer {he_token}"}).json()
    assert_check("HomeEase starts clean (0 products)", he_prods["total"] == 0)

    # 2. Unauthenticated requests rejected
    unauth_resp = client.get("/api/v1/products")
    assert_check("Unauthenticated /products returns 401", unauth_resp.status_code == 401)

    unauth_dash = client.get("/api/v1/dashboard/kpis")
    assert_check("Unauthenticated /dashboard/kpis returns 401", unauth_dash.status_code == 401)

    # 3. Cross-workspace tamper attempts
    fm_first_id = fm_prods["items"][0]["id"]
    cross_read = client.get(f"/api/v1/products/{fm_first_id}", headers={"Authorization": f"Bearer {ut_token}"})
    assert_check("UrbanThread cannot read FreshMart product (404)", cross_read.status_code == 404)

    cross_patch = client.patch(
        f"/api/v1/products/{fm_first_id}",
        json={"name": "Hacked"},
        headers={"Authorization": f"Bearer {ut_token}"}
    )
    assert_check("UrbanThread cannot update FreshMart product (404)", cross_patch.status_code == 404)

    cross_sale = client.post(
        "/api/v1/sales",
        json={"product_id": fm_first_id, "quantity": 1},
        headers={"Authorization": f"Bearer {ut_token}"}
    )
    assert_check("UrbanThread cannot sell FreshMart product (400)", cross_sale.status_code == 400)

    spoof_header = client.get(
        "/api/v1/products",
        headers={"Authorization": f"Bearer {ut_token}", "X-Business-ID": "freshmart"}
    )
    assert_check("Workspace spoofing header rejected with 403", spoof_header.status_code == 403)

    # 4. Stock ledger balance equation & atomic sales deduction
    print("\n--- Phase 3: Stock Ledger & Balance Equation ---")
    # Add a product to UrbanThread
    new_item = {
        "sku": "UTF-SILK-001",
        "name": "Pure Mulberry Silk Scarf",
        "category": "Accessories",
        "opening_stock": 50,
        "unit_cost": 300.0,
        "selling_price": 750.0,
        "reorder_threshold": 10,
        "supplier_lead_time_days": 4,
        "supplier_name": "Silk Weavers Co.",
    }
    create_resp = client.post("/api/v1/products", json=new_item, headers={"Authorization": f"Bearer {ut_token}"})
    assert_check("UrbanThread product created with opening stock 50", create_resp.status_code == 201)
    ut_prod = create_resp.json()
    ut_prod_id = ut_prod["id"]

    # Ledger check on opening stock
    ut_ledger_verify = client.get(
        f"/api/v1/movements/verify-integrity/{ut_prod_id}",
        headers={"Authorization": f"Bearer {ut_token}"}
    ).json()
    assert_check("Ledger reconciles for opening stock (50 == 50)", ut_ledger_verify["is_consistent"] is True)

    # Record valid sale of 12 units
    sale_resp = client.post(
        "/api/v1/sales",
        json={"product_id": ut_prod_id, "quantity": 12, "unit_price": 750.0, "reference": "REC-001"},
        headers={"Authorization": f"Bearer {ut_token}"}
    )
    assert_check("Sale of 12 units successful (stock = 38)", sale_resp.status_code == 201 and sale_resp.json()["stock_after"] == 38)

    # Record stock receipt of 20 units
    receipt_resp = client.post(
        "/api/v1/movements",
        json={"product_id": ut_prod_id, "movement_type": "STOCK_RECEIPT", "quantity": 20, "reference": "PO-101"},
        headers={"Authorization": f"Bearer {ut_token}"}
    )
    assert_check("Stock receipt of 20 units recorded", receipt_resp.status_code == 201)

    # Check updated balance: 50 - 12 + 20 = 58
    ut_prod_refreshed = client.get(f"/api/v1/products/{ut_prod_id}", headers={"Authorization": f"Bearer {ut_token}"}).json()
    assert_check("Product stock balance is exactly 58", ut_prod_refreshed["current_stock"] == 58)

    # Verify ledger consistency: sum(deltas) == current_stock
    ledger_after = client.get(
        f"/api/v1/movements/verify-integrity/{ut_prod_id}",
        headers={"Authorization": f"Bearer {ut_token}"}
    ).json()
    assert_check(
        f"Ledger reconciliation: cached={ledger_after['cached_current_stock']}, sum_deltas={ledger_after['ledger_sum_deltas']}",
        ledger_after["is_consistent"] is True and ledger_after["cached_current_stock"] == 58
    )

    # Overselling rejection
    oversell_resp = client.post(
        "/api/v1/sales",
        json={"product_id": ut_prod_id, "quantity": 100},
        headers={"Authorization": f"Bearer {ut_token}"}
    )
    assert_check("Overselling rejected (400 Insufficient stock)", oversell_resp.status_code == 400)

    # Verify FreshMart is completely unaffected
    fm_recheck = client.get("/api/v1/products", headers={"Authorization": f"Bearer {fm_token}"}).json()
    assert_check("FreshMart remains unaffected with 12 products", fm_recheck["total"] == 12)

    # 5. Dashboard KPIs and calculations
    print("\n--- Phase 4: Dashboard KPIs & Math Calculations ---")
    today = datetime.datetime.utcnow().date()
    ut_dash = client.get(f"/api/v1/dashboard/kpis?date={today.isoformat()}", headers={"Authorization": f"Bearer {ut_token}"}).json()

    assert_check("UrbanThread active products = 1", ut_dash["total_active_products"] == 1)
    assert_check("UrbanThread units in stock = 58", ut_dash["total_units_in_stock"] == 58)
    expected_value = 58 * 300.0  # 17400.0
    assert_check(f"Inventory value matches cost math (₹{expected_value})", ut_dash["total_inventory_value"] == expected_value)
    assert_check("Today's sales units = 12", ut_dash["today_sales_units"] == 12)
    expected_rev = 12 * 750.0  # 9000.0
    assert_check(f"Today's sales revenue matches actual selling price (₹{expected_rev})", ut_dash["today_sales_revenue"] == expected_rev)

    # 30-day continuous trend length and zero-fill check
    trend = ut_dash["sales_trend_30d"]
    assert_check("30-day sales trend has exactly 30 entries", len(trend) == 30)
    assert_check("Last entry in trend is today's date", trend[-1]["date"] == today.isoformat())
    assert_check("Today's entry in trend has 12 units sold and ₹9000 revenue", trend[-1]["units_sold"] == 12 and trend[-1]["revenue"] == 9000.0)

    zero_days = [t for t in trend[:-1] if t["units_sold"] == 0 and t["revenue"] == 0.0]
    assert_check("Past days without sales are properly zero-filled", len(zero_days) == 29)

    # 6. Reorder calculations
    print("\n--- Phase 5: Reorder Engine & Restocking Formula ---")
    # FreshMart reorder recommendations
    reorder_resp = client.get("/api/v1/reorder/recommendations", headers={"Authorization": f"Bearer {fm_token}"}).json()
    recs = reorder_resp["recommendations"]
    assert_check("FreshMart generates actionable recommendations", len(recs) > 0)
    for r in recs:
        # Verify formula: suggested_qty = max(0, target_stock - current_stock)
        lead_demand = int(r["forecast_daily_demand"] * r["lead_time_days"] + 0.999)  # math.ceil
        expected_target = lead_demand + r["safety_stock_units"]
        expected_suggested = max(0, expected_target - r["current_stock"])
        assert_check(
            f"Product {r['sku']}: Suggested Qty ({r['suggested_quantity']}) matches formula max(0, target - current)",
            r["suggested_quantity"] == expected_suggested and r["suggested_quantity"] >= 0
        )
        # Verify risk labels are friendly
        assert_check(
            f"Product {r['sku']}: Risk label '{r['risk_label']}' is valid and explanation contains no academic jargon",
            r["risk_label"] in ["CRITICAL", "HIGH", "MEDIUM", "LOW"] and "Mamdani" not in (r["explanation"] or "")
        )

    # 7. Disabled academic & reset endpoints
    print("\n--- Phase 6: Endpoint Security & Academic Gating ---")
    academic_route = client.get("/api/v1/ai/methods/peas/run", headers={"Authorization": f"Bearer {fm_token}"})
    assert_check("Academic AI Lab route returns 404 (disabled)", academic_route.status_code == 404)

    prolog_route = client.get("/api/v1/ai/prolog/status", headers={"Authorization": f"Bearer {fm_token}"})
    assert_check("Academic Prolog status route returns 404 (disabled)", prolog_route.status_code == 404)

    # Demo reset endpoint
    reset_resp = client.post("/api/v1/demo/reset", headers={"Authorization": f"Bearer {fm_token}"})
    assert_check("Reset workspace route is disabled (403)", reset_resp.status_code == 403)

    # 8. Report CSV exports authenticated
    print("\n--- Phase 7: Report CSV Export Privacy ---")
    unauth_csv = client.get("/api/v1/reports/inventory.csv")
    assert_check("Unauthenticated /reports/inventory.csv returns 401", unauth_csv.status_code == 401)

    auth_csv = client.get("/api/v1/reports/inventory.csv", headers={"Authorization": f"Bearer {fm_token}"})
    assert_check("Authenticated /reports/inventory.csv returns 200 with CSV content", auth_csv.status_code == 200 and "text/csv" in auth_csv.headers["content-type"])

    ut_csv = client.get("/api/v1/reports/inventory.csv", headers={"Authorization": f"Bearer {ut_token}"})
    assert_check("UrbanThread CSV export only contains UrbanThread products", "UTF-SILK-001" in ut_csv.text and "FMG" not in ut_csv.text)

    print("\n" + "=" * 70)
    print(f"AUDIT COMPLETED: {passed_checks}/{total_checks} CHECKS PASSED (100% SUCCESS)")
    print("=" * 70)
    db.close()
    return True

if __name__ == "__main__":
    success = run_audit()
    sys.exit(0 if success else 1)
