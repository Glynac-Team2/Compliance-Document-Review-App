import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, DateTime, ForeignKey, Enum as SAEnum, Text
)
from sqlalchemy.orm import relationship

from app.database import Base


def gen_id() -> str:
    return uuid.uuid4().hex[:12]


class Role(str, enum.Enum):
    advisor = "advisor"
    officer = "officer"


class DocStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    needs_revision = "needs_revision"


class AuditAction(str, enum.Enum):
    submitted = "submitted"
    viewed = "viewed"
    decided = "decided"
    resubmitted = "resubmitted"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_id)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(SAEnum(Role), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    documents = relationship("Document", back_populates="advisor", foreign_keys="Document.advisor_id")


class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=gen_id)
    advisor_id = Column(String, ForeignKey("users.id"), nullable=False)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    content_type = Column(String, nullable=False)
    status = Column(SAEnum(DocStatus), default=DocStatus.pending, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    # Self-referential link: a resubmission points at the document it replaces.
    # Walking this chain (see routers/documents.py: get_thread) reconstructs
    # the whole revision history as one ordered thread.
    revises_id = Column(String, ForeignKey("documents.id"), nullable=True)

    advisor = relationship("User", back_populates="documents", foreign_keys=[advisor_id])
    reviews = relationship("Review", back_populates="document", order_by="Review.decided_at")


class Review(Base):
    __tablename__ = "reviews"

    id = Column(String, primary_key=True, default=gen_id)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False)
    officer_id = Column(String, ForeignKey("users.id"), nullable=False)
    status = Column(SAEnum(DocStatus), nullable=False)
    comment = Column(Text, nullable=False)
    decided_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="reviews")
    officer = relationship("User")


class AuditEvent(Base):
    """Append-only. Nothing in this app should ever UPDATE or DELETE a row here."""
    __tablename__ = "audit_events"

    id = Column(String, primary_key=True, default=gen_id)
    actor_id = Column(String, ForeignKey("users.id"), nullable=False)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False)
    action = Column(SAEnum(AuditAction), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
