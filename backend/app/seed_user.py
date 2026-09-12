import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from app.database import Base, engine, SessionLocal
    from app.models import User, Document, AuditEvent
    from app.security import hash_password
except ImportError:
    from database import Base, engine, SessionLocal
    from models import User, Document, AuditEvent
    from security import hash_password

def seed_test_user():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Check if test advisor already exists instead of wiping the database
        existing_user = db.query(User).filter(User.email == "advisor@example.com").first()
        if not existing_user:
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
            print("Test users created successfully.")
        else:
            print("Test users already exist. Skipping seed.")
            
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_test_user()