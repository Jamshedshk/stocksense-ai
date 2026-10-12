import pytest
from app.services.inventory_service import InventoryService
from app.schemas.product import ProductCreate, ProductUpdate
from app.schemas.stock_movement import StockMovementCreate, MovementTypeEnum
from app.models.product import Product
from app.models.stock_movement import StockMovement

def test_create_product_with_opening_stock(db_session):
    prod_in = ProductCreate(
        sku="SKU-TEST-001",
        name="Test Keyboard",
        category="Electronics",
        opening_stock=25,
        unit_cost=30.0,
        selling_price=50.0,
        reorder_threshold=5,
        supplier_lead_time_days=7,
    )
    product = InventoryService.create_product(db_session, prod_in)
    
    assert product.id is not None
    assert product.sku == "SKU-TEST-001"
    assert product.current_stock == 25

    # Check opening movement was created
    movements = db_session.query(StockMovement).filter(StockMovement.product_id == product.id).all()
    assert len(movements) == 1
    assert movements[0].movement_type == MovementTypeEnum.STOCK_RECEIPT.value
    assert movements[0].quantity == 25
    assert movements[0].stock_delta == 25
    assert movements[0].reference == "OPENING_STOCK"

    # Verify ledger consistency
    cached, sum_delta, is_consistent = InventoryService.verify_ledger_consistency(db_session, product.id)
    assert cached == 25
    assert sum_delta == 25
    assert is_consistent is True

def test_reject_duplicate_sku(db_session):
    prod_in = ProductCreate(
        sku="SKU-DUP",
        name="Item 1",
        opening_stock=10,
    )
    InventoryService.create_product(db_session, prod_in)

    with pytest.raises(ValueError, match="already exists"):
        InventoryService.create_product(db_session, prod_in)

def test_record_sale_reduces_stock_atomically(db_session):
    prod_in = ProductCreate(sku="SKU-SALE", name="Sale Item", opening_stock=20)
    product = InventoryService.create_product(db_session, prod_in)

    sale_in = StockMovementCreate(
        product_id=product.id,
        movement_type=MovementTypeEnum.SALE,
        quantity=5,
        reference="INV-1001",
    )
    movement = InventoryService.record_movement(db_session, sale_in)

    assert movement.quantity == 5
    assert movement.stock_delta == -5
    
    # Reload product
    db_session.refresh(product)
    assert product.current_stock == 15

    # Verify ledger consistency
    cached, sum_delta, is_consistent = InventoryService.verify_ledger_consistency(db_session, product.id)
    assert cached == 15
    assert sum_delta == 15
    assert is_consistent is True

def test_reject_sale_exceeding_stock(db_session):
    prod_in = ProductCreate(sku="SKU-LOW", name="Low Stock Item", opening_stock=3)
    product = InventoryService.create_product(db_session, prod_in)

    sale_in = StockMovementCreate(
        product_id=product.id,
        movement_type=MovementTypeEnum.SALE,
        quantity=10,
    )

    with pytest.raises(ValueError, match="Insufficient stock"):
        InventoryService.record_movement(db_session, sale_in)

    db_session.refresh(product)
    assert product.current_stock == 3

def test_record_stock_receipt_increases_stock(db_session):
    prod_in = ProductCreate(sku="SKU-RECV", name="Receiving Item", opening_stock=10)
    product = InventoryService.create_product(db_session, prod_in)

    recv_in = StockMovementCreate(
        product_id=product.id,
        movement_type=MovementTypeEnum.STOCK_RECEIPT,
        quantity=15,
        reference="PO-501",
    )
    movement = InventoryService.record_movement(db_session, recv_in)
    assert movement.stock_delta == 15

    db_session.refresh(product)
    assert product.current_stock == 25

def test_damage_loss_and_return(db_session):
    prod_in = ProductCreate(sku="SKU-FLOW", name="Flow Item", opening_stock=10)
    product = InventoryService.create_product(db_session, prod_in)

    # Damage loss of 2
    loss_in = StockMovementCreate(
        product_id=product.id,
        movement_type=MovementTypeEnum.DAMAGE_LOSS,
        quantity=2,
    )
    InventoryService.record_movement(db_session, loss_in)
    db_session.refresh(product)
    assert product.current_stock == 8

    # Customer return of 1
    return_in = StockMovementCreate(
        product_id=product.id,
        movement_type=MovementTypeEnum.CUSTOMER_RETURN,
        quantity=1,
    )
    InventoryService.record_movement(db_session, return_in)
    db_session.refresh(product)
    assert product.current_stock == 9

    # Verify ledger consistency
    cached, sum_delta, is_consistent = InventoryService.verify_ledger_consistency(db_session, product.id)
    assert cached == 9
    assert sum_delta == 9
    assert is_consistent is True
