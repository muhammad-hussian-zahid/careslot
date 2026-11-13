from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:54322/postgres"
    jwt_secret: str = "development-only-change-me"
    access_token_minutes: int = 15
    refresh_token_days: int = 14
    frontend_origin: str = "http://localhost:3000"
    environment: str = "development"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()