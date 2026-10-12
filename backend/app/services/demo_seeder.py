import os
import csv
import datetime
from typing import Dict, List, Any
from sqlalchemy.orm import Session
from app.models.product import Product
from app.models.stock_movement import StockMovement
from app.models.reorder_recommendation import ReorderRecommendation
from app.models.forecast_run import ForecastRun
from app.models.import_batch import SalesImportBatch
from app.models.audit_event import AuditEvent
from app.core.security import DEMO_BUSINESSES

DEMO_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../data/demo"))

# 1. FreshMart Grocery (INR prices)
FRESHMART_PRODUCTS = [
    {"sku": "FMG-RIC-01", "name": "Daawat Rozana Basmati Rice 5kg", "category": "Grains & Flours", "opening_stock": 45, "unit_cost": 320.0, "selling_price": 425.0, "reorder_threshold": 15, "supplier_lead_time_days": 4, "supplier_name": "Punjab Agro Mills", "supplier_contact": "orders@punbagro.in"},
    {"sku": "FMG-ATT-02", "name": "Aashirvaad Sharbati Atta 10kg", "category": "Grains & Flours", "opening_stock": 50, "unit_cost": 380.0, "selling_price": 460.0, "reorder_threshold": 20, "supplier_lead_time_days": 3, "supplier_name": "ITC Agro Supplies", "supplier_contact": "supply@itcagro.in"},
    {"sku": "FMG-OIL-03", "name": "Fortune Sunlite Refined Oil 1L", "category": "Oils & Spices", "opening_stock": 60, "unit_cost": 120.0, "selling_price": 148.0, "reorder_threshold": 20, "supplier_lead_time_days": 3, "supplier_name": "Adani Wilmar Dist", "supplier_contact": "dist@adaniwilmar.in"},
    {"sku": "FMG-SLT-04", "name": "Tata Salt Vacuum Evaporated 1kg", "category": "Oils & Spices", "opening_stock": 80, "unit_cost": 20.0, "selling_price": 28.0, "reorder_threshold": 25, "supplier_lead_time_days": 2, "supplier_name": "Tata Consumer Direct", "supplier_contact": "trade@tataconsumer.in"},
    {"sku": "FMG-MAS-05", "name": "Everest Garam Masala 100g", "category": "Oils & Spices", "opening_stock": 40, "unit_cost": 65.0, "selling_price": 88.0, "reorder_threshold": 12, "supplier_lead_time_days": 4, "supplier_name": "Everest Spices Ltd", "supplier_contact": "sales@everestspices.in"},
    {"sku": "FMG-MAG-06", "name": "Maggi 2-Minute Noodles (Pack of 12)", "category": "Packaged Foods", "opening_stock": 70, "unit_cost": 130.0, "selling_price": 168.0, "reorder_threshold": 25, "supplier_lead_time_days": 3, "supplier_name": "Nestle India Wholesale", "supplier_contact": "wholesale@nestle.in"},
    {"sku": "FMG-GHE-07", "name": "Amul Pure Cow Ghee 1L Tin", "category": "Dairy & Beverages", "opening_stock": 30, "unit_cost": 540.0, "selling_price": 640.0, "reorder_threshold": 10, "supplier_lead_time_days": 5, "supplier_name": "Gujarat Co-op Milk (Amul)", "supplier_contact": "orders@amul.coop"},
    {"sku": "FMG-TEA-08", "name": "Tata Tea Gold 500g Pouch", "category": "Dairy & Beverages", "opening_stock": 45, "unit_cost": 260.0, "selling_price": 330.0, "reorder_threshold": 15, "supplier_lead_time_days": 4, "supplier_name": "Tata Consumer Direct", "supplier_contact": "trade@tataconsumer.in"},
    {"sku": "FMG-YOG-09", "name": "Epigamia Greek Yogurt (Pack of 4)", "category": "Dairy & Beverages", "opening_stock": 18, "unit_cost": 150.0, "selling_price": 200.0, "reorder_threshold": 8, "supplier_lead_time_days": 2, "supplier_name": "Drums Food Wholesale", "supplier_contact": "dairy@epigamia.in"},
    {"sku": "FMG-BIS-10", "name": "Parle-G Gold Biscuits 1kg Pack", "category": "Packaged Foods", "opening_stock": 90, "unit_cost": 95.0, "selling_price": 125.0, "reorder_threshold": 30, "supplier_lead_time_days": 2, "supplier_name": "Parle Products Hub", "supplier_contact": "orders@parle.biz"},
    {"sku": "FMG-DET-11", "name": "Surf Excel Matic Liquid Detergent 1L", "category": "Household Staples", "opening_stock": 35, "unit_cost": 185.0, "selling_price": 240.0, "reorder_threshold": 12, "supplier_lead_time_days": 4, "supplier_name": "HUL FMCG Supply", "supplier_contact": "fmcg@hul.in"},
    {"sku": "FMG-ANT-12", "name": "Dettol Antiseptic Liquid 550ml", "category": "Household Staples", "opening_stock": 25, "unit_cost": 165.0, "selling_price": 210.0, "reorder_threshold": 10, "supplier_lead_time_days": 3, "supplier_name": "Reckitt Benckiser Hub", "supplier_contact": "health@reckitt.in"},
]

