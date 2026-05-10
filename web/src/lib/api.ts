export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') || ''
const KIE_BASE = 'https://api.kie.ai'

/* ─── Backend auth API (through NAS backend) ─── */
async function api(path: string, options: RequestInit = {}) {
  const url = `${API_BASE}${path}`
  const token = localStorage.getItem('qfm_token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  }
  const res = await fetch(url, { ...options, headers })
  if (res.status === 401) {
    localStorage.removeItem('qfm_token')
    localStorage.removeItem('qfm_user')
    throw new Error('Session expired. Please log in again.')
  }
  if (!res.ok) {
    let body: any
    try { body = await res.json() } catch { body = await res.text() }
    const msg = body?.detail || body?.message || `HTTP ${res.status}`
    throw new Error(msg)
  }
  if (res.status === 204) return null
  return res.json()
}

/* ─── KIE.AI direct calls (browser → KIE.API, async taskId pattern) ─── */
function getKIEKey(): string | null {
  return localStorage.getItem('qfm_kie_key')
}

async function kiePost(path: string, body: any): Promise<any> {
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

/* ─── Types ─── */
export interface KIETaskResponse {
  code: number
  msg: string
  data: { taskId: string }
}

export interface KIETaskStatus {
  code: number
  msg: string
  data: {
    taskId: string
    paramJson: string
    response: any
    successFlag: number // 0=processing, 1=success, 2=failed
    status?: string
    errorCode?: string | null
    errorMessage?: string | null
    createTime?: string | number
    completeTime?: string | number | null
    progress?: string
  }
}

export interface KIECreditResponse {
  code: number
  msg: string
  data: number
}

/* ─── Polling helper ─── */
const POLL_INTERVAL = 3000 // 3 seconds
const POLL_MAX_ATTEMPTS = 120 // 6 minutes max

/** Normalize a KIE task status response to a common format.
 *  Veo/Runway use: { data: { successFlag, response } }
 *  Jobs API uses:  { data: { state, resultJson } }
 *  This function normalizes both to { done, failed, response, errorMsg }
 */
export function normalizeKietaskResponse(rawData: any): { done: boolean; failed: boolean; response: any; progress: string; errorMsg: string } {
  // Jobs API format (state-based)
  if (rawData.state !== undefined) {
    const state = rawData.state as string
    if (state === 'success') {
      // resultJson is a JSON string like "{ \"resultUrls\": [\"https://...\"] }"
      let response = rawData.resultJson
      if (typeof response === 'string') {
        try { response = JSON.parse(response) } catch { /* not JSON, use as-is */ }
      }
      return { done: true, failed: false, response, progress: rawData.progress || '100', errorMsg: '' }
    }
    if (state === 'fail') {
      return { done: true, failed: true, response: null, progress: '0', errorMsg: rawData.failMsg || rawData.failCode || 'Generation failed' }
    }
    // Still processing (waiting, queuing, generating)
    const pct = rawData.progress ? `${rawData.progress}%` : state
    return { done: false, failed: false, response: null, progress: pct, errorMsg: '' }
  }

  // Veo/Runway format (successFlag-based)
  const successFlag = rawData.successFlag
  if (successFlag === 1) {
    return { done: true, failed: false, response: rawData.response, progress: '100', errorMsg: '' }
  }
  if (successFlag === 2) {
    return { done: true, failed: true, response: null, progress: '0', errorMsg: rawData.errorMessage || rawData.status || 'Generation failed' }
  }
  // Still processing
  const pct = rawData.progress ? `${Math.round(parseFloat(rawData.progress) * 100)}%` : ''
  return { done: false, failed: false, response: null, progress: pct, errorMsg: '' }
}

export async function pollKietask<T>(
  recordInfoPath: string,
  extractResult: (data: any) => T,
  onProgress?: (attempt: number, data: any) => void,
): Promise<T> {
  for (let attempt = 1; attempt <= POLL_MAX_ATTEMPTS; attempt++) {
    const result: any = await kieGet(recordInfoPath)
    const data = result.data || result
    const status = normalizeKietaskResponse(data)

    if (onProgress) onProgress(attempt, data)

    if (status.done && !status.failed) {
      return extractResult(data)
    }
    if (status.done && status.failed) {
      throw new Error(status.errorMsg || 'Generation failed')
    }

    // Still processing, wait and retry
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL))
  }
  throw new Error('Generation timed out. Please try again.')
}

