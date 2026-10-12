import pytest
from app.services.import_service import ImportExportService
from app.models.product import Product
from app.models.stock_movement import StockMovement

def test_preview_and_commit_products_csv(db_session):
    csv_content = b"""sku,name,category,opening_stock,unit_cost,selling_price,reorder_threshold,supplier_lead_time_days
SKU-IMP-1,Imported Item 1,Electronics,15,20.0,35.0,5,7
SKU-IMP-2,Imported Item 2,Apparel,30,10.0,22.0,8,4
"""
    preview = ImportExportService.preview_products_csv(csv_content, "items.csv")
    assert preview.total_rows == 2
    assert preview.valid_rows == 2
    assert preview.is_valid_for_commit is True

    commit_res = ImportExportService.commit_products_csv(db_session, csv_content, "items.csv")
    assert commit_res.rows_imported == 2
    assert commit_res.rows_rejected == 0

    p1 = db_session.query(Product).filter(Product.sku == "SKU-IMP-1").first()
    assert p1 is not None
    assert p1.current_stock == 15

    # Test duplicate import rejection
    with pytest.raises(ValueError, match="already imported"):
        ImportExportService.commit_products_csv(db_session, csv_content, "items.csv")

def test_reject_invalid_columns_products_csv():
    csv_bad = b"""sku,name,wrong_col\n1,2,3\n"""
    preview = ImportExportService.preview_products_csv(csv_bad, "bad.csv")
    assert preview.is_valid_for_commit is False
    assert len(preview.errors) > 0
    assert "Missing required columns" in preview.errors[0].error

def test_preview_and_commit_sales_csv(db_session):
    # First create product
    csv_prod = b"""sku,name,category,opening_stock,unit_cost,selling_price,reorder_threshold,supplier_lead_time_days
SKU-S-1,Item for Sale,Stationery,50,2.0,5.0,10,3
"""
    ImportExportService.commit_products_csv(db_session, csv_prod, "prod.csv")

    sales_csv = b"""transaction_id,occurred_at,sku,quantity,unit_price,transaction_type
TX-9901,2026-09-01T10:00:00,SKU-S-1,5,5.0,SALE
TX-9902,2026-09-02T11:00:00,SKU-S-1,10,2.0,STOCK_RECEIPT
"""
    preview = ImportExportService.preview_sales_csv(db_session, sales_csv, "sales.csv")
    assert preview.valid_rows == 2
    assert preview.is_valid_for_commit is True

    commit_res = ImportExportService.commit_sales_csv(db_session, sales_csv, "sales.csv")
    assert commit_res.rows_imported == 2

    prod = db_session.query(Product).filter(Product.sku == "SKU-S-1").first()
    # Initial 50 - 5 (sale) + 10 (receipt) = 55
    assert prod.current_stock == 55

def test_export_inventory_and_movements(db_session):
    csv_prod = b"""sku,name,category,opening_stock,unit_cost,selling_price,reorder_threshold,supplier_lead_time_days
SKU-EXP,Export Item,Electronics,10,15.0,30.0,5,7
"""
    ImportExportService.commit_products_csv(db_session, csv_prod, "exp.csv")

    inv_csv = ImportExportService.export_inventory_csv(db_session)
    assert "SKU-EXP" in inv_csv
    assert "Export Item" in inv_csv

    mov_csv = ImportExportService.export_movements_csv(db_session)
    assert "OPENING_STOCK" in mov_csv