# 2. UrbanThread Fashion (INR prices)
URBANTHREAD_PRODUCTS = [
    {"sku": "UTF-TEE-01", "name": "Classic Crewneck Cotton T-Shirt (Navy, M)", "category": "T-Shirts & Polos", "opening_stock": 40, "unit_cost": 280.0, "selling_price": 599.0, "reorder_threshold": 15, "supplier_lead_time_days": 6, "supplier_name": "Tirupur Knitwear Works", "supplier_contact": "orders@tirupurknit.in"},
    {"sku": "UTF-POL-02", "name": "Pique Polo T-Shirt (Burgundy, L)", "category": "T-Shirts & Polos", "opening_stock": 35, "unit_cost": 450.0, "selling_price": 999.0, "reorder_threshold": 12, "supplier_lead_time_days": 6, "supplier_name": "Tirupur Knitwear Works", "supplier_contact": "orders@tirupurknit.in"},
    {"sku": "UTF-JNS-03", "name": "Slim Fit Indigo Stretch Jeans (32)", "category": "Jeans & Trousers", "opening_stock": 25, "unit_cost": 850.0, "selling_price": 1899.0, "reorder_threshold": 10, "supplier_lead_time_days": 8, "supplier_name": "DenimCraft Mills Surat", "supplier_contact": "sales@denimcraft.in"},
    {"sku": "UTF-CHN-04", "name": "Relaxed Fit Chinos (Beige, 34)", "category": "Jeans & Trousers", "opening_stock": 28, "unit_cost": 720.0, "selling_price": 1599.0, "reorder_threshold": 10, "supplier_lead_time_days": 7, "supplier_name": "DenimCraft Mills Surat", "supplier_contact": "sales@denimcraft.in"},
    {"sku": "UTF-SHT-05", "name": "Pure Linen Casual Shirt (White, L)", "category": "T-Shirts & Polos", "opening_stock": 20, "unit_cost": 800.0, "selling_price": 1799.0, "reorder_threshold": 8, "supplier_lead_time_days": 9, "supplier_name": "LinenFab Ahmedabad", "supplier_contact": "linen@fabrics.in"},
    {"sku": "UTF-KUR-06", "name": "Handblock Printed Cotton Kurti (Teal, M)", "category": "Ethnic & Casual Wear", "opening_stock": 30, "unit_cost": 600.0, "selling_price": 1299.0, "reorder_threshold": 10, "supplier_lead_time_days": 8, "supplier_name": "Jaipur Handlooms Co", "supplier_contact": "jaipur@handlooms.in"},
    {"sku": "UTF-JKT-07", "name": "Classic Denim Jacket (Washed Blue, L)", "category": "Jackets & Outerwear", "opening_stock": 14, "unit_cost": 1200.0, "selling_price": 2499.0, "reorder_threshold": 6, "supplier_lead_time_days": 10, "supplier_name": "UrbanDenim Apparels", "supplier_contact": "trade@urbandenim.in"},
    {"sku": "UTF-BOM-08", "name": "Lightweight Bomber Jacket (Olive, XL)", "category": "Jackets & Outerwear", "opening_stock": 12, "unit_cost": 1400.0, "selling_price": 2899.0, "reorder_threshold": 5, "supplier_lead_time_days": 11, "supplier_name": "UrbanDenim Apparels", "supplier_contact": "trade@urbandenim.in"},
    {"sku": "UTF-BLT-09", "name": "Genuine Leather Reversible Belt (Black/Tan)", "category": "Fashion Accessories", "opening_stock": 45, "unit_cost": 350.0, "selling_price": 799.0, "reorder_threshold": 15, "supplier_lead_time_days": 5, "supplier_name": "Kanpur Leather Guild", "supplier_contact": "leather@kanpurguild.in"},
    {"sku": "UTF-TRS-10", "name": "Formal Wool Blend Trousers (Charcoal, 32)", "category": "Jeans & Trousers", "opening_stock": 18, "unit_cost": 950.0, "selling_price": 2199.0, "reorder_threshold": 8, "supplier_lead_time_days": 9, "supplier_name": "Raymond Textile Agent", "supplier_contact": "textiles@raymond.in"},
    {"sku": "UTF-DRS-11", "name": "Bohemian Printed Maxi Dress (Floral, S)", "category": "Ethnic & Casual Wear", "opening_stock": 16, "unit_cost": 900.0, "selling_price": 1999.0, "reorder_threshold": 6, "supplier_lead_time_days": 8, "supplier_name": "Jaipur Handlooms Co", "supplier_contact": "jaipur@handlooms.in"},
    {"sku": "UTF-BAK-12", "name": "Minimalist Canvas City Backpack", "category": "Fashion Accessories", "opening_stock": 22, "unit_cost": 550.0, "selling_price": 1299.0, "reorder_threshold": 8, "supplier_lead_time_days": 6, "supplier_name": "Leathercraft Accessories", "supplier_contact": "bags@leathercraft.in"},
]

