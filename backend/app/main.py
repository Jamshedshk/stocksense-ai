import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.session import init_db

# Routers
from app.api.routes import health
from app.api.routes import products
from app.api.routes import movements
from app.api.routes import sales
from app.api.routes import dashboard
from app.api.routes import forecast
from app.api.routes import analytics
from app.api.routes import reorder
from app.api.routes import ai_lab
from app.api.routes import reports
from app.api.routes import demo
from app.api.routes import auth
from app.db.session import SessionLocal
from app.services.demo_seeder import seed_all_demo_businesses
from app.models.product import Product

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("stocksense")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing StockSense AI database schema...")
    init_db()
    logger.info("StockSense AI database schema initialized.")
    
    # Auto-seed preloaded demo businesses deterministically if not already seeded
    try:
        db = SessionLocal()
        freshmart_count = db.query(Product).filter(Product.business_id == "freshmart").count()
        technest_count = db.query(Product).filter(Product.business_id == "technest").count()
        if freshmart_count < 10 or technest_count < 10:
            logger.info("Preloaded workspaces missing data. Seeding FreshMart and TechNest...")
            seed_all_demo_businesses(db, force_reset=False)
            logger.info("Successfully initialized preloaded business workspaces.")
        db.close()
    except Exception as e:
        logger.error(f"Error during workspace initialization: {e}")
        
    yield
    logger.info("Shutting down StockSense AI.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Intelligent Inventory Management and Demand Forecasting System for Business Owners.",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API v1 Routers
prefix = settings.API_V1_PREFIX
app.include_router(auth.router, prefix=prefix)
app.include_router(health.router, prefix=prefix)
app.include_router(products.router, prefix=prefix)
app.include_router(movements.router, prefix=prefix)
app.include_router(sales.router, prefix=prefix)
app.include_router(dashboard.router, prefix=prefix)
app.include_router(forecast.router, prefix=prefix)
app.include_router(analytics.router, prefix=prefix)
app.include_router(reorder.router, prefix=prefix)
if settings.ENABLE_ACADEMIC_LAB:
    app.include_router(ai_lab.router, prefix=prefix)
app.include_router(reports.router, prefix=prefix)
app.include_router(demo.router, prefix=prefix)

@app.get("/")
def root():
    return {
        "message": "Welcome to StockSense AI API",
        "docs": "/docs",
        "version": "1.0.0",
        "status": "operational",
    }
