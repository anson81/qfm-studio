# QFM Studio — TikTok Video Studio: Data Models & Storyboard Format

**Date:** 2026-05-03
**Status:** DRAFT — Pre-build design

---

## TypeScript Type Definitions

```typescript
// ─── Avatar & Voice ───

export interface VoiceConfig {
  provider: 'edge_tts' | 'elevenlabs' | 'fish_audio'
  
  // Edge TTS specific
  edgeVoiceName?: string  // e.g., "en-US-AriaNeural"
  edgeRate?: string        // e.g., "+10%", "-5%"
  edgePitch?: string       // e.g., "+5Hz"
  
  // ElevenLabs specific (via KIE)
  elevenlabsVoice?: string // e.g., "Rachel", "Aria"
  elevenlabsModel?: 'elevenlabs/text-to-speech-turbo-2-5' | 'elevenlabs/text-to-speech-multilingual-v2'
  
  // Fish Audio specific
  fishAudioModelId?: string   // e.g., "model_abc123" — voice model ID
  fishAudioApiKey?: string     // user's Fish Audio API key (stored encrypted or local)
  fishAudioSpeed?: number      // 0.5 - 2.0
  fishAudioTemperature?: number // 0.0 - 1.0
  
  // Common
  language: string  // 'en', 'zh', 'ms' — affects voice selection UI
  speed: number     // 0.5 - 2.0 — overridden by provider-specific settings
  volume: number    // 0 - 100
}

export interface Avatar {
  id: string               // UUID
  name: string             // e.g., "Sarah - Sleep Mask Ambassador"
  description?: string     // e.g., "Young professional woman, confident, warm"
  
  // Appearance
  faceImageUrl?: string    // URL or base64 of face image (for reference)
  faceImageData?: string   // Base64 of face (stored in IndexedDB separately)
  
  // Identity
  gender: 'female' | 'male' | 'neutral'
  ageRange: string          // e.g., "25-34"
  style: string             // e.g., "casual_chic", "professional", "bohemian"
  expression: string        // e.g., "confident_smile", "thoughtful"
  tone: string              // e.g., "warm_aspirational", "energetic", "calm_review"
  
  // Voice
  voice: VoiceConfig
  
  // Metadata
  createdAt: string         // ISO timestamp
  updatedAt: string          // ISO timestamp
  usageCount: number         // How many videos used this avatar
  
  // Storage
  isPreset: boolean         // true = built-in avatar, false = user-created
  tags: string[]             // e.g., ["beauty", "lifestyle", "mask"]
}

// ─── Product ───

export interface ProductInput {
  name: string              // Product name
  description?: string      // User-provided description
  category?: string         // e.g., "beauty", "fashion", "electronics"
  targetPlatform: 'tiktok' | 'instagram' | 'youtube_shorts' | 'generic'
  
  // Product photos
  photos: ProductPhoto[]    // Max 10
  
  // Reference video (optional — for style extraction)
  referenceVideoUrl?: string
  referenceVideoAnalysis?: VideoStyleDNA
  
  // AI-extracted features
  extractedFeatures?: ProductFeatures
}

export interface ProductPhoto {
  id: string                // UUID
  kieFileUrl?: string       // URL from KIE file upload
  localPreview?: string     // Base64 for display before upload
  fileName: string
  fileSize: number
  mimeType: string
}

export interface ProductFeatures {
  // Auto-extracted from photos
  colors: string[]           // e.g., ["navy blue", "gold accents"]
  materials: string[]        // e.g., ["silk", "cotton"]
  style: string              // e.g., "minimalist luxury"
  keyFeatures: string[]      // e.g., ["adjustable strap", "breathable fabric"]
  suggestedAngles: string[]  // e.g., ["close-up on texture", "lifestyle shot"]
  
  // Brand positioning
  moodKeywords: string[]     // e.g., ["luxurious", "calming", "premium"]
  targetAudience: string      // e.g., "women 25-45, professionals, health-conscious"
  pricePositioning: string   // e.g., "mid-range", "premium", "budget-friendly"
  
  // Extracted by AI from photos
  rawAnalysisText: string    // Full AI analysis text
}

export interface VideoStyleDNA {
  // Extracted from reference video
  pacing: 'fast' | 'medium' | 'slow'
  transitionStyle: string    // e.g., "quick_cuts", "smooth_fade"
  textOverlayStyle: string    // e.g., "large_bold_center", "subtitle_bottom"
  musicMood: string          // e.g., "upbeat_electronic", "calm_acoustic"
  cameraStyle: string         // e.g., "close_up_product", "lifestyle_b_roll"
  colorGrading: string       // e.g., "warm_summer", "cool_minimal"
  durationPerScene: number   // seconds per scene (5-15)
}

// ─── Storyboard ───

export interface Storyboard {
  id: string                 // UUID
  projectId: string          // Links to project
  
  // Storyboard metadata
  title: string
  description?: string
  totalDuration: number       // Total seconds
  
  // Target platform settings
  aspectRatio: '9:16' | '16:9' | '1:1'
  resolution: string          // '720p' | '1080p'
  
  // Scenes
  scenes: Scene[]
  
  // AI generation context
  model: string              // Which KIE chat model was used
  prompt: string             // Original user prompt
  productFeatures?: ProductFeatures
  
  // Metadata
  createdAt: string
  updatedAt: string
}

export interface Scene {
  number: number              // 1-indexed
  
  // Content
  title: string               // Scene title, e.g., "Hook - Problem Statement"
  description: string         // Detailed description of what happens
  voiceoverText: string       // Exact text for voiceover
  
  // Visuals
  visualPrompt: string        // Detailed prompt for image/video generation
  visualPromptNegative?: string // What to avoid in the visual
  
  // Duration
  duration: number            // Seconds (5-15)
  
  // Transitions
  transitionIn?: 'fade' | 'cut' | 'slide' | 'zoom'
  transitionOut?: 'fade' | 'cut' | 'slide' | 'zoom'
  
  // Text overlay
  textOverlay?: string        // Text to display on screen
  textPosition?: 'top' | 'center' | 'bottom'
  textAnimation?: 'pop' | 'fade' | 'slide' | 'typewriter'
  
  // Music/sound
  backgroundMusicMood?: string  // e.g., "upbeat", "calm"
  soundEffectHint?: string      // e.g., "whoosh", "ding"
  
  // Generation status
  imageStatus: 'pending' | 'generating' | 'done' | 'failed'
  imageUrl?: string
  
  videoStatus: 'pending' | 'generating' | 'done' | 'failed'
  videoUrl?: string
  videoTaskId?: string
  
  voiceoverStatus: 'pending' | 'generating' | 'done' | 'failed'
  voiceoverUrl?: string
  
  // Generation config overrides
  imageModel?: string          // Override default image model
  videoModel?: string          // Override default video model
  durationOverride?: number    // Override scene duration for video gen
}

// ─── Project (top-level container) ───

export interface VideoProject {
  id: string
  name: string
  
  // Current step
  currentStep: ProjectStep
  
  // Step data
  product: ProductInput
  storyboard?: Storyboard
  avatar?: Avatar
  
  // Generation config
  defaultImageModel: string     // e.g., "google/nano-banana-2"
  defaultVideoModel: string     // e.g., "kling-2.6/text-to-video"
  defaultVoiceProvider: VoiceConfig['provider']
  
  // Assembly output
  finalVideoUrl?: string
  assemblyStatus: 'pending' | 'assembling' | 'done' | 'failed'
  
  // Metadata
  createdAt: string
  updatedAt: string
}

export type ProjectStep = 
  | 'product_input'      // Step 1: Upload photos, describe product
  | 'storyboard'         // Step 2: Generate & edit storyboard
  | 'avatar_voice'       // Step 3: Choose/create avatar with voice
  | 'scene_images'       // Step 4: Generate scene images
  | 'scene_videos'       // Step 5: Generate scene videos
  | 'voiceover_assembly' // Step 6: Voiceover + assembly

// ─── Voice Library (preset voices) ───

export interface VoiceLibraryEntry {
  id: string                  // e.g., "edge-en-us-aria"
  provider: VoiceConfig['provider']
  name: string                // e.g., "Aria (US English, Female)"
  nameKey: string              // e.g., "en-US-AriaNeural"
  gender: 'female' | 'male' | 'neutral'
  language: string
  accent: string               // e.g., "American", "British", "Singaporean"
  tone: string                 // e.g., "Confident", "Warm", "Professional"
  sampleText?: string          // Preview text
  tags: string[]                // e.g., ["product_demo", "lifestyle", "tech"]
  isPreset: true               // All library entries are presets
}

// ─── Avatar Library (preset + user-created) ───

export interface AvatarLibraryEntry {
  id: string
  name: string
  description: string
  gender: 'female' | 'male' | 'neutral'
  style: string
  voiceId: string               // References VoiceLibraryEntry.id
  faceImageData?: string        // Base64 of preset face
  isPreset: boolean
  tags: string[]
}
```

