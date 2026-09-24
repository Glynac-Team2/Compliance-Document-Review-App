import hmac

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from itsdangerous import BadSignature
from sqlalchemy.orm import Session
from starlette.status import HTTP_400_BAD_REQUEST, HTTP_401_UNAUTHORIZED, HTTP_403_FORBIDDEN

from app.config import settings
from app.constants import CONSUMER_DOMAINS
from app.database import get_db
from app.email_service import email_service
from app.errors import error_detail
from app.models import Organization, User
from app.schemas import ForgotPasswordRequest, ResetPasswordRequest, SignupIn, TokenOut
from app.security import (
    create_access_token,
    hash_password,
    password_fingerprint,
    serializer,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def signup(
    payload: SignupIn,
    db: Session = Depends(get_db),
):
    email = payload.email.lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail=[
                error_detail(
                    message="An account with this email already exists",
                    field="email",
                )
            ],
        )

    domain = email.split("@")[-1]
    if domain in CONSUMER_DOMAINS:
        organization = Organization(domain=domain, name=f"{payload.name}'s Organization")
    else:
        organization = db.query(Organization).filter(Organization.domain == domain).first()
        if not organization:
            organization = Organization(domain=domain, name=domain.split(".")[0].capitalize())

    db.add(organization)
    db.flush()

    user = User(
        organization_id=organization.id,
        email=email,
        name=payload.name,
        password_hash=hash_password(payload.password),
        role=payload.role,  # fixed at signup — nothing later in the app can change this
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(
        subject=user.id,
        role=user.role.value,
        fingerprint=password_fingerprint(user.password_hash),
    )
    return TokenOut(access_token=token, role=user.role, name=user.name)


@router.post("/login", response_model=TokenOut)
def login(
    payload: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == payload.username.lower()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=HTTP_401_UNAUTHORIZED,
            detail=[
                error_detail(
                    message="Incorrect email or password",
                )
            ],
        )

    if not user.is_active:
        raise HTTPException(
            status_code=HTTP_403_FORBIDDEN,
            detail=[
                error_detail(
                    message="Your account is deactivated",
                )
            ],
        )

    token = create_access_token(
        subject=user.id,
        role=user.role.value,
        fingerprint=password_fingerprint(user.password_hash),
    )
    return TokenOut(access_token=token, role=user.role, name=user.name)


@router.post("/forgot-password")
def forgot_password(
    body: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == body.email.lower()).first()
    if user and user.is_active:
        token = serializer.dumps(
            {
                "uid": user.id,
                "fp": password_fingerprint(user.password_hash),
            }
        )
        link = f"{settings.frontend_base_url}/reset-password?token={token}"
        background_tasks.add_task(email_service.send_reset_email, user.email, link)

    return {"message": "If that email is registered, a reset link has been sent."}


@router.post("/reset-password")
def reset_password(
    body: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    invalid = HTTPException(
        status_code=HTTP_400_BAD_REQUEST,
        detail=[error_detail(message="Invalid or expired reset link")],
    )

    try:
        payload = serializer.loads(body.token, max_age=1800)
        uid = payload["uid"]
        fp = payload["fp"]
    except (BadSignature, KeyError, TypeError):
        raise invalid

    user = db.query(User).filter(User.id == uid).first()
    if (
        not user
        or not user.is_active
        or not hmac.compare_digest(fp, password_fingerprint(user.password_hash))
    ):
        raise invalid

    user.password_hash = hash_password(body.new_password)
    db.commit()

    return {"message": "Password has been reset."}
