from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from jose import JWTError
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_token, hash_password, hash_refresh_token, issue_token, verify_password
from app.dependencies import get_current_user
from app.models import RefreshToken, User
from app.schemas import LoginInput, RefreshInput, TokenPair, UserCreate, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)


def make_token_pair(user: User) -> TokenPair:
    access = issue_token(str(user.id), "access", timedelta(minutes=settings.access_token_minutes))
    refresh = issue_token(str(user.id), "refresh", timedelta(days=settings.refresh_token_days))
    return TokenPair(access_token=access, refresh_token=refresh, user=UserOut.model_validate(user))


@router.post("/register", response_model=TokenPair, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def register(request: Request, payload: UserCreate, db: Session = Depends(get_db)) -> TokenPair:
    user = User(email=payload.email.lower(), full_name=payload.full_name, password_hash=hash_password(payload.password), role="patient")
    db.add(user)
    try:
        db.flush()
        pair = make_token_pair(user)
        db.add(RefreshToken(user_id=user.id, token_hash=hash_refresh_token(pair.refresh_token), expires_at=datetime.now(UTC) + timedelta(days=settings.refresh_token_days)))
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists") from exc
    return pair


@router.post("/login", response_model=TokenPair)
@limiter.limit("10/minute")
def login(request: Request, payload: LoginInput, db: Session = Depends(get_db)) -> TokenPair:
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None or not user.is_active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    pair = make_token_pair(user)
    db.add(RefreshToken(user_id=user.id, token_hash=hash_refresh_token(pair.refresh_token), expires_at=datetime.now(UTC) + timedelta(days=settings.refresh_token_days)))
    db.commit()
    return pair


@router.post("/refresh", response_model=TokenPair)
@limiter.limit("20/minute")
def refresh(request: Request, payload: RefreshInput, db: Session = Depends(get_db)) -> TokenPair:
    refresh_token = payload.refresh_token
    try:
        payload = decode_token(refresh_token, "refresh")
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError) as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid refresh token") from exc
    stored = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == hash_refresh_token(refresh_token)))
    expires_at = stored.expires_at.replace(tzinfo=UTC) if stored is not None and stored.expires_at.tzinfo is None else (stored.expires_at if stored is not None else datetime.now(UTC))
    if stored is None or stored.revoked_at is not None or expires_at <= datetime.now(UTC):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh token has expired or been revoked")
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Account is unavailable")
    stored.revoked_at = datetime.now(UTC)
    pair = make_token_pair(user)
    db.add(RefreshToken(user_id=user.id, token_hash=hash_refresh_token(pair.refresh_token), expires_at=datetime.now(UTC) + timedelta(days=settings.refresh_token_days)))
    db.commit()
    return pair


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> None:
    db.query(RefreshToken).filter(RefreshToken.user_id == user.id, RefreshToken.revoked_at.is_(None)).update({RefreshToken.revoked_at: datetime.now(UTC)})
    db.commit()


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> User:
    return user