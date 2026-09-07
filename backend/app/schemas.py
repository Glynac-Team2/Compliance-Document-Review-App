from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, EmailStr

from app.models import Role, DocStatus


# ---- Auth ----

class SignupIn(BaseModel):
    email: EmailStr
    name: str
    password: str
    role: Role


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: Role
    name: str


# ---- Users ----

class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: Role

    class Config:
        from_attributes = True


# ---- Reviews ----

class ReviewIn(BaseModel):
    status: DocStatus  # approved | rejected | needs_revision
    comment: str


class ReviewOut(BaseModel):
    id: str
    status: DocStatus
    comment: str
    decided_at: datetime
    officer: UserOut

    class Config:
        from_attributes = True


# ---- Documents ----

class ThreadEntry(BaseModel):
    id: str
    filename: str
    label: str


class DocumentOut(BaseModel):
    id: str
    filename: str
    content_type: str
    status: DocStatus
    uploaded_at: datetime
    advisor: UserOut
    revises_id: Optional[str] = None
    reviews: List[ReviewOut] = []
    extracted_text: Optional[str] = None

    class Config:
        from_attributes = True


class DocumentDetailOut(DocumentOut):
    thread: List[ThreadEntry] = []


# ---- AI assist (stub — real implementation belongs to the AI track) ----

class FlagOut(BaseModel):
    severity: str
    passage: str
    rule: str
    reason: str


class PrecedentOut(BaseModel):
    document_id: str
    verdict: DocStatus
    note: str


class AssistOut(BaseModel):
    available: bool
    summary: Optional[str] = None
    flags: List[FlagOut] = []
    precedents: List[PrecedentOut] = []
    error: Optional[str] = None
