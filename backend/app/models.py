import enum
import json
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, DateTime, ForeignKey, Enum as SAEnum, Text, UniqueConstraint
)
from sqlalchemy.orm import relationship
from app.database import Base
from pgvector.sqlalchemy import Vector #adding pgvector support for vector embeddings

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
    extracted_text = Column(Text, nullable=True)
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


# ---------------------------------------------------------------------------
# AI track additions
# ---------------------------------------------------------------------------

class AIAnalysis(Base):
    """Cached AI assist result for one document. Regenerated only on
    explicit retry — never recomputed on a normal page load."""
    __tablename__ = "ai_analyses"

    id = Column(String, primary_key=True, default=gen_id)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False, unique=True)
    summary = Column(Text, nullable=False)
    generated_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", backref="ai_analysis", uselist=False)
    flags = relationship("Flag", back_populates="analysis", cascade="all, delete-orphan")

    __table_args__ = (UniqueConstraint("document_id", name="uq_ai_analysis_document"),)


class Flag(Base):
    """One compliance flag from an analysis. Fields map directly onto
    schemas.FlagOut — every flag must carry the passage it fired on,
    the rule it was checked against, and a one-line reason, per spec."""
    __tablename__ = "flags"

    id = Column(String, primary_key=True, default=gen_id)
    analysis_id = Column(String, ForeignKey("ai_analyses.id"), nullable=False)
    severity = Column(String, nullable=False)  # "low" | "medium" | "high"
    passage = Column(Text, nullable=False)
    rule = Column(Text, nullable=False)
    reason = Column(Text, nullable=False)

    analysis = relationship("AIAnalysis", back_populates="flags")


class PIIMapping(Base):
    """Server-side-only placeholder -> real value mapping for one document.
    NEVER import or query this model from any code path that constructs
    an outbound LLM/embedding request.
    """
    __tablename__ = "pii_mappings"

    id = Column(String, primary_key=True, default=gen_id)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False, unique=True)
    mapping_json = Column(Text, nullable=False)  # JSON: {"[CLIENT_1]": "Jane Doe", ...}

    document = relationship("Document", backref="pii_mapping", uselist=False)

    def to_mapping_dict(self) -> dict:
        return json.loads(self.mapping_json)

    @classmethod
    def store(cls, document_id: str, mapping_dict: dict) -> "PIIMapping":
        return cls(document_id=document_id, mapping_json=json.dumps(mapping_dict))

class PrecedentIndex(Base):
    # Stores vector embeddings of past reviews to power similarity search.
    __tablename__ = "precedent_index"
    
    id = Column(String, primary_key=True)
    doc_type = Column(String, nullable=False)
    masked_text = Column(Text, nullable=False)
    decision = Column(String, nullable=False)
    officer_comment = Column(Text, nullable=False)
    embedding = Column(Vector(768))

class ComplianceCorpus(Base):
    # Stores vector embeddings of firm rules and required disclosures.
    __tablename__ = "compliance_corpus"
    
    id = Column(String, primary_key=True)
    category = Column(String, nullable=False)
    text = Column(Text, nullable=False)
    embedding = Column(Vector(768))