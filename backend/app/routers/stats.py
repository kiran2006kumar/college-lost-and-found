from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Item, User

router = APIRouter(prefix="/api/stats", tags=["Statistics"])


@router.get("/public")
def public_stats(db: Session = Depends(get_db)):
    count = lambda model, *conditions: db.scalar(select(func.count()).select_from(model).where(*conditions)) or 0
    return {
        "active_reports": count(Item, Item.status == "open"),
        "lost_reports": count(Item, Item.item_type == "lost", Item.status == "open"),
        "found_reports": count(Item, Item.item_type == "found", Item.status == "open"),
        "returned_items": count(Item, Item.status == "returned"),
        "campus_members": count(User, User.is_active.is_(True)),
    }