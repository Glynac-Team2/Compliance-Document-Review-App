import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from app.database import Base, SessionLocal, engine
    from app.models import AuditEvent, Document, Organization, Review, User
    from app.security import hash_password
except ImportError:
    from database import SessionLocal
    from models import AuditEvent, Document, Organization, Review, User
    from security import hash_password


def seed_test_user():
    db = SessionLocal()
    try:
        # Clear existing records to avoid foreign key conflicts and bad hashes.
        # Order matters: delete child tables (rows that reference other tables)
        # before the parent tables they point to.
        db.query(AuditEvent).delete()
        db.query(Review).delete()
        db.query(Document).delete()
        db.query(User).delete()
        db.query(Organization).delete()

        # Seed Organization
        organization = Organization(
            domain="example.com",
            name="Example Organization",
        )
        db.add(organization)
        db.flush()

        # Seed Advisor
        advisor = User(
            organization_id=organization.id,
            email="advisor@example.com",
            name="Test Advisor",
            password_hash=hash_password("password123"),
            role="advisor",
        )
        db.add(advisor)
        print("Advisor user created.")

        # Seed Officer
        officer = User(
            organization_id=organization.id,
            email="officer@example.com",
            name="Test Officer",
            password_hash=hash_password("password123"),
            role="officer",
        )
        db.add(officer)
        print("Officer user created.")

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_test_user()
