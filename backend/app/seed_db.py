import logging
import subprocess
import uuid
from app.database import SessionLocal
from app.ai.retrieval import get_embedding
from app.models import ComplianceCorpus, PrecedentIndex

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def gen_id():
    return uuid.uuid4().hex[:12]

def seed_data():
    db = SessionLocal()
    try:
        logger.info("Starting database seeding with vector embeddings...")

        existing_rules = db.query(ComplianceCorpus).first()
        if not existing_rules:
            rule_texts = [
                ("Financial Disclosures", "All communications must include standard market risk disclosures and cannot guarantee returns."),
                ("Data Privacy", "Client Personally Identifiable Information (PII) must be redacted before external transmission.")
            ]
            
            base_rules = []
            for category, text in rule_texts:
                embedding = _get_embedding(text)
                base_rules.append(
                    ComplianceCorpus(
                        id=gen_id(),
                        category=category,
                        text=text,
                        embedding=embedding
                    )
                )
            
            db.add_all(base_rules)
            db.commit()
            logger.info("Seeded base compliance rules with embeddings into ComplianceCorpus.")
        
        else:
            logger.info("Compliance rules already exist. Skipping.")

        # Seed Precedent Index
        existing_precedent = db.query(PrecedentIndex).first()
        if not existing_precedent:
            sample_precedent_text = "Standard marketing communication review highlighting market risks clearly."
            embedding = _get_embedding(sample_precedent_text)
            
            precedent = PrecedentIndex(
                id=gen_id(),
                doc_type="Marketing Brochure",
                masked_text=sample_precedent_text,
                decision="approved",
                officer_comment="Approved with standard risk disclosures included.",
                embedding=embedding
            )
            db.add(precedent)
            db.commit()
            logger.info("Seeded sample precedent into PrecedentIndex.")
        else:
            logger.info("Precedent index already seeded. Skipping.")

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