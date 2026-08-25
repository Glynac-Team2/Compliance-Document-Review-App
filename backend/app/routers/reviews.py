from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_role
from app.models import Document, Review, User, Role, DocStatus, AuditAction
from app.schemas import ReviewIn, ReviewOut
from app.routers.documents import _log

router = APIRouter(prefix="/documents", tags=["reviews"])


@router.post("/{document_id}/decision", response_model=ReviewOut, status_code=201)
def record_decision(
    document_id: str,
    payload: ReviewIn,
    officer: User = Depends(require_role(Role.officer)),
    db: Session = Depends(get_db),
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if payload.status not in (DocStatus.approved, DocStatus.rejected, DocStatus.needs_revision):
        raise HTTPException(status_code=400, detail="Decision must be approved, rejected, or needs_revision")

    review = Review(
        document_id=doc.id,
        officer_id=officer.id,
        status=payload.status,
        comment=payload.comment,
    )
    db.add(review)

    # The AI never sets this — only a human decision reaches this line.
    doc.status = payload.status
    db.commit()
    db.refresh(review)

    _log(db, officer.id, doc.id, AuditAction.decided)
    return review
