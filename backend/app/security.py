import hashlib
from datetime import datetime, timedelta

from itsdangerous import URLSafeTimedSerializer
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

# Explicitly configure passlib for modern bcrypt compatibility
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__default_rounds=12)

serializer = URLSafeTimedSerializer(secret_key=settings.jwt_secret, salt="reset-salts")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def password_fingerprint(password_hash: str) -> str:
    return hashlib.sha256(password_hash.encode()).hexdigest()[:16]


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return pwd_context.verify(password, password_hash)
    except Exception:
        return False


def create_access_token(subject: str, role: str, fingerprint: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": subject, "role": role, "exp": expire, "claim": fingerprint}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        raise ValueError("Invalid or expired token")
