from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "FirstPR"
    # Empty API prefix means routes mount at root (e.g., /analyze instead of /api/analyze)
    API_V1_STR: str = ""
    ENV: str = "development"

    # CORS - comma-separated list of allowed origins (e.g., "http://localhost:3000,https://app.example.com")
    # Use "*" for development only
    CORS_ORIGINS: str = "*"

    # Database
    DATABASE_URL: str = "sqlite:///./firstpr.db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # GitHub
    GITHUB_TOKEN: str | None = None

    # AI (Required)
    GOOGLE_API_KEY: str

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )


settings = Settings()
