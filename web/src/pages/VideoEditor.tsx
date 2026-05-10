import { useState, useRef, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { videoModels, aspectRatios, resolutions } from '../lib/models'
import { visualStyles } from '../lib/styles'
import { apiClient } from '../lib/api'
import { toast } from 'sonner'
import { Video, Loader2, Download, Sparkles } from 'lucide-react'

const STYLE_PRESETS = [
  { name: 'Fashion Lookbook', prompt: 'professional fashion lookbook, cinematic lighting, model posing elegantly' },
  { name: 'Product Showcase', prompt: 'product on model, studio lighting, clean background, commercial style' },
  { name: 'Story/Emotional', prompt: 'cinematic storytelling, warm tones, emotional close-ups, dreamlike atmosphere' },
  { name: 'TikTok Style', prompt: 'vertical video, trendy, quick cuts, text overlay style, dynamic movement' },
  { name: 'Behind the Scenes', prompt: 'candid BTS footage, natural lighting, authentic feel, raw energy' },
  { name: 'Product Styling', prompt: 'product styling tutorial, step-by-step, soft lighting, close-up detail shots' },
]

export default function VideoEditor() {
  const [prompt, setPrompt] = useState('')
  const [stylePreset, setStylePreset] = useState(STYLE_PRESETS[0])
  const [model, setModel] = useState('kling-2.5-turbo')
  const [aspectRatio, setAspectRatio] = useState('9:16')
  const [resolution, setResolution] = useState('720p')
  const [generating, setGenerating] = useState(false)
  const [videos, setVideos] = useState<any[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function handleGenerate() {
    if (!prompt.trim()) { toast.error('Describe your video'); return }
    if (!apiClient.hasKIEKey()) { toast.error('Add your KIE.API key in Settings first'); return }
    setGenerating(true)
    try {
      const fullPrompt = `${prompt}, ${stylePreset.prompt}, modest fashion, professional quality`
      const res = await apiClient.generateVideo({ prompt: fullPrompt, model, aspectRatio: aspectRatio, resolution, num_videos: 1 })
      const taskId = res.taskId
      if (!taskId) { toast.error('No task ID received'); return }
      setVideos(prev => [...prev, { id: `temp-${Date.now()}`, taskId, prompt: fullPrompt, model, status: 'processing', url: '' }])
      pollStatus(taskId)
    } catch (err: any) { toast.error(err.message || 'Generation failed') }
    finally { setGenerating(false) }
  }

  async function pollStatus(taskId: string) {
    const poll = async () => {
      try {
        const res = await apiClient.videoStatus([taskId])
        const task = res.tasks?.[0] || res.data?.[0]
        if (task?.status === 'completed' && task?.result_url) {
          setVideos(prev => prev.map(v => v.taskId === taskId ? { ...v, status: 'completed', url: task.result_url } : v))
          if (intervalRef.current) clearInterval(intervalRef.current)
        }
      } catch {}
    }
    intervalRef.current = setInterval(poll, 5000)
  }

  useEffect(() => { return () => { if (intervalRef.current) clearInterval(intervalRef.current) } }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Video Editor</h1>
        <p className="text-muted-foreground">Create fashion videos with AI and style presets</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Video className="w-5 h-5" /> Create Video</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Video Description</label>
            <textarea className="w-full p-3 bg-sidebar border border-sidebar-border rounded-lg text-white min-h-[100px] resize-y" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., Woman walking confidently in a pastel Baju Kurung, wind gently flowing, garden backdrop..." />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Style Preset</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {STYLE_PRESETS.map(preset => (
                <button key={preset.name} onClick={() => setStylePreset(preset)} className={`p-2 rounded-lg border text-sm text-left transition-colors ${stylePreset.name === preset.name ? 'border-primary bg-primary/10' : 'border-sidebar-border bg-sidebar hover:border-primary/50'}`}>
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Model</label>
              <select className="w-full p-2 bg-sidebar border border-sidebar-border rounded-lg text-white" value={model} onChange={(e) => setModel(e.target.value)}>
                {videoModels.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Aspect Ratio</label>
              <select className="w-full p-2 bg-sidebar border border-sidebar-border rounded-lg text-white" value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
                {aspectRatios.map((a: any) => <option key={a.id || a.value} value={a.value || a.id}>{a.name || a.id}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Resolution</label>
              <select className="w-full p-2 bg-sidebar border border-sidebar-border rounded-lg text-white" value={resolution} onChange={(e) => setResolution(e.target.value)}>
                {resolutions.map((r: any) => <option key={r.id || r.value} value={r.value || r.id}>{r.name || r.id}</option>)}
              </select>
            </div>
          </div>
          <Button onClick={handleGenerate} disabled={generating} className="w-full">
            {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4 mr-2" /> Generate Video</>}
          </Button>
        </CardContent>
      </Card>
      {videos.length > 0 && (
        <div className="space-y-4">
          {videos.map(v => (
            <Card key={v.id}>
              <CardContent className="p-4">
                {v.status === 'completed' && v.url ? (
                  <div className="space-y-2">
                    <video src={v.url} controls className="w-full max-w-md mx-auto rounded-lg" />
                    <p className="text-xs text-muted-foreground truncate">{v.prompt}</p>
                  </div>
                ) : (
                  <div className="aspect-[9/16] max-w-md mx-auto bg-sidebar rounded-lg flex items-center justify-center">
                    <div className="text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" /><p className="text-sm text-muted-foreground">Processing video...</p></div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}