# 3. TechNest Electronics (INR prices)
TECHNEST_PRODUCTS = [
    {"sku": "TNE-KBD-01", "name": "Wireless RGB Mechanical Keyboard", "category": "Keyboards & Mice", "opening_stock": 25, "unit_cost": 1650.0, "selling_price": 2999.0, "reorder_threshold": 8, "supplier_lead_time_days": 6, "supplier_name": "KeyTech Peripherals", "supplier_contact": "keytech@peripherals.in"},
    {"sku": "TNE-MOS-02", "name": "Precision Ergonomic Silent Mouse", "category": "Keyboards & Mice", "opening_stock": 40, "unit_cost": 580.0, "selling_price": 1199.0, "reorder_threshold": 12, "supplier_lead_time_days": 5, "supplier_name": "KeyTech Peripherals", "supplier_contact": "keytech@peripherals.in"},
    {"sku": "TNE-HDP-03", "name": "Active Noise Cancelling Wireless Headphones", "category": "Audio & Headphones", "opening_stock": 15, "unit_cost": 2100.0, "selling_price": 3999.0, "reorder_threshold": 6, "supplier_lead_time_days": 8, "supplier_name": "AcousticSound India", "supplier_contact": "audio@acousticsound.in"},
    {"sku": "TNE-EAR-04", "name": "True Wireless Earbuds with Dual Mic ENC", "category": "Audio & Headphones", "opening_stock": 35, "unit_cost": 950.0, "selling_price": 1899.0, "reorder_threshold": 10, "supplier_lead_time_days": 6, "supplier_name": "AcousticSound India", "supplier_contact": "audio@acousticsound.in"},
    {"sku": "TNE-CHG-05", "name": "65W GaN Dual USB-C Fast Charger", "category": "Cables & Adapters", "opening_stock": 45, "unit_cost": 850.0, "selling_price": 1599.0, "reorder_threshold": 15, "supplier_lead_time_days": 5, "supplier_name": "VoltPower Tech", "supplier_contact": "orders@voltpower.in"},
    {"sku": "TNE-CBL-06", "name": "Braided Nylon Type-C Fast Cable (2m)", "category": "Cables & Adapters", "opening_stock": 80, "unit_cost": 180.0, "selling_price": 399.0, "reorder_threshold": 25, "supplier_lead_time_days": 4, "supplier_name": "VoltPower Tech", "supplier_contact": "orders@voltpower.in"},
    {"sku": "TNE-SSD-07", "name": "1TB High-Speed Portable NVMe SSD", "category": "Storage & Drives", "opening_stock": 12, "unit_cost": 4200.0, "selling_price": 6999.0, "reorder_threshold": 5, "supplier_lead_time_days": 10, "supplier_name": "SiliconDrive Solutions", "supplier_contact": "storage@silicondrive.in"},
    {"sku": "TNE-HUB-08", "name": "7-in-1 Aluminum USB-C Hub / Adapter", "category": "Computer Accessories", "opening_stock": 30, "unit_cost": 1100.0, "selling_price": 2199.0, "reorder_threshold": 10, "supplier_lead_time_days": 6, "supplier_name": "PortPro Hardware", "supplier_contact": "hubs@portpro.in"},
    {"sku": "TNE-CAM-09", "name": "Full HD 1080p Streaming Webcam with Mic", "category": "Computer Accessories", "opening_stock": 20, "unit_cost": 1250.0, "selling_price": 2399.0, "reorder_threshold": 7, "supplier_lead_time_days": 7, "supplier_name": "VisionTech Devices", "supplier_contact": "webcams@visiontech.in"},
    {"sku": "TNE-STN-10", "name": "Ergonomic Aluminum Laptop Stand", "category": "Computer Accessories", "opening_stock": 35, "unit_cost": 480.0, "selling_price": 999.0, "reorder_threshold": 12, "supplier_lead_time_days": 5, "supplier_name": "ErgoDesk Hardware", "supplier_contact": "stands@ergodesk.in"},
    {"sku": "TNE-PAD-11", "name": "Extended Water-Resistant Gaming Desk Pad", "category": "Computer Accessories", "opening_stock": 50, "unit_cost": 290.0, "selling_price": 649.0, "reorder_threshold": 15, "supplier_lead_time_days": 4, "supplier_name": "DeskCraft Accessories", "supplier_contact": "pads@deskcraft.in"},
    {"sku": "TNE-USB-12", "name": "64GB USB 3.2 Dual Flash Drive", "category": "Storage & Drives", "opening_stock": 65, "unit_cost": 340.0, "selling_price": 699.0, "reorder_threshold": 20, "supplier_lead_time_days": 5, "supplier_name": "SiliconDrive Solutions", "supplier_contact": "storage@silicondrive.in"},
]

