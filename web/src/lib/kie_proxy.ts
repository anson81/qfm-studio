import { apiClient } from './api'
import { toast } from 'sonner'

// Proxy through backend (KIE key stored server-side)
export class KIEClient {
  private apiKey: string = ''
  private baseURL = ''

  constructor(apiKey: string) {
    // apiKey is kept for interface compatibility but backend uses server-stored key
    this.apiKey = apiKey
  }

  async generateImage(params: any) {
    const res = await apiClient.generateImage(params)
    return res
  }

  async generateVideo(params: any) {
    const res = await apiClient.generateVideo(params)
    return res
  }

  async generateVoice(params: any) {
    // VO proxy if needed later
    throw new Error('Voice generation not yet available through backend')
  }

  async checkVideoStatus(taskIds: string[]) {
    const res = await apiClient.videoStatus(taskIds)
    return res
  }

  async checkImageStatus(taskIds: string[]) {
    const res = await apiClient.imageStatus(taskIds)
    return res
  }

  async getDownloadUrl(taskId: string) {
    // Not used via proxy - results come back with URL
    return { url: '' }
  }

  async getCredits() {
    const res = await apiClient.getCredits()
    return res
  }

  async chatCompletion(messages: any[], model = 'claude-sonnet-4-5') {
    const systemMsg = messages.find((m: any) => m.role === 'system')?.content || ''
    const userMsg = messages.filter((m: any) => m.role === 'user').map((m: any) => m.content).join('\n')
    const res = await apiClient.generateText({ system_prompt: systemMsg, user_message: userMsg, model })
    // Normalise to OpenAI-like response
    const raw = res.result
    if (raw?.choices?.[0]?.message?.content) {
      return { choices: [{ message: { content: raw.choices[0].message.content } }] }
    }
    if (raw?.text) {
      return { choices: [{ message: { content: raw.text } }] }
    }
    if (res.data?.choices?.[0]?.message?.content) {
      return { choices: [{ message: { content: res.data.choices[0].message.content } }] }
    }
    return { choices: [{ message: { content: JSON.stringify(raw) } }] }
  }
}

export function getUserKIEKey(): string {
  // Legacy compatibility - always return dummy since backend handles key
  return 'server'
}

export function setUserKIEKey(key: string) {
  // Handled through Settings page via apiClient.updateSettings
}

export function clearUserKIEKey() {
  localStorage.removeItem('qfm_kie_key')
}
