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
async def get_settings(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from crypto import decrypt_value
    from kie_client import KIEClient
    # Try to fetch fresh credit balance from KIE.AI if key is set
    if current_user.kie_api_key_encrypted:
        try:
            key = decrypt_value(current_user.kie_api_key_encrypted)
            client = KIEClient(key)
            result = await client.get_credits()
            if isinstance(result, dict):
                cb = result.get("credit_balance") or result.get("credits") or result.get("balance")
                if cb is not None:
                    current_user.credit_balance = float(cb)
                    db.commit()
                    db.refresh(current_user)
        except Exception:
            pass  # If KIE is unreachable, just return stored balance
    return SettingsOut(
        full_name=current_user.full_name,
        telegram=current_user.telegram,
        phone=current_user.phone,
        kie_api_key_set=bool(current_user.kie_api_key_encrypted),
        google_api_key_set=bool(current_user.google_key_encrypted),
        credit_balance=current_user.credit_balance,
        business_category=current_user.business_category or "",
        business_name=current_user.business_name or "",
        business_description=current_user.business_description or "",
        business_region=current_user.business_region or "",
        target_audience=current_user.target_audience or "",
        selling_platforms=current_user.selling_platforms or "",
    )

@router.post("/reset-password")
def reset_password(data: dict, db: Session = Depends(get_db)):
    """Admin endpoint to reset a user's password. Only works if RESET_SECRET matches."""
    import config
    if data.get("secret") != getattr(config, "RESET_SECRET", "qfm-reset-2026"):
        raise HTTPException(status_code=403, detail="Invalid reset secret")
    email = data.get("email")
    new_password = data.get("new_password")
    if not email or not new_password:
        raise HTTPException(status_code=400, detail="email and new_password required")
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.hashed_password = get_password_hash(new_password)
    db.commit()
    return {"message": "Password reset successfully", "email": email}

@router.post("/create-user")
def create_or_reset_user(data: dict, db: Session = Depends(get_db)):
    """Admin endpoint to create a user or reset their password if they exist."""
    import config
    if data.get("secret") != getattr(config, "RESET_SECRET", "qfm-reset-2026"):
        raise HTTPException(status_code=403, detail="Invalid reset secret")
    email = data.get("email")
    password = data.get("password")
    full_name = data.get("full_name", "")
    if not email or not password:
        raise HTTPException(status_code=400, detail="email and password required")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    user = db.query(User).filter(User.email == email).first()
    if user:
        # Reset password for existing user
        user.hashed_password = get_password_hash(password)
        if full_name:
            user.full_name = full_name
        db.commit()
        return {"message": "Password reset successfully", "email": email}
    else:
        # Create new user
        user = User(
            email=email,
            hashed_password=get_password_hash(password),
            full_name=full_name,
        )
        db.add(user)
        db.commit()
        return {"message": "User created successfully", "email": email}

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
    if data.google_api_key is not None:
        if data.google_api_key:
            current_user.google_key_encrypted = encrypt_value(data.google_api_key)
        else:
            current_user.google_key_encrypted = ""
    # Business profile fields
    for field in ['business_category', 'business_name', 'business_description', 'business_region', 'target_audience', 'selling_platforms']:
        val = getattr(data, field, None)
        if val is not None:
            setattr(current_user, field, val)
    db.commit()
    db.refresh(current_user)
    return SettingsOut(
        full_name=current_user.full_name,
        telegram=current_user.telegram,
        phone=current_user.phone,
        kie_api_key_set=bool(current_user.kie_api_key_encrypted),
        google_api_key_set=bool(current_user.google_key_encrypted),
        credit_balance=current_user.credit_balance,
        business_category=current_user.business_category or "",
        business_name=current_user.business_name or "",
        business_description=current_user.business_description or "",
        business_region=current_user.business_region or "",
        target_audience=current_user.target_audience or "",
        selling_platforms=current_user.selling_platforms or "",
    )