---

## Storyboard JSON Format (Editable)

The storyboard is the core data structure. Here's the complete format with AI generation context:

```typescript
// Example storyboard for a silk sleep mask TikTok product video
const exampleStoryboard: Storyboard = {
  id: "sb_abc123",
  projectId: "proj_xyz789",
  title: "Silk Sleep Mask - TikTok Product Review",
  description: "60-second TikTok product video showcasing premium silk sleep mask",
  totalDuration: 60,
  aspectRatio: "9:16",
  resolution: "1080p",
  model: "gpt-5.2",
  prompt: "Create a 60-second TikTok product video for a premium silk sleep mask targeting professional women aged 25-45...",
  productFeatures: {
    colors: ["navy blue", "champagne gold"],
    materials: ["100% mulberry silk", "hypoallergenic"],
    style: "minimalist luxury",
    keyFeatures: ["adjustable strap", "breathable fabric", "blocks 100% light"],
    suggestedAngles: ["close-up on silk texture", "lifestyle shot on pillow"],
    moodKeywords: ["luxurious", "calming", "premium", "restful"],
    targetAudience: "women 25-45, professionals, health-conscious",
    pricePositioning: "premium",
    rawAnalysisText: "..."
  },
  scenes: [
    {
      number: 1,
      title: "Hook — The Problem",
      description: "Quick cuts of tired eyes, alarm clock, frustrated morning face",
      voiceoverText: "Tired of waking up exhausted? What if one small change could transform your sleep?",
      visualPrompt: "Close-up of tired eyes in dim morning light, alarm clock showing 6am, woman rubbing eyes frustratedly, cinematic bedroom lighting, warm tones",
      visualPromptNegative: "blurry, low quality, text, watermark",
      duration: 7,
      transitionIn: "fade",
      transitionOut: "cut",
      textOverlay: "Can't sleep? 😴",
      textPosition: "center",
      textAnimation: "pop",
      backgroundMusicMood: "mysterious_building",
      imageStatus: "pending",
      videoStatus: "pending",
      voiceoverStatus: "pending"
    },
    {
      number: 2,
      title: "Introduction — The Product",
      description: "Product reveal: silk sleep mask unboxing, close-up on texture",
      voiceoverText: "Meet the game-changer. 100% mulberry silk, designed by someone who actually struggles with sleep.",
      visualPrompt: "Elegant unboxing of navy blue silk sleep mask, close-up on silk texture catching light, soft hands opening premium packaging, luxurious feel, product photography style",
      visualPromptNegative: "cheap, plastic, low quality",
      duration: 8,
      transitionIn: "cut",
      transitionOut: "slide",
      textOverlay: "100% Mulberry Silk ✨",
      textPosition: "bottom",
      textAnimation: "slide",
      backgroundMusicMood: "upbeat_positive",
      imageStatus: "pending",
      videoStatus: "pending",
      voiceoverStatus: "pending"
    },
    {
      number: 3,
      title: "Feature 1 — Total Darkness",
      description: "Demonstration of light blocking, before/after comparison",
      voiceoverText: "Complete light blackout. Adjustable strap means zero pressure on your eyes. Literally like sleeping in a cocoon.",
      visualPrompt: "Side-by-side comparison of bedroom with lights on vs sleep mask on, total darkness effect, close-up of adjustable strap, comfortable fit demonstration, soft lighting",
      visualPromptNegative: "bright, harsh lighting, cheap fabric",
      duration: 8,
      transitionIn: "slide",
      transitionOut: "cut",
      textOverlay: "Blocks 100% Light 🌙",
      textPosition: "center",
      textAnimation: "fade",
      backgroundMusicMood: "calm_dreamy",
      imageStatus: "pending",
      videoStatus: "pending",
      voiceoverStatus: "pending"
    },
    {
      number: 4,
      title: "Feature 2 — Skin & Hair Benefits",
      description: "Person waking up fresh, no marks on face, smooth hair",
      voiceoverText: "No more sleep lines. The silk actually protects your skin AND your hair. Double win.",
      visualPrompt: "Woman waking up looking fresh and glowing, no pillow marks on face, running hand through smooth hair, morning sunlight, bright and clean bedroom",
      visualPromptNegative: "tired face, messy hair, dark lighting",
      duration: 7,
      transitionIn: "cut",
      transitionOut: "fade",
      textOverlay: "Silk = No Sleep Lines 🧖‍♀️",
      textPosition: "bottom",
      textAnimation: "pop",
      backgroundMusicMood: "fresh_morning",
      imageStatus: "pending",
      videoStatus: "pending",
      voiceoverStatus: "pending"
    },
    {
      number: 5,
      title: "Social Proof — Reviews",
      description: "Fake review screenshots floating past, 4.9 stars",
      voiceoverText: "Over 10,000 five-star reviews don't lie. This is the sleep mask that actually delivers.",
      visualPrompt: "Phone screen showing product page with 4.9 stars and glowing reviews, review quotes floating past, social proof layout, clean modern design",
      visualPromptNegative: "real people faces, identifiable users",
      duration: 7,
      transitionIn: "fade",
      transitionOut: "cut",
      textOverlay: "10,000+ ⭐⭐⭐⭐⭐",
      textPosition: "top",
      textAnimation: "typewriter",
      backgroundMusicMood: "upbeat_confident",
      imageStatus: "pending",
      videoStatus: "pending",
      voiceoverStatus: "pending"
    },
    {
      number: 6,
      title: "CTA — Limited Time Offer",
      description: "Product shot with price/discount, swipe up animation",
      voiceoverText: "Limited time: get 40% off with free shipping. Tap the link before it's gone!",
      visualPrompt: "Product hero shot on white background, 40% OFF badge, free shipping label, swipe up arrow animation, clean commercial product photography",
      visualPromptNegative: "messy, unprofessional, low quality",
      duration: 5,
      transitionIn: "cut",
      transitionOut: "fade",
      textOverlay: "🔥 40% OFF + Free Shipping 🔥",
      textPosition: "center",
      textAnimation: "pop",
      backgroundMusicMood: "energetic_urgent",
      imageStatus: "pending",
      videoStatus: "pending",
      voiceoverStatus: "pending"
    }
  ],
  createdAt: "2026-05-03T14:00:00Z",
  updatedAt: "2026-05-03T14:00:00Z"
}
```

