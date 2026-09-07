import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import Base, engine, SessionLocal
from models import User, Role
from security import hash_password

def seed_test_user():
    # Only create tables if missing. NEVER drop_all() here!
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # 1. Check if the user already exists
        existing_user = db.query(User).filter(User.email == "advisor@example.com").first()
        
        if not existing_user:
            # 2. Create the user using your actual data
            user = User(
                email="advisor@example.com",
                name="Test Advisor",
                password_hash="$2b$12$9G4h0KlmJpuX1.LSCladDedCBe1O4UAvI/DNLXTKtijCY66oGUhZ6",
                role="advisor"
            )
            db.add(user)
            db.commit()
            print("Test user created successfully.")
        else:
            print("Test user already exists. Skipping.")
            
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_test_user()