import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadBusinessProfile, getPromptPrefix } from '../lib/businessContext'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { apiClient, pollKietask, normalizeKietaskResponse } from '../lib/api'
import { toast } from 'sonner'
import { Film, Loader2, Copy, Video, Rocket, CheckCircle2, AlertCircle, Clock, Layers, RefreshCw, Download, Settings2 } from 'lucide-react'

/* ─── Reuse video model definitions from VideoGenerator ─── */
const videoModels = [
  { id: 'kling-2.6', name: 'Kling 2.6', credits: '55-220', endpoint: 'kling', maxDuration: 10, qualityOptions: ['720p', '1080p'] },
  { id: 'kling-v2.1', name: 'Kling V2.1 Pro', credits: '28-110', endpoint: 'kling', maxDuration: 10, qualityOptions: ['720p', '1080p'] },
  { id: 'kling-3.0', name: 'Kling 3.0', credits: '60-200', endpoint: 'kling', maxDuration: 10, qualityOptions: ['std', 'pro', '4K'] },
  { id: 'seedance-2.0', name: 'Seedance 2.0', credits: '40-150', endpoint: 'seedance', maxDuration: 10, qualityOptions: ['720p', '1080p'] },
  { id: 'hailuo-pro', name: 'Hailuo Pro', credits: '30-100', endpoint: 'hailuo', maxDuration: 6, qualityOptions: ['720p', '1080p'] },
  { id: 'sora2', name: 'Sora 2', credits: '80-250', endpoint: 'sora2', maxDuration: 10, qualityOptions: ['720p', '1080p'] },
  { id: 'wan-2.6', name: 'Wan 2.6', credits: '15-50', endpoint: 'wan', maxDuration: 6, qualityOptions: ['720p', '1080p'] },
  { id: 'veo3', name: 'Veo 3', credits: '60-380', endpoint: 'veo', maxDuration: 8, qualityOptions: ['720p Fast', '720p Quality', '1080p Quality', '4K Quality'] },
  { id: 'runway-gen3a', name: 'Runway Gen-3 Alpha', credits: '20-60', endpoint: 'runway', maxDuration: 10, qualityOptions: ['720p', '1080p'] },
]

const aspectRatios = [
  { value: '9:16', label: '9:16 Portrait (TikTok/Reels)' },
  { value: '16:9', label: '16:9 Landscape (YouTube)' },
  { value: '1:1', label: '1:1 Square' },
  { value: '4:3', label: '4:3 Standard' },
]

const LANGUAGES = [
  { value: 'ms', label: 'Bahasa Malaysia' },
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文 (Mandarin)' },
  { value: 'zh-hk', label: '粤语 (Cantonese)' },
  { value: 'ta', label: 'தமிழ் (Tamil)' },
]

const LANGUAGE_NAMES: Record<string, string> = {
  'ms': 'Bahasa Malaysia',
  'en': 'English',
  'zh': '中文 (Mandarin)',
  'zh-hk': '粤语 (Cantonese)',
  'ta': 'தமிழ் (Tamil)',
}

const GENRES = [
  'Fashion Showcase',
  'Product Launch',
  'Story/Emotional',
  'Tutorial',
  'Day-in-Life',
  'Unboxing',
  'Before/After',
  'Testimonial',
  'Trending Challenge',
]

/* ─── Video URL helpers (shared with VideoGenerator) ─── */
function isVideoUrl(u: string): boolean {
  if (!u) return false
  try {
    const pathname = new URL(u).pathname.toLowerCase()
    if (pathname.includes('/video') || pathname.includes('/vod') || pathname.includes('/media')) return true
    if (pathname.endsWith('.mp4') || pathname.endsWith('.webm') || pathname.endsWith('.mov')) return true
  } catch {
    if (u.includes('/video') || u.includes('/vod') || u.includes('/media') || u.includes('.mp4') || u.includes('.webm')) return true
  }
  return false
}

function isImageUrl(u: string): boolean {
  if (!u) return false
  try {
    const pathname = new URL(u).pathname.toLowerCase()
    if (pathname.includes('/images/') || pathname.includes('/image/') || pathname.includes('/thumb')) return true
    if (pathname.endsWith('.png') || pathname.endsWith('.jpg') || pathname.endsWith('.jpeg') || pathname.endsWith('.webp') || pathname.endsWith('.gif')) return true
  } catch {
    const lower = u.toLowerCase()
    if (lower.includes('/images/') || lower.includes('/image/') || lower.includes('.png') || lower.includes('.jpg')) return true
  }
  return u.includes('thumbnail') || u.includes('thumb') || u.includes('preview') || u.includes('cover')
}

