from datetime import date
from pathlib import Path
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app.config import get_settings
from app.database import get_db
from app.dependencies import add_audit, add_notification, get_current_user
from app.matching import score_pair
from app.models import Claim, Item, Match, User
from app.schemas import ItemCreate, ItemOut, ItemUpdate, MatchReview

router = APIRouter(prefix="/api/items", tags=["Items"])
IMAGE_SIGNATURES = ((b"\xff\xd8\xff", ".jpg"), (b"\x89PNG\r\n\x1a\n", ".png"), (b"RIFF", ".webp"))


def find_matches(db: Session, item: Item) -> None:
    opposite_type = "found" if item.item_type == "lost" else "lost"
    candidates = db.scalars(select(Item).where(Item.item_type == opposite_type, Item.status == "open", Item.id != item.id)).all()
    for candidate in candidates:
        lost, found = (item, candidate) if item.item_type == "lost" else (candidate, item)
        text_score, final_score, reasons = score_pair(lost, found)
        match = db.scalar(select(Match).where(Match.lost_item_id == lost.id, Match.found_item_id == found.id))
        is_new = match is None
        crossed_threshold = match is not None and match.final_score < 35 <= final_score
        if match is None:
            match = Match(id=str(uuid4()), lost_item_id=lost.id, found_item_id=found.id, text_score=0, final_score=0, explanation=[])
            db.add(match)
        elif match.final_score != final_score or match.explanation != reasons:
            match.review_status = "suggested"
        match.text_score = round(text_score * 100, 1)
        match.final_score = final_score
        match.explanation = reasons
        if final_score >= 35 and (is_new or crossed_threshold):
            add_notification(db, lost.reporter_id, "Possible item match", f"A found report may match '{lost.title}' ({final_score:.0f}% similarity).", lost.id)
            add_notification(db, found.reporter_id, "Possible item match", f"A lost report may match '{found.title}' ({final_score:.0f}% similarity).", found.id)


