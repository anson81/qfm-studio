import { useState, useRef, useEffect } from 'react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { videoModels, aspectRatios, resolutions } from '../lib/models'
import { visualStyles } from '../lib/styles'
import { apiClient } from '../lib/api'
import { toast } from 'sonner'
import { Wand2, Video, Loader2, Download } from 'lucide-react'

const PROMPT_EXPANSION_SYSTEM = "You are a TikTok video content director for Muslim women's modest fashion." + " Expand a simple idea into a cinematic prompt." + " RULES:" + " Character: Malaysian Malay woman, natural beauty, hijab matching product" + " Location: real home setting" + " Lighting: natural daylight" + " Style: UGC/organic, vertical 9:16" + " Return JSON: {\"expanded_prompt\":\"...\",\"scene_title\":\"...\",\"location\":\"...\"}"

export default function VideoGenerator() {
  const [prompt, setPrompt] = useState('')
  const [expanded, setExpanded] = useState('')
  const [model, setModel] = useState('kling-2.5-turbo')
  const [aspectRatio, setAspectRatio] = useState('9:16')
  const [resolution, setResolution] = useState('720p')
  const [visualStyle, setVisualStyle] = useState('cinematic')
  const [batchCount, setBatchCount] = useState(1)
  const [generating, setGenerating] = useState(false)
  const [expanding, setExpanding] = useState(false)
  const [videos, setVideos] = useState<any[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function handleExpand() {
    if (!prompt.trim()) { toast.error('Enter a prompt first'); return }
    setExpanding(true)
    try {
      const res = await apiClient.generateText({
        system_prompt: PROMPT_EXPANSION_SYSTEM,
        user_message: `Expand this idea: ${prompt}`,
        model: 'gpt-5.2'
      })
      const raw = res.result.choices?.[0]?.message?.content || res.result.text || ''
      let parsed
      try {
        const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
        parsed = JSON.parse(cleaned)
      } catch { parsed = { expanded_prompt: raw } }
      const stylePrefix = visualStyles[visualStyle as keyof typeof visualStyles]?.prompt || ''
      const final = `${parsed.expanded_prompt || raw} ${stylePrefix}`.trim()
      setExpanded(final)
      setPrompt(final)
      toast.success('Prompt expanded!')
    } catch (err: any) { toast.error(err.message || 'Expansion failed') }
    finally { setExpanding(false) }
  }

  async function handleGenerate() {
    if (!prompt.trim()) { toast.error('Enter a prompt'); return }
    setGenerating(true)
    const newVideos = Array.from({ length: batchCount }, (_, i) => ({
      id: `temp-${Date.now()}-${i}`, status: 'queued', taskId: '', prompt, model, aspectRatio, resolution, progress: 0
    }))
    setVideos(prev => [...newVideos, ...prev])

    try {
      for (const v of newVideos) {
        const res = await apiClient.generateVideo({
          prompt: v.prompt, model: v.model, aspect_ratio: v.aspectRatio, resolution: v.resolution, num_videos: 1
        })
        v.taskId = res.task_id
        v.status = 'processing'
        setVideos(prev2 => prev2.map(x => x.id === v.id ? { ...x, taskId: v.taskId, status: 'processing' } : x))
      }
      toast.success(`Queued ${batchCount} video(s)!`)
      startPolling()
    } catch (err: any) {
      toast.error(err.message || 'Generation failed')
      setVideos(prev2 => prev2.map(v => v.status === 'queued' ? { ...v, status: 'failed' } : v))
    } finally { setGenerating(false) }
  }

  function startPolling() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(async () => {
      const processing = videos.filter(v => v.status === 'processing' && v.taskId)
      if (processing.length === 0) { if (intervalRef.current) clearInterval(intervalRef.current); return }
      try {
        const taskIds = processing.map(v => v.taskId)
        const st = await apiClient.videoStatus(taskIds)
        const map = typeof st === 'object' ? st : {}
        setVideos(prev => prev.map(v => {
          if (!v.taskId) return v
          const t = map[v.taskId]
          if (!t) return v
          if (t.status === 'completed' && t.url) return { ...v, status: 'completed', resultUrl: t.url }
          if (t.status === 'failed') return { ...v, status: 'failed' }
          return { ...v, progress: Math.min(95, (v.progress || 0) + 10) }
        }))
      } catch { /* ignore polling errors */ }
    }, 3000)
  }

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current) }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Video Generator</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <label className="text-sm font-medium">Your Idea</label>
              <textarea className="min-h-[100px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none resize-none"
                placeholder="e.g. A Malay woman showing off her new pink tudung collection for Raya"
                value={prompt} onChange={e => setPrompt(e.target.value)}
              />
              <div className="flex gap-2">
                <Button onClick={handleExpand} disabled={expanding || !prompt} variant="outline"><Wand2 className="w-4 h-4 mr-2" />{expanding ? 'Expanding...' : 'Expand Prompt'}</Button>
                <Button onClick={handleGenerate} disabled={generating || !prompt} className="ml-auto"><Video className="w-4 h-4 mr-2" />{generating ? 'Generating...' : `Generate ${batchCount} Video${batchCount > 1 ? 's' : ''}`}</Button>
              </div>
            </CardContent>
          </Card>

          {videos.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {videos.map(v => (
                <Card key={v.id} className="overflow-hidden">
                  <div className="aspect-video bg-muted flex items-center justify-center">
                    {v.status === 'completed' && v.resultUrl ? (
                      <video controls className="w-full h-full object-cover"><source src={v.resultUrl} /></video>
                    ) : (
                      <div className="text-center">
                        <Loader2 className={`w-8 h-8 mx-auto mb-2 ${v.status === 'processing' ? 'animate-spin' : ''}`} />
                        <p className="text-sm text-muted-foreground">{v.status === 'queued' ? 'Queued' : `${v.progress || 0}%`}</p>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <p className="text-sm font-medium truncate">{v.prompt}</p>
                    <p className="text-xs text-muted-foreground">{v.model} · {v.aspectRatio}</p>
                    {v.resultUrl && <a href={v.resultUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-sm flex items-center gap-1 mt-2"><Download className="w-3 h-3" /> Download</a>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Video Model</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {videoModels.map(m => (
                <button key={m.id} onClick={() => setModel(m.id)} className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${model === m.id ? 'bg-primary text-white' : 'hover:bg-muted'}`}>
                  <div className="font-medium">{m.name}</div>
                  <div className="text-xs opacity-70">{m.cost}</div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Settings</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <label className="text-sm">Aspect Ratio</label>
              <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={aspectRatio} onChange={e => setAspectRatio(e.target.value)}>
                {aspectRatios.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <label className="text-sm">Resolution</label>
              <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={resolution} onChange={e => setResolution(e.target.value)}>
                {resolutions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <label className="text-sm">Visual Style</label>
              <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={visualStyle} onChange={e => setVisualStyle(e.target.value)}>
                {Object.entries(visualStyles).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
              </select>
              <label className="text-sm">Quantity: {batchCount}</label>
              <input type="range" min={1} max={4} value={batchCount} onChange={e => setBatchCount(Number(e.target.value))} className="w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
