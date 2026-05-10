import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { apiClient, pollKietask, normalizeKietaskResponse } from '../lib/api'
import { toast } from 'sonner'
import { Video, Loader2, Download, Sparkles, Clock, Film, Layers, Combine, Info, RefreshCw } from 'lucide-react'

/* ─── Video Model Definitions ─── */
/* KIE API has two distinct video generation paths:
   1. /api/v1/jobs/createTask — NEW unified endpoint for Kling, Hailuo, Seedance, Sora2, Wan, Grok, etc.
      - Model string format: "kling-2.6/text-to-video", "hailuo/02-text-to-video-pro", etc.
      - Polling: /api/v1/jobs/recordInfo?taskId=xxx
      - Returns real MP4 video in resultUrls[]
   2. /api/v1/veo/generate + /api/v1/runway/generate — Legacy dedicated endpoints for Veo 3 and Runway.
   3. /api/v1/gpt4o-image/generate — IMAGE ONLY. Returns PNG. Do NOT use for video.
*/
const videoModels = [
  // ─── Real Video Models (via /jobs/createTask) ───
  { id: 'kling-2.6', name: 'Kling 2.6', desc: '🎬 Text→Video — affordable, with audio option', credits: '55-220', endpoint: 'kling', maxDuration: 10, qualityOptions: ['720p', '1080p'] },
  { id: 'kling-v2.1', name: 'Kling V2.1 Pro', desc: '🎬 Text→Video — proven quality, cheapest Kling', credits: '28-110', endpoint: 'kling', maxDuration: 10, qualityOptions: ['720p', '1080p'] },
  { id: 'kling-3.0', name: 'Kling 3.0', desc: '🎬 Latest — requires reference image', credits: '60-200', endpoint: 'kling', maxDuration: 10, qualityOptions: ['std', 'pro', '4K'] },
  { id: 'seedance-2.0', name: 'Seedance 2.0', desc: '🎬 Real video — Bytedance, high quality', credits: '40-150', endpoint: 'seedance', maxDuration: 10, qualityOptions: ['720p', '1080p'] },
  { id: 'hailuo-pro', name: 'Hailuo Pro', desc: '🎬 Real video — MiniMax, creative AI', credits: '30-100', endpoint: 'hailuo', maxDuration: 6, qualityOptions: ['720p', '1080p'] },
  { id: 'sora2', name: 'Sora 2', desc: '🎬 Real video — OpenAI Sora', credits: '80-250', endpoint: 'sora2', maxDuration: 10, qualityOptions: ['720p', '1080p'] },
  { id: 'wan-2.6', name: 'Wan 2.6', desc: '🎬 Real video — Alibaba, open-source', credits: '15-50', endpoint: 'wan', maxDuration: 6, qualityOptions: ['720p', '1080p'] },
  // ─── Legacy Dedicated Endpoints ───
  { id: 'veo3', name: 'Veo 3', desc: '🎬 Real video with audio — Google, best quality', credits: '60-380', endpoint: 'veo', maxDuration: 8, qualityOptions: ['720p Fast', '720p Quality', '1080p Quality', '4K Quality'] },
  { id: 'runway-gen3a', name: 'Runway Gen-3 Alpha', desc: '🎬 Real video — creative control, up to 10s', credits: '20-60', endpoint: 'runway', maxDuration: 10, qualityOptions: ['720p', '1080p'] },
  // ─── Image-Only Models (via gpt4o-image) ───
  { id: 'luma-dream', name: 'Luma Dream 📸', desc: '📸 Still frame only — NOT video', credits: '18-50', endpoint: 'gpt4o-image', maxDuration: 5, qualityOptions: ['720p', '1080p'] },
  { id: 'vidu', name: 'Vidu 📸', desc: '📸 Still frame only — NOT video', credits: '12-30', endpoint: 'gpt4o-image', maxDuration: 4, qualityOptions: ['720p'] },
  { id: 'minimax-video', name: 'MiniMax 📸', desc: '📸 Still frame only — NOT video', credits: '15-40', endpoint: 'gpt4o-image', maxDuration: 6, qualityOptions: ['720p'] },
  { id: 'qwen2vl', name: 'Qwen2-VL 📸', desc: '📸 Still frame only — NOT video', credits: '10-25', endpoint: 'gpt4o-image', maxDuration: 6, qualityOptions: ['720p'] },
]

const aspectRatios = [
  { value: '9:16', label: '9:16 Portrait (TikTok/IG Reels)' },
  { value: '16:9', label: '16:9 Landscape (YouTube)' },
  { value: '1:1', label: '1:1 Square' },
  { value: '4:3', label: '4:3 Standard' },
]

const JOBS_STORAGE_KEY = 'qfm_video_jobs'

/* ─── Check if a URL looks like a video (not an image) ─── */
function isVideoUrl(u: string): boolean {
  if (!u) return false
  try {
    const pathname = new URL(u).pathname.toLowerCase()
    // Strong video signals in path
    if (pathname.includes('/video') || pathname.includes('/vod') || pathname.includes('/media')) return true
    // Strong video signals in extension (before query string, already handled by pathname)
    if (pathname.endsWith('.mp4') || pathname.endsWith('.webm') || pathname.endsWith('.mov') || pathname.endsWith('.avi')) return true
    // Video-specific domains or subdomains
    if (u.includes('video') || u.includes('vod')) return true
  } catch {
    // Not a valid URL, fall back to string matching
    const lower = u.toLowerCase()
    if (lower.includes('/video') || lower.includes('/vod') || lower.includes('/media')) return true
    if (lower.includes('.mp4') || lower.includes('.webm') || lower.includes('.mov')) return true
  }
  return false
}

/* ─── Check if a URL looks like an image/thumbnail ─── */
function isImageUrl(u: string): boolean {
  if (!u) return false
  try {
    const pathname = new URL(u).pathname.toLowerCase()
    // Path-based heuristics: /images/ directory is always an image
    if (pathname.includes('/images/') || pathname.includes('/image/') || pathname.includes('/thumb')) return true
    // Image extensions in pathname
    if (pathname.endsWith('.png') || pathname.endsWith('.jpg') || pathname.endsWith('.jpeg') ||
        pathname.endsWith('.webp') || pathname.endsWith('.gif') || pathname.endsWith('.bmp') || pathname.endsWith('.svg')) return true
  } catch {
    const lower = u.toLowerCase()
    if (lower.includes('/images/') || lower.includes('/image/') || lower.includes('/thumb')) return true
    if (lower.includes('.png') || lower.includes('.jpg') || lower.includes('.jpeg') ||
        lower.includes('.webp') || lower.includes('.gif') || lower.includes('.bmp') || lower.includes('.svg')) return true
  }
  // Also check for known image field name patterns
  if (u.includes('thumbnail') || u.includes('thumb') || u.includes('preview') || u.includes('cover') || u.includes('poster')) return true
  return false
}

/** Get the response data from a KIE task — handles both Veo/Runway format (data.response)
 *  and Jobs API format (data.resultJson as JSON string) */
function getKieResponse(data: any): any {
  // Veo/Runway format: data.response is the direct object
  if (data.response) return data.response
  // Jobs API format: data.resultJson is a JSON string like { "resultUrls": [...] }
  if (data.resultJson) {
    if (typeof data.resultJson === 'string') {
      try { return JSON.parse(data.resultJson) } catch { return null }
    }
    return data.resultJson
  }
  return null
}

