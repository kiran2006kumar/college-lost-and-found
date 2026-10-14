from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)


class LoginInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class ProfileUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    current_password: str | None = Field(default=None, min_length=1, max_length=128)
    new_password: str | None = Field(default=None, min_length=10, max_length=128)


class ContactCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    subject: str = Field(min_length=3, max_length=140)
    message: str = Field(min_length=10, max_length=3000)


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ItemCreate(BaseModel):
    item_type: Literal["lost", "found"]
    title: str = Field(min_length=2, max_length=120)
    description: str = Field(min_length=8, max_length=3000)
    category: str = Field(min_length=2, max_length=60)
    color: str | None = Field(default=None, max_length=60)
    location: str = Field(min_length=2, max_length=160)
    event_date: date
    handed_to_custodian: bool = False


class ItemUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = Field(default=None, min_length=8, max_length=3000)
    category: str | None = Field(default=None, min_length=2, max_length=60)
    color: str | None = Field(default=None, max_length=60)
    location: str | None = Field(default=None, min_length=2, max_length=160)
    event_date: date | None = None
    status: Literal["open", "returned", "closed"] | None = None
    handed_to_custodian: bool | None = None


class ItemOut(BaseModel):
    id: str
    reporter_id: str
    reporter_name: str
    item_type: str
    title: str
    description: str
    category: str
    color: str | None
    location: str
    event_date: date
    image_path: str | None
    status: str
    handed_to_custodian: bool
    created_at: datetime

    @classmethod
    def from_item(cls, item):
        return cls(**{name: getattr(item, name) for name in cls.model_fields if name != "reporter_name"}, reporter_name=item.reporter.name)


class ClaimCreate(BaseModel):
    private_evidence: str = Field(min_length=20, max_length=3000)


class ClaimReview(BaseModel):
    status: Literal["under_review", "approved", "rejected", "completed"]


class MatchReview(BaseModel):
    review_status: Literal["confirmed", "rejected"]


class ClaimOut(BaseModel):
    id: str
    item_id: str
    claimant_id: str
    private_evidence: str
    status: str
    reviewer_id: str | None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class NotificationOut(BaseModel):
    id: str
    title: str
    message: str
    related_item_id: str | None
    is_read: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