@router.get("", response_model=list[ItemOut])
def browse_items(
    q: str | None = Query(default=None, max_length=120), item_type: Literal["lost", "found"] | None = None,
    category: str | None = Query(default=None, max_length=60), location: str | None = Query(default=None, max_length=160),
    date_from: date | None = None, date_to: date | None = None, item_status: Literal["open", "under_review", "returned", "closed"] = "open",
    sort: Literal["newest", "oldest"] = "newest", offset: int = Query(default=0, ge=0), limit: int = Query(default=24, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = select(Item).options(joinedload(Item.reporter)).where(Item.status == item_status)
    if item_type:
        query = query.where(Item.item_type == item_type)
    if category:
        query = query.where(Item.category.ilike(f"%{category}%"))
    if location:
        query = query.where(Item.location.ilike(f"%{location}%"))
    if date_from:
        query = query.where(Item.event_date >= date_from)
    if date_to:
        query = query.where(Item.event_date <= date_to)
    if q:
        term = f"%{q.strip()}%"
        query = query.where(or_(Item.title.ilike(term), Item.description.ilike(term), Item.color.ilike(term), Item.location.ilike(term)))
    ordering = Item.created_at.asc() if sort == "oldest" else Item.created_at.desc()
    items = db.scalars(query.order_by(ordering).offset(offset).limit(limit)).all()
    return [ItemOut.from_item(item) for item in items]


@router.get("/{item_id}", response_model=ItemOut)
def get_item(item_id: str, db: Session = Depends(get_db)):
    item = db.scalar(select(Item).options(joinedload(Item.reporter)).where(Item.id == item_id))
    if item is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return ItemOut.from_item(item)


@router.post("", response_model=ItemOut, status_code=status.HTTP_201_CREATED)
def create_item(payload: ItemCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = Item(id=str(uuid4()), reporter_id=user.id, **payload.model_dump())
    db.add(item)
    db.flush()
    find_matches(db, item)
    add_audit(db, user.id, "item.created", "item", item.id, {"item_type": item.item_type})
    db.commit()
    db.refresh(item)
    return ItemOut.from_item(item)


@router.patch("/{item_id}", response_model=ItemOut)
def update_item(item_id: str, payload: ItemUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = db.scalar(select(Item).options(joinedload(Item.reporter)).where(Item.id == item_id))
    if item is None:
        raise HTTPException(status_code=404, detail="Report not found")
    if item.reporter_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Only the reporter or an administrator can edit this report")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    if item.status == "open":
        find_matches(db, item)
    changed_status = payload.model_dump(exclude_unset=True).get("status")
    title = "A claimed report was closed" if changed_status in {"closed", "returned"} else "A claimed report was updated"
    message = f"The report '{item.title}' changed status to {changed_status}." if changed_status else f"The report '{item.title}' was updated."
    for claim in db.scalars(select(Claim).where(Claim.item_id == item.id, Claim.claimant_id != user.id)):
        add_notification(db, claim.claimant_id, title, message, item.id)
    add_audit(db, user.id, "item.updated", "item", item.id, {"fields": list(payload.model_fields_set)})
    db.commit()
    db.refresh(item)
    return ItemOut.from_item(item)


@router.post("/{item_id}/image", response_model=ItemOut)
async def upload_image(item_id: str, image: UploadFile = File(...), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = db.scalar(select(Item).options(joinedload(Item.reporter)).where(Item.id == item_id))
    if item is None:
        raise HTTPException(status_code=404, detail="Report not found")
    if item.reporter_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Only the reporter can upload an image")
    content = await image.read(get_settings().max_upload_bytes + 1)
    if len(content) > get_settings().max_upload_bytes:
        raise HTTPException(status_code=413, detail="Image must be 5 MB or smaller")
    detected = next(((extension, mime) for signature, extension, mime in ((b"\xff\xd8\xff", ".jpg", "image/jpeg"), (b"\x89PNG\r\n\x1a\n", ".png", "image/png"), (b"RIFF", ".webp", "image/webp")) if content.startswith(signature) and (extension != ".webp" or content[8:12] == b"WEBP")), None)
    if detected is None or image.content_type not in {detected[1], "application/octet-stream"}:
        raise HTTPException(status_code=415, detail="Upload a valid JPEG, PNG, or WebP image")
    extension = detected[0]
    upload_dir = Path(get_settings().upload_dir).resolve()
    upload_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid4().hex}{extension}"
    (upload_dir / filename).write_bytes(content)
    item.image_path = f"/uploads/{filename}"
    add_audit(db, user.id, "item.image_uploaded", "item", item.id)
    db.commit()
    db.refresh(item)
    return ItemOut.from_item(item)


@router.get("/{item_id}/matches")
def item_matches(item_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = db.get(Item, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Report not found")
    if item.reporter_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Match suggestions are private to the reporter")
    if item.status != "open":
        return []
    lost_field, found_field = (Match.lost_item_id, Match.found_item_id) if item.item_type == "lost" else (Match.found_item_id, Match.lost_item_id)
    matches = db.scalars(select(Match).where(lost_field == item.id).order_by(Match.final_score.desc()).limit(20)).all()
    result = []
    for match in matches:
        other = db.scalar(select(Item).options(joinedload(Item.reporter)).where(Item.id == getattr(match, found_field.key)))
        if other and other.status == "open":
            result.append({"id": match.id, "source_item_id": item.id, "score": match.final_score, "explanation": match.explanation, "item": ItemOut.from_item(other)})
    return result


@router.patch("/{item_id}/matches/{match_id}")
def review_match(item_id: str, match_id: str, payload: MatchReview, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = db.get(Item, item_id)
    match = db.get(Match, match_id)
    if item is None or match is None or item_id not in {match.lost_item_id, match.found_item_id}:
        raise HTTPException(status_code=404, detail="Match suggestion not found")
    if item.reporter_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Only the report owner or an administrator can review this suggestion")
    match.review_status = payload.review_status
    add_audit(db, user.id, "match.reviewed", "match", match.id, {"review_status": payload.review_status})
    db.commit()
    return {"id": match.id, "review_status": match.review_status}