/* ─── Extract the actual VIDEO url from KIE response ─── */
function extractVideoUrl(response: any): string {
  if (!response) return ''

  // Collect ALL URLs from ALL possible response fields
  const allUrls: string[] = []
  if (Array.isArray(response.resultUrls) && response.resultUrls.length > 0) {
    allUrls.push(...response.resultUrls.filter((u: string) => u && typeof u === 'string'))
  }
  // Some models use singular fields
  if (response.resultUrl && typeof response.resultUrl === 'string') allUrls.push(response.resultUrl)
  if (response.videoUrl && typeof response.videoUrl === 'string') allUrls.push(response.videoUrl)
  if (response.originUrl && typeof response.originUrl === 'string') allUrls.push(response.originUrl)

  if (allUrls.length === 0) return ''

  // Priority 1: Strong video signals — URLs that look like video
  const videoUrls = allUrls.filter(u => isVideoUrl(u))
  if (videoUrls.length > 0) return videoUrls[0]

  // Priority 2: URLs that are NOT images (could be video even without .mp4)
  const nonImageUrls = allUrls.filter(u => !isImageUrl(u))
  if (nonImageUrls.length > 0) return nonImageUrls[0]

  // Priority 3: Last URL in resultUrls (video often comes after thumbnail in array)
  if (Array.isArray(response.resultUrls) && response.resultUrls.length > 0) {
    return response.resultUrls[response.resultUrls.length - 1]
  }

  // Priority 4: Any remaining URL
  return allUrls[0]
}

/* ─── Extract a thumbnail/preview image from KIE response ─── */
function extractThumbnailUrl(response: any): string {
  if (!response) return ''
  // Thumbnail is typically the image URL in resultUrls
  if (Array.isArray(response.resultUrls) && response.resultUrls.length > 0) {
    const imageUrls = response.resultUrls.filter((u: string) => isImageUrl(u))
    if (imageUrls.length > 0) return imageUrls[0]
  }
  // Known thumbnail fields
  if (response.resultImageUrl) return response.resultImageUrl
  if (response.originImageUrl) return response.originImageUrl
  if (response.thumbnailUrl) return response.thumbnailUrl
  return ''
}

