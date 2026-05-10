"""Edge TTS endpoint — generate speech from text using Microsoft Edge TTS (free, 323 voices)."""
import os
import uuid
import tempfile
import asyncio
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tts", tags=["tts"])

class EdgeTTSRequest(BaseModel):
    text: str
    voice: str = "en-US-AriaNeural"
    rate: Optional[str] = None
    pitch: Optional[str] = None
    volume: Optional[str] = None
    format: str = "mp3"

class TTSResponse(BaseModel):
    audio_url: str
    duration: float = 0
    voice: str


async def _run_edge_tts(cmd: list[str], timeout: int = 60) -> tuple[int, str, str]:
    """Run edge-tts command asynchronously."""
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        return proc.returncode or 0, stdout.decode() if stdout else "", stderr.decode() if stderr else ""
    except asyncio.TimeoutError:
        proc.kill()
        raise HTTPException(status_code=504, detail="Edge TTS timed out")


async def _run_ffprobe(cmd: list[str], timeout: int = 10) -> tuple[int, str, str]:
    """Run ffprobe command asynchronously."""
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        return proc.returncode or 0, stdout.decode() if stdout else "", stderr.decode() if stderr else ""
    except asyncio.TimeoutError:
        proc.kill()
        return 1, "", "ffprobe timed out"


@router.post("/edge", response_model=TTSResponse)
async def edge_tts(req: EdgeTTSRequest):
    """Generate speech audio file using Microsoft Edge TTS (free)."""
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text is required")
    if len(req.text) > 5000:
        raise HTTPException(status_code=400, detail="Text too long (max 5000 chars)")

    # Check edge-tts availability
    try:
        proc = await asyncio.create_subprocess_exec(
            "which", "edge-tts",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        await proc.communicate()
        if proc.returncode != 0:
            raise HTTPException(status_code=500, detail="edge-tts not installed. Run: pip install edge-tts")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="edge-tts not available")

    output_dir = os.path.join(tempfile.gettempdir(), "qfm_tts")
    os.makedirs(output_dir, exist_ok=True)
    file_id = uuid.uuid4().hex[:12]
    ext = "ogg" if req.format == "ogg" else ("wav" if req.format == "wav" else "mp3")
    output_path = os.path.join(output_dir, f"tts_{file_id}.{ext}")

    try:
        cmd = [
            "edge-tts",
            "--voice", req.voice,
            "--text", req.text,
            "--write-media", output_path,
        ]
        if req.rate:
            cmd.extend(["--rate", req.rate])
        if req.pitch:
            cmd.extend(["--pitch", req.pitch])
        if req.volume:
            cmd.extend(["--volume", req.volume])

        returncode, stdout, stderr = await _run_edge_tts(cmd, timeout=60)

        if returncode != 0:
            logger.error(f"edge-tts failed: {stderr}")
            raise HTTPException(status_code=500, detail=f"Edge TTS failed: {stderr[-300:]}")

        if not os.path.exists(output_path) or os.path.getsize(output_path) < 100:
            raise HTTPException(status_code=500, detail="Edge TTS produced no output")

        # Get duration via ffprobe
        duration = 0.0
        try:
            returncode2, stdout2, _ = await _run_ffprobe([
                "ffprobe", "-v", "quiet",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                output_path,
            ])
            if returncode2 == 0:
                duration = float(stdout2.strip())
        except Exception:
            pass

        filename = os.path.basename(output_path)
        return TTSResponse(
            audio_url=f"/api/v1/tts/file/{filename}",
            duration=duration,
            voice=req.voice,
        )

    except HTTPException:
        raise
    except Exception as e:
        if os.path.exists(output_path):
            try: os.unlink(output_path)
            except: pass
        raise HTTPException(status_code=500, detail=f"TTS error: {str(e)}")


@router.get("/file/{filename}")
async def get_tts_file(filename: str):
    """Serve generated TTS audio file."""
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    output_dir = os.path.join(tempfile.gettempdir(), "qfm_tts")
    filepath = os.path.join(output_dir, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found or expired")

    from fastapi.responses import FileResponse
    content_types = {
        "mp3": "audio/mpeg",
        "ogg": "audio/ogg",
        "wav": "audio/wav",
    }
    ext = filename.rsplit(".", 1)[-1] if "." in filename else "mp3"
    media_type = content_types.get(ext, "audio/mpeg")
    return FileResponse(filepath, media_type=media_type, filename=filename)


@router.get("/voices")
async def list_voices(language: Optional[str] = None):
    """List available Edge TTS voices."""
    try:
        cmd = ["edge-tts", "--list-voices"]
        if language:
            cmd.extend(["--language", language])
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=10)
        if proc.returncode != 0:
            raise HTTPException(status_code=500, detail="Failed to list voices")

        # Parse tab-separated output
        voices = []
        lines = stdout.decode().strip().split("\n")
        for line in lines[1:]:  # skip header
            parts = line.split("\t")
            if len(parts) >= 4:
                voices.append({
                    "name": parts[0].strip(),
                    "gender": parts[1].strip(),
                    "locale": parts[2].strip() if len(parts) > 2 else "",
                })
        return {"voices": voices, "total": len(voices)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing voices: {str(e)}")