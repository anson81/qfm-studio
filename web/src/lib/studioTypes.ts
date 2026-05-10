/* ─── TikTok Studio Types ─── */
/* All TypeScript interfaces for the TikTok Product Video Studio feature */

// ─── Voice Configuration ───

export type VoiceProvider = 'edge_tts' | 'elevenlabs' | 'fish_audio'

export interface VoiceConfig {
  provider: VoiceProvider

  // Edge TTS specific
  edgeVoiceName?: string   // e.g., "en-US-AriaNeural"
  edgeRate?: string           // e.g., "+10%", "-5%"
  edgePitch?: string          // e.g., "+5Hz"

  // ElevenLabs specific (via KIE)
  elevenlabsVoice?: string    // e.g., "Rachel", "Aria"
  elevenlabsModel?: string    // e.g., "elevenlabs/text-to-speech-turbo-2-5"

  // Fish Audio specific
  fishAudioModelId?: string   // voice model ID
  fishAudioSpeed?: number     // 0.5 - 2.0
  fishAudioTemperature?: number // 0.0 - 1.0

  // Common
  language: string   // 'en', 'zh', 'ms'
  speed: number      // 0.5 - 2.0
  volume: number     // 0 - 100
}

export interface VoiceLibraryEntry {
  id: string
  provider: VoiceProvider
  name: string          // e.g., "Aria (US English, Female)"
  nameKey: string        // e.g., "en-US-AriaNeural"
  gender: 'female' | 'male' | 'neutral'
  language: string
  accent: string         // e.g., "American", "British", "Singaporean"
  tone: string           // e.g., "Confident", "Warm", "Professional"
  tags: string[]
  isPreset: true
}

// ─── Avatar ───

export interface Avatar {
  id: string
  name: string
  description?: string

  // Appearance
  faceImageUrl?: string
  faceImageData?: string  // base64

  // Identity
  gender: 'female' | 'male' | 'neutral' | 'auto'
  ageRange: string        // e.g., "25-34" or "auto"
  nationality: string     // e.g., "malay" or "auto"
  skinTone: string        // e.g., "warm_medium" or "auto"
  style: string           // e.g., "casual_chic"
  expression: string      // e.g., "confident_smile"
  mood: string             // e.g., "warm_aspirational" or "auto"
  tone: string            // e.g., "warm_aspirational"

  // Voice
  voice: VoiceConfig

  // Metadata
  createdAt: string
  updatedAt: string
  usageCount: number
  isPreset: boolean
  tags: string[]
}

// ─── Product Input ───

export interface ProductPhoto {
  id: string
  kieFileUrl?: string      // URL from KIE file upload
  localPreview?: string     // Base64 for display
  fileName: string
  fileSize: number
  mimeType: string
  uploadStatus: 'pending' | 'uploading' | 'done' | 'failed'
}

export interface ProductFeatures {
  colors: string[]
  materials: string[]
  style: string
  keyFeatures: string[]
  suggestedAngles: string[]
  moodKeywords: string[]
  targetAudience: string
  pricePositioning: string
  rawAnalysisText?: string
}

export interface VideoStyleDNA {
  pacing: 'fast' | 'medium' | 'slow'
  transitionStyle: string
  textOverlayStyle: string
  musicMood: string
  cameraStyle: string
  colorGrading: string
  durationPerScene: number
}

export interface ProductInput {
  name: string
  description?: string
  category?: string
  targetPlatform: 'tiktok' | 'instagram' | 'youtube_shorts' | 'generic'
  photos: ProductPhoto[]
  referenceVideoUrl?: string
  referenceVideoAnalysis?: VideoStyleDNA
  extractedFeatures?: ProductFeatures
}

// ─── Storyboard ───

export interface Scene {
  number: number
  title: string
  description: string
  voiceoverText: string

  // Visuals
  visualPrompt: string
  visualPromptNegative?: string

  // Duration & transitions
  duration: number    // seconds
  transitionIn?: 'fade' | 'cut' | 'slide' | 'zoom'
  transitionOut?: 'fade' | 'cut' | 'slide' | 'zoom'

  // Text overlay
  textOverlay?: string
  textPosition?: 'top' | 'center' | 'bottom'
  textAnimation?: 'pop' | 'fade' | 'slide' | 'typewriter'

  // Music/sound
  backgroundMusicMood?: string
  soundEffectHint?: string

  // Generation status
  imageStatus: 'pending' | 'generating' | 'done' | 'failed'
  imageUrl?: string
  imageTaskId?: string