/* ─── Format a URL for downloading with proper filename ─── */
function videoDownloadUrl(url: string, filename?: string): string {
  if (!url) return ''
  // If the URL already ends with a media extension, use as-is
  if (url.match(/\.(mp4|webm|mov|avi)(\?|$)/i)) return url
  // Otherwise append a download-friendly filename param to hint the browser
  const name = filename || 'video.mp4'
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}response-content-disposition=attachment%3Bfilename%3D${encodeURIComponent(name)}`
}

/* ─── Types ─── */
interface VideoSegment {
  id: string
  partIndex: number
  totalParts: number
  prompt: string
  taskId: string
  status: 'pending' | 'processing' | 'generating' | 'completed' | 'failed'
  progress: string
  resultUrl: string
  thumbnailUrl: string
  endpoint: string
  recordInfoPath?: string  // Store the polling path so we don't need to reconstruct it
  duration?: string  // Video duration in seconds ('5' or '10') for Kling/Wan/etc.
}

interface VideoJob {
  id: string
  prompt: string
  model: string
  modelDesc: string
  aspectRatio: string
  quality: string
  desiredDuration: number
  maxDuration: number
  segments: VideoSegment[]
  combinedUrl: string
  combining: boolean
  createdAt: number
}

/** Derive the KIE polling endpoint from model endpoint type + taskId */
function getRecordInfoPath(endpoint: string, taskId: string): string {
  // Jobs API (unified): Kling, Hailuo, Seedance, Sora2, Wan, Grok
  const jobsEndpoints = ['kling', 'seedance', 'hailuo', 'sora2', 'wan', 'grok']
  if (jobsEndpoints.includes(endpoint)) {
    return `/api/v1/jobs/recordInfo?taskId=${taskId}`
  }
  if (endpoint === 'veo') return `/api/v1/veo/record-info?taskId=${taskId}`
  if (endpoint === 'runway') return `/api/v1/runway/record-detail?taskId=${taskId}`
  // gpt4o-image fallback
  return `/api/v1/gpt4o-image/record-info?taskId=${taskId}`
}

/** Poll a single segment's taskId until completion */
async function resumeSegmentPoll(
  seg: VideoSegment,
  jobId: string,
  onUpdate: (jobId: string, segId: string, updates: Partial<VideoSegment>) => void,
  meta?: { prompt?: string; model?: string; aspectRatio?: string },
) {
  if (!seg.taskId || seg.status === 'completed' || seg.status === 'failed') return

  const recordInfoPath = seg.recordInfoPath || getRecordInfoPath(seg.endpoint, seg.taskId)

  // Helper: try to extract video+thumbnail from a KIE record-info response
  async function extractFromRecInfo(recInfo: any): Promise<{ videoUrl: string; thumbnailUrl: string }> {
    let videoUrl = extractVideoUrl(getKieResponse(recInfo?.data)) || ''
    let thumbnailUrl = extractThumbnailUrl(getKieResponse(recInfo?.data)) || ''
    if (isImageUrl(videoUrl)) { console.warn('[ResumePoll] videoUrl is image, rejecting'); videoUrl = '' }

    // Veo 1080p fallback
    if (!videoUrl && seg.endpoint === 'veo' && seg.taskId) {
      try {
        const veo1080: any = await (await fetch(`https://api.kie.ai/api/v1/veo/get-1080p-video?taskId=${seg.taskId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('qfm_kie_key')}`, 'Content-Type': 'application/json' },
        })).json()
        const veoVideoUrl = extractVideoUrl(veo1080?.data) || veo1080?.data?.videoUrl || veo1080?.data?.resultUrl || veo1080?.data?.downloadUrl
        if (veoVideoUrl && !isImageUrl(veoVideoUrl)) videoUrl = veoVideoUrl
      } catch {}
    }

    // Refresh URLs
    if (videoUrl) { try { const f = await getFreshUrl(videoUrl); if (f && !isImageUrl(f)) videoUrl = f } catch {} }
    if (thumbnailUrl) { try { const f = await getFreshUrl(thumbnailUrl); if (f) thumbnailUrl = f } catch {} }
    return { videoUrl, thumbnailUrl }
  }

  try {
    onUpdate(jobId, seg.id, { status: 'generating', progress: 'resuming...' })

    // STEP 1: Quick status check — single API call to see if task is already done
    const quickCheck: any = await (await fetch(`https://api.kie.ai${recordInfoPath}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('qfm_kie_key')}`, 'Content-Type': 'application/json' },
    })).json()

    console.log('[ResumePoll] Quick check response:', JSON.stringify(quickCheck?.data)?.slice(0, 300))

    const quickNorm = normalizeKietaskResponse(quickCheck?.data)
    if (quickNorm.done && !quickNorm.failed) {
      // Task already completed — extract URL immediately, no polling needed
      const { videoUrl, thumbnailUrl } = await extractFromRecInfo(quickCheck)
      console.log('[ResumePoll] Task already done! videoUrl:', videoUrl?.slice(0, 100) || 'EMPTY')
      onUpdate(jobId, seg.id, {
        status: videoUrl ? 'completed' : 'failed',
        resultUrl: videoUrl,
        thumbnailUrl,
        progress: videoUrl ? 'done' : 'no video URL found',
      })
      // Save to backend library on resume completion
      if (videoUrl && meta) {
        apiClient.saveToLibrary({
          type: 'video',
          prompt: meta.prompt || 'Video',
          model: meta.model || seg.endpoint,
          aspectRatio: meta.aspectRatio,
          result_url: videoUrl,
          thumbnail_url: thumbnailUrl || undefined,
          status: 'completed',
        })
      }
      return
    }

    // STEP 2: Task still processing — show progress and start polling
    const currentProgress = quickNorm.progress || (quickCheck?.data?.progress ? `${Math.round(parseFloat(quickCheck.data.progress) * 100)}%` : 'processing...')
    onUpdate(jobId, seg.id, { status: 'generating', progress: currentProgress })

    const result = await pollKietask<{ videoUrls: string[] }>(
      recordInfoPath,
      (data) => {
        const videoUrl = extractVideoUrl(getKieResponse(data))
        return { videoUrls: videoUrl ? [videoUrl] : [] }
      },
      (attempt, data) => {
        const progress = data.progress ? `${Math.round(parseFloat(data.progress) * 100)}%` : `${attempt * 3}s`
        onUpdate(jobId, seg.id, { status: 'generating', progress })
      }
    )

    let videoUrl = result.videoUrls?.[0] || ''
    let thumbnailUrl = ''

    // Re-fetch for thumbnail + re-extract if needed
    try {
      const recordInfo: any = await (await fetch(`https://api.kie.ai${recordInfoPath}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('qfm_kie_key')}`, 'Content-Type': 'application/json' },
      })).json()
      console.log('[ResumePoll] Final KIE response:', JSON.stringify(recordInfo?.data?.response)?.slice(0, 500))
      thumbnailUrl = extractThumbnailUrl(recordInfo?.data?.response) || ''

      if (isImageUrl(videoUrl) || !videoUrl) {
        console.warn('[ResumePoll] videoUrl is image or empty after poll:', videoUrl?.slice(0, 100))
        const reExtracted = extractVideoUrl(recordInfo?.data?.response)
        if (reExtracted && !isImageUrl(reExtracted)) {
          console.log('[ResumePoll] Re-extracted video URL:', reExtracted?.slice(0, 100))
          videoUrl = reExtracted
        }
        // Veo fallback
        if (seg.endpoint === 'veo' && seg.taskId) {
          try {
            const veo1080: any = await (await fetch(`https://api.kie.ai/api/v1/veo/get-1080p-video?taskId=${seg.taskId}`, {
              headers: { Authorization: `Bearer ${localStorage.getItem('qfm_kie_key')}`, 'Content-Type': 'application/json' },
            })).json()
            const veoVideoUrl = extractVideoUrl(veo1080?.data) || veo1080?.data?.videoUrl || veo1080?.data?.resultUrl || veo1080?.data?.downloadUrl
            if (veoVideoUrl && !isImageUrl(veoVideoUrl)) videoUrl = veoVideoUrl
          } catch {}
        }
      }
    } catch { /* thumbnail re-extraction is best-effort */ }

    // Refresh URLs
    if (videoUrl) { try { const freshUrl = await getFreshUrl(videoUrl); if (freshUrl && !isImageUrl(freshUrl)) videoUrl = freshUrl } catch {} }
    if (thumbnailUrl) { try { const freshThumb = await getFreshUrl(thumbnailUrl); if (freshThumb) thumbnailUrl = freshThumb } catch {} }

    // Final validation
    if (isImageUrl(videoUrl)) {
      console.error('[ResumePoll] Final videoUrl is an image URL, marking as failed:', videoUrl?.slice(0, 100))
      videoUrl = ''
    }

    onUpdate(jobId, seg.id, {
      status: videoUrl ? 'completed' : 'failed',
      resultUrl: videoUrl,
      thumbnailUrl,
    })

    // Save to backend library on poll completion
    if (videoUrl && meta) {
      apiClient.saveToLibrary({
        type: 'video',
        prompt: meta.prompt || 'Video',
        model: meta.model || seg.endpoint,
        aspectRatio: meta.aspectRatio,
        result_url: videoUrl,
        thumbnail_url: thumbnailUrl || undefined,
        status: 'completed',
      })
    }
  } catch (err: any) {
    // POLLING FAILED — but don't mark as failed! The task might still be processing on KIE's side.
    // Keep status as 'generating' so user can try "Recheck Status" later.
    console.warn('[ResumePoll] Poll error (keeping generating status):', err?.message)
    onUpdate(jobId, seg.id, {
      status: 'generating',
      progress: `poll error: ${err.message || 'unknown'}. Try Recheck.`,
    })
  }
}

/** Get a fresh download URL from KIE (tempfile URLs expire after ~20 min) */
async function getFreshUrl(originalUrl: string): Promise<string> {
  if (!originalUrl) return ''
  try {
    const result = await apiClient.getDownloadUrl(originalUrl)
    return result?.data?.downloadUrl || result?.data || originalUrl
  } catch {
    // If download-url fails, use the original URL directly
    return originalUrl
  }
}

const MAX_VIDEO_PROMPT_LEN = 500 // KIE models work best with short visual prompts

/** Extract the visual/action description from a storyboard scene chunk, stripping non-visual details */
function extractVisualPrompt(chunk: string): string {
  // Remove markdown bold markers
  let s = chunk.replace(/\*\*/g, '').replace(/__+/g, '')
  // Remove lines that are clearly non-visual (dialogue/voiceover, music, budget, difficulty, etc.)
  const skipPatterns = [
    /^(?:voiceover|dialogue|vo|music|sound|sfx|budget|difficulty|production|camera|shot type|lighting setup|editing|post-production|notes?|tip|cultural|target|platform|aspect|duration|total)/i,
    /^(?:narrator|speaker|host|actor|talent)/i,
  ]
  const lines = s.split('\n')
  const visualLines: string[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (skipPatterns.some(p => p.test(trimmed))) continue
    // Keep lines that describe what we SEE — visual actions, scene descriptions, on-screen text
    visualLines.push(trimmed)
  }
  s = visualLines.join('. ')
  // Clean up multiple dots/spaces
  s = s.replace(/\.\.\./g, '.').replace(/\.\s*\./g, '.').replace(/\s+/g, ' ').trim()
  return s
}

