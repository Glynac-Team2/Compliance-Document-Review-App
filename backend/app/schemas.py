from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.models import DocStatus, Role

# ---- Auth ----


class SignupIn(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1)
    password: str = Field(min_length=8)
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
    revises_id: str | None = None
    reviews: list[ReviewOut] = []
    extracted_text: str | None = None

    class Config:
        from_attributes = True


class DocumentDetailOut(DocumentOut):
    thread: list[ThreadEntry] = []


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
    summary: str | None = None
    flags: list[FlagOut] = []
    precedents: list[PrecedentOut] = []
    error: str | None = None
    document_category: str | None = None