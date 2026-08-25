import os
import shutil
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.deps import get_current_user, require_role
from app.models import Document, User, Role, DocStatus, AuditEvent, AuditAction
from app.schemas import DocumentOut, DocumentDetailOut, ThreadEntry, AssistOut, FlagOut, PrecedentOut

router = APIRouter(prefix="/documents", tags=["documents"])

ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # .docx
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",  # .xlsx
}


def _log(db: Session, actor_id: str, document_id: str, action: AuditAction):
    db.add(AuditEvent(actor_id=actor_id, document_id=document_id, action=action))
    db.commit()


def _build_thread(db: Session, doc: Document) -> List[ThreadEntry]:
    """Walk revises_id back to the root, then present oldest \u2192 newest so a
    revise \u2192 resubmit \u2192 approve cycle reads as one linked history."""
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
            label = f"Revision {i} \u2014 current"
        else:
            label = f"Revision {i}"
        entries.append(ThreadEntry(id=d.id, filename=d.filename, label=label))
    return entries


@router.post("", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def submit_document(
    file: UploadFile = File(...),
    revises_id: Optional[str] = None,
    user: User = Depends(require_role(Role.advisor)),
    db: Session = Depends(get_db),
):
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Only PDF, DOCX, or XLSX files are accepted")

    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > settings.max_upload_mb:
        raise HTTPException(status_code=400, detail=f"File exceeds the {settings.max_upload_mb}MB limit")

    if revises_id:
        original = db.query(Document).filter(Document.id == revises_id).first()
        if not original:
            raise HTTPException(status_code=404, detail="Document being revised was not found")
        if original.advisor_id != user.id:
            raise HTTPException(status_code=403, detail="You can only revise your own submissions")
        if original.status != DocStatus.needs_revision:
            raise HTTPException(status_code=400, detail="Only a document marked 'needs revision' can be resubmitted")

    os.makedirs(settings.upload_dir, exist_ok=True)
    doc = Document(
        advisor_id=user.id,
        filename=file.filename,
        file_path="",  # set below once we have the id
        content_type=file.content_type,
        status=DocStatus.pending,
        revises_id=revises_id,
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

    _log(db, user.id, doc.id, AuditAction.resubmitted if revises_id else AuditAction.submitted)
    return doc


@router.get("", response_model=List[DocumentOut])
def list_documents(
    status_filter: Optional[DocStatus] = None,
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
def get_document(document_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if user.role == Role.advisor and doc.advisor_id != user.id:
        raise HTTPException(status_code=403, detail="You can only view your own submissions")

    _log(db, user.id, doc.id, AuditAction.viewed)
    thread = _build_thread(db, doc)
    out = DocumentDetailOut.model_validate(doc)
    out.thread = thread
    return out


@router.get("/{document_id}/assist", response_model=AssistOut)
def get_assist(document_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Stub for the AI track's real endpoint. Returns a fixed, clearly-fake
    analysis so the frontend can be built and demoed against a stable shape
    before the real masker/retrieval pipeline exists. Swap the body of this
    function for the real call — the response shape (AssistOut) is the
    contract the frontend already builds against, so it shouldn't need to
    change when the real thing lands.

    If LLM_API_KEY is unset, this also doubles as the "AI unavailable"
    degraded-state response the spec requires.
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if not settings.llm_api_key:
        return AssistOut(available=False, error="AI assist is not configured in this environment.")

    # Placeholder analysis — replace with the real masked-text + retrieval call.
    return AssistOut(
        available=True,
        summary=f"[stub] Analysis for {doc.filename} would appear here once the AI track's endpoint is wired in.",
        flags=[
            FlagOut(
                severity="medium",
                passage="[stub passage]",
                rule="[stub rule]",
                reason="Placeholder flag \u2014 replace with real rule-retrieval output.",
            )
        ],
        precedents=[],
    )
