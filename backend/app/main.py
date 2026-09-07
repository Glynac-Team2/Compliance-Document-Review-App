from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from .seed_user import seed_test_user
from app.database import Base, engine, get_db
from app.routers import auth, documents, reviews

# For a real migration story swap this for Alembic; fine for local dev.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Compliance Document Review API")

@app.on_event("startup")
def startup_event():
    seed_test_user()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(reviews.router)


@app.get("/health")
def health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database unavailable: {e}")
    return {"status": "ok"}