# 4. HomeEase Supplies (INR prices)
HOMEEASE_PRODUCTS = [
    {"sku": "HES-KDH-01", "name": "Tri-Ply Stainless Steel Kadhai with Lid (2.5L)", "category": "Kitchen Accessories", "opening_stock": 22, "unit_cost": 1150.0, "selling_price": 2299.0, "reorder_threshold": 8, "supplier_lead_time_days": 7, "supplier_name": "Vinod Steel Mills", "supplier_contact": "cookware@vinodsteel.in"},
    {"sku": "HES-TWA-02", "name": "Hard Anodized Non-Stick Dosa Tawa 28cm", "category": "Kitchen Accessories", "opening_stock": 35, "unit_cost": 480.0, "selling_price": 999.0, "reorder_threshold": 10, "supplier_lead_time_days": 6, "supplier_name": "Vinod Steel Mills", "supplier_contact": "cookware@vinodsteel.in"},
    {"sku": "HES-MOP-03", "name": "Microfiber Spray Mop with Extra Washable Pads", "category": "Cleaning Supplies", "opening_stock": 30, "unit_cost": 520.0, "selling_price": 999.0, "reorder_threshold": 10, "supplier_lead_time_days": 5, "supplier_name": "CleanPro Tools Ltd", "supplier_contact": "clean@cleanpro.in"},
    {"sku": "HES-JAR-04", "name": "Modular Airtight Kitchen Containers (Set of 6)", "category": "Storage & Organizers", "opening_stock": 40, "unit_cost": 360.0, "selling_price": 699.0, "reorder_threshold": 15, "supplier_lead_time_days": 5, "supplier_name": "PlastoCraft Domestic", "supplier_contact": "containers@plastocraft.in"},
    {"sku": "HES-RCK-05", "name": "Multi-Tier Heavy Duty Metal Shoe Rack", "category": "Storage & Organizers", "opening_stock": 18, "unit_cost": 650.0, "selling_price": 1299.0, "reorder_threshold": 6, "supplier_lead_time_days": 8, "supplier_name": "HomeFurnish Hardware", "supplier_contact": "racks@homefurnish.in"},
    {"sku": "HES-WDB-06", "name": "Foldable Fabric Wardrobe Organizer Set (4 Pcs)", "category": "Storage & Organizers", "opening_stock": 32, "unit_cost": 290.0, "selling_price": 599.0, "reorder_threshold": 12, "supplier_lead_time_days": 5, "supplier_name": "HomeFurnish Hardware", "supplier_contact": "racks@homefurnish.in"},
    {"sku": "HES-DRL-07", "name": "Heavy Duty 12V Cordless Utility Drill Kit", "category": "Hardware & Tools", "opening_stock": 12, "unit_cost": 1800.0, "selling_price": 3499.0, "reorder_threshold": 5, "supplier_lead_time_days": 9, "supplier_name": "BuildStrong Toolworks", "supplier_contact": "tools@buildstrong.in"},
    {"sku": "HES-TLK-08", "name": "Multi-Purpose 42-Piece Home Tool Kit", "category": "Hardware & Tools", "opening_stock": 25, "unit_cost": 750.0, "selling_price": 1499.0, "reorder_threshold": 8, "supplier_lead_time_days": 7, "supplier_name": "BuildStrong Toolworks", "supplier_contact": "tools@buildstrong.in"},
    {"sku": "HES-LGT-09", "name": "Automatic LED Motion Sensor Night Light (Pair)", "category": "Home Utilities", "opening_stock": 50, "unit_cost": 260.0, "selling_price": 549.0, "reorder_threshold": 15, "supplier_lead_time_days": 4, "supplier_name": "LuminaHome Electricals", "supplier_contact": "lights@luminahome.in"},
    {"sku": "HES-HMD-10", "name": "Ultrasonic Cool Mist Room Humidifier 2.5L", "category": "Home Utilities", "opening_stock": 16, "unit_cost": 850.0, "selling_price": 1699.0, "reorder_threshold": 6, "supplier_lead_time_days": 8, "supplier_name": "AirPure Appliances", "supplier_contact": "humidifiers@airpure.in"},
    {"sku": "HES-VAC-11", "name": "Vacuum Storage Bags with Hand Pump (Pack of 5)", "category": "Storage & Organizers", "opening_stock": 42, "unit_cost": 320.0, "selling_price": 649.0, "reorder_threshold": 12, "supplier_lead_time_days": 5, "supplier_name": "PlastoCraft Domestic", "supplier_contact": "containers@plastocraft.in"},
    {"sku": "HES-FLK-12", "name": "Stainless Steel Double Wall Thermal Flask 1L", "category": "Kitchen Accessories", "opening_stock": 28, "unit_cost": 420.0, "selling_price": 899.0, "reorder_threshold": 10, "supplier_lead_time_days": 6, "supplier_name": "Vinod Steel Mills", "supplier_contact": "cookware@vinodsteel.in"},
]

