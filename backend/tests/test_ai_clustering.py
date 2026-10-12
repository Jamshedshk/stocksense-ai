from app.services.inventory_service import InventoryService
from app.ai.clustering.engine import ProductClusteringEngine
from app.schemas.product import ProductCreate

def test_clustering_with_products(db_session):
    # Create products with varying stock and costs
    for i in range(6):
        InventoryService.create_product(db_session, ProductCreate(
            sku=f"SKU-CLUST-{i}",
            name=f"Cluster Item {i}",
            opening_stock=10 * (i + 1),
            unit_cost=5.0 * (i + 1),
            reorder_threshold=5,
        ))

    resp = ProductClusteringEngine.analyze_clusters(db_session, n_clusters=3)
    assert resp.total_products == 6
    assert len(resp.clusters) == 3
    assert len(resp.products) == 6

    # Verify cluster summaries contain calculated averages
    for c in resp.clusters:
        assert c.name != ""
        assert c.description != ""
        assert c.avg_stock_value >= 0.0
