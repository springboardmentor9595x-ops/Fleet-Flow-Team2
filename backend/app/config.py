import os
from dataclasses import dataclass
from dotenv import load_dotenv

# Ensure environment variables are loaded before parsing Settings
load_dotenv()


def _get_database_url() -> str:
    url = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/fleetflow",
    )
    # Render and other cloud providers might provide 'postgres://' which SQLAlchemy 1.4+ rejects
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url


@dataclass(frozen=True)
class Settings:
    app_name: str = "Fleet Flow API"
    database_url: str = _get_database_url()
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    secret_key: str = os.getenv(
        "SECRET_KEY", "b3b7a5a8f5e08b1a37c3a07788fa2989"
    )
    algorithm: str = os.getenv("ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
    )
    cors_origins: str = os.getenv("CORS_ORIGINS", "http://localhost:5173")
    create_tables_on_startup: bool = (
        os.getenv("CREATE_TABLES_ON_STARTUP", "true").lower() == "true"
    )
    smtp_user: str = os.getenv("SMTP_USER", "")
    smtp_password: str = os.getenv("SMTP_PASSWORD", "")
    smtp_host: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port: int = int(os.getenv("SMTP_PORT", "465"))


settings = Settings()

