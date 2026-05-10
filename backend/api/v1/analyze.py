"""Video Analyzer — upload video or paste TikTok/Douyin link → extract frames → Gemini analysis."""
import os, uuid, subprocess, json, shutil, tempfile, asyncio
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel

from models import get_db, User, Content
from auth import get_current_user
from crypto import decrypt_value

router = APIRouter(prefix="/analyze", tags=["Analyze"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "../../uploads")
FRAMES_DIR = os.path.join(os.path.dirname(__file__), "../../uploads/frames")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(FRAMES_DIR, exist_ok=True)


class AnalyzeURLRequest(BaseModel):
    url: str  # TikTok / Douyin / any video URL
    business_context: Optional[str] = None  # e.g. "modest fashion brand selling hijabs"


def extract_key_frames(video_path: str, output_dir: str, num_frames: int = 8) -> list[str]:
    """Extract evenly-spaced key frames from a video using ffmpeg."""
    # Get video duration
    cmd = [
        "ffprobe", "-v", "quiet", "-print_format", "json",
        "-show_format", "-show_streams", video_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    probe = json.loads(result.stdout)
    duration = float(probe.get("format", {}).get("duration", 0))
    if duration <= 0:
        # Fallback: check streams
        for stream in probe.get("streams", []):
            if "duration" in stream:
                duration = float(stream["duration"])
                break
    if duration <= 0:
        duration = 30  # default 30 seconds

    frame_paths = []
    for i in range(num_frames):
        timestamp = (duration / (num_frames + 1)) * (i + 1)
        output_path = os.path.join(output_dir, f"frame_{i:02d}.jpg")
        cmd = [
            "ffmpeg", "-y", "-ss", str(timestamp), "-i", video_path,
            "-frames:v", "1", "-q:v", "2", output_path
        ]
        try:
            subprocess.run(cmd, capture_output=True, text=True, timeout=15)
            if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                frame_paths.append(output_path)
        except Exception:
            pass

    return frame_paths


async def download_video(url: str) -> tuple[str, str]:
    """Download video from TikTok/Douyin/general URL using yt-dlp. Returns (path, title)."""
    output_template = os.path.join(UPLOAD_DIR, f"yt_{uuid.uuid4().hex[:12]}.mp4")

    cmd = [
        "yt-dlp",
        "--no-check-certificates",
        "--no-warnings",
        "-f", "best[ext=mp4]/best",
        "--max-filesize", "200M",
        "-o", output_template,
        "--print", "title",
        url
    ]

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=120)
        # yt-dlp prints title to stdout when --print is used
        title = stdout.decode().strip().split('\n')[0] if stdout else "Video"
        if not os.path.exists(output_template):
            # yt-dlp might add extension
            mp4_files = [f for f in os.listdir(UPLOAD_DIR) if f.startswith(os.path.basename(output_template).replace('.mp4', ''))]
            if mp4_files:
                output_template = os.path.join(UPLOAD_DIR, mp4_files[0])
            else:
                raise Exception(f"Download failed: {stderr.decode()[:500]}")
        return output_template, title
    except asyncio.TimeoutError:
        raise HTTPException(status_code=408, detail="Video download timed out (2 min). Try a shorter video.")
    except Exception as e:
        if "HTTP Error" in str(e) or "Sign in" in str(e):
            raise HTTPException(status_code=400, detail="Could not download video. The link may be private or region-restricted.")
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)[:200]}")


async def analyze_with_gemini(frames: list[str], business_context: Optional[str], api_key: str) -> dict:
    """Send extracted frames to Gemini for video analysis."""
    import httpx

    # Build the multimodal request
    parts = []
    for frame_path in frames:
        with open(frame_path, "rb") as f:
            import base64
            b64 = base64.b64encode(f.read()).decode()
        parts.append({
            "inline_data": {
                "mime_type": "image/jpeg",
                "data": b64
            }
        })

    context_hint = ""
    if business_context:
        context_hint = f"\nThe user runs this business: {business_context}. Tailor the analysis and suggestions to this business context."

    prompt_text = f"""You are an expert short-form video analyst specializing in TikTok/Douyin marketing content. Analyze these video frames and provide a structured breakdown:{context_hint}

Respond in this EXACT JSON format (no markdown, no backticks, pure JSON):
{{
  "summary": "1-2 sentence video summary",
  "video_type": "product_showcase|tutorial|storytelling|trend_participation|behind_the_scenes|testimonial|comparison|challenge",
  "hook": {{
    "description": "What is the opening hook?",
    "effectiveness": "high|medium|low",
    "suggestion": "How to improve the hook"
  }},
  "selling_points": [
    {{"point": "description", "timestamp": "approximate", "visual": "what's shown"}}
  ],
  "call_to_action": {{
    "description": "What CTA is used?",
    "type": "swipe_up|comment|follow|buy_now|share|none",
    "placement": "beginning|middle|end|throughout"
  }},
  "pacing": {{
    "style": "fast_cuts|slow|medium|variable",
    "estimated_cuts": 10,
    "avg_cut_duration": "0.5s"
  }},
  "visual_style": {{
    "lighting": "natural|studio|dramatic|soft",
    "color_grading": "warm|cool|neutral|vibrant|moody",
    "camera_work": "static|handheld|gimbal|tripod",
    "text_on_screen": true,
    "text_style": "bold_center|subtitle|lower_third"
  }},
  "audio_cues": {{
    "trending_audio": true,
    "voiceover": true,
    "music_genre": "pop|lofi|dramatic|trending|original",
    "sound_effects": true
  }},
  "storyboard": [
    {{"scene": 1, "timestamp": "0:00-0:03", "description": "Opening hook scene", "visual": "What to show", "text_overlay": "Text on screen", "action": "What action/talent does"}}  ],
  "clone_prompt": "A ready-to-use prompt for recreating a similar video style — include visual style, pacing, music type, and content structure",
  "improvement_tips": ["tip 1", "tip 2", "tip 3"],
  "viral_potential": {{
    "score": 7,
    "reasons": ["reason 1", "reason 2"]
  }}
}}"""

    parts.insert(0, {"text": prompt_text})

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"

    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 8000,
        }
    }

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(url, json=payload)
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Gemini API error: {resp.text[:500]}")
        data = resp.json()

    text = ""
    for candidate in data.get("candidates", []):
        for part in candidate.get("content", {}).get("parts", []):
            if "text" in part:
                text += part["text"]

    # Parse JSON from Gemini response (strip markdown code blocks if present)
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()

    try:
        analysis = json.loads(text)
    except json.JSONDecodeError:
        # Return raw text if JSON parsing fails
        analysis = {"raw_analysis": text}

    return analysis


