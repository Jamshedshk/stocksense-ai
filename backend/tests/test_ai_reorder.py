from app.services.inventory_service import InventoryService
from app.ai.prioritization.reorder_engine import ReorderPrioritizationEngine
from app.schemas.product import ProductCreate

def test_reorder_recommendation_and_priority_ranking(db_session):
    # Critical product: stock 1 <= threshold 10, lead time 10 days
    p_crit = InventoryService.create_product(db_session, ProductCreate(
        sku="SKU-CRIT", name="Critical Product", opening_stock=1, unit_cost=50.0, reorder_threshold=10, supplier_lead_time_days=10
    ))
    # Moderate product: stock 40, threshold 5, lead time 3
    p_safe = InventoryService.create_product(db_session, ProductCreate(
        sku="SKU-SAFE", name="Safe Product", opening_stock=40, unit_cost=10.0, reorder_threshold=5, supplier_lead_time_days=3
    ))

    resp = ReorderPrioritizationEngine.generate_recommendations(db_session)
    assert resp.pending_count >= 1
    # Check that p_crit is at the top of recommendations
    top_rec = resp.recommendations[0]
    assert top_rec.sku == "SKU-CRIT"
    assert top_rec.priority_rank == 1
    assert top_rec.suggested_quantity >= 10
    assert top_rec.priority_score > 0

    # Test status update to REVIEWED then ORDERED
    rec_updated = ReorderPrioritizationEngine.update_recommendation_status(
        db_session, top_rec.id, "REVIEWED"
    )
    assert rec_updated.status == "REVIEWED"
    assert rec_updated.reviewed_at is not None
