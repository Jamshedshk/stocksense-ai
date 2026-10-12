from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

db_url = settings.DATABASE_URL
# Normalize legacy postgres:// URLs to postgresql:// for SQLAlchemy compatibility
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)
engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_pre_ping=False if db_url.startswith("sqlite") else True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    # Import all models to ensure they are registered with Base metadata
    import app.models  # noqa: F401
    Base.metadata.create_all(bind=engine)

    # Safe migration for new columns and defensible backfill in SQLite
    if settings.DATABASE_URL.startswith("sqlite"):
        from sqlalchemy import text
        with engine.connect() as conn:
            try:
                result = conn.execute(text("PRAGMA table_info(stock_movements)")).fetchall()
                col_names = [row[1] for row in result]
                if "unit_price" not in col_names and len(col_names) > 0:
                    conn.execute(text("ALTER TABLE stock_movements ADD COLUMN unit_price REAL"))
                    conn.commit()
                if "supplier_name" not in col_names and len(col_names) > 0:
                    conn.execute(text("ALTER TABLE stock_movements ADD COLUMN supplier_name VARCHAR(255)"))
                    conn.commit()

                # Defensibly backfill missing unit_price from authoritative product pricing
                conn.execute(text("""
                    UPDATE stock_movements
                    SET unit_price = (
                        SELECT CASE
                            WHEN stock_movements.movement_type = 'SALE' THEN products.selling_price
                            WHEN stock_movements.movement_type IN ('STOCK_RECEIPT', 'OPENING_STOCK', 'DAMAGE_LOSS') THEN products.unit_cost
                            ELSE products.selling_price
                        END
                        FROM products WHERE products.id = stock_movements.product_id
                    )
                    WHERE stock_movements.unit_price IS NULL
                """))

                # Backfill supplier_name for receipts where available on product
                conn.execute(text("""
                    UPDATE stock_movements
                    SET supplier_name = (
                        SELECT products.supplier_name
                        FROM products WHERE products.id = stock_movements.product_id
                    )
                    WHERE stock_movements.movement_type = 'STOCK_RECEIPT'
                      AND stock_movements.supplier_name IS NULL
                """))
                conn.commit()
            except Exception:
                pass
