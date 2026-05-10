/* ─── TikTok Studio API ─── */
/* API methods specific to the TikTok Studio feature */

const KIE_BASE = 'https://api.kie.ai'

// ─── KIE API helpers ───

export function getKIEKey(): string | null {
  return localStorage.getItem('qfm_kie_key')
}

export async function kiePost(path: string, body: any): Promise<any> {
  const key = getKIEKey()
  if (!key) throw new Error('KIE.API key not set. Add it in Settings.')
  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  }
  const res = await fetch(`${KIE_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (data.code !== 200) {
    throw new Error(data.msg || `KIE error ${res.status}`)
  }
  return data
}

async function kieGet(path: string): Promise<any> {
  const key = getKIEKey()
  if (!key) throw new Error('KIE.API key not set. Add it in Settings.')
  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  }
  const res = await fetch(`${KIE_BASE}${path}`, { method: 'GET', headers })
  const data = await res.json()
  if (data.code !== 200) {
    throw new Error(data.msg || `KIE error ${res.status}`)
  }
  return data
}

// ─── KIE File Upload (FREE) ───

const KIE_UPLOAD_BASE = 'https://kieai.redpandaai.co'

export async function uploadFileToKIE(file: File): Promise<{ fileUrl: string; fileId: string; fileName: string; fileSize: number }> {
  // For files under 10MB, use base64 upload
  if (file.size < 10 * 1024 * 1024) {
    return uploadFileBase64(file)
  }
  // For larger files, use stream upload
  return uploadFileStream(file)
}

async function uploadFileBase64(file: File): Promise<{ fileUrl: string; fileId: string; fileName: string; fileSize: number }> {
  const key = getKIEKey()
  if (!key) throw new Error('KIE.API key not set. Add it in Settings.')
  const base64 = await fileToBase64(file)
  const ctrl = new AbortController()
  const timeout = setTimeout(() => ctrl.abort(), 60000)
  try {
    const res = await fetch(`${KIE_UPLOAD_BASE}/api/file-base64-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        base64Data: base64,
        uploadPath: 'tiktok-studio',
        fileName: file.name,
      }),
      signal: ctrl.signal,
    })
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
    const data = await res.json()
    if (!data.success && data.code !== 200) throw new Error(data.msg || 'Upload failed')
    // KIE upload response uses downloadUrl, not fileUrl
    return {
      fileUrl: data.data.fileUrl || data.data.downloadUrl || data.data.url,
      fileId: data.data.fileId || data.data.filePath || '',
      fileName: data.data.fileName || file.name,
      fileSize: data.data.fileSize || file.size,
    }
  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error('Upload timed out (60s)')
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