---

## AI Prompt Template for Storyboard Generation

```markdown
You are a TikTok product video scriptwriter. Create a {totalDuration}-second TikTok product video storyboard in JSON format.

## Product Information
- Name: {productName}
- Category: {category}
- Key Features: {keyFeatures}
- Target Audience: {targetAudience}
- Price Positioning: {pricePositioning}
- Mood/Style: {moodKeywords}

{referenceStyleIfExists}

## Requirements
- Target platform: TikTok (9:16 vertical video)
- Number of scenes: {sceneCount} (recommended: {recommendedSceneCount})
- Each scene: 5-15 seconds
- Total duration: ~{totalDuration} seconds
- Voiceover text: Conversational, natural, no robotic tone
- Visual prompts: Detailed enough for AI image generation
- Include: 1 hook scene, 1-2 feature scenes, 1 social proof, 1 CTA

## Output Format
Return a valid JSON object matching this exact structure:
{
  "title": "string",
  "description": "string",
  "totalDuration": number,
  "scenes": [
    {
      "number": number,
      "title": "string — Scene name with purpose",
      "description": "string — What happens in this scene",
      "voiceoverText": "string — Exact voiceover text, 15-40 words",
      "visualPrompt": "string — Detailed prompt for AI image generation, include composition, lighting, mood, style",
      "visualPromptNegative": "string — What to avoid",
      "duration": number,
      "transitionIn": "fade|cut|slide|zoom",
      "transitionOut": "fade|cut|slide|zoom",
      "textOverlay": "string or null — Short text to display",
      "textPosition": "top|center|bottom",
      "textAnimation": "pop|fade|slide|typewriter",
      "backgroundMusicMood": "string — Mood descriptor for background music"
    }
  ]
}
```