PREPOPULATED_BUSINESSES = ["freshmart", "technest"]
EMPTY_BUSINESSES = ["urbanthread", "homeease"]

BUSINESS_DATA_MAP = {
    "freshmart": FRESHMART_PRODUCTS,
    "technest": TECHNEST_PRODUCTS,
}

def generate_sales_records_for_products(products: List[Dict[str, Any]], days_count: int = 45) -> List[Dict[str, Any]]:
    """Deterministically generates 45 days of sales records ending yesterday."""
    sales: List[Dict[str, Any]] = []
    base_date = datetime.date(2026, 10, 9)  # Yesterday relative to 2026-10-10
    
    # Deterministic pseudo-sales patterns per product index
    patterns = [
        [3, 4, 2, 5, 4, 6, 5],
        [4, 5, 3, 4, 6, 7, 5],
        [2, 3, 2, 4, 3, 5, 4],
        [5, 6, 4, 7, 6, 8, 7],
        [1, 2, 1, 3, 2, 4, 3],
        [6, 7, 5, 8, 7, 9, 8],
        [2, 2, 1, 3, 2, 4, 3],
        [3, 4, 3, 5, 4, 6, 5],
        [1, 2, 2, 1, 2, 3, 2],
        [5, 6, 4, 7, 5, 8, 6],
        [2, 3, 2, 4, 3, 5, 4],
        [1, 2, 1, 2, 2, 3, 2],
    ]

    for day_offset in range(days_count - 1, -1, -1):
        sale_date = base_date - datetime.timedelta(days=day_offset)
        day_of_week = sale_date.weekday()
        
        for idx, prod in enumerate(products):
            # Select qty from pattern with deterministic cyclic variation
            p_pattern = patterns[idx % len(patterns)]
            base_qty = p_pattern[day_of_week % len(p_pattern)]
            
            # Minor cyclic offset
            mod_val = (day_offset + idx * 3) % 4
            qty = max(1, base_qty + (1 if mod_val == 0 else (-1 if mod_val == 2 else 0)))
            
            unit_price = prod["selling_price"]
            total_revenue = round(qty * unit_price, 2)
            
            sales.append({
                "sale_date": sale_date.strftime("%Y-%m-%d"),
                "sku": prod["sku"],
                "quantity": qty,
                "unit_price": unit_price,
                "total_revenue": total_revenue,
                "customer_ref": f"CUST-{sale_date.strftime('%m%d')}-{idx+1:02d}",
            })

    return sales