async function uploadFileStream(file: File): Promise<{ fileUrl: string; fileId: string; fileName: string; fileSize: number }> {
  const key = getKIEKey()
  if (!key) throw new Error('KIE.API key not set. Add it in Settings.')
  const formData = new FormData()
  formData.append('file', file)
  formData.append('uploadPath', 'tiktok-studio')
  formData.append('fileName', file.name)
  const ctrl = new AbortController()
  const timeout = setTimeout(() => ctrl.abort(), 60000)
  try {
    const res = await fetch(`${KIE_UPLOAD_BASE}/api/file-stream-upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: formData,
      signal: ctrl.signal,
    })
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
    const data = await res.json()
    if (!data.success && data.code !== 200) throw new Error(data.msg || 'Upload failed')
    // KIE upload response uses downloadUrl, not fileUrl
    return {
      fileUrl: data.data.fileUrl || data.data.downloadUrl || data.data.url,
      fileId: data.data.fileId || data.data.filePath || '',
      fileName: data.data.fileName || file.name,
      fileSize: data.data.fileSize || file.size,
    }
  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error('Upload timed out (60s)')
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

// ─── KIE Chat API (for product analysis & storyboard generation) ───

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | ChatContent[]
}

export interface ChatContent {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string }
}

export async function kieChat(
  messages: ChatMessage[],
  model: string = 'claude-sonnet-4-5',
): Promise<string> {
  const key = localStorage.getItem('qfm_kie_key')
  if (!key) throw new Error('KIE.API key not set. Add it in Settings.')

  // Route to the correct endpoint based on model family
  const isDeepSeek = model.startsWith('deepseek')

  if (isDeepSeek) {
    // DeepSeek uses OpenAI-compatible /api/v1/chat/completions
    const res = await fetch(`${KIE_BASE}/api/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 4000,
        messages: messages.map(m => ({
          role: m.role,
          content: typeof m.content === 'string' ? m.content : m.content.map(c => {
            if (c.type === 'text') return { type: 'text', text: c.text }
            if (c.type === 'image_url') return { type: 'image_url', image_url: { url: c.image_url?.url } }
            return c
          }),
        })),
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Chat API error: ${res.status} ${err}`)
    }

    const data = await res.json()
    // Check for KIE-style error responses wrapped in 200
    if (data.code && data.code !== 200) {
      throw new Error(`KIE API error: ${data.msg || data.message || JSON.stringify(data)}`)
    }

    // OpenAI-compatible response: data.choices[0].message.content
    const text = data.choices?.[0]?.message?.content || ''
    if (!text) {
      throw new Error(`Empty response from ${model}. Raw: ${JSON.stringify(data).substring(0, 200)}`)
    }
    return text
  }

  // Claude Models: use /claude/v1/messages endpoint
  // Separate system messages (Claude uses a top-level system field)
  const systemParts = messages
    .filter(m => m.role === 'system')
    .map(m => typeof m.content === 'string' ? m.content : m.content.filter(c => c.type === 'text').map(c => c.text).join(' '))
  const system = systemParts.join('\n') || undefined

  // Convert user/assistant messages to Claude format
  const claudeMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role,
      content: typeof m.content === 'string'
        ? m.content
        : m.content.map(c => {
            if (c.type === 'text') return { type: 'text', text: c.text }
            // Convert OpenAI image_url format to Claude image format
            if (c.type === 'image_url') {
              const url = c.image_url?.url
              if (!url) return null
              // Claude Messages API uses { type: "image", source: { type: "url", url } }
              // NOT OpenAI's { type: "image_url", image_url: { url } }
              return {
                type: 'image',
                source: { type: 'url', url },
              }
            }
            return c
          }).filter(Boolean),
    }))

  const res = await fetch(`${KIE_BASE}/claude/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 4000,
      ...(system ? { system } : {}),
      messages: claudeMessages,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Chat API error: ${res.status} ${err}`)
  }

  const data = await res.json()

  // Check for KIE error responses (HTTP 200 but code: 422/500)
  if (data.code && data.code !== 200) {
    throw new Error(`KIE API error: ${data.msg || data.message || JSON.stringify(data)}`)
  }

  // Claude response: content is array of {type: 'text', text: '...'}
  if (!data.content || !Array.isArray(data.content)) {
    throw new Error(`Unexpected response format from ${model}. Raw: ${JSON.stringify(data).substring(0, 200)}`)
  }

  const text = data.content
    .filter((c: any) => c.type === 'text')
    .map((c: any) => c.text)
    .join('\n')

  if (!text) {
    throw new Error(`Empty response from ${model}. The model may not support this request type.`)
  }

  return text
}

// ─── KIE Scene Image Generation (via Jobs API) ───

export async function generateSceneImage(data: {
  prompt: string
  model?: string
  aspectRatio?: string
  callBackUrl?: string
}): Promise<string> {
  const model = data.model || 'google/nano-banana-2'
  const result = await kiePost('/api/v1/jobs/createTask', {
    model,
    input: {
      prompt: data.prompt,
      ...(data.aspectRatio ? { aspect_ratio: data.aspectRatio } : {}),
    },
    ...(data.callBackUrl ? { callBackUrl: data.callBackUrl } : {}),
  })
  return result.data.taskId
}

// ─── KIE ElevenLabs TTS (via Jobs API) ───

export async function generateElevenLabsTTS(data: {
  text: string
  voice: string
  model?: string
}): Promise<string> {
  const result = await kiePost('/api/v1/jobs/createTask', {
    model: data.model || 'elevenlabs/text-to-speech-turbo-2-5',
    input: {
      text: data.text,
      voice: data.voice,
    },
  })
  return result.data.taskId
}
// ─── Helper: resolve API URL (strip trailing slash, never double-slash) ───

function getAPIBase(): string {
  const url = (import.meta as any).env?.VITE_API_URL || ''
  return url.replace(/\/$/, '') || ''
}

// ─── Backend: Edge TTS ───

export async function generateEdgeTTS(data: {
  text: string
  voice: string
  rate?: string
  pitch?: string
  volume?: string
  format?: string
}): Promise<{ audio_url: string; duration: number; voice: string }> {
  const API_BASE = getAPIBase()
  const res = await fetch(`${API_BASE}/api/v1/tts/edge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `Edge TTS error: ${res.status}` }))
    throw new Error(err.detail || `Edge TTS error: ${res.status}`)
  }
  return res.json()
}

// ─── Fish Audio TTS (direct, browser → Fish Audio) ───

export async function generateFishAudioTTS(data: {
  text: string
  referenceId?: string
  format?: string
  speed?: number
  apiKey: string
}): Promise<Blob> {
  const res = await fetch('https://api.fish.audio/v1/tts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.apiKey}`,
    },
    body: JSON.stringify({
      text: data.text,
      reference_id: data.referenceId || undefined,
      format: data.format || 'mp3',
      prosody_speed: data.speed || 1.0,
      latency: 'normal',
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Fish Audio TTS error: ${res.status} ${err}`)
  }
  return res.blob()
}

// ─── Fish Audio Voice Browsing ───

export async function browseFishAudioVoices(params: {
  page?: number
  limit?: number
  language?: string
  title?: string
  apiKey: string
}): Promise<{ items: any[]; total: number }> {
  const searchParams = new URLSearchParams()
  searchParams.set('page', String(params.page || 1))
  searchParams.set('limit', String(params.limit || 20))
  if (params.language) searchParams.set('language', params.language)
  if (params.title) searchParams.set('title', params.title)

  const res = await fetch(`https://api.fish.audio/model?${searchParams}`, {
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
    },
  })
  if (!res.ok) throw new Error(`Fish Audio browse error: ${res.status}`)
  return res.json()
}

// ─── Backend: Video Assembly ───

export interface SceneInput {
  video_url: string
  voiceover_url?: string
  duration: number
  text_overlay?: string
  text_position?: string
}

export async function assembleVideo(data: {
  scenes: SceneInput[]
  background_music_url?: string
  transition?: string
  output_resolution?: string
  background_music_volume?: number
}): Promise<{ task_id: string; status: string; video_url?: string; duration: number; message: string }> {
  const API_BASE = getAPIBase()
  const res = await fetch(`${API_BASE}/api/v1/video/assemble`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `Assembly error: ${res.status}` }))
    throw new Error(err.detail || `Assembly error: ${res.status}`)
  }
  return res.json()
}

export async function getAssemblyStatus(taskId: string): Promise<{ status: string; videoUrl?: string; progress?: number }> {
  const API_BASE = getAPIBase()
  const res = await fetch(`${API_BASE}/api/v1/video/assemble/${taskId}`)
  if (!res.ok) throw new Error(`Assembly status error: ${res.status}`)
  return res.json()
}