---

## Component Architecture

```
/pages/
  TikTokStudio.tsx          — Main wizard page (route-based steps)
  
/components/studio/
  StepIndicator.tsx           — Progress bar showing current step
  
  Step1ProductInput.tsx       — Upload photos + reference video
  Step2Storyboard.tsx         — Generate & edit storyboard
  Step3AvatarVoice.tsx        — Choose/create avatar + voice
  Step4SceneImages.tsx        — Generate scene images
  Step5SceneVideos.tsx        — Generate scene videos
  Step6VoiceoverAssembly.tsx  — Voiceover + final assembly
  
  AvatarCard.tsx              — Avatar preview card
  AvatarCreator.tsx           — Create/edit avatar form
  VoiceBrowser.tsx            — Browse & preview voices
  VoicePreview.tsx            — Play sample audio for a voice
  StoryboardEditor.tsx        — Edit storyboard scenes
  SceneCard.tsx               — Single scene preview + controls
  PhotoUploader.tsx           — Drag & drop photo upload
  VideoPreview.tsx            — Video player with timeline
  
/lib/
  types.ts                    — All TypeScript interfaces above
  api.ts                      — Existing + new API methods
  studioApi.ts                — Studio-specific API methods
  voiceProviders.ts           — Edge TTS, ElevenLabs, Fish Audio clients
  storyboardAi.ts            — AI storyboard generation prompt builder
  storage.ts                  — localStorage + IndexedDB helpers
```

