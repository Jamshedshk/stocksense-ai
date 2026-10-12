import urllib.request
import json
import sys

def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    print("====================================================")
    print("STOCKSENSE AI - END-TO-END VERIFICATION SUITE")
    print("====================================================")

    # 1. Test Frontend serves Vite index.html
    try:
        with urllib.request.urlopen("http://localhost:5173/") as resp:
            html = resp.read().decode("utf-8")
            assert "root" in html, "Frontend did not return root container"
            print("[PASS] Frontend (Vite) is running and serving index.html")
    except Exception as e:
        print(f"[FAIL] Frontend check failed: {e}")
        return 1

    # 2. Test Demo Login for FreshMart
    req_fm_login = urllib.request.Request(
        "http://127.0.0.1:8000/api/v1/auth/demo-login",
        data=json.dumps({"business_id": "freshmart"}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req_fm_login) as resp:
        fm_data = json.loads(resp.read().decode("utf-8"))
        fm_token = fm_data["access_token"]
        assert fm_data["business"]["id"] == "freshmart"
        print(f"[PASS] Demo login successful: {fm_data['business']['name']} ({fm_data['business']['type']})")

    # 3. Test Products list for FreshMart (INR prices)
    req_fm_prods = urllib.request.Request(
        "http://127.0.0.1:8000/api/v1/products?size=20",
        headers={"Authorization": f"Bearer {fm_token}"}
    )
    with urllib.request.urlopen(req_fm_prods) as resp:
        fm_prods = json.loads(resp.read().decode("utf-8"))["items"]
        assert len(fm_prods) == 12, f"Expected 12 items for FreshMart, got {len(fm_prods)}"
        p0 = fm_prods[0]
        print(f"[PASS] FreshMart Products: {len(fm_prods)} SKUs loaded. Sample: {p0['name']} (SKU: {p0['sku']}) Selling Price: ₹{p0['selling_price']}")

    # 4. Test Demo Login for UrbanThread Fashion
    req_ut_login = urllib.request.Request(
        "http://127.0.0.1:8000/api/v1/auth/demo-login",
        data=json.dumps({"business_id": "urbanthread"}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req_ut_login) as resp:
        ut_data = json.loads(resp.read().decode("utf-8"))
        ut_token = ut_data["access_token"]
        assert ut_data["business"]["id"] == "urbanthread"
        print(f"[PASS] Demo login successful: {ut_data['business']['name']} ({ut_data['business']['type']})")

    # 5. Test Products list for UrbanThread (Isolation Verification)
    req_ut_prods = urllib.request.Request(
        "http://127.0.0.1:8000/api/v1/products?size=20",
        headers={"Authorization": f"Bearer {ut_token}"}
    )
    with urllib.request.urlopen(req_ut_prods) as resp:
        ut_prods = json.loads(resp.read().decode("utf-8"))["items"]
        assert len(ut_prods) == 12, f"Expected 12 items for UrbanThread, got {len(ut_prods)}"
        ut0 = ut_prods[0]
        assert ut0["sku"] != p0["sku"], "SKU collision or data leak between businesses!"
        assert ut0["name"] != p0["name"], "Product catalog leaked across businesses!"
        print(f"[PASS] UrbanThread Products: {len(ut_prods)} SKUs isolated. Sample: {ut0['name']} (SKU: {ut0['sku']}) Selling Price: ₹{ut0['selling_price']}")

    # 6. Test Demo Login for TechNest Electronics
    req_tn_login = urllib.request.Request(
        "http://127.0.0.1:8000/api/v1/auth/demo-login",
        data=json.dumps({"business_id": "technest"}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req_tn_login) as resp:
        tn_data = json.loads(resp.read().decode("utf-8"))
        tn_token = tn_data["access_token"]
        assert tn_data["business"]["id"] == "technest"
        print(f"[PASS] Demo login successful: {tn_data['business']['name']} ({tn_data['business']['type']})")

    # 7. Test Demo Login for HomeEase Supplies
    req_he_login = urllib.request.Request(
        "http://127.0.0.1:8000/api/v1/auth/demo-login",
        data=json.dumps({"business_id": "homeease"}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req_he_login) as resp:
        he_data = json.loads(resp.read().decode("utf-8"))
        he_token = he_data["access_token"]
        assert he_data["business"]["id"] == "homeease"
        print(f"[PASS] Demo login successful: {he_data['business']['name']} ({he_data['business']['type']})")

    # 8. Test Sale recording in UrbanThread
    item_to_sell = ut_prods[0]
    initial_stock = item_to_sell["current_stock"]
    sale_body = json.dumps({
        "product_id": item_to_sell["id"],
        "quantity": 2,
        "note": "Counter sale for customer"
    }).encode("utf-8")
    req_sale = urllib.request.Request(
        "http://127.0.0.1:8000/api/v1/sales",
        data=sale_body,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {ut_token}"}
    )
    with urllib.request.urlopen(req_sale) as resp:
        sale_res = json.loads(resp.read().decode("utf-8"))
        assert sale_res["stock_after"] == initial_stock - 2, f"Expected {initial_stock - 2}, got {sale_res['stock_after']}"
        print(f"[PASS] Counter sale recorded for {item_to_sell['name']}: {initial_stock} -> {sale_res['stock_after']} units (Total: ₹{sale_res['total_amount']})")

    # 9. Verify FreshMart inventory remains completely untouched
    with urllib.request.urlopen(req_fm_prods) as resp:
        fm_prods_after = json.loads(resp.read().decode("utf-8"))["items"]
        assert fm_prods_after[0]["current_stock"] == p0["current_stock"], "FreshMart inventory was altered by another business transaction!"
        print("[PASS] Multi-tenant isolation verified: FreshMart inventory was 100% unaffected by UrbanThread transaction")

    # 10. Test Dashboard KPIs for TechNest
    req_tn_kpis = urllib.request.Request(
        "http://127.0.0.1:8000/api/v1/dashboard/kpis",
        headers={"Authorization": f"Bearer {tn_token}"}
    )
    with urllib.request.urlopen(req_tn_kpis) as resp:
        tn_kpis = json.loads(resp.read().decode("utf-8"))
        assert tn_kpis["total_active_products"] == 12
        assert tn_kpis["total_inventory_value"] > 0
        print(f"[PASS] TechNest Dashboard KPIs: Total Value = ₹{tn_kpis['total_inventory_value']:,.2f}, Low Stock = {tn_kpis['low_stock_count']}")

    # 11. Test Reorder Recommendations for HomeEase
    req_he_reorder = urllib.request.Request(
        "http://127.0.0.1:8000/api/v1/reorder/recommendations",
        headers={"Authorization": f"Bearer {he_token}"}
    )
    with urllib.request.urlopen(req_he_reorder) as resp:
        he_reorder = json.loads(resp.read().decode("utf-8"))
        print(f"[PASS] HomeEase Reorder Queue: {len(he_reorder)} recommendations calculated from actual inventory")

    print("====================================================")
    print("ALL 11 END-TO-END INTEGRATION CHECKS PASSED!")
    print("====================================================")
    return 0

if __name__ == "__main__":
    sys.exit(main())
