# QFM Studio — TikTok Product Video Feature: Architecture Decision Document

**Date:** 2026-05-03
**Status:** DRAFT — Pre-build decisions

## Decision Record

### D1: Voice Provider Strategy
**Decision:** 3-tier approach, priority order:
1. **Edge TTS** (free, server-side Python) — Default for virtual KOLs, 323 preset voices
2. **KIE ElevenLabs** (credit-based, via Jobs API) — Premium voices + sound effects + dialogue
3. **Fish Audio** (pay-per-use, separate API key) — Voice cloning only

**Rationale:** Edge TTS is free and sufficient for most TikTok voices. KIE ElevenLabs uses existing credits (no new API key). Fish Audio for cloning only ($0.005/min, 100K chars/mo free).

### D2: Video Assembly
**Decision:** Server-side FFmpeg (Python backend) as primary. No client-side video editing.

**Rationale:**
- FFmpeg.wasm requires SharedArrayBuffer CORS headers that break GitHub Pages hosting
- WebCodecs has zero Safari/iOS support
- Server-side works on every device, handles any video length
- TikTok audience is 70%+ mobile — must work on mobile Safari

**Pipeline:**
```
1. Download all scene videos (from KIE)
2. Generate voiceover audio (Edge TTS / ElevenLabs / Fish Audio)
3. FFmpeg: concat videos → overlay audio → add text overlays → output MP4
4. Serve final video for download
```

### D3: Avatar Storage
**Decision:** Browser localStorage + IndexedDB for now. Backend DB later.

**Rationale:**
- No database on current NAS backend
- localStorage for avatar JSON metadata (small — name, voice settings, traits)
- IndexedDB for larger binary data (face images, voice samples) — supports blobs
- Simple, works offline, no server dependency
- Migration path: later add backend SQLite/PostgreSQL when needed

### D4: State Management
**Decision:** React Context + useReducer for complex multi-step state. No external state library.

**Rationale:**
- Multi-step wizard has complex state (photos → analysis → storyboard → scenes → videos → voiceover → assembly)
- Context + useReducer is sufficient, no Redux overhead
- Zustand or Jotai would be overkill for this single feature

### D5: Component Architecture
**Decision:** Multi-step wizard with route-based navigation, not a monolithic page.

**Rationale:**
- TikTok video creation has natural step flow (6 phases)
- Each step can validate independently
- Route-based allows URL sharing (e.g., /studio/edit-storyboard)
- Better mobile UX with one step per page

### D6: Storyboard AI Model
**Decision:** KIE Chat API with GPT-5.2 or Gemini 2.5 Pro for storyboard generation.

**Rationale:**
- Both support vision (can analyze product photos)
- GPT-5.2: strongest reasoning for structured storyboard
- Gemini 2.5 Flash: cheaper, faster, good enough for most scripts
- Use GPT for initial, let user pick model

### D7: Scene Image Generation
**Decision:** KIE Jobs API with `google/nano-banana-2` (default) or user-selected model.

**Rationale:**
- nano-banana-2: cheapest, good quality
- User can upgrade to imagen4-fast or imagen4-ultra for better quality
- All via Jobs API (same pattern as video generation)

### D8: KIE File Upload for Product Photos
**Decision:** Use KIE file upload API for product photos, then pass uploaded URLs to chat model for analysis.

**Flow:**
1. User uploads product photos to frontend
2. Frontend sends photos to KIE file upload API (`kieai.redpandaai.co/api/file-base64-upload`)
3. KIE returns `fileUrl` for each photo
4. Frontend sends fileUrls + prompt to KIE Chat API for product analysis
5. Analysis results feed into storyboard generation

**Rationale:** KIE file upload is FREE. No reason to store photos locally.

---

## Voice Provider Technical Details

### Edge TTS (Server-Side Python)
- **Package:** `edge-tts` (pip install edge-tts)
- **API:** `edge_tts.Communicate(text, voice_name)`
- **Output:** MP3 (24kbps-48kbps)
- **Latency:** <1 second for short clips
- **Rate/Pitch/Volume:** `--rate="+10%"` `--pitch="+5Hz"` `--volume="+10%"`
- **Best TikTok voices:**
  - `en-US-AriaNeural` — Confident female, great for product demos
  - `en-SG-LunaNeural` — Singaporean English, closest to Malaysian
  - `en-US-JennyNeural` — Friendly, conversational
  - `zh-CN-XiaoxiaoNeural` — Warm Chinese female
  - `ms-MY-YasminNeural` — Malaysian female (only option)
  - `en-US-AndrewNeural` — Warm male, authentic
- **Integration:** FastAPI endpoint that takes text + voice → returns MP3

### KIE ElevenLabs (Credits)
- **Endpoint:** `POST /api/v1/jobs/createTask`
- **Model:** `elevenlabs/text-to-speech-turbo-2-5` (fast) or `elevenlabs/text-to-speech-multilingual-v2` (multi-lang)
- **Request:**
```json
{
  "model": "elevenlabs/text-to-speech-turbo-2-5",
  "input": {
    "text": "Your text here (max 5000 chars)",
    "voice": "Rachel"
  }
}
```
- **Polling:** `GET /api/v1/jobs/recordInfo?taskId=xxx`
- **Bonus features:**
  - `elevenlabs/text-to-dialogue-v3` — Multi-speaker dialogue
  - `elevenlabs/sound-effect-v2` — Sound effects
  - `elevenlabs/audio-isolation` — Voice from background separation
  - `elevenlabs/speech-to-text` — Transcription
