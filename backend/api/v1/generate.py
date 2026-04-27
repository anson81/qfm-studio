from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from models import get_db, User, Content
from schemas import GenerateVideoIn, GenerateImageIn, GenerateTextIn, StatusCheckIn, ContentOut
from auth import get_current_user
from kie_client import KIEClient
from crypto import decrypt_value

router = APIRouter(prefix="/generate", tags=["Generate"])

def get_kie_client(user: User) -> KIEClient:
    if not user.kie_api_key_encrypted:
        raise HTTPException(status_code=400, detail="KIE.AI API key not configured. Add it in Settings.")
    key = decrypt_value(user.kie_api_key_encrypted)
    return KIEClient(key)

async def save_content(db: Session, user_id: int, content_type: str, prompt: str, model: str, aspect_ratio: str, task_id: str):
    item = Content(
        user_id=user_id, type=content_type, prompt=prompt,
        model=model, aspect_ratio=aspect_ratio,
        status="processing", kie_task_id=task_id
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.post("/video")
async def generate_video(data: GenerateVideoIn, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    client = get_kie_client(current_user)
    result = await client.generate_video(
        prompt=data.prompt, model=data.model,
        aspect_ratio=data.aspect_ratio, resolution=data.resolution, num_videos=data.num_videos
    )
    task_id = result.get("task_id") or result.get("id")
    if not task_id:
        raise HTTPException(status_code=500, detail="No task_id received from KIE.AI")
    item = await save_content(db, current_user.id, "video", data.prompt, data.model, data.aspect_ratio, task_id)
    return {"task_id": task_id, "content_id": item.id, "status": "processing"}

@router.post("/image")
async def generate_image(data: GenerateImageIn, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    client = get_kie_client(current_user)
    result = await client.generate_image(
        prompt=data.prompt, model=data.model,
        aspect_ratio=data.aspect_ratio, num_images=data.num_images
    )
    task_id = result.get("task_id") or result.get("id")
    if not task_id:
        raise HTTPException(status_code=500, detail="No task_id received from KIE.AI")
    item = await save_content(db, current_user.id, "image", data.prompt, data.model, data.aspect_ratio, task_id)
    return {"task_id": task_id, "content_id": item.id, "status": "processing"}

@router.post("/text")
async def generate_text(data: GenerateTextIn, current_user: User = Depends(get_current_user)):
    client = get_kie_client(current_user)
    result = await client.chat_completion(
        messages=[
            {"role": "system", "content": data.system_prompt},
            {"role": "user", "content": data.user_message},
        ],
        model=data.model,
    )
    return {"result": result}

@router.post("/video/status")
async def video_status(data: StatusCheckIn, current_user: User = Depends(get_current_user)):
    client = get_kie_client(current_user)
    return await client.check_video_status(data.task_ids)

@router.post("/image/status")
async def image_status(data: StatusCheckIn, current_user: User = Depends(get_current_user)):
    client = get_kie_client(current_user)
    return await client.check_image_status(data.task_ids)

@router.get("/credits")
async def get_credits(current_user: User = Depends(get_current_user)):
    client = get_kie_client(current_user)
    result = await client.get_credits()
    return result
