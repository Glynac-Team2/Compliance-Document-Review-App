from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import EmailStr
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from starlette.status import HTTP_400_BAD_REQUEST, HTTP_404_NOT_FOUND, HTTP_409_CONFLICT

from app.database import get_db
from app.deps import require_role
from app.errors import error_detail
from app.models import Role, User
from app.schemas import UserOut, UserUpdate
from app.security import hash_password

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=list[UserOut])
async def list_users(
    _: User = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    name: str | None = None,
    email: EmailStr | None = None,
    role: Role | None = None,
):
    query = db.query(User)
    if name:
        query = query.filter(User.name.ilike(f"%{name}%"))
    if email:
        query = query.filter(User.email.ilike(f"%{email}%"))
    if role:
        query = query.filter(User.role == role)
    return query.order_by(User.created_at.desc(), User.id.desc()).offset(offset).limit(limit).all()


@router.get("/users/{user_id}", response_model=UserOut)
async def get_user(
    user_id: str,
    _: User = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
):
    return db.query(User).filter(User.id == user_id).first()


@router.patch("/users/{user_id}", response_model=UserOut)
async def update_user(
    user_id: str,
    payload: UserUpdate,
    current_user: User = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
):
    if current_user.id == user_id and payload.is_active is False:
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail=[error_detail(message="You cannot deactivate yourself")],
        )

    if current_user.id == user_id and payload.role not in [None, Role.admin]:
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail=[error_detail(message="You cannot change your own role")],
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=HTTP_404_NOT_FOUND,
            detail=[error_detail(message="User not found")],
        )

    data = payload.model_dump(exclude_unset=True)

    password = data.pop("password", None)
    if password is not None:
        user.password_hash = hash_password(password)

    for field, value in data.items():
        setattr(user, field, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=HTTP_409_CONFLICT,
            detail=[error_detail(message="Email already in use")],
        )

    db.refresh(user)
    return user
