import datetime
from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.models.product import Product
from app.models.stock_movement import StockMovement
from app.models.audit_event import AuditEvent
from app.schemas.product import ProductCreate, ProductUpdate
from app.schemas.stock_movement import StockMovementCreate, MovementTypeEnum

class InventoryService:
    @staticmethod
    def create_product(db: Session, product_in: ProductCreate, business_id: str = "freshmart") -> Product:
        bid = (business_id or "freshmart").lower().strip()
        # Check SKU uniqueness within this business workspace
        existing = db.query(Product).filter(
            Product.business_id == bid,
            func.lower(Product.sku) == product_in.sku.lower().strip()
        ).first()
        if existing:
            raise ValueError(f"Product with SKU '{product_in.sku}' already exists in workspace '{bid}'.")

        # Create Product
        db_product = Product(
            business_id=bid,
            sku=product_in.sku.strip().upper(),
            name=product_in.name.strip(),
            category=product_in.category.strip() or "Uncategorized",
            description=product_in.description,
            unit_cost=product_in.unit_cost,
            selling_price=product_in.selling_price,
            reorder_threshold=product_in.reorder_threshold,
            supplier_lead_time_days=product_in.supplier_lead_time_days,
            supplier_name=product_in.supplier_name,
            supplier_contact=product_in.supplier_contact,
            current_stock=product_in.opening_stock,
            is_active=True,
            created_at=datetime.datetime.utcnow(),
            updated_at=datetime.datetime.utcnow(),
        )
        db.add(db_product)
        db.flush()  # Populates db_product.id

        # If opening stock > 0, record opening stock movement atomically
        if product_in.opening_stock > 0:
            opening_movement = StockMovement(
                business_id=bid,
                product_id=db_product.id,
                movement_type=MovementTypeEnum.STOCK_RECEIPT.value,
                quantity=product_in.opening_stock,
                stock_delta=product_in.opening_stock,
                unit_price=product_in.unit_cost,
                occurred_at=datetime.datetime.utcnow(),
                reference="OPENING_STOCK",
                note="Initial opening stock recorded at product creation",
                source="MANUAL",
                created_at=datetime.datetime.utcnow(),
            )
            db.add(opening_movement)

        # Audit event
        audit = AuditEvent(
            event_type="PRODUCT_CREATED",
            entity_type="PRODUCT",
            entity_id=str(db_product.id),
            details_json=f'{{"business_id": "{bid}", "sku": "{db_product.sku}", "opening_stock": {product_in.opening_stock}}}',
            created_at=datetime.datetime.utcnow(),
        )
        db.add(audit)
        db.commit()
        db.refresh(db_product)
        return db_product

    @staticmethod
    def get_product(db: Session, product_id: int, business_id: Optional[str] = None) -> Optional[Product]:
        query = db.query(Product).filter(Product.id == product_id)
        if business_id:
            query = query.filter(Product.business_id == business_id.lower().strip())
        return query.first()

    @staticmethod
    def get_product_by_sku(db: Session, sku: str, business_id: str = "freshmart") -> Optional[Product]:
        bid = (business_id or "freshmart").lower().strip()
        return db.query(Product).filter(
            Product.business_id == bid,
            func.lower(Product.sku) == sku.lower().strip()
        ).first()

    @staticmethod
    def list_products(
        db: Session,
        search: Optional[str] = None,
        category: Optional[str] = None,
        active_only: bool = True,
        page: int = 1,
        size: int = 50,
        business_id: str = "freshmart",
    ) -> Tuple[List[Product], int]:
        bid = (business_id or "freshmart").lower().strip()
        query = db.query(Product).filter(Product.business_id == bid)
        if active_only:
            query = query.filter(Product.is_active == True)
        if category and category.lower() != "all":
            query = query.filter(func.lower(Product.category) == category.lower().strip())
        if search:
            search_pattern = f"%{search.strip().lower()}%"
            query = query.filter(
                or_(
                    func.lower(Product.sku).like(search_pattern),
                    func.lower(Product.name).like(search_pattern),
                )
            )

        total = query.count()
        offset = (page - 1) * size
        items = query.order_by(Product.name.asc()).offset(offset).limit(size).all()
        return items, total

    @staticmethod
    def update_product(db: Session, product_id: int, product_update: ProductUpdate, business_id: Optional[str] = None) -> Product:
        query = db.query(Product).filter(Product.id == product_id)
        if business_id:
            query = query.filter(Product.business_id == business_id.lower().strip())
        product = query.first()
        if not product:
            raise ValueError(f"Product with ID {product_id} not found.")

        update_data = product_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(product, key, value)
        
        product.updated_at = datetime.datetime.utcnow()
        
        audit = AuditEvent(
            event_type="PRODUCT_UPDATED",
            entity_type="PRODUCT",
            entity_id=str(product.id),
            details_json=f'{{"business_id": "{product.business_id}", "updated_fields": list(update_data.keys())}}',
            created_at=datetime.datetime.utcnow(),
        )
        db.add(audit)
        db.commit()
        db.refresh(product)
        return product

    @staticmethod
    def record_movement(db: Session, movement_in: StockMovementCreate, business_id: Optional[str] = None) -> StockMovement:
        query = db.query(Product).filter(Product.id == movement_in.product_id).with_for_update()
        if business_id:
            query = query.filter(Product.business_id == business_id.lower().strip())
        product = query.first()
        if not product:
            raise ValueError(f"Product with ID {movement_in.product_id} not found.")
        if not product.is_active:
            raise ValueError(f"Cannot record movement for archived product '{product.sku}'.")

        mtype = movement_in.movement_type.value if hasattr(movement_in.movement_type, "value") else str(movement_in.movement_type)
        qty = abs(movement_in.quantity)

        # Determine signed stock_delta
        if mtype == MovementTypeEnum.SALE.value:
            stock_delta = -qty
        elif mtype in (MovementTypeEnum.STOCK_RECEIPT.value, MovementTypeEnum.OPENING_STOCK.value):
            stock_delta = qty
        elif mtype == MovementTypeEnum.CUSTOMER_RETURN.value:
            stock_delta = qty
        elif mtype == MovementTypeEnum.DAMAGE_LOSS.value:
            stock_delta = -qty
        elif mtype == MovementTypeEnum.ADJUSTMENT.value:
            if movement_in.stock_delta is not None:
                stock_delta = movement_in.stock_delta
            else:
                stock_delta = qty
        else:
            raise ValueError(f"Unsupported movement type: {mtype}")

        # Determine unit price at transaction time
        unit_price = movement_in.unit_price
        if unit_price is None:
            if mtype == MovementTypeEnum.SALE.value:
                unit_price = product.selling_price
            elif mtype in (MovementTypeEnum.STOCK_RECEIPT.value, MovementTypeEnum.OPENING_STOCK.value):
                unit_price = product.unit_cost
            elif mtype == MovementTypeEnum.CUSTOMER_RETURN.value:
                unit_price = product.selling_price
            elif mtype == MovementTypeEnum.DAMAGE_LOSS.value:
                unit_price = product.unit_cost
            else:
                unit_price = product.selling_price

        # Supplier handling for receipts
        supplier_name = None
        if movement_in.supplier_name and movement_in.supplier_name.strip():
            supplier_name = movement_in.supplier_name.strip()
            if not product.supplier_name:
                product.supplier_name = supplier_name
        elif mtype in (MovementTypeEnum.STOCK_RECEIPT.value, MovementTypeEnum.OPENING_STOCK.value):
            supplier_name = product.supplier_name

        # Check negative stock protection
        previous_stock = product.current_stock
        new_stock = previous_stock + stock_delta
        if new_stock < 0:
            raise ValueError(
                f"Insufficient stock for product '{product.sku}'. Current stock is {product.current_stock}, "
                f"attempted change is {stock_delta} (would result in {new_stock})."
            )

        occurred_at = movement_in.occurred_at or datetime.datetime.utcnow()
        if hasattr(occurred_at, "tzinfo") and occurred_at.tzinfo is not None:
            occurred_at = occurred_at.astimezone(datetime.timezone.utc).replace(tzinfo=None)

        movement = StockMovement(
            business_id=product.business_id,
            product_id=product.id,
            movement_type=mtype,
            quantity=qty,
            stock_delta=stock_delta,
            unit_price=unit_price,
            supplier_name=supplier_name,
            occurred_at=occurred_at,
            reference=movement_in.reference,
            note=movement_in.note,
            source="MANUAL",
            created_at=datetime.datetime.utcnow(),
        )

        # Apply stock delta atomically
        product.current_stock = new_stock
        product.updated_at = datetime.datetime.utcnow()

        db.add(movement)

        audit = AuditEvent(
            event_type="STOCK_MOVEMENT_RECORDED",
            entity_type="PRODUCT",
            entity_id=str(product.id),
            details_json=f'{{"business_id": "{product.business_id}", "movement_type": "{mtype}", "delta": {stock_delta}, "previous_stock": {previous_stock}, "new_stock": {new_stock}, "unit_price": {unit_price}, "occurred_at": "{occurred_at.isoformat()}"}}',
            created_at=datetime.datetime.utcnow(),
        )
        db.add(audit)

        db.commit()
        db.refresh(movement)
        setattr(movement, "previous_stock", previous_stock)
        setattr(movement, "current_stock", new_stock)
        return movement

    @staticmethod
    def restock_product(
        db: Session,
        product_id: int,
        restock_in: Any,
        business_id: str = "freshmart",
    ) -> Dict[str, Any]:
        bid = (business_id or "freshmart").lower().strip()
        product = (
            db.query(Product)
            .filter(Product.id == product_id, Product.business_id == bid)
            .with_for_update()
            .first()
        )
        if not product:
            raise ValueError(f"Product {product_id} not found in workspace '{bid}'.")

        qty = restock_in.quantity
        if qty <= 0:
            raise ValueError("Quantity received must be greater than zero.")

        # Duplicate submission protection
        ref = restock_in.reference.strip() if (restock_in.reference and restock_in.reference.strip()) else None
        if ref:
            five_sec_ago = datetime.datetime.utcnow() - datetime.timedelta(seconds=5)
            duplicate = (
                db.query(StockMovement)
                .filter(
                    StockMovement.business_id == bid,
                    StockMovement.product_id == product.id,
                    StockMovement.movement_type == MovementTypeEnum.STOCK_RECEIPT.value,
                    StockMovement.reference == ref,
                    StockMovement.quantity == qty,
                    StockMovement.created_at >= five_sec_ago,
                )
                .first()
            )
            if duplicate:
                raise ValueError(
                    f"Duplicate receipt detected: Reference '{ref}' was already recorded seconds ago."
                )

        previous_stock = product.current_stock
        new_stock = previous_stock + qty

        # Unit purchase cost
        if restock_in.unit_cost is not None and restock_in.unit_cost >= 0:
            unit_cost = float(restock_in.unit_cost)
        else:
            unit_cost = float(product.unit_cost or 0.0)

        # Supplier
        supplier_name = restock_in.supplier_name.strip() if (restock_in.supplier_name and restock_in.supplier_name.strip()) else product.supplier_name
        if supplier_name and not product.supplier_name:
            product.supplier_name = supplier_name

        occurred_at = restock_in.occurred_at or datetime.datetime.utcnow()
        if hasattr(occurred_at, "tzinfo") and occurred_at.tzinfo is not None:
            occurred_at = occurred_at.astimezone(datetime.timezone.utc).replace(tzinfo=None)

        movement = StockMovement(
            business_id=bid,
            product_id=product.id,
            movement_type=MovementTypeEnum.STOCK_RECEIPT.value,
            quantity=qty,
            stock_delta=qty,
            unit_price=unit_cost,
            supplier_name=supplier_name,
            occurred_at=occurred_at,
            reference=ref,
            note=restock_in.note.strip() if restock_in.note else None,
            source="MANUAL",
            created_at=datetime.datetime.utcnow(),
        )

        product.current_stock = new_stock
        product.updated_at = datetime.datetime.utcnow()

        db.add(movement)

        # Update matching pending/ordered recommendations to RECEIVED
        try:
            from app.models.reorder_recommendation import ReorderRecommendation
            recs = db.query(ReorderRecommendation).filter(
                ReorderRecommendation.product_id == product.id,
                ReorderRecommendation.status.in_(["ORDERED", "PENDING"])
            ).all()
            for r in recs:
                r.status = "RECEIVED"
                r.received_at = datetime.datetime.utcnow()
        except Exception:
            pass

        audit = AuditEvent(
            event_type="STOCK_RESTOCKED",
            entity_type="PRODUCT",
            entity_id=str(product.id),
            details_json=f'{{"business_id": "{bid}", "previous_stock": {previous_stock}, "quantity_received": {qty}, "new_stock": {new_stock}, "unit_cost": {unit_cost}, "occurred_at": "{occurred_at.isoformat()}"}}',
            created_at=datetime.datetime.utcnow(),
        )
        db.add(audit)

        db.commit()
        db.refresh(movement)

        return {
            "product_id": product.id,
            "product_sku": product.sku,
            "product_name": product.name,
            "quantity_received": qty,
            "previous_stock": previous_stock,
            "new_stock": new_stock,
            "unit_cost": unit_cost,
            "total_cost": round(qty * unit_cost, 2),
            "supplier_name": supplier_name,
            "occurred_at": occurred_at,
            "movement_id": movement.id,
            "reference": movement.reference,
            "note": movement.note,
            "message": f"Stock received successfully. Available quantity of '{product.name}' updated from {previous_stock} to {new_stock} units.",
        }

    @staticmethod
    def list_movements(
        db: Session,
        product_id: Optional[int] = None,
        movement_type: Optional[str] = None,
        start_date: Optional[datetime.date] = None,
        end_date: Optional[datetime.date] = None,
        page: int = 1,
        size: int = 50,
        business_id: str = "freshmart",
    ) -> Tuple[List[StockMovement], int]:
        bid = (business_id or "freshmart").lower().strip()
        query = db.query(StockMovement).filter(StockMovement.business_id == bid)
        if product_id:
            query = query.filter(StockMovement.product_id == product_id)
        if movement_type and movement_type.upper() != "ALL":
            query = query.filter(StockMovement.movement_type == movement_type.upper())
        if start_date:
            start_dt = datetime.datetime.combine(start_date, datetime.time.min)
            query = query.filter(StockMovement.occurred_at >= start_dt)
        if end_date:
            end_dt = datetime.datetime.combine(end_date, datetime.time.max)
            query = query.filter(StockMovement.occurred_at <= end_dt)

        total = query.count()
        offset = (page - 1) * size
        items = query.order_by(StockMovement.occurred_at.desc(), StockMovement.id.desc()).offset(offset).limit(size).all()
        return items, total

    @staticmethod
    def get_movements_summary(
        db: Session,
        product_id: Optional[int] = None,
        movement_type: Optional[str] = None,
        start_date: Optional[datetime.date] = None,
        end_date: Optional[datetime.date] = None,
        business_id: str = "freshmart",
    ) -> Dict[str, Any]:
        bid = (business_id or "freshmart").lower().strip()
        query = db.query(StockMovement, Product).join(
            Product, StockMovement.product_id == Product.id
        ).filter(StockMovement.business_id == bid)
        if product_id:
            query = query.filter(StockMovement.product_id == product_id)
        if movement_type and movement_type.upper() != "ALL":
            query = query.filter(StockMovement.movement_type == movement_type.upper())
        if start_date:
            start_dt = datetime.datetime.combine(start_date, datetime.time.min)
            query = query.filter(StockMovement.occurred_at >= start_dt)
        if end_date:
            end_dt = datetime.datetime.combine(end_date, datetime.time.max)
            query = query.filter(StockMovement.occurred_at <= end_dt)

        rows = query.all()
        units_sold = sum(m.quantity for m, _ in rows if m.movement_type == "SALE")
        sales_revenue = sum(
            m.quantity * (m.unit_price if m.unit_price is not None else p.selling_price)
            for m, p in rows if m.movement_type == "SALE"
        )
        units_received = sum(m.quantity for m, _ in rows if m.movement_type in ("STOCK_RECEIPT", "OPENING_STOCK"))
        receipt_cost = sum(
            m.quantity * (m.unit_price if m.unit_price is not None else p.unit_cost)
            for m, p in rows if m.movement_type in ("STOCK_RECEIPT", "OPENING_STOCK")
        )
        net_stock_delta = sum(m.stock_delta for m, _ in rows)

        return {
            "transactions_count": len(rows),
            "units_sold": units_sold,
            "sales_revenue": round(sales_revenue, 2),
            "units_received": units_received,
            "receipt_cost": round(receipt_cost, 2),
            "net_stock_delta": net_stock_delta,
            "currency": "INR",
            "currency_symbol": "₹",
        }

    @staticmethod
    def verify_ledger_consistency(db: Session, product_id: int, business_id: Optional[str] = None) -> Tuple[int, int, bool]:
        """Calculates sum of movement deltas and verifies it matches cached current_stock."""
        query = db.query(Product).filter(Product.id == product_id)
        if business_id:
            query = query.filter(Product.business_id == business_id.lower().strip())
        product = query.first()
        if not product:
            raise ValueError(f"Product {product_id} not found")
        
        sum_delta = db.query(func.coalesce(func.sum(StockMovement.stock_delta), 0)).filter(
            StockMovement.product_id == product_id
        ).scalar()
        
        consistent = (sum_delta == product.current_stock)
        return product.current_stock, sum_delta, consistent