def seed_business_demo_data(db: Session, business_id: str, force_reset: bool = False) -> Dict[str, Any]:
    """Deterministically populates or updates inventory for a specific business workspace."""
    bid = business_id.lower().strip()
    if bid not in DEMO_BUSINESSES:
        raise ValueError(f"Unknown business workspace '{business_id}'")

    # If this is an empty workspace (UrbanThread or HomeEase)
    if bid in EMPTY_BUSINESSES:
        if force_reset:
            db.query(ReorderRecommendation).filter(ReorderRecommendation.business_id == bid).delete()
            db.query(ForecastRun).filter(ForecastRun.business_id == bid).delete()
            db.query(StockMovement).filter(StockMovement.business_id == bid).delete()
            db.query(Product).filter(Product.business_id == bid).delete()
            db.query(SalesImportBatch).filter(SalesImportBatch.business_id == bid).delete()
            db.commit()
        existing_count = db.query(Product).filter(Product.business_id == bid).count()
        return {
            "status": "empty_workspace",
            "business_id": bid,
            "business_name": DEMO_BUSINESSES[bid].name,
            "products_count": existing_count,
            "message": f"Workspace '{DEMO_BUSINESSES[bid].name}' is configured as a clean workspace with {existing_count} products."
        }

    prod_defs = BUSINESS_DATA_MAP[bid]

    # Check if products already exist
    existing_count = db.query(Product).filter(Product.business_id == bid).count()
    if existing_count > 0 and not force_reset:
        return {
            "status": "already_initialized",
            "business_id": bid,
            "products_count": existing_count,
            "message": f"Business '{bid}' already contains {existing_count} products."
        }

    # If force reset, purge existing records for this business only
    if force_reset:
        db.query(ReorderRecommendation).filter(ReorderRecommendation.business_id == bid).delete()
        db.query(ForecastRun).filter(ForecastRun.business_id == bid).delete()
        db.query(StockMovement).filter(StockMovement.business_id == bid).delete()
        db.query(Product).filter(Product.business_id == bid).delete()
        db.query(SalesImportBatch).filter(SalesImportBatch.business_id == bid).delete()
        db.commit()

    created_prods: Dict[str, Product] = {}
    now = datetime.datetime.utcnow()

    # 1. Insert Products & Opening Stock movements
    for pdef in prod_defs:
        p = Product(
            business_id=bid,
            sku=pdef["sku"],
            name=pdef["name"],
            category=pdef["category"],
            current_stock=pdef["opening_stock"],
            unit_cost=pdef["unit_cost"],
            selling_price=pdef["selling_price"],
            reorder_threshold=pdef["reorder_threshold"],
            supplier_lead_time_days=pdef["supplier_lead_time_days"],
            supplier_name=pdef["supplier_name"],
            supplier_contact=pdef["supplier_contact"],
            is_active=True,
            created_at=now,
            updated_at=now,
        )
        db.add(p)
        db.flush()
        created_prods[p.sku] = p

        # Ledger initial opening stock
        if pdef["opening_stock"] > 0:
            op_mov = StockMovement(
                business_id=bid,
                product_id=p.id,
                movement_type="STOCK_RECEIPT",
                quantity=pdef["opening_stock"],
                stock_delta=pdef["opening_stock"],
                unit_price=pdef["unit_cost"],
                supplier_name=pdef.get("supplier_name"),
                occurred_at=now - datetime.timedelta(days=46),
                reference="OPENING_STOCK",
                note="Initial opening stock buffer",
                source="MANUAL",
                created_at=now,
            )
            db.add(op_mov)

    # 2. Insert 45 Days of Historical Sales Transactions
    sales_records = generate_sales_records_for_products(prod_defs, days_count=45)
    
    # Create batch record
    batch = SalesImportBatch(
        business_id=bid,
        batch_type="SALES",
        filename=f"demo_{bid}_sales.csv",
        imported_at=now,
        status="COMPLETED",
        rows_total=len(sales_records),
        rows_imported=len(sales_records),
        rows_rejected=0,
        file_hash=f"demo-seed-hash-{bid}",
    )
    db.add(batch)
    db.flush()

    for s in sales_records:
        prod = created_prods.get(s["sku"])
        if not prod:
            continue
        
        occ_dt = datetime.datetime.strptime(s["sale_date"], "%Y-%m-%d")
        mov = StockMovement(
            business_id=bid,
            product_id=prod.id,
            movement_type="SALE",
            quantity=s["quantity"],
            stock_delta=-s["quantity"],
            unit_price=s["unit_price"],
            occurred_at=occ_dt,
            reference=s["customer_ref"],
            note=f"Historical sale at ₹{s['unit_price']}",
            source="CSV_IMPORT",
            import_batch_id=batch.id,
            created_at=now,
        )
        db.add(mov)

    # Reconcile final current_stock cache for each product (Opening Stock + Receipts - Sales)
    # To keep inventory realistic and non-negative, add periodic replenishment batches
    for prod in created_prods.values():
        total_sales_qty = sum(s["quantity"] for s in sales_records if s["sku"] == prod.sku)
        is_low_runner = prod.sku in ["FMG-YOG-09", "FMG-GHE-07", "TNE-HDP-03", "TNE-SSD-07"]
        
        if is_low_runner:
            # Target a realistic low stock below reorder threshold
            target_end_stock = max(2, prod.reorder_threshold - 3)
            needed_receipts = max(0, total_sales_qty + target_end_stock - prod.current_stock)
            rep1_qty = int(needed_receipts * 0.6)
            rep2_qty = needed_receipts - rep1_qty
        else:
            # Healthy stock (comfortably above reorder threshold)
            target_end_stock = prod.reorder_threshold + 20
            needed_receipts = max(0, total_sales_qty + target_end_stock - prod.current_stock)
            rep1_qty = int(needed_receipts * 0.55)
            rep2_qty = needed_receipts - rep1_qty

        r1 = StockMovement(
            business_id=bid,
            product_id=prod.id,
            movement_type="STOCK_RECEIPT",
            quantity=rep1_qty,
            stock_delta=rep1_qty,
            unit_price=prod.unit_cost,
            supplier_name=prod.supplier_name,
            occurred_at=now - datetime.timedelta(days=30),
            reference=f"PO-{bid.upper()}-30D",
            note="Supplier Restock Batch 1",
            source="MANUAL",
            created_at=now,
        )
        r2 = StockMovement(
            business_id=bid,
            product_id=prod.id,
            movement_type="STOCK_RECEIPT",
            quantity=rep2_qty,
            stock_delta=rep2_qty,
            unit_price=prod.unit_cost,
            supplier_name=prod.supplier_name,
            occurred_at=now - datetime.timedelta(days=12),
            reference=f"PO-{bid.upper()}-12D",
            note="Supplier Restock Batch 2",
            source="MANUAL",
            created_at=now,
        )
        db.add(r1)
        db.add(r2)

        # Final calculated stock matches ledger movements exactly
        prod.current_stock = prod.current_stock + rep1_qty + rep2_qty - total_sales_qty

    db.commit()

    return {
        "status": "success",
        "business_id": bid,
        "business_name": DEMO_BUSINESSES[bid].name,
        "products_seeded": len(prod_defs),
        "sales_transactions_seeded": len(sales_records),
    }

def seed_all_demo_businesses(db: Session, force_reset: bool = False) -> Dict[str, Any]:
    """Ensures all four demo businesses are initialized and persisted in the database."""
    results = {}
    for bid in DEMO_BUSINESSES.keys():
        results[bid] = seed_business_demo_data(db, bid, force_reset=force_reset)
    return results
