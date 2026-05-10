"""Video assembly endpoint — stitch scenes with voiceover + transitions via ffmpeg."""
import os
import uuid
import tempfile
import asyncio
import subprocess
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/video", tags=["video"])


def _run_ffmpeg(cmd: list[str], timeout: int = 180) -> subprocess.CompletedProcess:
    """Run ffmpeg command synchronously (called via asyncio.to_thread)."""
    return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)


def _run_ffprobe(cmd: list[str], timeout: int = 10) -> subprocess.CompletedProcess:
    """Run ffprobe command synchronously."""
    return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)


class SceneInput(BaseModel):
    video_url: str
    voiceover_url: Optional[str] = None
    duration: float = 5.0
    text_overlay: Optional[str] = None
    text_position: Optional[str] = "bottom"

class AssembleRequest(BaseModel):
    scenes: List[SceneInput]
    background_music_url: Optional[str] = None
    transition: Optional[str] = "cut"
    output_resolution: Optional[str] = "1080x1920"
    background_music_volume: Optional[float] = 0.15

class AssembleResponse(BaseModel):
    task_id: str
    status: str = "processing"
    video_url: Optional[str] = None
    duration: float = 0
    message: str = ""


@router.post("/assemble", response_model=AssembleResponse)
async def assemble_video(req: AssembleRequest):
    """Assemble final video from scene videos + voiceover audio."""
    if len(req.scenes) < 1:
        raise HTTPException(status_code=400, detail="Need at least 1 scene")
    if len(req.scenes) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 scenes per video")

    import httpx

    output_dir = os.path.join(tempfile.gettempdir(), "qfm_assemble")
    os.makedirs(output_dir, exist_ok=True)
    task_id = uuid.uuid4().hex[:12]

    # Width/height from resolution
    parts = req.output_resolution.split("x")
    width = parts[0] if len(parts) == 2 else "1080"
    height = parts[1] if len(parts) == 2 else "1920"

    downloaded_videos = []
    downloaded_audios = []
    combined_scenes = []

    try:
        async with httpx.AsyncClient(timeout=120, follow_redirects=True) as client:
            # Helper: get fresh download URL for KIE temp files
            async def refresh_url(url: str) -> str:
                if "tempfile.aiquickdraw.com" in url or "aieasypic" in url:
                    try:
                        dl_resp = await client.post(
                            "https://api.kie.ai/api/v1/common/download-url",
                            json={"url": url},
                            headers={"Content-Type": "application/json"},
                        )
                        if dl_resp.status_code == 200:
                            dl_data = dl_resp.json()
                            fresh = dl_data.get("data", {}).get("downloadUrl") or dl_data.get("data", "")
                            if fresh and fresh.startswith("http"):
                                return fresh
                    except Exception:
                        pass
                return url

            # ── Step 1: Download scene videos ──
            for i, scene in enumerate(req.scenes):
                url = await refresh_url(scene.video_url)
                try:
                    resp = await client.get(url)
                    resp.raise_for_status()
                except Exception as e:
                    raise HTTPException(status_code=400, detail=f"Failed to download video {i+1}: {str(e)}")

                ext = ".mp4"
                ct = resp.headers.get("content-type", "")
                if "webm" in ct:
                    ext = ".webm"

                video_path = os.path.join(output_dir, f"scene_{i}_{task_id}{ext}")
                with open(video_path, "wb") as f:
                    f.write(resp.content)
                downloaded_videos.append(video_path)

                # ── Step 2: Download voiceover audio ──
                audio_path = None
                if scene.voiceover_url:
                    audio_url = await refresh_url(scene.voiceover_url)
                    try:
                        audio_resp = await client.get(audio_url)
                        audio_resp.raise_for_status()
                        audio_ext = ".mp3"
                        audio_ct = audio_resp.headers.get("content-type", "")
                        if "ogg" in audio_ct:
                            audio_ext = ".ogg"
                        elif "wav" in audio_ct:
                            audio_ext = ".wav"
                        audio_path = os.path.join(output_dir, f"voice_{i}_{task_id}{audio_ext}")
                        with open(audio_path, "wb") as f:
                            f.write(audio_resp.content)
                        downloaded_audios.append(audio_path)
                    except Exception as e:
                        logger.warning(f"Failed to download voiceover {i+1}: {e}")
                        audio_path = None

                # ── Step 3: Overlay voiceover onto video or just resize ──
                if audio_path:
                    combined_path = os.path.join(output_dir, f"combined_{i}_{task_id}.mp4")

                    # Get audio duration
                    audio_dur = 0.0
                    try:
                        probe_result = await asyncio.to_thread(
                            _run_ffprobe,
                            ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
                             "-of", "default=noprint_wrappers=1:nokey=1", audio_path]
                        )
                        if probe_result.returncode == 0:
                            audio_dur = float(probe_result.stdout.strip())
                    except Exception:
                        pass

                    target_dur = max(audio_dur, scene.duration) if audio_dur > 0 else scene.duration

                    cmd = [
                        "ffmpeg", "-y",
                        "-i", video_path, "-i", audio_path,
                        "-filter_complex",
                        f"[0:v]scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2,setsar=1[v];[1:a]aresample=44100[a]",
                        "-map", "[v]", "-map", "[a]",
                        "-c:v", "libx264", "-preset", "fast",
                        "-c:a", "aac", "-b:a", "128k",
                        "-t", str(target_dur), "-shortest",
                        "-movflags", "+faststart",
                        combined_path,
                    ]
                    result = await asyncio.to_thread(_run_ffmpeg, cmd, 120)
                    if result.returncode != 0:
                        logger.warning(f"Overlay failed for scene {i+1}: {result.stderr[-200:]}")
                        combined_path = video_path
                    else:
                        combined_scenes.append({"path": combined_path, "has_audio": True, "duration": target_dur, "cleanup": combined_path != video_path})
                        continue
                else:
                    # No voiceover — just resize video
                    combined_path = os.path.join(output_dir, f"resized_{i}_{task_id}.mp4")
                    cmd = [
                        "ffmpeg", "-y", "-i", video_path,
                        "-vf", f"scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2,setsar=1",
                        "-c:v", "libx264", "-preset", "fast", "-an",
                        "-t", str(scene.duration), "-movflags", "+faststart",
                        combined_path,
                    ]
                    result = await asyncio.to_thread(_run_ffmpeg, cmd, 60)
                    if result.returncode != 0:
                        combined_path = video_path  # fallback

                combined_scenes.append({
                    "path": combined_path if os.path.exists(combined_path) else video_path,
                    "has_audio": audio_path is not None,
                    "duration": scene.duration,
                    "cleanup": combined_path != video_path and os.path.exists(combined_path),
                })

            # ── Step 4: Concat all scenes ──
            if len(combined_scenes) == 0:
                raise HTTPException(status_code=500, detail="No valid scenes to assemble")

            final_path = None
            # Clean up intermediates later
            intermediates_to_clean = []

            if len(combined_scenes) == 1:
                final_path = combined_scenes[0]["path"]
            else:
                concat_file = os.path.join(output_dir, f"concat_{task_id}.txt")
                concat_output = os.path.join(output_dir, f"concat_{task_id}.mp4")
                intermediates_to_clean.append(concat_file)

                with open(concat_file, "w") as f:
                    for scene in combined_scenes:
                        p = scene["path"].replace("'", "'\\''")
                        f.write(f"file '{p}'\n")

                # Try fast concat first (copy codec)
                cmd = ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat_file,
                        "-c", "copy", "-movflags", "+faststart", concat_output]
                result = await asyncio.to_thread(_run_ffmpeg, cmd, 120)

                if result.returncode != 0:
                    # Re-encode — handles different codecs
                    cmd2 = [
                        "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat_file,
                        "-c:v", "libx264", "-preset", "fast", "-c:a", "aac", "-b:a", "128k",
                        "-vf", f"scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2,setsar=1",
                        "-r", "30", "-movflags", "+faststart", concat_output,
                    ]
                    result = await asyncio.to_thread(_run_ffmpeg, cmd2, 300)
                    if result.returncode != 0:
                        raise HTTPException(status_code=500, detail=f"Concat failed: {result.stderr[-300:]}")

                final_path = concat_output
                intermediates_to_clean.append(concat_output)

            # ── Step 5: Overlay background music ──
            if req.background_music_url and final_path:
                music_path = None
                try:
                    music_url = await refresh_url(req.background_music_url)
                    resp = await client.get(music_url)
                    resp.raise_for_status()
                    music_path = os.path.join(output_dir, f"bg_music_{task_id}.mp3")
                    with open(music_path, "wb") as f:
                        f.write(resp.content)

                    bg_output = os.path.join(output_dir, f"final_{task_id}.mp4")
                    volume = req.background_music_volume or 0.15

                    cmd = [
                        "ffmpeg", "-y", "-i", final_path, "-i", music_path,
                        "-filter_complex",
                        f"[1:a]volume={volume}[bg];[0:a][bg]amix=inputs=2:duration=first:dropout_transition=3[a]",
                        "-map", "0:v", "-map", "[a]",
                        "-c:v", "copy", "-c:a", "aac", "-b:a", "128k",
                        "-shortest", "-movflags", "+faststart",
                        bg_output,
                    ]
                    result = await asyncio.to_thread(_run_ffmpeg, cmd, 120)
                    if result.returncode == 0:
                        final_path = bg_output
                        intermediates_to_clean.append(bg_output)
                    # else: keep video without bg music
                except Exception as e:
                    logger.warning(f"BG music overlay failed: {e}")
                finally:
                    if music_path:
                        try: os.unlink(music_path)
                        except: pass

            # ── Get duration ──
            duration = 0.0
            try:
                probe_result = await asyncio.to_thread(
                    _run_ffprobe,
                    ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
                     "-of", "default=noprint_wrappers=1:nokey=1", final_path]
                )
                if probe_result.returncode == 0:
                    duration = float(probe_result.stdout.strip())
            except Exception:
                pass

            filename = os.path.basename(final_path)
            return AssembleResponse(
                task_id=task_id,
                status="done",
                video_url=f"/api/v1/video/assemble/{filename}",
                duration=duration,
                message=f"Video assembled! {len(combined_scenes)} scenes, {duration:.1f}s",
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Assembly error: {e}")
        raise HTTPException(status_code=500, detail=f"Assembly failed: {str(e)}")

    finally:
        # Clean up downloaded files (not final output)
        for p in downloaded_videos:
            try: os.unlink(p)
            except: pass
        for p in downloaded_audios:
            try: os.unlink(p)
            except: pass
        # Clean up intermediate combined/resized files (keep final output)
        for scene in combined_scenes:
            if scene.get("cleanup"):
                try: os.unlink(scene["path"])
                except: pass


@router.get("/assemble/{filename}")
async def download_assembled_video(filename: str):
    """Serve assembled video file."""
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    output_dir = os.path.join(tempfile.gettempdir(), "qfm_assemble")
    filepath = os.path.join(output_dir, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found or expired. Try assembling again.")

    from fastapi.responses import FileResponse
    return FileResponse(filepath, media_type="video/mp4", filename=filename)


# ── Keep the old concat endpoint for backward compat ──
class ConcatRequest(BaseModel):
    video_urls: List[str]

class ConcatResponse(BaseModel):
    url: str
    duration: float = 0

@router.post("/concat", response_model=ConcatResponse)
async def concat_videos(req: ConcatRequest, user=Depends(get_current_user)):
    """Simple video concatenation (backward compatible, requires auth)."""
    if len(req.video_urls) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 video URLs to concatenate")
    if len(req.video_urls) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 videos per concatenation")

    import httpx

    output_dir = os.path.join(tempfile.gettempdir(), "qfm_concat")
    os.makedirs(output_dir, exist_ok=True)

    downloaded = []
    try:
        async with httpx.AsyncClient(timeout=120, follow_redirects=True) as client:
            for i, url in enumerate(req.video_urls):
                try:
                    # Refresh KIE URLs
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
                            pass

                    resp = await client.get(url)
                    resp.raise_for_status()
                    ext = ".mp4"
                    ct = resp.headers.get("content-type", "")
                    if "webm" in ct:
                        ext = ".webm"
                    elif "image" in ct:
                        logger.warning(f"URL {i+1} returned content-type {ct}, skipping")
                        continue
                    if len(resp.content) < 1000:
                        logger.warning(f"URL {i+1} returned {len(resp.content)} bytes, skipping")
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
            raise HTTPException(status_code=400, detail="Need at least 2 valid video files")

        concat_file = os.path.join(output_dir, f"concat_{uuid.uuid4().hex[:8]}.txt")
        output_path = os.path.join(output_dir, f"combined_{uuid.uuid4().hex[:8]}.mp4")

        try:
            with open(concat_file, "w") as f:
                for p in downloaded:
                    escaped = p.replace("'", "'\\''")
                    f.write(f"file '{escaped}'\n")

            # Try fast concat first
            cmd = ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat_file,
                    "-c", "copy", "-movflags", "+faststart", output_path]
            result = await asyncio.to_thread(_run_ffmpeg, cmd, 120)

            if result.returncode != 0:
                # Re-encode
                cmd2 = [
                    "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat_file,
                    "-c:v", "libx264", "-preset", "fast", "-c:a", "aac",
                    "-vf", "scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2",
                    "-r", "30", "-movflags", "+faststart", output_path,
                ]
                result = await asyncio.to_thread(_run_ffmpeg, cmd2, 300)
                if result.returncode != 0:
                    raise HTTPException(status_code=500, detail=f"ffmpeg failed: {result.stderr[-500:]}")

            duration = 0.0
            try:
                probe_result = await asyncio.to_thread(
                    _run_ffprobe,
                    ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
                     "-of", "default=noprint_wrappers=1:nokey=1", output_path]
                )
                if probe_result.returncode == 0:
                    duration = float(probe_result.stdout.strip())
            except Exception:
                pass

            filename = os.path.basename(output_path)
            return ConcatResponse(url=f"/api/v1/video/concat/{filename}", duration=duration)

        finally:
            for p in downloaded:
                try: os.unlink(p)
                except: pass
            try: os.unlink(concat_file)
            except: pass

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Concat error: {e}")
        raise HTTPException(status_code=500, detail=f"Concat failed: {str(e)}")


@router.get("/concat/{filename}")
async def download_concat_video(filename: str):
    """Serve concatenated video file."""
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    output_dir = os.path.join(tempfile.gettempdir(), "qfm_concat")
    filepath = os.path.join(output_dir, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found or expired")
    from fastapi.responses import FileResponse
    return FileResponse(filepath, media_type="video/mp4", filename=filename)


# We need the auth import for the concat endpoint
from auth import get_current_user