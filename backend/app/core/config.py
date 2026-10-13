import os
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    PROJECT_NAME: str = "StockSense AI"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./stocksense.db")
    
    # Comma-separated CORS origins
    CORS_ORIGINS: str = (
        "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,"
        "https://stocksense-ai-fujexdc8f-jd-e935.vercel.app"
    )
    CORS_ORIGIN_REGEX: str = r"https://[a-zA-Z0-9_\.-]+\.vercel\.app"
    
    # Path to SWI-Prolog binary (optional override, otherwise auto-detected)
    SWIPL_PATH: str = r"C:\Program Files\swipl\bin\swipl.exe"
    
    BUSINESS_TIMEZONE: str = "UTC"
    
    # Feature flags
    ENABLE_ACADEMIC_LAB: bool = False
    ENABLE_DEMO_RESETS: bool = False

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip().rstrip("/") for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
