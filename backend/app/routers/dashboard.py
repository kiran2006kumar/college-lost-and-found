from fastapi import APIRouter, Depends
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Claim, Item, Match, Notification, User
from app.schemas import ClaimOut, ItemOut, NotificationOut

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/me")
def dashboard(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    reports = db.scalars(select(Item).options(joinedload(Item.reporter)).where(Item.reporter_id == user.id).order_by(Item.created_at.desc())).all()
    claims = db.scalars(select(Claim).join(Item).where(or_(Claim.claimant_id == user.id, Item.reporter_id == user.id)).order_by(Claim.created_at.desc())).all()
    notifications = db.scalars(select(Notification).where(Notification.user_id == user.id).order_by(Notification.created_at.desc()).limit(30)).all()
    report_ids = [item.id for item in reports if item.status == "open"]
    matches = []
    if report_ids:
        match_rows = db.scalars(select(Match).where(or_(Match.lost_item_id.in_(report_ids), Match.found_item_id.in_(report_ids))).order_by(Match.final_score.desc()).limit(30)).all()
        for match in match_rows:
            source_id = match.lost_item_id if match.lost_item_id in report_ids else match.found_item_id
            other_id = match.found_item_id if source_id == match.lost_item_id else match.lost_item_id
            other = db.scalar(select(Item).options(joinedload(Item.reporter)).where(Item.id == other_id))
            if other and other.status == "open":
                matches.append({"id": match.id, "source_item_id": source_id, "score": match.final_score, "explanation": match.explanation, "item": ItemOut.from_item(other)})
    return {
        "reports": [ItemOut.from_item(item) for item in reports],
        "claims": [ClaimOut.model_validate(claim) for claim in claims],
        "matches": matches,
        "notifications": [NotificationOut.model_validate(note) for note in notifications],
        "unread_notifications": sum(not note.is_read for note in notifications),
    }