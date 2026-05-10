from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import httpx
import logging

from models import get_db, User
from schemas import TelegramSettings
from auth import get_current_user
from crypto import encrypt_value, decrypt_value
import config

router = APIRouter(prefix="/notify", tags=["Notifications"])

logger = logging.getLogger(__name__)

async def send_telegram_message(bot_token: str, chat_id: str, text: str) -> bool:
    """Send a message via Telegram Bot API. Returns True on success."""
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {"chat_id": chat_id, "text": text, "parse_mode": "HTML"}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                logger.info(f"Telegram notification sent to {chat_id}")
                return True
            else:
                logger.warning(f"Telegram API error: {resp.status_code} {resp.text}")
                return False
    except Exception as e:
        logger.error(f"Telegram notification failed: {e}")
        return False

@router.post("/telegram")
async def notify_telegram(data: TelegramSettings, message: str = "✅ Content generated!", current_user: User = Depends(get_current_user)):
    """Send a test Telegram notification."""
    if not data.bot_token or not data.chat_id:
        raise HTTPException(status_code=400, detail="Bot token and chat ID required")
    success = await send_telegram_message(data.bot_token, data.chat_id, message)
    if success:
        return {"ok": True, "message": "Notification sent"}
    raise HTTPException(status_code=502, detail="Failed to send Telegram notification")

@router.post("/telegram/setup")
async def setup_telegram(data: TelegramSettings, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Save Telegram bot token and chat ID for the user."""
    # Encrypt the bot token like we do for KIE API key
    current_user.telegram_bot_token_encrypted = encrypt_value(data.bot_token)
    current_user.telegram_chat_id = data.chat_id
    db.commit()
    return {"ok": True, "message": "Telegram settings saved"}

@router.get("/telegram")
async def get_telegram_settings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get current Telegram settings (bot token masked)."""
    bot_token = ""
    if current_user.telegram_bot_token_encrypted:
        try:
            bot_token = decrypt_value(current_user.telegram_bot_token_encrypted)
        except Exception:
            bot_token = ""
    return {
        "bot_token": bot_token[:8] + "..." + bot_token[-4:] if len(bot_token) > 12 else ("***" if bot_token else ""),
        "chat_id": current_user.telegram_chat_id or "",
        "configured": bool(current_user.telegram_bot_token_encrypted and current_user.telegram_chat_id),
    }

@router.delete("/telegram")
async def delete_telegram_settings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Remove Telegram settings."""
    current_user.telegram_bot_token_encrypted = ""
    current_user.telegram_chat_id = ""
    db.commit()
    return {"ok": True}

async def notify_user_generation_complete(user: User, content_type: str, prompt: str, status: str = "completed"):
    """Send a Telegram notification about generation completion (fire-and-forget)."""
    if not user.telegram_bot_token_encrypted or not user.telegram_chat_id:
        return  # Not configured
    
    try:
        bot_token = decrypt_value(user.telegram_bot_token_encrypted)
    except Exception:
        return
    
    emoji = {"image": "🎨", "video": "🎬", "text": "📝", "music": "🎵", "storyboard": "🎬"}.get(content_type, "✨")
    status_emoji = "✅" if status == "completed" else "❌"
    prompt_preview = prompt[:80] + "..." if len(prompt) > 80 else prompt
    
    text = f"""{status_emoji} <b>QFM Studio</b> — Generation Complete

{emoji} <b>Type:</b> {content_type.title()}
📋 <b>Prompt:</b> {prompt_preview}
📊 <b>Status:</b> {status.title()}"""
    
    await send_telegram_message(bot_token, user.telegram_chat_id, text)