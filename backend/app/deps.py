import hmac

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.errors import error_detail
from app.models import Role, User
from app.security import decode_access_token, password_fingerprint

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    try:
        payload = decode_access_token(token)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=[error_detail("Could not validate credentials")],
        )

    user = db.query(User).filter(User.id == payload.get("sub")).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=[error_detail("User no longer exists")],
        )

    if not hmac.compare_digest(payload.get("claim", ""), password_fingerprint(user.password_hash)):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=[error_detail("Could not validate credentials")],
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=[error_detail("Your account is deactivated")],
        )

    return user


def require_role(*allowed: Role):
    """Every document/review route that's role-specific depends on this.
    This is the boundary that has to hold when probed directly at the API,
    not just when the UI hides a button."""

    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This action requires role: {', '.join(r.value for r in allowed)}",
            )
        return user

    return checker
