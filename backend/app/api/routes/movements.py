import math
import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import get_db
from app.core.security import get_current_business, BusinessProfile
from app.services.inventory_service import InventoryService
from app.schemas.stock_movement import (
    StockMovementCreate,
    StockMovementResponse,
    MovementListResponse,
    MovementSummaryResponse,
)
from app.models.product import Product
from app.models.stock_movement import StockMovement

router = APIRouter(prefix="/movements", tags=["Stock Movements & Sales"])

@router.get("", response_model=MovementListResponse)
def list_movements(
    product_id: Optional[int] = None,
    movement_type: Optional[str] = None,
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    current_biz: BusinessProfile = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    parsed_start = None
    if start_date:
        try:
            parsed_start = datetime.datetime.strptime(start_date.strip(), "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid start_date format '{start_date}'. Use YYYY-MM-DD.")

    parsed_end = None
    if end_date:
        try:
            parsed_end = datetime.datetime.strptime(end_date.strip(), "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid end_date format '{end_date}'. Use YYYY-MM-DD.")

    items, total = InventoryService.list_movements(
        db,
        product_id=product_id,
        movement_type=movement_type,
        start_date=parsed_start,
        end_date=parsed_end,
        page=page,
        size=size,
        business_id=current_biz.id,
    )
    pages = math.ceil(total / size) if total > 0 else 1

    resp_items = []
    for m in items:
        p = db.query(Product).filter(Product.id == m.product_id).first()
        u_price = m.unit_price if m.unit_price is not None else (p.selling_price if m.movement_type == "SALE" else p.unit_cost if p else 0.0)
        tot_amt = round(abs(m.quantity) * u_price, 2)
        resp_items.append(
            StockMovementResponse(
                id=m.id,
                product_id=m.product_id,
                product_sku=p.sku if p else None,
                product_name=p.name if p else None,
                movement_type=m.movement_type,
                quantity=m.quantity,
                stock_delta=m.stock_delta,
                unit_price=u_price,
                total_amount=tot_amt,
                supplier_name=m.supplier_name or (p.supplier_name if p else None),
                occurred_at=m.occurred_at,
                transaction_date=m.occurred_at.strftime("%Y-%m-%d") if m.occurred_at else None,
                reference=m.reference,
                note=m.note,
                source=m.source,
                import_batch_id=m.import_batch_id,
                created_at=m.created_at,
                created_by=m.created_by,
            )
        )

    return MovementListResponse(
        items=resp_items,
        total=total,
        page=page,
        size=size,
        pages=pages,
    )

@router.get("/summary", response_model=MovementSummaryResponse)
def get_movements_summary(
    product_id: Optional[int] = None,
    movement_type: Optional[str] = None,
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    current_biz: BusinessProfile = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    parsed_start = None
    if start_date:
        try:
            parsed_start = datetime.datetime.strptime(start_date.strip(), "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid start_date format '{start_date}'. Use YYYY-MM-DD.")

    parsed_end = None
    if end_date:
        try:
            parsed_end = datetime.datetime.strptime(end_date.strip(), "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid end_date format '{end_date}'. Use YYYY-MM-DD.")

    summary = InventoryService.get_movements_summary(
        db,
        product_id=product_id,
        movement_type=movement_type,
        start_date=parsed_start,
        end_date=parsed_end,
        business_id=current_biz.id,
    )
    return MovementSummaryResponse(**summary)

@router.post("", response_model=StockMovementResponse, status_code=201)
def record_movement(
    movement_in: StockMovementCreate,
    current_biz: BusinessProfile = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    try:
        movement = InventoryService.record_movement(db, movement_in, business_id=current_biz.id)
        product = db.query(Product).filter(Product.id == movement.product_id).first()
        u_price = movement.unit_price if movement.unit_price is not None else (product.selling_price if movement.movement_type == "SALE" else product.unit_cost if product else 0.0)
        tot_amt = round(abs(movement.quantity) * u_price, 2)
        return StockMovementResponse(
            id=movement.id,
            product_id=movement.product_id,
            product_sku=product.sku if product else None,
            product_name=product.name if product else None,
            movement_type=movement.movement_type,
            quantity=movement.quantity,
            stock_delta=movement.stock_delta,
            previous_stock=getattr(movement, "previous_stock", None),
            current_stock=getattr(movement, "current_stock", product.current_stock if product else None),
            unit_price=u_price,
            total_amount=tot_amt,
            supplier_name=movement.supplier_name or (product.supplier_name if product else None),
            occurred_at=movement.occurred_at,
            transaction_date=movement.occurred_at.strftime("%Y-%m-%d") if movement.occurred_at else None,
            reference=movement.reference,
            note=movement.note,
            source=movement.source,
            import_batch_id=movement.import_batch_id,
            created_at=movement.created_at,
            created_by=movement.created_by,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/products/{product_id}", response_model=MovementListResponse)
def get_product_movements(
    product_id: int,
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    current_biz: BusinessProfile = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    return list_movements(
        product_id=product_id,
        start_date=start_date,
        end_date=end_date,
        page=page,
        size=size,
        current_biz=current_biz,
        db=db,
    )

@router.get("/verify-integrity/{product_id}")
def verify_product_integrity(
    product_id: int,
    current_biz: BusinessProfile = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    try:
        cached_stock, sum_delta, consistent = InventoryService.verify_ledger_consistency(
            db, product_id, business_id=current_biz.id
        )
        return {
            "product_id": product_id,
            "cached_current_stock": cached_stock,
            "ledger_sum_deltas": sum_delta,
            "is_consistent": consistent,
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
