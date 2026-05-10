from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timezone, timedelta

from models import get_db, Content, User
from schemas import ContentOut, ContentCreate, ContentUpdate
from auth import get_current_user
from api.v1.notify import notify_user_generation_complete

router = APIRouter(prefix="/content", tags=["Content"])

@router.get("/stats", tags=["Dashboard"])
def get_dashboard_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Aggregate usage stats for the dashboard."""
    user_id = current_user.id
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = today_start.replace(day=1)

    # Total counts by type
    type_counts = dict(
        db.query(Content.type, func.count(Content.id))
        .filter(Content.user_id == user_id)
        .group_by(Content.type).all()
    )

    # Status counts
    status_counts = dict(
        db.query(Content.status, func.count(Content.id))
        .filter(Content.user_id == user_id)
        .group_by(Content.status).all()
    )

    # Total credits spent
    total_credits = db.query(func.coalesce(func.sum(Content.credit_cost), 0))\
        .filter(Content.user_id == user_id).scalar() or 0

    # Today's counts by type
    today_counts = dict(
        db.query(Content.type, func.count(Content.id))
        .filter(Content.user_id == user_id, Content.created_at >= today_start)
        .group_by(Content.type).all()
    )

    # This week's counts
    week_counts = dict(
        db.query(Content.type, func.count(Content.id))
        .filter(Content.user_id == user_id, Content.created_at >= week_start)
        .group_by(Content.type).all()
    )

    # This month's counts
    month_counts = dict(
        db.query(Content.type, func.count(Content.id))
        .filter(Content.user_id == user_id, Content.created_at >= month_start)
        .group_by(Content.type).all()
    )

    # Credits spent today / this week / this month
    today_credits = db.query(func.coalesce(func.sum(Content.credit_cost), 0))\
        .filter(Content.user_id == user_id, Content.created_at >= today_start).scalar() or 0
    week_credits = db.query(func.coalesce(func.sum(Content.credit_cost), 0))\
        .filter(Content.user_id == user_id, Content.created_at >= week_start).scalar() or 0
    month_credits = db.query(func.coalesce(func.sum(Content.credit_cost), 0))\
        .filter(Content.user_id == user_id, Content.created_at >= month_start).scalar() or 0

    # Last 7 days daily counts for chart
    daily_data = []
    for i in range(6, -1, -1):
        day = today_start - timedelta(days=i)
        day_end = day + timedelta(days=1)
        day_count = db.query(func.count(Content.id))\
            .filter(Content.user_id == user_id, Content.created_at >= day, Content.created_at < day_end).scalar() or 0
        day_credits = db.query(func.coalesce(func.sum(Content.credit_cost), 0))\
            .filter(Content.user_id == user_id, Content.created_at >= day, Content.created_at < day_end).scalar() or 0
        daily_data.append({
            "date": day.strftime("%a"),
            "count": day_count,
            "credits": round(float(day_credits), 2),
        })

    # Model usage breakdown
    model_counts = dict(
        db.query(Content.model, func.count(Content.id))
        .filter(Content.user_id == user_id)
        .group_by(Content.model).all()
    )

    return {
        "total": sum(type_counts.values()),
        "type_counts": type_counts,
        "status_counts": status_counts,
        "total_credits": round(float(total_credits), 2),
        "today": {"total": sum(today_counts.values()), "type_counts": today_counts, "credits": round(float(today_credits), 2)},
        "this_week": {"total": sum(week_counts.values()), "type_counts": week_counts, "credits": round(float(week_credits), 2)},
        "this_month": {"total": sum(month_counts.values()), "type_counts": month_counts, "credits": round(float(month_credits), 2)},
        "daily_chart": daily_data,
        "model_counts": model_counts,
    }

@router.get("/", response_model=List[ContentOut])
def list_content(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Content).filter(Content.user_id == current_user.id).order_by(Content.created_at.desc()).all()

@router.post("/", response_model=ContentOut)
async def create_content(data: ContentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = Content(
        user_id=current_user.id,
        type=data.type,
        prompt=data.prompt,
        model=data.model,
        aspect_ratio=data.aspect_ratio,
        status=data.status or "processing",
        result_url=data.result_url,
        thumbnail_url=data.thumbnail_url,
        kie_task_id=data.kie_task_id,
        credit_cost=data.credit_cost or 0.0,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    # Send Telegram notification (fire-and-forget, don't block the response)
    import asyncio
    asyncio.create_task(notify_user_generation_complete(current_user, data.type, data.prompt, data.status or "processing"))
    return item

@router.patch("/{content_id}", response_model=ContentOut)
async def update_content(content_id: int, data: ContentUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Update content record — used by frontend to set video URL, thumbnail, and status after generation completes."""
    item = db.query(Content).filter(Content.id == content_id, Content.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    if data.status is not None:
        item.status = data.status
    if data.result_url is not None:
        item.result_url = data.result_url
    if data.thumbnail_url is not None:
        item.thumbnail_url = data.thumbnail_url
    if data.kie_task_id is not None:
        item.kie_task_id = data.kie_task_id
    if data.credit_cost is not None:
        item.credit_cost = data.credit_cost
    db.commit()
    db.refresh(item)
    return item

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