@router.post("/video/url")
async def analyze_video_url(
    data: AnalyzeURLRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Analyze a video from a TikTok/Douyin/any URL."""
    # Get Google AI API key from user settings
    google_key = _get_google_key(current_user)
    if not google_key:
        raise HTTPException(status_code=400, detail="Google AI Studio API key not configured. Add it in Settings.")

    # Download video
    video_path, title = await download_video(data.url)

    try:
        # Extract key frames
        frame_dir = os.path.join(FRAMES_DIR, uuid.uuid4().hex[:12])
        os.makedirs(frame_dir, exist_ok=True)
        frames = extract_key_frames(video_path, frame_dir, num_frames=8)

        if not frames:
            raise HTTPException(status_code=500, detail="Failed to extract frames from video. The video may be too short or corrupted.")

        # Analyze with Gemini
        analysis = await analyze_with_gemini(frames, data.business_context, google_key)

        # Save to content library
        item = Content(
            user_id=current_user.id,
            type="storyboard",
            prompt=f"Video Analysis: {data.url}",
            model="gemini-2.5-flash",
            status="completed",
            result_url=json.dumps(analysis)[:5000],
            credit_cost=0.0,
        )
        db.add(item)
        db.commit()
        db.refresh(item)

        return {
            "content_id": item.id,
            "title": title,
            "analysis": analysis,
            "frames_extracted": len(frames),
        }
    finally:
        # Cleanup downloaded video (keep frames for reference briefly)
        try:
            os.remove(video_path)
        except:
            pass


@router.post("/video/upload")
async def analyze_video_upload(
    file: UploadFile = File(...),
    business_context: str = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Analyze an uploaded video file."""
    google_key = _get_google_key(current_user)
    if not google_key:
        raise HTTPException(status_code=400, detail="Google AI Studio API key not configured. Add it in Settings.")

    # Save uploaded file
    ext = os.path.splitext(file.filename or "video.mp4")[1]
    if ext not in (".mp4", ".mov", ".avi", ".webm", ".mkv", ".3gp"):
        raise HTTPException(status_code=400, detail=f"Unsupported file format: {ext}")

    temp_path = os.path.join(UPLOAD_DIR, f"upload_{uuid.uuid4().hex[:12]}{ext}")
    with open(temp_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        # Extract key frames
        frame_dir = os.path.join(FRAMES_DIR, uuid.uuid4().hex[:12])
        os.makedirs(frame_dir, exist_ok=True)
        frames = extract_key_frames(temp_path, frame_dir, num_frames=8)

        if not frames:
            raise HTTPException(status_code=500, detail="Failed to extract frames from video.")

        # Analyze with Gemini
        analysis = await analyze_with_gemini(frames, business_context, google_key)

        # Save to content library
        item = Content(
            user_id=current_user.id,
            type="storyboard",
            prompt=f"Video Analysis: uploaded file",
            model="gemini-2.5-flash",
            status="completed",
            result_url=json.dumps(analysis)[:5000],
            credit_cost=0.0,
        )
        db.add(item)
        db.commit()
        db.refresh(item)

        return {
            "content_id": item.id,
            "title": file.filename,
            "analysis": analysis,
            "frames_extracted": len(frames),
        }
    finally:
        try:
            os.remove(temp_path)
        except:
            pass


def _get_google_key(user: User) -> Optional[str]:
    """Get decrypted Google AI API key from user settings."""
    # Check if user has a google_key stored
    google_key_encrypted = getattr(user, 'google_key_encrypted', None)
    if google_key_encrypted:
        try:
            return decrypt_value(google_key_encrypted)
        except:
            pass
    return None