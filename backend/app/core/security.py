from datetime import UTC, datetime, timedelta
import hashlib
import secrets
from typing import Any

from jose import JWTError, jwt
from pwdlib import PasswordHash

from app.core.config import settings

ALGORITHM = "HS256"
password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return password_hash.verify(password, hashed)


def issue_token(subject: str, token_type: str, lifetime: timedelta) -> str:
    now = datetime.now(UTC)
    return jwt.encode(
        {"sub": subject, "type": token_type, "iat": now, "exp": now + lifetime, "jti": secrets.token_urlsafe(16)},
        settings.jwt_secret,
        algorithm=ALGORITHM,
    )


def decode_token(token: str, expected_type: str) -> dict[str, Any]:
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
    if payload.get("type") != expected_type:
        raise JWTError("Unexpected token type")
    return payload


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def opaque_token() -> str:
    return secrets.token_urlsafe(48)