---

## API Integration Plan

### New API Methods (in api.ts or studioApi.ts)

```typescript
// KIE File Upload (FREE)
uploadFileToKIE: (file: File) => Promise<{ fileUrl: string; fileId: string }>

// KIE Chat (for product analysis + storyboard generation)
kieChat: (messages: ChatMessage[], model?: string) => Promise<string>

// KIE ElevenLabs TTS (via Jobs API)
generateTTS: (data: {
  text: string
  voice: string
  model?: string
}) => Promise<string> // taskId

// KIE Scene Image Generation (via Jobs API)
generateSceneImage: (data: {
  prompt: string
  model: string
  aspectRatio?: string
  negativePrompt?: string
}) => Promise<string> // taskId

// Backend: Edge TTS (server-side)
generateEdgeTTS: (data: {
  text: string
  voice: string
  rate?: string
  pitch?: string
}) => Promise<string> // audio URL

// Backend: Video Assembly
assembleVideo: (data: {
  scenes: { videoUrl: string; voiceoverUrl?: string; duration: number }[]
  backgroundMusicUrl?: string
  transition: string
  outputFormat: string
  resolution: string
}) => Promise<string> // taskId for polling
```

### Backend Endpoints (FastAPI — new)

```python
# Edge TTS generation (server-side)
POST /api/v1/tts/edge
  Body: { text, voice, rate?, pitch? }
  Response: { audio_url }  # MP3 file URL

# Video assembly (server-side FFmpeg)
POST /api/v1/video/assemble
  Body: { scenes, background_music_url?, transition, output_format, resolution }
  Response: { task_id }

GET /api/v1/video/assemble/{task_id}
  Response: { status, video_url?, progress }
```