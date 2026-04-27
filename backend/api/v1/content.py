from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from models import get_db, Content, User
from schemas import ContentOut
from auth import get_current_user

router = APIRouter(prefix="/content", tags=["Content"])

@router.get("/", response_model=List[ContentOut])
def list_content(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Content).filter(Content.user_id == current_user.id).order_by(Content.created_at.desc()).all()

@router.get("/{content_id}", response_model=ContentOut)
def get_content(content_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(Content).filter(Content.id == content_id, Content.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    return item

@router.delete("/{content_id}")
def delete_content(content_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(Content).filter(Content.id == content_id, Content.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(item)
    db.commit()
    return {"ok": True}