function getKieResponse(data: any): any {
  if (data?.response) return data.response
  if (data?.resultJson) {
    if (typeof data.resultJson === 'string') { try { return JSON.parse(data.resultJson) } catch { return null } }
    return data.resultJson
  }
  return null
}

function extractVideoUrl(response: any): string {
  if (!response) return ''
  const urls: string[] = []
  if (Array.isArray(response.resultUrls) && response.resultUrls.length > 0) urls.push(...response.resultUrls.filter((u: string) => u && typeof u === 'string'))
  if (response.resultUrl && typeof response.resultUrl === 'string') urls.push(response.resultUrl)
  if (response.videoUrl && typeof response.videoUrl === 'string') urls.push(response.videoUrl)
  if (response.originUrl && typeof response.originUrl === 'string') urls.push(response.originUrl)
  if (urls.length === 0) return ''
  const videoUrls = urls.filter(u => isVideoUrl(u))
  if (videoUrls.length > 0) return videoUrls[0]
  const nonImageUrls = urls.filter(u => !isImageUrl(u))
  if (nonImageUrls.length > 0) return nonImageUrls[0]
  if (Array.isArray(response.resultUrls) && response.resultUrls.length > 0) return response.resultUrls[response.resultUrls.length - 1]
  return urls[0]
}

function extractThumbnailUrl(response: any): string {
  if (!response) return ''
  if (Array.isArray(response.resultUrls) && response.resultUrls.length > 0) {
    const imageUrls = response.resultUrls.filter((u: string) => isImageUrl(u))
    if (imageUrls.length > 0) return imageUrls[0]
  }
  return response.resultImageUrl || response.originImageUrl || response.thumbnailUrl || ''
}

function getRecordInfoPath(endpoint: string, taskId: string): string {
  const jobsEndpoints = ['kling', 'seedance', 'hailuo', 'sora2', 'wan', 'grok']
  if (jobsEndpoints.includes(endpoint)) return `/api/v1/jobs/recordInfo?taskId=${taskId}`
  if (endpoint === 'veo') return `/api/v1/veo/record-info?taskId=${taskId}`
  if (endpoint === 'runway') return `/api/v1/runway/record-detail?taskId=${taskId}`
  return `/api/v1/gpt4o-image/record-info?taskId=${taskId}`
}

async function getFreshUrl(originalUrl: string): Promise<string> {
  if (!originalUrl) return ''
  try {
    const result = await apiClient.getDownloadUrl(originalUrl)
    return result?.data?.downloadUrl || result?.data || originalUrl
  } catch { return originalUrl }
}

const MAX_VIDEO_PROMPT_LEN = 500

/** Extract visual description from storyboard scene chunk */
function extractVisualPrompt(chunk: string): string {
  let s = chunk.replace(/\*\*/g, '').replace(/__+/g, '')
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
    visualLines.push(trimmed)
  }
  s = visualLines.join('. ')
  s = s.replace(/\.\.\./g, '.').replace(/\.\s*\./g, '.').replace(/\s+/g, ' ').trim()
  return s
}

