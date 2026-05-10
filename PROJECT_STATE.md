# QFM Studio — Project State

**Last Updated:** 2026-05-04
**Status:** Phase 5 Deployed ✅

## What's Built

### Phase 1-5 Complete (6-Step Wizard)

1. **Step 1: Product Input** ✅
   - Upload product photos (up to 10) via KIE file upload
   - AI product analysis via KIE Chat API (GPT-5.2)
   - Category, description, reference video support

2. **Step 2: Storyboard** ✅
   - AI generates structured storyboard (6-8 scenes)
   - Each scene: title, description, visual prompt, voiceover text, duration
   - Edit, reorder, add/remove scenes
   - Product features inform storyboard generation

3. **Step 3: Avatar & Voice** ✅
   - Quick select: 17 Edge TTS preset voices (free)
   - 4 ElevenLabs premium voices (KIE credits)
   - Fish Audio placeholder (coming soon)
   - Create custom avatar with voice config
   - Save/recall avatars from library

4. **Step 4: Scene Images** ✅
   - 5 image models (nano-banana-2, imagen4-fast/ultra, flux-2-pro, ideogram-v3)
   - 6 video models (Kling 2.6/V2.1/3.0, Seedance 2.0, Hailuo Pro, Sora 2)
   - Per-scene generation with status tracking
   - Image → video pipeline (images as reference frames)

5. **Step 5: Scene Videos** ✅
   - Review video generation status
   - Re-generate failed/selected scenes
   - Model selection (Kling, Seedance, Hailuo, Sora)
   - Download links for images and videos

6. **Step 6: Voiceover & Assembly** ✅
   - Voice provider selection: Edge TTS (free), ElevenLabs (KIE credits), Fish Audio (placeholder)
   - 17 Edge TTS voice presets with language/accent/tone filters
   - 4 ElevenLabs premium voice options
   - Speed control (0.5x - 2.0x)
   - Per-scene voiceover generation
   - Audio preview playback
   - Final video assembly via server-side FFmpeg:
     - Concat videos with voiceover overlay
     - 9:16/16:9/1:1 resolution support
     - Background music overlay (volume control)
   - Download final MP4

### Backend Endpoints

- `POST /api/v1/tts/edge` — Edge TTS voice generation (free, 323 voices)
- `GET /api/v1/tts/file/{filename}` — Serve generated TTS audio files
- `GET /api/v1/tts/voices` — List available Edge TTS voices
- `POST /api/v1/video/assemble` — Assemble final video (FFmpeg pipeline)
- `GET /api/v1/video/assemble/{filename}` — Download assembled video
- `POST /api/v1/video/concat` — Simple video concatenation (backward compat)
- `GET /api/v1/video/concat/{filename}` — Download concatenated video

### Key Files

- `apps/web/src/lib/studioTypes.ts` — All TypeScript type definitions
- `apps/web/src/lib/studioStorage.ts` — localStorage + IndexedDB persistence
- `apps/web/src/lib/studioApi.ts` — KIE API, TTS, assembly API helpers
- `apps/web/src/lib/storyboardAi.ts` — AI prompt builders
- `apps/web/src/lib/api.ts` — Original API client (video generation, KIE, Gemini)
- `apps/web/src/components/studio/Step1ProductInput.tsx` — Product input
- `apps/web/src/components/studio/Step2Storyboard.tsx` — Storyboard generator
- `apps/web/src/components/studio/Step3AvatarVoice.tsx` — Avatar + voice selector
- `apps/web/src/components/studio/Step4SceneImages.tsx` — Scene image + video generation
- `apps/web/src/components/studio/Step5SceneVideos.tsx` — Video review + regeneration
- `apps/web/src/components/studio/Step6VoiceAssembly.tsx` — Voiceover + assembly
- `apps/web/src/pages/TikTokStudio.tsx` — Main wizard page
- `backend/api/v1/tts.py` — Edge TTS backend endpoint
- `backend/api/v1/assemble.py` — Video assembly (FFmpeg) backend endpoint
- `backend/api/v1/video.py` — Simple video concat (existing)

### Deployment

- Frontend: https://anson81.github.io/qfm-studio/ (GitHub Pages)
- Backend: Running on NAS via Cloudflare tunnel (ephemeral URL)
- Build: `cd apps/web && node node_modules/vite/bin/vite.js build --mode production`
- Deploy: `cd /home/anson/qfm-studio && python3 deploy.py`

### Critical Architecture Notes

- KIE file upload is FREE (3-day retention)
- Edge TTS requires backend server (FastAPI on NAS)
- Video assembly requires backend + FFmpeg installed
- `edge-tts` Python package installed on NAS (v7.2.7)
- `ffmpeg` installed on NAS (v6.1.1)
- KIE API key stored in browser `localStorage` as `qfm_kie_key`
- Project state saved to `localStorage` as `qfm_studio_project`
- Avatars saved to `localStorage` as `qfm_studio_avatars`

### Known Issues

- Backend Cloudflare tunnel URL changes on restart (requires frontend rebuild)
- API 405 error from browser (from GAP_ANALYSIS.md)
- Auth token "Could not validate credentials" on subsequent calls
- KIE credits showing 0 on dashboard
- White-on-white CSS dark mode issue