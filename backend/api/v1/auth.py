from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from models import get_db, User
from auth import get_password_hash, authenticate_user, create_access_token, get_current_user
from schemas import UserRegister, UserLogin, Token, UserOut, SettingsIn, SettingsOut
from crypto import encrypt_value, decrypt_value
import config

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/register", response_model=Token)
@limiter.limit("5/minute")
def register(request: Request, data: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if len(data.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if not any(c.isupper() for c in data.password) or not any(c.isdigit() for c in data.password):
        raise HTTPException(status_code=400, detail="Password must contain at least one uppercase letter and one digit")
    user = User(
        email=data.email,
        hashed_password=get_password_hash(data.password),
        full_name=data.full_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    access_token = create_access_token({"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
def login(request: Request, data: UserLogin, db: Session = Depends(get_db)):
    """JSON login endpoint — accepts {email, password}."""
    user = authenticate_user(db, data.email, data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    access_token = create_access_token({"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login/form", response_model=Token)
@limiter.limit("10/minute")
def login_form(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Form-data login endpoint for OAuth2 compatibility."""
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    access_token = create_access_token({"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/settings", response_model=SettingsOut)
def get_settings(current_user: User = Depends(get_current_user)):
    return SettingsOut(
        full_name=current_user.full_name,
        telegram=current_user.telegram,
        phone=current_user.phone,
        kie_api_key_set=bool(current_user.kie_api_key_encrypted),
        credit_balance=current_user.credit_balance,
    )

@router.put("/settings", response_model=SettingsOut)
def update_settings(data: SettingsIn, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if data.full_name is not None:
        current_user.full_name = data.full_name
    if data.telegram is not None:
        current_user.telegram = data.telegram
    if data.phone is not None:
        current_user.phone = data.phone
    if data.kie_api_key is not None:
        if data.kie_api_key:
            current_user.kie_api_key_encrypted = encrypt_value(data.kie_api_key)
        else:
            current_user.kie_api_key_encrypted = ""
    db.commit()
    db.refresh(current_user)
    return SettingsOut(
        full_name=current_user.full_name,
        telegram=current_user.telegram,
        phone=current_user.phone,
        kie_api_key_set=bool(current_user.kie_api_key_encrypted),
        credit_balance=current_user.credit_balance,
    )