# QFM Studio — Research Notes (TikTok Product Video Feature)

**Saved:** 2026-05-03 22:35 GMT+8

## Voice Providers Research

### Edge TTS (FREE)
- 323 voices total, 63 EN/CN/MS voices
- Malaysian voices: `ms-MY-YasminNeural` (F), `ms-MY-OsmanNeural` (M)
- Best TikTok picks: `en-US-AriaNeural`, `en-SG-LunaNeural`, `en-IN-NeerjaNeural`, `zh-CN-XiaoxiaoNeural`
- Output: MP3, instant generation, no API key needed
- Python: `pip install edge-tts`, `edge-tts --voice <name> --text "..." --write-media output.mp3`
- Python API: `import edge_tts; communicate = edge_tts.Communicate(text, voice); await communicate.save(path)`
- Rate, pitch, volume controllable: `--rate="+10%"` `--pitch="+5Hz"` `--volume="+10%"`
- Integration: Run in QFM backend (FastAPI endpoint)
- LIMITATION: No voice cloning, preset voices only

### KIE ElevenLabs TTS (Credits-based)
- Models: `elevenlabs/text-to-speech-turbo-2-5`, `elevenlabs/text-to-speech-multilingual-v2`
- Also: `elevenlabs/text-to-dialogue-v3` (multi-speaker dialogue)
- Also: `elevenlabs/speech-to-text` (transcription)
- Also: `elevenlabs/sound-effect-v2` (sound effects!)
- Also: `elevenlabs/audio-isolation` (separate voice from background)
- Endpoint: POST `/api/v1/jobs/createTask`
- Request format:
```json
{
  "model": "elevenlabs/text-to-speech-turbo-2-5",
  "input": {
    "text": "Your text here (max 5000 chars)",
    "voice": "Rachel"  // or voice ID like "BIvP0GN1cAtSRTxNHnWS"
  }
}
```
- Poll: GET `/api/v1/jobs/recordInfo?taskId=xxx`
- Async: returns taskId, poll for result
- ADVANTAGE: Already integrated in KIE, no separate API key needed, uses existing credits
- ADVANTAGE: Has sound effects generation + dialogue TTS (multi-speaker!)
- UNKNOWN: Credit cost per minute of audio (need to test)
- UNKNOWN: Full voice list available through KIE

### Fish Audio (~$0.02/min)
- 200K+ community voices
- 3-10 second voice cloning
- REST API + WebSocket streaming
- Strong Chinese/English/Malay support
- Need separate Fish Audio API key
- UNKNOWN: Exact API endpoints (hit rate limits during research)

## KIE API — Complete Endpoint Map

### Base URLs
- Generation: `https://api.kie.ai`
- File Upload: `https://kieai.redpandaai.co`

### Authentication
- `Authorization: Bearer YOUR_API_KEY`
- API key stored in browser localStorage, managed at https://kie.ai/api-key

### Chat Models (for storyboard generation)
- OpenAI-compatible: `POST https://api.kie.ai/{model-name}/v1/chat/completions`
- Supports multimodal (text + image)
- Models: gpt-5.5, gpt-5.4, gpt-5.2, claude-sonnet-4-5, gemini-2-5-pro, etc.
- Streaming supported
- Vision support: send image_url in content array

### Image Models (for scene generation)
- All via Jobs API: `POST /api/v1/jobs/createTask`
- Key models:
  - `google/nano-banana-2` — cheap, good quality
  - `google/nano-banana` — vision-capable
  - `google/imagen4-fast` — fast generation
  - `google/imagen4-ultra` — best quality
  - `bytedance/seedream-v5-lite-text-to-image` — Seedream v5
  - `flux-2/pro-text-to-image` — Flux Pro
  - `grok-imagine/text-to-image` — Grok
  - `ideogram/v3-text-to-image` — Ideogram v3
  - Many more (72 total)

### Video Models (for video generation)
- All via Jobs API: `POST /api/v1/jobs/createTask`
- Key text-to-video models:
  - `kling/v2.6-text-to-video` — Kling 2.6 (already working)
  - `kling/3.0` — Kling 3.0 (needs mode param)
  - `bytedance/seedance-2` — Seedance 2.0
  - `hailuo/02-text-to-video-pro` — Hailuo Pro
  - `sora2/sora-2-text-to-video` — Sora 2
  - `wan/2-6-text-to-video` — Wan 2.6
  - `grok-imagine/text-to-video` — Grok video
- Special: Veo 3/3.1 and Runway have dedicated endpoints (not Jobs API)

### TTS/Voice Models (for voiceover)
- All via Jobs API: `POST /api/v1/jobs/createTask`
- `elevenlabs/text-to-speech-turbo-2-5` — TTS with voice selection
- `elevenlabs/text-to-speech-multilingual-v2` — Multilingual TTS
- `elevenlabs/text-to-dialogue-v3` — Multi-speaker dialogue
- `elevenlabs/speech-to-text` — Transcription
- `elevenlabs/sound-effect-v2` — Sound effects generation
- `elevenlabs/audio-isolation` — Voice isolation from background

### File Upload (for product photos, reference video, voice samples)
- URL upload: `POST https://kieai.redpandaai.co/api/file-url-upload`
- Stream upload: `POST https://kieai.redpandaai.co/api/file-stream-upload`
- Base64 upload: `POST https://kieai.redpandaai.co/api/file-base64-upload`
- **FREE** — no credit cost
- Files deleted after 3 days
- Upload response includes `fileUrl` for use in generation tasks

### Credits & Limits
- Check credits: `GET /api/v1/chat/credit`
- Rate limit: 20 requests/10 seconds, 100+ concurrent tasks
- Download URLs expire after 20 minutes
- Generated files stored 14 days

### Polling Pattern
- Jobs API: `GET /api/v1/jobs/recordInfo?taskId=xxx`
- Veo: `GET /api/v1/veo3/getDetails?taskId=xxx`
- Runway: `GET /api/v1/runway/getVideoDetails?taskId=xxx`
- States: `waiting | queuing | generating | success | fail`
- Result in: `resultJson` (JSON string) or `response` (object)

## Pending Research Items
1. Fish Audio full API docs (voice listing, cloning, generation)
2. FFmpeg.wasm vs server-side video assembly
3. ElevenLabs voice list via KIE — what voices available?
4. Product photo analysis prompt — which model works best?
5. Credit cost testing for TTS (how many credits per minute?)

## Architecture Decisions (DRAFT — not final)
- Edge TTS as free default voice provider (server-side Python)
- KIE ElevenLabs as premium voice provider (uses credits, no extra API key)
- Fish Audio as clone voice provider (need separate API key)
- Voice stored in Avatar profile: {provider, voice_id, settings}
- Chat model for storyboard: GPT-5.2 or Gemini 2.5 Pro (has vision for photo analysis)
- Image model for scenes: nano-banana-2 (cheap) or imagen4-fast (better quality)