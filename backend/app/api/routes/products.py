import math
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import get_current_business, BusinessProfile
from app.services.inventory_service import InventoryService
from app.services.import_service import ImportExportService
from app.schemas.product import (
    ProductCreate,
    ProductUpdate,
    ProductResponse,
    ProductListResponse,
    ProductRestockRequest,
    ProductRestockResponse,
)
from app.schemas.import_export import CSVPreviewResponse, CSVCommitResponse

router = APIRouter(prefix="/products", tags=["Products"])

@router.get("", response_model=ProductListResponse)
def list_products(
    search: Optional[str] = None,
    category: Optional[str] = None,
    active_only: bool = True,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    current_biz: BusinessProfile = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    items, total = InventoryService.list_products(
        db,
        search=search,
        category=category,
        active_only=active_only,
        page=page,
        size=size,
        business_id=current_biz.id,
    )
    pages = math.ceil(total / size) if total > 0 else 1
    return ProductListResponse(
        items=[ProductResponse.model_validate(p) for p in items],
        total=total,
        page=page,
        size=size,
        pages=pages,
    )

@router.post("", response_model=ProductResponse, status_code=201)
def create_product(
    product_in: ProductCreate,
    current_biz: BusinessProfile = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    try:
        product = InventoryService.create_product(db, product_in, business_id=current_biz.id)
        return ProductResponse.model_validate(product)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    current_biz: BusinessProfile = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    product = InventoryService.get_product(db, product_id, business_id=current_biz.id)
    if not product:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found in workspace '{current_biz.name}'.")
    return ProductResponse.model_validate(product)

@router.patch("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    product_update: ProductUpdate,
    current_biz: BusinessProfile = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    try:
        product = InventoryService.update_product(db, product_id, product_update, business_id=current_biz.id)
        return ProductResponse.model_validate(product)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{product_id}/restock", response_model=ProductRestockResponse, status_code=200)
def restock_product(
    product_id: int,
    restock_in: ProductRestockRequest,
    current_biz: BusinessProfile = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    try:
        result = InventoryService.restock_product(
            db, product_id=product_id, restock_in=restock_in, business_id=current_biz.id
        )
        return ProductRestockResponse(**result)
    except ValueError as e:
        status_code = 404 if "not found" in str(e).lower() else 400
        raise HTTPException(status_code=status_code, detail=str(e))

@router.post("/import/preview", response_model=CSVPreviewResponse)
async def preview_products_csv(
    file: UploadFile = File(...),
    current_biz: BusinessProfile = Depends(get_current_business),
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")
    content = await file.read()
    return ImportExportService.preview_products_csv(content, file.filename, business_id=current_biz.id)

@router.post("/import/commit", response_model=CSVCommitResponse)
async def commit_products_csv(
    file: UploadFile = File(...),
    current_biz: BusinessProfile = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")
    content = await file.read()
    try:
        return ImportExportService.commit_products_csv(db, content, file.filename, business_id=current_biz.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
