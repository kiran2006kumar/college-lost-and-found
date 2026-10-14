from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.routers import admin, auth, claims, contact, dashboard, items, notifications, stats

settings = get_settings()
app = FastAPI(title="LostLink API", version="1.0.0", description="Campus lost and found reports, matching, and secure recovery claims.")
app.add_middleware(CORSMiddleware, allow_origins=settings.allowed_origins, allow_credentials=True, allow_methods=["GET", "POST", "PATCH"], allow_headers=["Authorization", "Content-Type"])
Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")
app.include_router(auth.router)
app.include_router(items.router)
app.include_router(claims.router)
app.include_router(notifications.router)
app.include_router(admin.router)
app.include_router(stats.router)
app.include_router(dashboard.router)
app.include_router(contact.router)


@app.get("/api/health", tags=["System"])
def health():
    return {"status": "ok", "service": "LostLink API"}
