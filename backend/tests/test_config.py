from app.config import Settings


def test_postgres_database_urls_use_psycopg():
    assert Settings(database_url="postgres://user:pass@host/db").database_url == (
        "postgresql+psycopg://user:pass@host/db"
    )
    assert Settings(database_url="postgresql://user:pass@host/db").database_url == (
        "postgresql+psycopg://user:pass@host/db"
    )


def test_cors_origins_accept_render_hosts_and_local_urls():
    settings = Settings(
        cors_origins="lostlink-frontend.onrender.com,http://localhost:5173"
    )

    assert settings.allowed_origins == [
        "https://lostlink-frontend.onrender.com",
        "http://localhost:5173",
    ]
