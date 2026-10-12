import os
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    PROJECT_NAME: str = "StockSense AI"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    
    DATABASE_URL: str = "sqlite:///./stocksense.db"
    
    # Comma-separated CORS origins
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
    
    # Path to SWI-Prolog binary (optional override, otherwise auto-detected)
    SWIPL_PATH: str = r"C:\Program Files\swipl\bin\swipl.exe"
    
    BUSINESS_TIMEZONE: str = "UTC"
    
    # Feature flags
    ENABLE_ACADEMIC_LAB: bool = False
    ENABLE_DEMO_RESETS: bool = False

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