  videoStatus: 'pending' | 'generating' | 'done' | 'failed'
  videoUrl?: string
  videoTaskId?: string

  voiceoverStatus: 'pending' | 'generating' | 'done' | 'failed'
  voiceoverUrl?: string
  voiceoverTaskId?: string

  // Generation config overrides
  imageModel?: string
  videoModel?: string
  durationOverride?: number
}

export interface Storyboard {
  id: string
  projectId: string
  title: string
  description?: string
  totalDuration: number
  aspectRatio: '9:16' | '16:9' | '1:1'
  resolution: string
  scenes: Scene[]
  model: string       // Which AI model generated this
  prompt: string      // Original user prompt
  productFeatures?: ProductFeatures
  createdAt: string
  updatedAt: string
}

// ─── Project ───

export type ProjectStep =
  | 'product_input'
  | 'storyboard'
  | 'avatar_voice'
  | 'scene_images'
  | 'scene_videos'
  | 'voiceover_assembly'

export interface VideoProject {
  id: string
  name: string
  currentStep: ProjectStep
  product: ProductInput
  storyboard?: Storyboard
  avatar?: Avatar

  // Generation config
  defaultImageModel: string
  defaultVideoModel: string
  defaultVoiceProvider: VoiceProvider

  // Assembly output
  finalVideoUrl?: string
  assemblyStatus: 'pending' | 'assembling' | 'done' | 'failed'

  createdAt: string
  updatedAt: string
}

// ─── Preset Data ───

export const EDGE_TTS_VOICES: VoiceLibraryEntry[] = [
  // English — US
  { id: 'edge-en-us-aria', provider: 'edge_tts', name: 'Aria (US English, Female)', nameKey: 'en-US-AriaNeural', gender: 'female', language: 'en', accent: 'American', tone: 'Confident', tags: ['product_demo', 'professional', 'tech'], isPreset: true },
  { id: 'edge-en-us-jenny', provider: 'edge_tts', name: 'Jenny (US English, Female)', nameKey: 'en-US-JennyNeural', gender: 'female', language: 'en', accent: 'American', tone: 'Friendly', tags: ['lifestyle', 'casual', 'beauty'], isPreset: true },
  { id: 'edge-en-us-andrew', provider: 'edge_tts', name: 'Andrew (US English, Male)', nameKey: 'en-US-AndrewNeural', gender: 'male', language: 'en', accent: 'American', tone: 'Warm', tags: ['professional', 'tech', 'review'], isPreset: true },
  { id: 'edge-en-us-brian', provider: 'edge_tts', name: 'Brian (US English, Male)', nameKey: 'en-US-BrianNeural', gender: 'male', language: 'en', accent: 'American', tone: 'Casual', tags: ['casual', 'review', 'unboxing'], isPreset: true },
  { id: 'edge-en-us-emma', provider: 'edge_tts', name: 'Emma (US English, Female)', nameKey: 'en-US-EmmaNeural', gender: 'female', language: 'en', accent: 'American', tone: 'Cheerful', tags: ['lifestyle', 'beauty', 'casual'], isPreset: true },
  { id: 'edge-en-us-guy', provider: 'edge_tts', name: 'Guy (US English, Male)', nameKey: 'en-US-GuyNeural', gender: 'male', language: 'en', accent: 'American', tone: 'Passionate', tags: ['energetic', 'promo', 'sale'], isPreset: true },
  { id: 'edge-en-us-michelle', provider: 'edge_tts', name: 'Michelle (US English, Female)', nameKey: 'en-US-MichelleNeural', gender: 'female', language: 'en', accent: 'American', tone: 'Pleasant', tags: ['product_demo', 'lifestyle'], isPreset: true },
  // English — British
  { id: 'edge-en-gb-libby', provider: 'edge_tts', name: 'Libby (British English, Female)', nameKey: 'en-GB-LibbyNeural', gender: 'female', language: 'en', accent: 'British', tone: 'Friendly', tags: ['lifestyle', 'premium', 'beauty'], isPreset: true },
  { id: 'edge-en-gb-ryan', provider: 'edge_tts', name: 'Ryan (British English, Male)', nameKey: 'en-GB-RyanNeural', gender: 'male', language: 'en', accent: 'British', tone: 'Professional', tags: ['tech', 'review', 'premium'], isPreset: true },
  // English — Singapore (closest to Malaysian)
  { id: 'edge-en-sg-luna', provider: 'edge_tts', name: 'Luna (Singapore English, Female)', nameKey: 'en-SG-LunaNeural', gender: 'female', language: 'en', accent: 'Singaporean', tone: 'Friendly', tags: ['lifestyle', 'local', 'beauty'], isPreset: true },
  { id: 'edge-en-sg-wayne', provider: 'edge_tts', name: 'Wayne (Singapore English, Male)', nameKey: 'en-SG-WayneNeural', gender: 'male', language: 'en', accent: 'Singaporean', tone: 'Positive', tags: ['tech', 'local', 'review'], isPreset: true },
  // Chinese
  { id: 'edge-zh-cn-xiaoxiao', provider: 'edge_tts', name: 'Xiaoxiao (Mandarin, Female)', nameKey: 'zh-CN-XiaoxiaoNeural', gender: 'female', language: 'zh', accent: 'Mandarin', tone: 'Warm', tags: ['beauty', 'lifestyle', 'storytelling'], isPreset: true },
  { id: 'edge-zh-cn-yunxi', provider: 'edge_tts', name: 'Yunxi (Mandarin, Male)', nameKey: 'zh-CN-YunxiNeural', gender: 'male', language: 'zh', accent: 'Mandarin', tone: 'Lively', tags: ['product_demo', 'casual', 'review'], isPreset: true },
  { id: 'edge-zh-cn-yunjian', provider: 'edge_tts', name: 'Yunjian (Mandarin, Male)', nameKey: 'zh-CN-YunjianNeural', gender: 'male', language: 'zh', accent: 'Mandarin', tone: 'Passionate', tags: ['energetic', 'sports', 'promo'], isPreset: true },
  // Malay
  { id: 'edge-ms-my-yasmin', provider: 'edge_tts', name: 'Yasmin (Malay, Female)', nameKey: 'ms-MY-YasminNeural', gender: 'female', language: 'ms', accent: 'Malaysian', tone: 'Friendly', tags: ['local', 'lifestyle', 'beauty'], isPreset: true },
  { id: 'edge-ms-my-osman', provider: 'edge_tts', name: 'Osman (Malay, Male)', nameKey: 'ms-MY-OsmanNeural', gender: 'male', language: 'ms', accent: 'Malaysian', tone: 'Positive', tags: ['local', 'review', 'tech'], isPreset: true },
  // English — Indian (great for diverse TikTok)
  { id: 'edge-en-in-neerja', provider: 'edge_tts', name: 'Neerja (Indian English, Female)', nameKey: 'en-IN-NeerjaNeural', gender: 'female', language: 'en', accent: 'Indian', tone: 'Expressive', tags: ['diverse', 'beauty', 'lifestyle'], isPreset: true },
]

