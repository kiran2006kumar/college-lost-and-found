from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_admin
from app.dependencies import add_audit
from app.models import AuditLog, Claim, ContactMessage, Item, User
from app.schemas import ClaimOut, UserOut

router = APIRouter(prefix="/api/admin", tags=["Administration"])


@router.get("/stats")
def dashboard_stats(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    count = lambda model, *conditions: db.scalar(select(func.count()).select_from(model).where(*conditions)) or 0
    categories = db.execute(select(Item.category, func.count(Item.id)).group_by(Item.category).order_by(func.count(Item.id).desc())).all()
    locations = db.execute(select(Item.location, func.count(Item.id)).group_by(Item.location).order_by(func.count(Item.id).desc()).limit(10)).all()
    recent = db.scalars(select(Item).order_by(Item.created_at.desc()).limit(8)).all()
    return {
        "users": count(User),
        "lost_reports": count(Item, Item.item_type == "lost"),
        "found_reports": count(Item, Item.item_type == "found"),
        "pending_claims": count(Claim, Claim.status.in_(["pending", "under_review"])),
        "returned_items": count(Item, Item.status == "returned"),
        "by_category": [{"category": name, "count": total} for name, total in categories],
        "by_location": [{"location": name, "count": total} for name, total in locations],
        "recent_reports": [{"id": item.id, "title": item.title, "item_type": item.item_type, "status": item.status, "created_at": item.created_at} for item in recent],
    }


@router.get("/claims", response_model=list[ClaimOut])
def review_queue(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return db.scalars(select(Claim).where(Claim.status.in_(["pending", "under_review"])).order_by(Claim.created_at.asc()).limit(100)).all()


@router.get("/users", response_model=list[UserOut])
def list_users(q: str | None = None, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    query = select(User).order_by(User.created_at.desc()).limit(200)
    if q:
        query = query.where(User.email.ilike(f"%{q.strip()}%") | User.name.ilike(f"%{q.strip()}%"))
    return db.scalars(query).all()


@router.patch("/users/{user_id}/role")
def set_user_role(user_id: str, role: Literal["student", "admin"], db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id and role != "admin":
        raise HTTPException(status_code=400, detail="You cannot remove your own administrator role")
    user.role = role
    add_audit(db, admin.id, "user.role_changed", "user", user.id, {"role": role})
    db.commit()
    return UserOut.model_validate(user)


@router.patch("/items/{item_id}/status")
def moderate_item(item_id: str, item_status: Literal["open", "returned", "closed"], db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    item = db.get(Item, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Report not found")
    item.status = item_status
    add_audit(db, admin.id, "item.moderated", "item", item.id, {"status": item_status})
    db.commit()
    return {"id": item.id, "status": item.status}


@router.get("/audit-logs")
def audit_logs(offset: int = 0, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    logs = db.scalars(select(AuditLog).order_by(AuditLog.created_at.desc()).offset(max(0, offset)).limit(100)).all()
    return [{"id": log.id, "actor_id": log.actor_id, "action": log.action, "affected_type": log.affected_type, "affected_id": log.affected_id, "details": log.details, "created_at": log.created_at} for log in logs]


@router.get("/messages")
def contact_messages(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    messages = db.scalars(select(ContactMessage).order_by(ContactMessage.created_at.desc()).limit(100)).all()
    return [{"id": message.id, "name": message.name, "email": message.email, "subject": message.subject, "message": message.message, "status": message.status, "created_at": message.created_at} for message in messages]
