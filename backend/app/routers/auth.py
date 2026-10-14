from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.rate_limit import auth_rate_limit
from app.schemas import LoginInput, ProfileUpdate, TokenOut, UserCreate, UserOut
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED, dependencies=[Depends(auth_rate_limit)])
def register(payload: UserCreate, db: Session = Depends(get_db)):
    email = str(payload.email).lower()
    configured_domain = get_settings().college_email_domain.strip().lower().lstrip("@")
    if configured_domain and email.rsplit("@", 1)[-1] != configured_domain:
        raise HTTPException(status_code=400, detail="Use your approved college email address")
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    user = User(id=str(uuid4()), name=payload.name.strip(), email=email, password_hash=hash_password(payload.password), role="student")
    db.add(user)
    db.commit()
    db.refresh(user)
    return TokenOut(access_token=create_access_token(user.id), user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenOut, dependencies=[Depends(auth_rate_limit)])
def login(payload: LoginInput, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == str(payload.email).lower()))
    if user is None or not user.is_active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email or password is incorrect")
    return TokenOut(access_token=create_access_token(user.id), user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserOut)
def update_profile(payload: ProfileUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    changes = payload.model_dump(exclude_unset=True)
    new_password = changes.pop("new_password", None)
    current_password = changes.pop("current_password", None)
    if not changes and not new_password:
        raise HTTPException(status_code=400, detail="Provide a profile change")
    if new_password:
        if not current_password or not verify_password(current_password, user.password_hash):
            raise HTTPException(status_code=400, detail="Current password is required to change your password")
        user.password_hash = hash_password(new_password)
    if "name" in changes:
        user.name = changes["name"].strip()
    db.commit()
    db.refresh(user)
    return user
