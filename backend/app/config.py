from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "LostLink API"
    database_url: str = "sqlite:///./lostlink.db"
    jwt_secret: str = "replace-this-development-secret-before-deploying"
    jwt_expire_minutes: int = 60
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    upload_dir: str = "./uploads"
    max_upload_bytes: int = 5 * 1024 * 1024
    college_email_domain: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_postgres_url(cls, value: str) -> str:
        if value.startswith("postgres://"):
            return value.replace("postgres://", "postgresql+psycopg://", 1)
        if value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+psycopg://", 1)
        return value

    @property
    def allowed_origins(self) -> list[str]:
        origins = (origin.strip() for origin in self.cors_origins.split(","))
        return [
            origin if origin.startswith(("http://", "https://")) else f"https://{origin}"
            for origin in origins
            if origin
        ]


@lru_cache
def get_settings() -> Settings:
    return Settings()
