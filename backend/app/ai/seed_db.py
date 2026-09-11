import json
import httpx
import os
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models import PrecedentIndex, ComplianceCorpus

# Ensures the new pgvector tables actually get created in PostgreSQL
Base.metadata.create_all(bind=engine)

def get_embedding(text: str) -> list[float]:
    # Placeholder: Will call Gemini's text-embedding-004 model
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set.")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={api_key}"
    payload = {
        "model": "models/text-embedding-004",
        "content": {
            "parts": [{"text": text}]
        }
    }
    
    response = httpx.post(url, json=payload, timeout=30.0)
    response.raise_for_status()
    
    data = response.json()
    # The API returns a dictionary containing the 768-dimensional float array
    return data["embedding"]["values"]
    

def seed_precedents(db: Session):
    file_path = "seed_precedents.json"
    
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}. Please run generate_precedents.py first.")
        return

    with open(file_path, "r") as f:
        records = json.load(f)

    print(f"Found {len(records)} records. Generating embeddings and saving to database...")
    
    for record in records:
        # Prevent crashing on duplicate inserts if you run the script multiple times
        existing = db.query(PrecedentIndex).filter(PrecedentIndex.id == record["id"]).first()
        if existing:
            continue

        print(f"Embedding record {record['id']}...")
        vector = get_embedding(record["masked_text"])
        
        db_record = PrecedentIndex(
            id=record["id"],
            doc_type=record["doc_type"],
            masked_text=record["masked_text"],
            decision=record["decision"],
            officer_comment=record["officer_comment"],
            embedding=vector
        )
        db.add(db_record)
        
    db.commit()
    print("All records successfully embedded and stored!")

if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_precedents(db)
        print("Database seeded successfully.")
    finally:
        db.close()