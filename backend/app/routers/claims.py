from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies import add_audit, add_notification, get_current_user
from app.models import Claim, Item, User
from app.schemas import ClaimCreate, ClaimOut, ClaimReview

router = APIRouter(prefix="/api/claims", tags=["Claims"])
TRANSITIONS = {"pending": {"under_review", "approved", "rejected"}, "under_review": {"approved", "rejected"}, "approved": {"completed"}, "rejected": set(), "completed": set()}


@router.get("/mine", response_model=list[ClaimOut])
def my_claims(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    query = select(Claim).join(Item).where(or_(Claim.claimant_id == user.id, Item.reporter_id == user.id))
    return db.scalars(query.order_by(Claim.created_at.desc())).all()


@router.post("/items/{item_id}", response_model=ClaimOut, status_code=status.HTTP_201_CREATED)
def create_claim(item_id: str, payload: ClaimCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = db.get(Item, item_id)
    if item is None or item.item_type != "found" or item.status != "open":
        raise HTTPException(status_code=404, detail="Open found report not found")
    if item.reporter_id == user.id:
        raise HTTPException(status_code=400, detail="You cannot claim your own report")
    if db.scalar(select(Claim).where(Claim.item_id == item_id, Claim.claimant_id == user.id)):
        raise HTTPException(status_code=409, detail="You have already submitted a claim for this item")
    claim = Claim(id=str(uuid4()), item_id=item.id, claimant_id=user.id, private_evidence=payload.private_evidence.strip())
    db.add(claim)
    add_notification(db, item.reporter_id, "New recovery request", "A student submitted a private claim for your found-item report.", item.id)
    add_audit(db, user.id, "claim.created", "claim", claim.id)
    db.commit()
    db.refresh(claim)
    return claim


@router.patch("/{claim_id}", response_model=ClaimOut)
def review_claim(claim_id: str, payload: ClaimReview, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    claim = db.scalar(select(Claim).options(joinedload(Claim.item)).where(Claim.id == claim_id))
    if claim is None:
        raise HTTPException(status_code=404, detail="Claim not found")
    if claim.item.reporter_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Only the item reporter or an administrator can review this claim")
    if payload.status not in TRANSITIONS[claim.status]:
        raise HTTPException(status_code=409, detail=f"Cannot move a {claim.status} claim to {payload.status}")
    claim.status = payload.status
    claim.reviewer_id = user.id
    if payload.status == "completed":
        claim.item.status = "returned"
    add_notification(db, claim.claimant_id, "Claim status updated", f"Your recovery request is now {payload.status.replace('_', ' ')}.", claim.item_id)
    add_audit(db, user.id, "claim.status_changed", "claim", claim.id, {"status": payload.status})
    db.commit()
    db.refresh(claim)
    return claim
