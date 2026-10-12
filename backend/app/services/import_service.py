import io
import csv
import hashlib
import json
import datetime
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.product import Product
from app.models.stock_movement import StockMovement
from app.models.import_batch import SalesImportBatch
from app.schemas.import_export import CSVPreviewResponse, CSVCommitResponse, CSVRowError
from app.schemas.stock_movement import MovementTypeEnum

class ImportExportService:
    @staticmethod
    def calculate_file_hash(content: bytes) -> str:
        return hashlib.sha256(content).hexdigest()

    # ----------------- PRODUCT CATALOGUE CSV -----------------
    @staticmethod
    def preview_products_csv(content: bytes, filename: str, business_id: str = "freshmart") -> CSVPreviewResponse:
        decoded = content.decode("utf-8", errors="replace")
        reader = csv.DictReader(io.StringIO(decoded))
        
        # Check required columns
        required_cols = {"sku", "name", "category", "opening_stock", "unit_cost", "selling_price", "reorder_threshold", "supplier_lead_time_days"}
        fieldnames = set(col.strip().lower() for col in (reader.fieldnames or []))
        
        errors: List[CSVRowError] = []
        missing = required_cols - fieldnames
        if missing:
            errors.append(CSVRowError(row_number=1, column="header", error=f"Missing required columns: {', '.join(missing)}"))
            return CSVPreviewResponse(
                filename=filename,
                total_rows=0,
                valid_rows=0,
                invalid_rows=0,
                preview_data=[],
                errors=errors,
                is_valid_for_commit=False,
            )

        preview_data: List[Dict[str, Any]] = []
        total_rows = 0
        valid_rows = 0
        seen_skus = set()

        for idx, row in enumerate(reader, start=2):
            total_rows += 1
            row_clean = {k.strip().lower(): (v.strip() if v else "") for k, v in row.items()}
            row_errors = []

            sku = row_clean.get("sku", "")
            if not sku:
                row_errors.append("SKU cannot be empty")
            elif sku.upper() in seen_skus:
                row_errors.append(f"Duplicate SKU '{sku}' found within file")
            else:
                seen_skus.add(sku.upper())

            name = row_clean.get("name", "")
            if not name:
                row_errors.append("Product name cannot be empty")

            # Numeric validations
            for num_col in ("unit_cost", "selling_price"):
                val = row_clean.get(num_col, "")
                try:
                    num_val = float(val)
                    if num_val < 0:
                        row_errors.append(f"{num_col} cannot be negative")
                except ValueError:
                    row_errors.append(f"Invalid float for {num_col}: '{val}'")

            for int_col in ("opening_stock", "reorder_threshold", "supplier_lead_time_days"):
                val = row_clean.get(int_col, "")
                try:
                    num_val = int(val)
                    if num_val < 0:
                        row_errors.append(f"{int_col} cannot be negative")
                except ValueError:
                    row_errors.append(f"Invalid integer for {int_col}: '{val}'")

            if row_errors:
                for err in row_errors:
                    errors.append(CSVRowError(row_number=idx, error=err))
            else:
                valid_rows += 1

            if len(preview_data) < 10:
                preview_data.append({
                    "row_number": idx,
                    "sku": sku,
                    "name": name,
                    "category": row_clean.get("category", ""),
                    "opening_stock": row_clean.get("opening_stock", ""),
                    "unit_cost": row_clean.get("unit_cost", ""),
                    "selling_price": row_clean.get("selling_price", ""),
                    "reorder_threshold": row_clean.get("reorder_threshold", ""),
                    "supplier_lead_time_days": row_clean.get("supplier_lead_time_days", ""),
                    "supplier_name": row_clean.get("supplier_name", ""),
                    "errors": row_errors,
                })

        return CSVPreviewResponse(
            filename=filename,
            total_rows=total_rows,
            valid_rows=valid_rows,
            invalid_rows=total_rows - valid_rows,
            preview_data=preview_data,
            errors=errors,
            is_valid_for_commit=(len(errors) == 0 and total_rows > 0),
        )

    @staticmethod
    def commit_products_csv(db: Session, content: bytes, filename: str, business_id: str = "freshmart") -> CSVCommitResponse:
        bid = (business_id or "freshmart").lower().strip()
        file_hash = ImportExportService.calculate_file_hash(content)

        # Check for duplicate batch for this business
        existing_batch = db.query(SalesImportBatch).filter(
            SalesImportBatch.business_id == bid,
            SalesImportBatch.file_hash == file_hash,
            SalesImportBatch.status == "COMPLETED"
        ).first()
        if existing_batch:
            raise ValueError(f"This file was already imported on {existing_batch.imported_at.strftime('%Y-%m-%d %H:%M:%S')} (Batch ID: {existing_batch.id}).")

        preview = ImportExportService.preview_products_csv(content, filename, business_id=bid)
        if not preview.is_valid_for_commit:
            raise ValueError(f"Cannot commit invalid CSV. Found {len(preview.errors)} validation errors.")

        decoded = content.decode("utf-8", errors="replace")
        reader = csv.DictReader(io.StringIO(decoded))

        batch = SalesImportBatch(
            business_id=bid,
            batch_type="PRODUCTS",
            filename=filename,
            imported_at=datetime.datetime.utcnow(),
            status="PENDING",
            rows_total=preview.total_rows,
            rows_imported=0,
            rows_rejected=0,
            file_hash=file_hash,
        )
        db.add(batch)
        db.flush()

        imported_count = 0
        rejected_count = 0
        errors: List[CSVRowError] = []

        for idx, row in enumerate(reader, start=2):
            row_clean = {k.strip().lower(): (v.strip() if v else "") for k, v in row.items()}
            sku = row_clean["sku"].upper()

            # Check if SKU already in database for this business
            if db.query(Product).filter(
                Product.business_id == bid,
                func.lower(Product.sku) == sku.lower()
            ).first():
                errors.append(CSVRowError(row_number=idx, column="sku", value=sku, error=f"SKU already exists in workspace '{bid}'"))
                rejected_count += 1
                continue

            opening_stock = int(row_clean.get("opening_stock", 0) or 0)
            product = Product(
                business_id=bid,
                sku=sku,
                name=row_clean.get("name", ""),
                category=row_clean.get("category", "Uncategorized") or "Uncategorized",
                description=row_clean.get("description", ""),
                unit_cost=float(row_clean.get("unit_cost", 0.0) or 0.0),
                selling_price=float(row_clean.get("selling_price", 0.0) or 0.0),
                reorder_threshold=int(row_clean.get("reorder_threshold", 5) or 5),
                supplier_lead_time_days=int(row_clean.get("supplier_lead_time_days", 7) or 7),
                supplier_name=row_clean.get("supplier_name", ""),
                supplier_contact=row_clean.get("supplier_contact", ""),
                current_stock=opening_stock,
                is_active=True,
                created_at=datetime.datetime.utcnow(),
                updated_at=datetime.datetime.utcnow(),
            )
            db.add(product)
            db.flush()

            if opening_stock > 0:
                movement = StockMovement(
                    business_id=bid,
                    product_id=product.id,
                    movement_type=MovementTypeEnum.STOCK_RECEIPT.value,
                    quantity=opening_stock,
                    stock_delta=opening_stock,
                    occurred_at=datetime.datetime.utcnow(),
                    reference="OPENING_STOCK",
                    note=f"Opening stock from CSV import batch {batch.id}",
                    source="CSV_IMPORT",
                    import_batch_id=batch.id,
                    created_at=datetime.datetime.utcnow(),
                )
                db.add(movement)

            imported_count += 1

        batch.rows_imported = imported_count
        batch.rows_rejected = rejected_count
        batch.status = "COMPLETED"
        if errors:
            batch.error_report_json = json.dumps([e.model_dump() for e in errors])

        db.commit()

        return CSVCommitResponse(
            batch_id=batch.id,
            batch_type="PRODUCTS",
            filename=filename,
            total_rows=preview.total_rows,
            rows_imported=imported_count,
            rows_rejected=rejected_count,
            status="COMPLETED",
            errors=errors,
        )

    # ----------------- HISTORICAL SALES CSV -----------------
    @staticmethod
    def preview_sales_csv(db: Session, content: bytes, filename: str, business_id: str = "freshmart") -> CSVPreviewResponse:
        bid = (business_id or "freshmart").lower().strip()
        decoded = content.decode("utf-8", errors="replace")
        reader = csv.DictReader(io.StringIO(decoded))

        required_cols = {"occurred_at", "sku", "quantity", "transaction_type"}
        fieldnames = set(col.strip().lower() for col in (reader.fieldnames or []))

        errors: List[CSVRowError] = []
        missing = required_cols - fieldnames
        if missing:
            errors.append(CSVRowError(row_number=1, column="header", error=f"Missing required columns: {', '.join(missing)}"))
            return CSVPreviewResponse(
                filename=filename,
                total_rows=0,
                valid_rows=0,
                invalid_rows=0,
                preview_data=[],
                errors=errors,
                is_valid_for_commit=False,
            )

        preview_data: List[Dict[str, Any]] = []
        total_rows = 0
        valid_rows = 0
        valid_types = {e.value for e in MovementTypeEnum}

        # Cache existing SKUs from DB for this business
        existing_skus = {s[0].upper(): s[1] for s in db.query(Product.sku, Product.current_stock).filter(Product.business_id == bid).all()}

        for idx, row in enumerate(reader, start=2):
            total_rows += 1
            row_clean = {k.strip().lower(): (v.strip() if v else "") for k, v in row.items()}
            row_errors = []

            sku = row_clean.get("sku", "").upper()
            if not sku:
                row_errors.append("SKU is required")
            elif sku not in existing_skus:
                row_errors.append(f"SKU '{sku}' does not exist in workspace '{bid}' product catalogue")

            # Check occurred_at
            occ_str = row_clean.get("occurred_at", "")
            try:
                for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d-%m-%Y %H:%M", "%m/%d/%Y %H:%M"):
                    try:
                        datetime.datetime.strptime(occ_str, fmt)
                        break
                    except ValueError:
                        pass
                else:
                    datetime.datetime.fromisoformat(occ_str)
            except Exception:
                row_errors.append(f"Invalid date/time format for occurred_at: '{occ_str}'")

            # Quantity
            try:
                qty = int(row_clean.get("quantity", 0))
                if qty <= 0:
                    row_errors.append(f"Quantity must be positive integer (> 0), got {qty}")
            except ValueError:
                row_errors.append(f"Invalid integer for quantity: '{row_clean.get('quantity')}'")

            # Transaction type
            ttype = row_clean.get("transaction_type", "").upper()
            if ttype not in valid_types:
                row_errors.append(f"Invalid transaction_type '{ttype}'. Must be one of: {', '.join(valid_types)}")

            if row_errors:
                for err in row_errors:
                    errors.append(CSVRowError(row_number=idx, error=err))
            else:
                valid_rows += 1

            if len(preview_data) < 10:
                preview_data.append({
                    "row_number": idx,
                    "transaction_id": row_clean.get("transaction_id", ""),
                    "occurred_at": occ_str,
                    "sku": sku,
                    "quantity": row_clean.get("quantity"),
                    "unit_price": row_clean.get("unit_price", ""),
                    "transaction_type": ttype,
                    "errors": row_errors,
                })

        return CSVPreviewResponse(
            filename=filename,
            total_rows=total_rows,
            valid_rows=valid_rows,
            invalid_rows=total_rows - valid_rows,
            preview_data=preview_data,
            errors=errors,
            is_valid_for_commit=(len(errors) == 0 and total_rows > 0),
        )

    @staticmethod
    def commit_sales_csv(db: Session, content: bytes, filename: str, business_id: str = "freshmart") -> CSVCommitResponse:
        bid = (business_id or "freshmart").lower().strip()
        file_hash = ImportExportService.calculate_file_hash(content)

        existing_batch = db.query(SalesImportBatch).filter(
            SalesImportBatch.business_id == bid,
            SalesImportBatch.file_hash == file_hash,
            SalesImportBatch.status == "COMPLETED"
        ).first()
        if existing_batch:
            raise ValueError(f"This sales file was already imported on {existing_batch.imported_at.strftime('%Y-%m-%d %H:%M:%S')} (Batch ID: {existing_batch.id}).")

        preview = ImportExportService.preview_sales_csv(db, content, filename, business_id=bid)
        if not preview.is_valid_for_commit:
            raise ValueError(f"Cannot commit invalid sales CSV. Found {len(preview.errors)} errors.")

        decoded = content.decode("utf-8", errors="replace")
        reader = csv.DictReader(io.StringIO(decoded))

        batch = SalesImportBatch(
            business_id=bid,
            batch_type="SALES",
            filename=filename,
            imported_at=datetime.datetime.utcnow(),
            status="PENDING",
            rows_total=preview.total_rows,
            rows_imported=0,
            rows_rejected=0,
            file_hash=file_hash,
        )
        db.add(batch)
        db.flush()

        imported_count = 0
        rejected_count = 0
        errors: List[CSVRowError] = []

        # Map SKUs to products in this business
        products_by_sku = {p.sku.upper(): p for p in db.query(Product).filter(Product.business_id == bid).all()}

        for idx, row in enumerate(reader, start=2):
            row_clean = {k.strip().lower(): (v.strip() if v else "") for k, v in row.items()}
            sku = row_clean["sku"].upper()
            product = products_by_sku.get(sku)
            if not product:
                errors.append(CSVRowError(row_number=idx, error=f"SKU {sku} not found"))
                rejected_count += 1
                continue

            qty = int(row_clean["quantity"])
            ttype = row_clean["transaction_type"].upper()
            
            # Signed delta
            if ttype == MovementTypeEnum.SALE.value:
                delta = -qty
            elif ttype in (MovementTypeEnum.STOCK_RECEIPT.value, MovementTypeEnum.CUSTOMER_RETURN.value):
                delta = qty
            elif ttype == MovementTypeEnum.DAMAGE_LOSS.value:
                delta = -qty
            elif ttype == MovementTypeEnum.ADJUSTMENT.value:
                delta = qty
            else:
                delta = -qty

            # Parse occurred_at
            occ_str = row_clean["occurred_at"]
            occ_dt = None
            for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d-%m-%Y %H:%M", "%m/%d/%Y %H:%M"):
                try:
                    occ_dt = datetime.datetime.strptime(occ_str, fmt)
                    break
                except ValueError:
                    pass
            if not occ_dt:
                occ_dt = datetime.datetime.fromisoformat(occ_str)

            movement = StockMovement(
                business_id=bid,
                product_id=product.id,
                movement_type=ttype,
                quantity=qty,
                stock_delta=delta,
                occurred_at=occ_dt,
                reference=row_clean.get("transaction_id") or f"CSV-TX-{idx}",
                note=f"Imported from {filename}",
                source="CSV_IMPORT",
                import_batch_id=batch.id,
                created_at=datetime.datetime.utcnow(),
            )
            db.add(movement)

            # Apply stock delta
            product.current_stock = max(0, product.current_stock + delta)
            product.updated_at = datetime.datetime.utcnow()

            imported_count += 1

        batch.rows_imported = imported_count
        batch.rows_rejected = rejected_count
        batch.status = "COMPLETED"
        if errors:
            batch.error_report_json = json.dumps([e.model_dump() for e in errors])

        db.commit()

        return CSVCommitResponse(
            batch_id=batch.id,
            batch_type="SALES",
            filename=filename,
            total_rows=preview.total_rows,
            rows_imported=imported_count,
            rows_rejected=rejected_count,
            status="COMPLETED",
            errors=errors,
        )

    # ----------------- CSV EXPORTS -----------------
    @staticmethod
    def export_inventory_csv(db: Session, business_id: str = "freshmart") -> str:
        bid = (business_id or "freshmart").lower().strip()
        products = db.query(Product).filter(Product.business_id == bid).order_by(Product.sku.asc()).all()
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["sku", "name", "category", "current_stock", "unit_cost", "selling_price", "reorder_threshold", "supplier_lead_time_days", "supplier_name", "status", "created_at"])
        for p in products:
            writer.writerow([
                p.sku,
                p.name,
                p.category,
                p.current_stock,
                f"{p.unit_cost:.2f}",
                f"{p.selling_price:.2f}",
                p.reorder_threshold,
                p.supplier_lead_time_days,
                p.supplier_name or "",
                "Active" if p.is_active else "Archived",
                p.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            ])
        return output.getvalue()

    @staticmethod
    def export_movements_csv(
        db: Session,
        business_id: str = "freshmart",
        start_date: Optional[datetime.date] = None,
        end_date: Optional[datetime.date] = None,
    ) -> str:
        bid = (business_id or "freshmart").lower().strip()
        query = db.query(StockMovement, Product).join(
            Product, StockMovement.product_id == Product.id
        ).filter(
            StockMovement.business_id == bid
        )
        if start_date:
            query = query.filter(StockMovement.occurred_at >= datetime.datetime.combine(start_date, datetime.time.min))
        if end_date:
            query = query.filter(StockMovement.occurred_at <= datetime.datetime.combine(end_date, datetime.time.max))

        movements = query.order_by(StockMovement.occurred_at.desc(), StockMovement.id.desc()).all()
        
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "movement_id", "occurred_at", "sku", "product_name", "movement_type",
            "quantity", "stock_delta", "unit_price_inr", "total_amount_inr",
            "supplier_name", "reference", "source", "note", "created_at"
        ])
        for m, p in movements:
            u_price = m.unit_price if m.unit_price is not None else (p.selling_price if m.movement_type == "SALE" else p.unit_cost)
            tot_amt = round(abs(m.quantity) * u_price, 2)
            writer.writerow([
                m.id,
                m.occurred_at.strftime("%Y-%m-%d %H:%M:%S"),
                p.sku,
                p.name,
                m.movement_type,
                m.quantity,
                m.stock_delta,
                f"{u_price:.2f}",
                f"{tot_amt:.2f}",
                m.supplier_name or (p.supplier_name if m.movement_type == "STOCK_RECEIPT" else "") or "",
                m.reference or "",
                m.source,
                m.note or "",
                m.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            ])
        return output.getvalue()
