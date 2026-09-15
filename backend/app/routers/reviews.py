from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from starlette.status import HTTP_400_BAD_REQUEST, HTTP_404_NOT_FOUND, HTTP_409_CONFLICT

from app.database import get_db
from app.deps import require_role
from app.errors import error_detail
from app.models import AuditAction, AuditEvent, DocStatus, Document, Review, Role, User
from app.schemas import ReviewIn, ReviewOut

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
        raise HTTPException(
            status_code=HTTP_404_NOT_FOUND,
            detail=[error_detail(message="Document not found")],
        )

    if doc.status != DocStatus.pending:
        raise HTTPException(
            status_code=HTTP_409_CONFLICT,
            detail=[error_detail(message="Document was already decided")],
        )

    if payload.status not in (
        DocStatus.approved,
        DocStatus.rejected,
        DocStatus.needs_revision,
    ):
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail=[
                error_detail(
                    message="Decision must be approved, rejected, or needs_revision"
                )
            ],
        )

    review = Review(
        document_id=doc.id,
        officer_id=officer.id,
        status=payload.status,
        comment=payload.comment,
    )
    db.add(review)

    # The AI never sets this — only a human decision reaches this line.
    doc.status = payload.status
    db.add(
        AuditEvent(
            actor_id=officer.id,
            document_id=doc.id,
            action=AuditAction.decided,
        )
    )
    db.commit()
    db.refresh(review)
    return review
