export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/,'') || ''

async function api(path: string, options: RequestInit = {}) {
  const url = `${API_BASE}${path}`
  const token = localStorage.getItem('qfm_token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...((options.headers as Record<string,string>) || {}),
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

export const apiClient = {
  register: (email: string, password: string, full_name?: string) =>
    api('/api/v1/auth/register', { method: 'POST', body: JSON.stringify({ email, password, full_name }) }),
  login: (email: string, password: string) =>
    api('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => api('/api/v1/auth/me'),
  getSettings: () => api('/api/v1/auth/settings'),
  updateSettings: (data: any) => api('/api/v1/auth/settings', { method: 'PUT', body: JSON.stringify(data) }),

  listContent: () => api('/api/v1/content/'),
  getContent: (id: number) => api(`/api/v1/content/${id}`),
  deleteContent: (id: number) => api(`/api/v1/content/${id}`, { method: 'DELETE' }),

  generateVideo: (data: any) => api('/api/v1/generate/video', { method: 'POST', body: JSON.stringify(data) }),
  generateImage: (data: any) => api('/api/v1/generate/image', { method: 'POST', body: JSON.stringify(data) }),
  generateText: (data: any) => api('/api/v1/generate/text', { method: 'POST', body: JSON.stringify(data) }),
  videoStatus: (taskIds: string[]) => api('/api/v1/generate/video/status', { method: 'POST', body: JSON.stringify({ task_ids: taskIds }) }),
  imageStatus: (taskIds: string[]) => api('/api/v1/generate/image/status', { method: 'POST', body: JSON.stringify({ task_ids: taskIds }) }),
  getCredits: () => api('/api/v1/generate/credits'),
}

export function getToken(): string | null { return localStorage.getItem('qfm_token') }
export function setToken(t: string) { localStorage.setItem('qfm_token', t) }
export function clearToken() { localStorage.removeItem('qfm_token'); localStorage.removeItem('qfm_user') }
