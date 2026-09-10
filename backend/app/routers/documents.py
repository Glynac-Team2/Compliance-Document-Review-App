import os

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from starlette.status import (
    HTTP_400_BAD_REQUEST,
    HTTP_403_FORBIDDEN,
    HTTP_404_NOT_FOUND,
)

from app.ai.service import run_assist
from app.ai.text_extraction import extract_file_text
from app.config import settings
from app.database import get_db
from app.deps import get_current_user, require_role
from app.errors import error_detail
from app.models import AuditAction, AuditEvent, DocStatus, Document, Role, User
from app.schemas import (
    AssistOut,
    DocumentDetailOut,
    DocumentOut,
    ThreadEntry,
)

router = APIRouter(prefix="/documents", tags=["documents"])

ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # .docx
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",  # .xlsx
}


def _log(db: Session, actor_id: str, document_id: str, action: AuditAction):
    db.add(AuditEvent(actor_id=actor_id, document_id=document_id, action=action))
    db.commit()


def _build_thread(db: Session, doc: Document) -> list[ThreadEntry]:
    """Walk revises_id back to the root, then present oldest → newest so a
    revise → resubmit → approve cycle reads as one linked history."""
    chain = [doc]
    cursor = doc
    while cursor.revises_id:
        cursor = db.query(Document).filter(Document.id == cursor.revises_id).first()
        if not cursor:
            break
        chain.append(cursor)
    chain.reverse()

    entries = []
    for i, d in enumerate(chain):
        if i == 0:
            label = "Original submission"
        elif d.id == doc.id:
            label = f"Revision {i} — current"
        else:
            label = f"Revision {i}"
        entries.append(ThreadEntry(id=d.id, filename=d.filename, label=label))
    return entries


@router.post("", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def submit_document(
    file: UploadFile = File(...),
    revises_id: str | None = None,
    user: User = Depends(require_role(Role.advisor)),
    db: Session = Depends(get_db),
):
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail=[error_detail(message="Only PDF, DOCX, or XLSX files are accepted")],
        )

    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > settings.max_upload_mb:
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail=[
                error_detail(
                    message=f"File exceeds the {settings.max_upload_mb}MB limit"
                )
            ],
        )

    if revises_id:
        original = db.query(Document).filter(Document.id == revises_id).first()
        if not original:
            raise HTTPException(
                status_code=HTTP_404_NOT_FOUND,
                detail=[error_detail(message="Document being revised was not found")],
            )
        if original.advisor_id != user.id:
            raise HTTPException(
                status_code=HTTP_403_FORBIDDEN,
                detail=[
                    error_detail(message="You can only revise your own submissions")
                ],
            )
        if original.status != DocStatus.needs_revision:
            raise HTTPException(
                status_code=HTTP_400_BAD_REQUEST,
                detail=[
                    error_detail(
                        message="Only a document marked 'needs revision' can be resubmitted"
                    )
                ],
            )

    # Extraction runs after validation above — no point extracting text
    # from a file that's about to be rejected as an invalid revision.
    extracted_text_content = extract_file_text(
        contents, file.content_type, file.filename
    )

    os.makedirs(settings.upload_dir, exist_ok=True)
    doc = Document(
        advisor_id=user.id,
        filename=file.filename,
        file_path="",  # set below once we have the id
        content_type=file.content_type,
        status=DocStatus.pending,
        revises_id=revises_id,
        extracted_text=extracted_text_content,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    dest = os.path.join(settings.upload_dir, f"{doc.id}_{file.filename}")
    with open(dest, "wb") as f:
        f.write(contents)
    doc.file_path = dest
    db.commit()
    db.refresh(doc)

    _log(
        db,
        user.id,
        doc.id,
        AuditAction.resubmitted if revises_id else AuditAction.submitted,
    )
    return doc


@router.get("", response_model=list[DocumentOut])
def list_documents(
    status_filter: DocStatus | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Document)
    if user.role == Role.advisor:
        # An advisor only ever sees their own submissions — enforced here,
        # not left to the frontend to filter client-side.
        query = query.filter(Document.advisor_id == user.id)
    # Officers see everyone's queue: any officer can act on any document,
    # there's no per-officer routing per the spec.

    if status_filter:
        query = query.filter(Document.status == status_filter)

    return query.order_by(Document.uploaded_at.desc()).all()


@router.get("/{document_id}", response_model=DocumentDetailOut)
def get_document(
    document_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(
            status_code=HTTP_404_NOT_FOUND,
            detail=[error_detail(message="Document not found")],
        )
    if user.role == Role.advisor and doc.advisor_id != user.id:
        raise HTTPException(
            status_code=HTTP_403_FORBIDDEN,
            detail=[error_detail(message="You can only view your own submissions")],
        )

    _log(db, user.id, doc.id, AuditAction.viewed)
    thread = _build_thread(db, doc)
    out = DocumentDetailOut.model_validate(doc)
    out.thread = thread
    return out


@router.get("/{document_id}/assist", response_model=AssistOut)
def get_assist(
    document_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Real AI-assist analysis: masked-text summary + rule-grounded flags,
    cached per document. Returns available=False (never raises) if no
    LLM_API_KEY is configured, or if extraction/masking/the LLM call fails
    for any reason — the review page and decision buttons must keep
    working regardless of what this endpoint returns.
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(
            status_code=HTTP_404_NOT_FOUND,
            detail=[error_detail(message="Document not found")],
        )

    if not settings.llm_api_key:
        return AssistOut(
            available=False, error="AI assist is not configured in this environment."
        )

    return run_assist(doc, db)
