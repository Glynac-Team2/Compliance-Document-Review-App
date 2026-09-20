from fastapi import Depends, FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session
from starlette.status import HTTP_422_UNPROCESSABLE_ENTITY, HTTP_503_SERVICE_UNAVAILABLE

from app.database import get_db
from app.errors import error_detail
from app.routers import admin, auth, documents, reviews
from app.seed_user import seed_test_user

app = FastAPI(title="Compliance Document Review API")

# CORS Middleware to allow requests from your Vercel frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    seed_test_user()


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc: RequestValidationError):
    return JSONResponse(
        status_code=HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": [
                error_detail(
                    field=e["loc"][-1],
                    message=e["msg"],
                )
                for e in exc.errors()
            ]
        },
    )


app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(reviews.router)
app.include_router(admin.router)



@app.get("/health")
def health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        raise HTTPException(
            status_code=HTTP_503_SERVICE_UNAVAILABLE,
            detail=[error_detail(message=f"Database unavailable: {e}")],
        )
    return {"status": "ok"}