/** Convert storyboard text/JSON into concise video prompts per scene */
function storyboardToVideoPrompts(text: string, parts: number): string[] {
  const MAX = MAX_VIDEO_PROMPT_LEN
  // Try JSON parse
  try {
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const parsed = JSON.parse(cleaned)
    const scenes = Array.isArray(parsed) ? parsed : [parsed]
    if (scenes.length > 0) {
      return scenes.slice(0, parts).map((s: any) => {
        const arr: string[] = []
        if (s.visual) arr.push(s.visual)
        if (s.action) arr.push(s.action)
        if (s.description) arr.push(s.description)
        if (s.on_screen_text || s.text) arr.push(`Text: "${s.on_screen_text || s.text}"`)
        if (arr.length === 0) arr.push(JSON.stringify(s))
        return arr.join('. ').slice(0, MAX)
      })
    }
  } catch { /* not JSON */ }

  // Try to split by scene markers
  const sceneSplitRegex = /^(?:#{1,3}\s*(?:Scene|S|Part|Shot|Chapter)\s*\d+|Scene\s+\d+\s*[:.—-]?(?:\s|$)|(?:\d+)\.\s+)/gim
  const sections = text.split(sceneSplitRegex).filter(s => s.trim().length > 5)
  if (sections.length >= 2) {
    const visualSections = sections.map(s => extractVisualPrompt(s).slice(0, MAX))
    if (visualSections.length <= parts) {
      return Array.from({ length: parts }, (_, i) => visualSections[Math.min(i, visualSections.length - 1)] || text.trim().slice(0, MAX))
    }
    const perPart = Math.ceil(visualSections.length / parts)
    return Array.from({ length: parts }, (_, i) => {
      const chunk = visualSections.slice(i * perPart, (i + 1) * perPart).join('. ')
      return chunk.slice(0, MAX)
    })
  }

  // Fallback: split paragraphs
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 10)
  const visualParas = paragraphs.map(p => extractVisualPrompt(p)).filter(p => p.length > 10)
  if (visualParas.length === 0) return Array.from({ length: parts }, () => text.trim().slice(0, MAX))
  const prompts: string[] = []
  let current = ''
  for (const vp of visualParas) {
    if ((current + '. ' + vp).length > MAX && current.length > 0) { prompts.push(current.slice(0, MAX)); current = vp }
    else { current = current ? current + '. ' + vp : vp }
  }
  if (current) prompts.push(current.slice(0, MAX))
  while (prompts.length < parts) prompts.push(prompts[prompts.length - 1] || text.trim().slice(0, MAX))
  return prompts.slice(0, parts)
}

/* ─── Pipeline stage types ─── */
type PipelineStage = 'idle' | 'storyboard' | 'generating-videos' | 'combining' | 'done' | 'error'

interface SceneState {
  sceneNumber: number
  stage: string
  prompt: string
  taskId: string
  status: 'pending' | 'processing' | 'generating' | 'completed' | 'failed'
  progress: string
  resultUrl: string
  thumbnailUrl: string
  endpoint: string
  recordInfoPath: string
  error: string
}