/* ─── API client ─── */
export const apiClient = {
  // Auth (through backend)
  register: (email: string, password: string, full_name?: string) =>
    api('/api/v1/auth/register', { method: 'POST', body: JSON.stringify({ email, password, full_name }) }),
  login: (email: string, password: string) =>
    api('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => api('/api/v1/auth/me'),
  getSettings: () => api('/api/v1/auth/settings'),
  updateSettings: (data: any) => api('/api/v1/auth/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // Dashboard stats
  getDashboardStats: () => api('/api/v1/content/stats'),

  // Content library (through backend)
  listContent: () => api('/api/v1/content/'),
  getContent: (id: number) => api(`/api/v1/content/${id}`),
  createContent: (data: { type: string; prompt: string; model?: string; aspect_ratio?: string; status?: string; result_url?: string; thumbnail_url?: string; kie_task_id?: string; credit_cost?: number }) =>
    api('/api/v1/content/', { method: 'POST', body: JSON.stringify(data) }),
  updateContent: (id: number, data: { status?: string; result_url?: string; thumbnail_url?: string; kie_task_id?: string; credit_cost?: number }) =>
    api(`/api/v1/content/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Save to content library silently (fire-and-forget, never blocks UI)
  saveToLibrary: (data: { type: string; prompt: string; model?: string; aspectRatio?: string; status?: string; result_url?: string; thumbnail_url?: string; kie_task_id?: string; credit_cost?: number }) => {
    const token = localStorage.getItem('qfm_token')
    if (!token) return // not logged in, skip
    const { aspectRatio, ...rest } = data
    apiClient.createContent({ ...rest, aspect_ratio: aspectRatio }).catch(() => {}) // silently ignore errors
  },
  // Update content after video generation completes (sets real video URL + thumbnail)
  updateContentSilent: (id: number, data: { status?: string; result_url?: string; thumbnail_url?: string }) => {
    apiClient.updateContent(id, data).catch(() => {}) // silently ignore errors
  },
  deleteContent: (id: number) => api(`/api/v1/content/${id}`, { method: 'DELETE' }),

  // ─── KIE.AI Credits ───
  getCredits: (): Promise<KIECreditResponse> => kieGet('/api/v1/chat/credit'),

  // ─── KIE.AI Image Generation ───

  // Flux Kontext (default image model, fast & reliable)
  generateImageFluxKontext: (data: {
    prompt: string
    model?: string
    aspectRatio?: string
    promptUpsampling?: boolean
    callBackUrl?: string
  }) => kiePost('/api/v1/flux/kontext/generate', {
    prompt: data.prompt,
    ...(data.model ? { model: data.model } : {}),
    aspectRatio: data.aspectRatio ?? '1:1',
    promptUpsampling: data.promptUpsampling ?? false,
    ...(data.callBackUrl ? { callBackUrl: data.callBackUrl } : {}),
  }),
  fluxKontextRecordInfo: (taskId: string) =>
    kieGet(`/api/v1/flux/kontext/record-info?taskId=${taskId}`) as Promise<KIETaskStatus>,

  // GPT-4o Image (also used for video models like kling, hailuo, luma, vidu, etc.)
  generateImageGPT4o: (data: {
    prompt: string
    model?: string
    nVariants?: number
    enableFallback?: boolean
    callBackUrl?: string
  }) => kiePost('/api/v1/gpt4o-image/generate', {
    prompt: data.prompt,
    ...(data.model ? { model: data.model } : {}),
    nVariants: data.nVariants ?? 1,
    enableFallback: data.enableFallback ?? false,
    ...(data.callBackUrl ? { callBackUrl: data.callBackUrl } : {}),
  }),
  gpt4oImageRecordInfo: (taskId: string) =>
    kieGet(`/api/v1/gpt4o-image/record-info?taskId=${taskId}`) as Promise<KIETaskStatus>,

  // ─── KIE.AI Video Generation ───

  // Veo (Google Veo3/Veo2 — Sora-equivalent)
  generateVideoVeo: (data: {
    prompt: string
    model?: 'veo3' | 'veo2'
    aspectRatio?: string
    resolution?: string
    callBackUrl?: string
  }) => kiePost('/api/v1/veo/generate', {
    prompt: data.prompt,
    model: data.model ?? 'veo3',
    aspectRatio: data.aspectRatio ?? '16:9',
    resolution: data.resolution ?? '720p',
    enableFallback: false,
    ...(data.callBackUrl ? { callBackUrl: data.callBackUrl } : {}),
  }),
  veoRecordInfo: (taskId: string) =>
    kieGet(`/api/v1/veo/record-info?taskId=${taskId}`) as Promise<KIETaskStatus>,
  veoGet1080p: (taskId: string) => kieGet(`/api/v1/veo/get-1080p-video?taskId=${taskId}`),
  veoGet4k: (taskId: string) => kieGet(`/api/v1/veo/get-4k-video?taskId=${taskId}`),
  veoExtend: (data: any) => kiePost('/api/v1/veo/extend', data),

  // Runway
  generateVideoRunway: (data: {
    prompt: string
    model?: string
    duration?: 5 | 8 | 10
    videoQuality?: string
    callBackUrl?: string
  }) => kiePost('/api/v1/runway/generate', {
    prompt: data.prompt,
    model: data.model ?? 'runway-gen3a',
    duration: data.duration ?? 5,
    quality: data.videoQuality ?? '720p',
    ...(data.callBackUrl ? { callBackUrl: data.callBackUrl } : {}),
  }),
  runwayRecordDetail: (taskId: string) =>
    kieGet(`/api/v1/runway/record-detail?taskId=${taskId}`) as Promise<KIETaskStatus>,
  runwayExtend: (data: any) => kiePost('/api/v1/runway/extend', data),

  // ─── KIE.AI Music Generation (Suno-compatible) ───
  generateMusic: (data: {
    prompt: string
    title?: string
    style?: string
    tags?: string
    instrumental?: boolean
    customMode?: boolean
    model?: 'V3_5' | 'V4' | 'V4_5' | 'V4_5PLUS' | 'V4_5ALL' | 'V5' | 'V5_5'
    negativeTags?: string
    callBackUrl?: string
  }) => kiePost('/api/v1/generate', {
    prompt: data.prompt,
    title: data.title ?? 'Custom Track',
    style: data.style ?? 'Pop',
    tags: data.tags ?? '',
    instrumental: data.instrumental ?? false,
    customMode: data.customMode ?? true,
    model: data.model ?? 'V4',
    negativeTags: data.negativeTags ?? '',
    ...(data.callBackUrl ? { callBackUrl: data.callBackUrl } : {}),
  }),
  musicRecordInfo: (taskId: string) =>
    kieGet(`/api/v1/generate/record-info?taskId=${taskId}`) as Promise<KIETaskStatus>,

  // Music extensions
  musicExtend: (data: any) => kiePost('/api/v1/generate/extend', data),
  musicAddVocals: (data: any) => kiePost('/api/v1/generate/add-vocals', data),
  musicAddInstrumental: (data: any) => kiePost('/api/v1/generate/add-instrumental', data),
  musicMashup: (data: any) => kiePost('/api/v1/generate/mashup', data),
  musicLyrics: (data: any) => kiePost('/api/v1/lyrics', data),
  musicGetTimestampedLyrics: (data: any) => kiePost('/api/v1/generate/get-timestamped-lyrics', data),

  // Suno Cover
  generateSunoCover: (data: any) => kiePost('/api/v1/suno/cover/generate', data),
  sunoCoverRecordInfo: (taskId: string) =>
    kieGet(`/api/v1/suno/cover/record-info?taskId=${taskId}`) as Promise<KIETaskStatus>,

  // ─── KIE.AI Other Endpoints ───
  // Vocal removal
  vocalRemoval: (data: any) => kiePost('/api/v1/vocal-removal/generate', data),
  vocalRemovalRecordInfo: (taskId: string) =>
    kieGet(`/api/v1/vocal-removal/record-info?taskId=${taskId}`) as Promise<KIETaskStatus>,

  // WAV/MIDI generation
  generateWav: (data: any) => kiePost('/api/v1/wav/generate', data),
  wavRecordInfo: (taskId: string) =>
    kieGet(`/api/v1/wav/record-info?taskId=${taskId}`) as Promise<KIETaskStatus>,
  generateMidi: (data: any) => kiePost('/api/v1/midi/generate', data),
  midiRecordInfo: (taskId: string) =>
    kieGet(`/api/v1/midi/record-info?taskId=${taskId}`) as Promise<KIETaskStatus>,

  // Style transfer
  generateStyle: (data: any) => kiePost('/api/v1/style/generate', data),

  // Aleph (video-to-video)
  generateAleph: (data: any) => kiePost('/api/v1/aleph/generate', data),
  alephRecordInfo: (taskId: string) =>
    kieGet(`/api/v1/aleph/record-info?taskId=${taskId}`) as Promise<KIETaskStatus>,

  // MP4 generation
  generateMP4: (data: any) => kiePost('/api/v1/mp4/generate', data),
  mp4RecordInfo: (taskId: string) =>
    kieGet(`/api/v1/mp4/record-info?taskId=${taskId}`) as Promise<KIETaskStatus>,

  // Download URL
  getDownloadUrl: (url: string) => kiePost('/api/v1/common/download-url', { url }),

  // Chat / Responses (OpenAI-compatible)
  chatCompletions: (data: any) => kiePost('/api/v1/chat/completions', data),
  responses: (data: any) => kiePost('/api/v1/responses', data),

  // ─── Convenience: unified image generation (auto-selects model) ───
  generateImage: async (data: {
    prompt: string
    model?: string
    callBackUrl?: string
    [key: string]: any
  }): Promise<{ taskId: string; recordInfoPath: string }> => {
    const model = data.model || 'nano-banana-pro'
    const aspectRatio = data.aspectRatio || '1:1'
    // Flux Kontext family (pro, max, etc.) — native aspect_ratio support
    if (model.startsWith('flux-kontext')) {
      const res = await apiClient.generateImageFluxKontext({ ...data, model: model === 'flux-kontext' ? undefined : model, aspectRatio })
      return { taskId: res.data.taskId, recordInfoPath: `/api/v1/flux/kontext/record-info?taskId=${res.data.taskId}` }
    }
    // Nano Banana / GPT-4o — no native aspect_ratio; embed in prompt for tall/wide ratios
    const aspectInstructions: Record<string, string> = {
      '9:16': ' (portrait vertical image, tall and narrow)',
      '3:4': ' (portrait image, slightly taller than wide)',
      '16:9': ' (landscape horizontal image, wide and short)',
      '4:3': ' (landscape image, slightly wider than tall)',
    }
    const promptWithAspect = (aspectRatio !== '1:1' && aspectInstructions[aspectRatio])
      ? `${data.prompt}${aspectInstructions[aspectRatio]}`
      : data.prompt
    const res = await apiClient.generateImageGPT4o({ ...data, prompt: promptWithAspect })
    return { taskId: res.data.taskId, recordInfoPath: `/api/v1/gpt4o-image/record-info?taskId=${res.data.taskId}` }
  },

  // ─── KIE Jobs API (newer video models: Kling, Bytedance/Seedance, etc.) ───
  // These models use a different API format: POST /api/v1/jobs/createTask with { model, input: {...} }
  generateVideoJobs: async (data: {
    model: string  // e.g. 'kling-2.6/text-to-video', 'kling-3.0/video', etc.
    prompt: string
    duration?: string  // '5' or '10'
    sound?: boolean
    image_urls?: string[]
    aspect_ratio?: string
    mode?: string  // Kling 3.0 specific: 'std', 'pro', '4K'
    callBackUrl?: string
  }): Promise<{ taskId: string; recordInfoPath: string }> => {
    const key = getKIEKey()
    if (!key) throw new Error('KIE.API key not set. Add it in Settings.')
    const input: Record<string, any> = {
      prompt: data.prompt,
    }
    if (data.duration) input.duration = data.duration
    if (data.sound !== undefined) input.sound = data.sound
    if (data.image_urls && data.image_urls.length > 0) input.image_urls = data.image_urls
    if (data.aspect_ratio) input.aspect_ratio = data.aspect_ratio
    if (data.mode) input.mode = data.mode

    const res = await fetch(`${KIE_BASE}/api/v1/jobs/createTask`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: data.model,
        input,
        ...(data.callBackUrl ? { callBackUrl: data.callBackUrl } : {}),
      }),
    })
    const result = await res.json()
    if (result.code !== 200) {
      console.error('[KIE Jobs API] Error:', result.code, result.msg, 'for model:', data.model, 'status:', res.status)
      throw new Error(result.msg || `KIE Jobs API error ${res.status}: ${JSON.stringify(result).slice(0, 200)}`)
    }
    return { taskId: result.data.taskId, recordInfoPath: `/api/v1/jobs/recordInfo?taskId=${result.data.taskId}` }
  },

  // Poll the Jobs API recordInfo endpoint (unified polling for all /jobs/createTask models)
  jobsRecordInfo: (taskId: string) =>
    kieGet(`/api/v1/jobs/recordInfo?taskId=${taskId}`) as Promise<KIETaskStatus>,

  // ─── Convenience: unified video generation (auto-selects model & endpoint) ───
  generateVideo: async (data: {
    prompt: string
    model?: string
    aspectRatio?: string
    resolution?: string
    duration?: string  // '5' or '10' for Kling/Runway
    sound?: boolean    // Kling audio
    callBackUrl?: string
    endpoint?: string  // 'veo' | 'runway' | 'kling' | 'gpt4o-image' | 'jobs'
    [key: string]: any
  }): Promise<{ taskId: string; recordInfoPath: string }> => {
    const model = data.model || 'veo3'
    const endpoint = data.endpoint || 'veo'
    const aspectRatio = data.aspectRatio || '9:16'
    const resolution = data.resolution || '720p'

    // ─── NEW: Kling video models use /jobs/createTask (real video, NOT gpt4o-image) ───
    if (endpoint === 'kling' || model.startsWith('kling')) {
      // Map our model IDs to KIE Jobs API model strings
      const klingModelMap: Record<string, string> = {
        'kling-pro': 'kling-2.6/text-to-video',
        'kling-2.6': 'kling-2.6/text-to-video',
        'kling-2.5-turbo': 'kling-v2.5-turbo/text-to-video',
        'kling-v2.1': 'kling/v2-1-pro',
        'kling-3.0': 'kling-3.0/video',
      }
      const klingModel = klingModelMap[model] || 'kling-2.6/text-to-video'
      // Kling 3.0 requires 'mode' parameter (std/pro/4K); others don't need it
      const klingMode = data.mode || (model === 'kling-3.0' ? 'std' : undefined)
      return apiClient.generateVideoJobs({
        model: klingModel,
        prompt: data.prompt,
        duration: data.duration || '5',
        sound: data.sound || false,
        aspect_ratio: aspectRatio,
        ...(klingMode ? { mode: klingMode } : {}),
      })
    }

    // ─── Seedance (Bytedance) also uses /jobs/createTask ───
    if (endpoint === 'seedance' || model.startsWith('seedance')) {
      return apiClient.generateVideoJobs({
        model: model.startsWith('seedance') ? model : 'seedance-2.0',
        prompt: data.prompt,
        duration: data.duration || '5',
        aspect_ratio: aspectRatio,
      })
    }

    // ─── Hailuo also uses /jobs/createTask ───
    if (endpoint === 'hailuo' || model === 'hailuo' || model === 'hailuo-pro') {
      const hailuoModelMap: Record<string, string> = {
        'hailuo': 'hailuo/02-text-to-video-pro',
        'hailuo-pro': 'hailuo/02-text-to-video-pro',
      }
      return apiClient.generateVideoJobs({
        model: hailuoModelMap[model] || 'hailuo/02-text-to-video-pro',
        prompt: data.prompt,
        duration: data.duration || '6',
        aspect_ratio: aspectRatio,
      })
    }

    // ─── Sora2 (OpenAI) uses /jobs/createTask ───
    if (endpoint === 'sora2' || model === 'sora2') {
      return apiClient.generateVideoJobs({
        model: 'sora2/sora-2-text-to-video',
        prompt: data.prompt,
        duration: data.duration || '5',
        aspect_ratio: aspectRatio,
      })
    }

    // ─── Wan (Alibaba) uses /jobs/createTask ───
    if (endpoint === 'wan' || model.startsWith('wan')) {
      const wanModelMap: Record<string, string> = {
        'wan-2.6': 'wan/2-6-text-to-video',
        'wan-2.5': 'wan/2-5-text-to-video',
      }
      return apiClient.generateVideoJobs({
        model: wanModelMap[model] || 'wan/2-6-text-to-video',
        prompt: data.prompt,
        duration: data.duration || '5',
        aspect_ratio: aspectRatio,
      })
    }

    if (endpoint === 'runway' || model === 'runway' || model === 'runway-gen3a') {
      const res = await apiClient.generateVideoRunway({ prompt: data.prompt, model: 'runway-gen3a', duration: 5, videoQuality: '720p' })
      return { taskId: res.data.taskId, recordInfoPath: `/api/v1/runway/record-detail?taskId=${res.data.taskId}` }
    }

    if (endpoint === 'veo') {
      const res = await apiClient.generateVideoVeo({ ...data, model: model as 'veo3', aspectRatio, resolution })
      return { taskId: res.data.taskId, recordInfoPath: `/api/v1/veo/record-info?taskId=${res.data.taskId}` }
    }

    // ─── OLD: Image-only models fallback ───
    // These go through /gpt4o-image/generate and return PNG stills, NOT video
    // Kept for backward compatibility with image generation use cases
    const res = await apiClient.generateImageGPT4o({ prompt: data.prompt, model })
    return { taskId: res.data.taskId, recordInfoPath: `/api/v1/gpt4o-image/record-info?taskId=${res.data.taskId}` }
  },

  // ─── Text Generation via Claude Messages API (works reliably) ───
  generateText: async (data: any): Promise<any> => {
    const key = getKIEKey()
    if (!key) throw new Error('KIE.API key not set. Add it in Settings.')
    const model = data.model || 'claude-sonnet-4-5'
    const maxTokens = data.max_tokens || 4096

    // Route to Claude messages API
    const res = await fetch(`${KIE_BASE}/claude/v1/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: data.system_prompt || 'You are a helpful assistant.',
        messages: [
          { role: 'user', content: data.user_message || '' },
        ],
      }),
    })
    const textBody = await res.text()
    if (!textBody) {
      throw new Error(`KIE Claude returned empty response (HTTP ${res.status}). Try again.`)
    }
    let data2: any
    try { data2 = JSON.parse(textBody) } catch {
      throw new Error(`KIE Claude returned invalid JSON. Try again.`)
    }
    if (!res.ok) {
      throw new Error(data2.error?.message || data2.msg || `Claude API error ${res.status}`)
    }
    if (data2.type === 'error') {
      throw new Error(data2.error?.message || `Claude API error`)
    }
    // Claude returns { content: [{type: "text", text: "..."}], ... }
    // Normalize to look like chat/completions response for backward compat
    const text = Array.isArray(data2.content)
      ? data2.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n')
      : data2.content || ''
    return {
      result: {
        choices: [{ message: { content: text } }],
      },
      data: {
        choices: [{ message: { content: text } }],
      },
      credits_consumed: data2.credits_consumed,
    }
  },

  // ─── Google AI Studio (Gemini) — FREE text generation ───
  hasGoogleKey: () => !!localStorage.getItem('qfm_google_key'),
  getGoogleKey: () => localStorage.getItem('qfm_google_key'),
  setGoogleKey: (key: string) => { localStorage.setItem('qfm_google_key', key) },
  clearGoogleKey: () => { localStorage.removeItem('qfm_google_key') },

  generateTextGemini: async (data: any): Promise<any> => {
    const key = localStorage.getItem('qfm_google_key')
    if (!key) throw new Error('Google AI Studio key not set. Add it in Settings.')
    const model = data.model || 'gemini-2.5-flash'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: data.system_prompt || 'You are a helpful assistant.' }] },
        contents: [{ role: 'user', parts: [{ text: data.user_message || '' }] }],
        generationConfig: { maxOutputTokens: data.max_tokens || 4096 },
      }),
    })
    const data2 = await res.json()
    if (data2.error) throw new Error(data2.error.message || 'Gemini API error')
    const text = data2.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('\n') || ''
    return {
      result: { choices: [{ message: { content: text } }] },
      data: { choices: [{ message: { content: text } }] },
      provider: 'google',
    }
  },

  // ─── Smart text generation: Google (free) → KIE Claude (fallback) ───
  generateTextSmart: async (data: any): Promise<any> => {
    // If Google AI Studio key exists, use it (FREE)
    if (localStorage.getItem('qfm_google_key')) {
      try {
        return await apiClient.generateTextGemini(data)
      } catch (e: any) {
        // If Google fails, fall through to KIE
        console.warn('Google AI Studio failed, falling back to KIE:', e.message)
      }
    }
    // Fallback to KIE Claude
    return apiClient.generateText(data)
  },

  imageStatus: async (taskIds: string[]): Promise<Record<string, any>> => {
    // Poll each taskId individually via flux kontext record-info
    const results: Record<string, any> = {}
    for (const tid of taskIds) {
      try {
        const info = await kieGet(`/api/v1/flux/kontext/record-info?taskId=${tid}`)
        const d = info.data as KIETaskStatus['data']
        results[tid] = {
          status: d.successFlag === 1 ? 'completed' : d.successFlag === 2 ? 'failed' : 'processing',
          url: d.response?.resultImageUrl || d.response?.originImageUrl || (Array.isArray(d.response?.resultUrls) ? d.response.resultUrls[0] : null),
        }
      } catch { /* skip failed polls */ }
    }
    return results
  },

  videoStatus: async (taskIds: string[]): Promise<Record<string, any>> => {
    const results: Record<string, any> = {}
    for (const tid of taskIds) {
      try {
        const info = await kieGet(`/api/v1/veo/record-info?taskId=${tid}`)
        const d = info.data as KIETaskStatus['data']
        const urls = d.response?.resultUrls || []
        results[tid] = {
          status: d.successFlag === 1 ? 'completed' : d.successFlag === 2 ? 'failed' : 'processing',
          url: urls[0] || d.response?.resultUrl || null,
        }
      } catch { /* skip failed polls */ }
    }
    return results
  },

  generateVoice: (data: any) => kiePost('/api/v1/wav/generate', data),
  generateUGC: (data: any) => kiePost('/api/v1/gpt4o-image/generate', data),

  // ─── KIE key management (localStorage, same as UGGii) ───
  setKIEKey: (key: string) => { localStorage.setItem('qfm_kie_key', key) },
  clearKIEKey: () => { localStorage.removeItem('qfm_kie_key') },
  hasKIEKey: () => !!localStorage.getItem('qfm_kie_key'),
  getKIEKey: () => localStorage.getItem('qfm_kie_key'),

  // ─── Video Analyzer (upload or URL → Gemini analysis) ───
  analyzeVideoUrl: async (url: string, businessContext?: string): Promise<any> => {
    const token = getToken()
    // Try backend first, fall back to direct Gemini if no backend Google key
    try {
      const res = await fetch(`${API_BASE}/api/v1/analyze/video/url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ url, business_context: businessContext }),
      })
      if (res.status === 400) {
        const err = await res.json().catch(() => ({}))
        if (err.detail?.includes('Google AI Studio API key not configured')) {
          // Backend doesn't have the key — tell user to save settings first
          throw new Error('Please go to Settings → API Keys → save your Google AI Studio key (click Test & Save to sync it)')
        }
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Analysis failed' }))
        throw new Error(err.detail || 'Analysis failed')
      }
      return res.json()
    } catch (e: any) {
      throw e
    }
  },

  analyzeVideoUpload: async (file: File, businessContext?: string): Promise<any> => {
    const token = getToken()
    const formData = new FormData()
    formData.append('file', file)
    if (businessContext) formData.append('business_context', businessContext)
    const res = await fetch(`${API_BASE}/api/v1/analyze/video/upload`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData,
    })
    if (res.status === 400) {
      const err = await res.json().catch(() => ({}))
      if (err.detail?.includes('Google AI Studio API key not configured')) {
        throw new Error('Please go to Settings → API Keys → save your Google AI Studio key (click Test & Save to sync it)')
      }
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Analysis failed' }))
      throw new Error(err.detail || 'Analysis failed')
    }
    return res.json()
  },

  // ─── Test KIE connection ───
  testKIEConnection: async (): Promise<{ success: boolean; credits?: number; error?: string }> => {
    try {
      const res = await apiClient.getCredits()
      return { success: true, credits: res.data }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  },
}

export function getToken(): string | null { return localStorage.getItem('qfm_token') }
export function setToken(t: string) { localStorage.setItem('qfm_token', t) }
export function getUser(): any | null {
  try { const u = localStorage.getItem('qfm_user'); return u ? JSON.parse(u) : null } catch { return null }
}
export function setUser(u: any) { localStorage.setItem('qfm_user', JSON.stringify(u)) }
export function clearToken() { localStorage.removeItem('qfm_token'); localStorage.removeItem('qfm_user') }