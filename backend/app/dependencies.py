from uuid import uuid4

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import AuditLog, Notification, User

bearer = HTTPBearer(auto_error=False)


def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)) -> User:
    unauthorized = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sign in to continue", headers={"WWW-Authenticate": "Bearer"})
    if credentials is None:
        raise unauthorized
    try:
        payload = jwt.decode(credentials.credentials, get_settings().jwt_secret, algorithms=["HS256"])
        user_id = payload.get("sub")
    except jwt.InvalidTokenError:
        raise unauthorized
    user = db.get(User, user_id) if user_id else None
    if user is None or not user.is_active:
        raise unauthorized
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrator access required")
    return user


def add_notification(db: Session, user_id: str, title: str, message: str, item_id: str | None = None) -> None:
    db.add(Notification(id=str(uuid4()), user_id=user_id, title=title, message=message, related_item_id=item_id))


def add_audit(db: Session, actor_id: str | None, action: str, affected_type: str, affected_id: str, details: dict | None = None) -> None:
    db.add(AuditLog(id=str(uuid4()), actor_id=actor_id, action=action, affected_type=affected_type, affected_id=affected_id, details=details or {}))