export const KIE_ELEVENLABS_VOICES: VoiceLibraryEntry[] = [
  { id: 'elevenlabs-rachel', provider: 'elevenlabs', name: 'Rachel (ElevenLabs, Female)', nameKey: 'Rachel', gender: 'female', language: 'en', accent: 'American', tone: 'Warm', tags: ['professional', 'storytelling'], isPreset: true },
  { id: 'elevenlabs-aria', provider: 'elevenlabs', name: 'Aria (ElevenLabs, Female)', nameKey: 'Aria', gender: 'female', language: 'en', accent: 'American', tone: 'Confident', tags: ['product_demo', 'professional'], isPreset: true },
  { id: 'elevenlabs-roger', provider: 'elevenlabs', name: 'Roger (ElevenLabs, Male)', nameKey: 'Roger', gender: 'male', language: 'en', accent: 'American', tone: 'Lively', tags: ['energetic', 'promo'], isPreset: true },
  { id: 'elevenlabs-sarah', provider: 'elevenlabs', name: 'Sarah (ElevenLabs, Female)', nameKey: 'Sarah', gender: 'female', language: 'en', accent: 'American', tone: 'Professional', tags: ['professional', 'review'], isPreset: true },
]

export const STEP_LABELS: Record<ProjectStep, string> = {
  product_input: 'Product Input',
  storyboard: 'Storyboard',
  avatar_voice: 'Avatar & Voice',
  scene_images: 'Scene Images',
  scene_videos: 'Scene Videos',
  voiceover_assembly: 'Voiceover & Assembly',
}

export const STEP_ICONS: Record<ProjectStep, string> = {
  product_input: '📦',
  storyboard: '🎬',
  avatar_voice: '🧑',
  scene_images: '🖼️',
  scene_videos: '📹',
  voiceover_assembly: '🎙️',
}