export default function FilmMaker() {
  const navigate = useNavigate()
  const biz = loadBusinessProfile()
  const pollingRefs = useRef<Set<string>>(new Set())

  // Input state
  const [concept, setConcept] = useState('')
  const [genre, setGenre] = useState('Fashion Showcase')
  const [duration, setDuration] = useState('30 seconds')
  const [dialogueLanguage, setDialogueLanguage] = useState('ms')
  const [model, setModel] = useState('kling-2.6')
  const [aspectRatio, setAspectRatio] = useState('9:16')
  const [quality, setQuality] = useState('720p')

  // Pipeline state
  const [stage, setStage] = useState<PipelineStage>('idle')
  const [storyboardText, setStoryboardText] = useState('')
  const [scenes, setScenes] = useState<any[]>([])
  const [sceneStates, setSceneStates] = useState<SceneState[]>([])
  const [combinedUrl, setCombinedUrl] = useState('')
  const [pipelineError, setPipelineError] = useState('')

  const selectedModel = videoModels.find(m => m.id === model)!
  // Estimate segments: 30s video with max 10s per segment = 3 segments
  const durationSec = parseInt(duration) || 30
  const segmentCount = Math.ceil(durationSec / selectedModel.maxDuration)

  /* ─── STEP 1: Generate Storyboard ─── */
  const runPipeline = useCallback(async () => {
    if (!concept.trim()) { toast.error('Describe your film concept'); return }
    if (!apiClient.hasKIEKey()) { toast.error('Add your KIE.API key in Settings first'); return }

    setStage('storyboard')
    setPipelineError('')
    setScenes([])
    setSceneStates([])
    setCombinedUrl('')

    const systemPrompt = `You are a TikTok content strategist specializing in ${getPromptPrefix(biz)}. Generate a 6-scene storyboard for maximum engagement using the SEITU framework (Setup1, Setup2, Impact, Understanding, Transformation, Action).

CRITICAL INSTRUCTIONS:
- Output ONLY a JSON array. No preamble, no explanation, no "I will create..." text.
- Start your response with [ and end with ]
- Each scene object must have keys: scene (number), stage (string), visual (string), dialogue (string), on_screen_text (string), duration (string like "3s")
- All dialogue and on-screen text MUST be in ${LANGUAGE_NAMES[dialogueLanguage] || 'Bahasa Malaysia'}
- Visual descriptions in English only
- Aspect ratio: ${aspectRatio}
- Genre: ${genre}
- Target duration: ${duration}

Example first scene:
{"scene": 1, "stage": "Hook (Setup 1)", "visual": "Close-up of...", "dialogue": "...", "on_screen_text": "...", "duration": "3s"}`

    let rawStoryboard = ''
    try {
      // Generate storyboard via KIE Claude
      let res = await apiClient.generateText({
        system_prompt: systemPrompt,
        user_message: concept,
        model: 'claude-sonnet-4-5'
      })
      rawStoryboard = res.result?.choices?.[0]?.message?.content || res.result?.text || res.data?.choices?.[0]?.message?.content || ''

      // If Claude returned meta-commentary, try Gemini
      const trimmed = rawStoryboard.trim()
      if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) {
        try {
          res = await apiClient.generateTextGemini({
            system_prompt: systemPrompt,
            user_message: concept,
            model: 'gemini-2.5-flash'
          })
          rawStoryboard = res.result?.choices?.[0]?.message?.content || res.result?.text || res.data?.choices?.[0]?.message?.content || ''
        } catch { /* use whatever we got */ }
      }

      // Parse storyboard
      let parsedScenes: any[] = []
      try {
        const cleaned = rawStoryboard.trim().replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
        const parsed = JSON.parse(cleaned)
        parsedScenes = Array.isArray(parsed) ? parsed : [parsed]
      } catch {
        // Create a single scene from raw text
        parsedScenes = [{ scene: 1, stage: 'Full Story', visual: rawStoryboard, dialogue: '', on_screen_text: '', duration: `${durationSec}s` }]
      }

      if (parsedScenes.length < 3) {
        // Not enough scenes — treat as one big prompt
        parsedScenes = [{ scene: 1, stage: 'Full Story', visual: rawStoryboard, dialogue: '', on_screen_text: '', duration: `${durationSec}s` }]
      }

      setScenes(parsedScenes)
      setStoryboardText(rawStoryboard)

      // Save storyboard to library
      await apiClient.saveToLibrary({ type: 'text', model: 'storyboard-pipeline', prompt: concept, status: 'completed', result_url: rawStoryboard || '' })
      toast.success('Storyboard ready! Starting video generation...')

      // ─── STEP 2: Auto-generate videos for each scene ───
      setStage('generating-videos')

      // Convert storyboard to per-scene video prompts
      const videoPrompts = storyboardToVideoPrompts(rawStoryboard, segmentCount)

      // If we have more scenes than segments, map scenes to segments
      // If we have fewer scenes, each scene gets its own segment
      const numSegments = Math.max(segmentCount, Math.min(parsedScenes.length, 6))

      // Initialize scene states
      const initialStates: SceneState[] = videoPrompts.slice(0, numSegments).map((prompt, i) => ({
        sceneNumber: i + 1,
        stage: parsedScenes[i]?.stage || `Scene ${i + 1}`,
        prompt,
        taskId: '',
        status: 'pending' as const,
        progress: '',
        resultUrl: '',
        thumbnailUrl: '',
        endpoint: selectedModel.endpoint,
        recordInfoPath: '',
        error: '',
      }))
      setSceneStates(initialStates)

      // Generate videos sequentially (to avoid rate limits)
      const completedUrls: string[] = []
      for (let i = 0; i < initialStates.length; i++) {
        const segPrompt = initialStates[i].prompt
        const segEndpoint = selectedModel.endpoint

        // Update state: processing
        setSceneStates(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'processing' as const, progress: 'Submitting...' } : s))

        try {
          const res = await apiClient.generateVideo({
            prompt: segPrompt,
            model: selectedModel.id,
            aspectRatio,
            resolution: quality.includes('1080') ? '1080p' : quality.includes('4K') ? '4K' : '720p',
            endpoint: segEndpoint,
            duration: String(Math.min(Math.ceil(durationSec / numSegments), selectedModel.maxDuration)),
            sound: false,
            mode: selectedModel.id === 'kling-3.0' ? quality : undefined,
          })

          const taskId = res.taskId
          const recordInfoPath = res.recordInfoPath

          setSceneStates(prev => prev.map((s, idx) => idx === i ? { ...s, taskId, recordInfoPath, status: 'generating' as const, progress: 'Generating...' } : s))

          // Poll until completion
          const result = await pollKietask<{ videoUrls: string[] }>(
            recordInfoPath,
            (data) => {
              const videoUrl = extractVideoUrl(getKieResponse(data))
              return { videoUrls: videoUrl ? [videoUrl] : [] }
            },
            (attempt, data) => {
              const progress = data.progress ? `${Math.round(parseFloat(data.progress) * 100)}%` : `${attempt * 3}s`
              setSceneStates(prev => prev.map((s, idx) => idx === i ? { ...s, progress } : s))
            }
          )

          let videoUrl = result.videoUrls?.[0] || ''

          // Extract thumbnail and validate URL
          try {
            const recInfo: any = await (await fetch(`https://api.kie.ai${recordInfoPath}`, {
              headers: { Authorization: `Bearer ${localStorage.getItem('qfm_kie_key')}`, 'Content-Type': 'application/json' },
            })).json()
            let thumbnailUrl = extractThumbnailUrl(getKieResponse(recInfo?.data)) || ''

            // Re-extract video if needed
            if (isImageUrl(videoUrl) || !videoUrl) {
              const reExtracted = extractVideoUrl(getKieResponse(recInfo?.data))
              if (reExtracted && !isImageUrl(reExtracted)) videoUrl = reExtracted
            }

            // Veo 1080p fallback
            if ((!videoUrl || isImageUrl(videoUrl)) && segEndpoint === 'veo' && taskId) {
              try {
                const veo1080: any = await (await fetch(`https://api.kie.ai/api/v1/veo/get-1080p-video?taskId=${taskId}`, {
                  headers: { Authorization: `Bearer ${localStorage.getItem('qfm_kie_key')}`, 'Content-Type': 'application/json' },
                })).json()
                const veoVideoUrl = extractVideoUrl(veo1080?.data) || veo1080?.data?.videoUrl || veo1080?.data?.resultUrl
                if (veoVideoUrl && !isImageUrl(veoVideoUrl)) videoUrl = veoVideoUrl
              } catch {}
            }

            // Refresh URLs
            if (videoUrl) { try { const f = await getFreshUrl(videoUrl); if (f && !isImageUrl(f)) videoUrl = f } catch {} }
            if (thumbnailUrl) { try { thumbnailUrl = await getFreshUrl(thumbnailUrl) } catch {} }

            setSceneStates(prev => prev.map((s, idx) => idx === i ? {
              ...s,
              status: videoUrl ? 'completed' as const : 'failed' as const,
              resultUrl: videoUrl || '',
              thumbnailUrl,
              progress: videoUrl ? 'done' : 'no video URL',
            } : s))

            if (videoUrl) completedUrls.push(videoUrl)
          } catch {
            // Final fallback — mark as completed if result exists
            if (videoUrl) {
              if (isImageUrl(videoUrl)) videoUrl = ''
            }
            setSceneStates(prev => prev.map((s, idx) => idx === i ? {
              ...s,
              status: videoUrl ? 'completed' as const : 'failed' as const,
              resultUrl: videoUrl || '',
              progress: videoUrl ? 'done' : 'extraction failed',
            } : s))
            if (videoUrl) completedUrls.push(videoUrl)
          }

          // Save each segment to library
          if (videoUrl) {
            await apiClient.saveToLibrary({
              type: 'video', prompt: `Scene ${i + 1}: ${segPrompt.slice(0, 100)}`,
              model: selectedModel.id, aspectRatio,
              result_url: videoUrl,
              thumbnail_url: '',
              status: 'completed',
            })
          }
        } catch (err: any) {
          setSceneStates(prev => prev.map((s, idx) => idx === i ? {
            ...s, status: 'failed' as const, error: err.message || 'Generation failed', progress: err.message || 'failed',
          } : s))
          // Continue with remaining scenes even if one fails
        }
      }

      // ─── STEP 3: Auto-combine if multiple segments ───
      const finalStates = await new Promise<SceneState[]>(resolve => {
        setSceneStates(prev => {
          resolve(prev)
          return prev
        })
      })

      const completedSegments = finalStates.filter(s => s.status === 'completed' && s.resultUrl)
      if (completedSegments.length >= 2) {
        setStage('combining')
        toast.info('Combining video segments...')
        try {
          const freshUrls = await Promise.all(completedSegments.map(s => getFreshUrl(s.resultUrl)))
          const token = localStorage.getItem('qfm_token')
          const apiBase = (import.meta as any).env?.VITE_API_URL || ''
          const combineRes = await fetch(`${apiBase}/api/v1/video/concat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ video_urls: freshUrls }),
          })
          if (combineRes.ok) {
            const data = await combineRes.json()
            let url = data.url || data.download_url || ''
            if (url && !url.startsWith('http')) url = `${apiBase}${url}`
            setCombinedUrl(url)
            toast.success('Film created! 🎬')
          } else {
            const err = await combineRes.json().catch(() => ({ detail: `HTTP ${combineRes.status}` }))
            toast.warning(`Combine failed: ${err.detail || err.message}. You can still download individual segments.`)
          }
        } catch (err: any) {
          toast.warning(`Combine failed: ${err.message}. You can still download individual segments.`)
        }
      } else if (completedSegments.length === 1) {
        // Single segment — just use it directly
        setCombinedUrl(completedSegments[0].resultUrl)
        toast.success('Video created! 🎬')
      }

      setStage('done')
    } catch (err: any) {
      setStage('error')
      setPipelineError(err.message || 'Pipeline failed')
      toast.error(`Pipeline failed: ${err.message}`)
    }
  }, [concept, genre, duration, dialogueLanguage, model, aspectRatio, quality, selectedModel, segmentCount, biz])

  const handleRetryFailed = useCallback(async () => {
    // Retry only failed segments
    // For simplicity, re-run the entire pipeline
    setStage('idle')
    setSceneStates([])
    setCombinedUrl('')
    setPipelineError('')
  }, [])

  const handleCopyStoryboard = useCallback(() => {
    if (!storyboardText) return
    const text = scenes.map((s, i) => {
      const num = s.scene || s.scene_number || i + 1
      const stage = s.stage || s.title || ''
      const visual = s.visual || s.description || ''
      const dialogue = s.dialogue || ''
      const onscreen = s.on_screen_text || ''
      const dur = s.duration || ''
      return `Scene ${num}: ${stage}\nVisual: ${visual}\nDialogue: ${dialogue}\nOn-screen: ${onscreen}\nDuration: ${dur}`
    }).join('\n\n')
    navigator.clipboard.writeText(text).then(() => toast.success('Storyboard copied!')).catch(() => toast.error('Copy failed'))
  }, [storyboardText, scenes])

  const totalCompleted = sceneStates.filter(s => s.status === 'completed').length
  const totalFailed = sceneStates.filter(s => s.status === 'failed').length
  const totalSegments = sceneStates.length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><Rocket className="w-8 h-8 text-primary" /> Film Maker <span className="text-sm font-normal text-muted-foreground">Auto-Pilot</span></h1>
        <p className="text-muted-foreground mt-1">One click: Story idea → Storyboard → Video generation → Combined film. Fully automated.</p>
      </div>

      {/* ─── Input Card ─── */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Film className="w-5 h-5" /> Create Your Film</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Film Concept <span className="text-muted-foreground">(your story idea)</span></label>
            <textarea
              className="w-full p-3 bg-sidebar border border-sidebar-border rounded-lg text-white min-h-[100px] resize-y"
              value={concept}
              onChange={e => setConcept(e.target.value)}
              placeholder="e.g., A woman preparing for Raya — from choosing her Baju Kurung to the family gathering. Emotionally warm, traditional meets modern..."
              disabled={stage !== 'idle' && stage !== 'error' && stage !== 'done'}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Genre</label>
              <select className="w-full p-2 bg-sidebar border border-sidebar-border rounded-lg text-white" value={genre} onChange={e => setGenre(e.target.value)} disabled={stage !== 'idle' && stage !== 'error' && stage !== 'done'}>
                {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Duration</label>
              <select className="w-full p-2 bg-sidebar border border-sidebar-border rounded-lg text-white" value={duration} onChange={e => setDuration(e.target.value)} disabled={stage !== 'idle' && stage !== 'error' && stage !== 'done'}>
                {['15 seconds', '30 seconds', '60 seconds'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Language</label>
              <select className="w-full p-2 bg-sidebar border border-sidebar-border rounded-lg text-white" value={dialogueLanguage} onChange={e => setDialogueLanguage(e.target.value)} disabled={stage !== 'idle' && stage !== 'error' && stage !== 'done'}>
                {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Aspect Ratio</label>
              <select className="w-full p-2 bg-sidebar border border-sidebar-border rounded-lg text-white" value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} disabled={stage !== 'idle' && stage !== 'error' && stage !== 'done'}>
                {aspectRatios.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Video Model</label>
              <select className="w-full p-2 bg-sidebar border border-sidebar-border rounded-lg text-white" value={model} onChange={e => { setModel(e.target.value); const nm = videoModels.find(m => m.id === e.target.value)!; setQuality(nm.qualityOptions[0]) }} disabled={stage !== 'idle' && stage !== 'error' && stage !== 'done'}>
                {videoModels.filter(m => m.endpoint !== 'gpt4o-image').map(m => <option key={m.id} value={m.id}>{m.name} — max {m.maxDuration}s</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Quality</label>
              <select className="w-full p-2 bg-sidebar border border-sidebar-border rounded-lg text-white" value={quality} onChange={e => setQuality(e.target.value)} disabled={stage !== 'idle' && stage !== 'error' && stage !== 'done'}>
                {selectedModel.qualityOptions.map(q => <option key={q} value={q}>{q}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Settings2 className="w-4 h-4" />
            <span>{segmentCount} segment{segmentCount > 1 ? 's' : ''} × {selectedModel.maxDuration}s max each · ~{selectedModel.credits} credits per segment</span>
          </div>

          {/* ─── Main Action Button ─── */}
          {stage === 'idle' || stage === 'error' ? (
            <Button onClick={runPipeline} disabled={!concept.trim() || !apiClient.hasKIEKey()} className="w-full h-12 text-lg">
              <Rocket className="w-5 h-5 mr-2" />
              {stage === 'error' ? '🔄 Retry Pipeline' : '🎬 Start Auto-Pilot'}
            </Button>
          ) : stage === 'done' ? (
            <div className="flex gap-3">
              <Button onClick={() => { setStage('idle'); setSceneStates([]); setCombinedUrl(''); setPipelineError('') }} className="flex-1 h-12">
                🆕 New Film
              </Button>
              <Button variant="outline" onClick={handleCopyStoryboard} className="flex-1 h-12">
                <Copy className="w-4 h-4 mr-2" /> Copy Storyboard
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* ─── Pipeline Progress ─── */}
      {(stage !== 'idle') && (
        <Card className={stage === 'error' ? 'border-red-500' : stage === 'done' ? 'border-green-500' : 'border-primary'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {stage === 'storyboard' && <><Loader2 className="w-5 h-5 animate-spin text-blue-400" /> Generating Storyboard...</>}
              {stage === 'generating-videos' && <><Loader2 className="w-5 h-5 animate-spin text-purple-400" /> Generating Videos ({totalCompleted}/{totalSegments} done)</>}
              {stage === 'combining' && <><Loader2 className="w-5 h-5 animate-spin text-amber-400" /> Combining Segments...</>}
              {stage === 'done' && <><CheckCircle2 className="w-5 h-5 text-green-400" /> Film Complete! ✨</>}
              {stage === 'error' && <><AlertCircle className="w-5 h-5 text-red-400" /> Pipeline Error</>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Progress bar */}
            {sceneStates.length > 0 && (
              <div className="mb-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{totalCompleted + totalFailed}/{totalSegments} segments</span>
                  <span>{totalCompleted} completed · {totalFailed} failed</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden flex">
                  {sceneStates.map((s, i) => (
                    <div key={i} className={`h-full ${s.status === 'completed' ? 'bg-green-500' : s.status === 'failed' ? 'bg-red-500' : s.status === 'generating' || s.status === 'processing' ? 'bg-blue-400 animate-pulse' : 'bg-muted-foreground/30'}`}
                      style={{ width: `${100 / sceneStates.length}%` }} />
                  ))}
                </div>
              </div>
            )}

            {/* Scene cards */}
            {sceneStates.map((s, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border mb-2 ${s.status === 'completed' ? 'border-green-800 bg-green-950/20' : s.status === 'failed' ? 'border-red-800 bg-red-950/20' : s.status === 'generating' || s.status === 'processing' ? 'border-blue-800 bg-blue-950/20' : 'border-border bg-muted/30'}`}>
                <div className="shrink-0 mt-0.5">
                  {s.status === 'completed' ? <CheckCircle2 className="w-5 h-5 text-green-400" /> :
                   s.status === 'failed' ? <AlertCircle className="w-5 h-5 text-red-400" /> :
                   <Loader2 className={`w-5 h-5 ${s.status === 'generating' || s.status === 'processing' ? 'animate-spin text-blue-400' : 'text-muted-foreground'}`} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">Scene {s.sceneNumber}: {s.stage}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${s.status === 'completed' ? 'bg-green-900 text-green-300' : s.status === 'failed' ? 'bg-red-900 text-red-300' : 'bg-blue-900 text-blue-300'}`}>
                      {s.status === 'processing' ? 'Submitting...' : s.status === 'generating' ? s.progress || 'Generating...' : s.status === 'completed' ? 'Done' : s.status === 'failed' ? 'Failed' : 'Waiting'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.prompt.slice(0, 120)}{s.prompt.length > 120 ? '...' : ''}</p>
                  {s.status === 'failed' && s.error && <p className="text-xs text-red-400 mt-1">{s.error}</p>}
                  {s.status === 'completed' && s.resultUrl && (
                    <a href={s.resultUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 mt-1">
                      <Download className="w-3 h-3" /> Download Scene {s.sceneNumber}
                    </a>
                  )}
                </div>
                {s.status === 'completed' && s.thumbnailUrl && (
                  <img src={s.thumbnailUrl} alt={`Scene ${s.sceneNumber}`} className="w-20 h-14 object-cover rounded shrink-0" />
                )}
              </div>
            ))}

            {/* Combined video */}
            {combinedUrl && (
              <div className="mt-4 p-4 rounded-lg bg-green-950/30 border border-green-800">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <span className="font-semibold text-green-300">Final Film</span>
                </div>
                <video controls playsInline className="w-full rounded-lg bg-black" src={combinedUrl}>
                  Your browser does not support video playback.
                </video>
                <a href={combinedUrl} target="_blank" rel="noopener noreferrer" download={`qfm-film-${Date.now()}.mp4`}
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm font-medium">
                  <Download className="w-4 h-4" /> Download Full Film
                </a>
              </div>
            )}

            {/* Storyboard display */}
            {storyboardText && scenes.length > 0 && (
              <details className="mt-4">
                <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">📋 View Storyboard Details</summary>
                <div className="mt-2 space-y-2">
                  {scenes.map((scene, i) => (
                    <div key={i} className="p-2 rounded bg-muted/30 text-sm">
                      <p className="font-medium">Scene {scene.scene || scene.scene_number || i + 1}: {scene.stage || scene.title || ''}</p>
                      <p className="text-muted-foreground">{scene.visual || scene.description || ''}</p>
                      {(scene.dialogue || scene.on_screen_text) && (
                        <p className="text-xs text-muted-foreground mt-1">{scene.dialogue && `🗣️ ${scene.dialogue}`} {scene.on_screen_text && `📝 "${scene.on_screen_text}"`}</p>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            )}

            {/* Error state */}
            {stage === 'error' && pipelineError && (
              <div className="mt-4 p-3 rounded-lg bg-red-950/30 border border-red-800 text-sm text-red-300">
                <p className="font-medium">Pipeline Error</p>
                <p className="mt-1">{pipelineError}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── How It Works ─── */}
      {stage === 'idle' && (
        <Card>
          <CardHeader><CardTitle className="text-base">How Auto-Pilot Works</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <ol className="list-decimal list-inside space-y-2">
              <li><strong>Storyboard:</strong> AI creates a 6-scene SEITU storyboard from your concept</li>
              <li><strong>Video Generation:</strong> Each scene is auto-converted to a visual prompt and sent to {selectedModel.name}</li>
              <li><strong>Combine:</strong> All segments are automatically stitched together into a final film</li>
              <li><strong>Download:</strong> Get your finished video — no manual steps needed</li>
            </ol>
            <p className="mt-3 text-xs bg-amber-950/30 p-2 rounded border border-amber-800">
              ⚡ Auto-Pilot processes scenes sequentially. Each {selectedModel.maxDuration}s segment takes 1-3 minutes.
              {segmentCount > 1 && ` Your ${durationSec}s film = ${segmentCount} segments = ~${segmentCount * 2}-${segmentCount * 3} min total.`}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}