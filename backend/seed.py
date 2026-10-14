import os
import sys
from datetime import date, timedelta
from uuid import uuid4

sys.path.insert(0, os.path.dirname(__file__))
from app.database import Base, SessionLocal, engine
from app.models import Item, User
from app.routers.items import find_matches
from app.security import hash_password


def main() -> None:
    email = os.getenv("SEED_ADMIN_EMAIL", "").strip().lower()
    password = os.getenv("SEED_ADMIN_PASSWORD", "")
    if not email or len(password) < 12:
        raise SystemExit("Set SEED_ADMIN_EMAIL and a SEED_ADMIN_PASSWORD of at least 12 characters in .env before seeding.")
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        admin = db.query(User).filter_by(email=email).first()
        if admin is None:
            admin = User(id=str(uuid4()), name="LostLink Administrator", email=email, password_hash=hash_password(password), role="admin")
            db.add(admin)
            db.flush()
        if db.query(Item).filter_by(reporter_id=admin.id).count() == 0:
            sample_items = [
                Item(id=str(uuid4()), reporter_id=admin.id, item_type="lost", title="Navy canvas backpack", description="Navy blue canvas backpack with a small astronomy patch on the front pocket.", category="Bags", color="Navy blue", location="Hawthorne Library", event_date=date.today() - timedelta(days=1), status="open"),
                Item(id=str(uuid4()), reporter_id=admin.id, item_type="found", title="Blue backpack with patch", description="Found a blue canvas bag with a small space-themed patch near the library study rooms.", category="Bags", color="Blue", location="Hawthorne Library study rooms", event_date=date.today(), status="open"),
            ]
            db.add_all(sample_items)
            db.flush()
            for item in sample_items:
                find_matches(db, item)
        db.commit()
    print(f"Seed data ready. Administrator account: {email}")


if __name__ == "__main__":
    main()
