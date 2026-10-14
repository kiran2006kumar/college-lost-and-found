from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ContactMessage
from app.rate_limit import auth_rate_limit
from app.schemas import ContactCreate

router = APIRouter(prefix="/api/contact", tags=["Contact"])


@router.post("", status_code=status.HTTP_202_ACCEPTED, dependencies=[Depends(auth_rate_limit)])
def send_contact_message(payload: ContactCreate, request: Request, db: Session = Depends(get_db)):
    message = ContactMessage(id=str(uuid4()), name=payload.name.strip(), email=str(payload.email).lower(), subject=payload.subject.strip(), message=payload.message.strip())
    db.add(message)
    db.commit()
    return {"status": "received", "message": "Your message was sent to the campus support queue."}