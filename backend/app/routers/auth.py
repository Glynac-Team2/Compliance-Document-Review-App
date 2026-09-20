from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from starlette.status import HTTP_400_BAD_REQUEST, HTTP_401_UNAUTHORIZED

from app.constants import CONSUMER_DOMAINS
from app.database import get_db
from app.errors import error_detail
from app.models import Organization, User
from app.schemas import SignupIn, TokenOut
from app.security import create_access_token, hash_password, verify_password

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

    token = create_access_token(subject=user.id, role=user.role.value)
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

    token = create_access_token(subject=user.id, role=user.role.value)
    return TokenOut(access_token=token, role=user.role, name=user.name)
