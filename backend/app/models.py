from datetime import date, datetime, timezone

from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, Float, ForeignKey, Index, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    __table_args__ = (CheckConstraint("role IN ('student', 'admin')", name="ck_users_role"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(254), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="student")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    items: Mapped[list["Item"]] = relationship(back_populates="reporter", foreign_keys="Item.reporter_id")


class Item(Base):
    __tablename__ = "items"
    __table_args__ = (
        CheckConstraint("item_type IN ('lost', 'found')", name="ck_items_type"),
        CheckConstraint("status IN ('open', 'under_review', 'returned', 'closed')", name="ck_items_status"),
        Index("ix_items_browse", "status", "item_type", "category", "created_at"),
        Index("ix_items_event_location", "event_date", "location"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    item_type: Mapped[str] = mapped_column(String(10), nullable=False)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    color: Mapped[str | None] = mapped_column(String(60))
    location: Mapped[str] = mapped_column(String(160), nullable=False)
    event_date: Mapped[date] = mapped_column(Date, nullable=False)
    image_path: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="open")
    handed_to_custodian: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    reporter: Mapped[User] = relationship(back_populates="items", foreign_keys=[reporter_id])
    claims: Mapped[list["Claim"]] = relationship(back_populates="item")


class Claim(Base):
    __tablename__ = "claims"
    __table_args__ = (
        CheckConstraint("status IN ('pending', 'under_review', 'approved', 'rejected', 'completed')", name="ck_claims_status"),
        UniqueConstraint("item_id", "claimant_id", name="uq_claim_item_claimant"),
        Index("ix_claims_review", "status", "created_at"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    item_id: Mapped[str] = mapped_column(ForeignKey("items.id", ondelete="CASCADE"), nullable=False)
    claimant_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    private_evidence: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    reviewer_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    item: Mapped[Item] = relationship(back_populates="claims")
    claimant: Mapped[User] = relationship(foreign_keys=[claimant_id])


class Match(Base):
    __tablename__ = "matches"
    __table_args__ = (
        UniqueConstraint("lost_item_id", "found_item_id", name="uq_match_pair"),
        CheckConstraint("final_score >= 0 AND final_score <= 100", name="ck_match_score"),
        Index("ix_matches_rank", "lost_item_id", "final_score"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    lost_item_id: Mapped[str] = mapped_column(ForeignKey("items.id", ondelete="CASCADE"), nullable=False)
    found_item_id: Mapped[str] = mapped_column(ForeignKey("items.id", ondelete="CASCADE"), nullable=False)
    text_score: Mapped[float] = mapped_column(Float, nullable=False)
    image_score: Mapped[float | None] = mapped_column(Float)
    final_score: Mapped[float] = mapped_column(Float, nullable=False)
    explanation: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    review_status: Mapped[str] = mapped_column(String(20), nullable=False, default="suggested")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (Index("ix_notifications_user_unread", "user_id", "is_read", "created_at"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    message: Mapped[str] = mapped_column(String(500), nullable=False)
    related_item_id: Mapped[str | None] = mapped_column(ForeignKey("items.id", ondelete="SET NULL"))
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = (Index("ix_audit_created", "created_at"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    actor_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    affected_type: Mapped[str] = mapped_column(String(50), nullable=False)
    affected_id: Mapped[str] = mapped_column(String(36), nullable=False)
    details: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class ContactMessage(Base):
    __tablename__ = "contact_messages"
    __table_args__ = (CheckConstraint("status IN ('new', 'reviewed', 'closed')", name="ck_contact_status"), Index("ix_contact_status_created", "status", "created_at"))

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(254), nullable=False)
    subject: Mapped[str] = mapped_column(String(140), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="new")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
