from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import auth, documents, reviews

# For a real migration story swap this for Alembic; fine for local dev.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Compliance Document Review API")

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
def health():
    return {"status": "ok"}
