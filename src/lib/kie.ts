export class KIEClient {
  private apiKey: string
  private baseURL = 'https://api.kie.ai'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async generateImage(params: any) {
    return this.post('/api/v1/image/generate', {
      prompt: params.prompt,
      model: params.model || 'flux-kontext-pro',
      aspect_ratio: params.aspectRatio || '9:16',
      num_images: params.numImages || 1,
      negative_prompt: params.negativePrompt,
      reference_image_url: params.referenceImage,
    })
  }

  async generateVideo(params: any) {
    return this.post('/api/v1/video/generate', {
      prompts: params.prompts,
      model: params.model || 'kling-2.5-turbo',
      aspect_ratio: params.aspectRatio || '9:16',
      resolution: params.resolution || '720p',
      dialogue_language: params.dialogueLanguage || 'ms',
      enable_fallback: params.enableFallback ?? true,
    })
  }

  async generateVoice(params: any) {
    return this.post('/api/v1/voice/generate', {
      text: params.text,
      voice_id: params.voice || 'shazrina',
      language: params.language || 'ms',
      speed: params.speed ?? 1.0,
      pitch: params.pitch ?? 0,
    })
  }

  async generateMusic(params: any) {
    return this.post('/api/v1/music/generate', {
      title: params.title || 'Custom Track',
      style: params.style || 'pop',
      voice: params.voice || 'female',
      instrumental: params.instrumental ?? false,
      lyrics: params.lyrics,
    })
  }

  async checkVideoStatus(taskIds: string[]) {
    return this.post('/api/v1/video/status', { task_ids: taskIds })
  }

  async checkImageStatus(taskIds: string[]) {
    return this.post('/api/v1/image/status', { task_ids: taskIds })
  }

  async getDownloadUrl(taskId: string) {
    return this.post('/api/v1/common/download-url', { task_id: taskId })
  }

  async getCredits() {
    return this.get('/api/v1/chat/credit')
  }

  async chatCompletion(messages: any[], model = 'gpt-5.2') {
    return this.post('/api/v1/chat/completion', { model, messages, stream: false })
  }

  private async post(path: string, body: any) {
    const res = await fetch(`${this.baseURL}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`KIE.AI error: ${await res.text()}`)
    return res.json()
  }

  private async get(path: string) {
    const res = await fetch(`${this.baseURL}${path}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    })
    if (!res.ok) throw new Error(`KIE.AI error: ${await res.text()}`)
    return res.json()
  }
}

export function getUserKIEKey(): string | null {
  return localStorage.getItem('qfm_kie_key')
}

export function setUserKIEKey(key: string) {
  localStorage.setItem('qfm_kie_key', key)
}

export function clearUserKIEKey() {
  localStorage.removeItem('qfm_kie_key')
}
