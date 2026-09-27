from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import jwt, JWTError
import datetime

from app.database import get_db
from app.models import User
from app.schemas import LoginRequest, TokenResponse, UserInfo
from app.config import settings
from app.security import verify_password

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

def create_access_token(data: dict, expires_delta: datetime.timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=15)
    to_encode.update({"exp": expire})
    secret = getattr(settings, "SECRET_KEY", "sih26027_super_secret_key")
    algorithm = getattr(settings, "ALGORITHM", "HS256")
    return jwt.encode(to_encode, secret, algorithm=algorithm)

def to_user_info(user: User) -> UserInfo:
    return UserInfo(
        employee_id=user.employee_id,
        name=user.name,
        role=user.role,
        department=user.department or "",
        zone=user.zone,
        division=user.division,
    )

async def _fetch_user(db: AsyncSession, employee_id: str) -> User | None:
    result = await db.execute(select(User).where(User.employee_id == employee_id))
    return result.scalar_one_or_none()

def _decode_sub(token: str) -> str:
    secret = getattr(settings, "SECRET_KEY", "sih26027_super_secret_key")
    algorithm = getattr(settings, "ALGORITHM", "HS256")
    payload = jwt.decode(token, secret, algorithms=[algorithm])
    employee_id: str | None = payload.get("sub")
    if not employee_id:
        raise ValueError("missing subject")
    return employee_id

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> UserInfo:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        employee_id = _decode_sub(token)
    except (JWTError, ValueError):
        raise credentials_exception

    user = await _fetch_user(db, employee_id)
    if user is None or not user.is_active:
        raise credentials_exception
    return to_user_info(user)

async def get_current_user_optional(
    token: str | None = Depends(oauth2_scheme_optional),
    db: AsyncSession = Depends(get_db),
) -> UserInfo | None:
    if not token:
        return None
    try:
        employee_id = _decode_sub(token)
    except (JWTError, ValueError):
        return None
    user = await _fetch_user(db, employee_id)
    if user is None or not user.is_active:
        return None
    return to_user_info(user)

@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticates user against the database and returns a JWT token."""
    user = await _fetch_user(db, request.employee_id)
    if user is None or not user.is_active or not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid employee ID or password")

    access_token = create_access_token(
        data={"sub": user.employee_id},
        expires_delta=datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return TokenResponse(access_token=access_token, token_type="bearer", user=to_user_info(user))

@router.get("/me", response_model=UserInfo)
async def get_me(current_user: UserInfo = Depends(get_current_user)):
    """Returns current user details."""
    return current_user