- **Cost:** Uses KIE credits (unknown per minute — need to test)

### Fish Audio (Pay-per-use, Cloning)
- **Base URL:** `https://api.fish.audio`
- **Auth:** `Authorization: Bearer YOUR_API_KEY`
- **TTS:** `POST /v1/tts`
```json
{
  "text": "Hello, world!",
  "reference_id": "model_id_or_null",
  "format": "mp3",
  "bitrate": "128k",
  "prosody_speed": 1.0,
  "top_p": 0.7,
  "temperature": 0.01,
  "seed": null,
  "latency": "normal"
}
```
- **Voice listing:** `GET /model?language=en&limit=100`
- **Voice cloning:** `POST /model` (multipart: name, files up to 5, 30MB total)
- **Also:** Can pass `references` array in TTS request for zero-shot cloning without creating a model
- **Free tier:** 100,000 chars/month, community voices only
- **Paid:** $0.005/1,000 chars (~$0.005/min)
- **Rate limits:** Free 10/min, Paid 60/min
- **Python SDK:** `pip install fish-audio-sdk`
- **Formats:** mp3, wav, pcm, opus
- **Languages:** 34+ including en, zh, ms

---

## Workflow Steps (Final)

```
Step 1: Product Input
├── Upload product photos (≤10) via KIE file upload
├── Upload reference video (optional)
├── AI analyzes photos → extracts product features
└── AI analyzes reference video → extracts style DNA

Step 2: Storyboard
├── AI generates storyboard (6-8 scenes)
├── Each scene: {number, description, visual_prompt, voiceover_text, duration}
├── User can edit any scene
└── User can add/remove/reorder scenes

Step 3: Avatar & Voice
├── Choose from avatar library OR create new
├── Avatar = {name, face_image, traits, voice_config}
├── Voice config = {provider: edge_tts|elevenlabs|fish_audio, voice_id, speed, pitch}
├── Preview voice with sample text
└── Voice linked to avatar for consistency

Step 4: Scene Images
├── Generate scene images from visual prompts
├── Choose image model (nano-banana-2 default)
├── Review → select 0/1/all → regenerate if needed
└── Images used as first frame for video generation

Step 5: Video Generation
├── Generate videos for each scene (Kling/Veo/Runway)
├── Scene image as reference for image-to-video
├── Review → select 0/1/all → regenerate if needed
└── Download or proceed to voiceover

Step 6: Voiceover & Assembly
├── Generate voiceover per scene text
├── Optional: background music (ElevenLabs sound effects)
├── Server-side FFmpeg assembles:
│   ├── Concat scene videos
│   ├── Overlay voiceover audio
│   ├── Add scene transitions (fade/cut)
│   └── Output: final MP4
└── Download final video
```

---

## File Upload Strategy

### KIE File Upload (for product photos)
- **URL Upload:** `POST https://kieai.redpandaai.co/api/file-url-upload`
- **Base64 Upload:** `POST https://kieai.redpandaai.co/api/file-base64-upload`
- **Stream Upload:** `POST https://kieai.redpandaai.co/api/file-stream-upload`
- **Free!** No credit cost
- **3-day retention** (auto-deleted)
- **Response:** `{fileUrl, fileId, fileName, fileSize, mimeType}`

### Avatar/Voice Data (localStorage + IndexedDB)
- **Avatar metadata** → localStorage (JSON, small)
- **Face images, voice samples** → IndexedDB (binary blobs)
- **Key structure:** `qfm_avatars` → array of Avatar objects

---

## Video Assembly (Server-Side FFmpeg)

### Backend Endpoint
```
POST /api/v1/video/assemble
Body: {
  scenes: [
    { video_url: "...", duration: 5, voiceover_url: "..." },
    { video_url: "...", duration: 5, voiceover_url: "..." },
    ...
  ],
  background_music_url: "...", // optional
  transition: "fade" | "cut",  // optional
  output_format: "mp4",
  resolution: "1080x1920"       // 9:16 for TikTok
}
```

### FFmpeg Pipeline
```python
# 1. Download all scene videos
# 2. Download/voiceover audio files
# 3. Generate concat file list
# 4. ffmpeg -f concat -i list.txt -i voiceover.mp3 -c:v libx264 -c:a aac -movflags +faststart output.mp4
# 5. If background music: overlay at reduced volume
# 6. Return downloadable URL
```

### Context Timeout
- Video assembly takes 10-60 seconds depending on length
- Use background task with polling (same pattern as KIE video generation)
- WebSocket or SSE for progress updates (stretch goal)

---

## Credit Cost Estimate (Per Video)

| Step | Service | Credits | USD |
|------|---------|---------|-----|
| Product analysis | KIE Chat (GPT-5.2) | ~50 tokens | ~$0.25 |
| Scene images (6) | KIE nano-banana-2 | ~60 credits | ~$0.30 |
| Scene videos (6×5s) | KIE Kling 2.6 | ~300 credits | ~$1.50 |
| Voiceover (6 scenes) | Edge TTS | 0 | $0 |
| Voiceover (alt) | ElevenLabs via KIE | ~TBD | ~$0.30 |
| Video assembly | Server FFmpeg | 0 | $0 |
| **Total** | | ~410 credits | **~$2.05** |

**With voice cloning (Fish Audio):** add ~$0.03 per video
**With premium image model:** add ~$0.50 per video