/** Convert a storyboard/scenario text into concise video prompts (one per part) */
function storyboardToVideoPrompts(text: string, parts: number): string[] {
  const MAX = MAX_VIDEO_PROMPT_LEN

  // Try JSON parse (storyboard generator outputs JSON arrays)
  try {
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const parsed = JSON.parse(cleaned)
    const scenes = Array.isArray(parsed) ? parsed : [parsed]
    if (scenes.length > 0) {
      return scenes.slice(0, parts).map((s: any) => {
        const parts_arr: string[] = []
        if (s.visual) parts_arr.push(s.visual)
        if (s.action) parts_arr.push(s.action)
        if (s.description) parts_arr.push(s.description)
        if (s.on_screen_text || s.text) parts_arr.push(`Text: "${s.on_screen_text || s.text}"`)
        if (parts_arr.length === 0) parts_arr.push(JSON.stringify(s))
        return parts_arr.join('. ').slice(0, MAX)
      })
    }
  } catch { /* not JSON */ }

  // Try to split by scene markers (## Scene 1, ### Scene 2, 1., Scene 1:, etc.)
  // Split text into sections by scene headers
  const sceneSplitRegex = /^(?:#{1,3}\s*(?:Scene|S|Part|Shot|Chapter)\s*\d+|Scene\s+\d+\s*[:.—-]?(?:\s|$)|(?:\d+)\.\s+)/gim
  const sections = text.split(sceneSplitRegex).filter(s => s.trim().length > 5)

  if (sections.length >= 2) {
    // We found scene-based sections — extract visual descriptions from each
    const visualSections = sections.map(s => extractVisualPrompt(s).slice(0, MAX))
    // Distribute sections across parts
    if (visualSections.length <= parts) {
      // Fewer scenes than parts — duplicate last scene or fill with truncated version
      return Array.from({ length: parts }, (_, i) => {
        const idx = Math.min(i, visualSections.length - 1)
        return visualSections[idx] || text.trim().slice(0, MAX)
      })
    }
    // More scenes than parts — group scenes into parts
    const perPart = Math.ceil(visualSections.length / parts)
    return Array.from({ length: parts }, (_, i) => {
      const chunk = visualSections.slice(i * perPart, (i + 1) * perPart).join('. ')
      return chunk.slice(0, MAX)
    })
  }

  // Fallback: extract key visual sentences from paragraphs, then split into parts
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 10)
  // Extract visual-only content from each paragraph
  const visualParas = paragraphs.map(p => extractVisualPrompt(p)).filter(p => p.length > 10)

  if (visualParas.length === 0) {
    // Nothing extractable — just truncate the whole text
    return Array.from({ length: parts }, () => text.trim().slice(0, MAX))
  }

  // Group visual paragraphs into `parts` chunks, each under MAX chars
  const prompts: string[] = []
  let current = ''
  for (const vp of visualParas) {
    if ((current + '. ' + vp).length > MAX && current.length > 0) {
      prompts.push(current.slice(0, MAX))
      current = vp
    } else {
      current = current ? current + '. ' + vp : vp
    }
  }
  if (current) prompts.push(current.slice(0, MAX))

  // Ensure we have exactly `parts` prompts
  while (prompts.length < parts) {
    prompts.push(prompts[prompts.length - 1] || text.trim().slice(0, MAX))
  }
  return prompts.slice(0, parts)
}

