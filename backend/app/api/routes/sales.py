import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import get_db
from app.core.security import get_current_business, BusinessProfile
from app.services.import_service import ImportExportService
from app.models.import_batch import SalesImportBatch
from app.models.stock_movement import StockMovement
from app.models.product import Product
from app.schemas.import_export import CSVPreviewResponse, CSVCommitResponse, ImportBatchResponse

router = APIRouter(prefix="/sales", tags=["Sales Operations & CSV Import"])

@router.post("/import/preview", response_model=CSVPreviewResponse)
async def preview_sales_csv(
    file: UploadFile = File(...),
    current_biz: BusinessProfile = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")
    content = await file.read()
    return ImportExportService.preview_sales_csv(db, content, file.filename, business_id=current_biz.id)

@router.post("/import/commit", response_model=CSVCommitResponse)
async def commit_sales_csv(
    file: UploadFile = File(...),
    current_biz: BusinessProfile = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")
    content = await file.read()
    try:
        return ImportExportService.commit_sales_csv(db, content, file.filename, business_id=current_biz.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/batches/{batch_id}", response_model=ImportBatchResponse)
def get_import_batch(
    batch_id: int,
    current_biz: BusinessProfile = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    batch = db.query(SalesImportBatch).filter(
        SalesImportBatch.id == batch_id,
        SalesImportBatch.business_id == current_biz.id
    ).first()
    if not batch:
        raise HTTPException(status_code=404, detail=f"Import batch {batch_id} not found in workspace '{current_biz.name}'.")
    return ImportBatchResponse.model_validate(batch)

@router.get("/summary")
def get_sales_summary(
    date_str: Optional[str] = Query(None, alias="date", description="Target business date (YYYY-MM-DD)"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    current_biz: BusinessProfile = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    if start_date or end_date:
        start_d = datetime.datetime.strptime(start_date.strip(), "%Y-%m-%d").date() if start_date else datetime.date(2020, 1, 1)
        end_d = datetime.datetime.strptime(end_date.strip(), "%Y-%m-%d").date() if end_date else datetime.datetime.utcnow().date()
        start_dt = datetime.datetime.combine(start_d, datetime.time.min)
        end_dt = datetime.datetime.combine(end_d, datetime.time.max)
        period_label = f"{start_d.strftime('%Y-%m-%d')} to {end_d.strftime('%Y-%m-%d')}"
    else:
        target_date = datetime.datetime.strptime(date_str, "%Y-%m-%d").date() if date_str else datetime.datetime.utcnow().date()
        start_dt = datetime.datetime.combine(target_date, datetime.time.min)
        end_dt = datetime.datetime.combine(target_date, datetime.time.max)
        period_label = target_date.strftime("%Y-%m-%d")

    sales = db.query(StockMovement, Product).join(
        Product, StockMovement.product_id == Product.id
    ).filter(
        StockMovement.business_id == current_biz.id,
        StockMovement.movement_type == "SALE",
        StockMovement.occurred_at >= start_dt,
        StockMovement.occurred_at <= end_dt,
    ).all()

    total_units = sum(m.quantity for m, _ in sales)
    total_revenue = sum(
        m.quantity * (m.unit_price if m.unit_price is not None else p.selling_price)
        for m, p in sales
    )
    total_cost = sum(m.quantity * p.unit_cost for m, p in sales)
    profit = total_revenue - total_cost

    return {
        "business_id": current_biz.id,
        "date": period_label,
        "period": period_label,
        "currency": "INR",
        "currency_symbol": "₹",
        "transactions_count": len(sales),
        "total_units_sold": total_units,
        "total_revenue": round(total_revenue, 2),
        "total_cost": round(total_cost, 2),
        "gross_profit": round(profit, 2),
    }

class DirectSaleCreate(BaseModel):
    product_id: int
    quantity: int
    unit_price: Optional[float] = None
    occurred_at: Optional[datetime.datetime] = None
    reference: Optional[str] = None
    note: Optional[str] = None

@router.post("", status_code=201)
def record_direct_sale(
    sale_in: DirectSaleCreate,
    current_biz: BusinessProfile = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    from app.schemas.stock_movement import StockMovementCreate
    from app.services.inventory_service import InventoryService
    
    mov_in = StockMovementCreate(
        product_id=sale_in.product_id,
        movement_type="SALE",
        quantity=sale_in.quantity,
        unit_price=sale_in.unit_price,
        occurred_at=sale_in.occurred_at,
        reference=sale_in.reference or "MANUAL-SALE",
        note=sale_in.note or "Counter Sale",
        source="MANUAL",
    )
    try:
        movement = InventoryService.record_movement(db, mov_in, business_id=current_biz.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    product = db.query(Product).filter(Product.id == movement.product_id).first()
    actual_unit_price = movement.unit_price if movement.unit_price is not None else (product.selling_price if product else 0.0)
    total_amt = round(movement.quantity * actual_unit_price, 2)
    return {
        "status": "success",
        "movement_id": movement.id,
        "product_id": movement.product_id,
        "product_name": product.name if product else None,
        "quantity_sold": movement.quantity,
        "stock_after": product.current_stock if product else 0,
        "unit_price": actual_unit_price,
        "total_amount": total_amt,
        "currency": "INR",
        "currency_symbol": "₹",
        "occurred_at": movement.occurred_at.isoformat(),
        "created_at": movement.created_at.isoformat(),
    }
