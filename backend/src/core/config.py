from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "FirstPR"
    API_V1_STR: str = "/api"
    ENV: str = "development"
    
    # Database
    DATABASE_URL: str = "sqlite:///./firstpr.db"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # GitHub
    GITHUB_TOKEN: Optional[str] = None
    
    # AI (Required)
    GOOGLE_API_KEY: str

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()

