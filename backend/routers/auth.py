from __future__ import annotations

import os
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Set

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from mock_data import DEMO_ACCOUNTS
from models import LoginRequest, LoginResponse

router = APIRouter(prefix="/auth", tags=["auth"])

SECRET_KEY = os.getenv("FLARE_SECRET_KEY", "flare-dev-secret-2024")
ALGORITHM = "HS256"
TOKEN_EXPIRY_HOURS = 8

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

_blacklisted_tokens: Set[str] = set()


def _create_token(data: Dict[str, Any]) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRY_HOURS)
    to_encode["exp"] = expire
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme)) -> Dict[str, Any]:
    if token in _blacklisted_tokens:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has been revoked")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str | None = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
        return {
            "user_id": payload["user_id"],
            "user_type": payload["user_type"],
            "name": payload["name"],
            "email": payload["email"],
        }
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest) -> LoginResponse:
    account = DEMO_ACCOUNTS.get(request.email)
    if account is None or account["password"] != request.password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    token_data = {
        "user_id": account["user_id"],
        "user_type": account["user_type"],
        "name": account["name"],
        "email": request.email,
    }
    access_token = _create_token(token_data)

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user_type=account["user_type"],
        user_id=account["user_id"],
        name=account["name"],
        email=request.email,
    )


@router.post("/logout")
async def logout(token: str = Depends(oauth2_scheme)) -> Dict[str, str]:
    _blacklisted_tokens.add(token)
    return {"message": "Logged out successfully"}


@router.get("/demo-accounts")
async def demo_accounts() -> list[Dict[str, Any]]:
    accounts = []
    for email, info in DEMO_ACCOUNTS.items():
        accounts.append({
            "email": email,
            "name": info["name"],
            "role": info["user_type"],
            "user_id": info["user_id"],
        })
    return accounts
