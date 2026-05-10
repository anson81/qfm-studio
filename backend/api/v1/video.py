"""Video concatenation endpoint — stitch multiple video segments together via ffmpeg."""
import os
import uuid
import tempfile
import subprocess
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List

from auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/video", tags=["video"])

class ConcatRequest(BaseModel):
    video_urls: List[str]  # URLs of videos to concatenate (in order)

class ConcatResponse(BaseModel):
    url: str
    duration: float = 0

@router.post("/concat", response_model=ConcatResponse)
async def concat_videos(req: ConcatRequest, user=Depends(get_current_user)):
    """Download videos from URLs and concatenate them with ffmpeg."""
    if len(req.video_urls) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 video URLs to concatenate")
    if len(req.video_urls) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 videos per concatenation")

    output_dir = os.path.join(tempfile.gettempdir(), "qfm_concat")
    os.makedirs(output_dir, exist_ok=True)

    try:
        import httpx
    except ImportError:
        raise HTTPException(status_code=500, detail="httpx not installed — run: pip install httpx")

    # Download each video to a temp file
    downloaded = []
    async with httpx.AsyncClient(timeout=120, follow_redirects=True) as client:
        for i, url in enumerate(req.video_urls):
            try:
                # If the URL is a KIE tempfile URL, try to get a fresh download link first
                if "tempfile.aiquickdraw.com" in url or "aieasypic" in url:
                    try:
                        dl_resp = await client.post(
                            "https://api.kie.ai/api/v1/common/download-url",
                            json={"url": url},
                            headers={"Content-Type": "application/json"},
                        )
                        if dl_resp.status_code == 200:
                            dl_data = dl_resp.json()
                            fresh_url = dl_data.get("data", {}).get("downloadUrl") or dl_data.get("data", "")
                            if fresh_url and fresh_url.startswith("http"):
                                url = fresh_url
                    except Exception:
                        pass  # Use original URL if refresh fails

                resp = await client.get(url)
                resp.raise_for_status()
                ext = ".mp4"
                ct = resp.headers.get("content-type", "")
                if "webm" in ct:
                    ext = ".webm"
                elif "image" in ct:
                    # If KIE returned an image instead of video, skip it
                    logger.warning(f"URL {i+1} returned content-type {ct}, skipping (not a video)")
                    continue
                if len(resp.content) < 1000:
                    logger.warning(f"URL {i+1} returned {len(resp.content)} bytes, likely not a video, skipping")
                    continue
                tmp_path = os.path.join(output_dir, f"part_{i}_{uuid.uuid4().hex[:8]}{ext}")
                with open(tmp_path, "wb") as f:
                    f.write(resp.content)
                downloaded.append(tmp_path)
            except Exception as e:
                for p in downloaded:
                    try: os.unlink(p)
                    except: pass
                raise HTTPException(status_code=400, detail=f"Failed to download video {i+1}: {str(e)}")

    if len(downloaded) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 valid video files to concatenate. Some URLs may have expired or returned images instead of videos.")

    # Create ffmpeg concat file
    concat_file = os.path.join(output_dir, f"concat_{uuid.uuid4().hex[:8]}.txt")
    output_path = os.path.join(output_dir, f"combined_{uuid.uuid4().hex[:8]}.mp4")

    try:
        with open(concat_file, "w") as f:
            for p in downloaded:
                escaped = p.replace("'", "'\\''")
                f.write(f"file '{escaped}'\n")

        # Try concat demuxer first (fast, no re-encode) — requires same codecs
        cmd = [
            "ffmpeg", "-y",
            "-f", "concat", "-safe", "0",
            "-i", concat_file,
            "-c", "copy",
            "-movflags", "+faststart",
            output_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)

        if result.returncode != 0:
            # Re-encode — handles different codecs/resolutions
            # Get info about first video to match params
            probe_cmd = ["ffprobe", "-v", "quiet", "-show_entries",
                         "stream=width,height,codec_name,r_frame_rate",
                         "-of", "json", downloaded[0]]
            probe_result = subprocess.run(probe_cmd, capture_output=True, text=True, timeout=10)
            width = "720"
            height = "1280"
            try:
                import json
                streams = json.loads(probe_result.stdout).get("streams", [])
                if streams:
                    s = streams[0]
                    width = str(s.get("width", 720))
                    height = str(s.get("height", 1280))
            except Exception:
                pass

            cmd_reencode = [
                "ffmpeg", "-y",
                "-f", "concat", "-safe", "0",
                "-i", concat_file,
                "-c:v", "libx264", "-preset", "fast",
                "-c:a", "aac",
                "-vf", f"scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2",
                "-r", "30",
                "-movflags", "+faststart",
                output_path
            ]
            result = subprocess.run(cmd_reencode, capture_output=True, text=True, timeout=300)
            if result.returncode != 0:
                # Last resort: concat without re-encode, accept imperfections
                cmd_simple = [
                    "ffmpeg", "-y",
                    "-i", "concat:" + "|".join(downloaded),
                    "-c", "copy",
                    "-movflags", "+faststart",
                    output_path
                ]
                result = subprocess.run(cmd_simple, capture_output=True, text=True, timeout=120)
                if result.returncode != 0:
                    raise HTTPException(
                        status_code=500,
                        detail=f"ffmpeg concat failed: {result.stderr[-500:]}"
                    )

        # Get duration
        duration = 0.0
        probe_cmd = ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
                      "-of", "default=noprint_wrappers=1:nokey=1", output_path]
        probe_result = subprocess.run(probe_cmd, capture_output=True, text=True, timeout=10)
        if probe_result.returncode == 0:
            try:
                duration = float(probe_result.stdout.strip())
            except:
                pass

        filename = os.path.basename(output_path)
        return ConcatResponse(url=f"/api/v1/video/concat/{filename}", duration=duration)

    finally:
        for p in downloaded:
            try: os.unlink(p)
            except: pass
        try: os.unlink(concat_file)
        except: pass


@router.get("/concat/{filename}")
async def download_concat_video(filename: str):
    """Serve concatenated video file."""
    output_dir = os.path.join(tempfile.gettempdir(), "qfm_concat")
    filepath = os.path.join(output_dir, filename)
    if ".." in filename or "/" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found or expired. Try combining again.")

    from fastapi.responses import FileResponse
    return FileResponse(filepath, media_type="video/mp4", filename=filename)