import logging
import subprocess
import uuid
from app.database import SessionLocal
from app.models import ComplianceCorpus

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def gen_id():
    return uuid.uuid4().hex[:12]

def seed_data():
    db = SessionLocal()
    try:
        logger.info("Starting database seeding...")

        # 1. Seed the ComplianceCorpus table
        existing_rules = db.query(ComplianceCorpus).first()
        if not existing_rules:
            base_rules = [
                ComplianceCorpus(
                    id=gen_id(),
                    category="Financial Disclosures",
                    text="All communications must include standard market risk disclosures and cannot guarantee returns."
                ),
                ComplianceCorpus(
                    id=gen_id(),
                    category="Data Privacy",
                    text="Client Personally Identifiable Information (PII) must be redacted before external transmission."
                )
            ]
            db.add_all(base_rules)
            db.commit()
            logger.info("Seeded base compliance rules into ComplianceCorpus.")
        else:
            logger.info("Compliance rules already exist. Skipping.")

        # 2. Trigger your existing user seed script
        logger.info("Running seed_user.py...")
        subprocess.run(["python", "-m", "app.seed_user"], check=True)
        
        logger.info("Database seeding pipeline completed successfully.")

    except Exception as e:
        logger.error(f"Seeding failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()