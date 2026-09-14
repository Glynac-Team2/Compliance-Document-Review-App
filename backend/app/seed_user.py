import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from app.database import Base, engine, SessionLocal
    from app.models import User, Document, AuditEvent, Review
    from app.security import hash_password
except ImportError:
    from database import Base, engine, SessionLocal
    from models import User, Document, AuditEvent, Review
    from security import hash_password

def seed_test_user():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        db.query(AuditEvent).delete()
        db.query(Review).delete()
        db.query(Document).delete()
        db.query(User).delete()
        db.commit()

        # 2. Add seed users
        advisor = User(
            email="advisor@example.com",
            name="Test Advisor",
            password_hash=hash_password("password123"),
            role="advisor"
        )
        db.add(advisor)

        officer = User(
            email="officer@example.com",
            name="Test Officer",
            password_hash=hash_password("password123"),
            role="officer"
        )
        db.add(officer)
        
        db.commit()
    finally:
        db.close()

if __name__ == "__main__":
    seed_test_user()