export default function VideoGenerator() {
  const location = useLocation()
  const rawStoryboardPrompt = (location.state as any)?.storyboardPrompt || ''
  // If arriving from storyboard, convert JSON to readable text for the prompt textarea
  let storyboardPrompt = rawStoryboardPrompt
  try {
    const parsed = JSON.parse(rawStoryboardPrompt.trim().replace(/```json\s*/g, '').replace(/```\s*/g, '').trim())
    const scenes = Array.isArray(parsed) ? parsed : [parsed]
    storyboardPrompt = scenes.map((s: any, i: number) => {
      const num = s.scene || s.scene_number || i + 1
      const stage = s.stage || s.title || ''
      const visual = s.visual || s.description || ''
      const onscreen = s.on_screen_text || s.text ? ` [Text: "${s.on_screen_text || s.text}"]` : ''
      return `Scene ${num}: ${stage} — ${visual}${onscreen}`
    }).join('\n\n')
  } catch { /* not JSON, use as-is */ }
  const [prompt, setPrompt] = useState(storyboardPrompt)
  const [model, setModel] = useState('kling-2.6')
  const [aspectRatio, setAspectRatio] = useState('9:16')
  const [quality, setQuality] = useState('720p Fast')
  const [desiredDuration, setDesiredDuration] = useState(8)
  const [generating, setGenerating] = useState(false)
const [refreshing, setRefreshing] = useState<string | null>(null) // jobId being refreshed
  const [rechecking, setRechecking] = useState(false)
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t) }, [])
  const [jobs, setJobs] = useState<VideoJob[]>(() => {
    try {
      const saved = localStorage.getItem(JOBS_STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })

  const pollingRef = useRef<Set<string>>(new Set())

  const selectedModel = useMemo(() => videoModels.find(m => m.id === model)!, [model])

  const segmentCount = useMemo(() => Math.ceil(desiredDuration / selectedModel.maxDuration), [desiredDuration, selectedModel.maxDuration])
  const perSegmentDuration = useMemo(() => Math.min(desiredDuration / segmentCount, selectedModel.maxDuration), [desiredDuration, segmentCount, selectedModel.maxDuration])
  const totalCredits = useMemo(() => {
    const creditRange = selectedModel.credits.split('-').map(Number)
    const avgCredit = (creditRange[0] + creditRange[1]) / 2
    return Math.round(avgCredit * segmentCount)
  }, [selectedModel, segmentCount])

  // Persist jobs to localStorage
  useEffect(() => {
    const toSave = jobs.map(j => ({ ...j, combining: false }))
    localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(toSave))
  }, [jobs])

  // Resume polling in-progress segments on mount
  useEffect(() => {
    const hasInProgress = jobs.some(j => j.segments.some(s => s.taskId && (s.status === 'generating' || s.status === 'processing' || s.status === 'pending')))
    if (!hasInProgress) return

    const updateSeg = (jobId: string, segId: string, updates: Partial<VideoSegment>) => {
      setJobs(prev => prev.map(j => j.id === jobId ? {
        ...j,
        segments: j.segments.map(s => s.id === segId ? { ...s, ...updates } : s),
      } : j))
    }

    for (const job of jobs) {
      for (const seg of job.segments) {
        if (!seg.taskId || seg.status === 'completed' || seg.status === 'failed') continue
        const pollKey = `${job.id}:${seg.id}`
        if (pollingRef.current.has(pollKey)) continue
        pollingRef.current.add(pollKey)
        resumeSegmentPoll(seg, job.id, updateSeg, { prompt: job.prompt, model: job.model, aspectRatio: job.aspectRatio }).finally(() => {
          pollingRef.current.delete(pollKey)
        })
      }
    }
  }, []) // Only on mount

  // Update generating state
  useEffect(() => {
    const anyInProgress = jobs.some(j => j.segments.some(s => s.status === 'generating' || s.status === 'processing' || s.status === 'pending'))
    if (!anyInProgress && generating) {
      setGenerating(false)
    }
  }, [jobs])

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) { toast.error('Enter a prompt'); return }
    if (!apiClient.hasKIEKey()) { toast.error('Add your KIE.API key in Settings first'); return }

    // Warn if prompt is very long (KIE models typically support ~1000 chars max)
    const MAX_PROMPT_LEN = 800
    const trimmedPrompt = prompt.trim()
    if (trimmedPrompt.length > MAX_PROMPT_LEN) {
      toast.warning(`Prompt is ${trimmedPrompt.length} chars — auto-condensing storyboard into scene prompts`, { duration: 5000 })
    }

    setGenerating(true)

    const parts = segmentCount
    const modelInfo = selectedModel
    const jobSegments: VideoSegment[] = []

    // Convert storyboard-style text into concise video prompts per part
    const partPrompts = storyboardToVideoPrompts(trimmedPrompt, parts)
    console.log('[VideoGen] Storyboard conversion:', { originalLen: trimmedPrompt.length, parts, partPrompts: partPrompts.map(p => `${p.length}chars: ${p.slice(0, 80)}...`) })

    for (let i = 0; i < parts; i++) {
      const partPrompt = partPrompts[i] || trimmedPrompt.slice(0, MAX_PROMPT_LEN)
      jobSegments.push({
        id: `seg-${Date.now()}-${i}`,
        partIndex: i,
        totalParts: parts,
        prompt: partPrompt,
        taskId: '',
        status: 'pending',
        progress: '',
        resultUrl: '',
        thumbnailUrl: '',
        endpoint: modelInfo.endpoint,
      })
    }

    const job: VideoJob = {
      id: `job-${Date.now()}`,
      prompt,
      model: modelInfo.id,
      modelDesc: modelInfo.name,
      aspectRatio,
      quality,
      desiredDuration,
      maxDuration: modelInfo.maxDuration,
      segments: jobSegments,
      combinedUrl: '',
      combining: false,
      createdAt: Date.now(),
    }
    setJobs(prev => [job, ...prev])

    let firstError: string | null = null
    for (let i = 0; i < parts; i++) {
      // Stop generating remaining parts if the first part failed (saves credits)
      if (firstError && i > 0) {
        setJobs(prev => prev.map(j => j.id === job.id ? {
          ...j,
          segments: j.segments.map((s, idx) => idx >= i ? { ...s, status: 'failed' as const, progress: 'Cancelled — earlier part failed' } : s),
        } : j))
        toast.error(`Stopped after part ${i}: ${firstError}`)
        break
      }
      const seg = jobSegments[i]
      try {
        setJobs(prev => prev.map(j => j.id === job.id ? {
          ...j,
          segments: j.segments.map((s, idx) => idx === i ? { ...s, status: 'processing' as const } : s),
        } : j))

        const res = await apiClient.generateVideo({
          prompt: seg.prompt,
          model: modelInfo.id,
          aspectRatio,
          resolution: quality.includes('1080p') ? '1080p' : quality.includes('4K') ? '4K' : '720p',
          endpoint: modelInfo.endpoint,
          duration: seg.duration || '5',   // for Kling/Wan/etc.
          sound: false,                      // Kling audio (default off)
          mode: modelInfo.id === 'kling-3.0' ? quality : undefined,  // Kling 3.0: std/pro/4K
        })

        const taskId = res.taskId
        const recordInfoPath = res.recordInfoPath

        setJobs(prev => prev.map(j => j.id === job.id ? {
          ...j,
          segments: j.segments.map((s, idx) => idx === i ? { ...s, taskId, recordInfoPath, status: 'generating' as const } : s),
        } : j))

        const result = await pollKietask<{ videoUrls: string[] }>(
          recordInfoPath,
          (data) => {
            const videoUrl = extractVideoUrl(getKieResponse(data))
            return { videoUrls: videoUrl ? [videoUrl] : [] }
          },
          (attempt, data) => {
            const progress = data.progress ? `${Math.round(parseFloat(data.progress) * 100)}%` : `${attempt * 3}s`
            setJobs(prev => prev.map(j => j.id === job.id ? {
              ...j,
              segments: j.segments.map((s, idx) => idx === i ? { ...s, status: 'generating' as const, progress } : s),
            } : j))
          }
        )

        let videoUrl = result.videoUrls?.[0] || ''

        // Debug: log the raw response to understand KIE format
        try {
          const rawInfo: any = await (await fetch(`https://api.kie.ai${recordInfoPath}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('qfm_kie_key')}`, 'Content-Type': 'application/json' },
          })).json()
          console.log('[VideoGen] Raw KIE response for', recordInfoPath, ':', JSON.stringify(rawInfo?.data?.response)?.slice(0, 500))

          // Extract thumbnail from the same record-info (best-effort)
          const thumbnailFromInfo = extractThumbnailUrl(getKieResponse(rawInfo?.data)) || ''

          // If extractVideoUrl returned an image URL, try extracting again with full response
          if (isImageUrl(videoUrl) || !videoUrl) {
            console.warn('[VideoGen] extractVideoUrl returned an image URL or empty:', videoUrl?.slice(0, 100))
            const reExtracted = extractVideoUrl(getKieResponse(rawInfo?.data))
            if (reExtracted && !isImageUrl(reExtracted)) {
              console.log('[VideoGen] Re-extracted video URL:', reExtracted?.slice(0, 100))
              videoUrl = reExtracted
            }
            // For Veo: try the 1080p endpoint as fallback to get the actual video URL
            if (modelInfo.endpoint === 'veo' && taskId) {
              console.log('[VideoGen] Trying Veo 1080p fallback for actual video...')
              try {
                const veo1080: any = await (await fetch(`https://api.kie.ai/api/v1/veo/get-1080p-video?taskId=${taskId}`, {
                  headers: { Authorization: `Bearer ${localStorage.getItem('qfm_kie_key')}`, 'Content-Type': 'application/json' },
                })).json()
                console.log('[VideoGen] Veo 1080p response:', JSON.stringify(veo1080?.data)?.slice(0, 500))
                const veoVideoUrl = extractVideoUrl(veo1080?.data) || veo1080?.data?.videoUrl || veo1080?.data?.resultUrl || veo1080?.data?.downloadUrl
                if (veoVideoUrl && !isImageUrl(veoVideoUrl)) {
                  console.log('[VideoGen] Got video from Veo 1080p:', veoVideoUrl?.slice(0, 100))
                  videoUrl = veoVideoUrl
                }
              } catch (veoErr: any) {
                console.warn('[VideoGen] Veo 1080p fallback failed:', veoErr?.message)
              }
            }
          }

          // Use thumbnail from the full response
          if (thumbnailFromInfo) {
            // Will be set below
          }
        } catch (debugErr: any) {
          console.warn('[VideoGen] Debug logging failed:', debugErr?.message)
        }

        // Extract thumbnail (separate try for robustness)
        let thumbnailUrl = ''
        try {
          const recInfo: any = await (await fetch(`https://api.kie.ai${recordInfoPath}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('qfm_kie_key')}`, 'Content-Type': 'application/json' },
          })).json()
          thumbnailUrl = extractThumbnailUrl(getKieResponse(recInfo?.data)) || ''
        } catch { /* best-effort */ }

        // Refresh expired URLs (important: tempfile URLs expire after ~20 min)
        let freshVideoUrl = videoUrl
        if (videoUrl) {
          try { const f = await getFreshUrl(videoUrl); if (f && !isImageUrl(f)) freshVideoUrl = f } catch {}
        }
        if (thumbnailUrl) {
          try { const f = await getFreshUrl(thumbnailUrl); if (f) thumbnailUrl = f } catch {}
        }

        // Final validation: if videoUrl is still an image URL, mark as failed
        if (isImageUrl(freshVideoUrl)) {
          console.error('[VideoGen] Final videoUrl is still an image URL:', freshVideoUrl?.slice(0, 100))
          freshVideoUrl = ''
        }

        setJobs(prev => prev.map(j => j.id === job.id ? {
          ...j,
          segments: j.segments.map((s, idx) => idx === i ? {
            ...s,
            status: freshVideoUrl ? 'completed' as const : 'failed' as const,
            resultUrl: freshVideoUrl || videoUrl,
            thumbnailUrl,
            progress: freshVideoUrl ? 'done' : 'no video URL',
          } : s),
        } : j))

        // Save each completed segment to backend immediately (not just at end)
        if (freshVideoUrl) {
          apiClient.saveToLibrary({
            type: 'video',
            prompt: parts === 1 ? prompt : `${prompt} (part ${i + 1}/${parts})`,
            model: modelInfo.id,
            aspectRatio,
            result_url: freshVideoUrl,
            thumbnail_url: thumbnailUrl || undefined,
            status: 'completed',
          })
        } else {
          apiClient.saveToLibrary({
            type: 'video',
            prompt: parts === 1 ? prompt : `${prompt} (part ${i + 1}/${parts})`,
            model: modelInfo.id,
            aspectRatio,
            status: 'failed',
          })
        }
      } catch (err: any) {
        firstError = err.message || 'Unknown error'
        setJobs(prev => prev.map(j => j.id === job.id ? {
          ...j,
          segments: j.segments.map((s, idx) => idx === i ? { ...s, status: 'failed' as const, progress: err.message || 'failed' } : s),
        } : j))
        toast.error(`Part ${i + 1} failed: ${err.message}`)
      }
    }

    // No final library save needed — each segment is saved individually as it completes

    const completedCount = jobSegments.filter(s => s.status === 'completed').length
    if (completedCount === parts) {
      toast.success(parts === 1 ? 'Video generated! 🎬' : `All ${parts} parts generated! 🎬`)
    } else if (completedCount > 0) {
      toast.warning(`${completedCount}/${parts} parts completed`)
    } else {
      toast.error('All parts failed')
    }
    setGenerating(false)
  }, [prompt, selectedModel, aspectRatio, quality, desiredDuration, segmentCount, perSegmentDuration])

  /* ─── Refresh expired video URLs ─── */
  const handleRefreshUrls = useCallback(async (jobId: string) => {
    const job = jobs.find(j => j.id === jobId)
    if (!job) return
    setRefreshing(jobId)
    try {
      const updatedSegs = await Promise.all(job.segments.map(async (seg) => {
        if (seg.resultUrl && seg.status === 'completed') {
          let freshUrl = await getFreshUrl(seg.resultUrl)
          // Validate: if fresh URL is an image, try Veo 1080p fallback
          if (isImageUrl(freshUrl) && seg.endpoint === 'veo' && seg.taskId) {
            try {
              const veo1080: any = await (await fetch(`https://api.kie.ai/api/v1/veo/get-1080p-video?taskId=${seg.taskId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('qfm_kie_key')}`, 'Content-Type': 'application/json' },
              })).json()
              const veoVideoUrl = extractVideoUrl(veo1080?.data) || veo1080?.data?.videoUrl || veo1080?.data?.resultUrl || veo1080?.data?.downloadUrl
              if (veoVideoUrl && !isImageUrl(veoVideoUrl)) {
                freshUrl = veoVideoUrl
              }
            } catch {}
          }
          // If still an image URL, mark as empty so video shows error instead of broken play
          if (isImageUrl(freshUrl)) freshUrl = ''
          let freshThumb = seg.thumbnailUrl
          if (freshThumb) { try { freshThumb = await getFreshUrl(freshThumb) } catch {} }
          return { ...seg, resultUrl: freshUrl || seg.resultUrl, thumbnailUrl: freshThumb || seg.thumbnailUrl }
        }
        return seg
      }))
      // Also refresh combinedUrl if present
      let freshCombined = job.combinedUrl
      if (freshCombined) { try { freshCombined = await getFreshUrl(freshCombined) } catch {} }
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, segments: updatedSegs, combinedUrl: freshCombined || job.combinedUrl } : j))
      toast.success('URLs refreshed!')
    } catch {
      toast.error('Failed to refresh URLs')
    } finally {
      setRefreshing(null)
    }
  }, [jobs])

  /* ─── Combine segments via backend ─── */
  const handleCombine = useCallback(async (jobId: string) => {
    const job = jobs.find(j => j.id === jobId)
    if (!job) return

    // Refresh URLs first (they may have expired)
    const completedSegs = job.segments.filter(s => s.status === 'completed' && s.resultUrl)
    if (completedSegs.length < 2) { toast.error('Need at least 2 completed parts to combine'); return }
    if (!localStorage.getItem('qfm_token')) { toast.error('Login required to combine videos'); return }

    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, combining: true } : j))
    try {
      // Get fresh URLs for combine (tempfile URLs expire after ~20 min)
      const freshUrls = await Promise.all(completedSegs.map(s => getFreshUrl(s.resultUrl)))
      const token = localStorage.getItem('qfm_token')
      const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') || ''
      const res = await fetch(`${apiBase}/api/v1/video/concat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ video_urls: freshUrls }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
        throw new Error(err.detail || err.message || `HTTP ${res.status}`)
      }
      const data = await res.json()
      let combinedUrl = data.url || data.download_url || ''
      if (combinedUrl && !combinedUrl.startsWith('http')) {
        combinedUrl = `${apiBase}${combinedUrl}`
      }
      if (!combinedUrl) throw new Error('No combined video URL returned')
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, combinedUrl, combining: false } : j))
      toast.success('Videos combined! 🎞️')
    } catch (err: any) {
      toast.error(err.message || 'Combine failed')
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, combining: false } : j))
    }
  }, [jobs])

  const clearJobs = useCallback(() => {
    setJobs([])
    localStorage.removeItem(JOBS_STORAGE_KEY)
    toast.success('History cleared')
  }, [])

  /** Recheck all in-progress segments by querying KIE API directly (single call, no polling) */
  const handleRecheckAll = useCallback(async () => {
    const inProgress = jobs.flatMap(j => j.segments.filter(s => s.taskId && (s.status === 'generating' || s.status === 'processing' || s.status === 'pending')))
    if (inProgress.length === 0) { toast.info('No pending generations to check'); return }
    setRechecking(true)

    const updateSeg = (jobId: string, segId: string, updates: Partial<VideoSegment>) => {
      setJobs(prev => prev.map(j => j.id === jobId ? {
        ...j,
        segments: j.segments.map(s => s.id === segId ? { ...s, ...updates } : s),
      } : j))
    }

    let checked = 0, recovered = 0, stillProcessing = 0
    for (const seg of inProgress) {
      const job = jobs.find(j => j.segments.some(s => s.id === seg.id))
      if (!job) continue
      const recordInfoPath = seg.recordInfoPath || getRecordInfoPath(seg.endpoint, seg.taskId)

      try {
        // Single API call — no polling loop
        const recInfo: any = await (await fetch(`https://api.kie.ai${recordInfoPath}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('qfm_kie_key')}`, 'Content-Type': 'application/json' },
        })).json()

        const recNorm = normalizeKietaskResponse(recInfo?.data)
        if (recNorm.done && !recNorm.failed) {
          // Task completed — extract video URL
          let videoUrl = extractVideoUrl(getKieResponse(recInfo.data)) || ''
          let thumbnailUrl = extractThumbnailUrl(getKieResponse(recInfo.data)) || ''

          // Validate: reject image URLs
          if (isImageUrl(videoUrl)) {
            console.warn('[Recheck] Got image URL instead of video, trying alternatives')
            videoUrl = ''
          }

          // Veo fallback: try 1080p endpoint
          if (!videoUrl && seg.endpoint === 'veo' && seg.taskId) {
            try {
              const veo1080: any = await (await fetch(`https://api.kie.ai/api/v1/veo/get-1080p-video?taskId=${seg.taskId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('qfm_kie_key')}`, 'Content-Type': 'application/json' },
              })).json()
              const veoVideoUrl = extractVideoUrl(veo1080?.data) || veo1080?.data?.videoUrl || veo1080?.data?.resultUrl || veo1080?.data?.downloadUrl
              if (veoVideoUrl && !isImageUrl(veoVideoUrl)) videoUrl = veoVideoUrl
            } catch {}
          }

          // Refresh URLs if found
          if (videoUrl) {
            try { const fresh = await getFreshUrl(videoUrl); if (fresh && !isImageUrl(fresh)) videoUrl = fresh } catch {}
          }
          if (thumbnailUrl) {
            try { const f = await getFreshUrl(thumbnailUrl); if (f) thumbnailUrl = f } catch {}
          }

          updateSeg(job.id, seg.id, {
            status: videoUrl ? 'completed' : 'failed',
            resultUrl: videoUrl,
            thumbnailUrl,
            progress: videoUrl ? 'done' : 'no video URL found',
          })
          if (videoUrl) recovered++
        } else {
          // Task still processing
          stillProcessing++
          const progress = recInfo?.data?.progress ? `${Math.round(parseFloat(recInfo.data.progress) * 100)}%` : 'still processing'
          updateSeg(job.id, seg.id, { progress })
        }
      } catch (err: any) {
        updateSeg(job.id, seg.id, { status: 'failed', progress: err.message || 'recheck failed' })
      }
      checked++
    }
    setRechecking(false)
    if (recovered > 0) toast.success(`Recovered ${recovered} of ${checked} generations! 🎬`)
    else if (stillProcessing > 0) toast.info(`${stillProcessing} still processing — try again in a minute`)
    else toast.info(`Checked ${checked} — all failed or no video URL found`)
  }, [jobs])

  const durationPresets = [4, 6, 8, 10, 15, 20, 24, 30]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Video Generator</h1>
        <div className="flex items-center gap-3">
          {jobs.some(j => j.segments.some(s => s.taskId && (s.status === 'generating' || s.status === 'processing' || s.status === 'pending'))) && (
            <button onClick={handleRecheckAll} disabled={rechecking}
              className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 transition-colors disabled:opacity-50">
              <RefreshCw className={`w-3 h-3 ${rechecking ? 'animate-spin' : ''}`} />
              {rechecking ? 'Checking...' : 'Recheck Status'}
            </button>
          )}
          {jobs.length > 0 && (
            <button onClick={clearJobs} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Clear History
            </button>
          )}
          {apiClient.hasKIEKey() && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              KIE.API Connected
            </div>
          )}
        </div>
      </div>

      {/* Resume banner */}
      {jobs.some(j => j.segments.some(s => s.taskId && (s.status === 'generating' || s.status === 'processing' || s.status === 'pending'))) && !generating && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
            Resuming generation in background... You can navigate away safely.
          </span>
        </div>
      )}

      {/* Settings — above the prompt and job list */}
      <Card>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="text-sm font-medium">Video Model</label>
              <select className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1"
                value={model} onChange={e => {
                  const newModel = e.target.value
                  setModel(newModel)
                  const nm = videoModels.find(m => m.id === newModel)!
                  if (desiredDuration > nm.maxDuration * 4) setDesiredDuration(nm.maxDuration)
                  setQuality(nm.qualityOptions[0])
                }}>
                {videoModels.map(m => (
                  <option key={m.id} value={m.id}>{m.name} — max {m.maxDuration}s — {m.credits} cr</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">{selectedModel.desc}</p>
              {selectedModel.endpoint === 'gpt4o-image' && (
                <div className="mt-2 p-2.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                  <strong>📸 Image Only:</strong> This model generates a still frame, not a video. For actual video with motion & audio, use <strong>Veo 3</strong> or <strong>Runway</strong>.
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Quality</label>
              <select className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1"
                value={quality} onChange={e => setQuality(e.target.value)}>
                {selectedModel.qualityOptions.map(q => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Aspect Ratio</label>
              <select className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1"
                value={aspectRatio} onChange={e => setAspectRatio(e.target.value)}>
                {aspectRatios.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  Duration
                </label>
                <span className="text-sm text-muted-foreground">{desiredDuration}s</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {durationPresets.map(d => (
                  <button
                    key={d}
                    onClick={() => setDesiredDuration(d)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                      desiredDuration === d
                        ? 'bg-primary text-white border-primary'
                        : 'bg-background border-border hover:bg-muted'
                    }`}
                  >
                    {d}s
                  </button>
                ))}
              </div>
              <input
                type="range"
                min={1}
                max={60}
                value={desiredDuration}
                onChange={e => setDesiredDuration(Number(e.target.value))}
                className="w-full mt-1"
              />
              <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                <Info className="w-3 h-3 text-primary" />
                <span>{segmentCount} generation{segmentCount > 1 ? 's' : ''} · ~{totalCredits} credits</span>
                {segmentCount > 1 && (
                  <span className="text-amber-600 dark:text-amber-400 ml-1">⚠ Auto-segment</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prompt + Generate */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <label className="text-sm font-medium">Prompt</label>
          <textarea
            className="min-h-[120px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none"
            placeholder="e.g. A Malay woman showing off her new pink tudung collection for Raya, soft cinematic lighting"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
          />
          {prompt.trim().length > 0 && (
            <p className={`text-xs ${prompt.trim().length > 800 ? 'text-red-500 font-medium' : prompt.trim().length > 400 ? 'text-amber-600' : 'text-muted-foreground'}`}>
              {prompt.trim().length > 800
                ? `${prompt.trim().length} chars — will be auto-condensed into scene prompts for best results`
                : prompt.trim().length > 400
                  ? `${prompt.trim().length} chars — storyboard text will be split into scene prompts`
                  : `${prompt.trim().length} chars`}
            </p>
          )}

          {segmentCount > 1 && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <Layers className="w-4 h-4 mt-0.5 text-amber-600 shrink-0" />
              <div className="text-sm">
                <span className="font-medium text-amber-800 dark:text-amber-200">Auto-segmented into {segmentCount} parts</span>
                <span className="text-amber-700 dark:text-amber-300"> — each model generates max {selectedModel.maxDuration}s. Your {desiredDuration}s video will be created as {segmentCount} × {Math.round(perSegmentDuration)}s clips that you can combine.</span>
              </div>
            </div>
          )}

          <Button onClick={handleGenerate} disabled={generating || !prompt} className="w-full">
            <Sparkles className="w-4 h-4 mr-2" />
            {generating
              ? `Generating ${segmentCount > 1 ? `${segmentCount} parts` : selectedModel.endpoint === 'gpt4o-image' ? 'image' : 'video'}...`
              : selectedModel.endpoint === 'gpt4o-image'
                ? `Generate Image (~${selectedModel.credits.split('-')[0]} credits) 📸`
                : segmentCount > 1
                  ? `Generate ${segmentCount} Parts (~${totalCredits} credits)`
                  : `Generate Video (~${selectedModel.credits.split('-')[0]} credits)`
            }
          </Button>
        </CardContent>
      </Card>

      {/* Job list */}
      {jobs.length > 0 && (
        <div className="space-y-4">
          {jobs.map(job => {
            const inProgress = job.segments.some(s => s.status === 'generating' || s.status === 'processing' || s.status === 'pending')
            const hasCompleted = job.segments.some(s => s.status === 'completed' && s.resultUrl)
            return (
              <Card key={job.id} className={`overflow-hidden ${inProgress ? 'ring-2 ring-primary/30' : ''}`}>
                <CardContent className="p-4 space-y-3">
                      {/* Job header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          {inProgress ? <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" /> : <Film className="w-4 h-4 text-primary shrink-0" />}
                          <span className="text-sm font-medium truncate">{job.prompt}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {inProgress && <span className="text-xs text-primary font-medium animate-pulse">Generating...</span>}
                          <span className="text-xs text-muted-foreground">{job.modelDesc} · {job.aspectRatio}</span>
                        </div>
                      </div>

                      {/* Segments grid */}
                      {job.segments.length > 1 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Layers className="w-3 h-3" />
                            {job.segments.filter(s => s.status === 'completed').length}/{job.segments.length} parts completed
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {job.segments.map(seg => (
                              <div key={seg.id} className={`rounded-md border overflow-hidden ${
                                seg.status === 'completed' ? 'border-green-300 dark:border-green-800' :
                                seg.status === 'failed' ? 'border-red-300 dark:border-red-800' :
                                'border-border'
                              }`}>
                                {seg.status === 'completed' && seg.resultUrl ? (
                                  <div>
                                    <video
                                      controls
                                      playsInline
                                      preload="metadata"
                                      poster={seg.thumbnailUrl || undefined}
                                      className="w-full aspect-video object-cover bg-black"
                                      src={seg.resultUrl}
                                    >
                                      Your browser does not support video playback.
                                    </video>
                                    <div className="p-2 bg-muted/30">
                                      <p className="text-xs font-medium">Part {seg.partIndex + 1} ✅</p>
                                      <a href={videoDownloadUrl(seg.resultUrl, `${job.model}-${job.aspectRatio}-part${seg.partIndex + 1}.mp4`)} target="_blank" rel="noopener noreferrer" download={`${job.model}-${job.aspectRatio}-part${seg.partIndex + 1}.mp4`}
                                        className="text-primary text-xs flex items-center gap-1 mt-0.5">
                                        <Download className="w-3 h-3" /> Download Video
                                      </a>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="aspect-video bg-muted flex items-center justify-center p-2">
                                    <div className="text-center">
                                      {seg.status === 'failed' ? (
                                        <p className="text-xs text-red-500">Part {seg.partIndex + 1} failed</p>
                                      ) : seg.status === 'generating' || seg.status === 'processing' ? (
                                        <>
                                          <Loader2 className="w-5 h-5 mx-auto mb-1 animate-spin text-primary" />
                                          <p className="text-xs text-muted-foreground">Part {seg.partIndex + 1} {seg.progress || '...'}</p>
                                          {job.createdAt && (
                                            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                                              {Math.round((now - job.createdAt) / 60000)}m ago
                                            </p>
                                          )}
                                        </>
                                      ) : (
                                        <p className="text-xs text-muted-foreground">Part {seg.partIndex + 1} waiting</p>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Single segment */}
                      {job.segments.length === 1 && (
                        <div className="aspect-video bg-muted rounded-md overflow-hidden flex items-center justify-center">
                          {job.segments[0].status === 'completed' && job.segments[0].resultUrl ? (
                            <video
                              controls
                              playsInline
                              preload="metadata"
                              poster={job.segments[0].thumbnailUrl || undefined}
                              className="w-full h-full object-cover bg-black"
                              src={job.segments[0].resultUrl}
                            >
                              Your browser does not support video playback.
                            </video>
                          ) : (
                            <div className="text-center p-4">
                              <Loader2 className={`w-8 h-8 mx-auto mb-2 ${job.segments[0].status === 'failed' ? '' : 'animate-spin'}`} />
                              <p className="text-sm text-muted-foreground">
                                {job.segments[0].status === 'failed' ? 'Generation failed' : job.segments[0].status === 'generating' || job.segments[0].status === 'processing' ? `Generating ${job.segments[0].progress}...` : 'Waiting...'}
                              </p>
                              {job.createdAt && (job.segments[0].status === 'generating' || job.segments[0].status === 'processing') && (
                                <p className="text-xs text-muted-foreground/60 mt-1">
                                  Started {Math.round((now - job.createdAt) / 60000)}m ago
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Refresh URLs — tempfile URLs expire after ~20 min */}
                        {hasCompleted && (
                          <button
                            onClick={() => handleRefreshUrls(job.id)}
                            disabled={refreshing === job.id}
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                          >
                            <RefreshCw className={`w-3 h-3 ${refreshing === job.id ? 'animate-spin' : ''}`} />
                            {refreshing === job.id ? 'Refreshing...' : 'Refresh URLs'}
                          </button>
                        )}

                        {/* Download links */}
                        {job.segments.filter(s => s.status === 'completed' && s.resultUrl).map(seg => (
                          <a key={seg.id} href={videoDownloadUrl(seg.resultUrl, `${job.model}-${job.aspectRatio}-part${seg.partIndex + 1}.mp4`)} target="_blank" rel="noopener noreferrer" download={`${job.model}-${job.aspectRatio}-part${seg.partIndex + 1}.mp4`}
                            className="text-primary text-xs flex items-center gap-1">
                            <Download className="w-3 h-3" />
                            {job.segments.length > 1 ? `Part ${seg.partIndex + 1}` : 'Download Video'}
                          </a>
                        ))}

                        {/* Combine button */}
                        {job.segments.length > 1 && job.segments.filter(s => s.status === 'completed' && s.resultUrl).length >= 2 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCombine(job.id)}
                            disabled={job.combining}
                            className="h-7 text-xs gap-1"
                          >
                            <Combine className="w-3 h-3" />
                            {job.combining ? 'Combining...' : 'Combine All Parts'}
                          </Button>
                        )}

                        {job.combinedUrl && (
                          <a href={videoDownloadUrl(job.combinedUrl, `${job.model}-${job.aspectRatio}-combined-${job.desiredDuration}s.mp4`)} target="_blank" rel="noopener noreferrer" download={`${job.model}-${job.aspectRatio}-combined-${job.desiredDuration}s.mp4`}
                            className="text-green-600 text-xs flex items-center gap-1 font-medium">
                            <Download className="w-3 h-3" />
                            Download Combined ({job.desiredDuration}s)
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
    </div>
  )
}