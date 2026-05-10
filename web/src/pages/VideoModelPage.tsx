import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { apiClient, pollKietask } from '../lib/api'
import { toast } from 'sonner'
import { Loader2, Download, Sparkles } from 'lucide-react'

export interface VideoModelConfig {
  id: string
  name: string
  endpoint: string
  defaultAspect: string
  maxDuration: number
  description: string
  credits: string
}

const aspectRatios = [
  { value: '9:16', label: '9:16 Portrait (TikTok/IG Reels)' },
  { value: '16:9', label: '16:9 Landscape (YouTube)' },
  { value: '1:1', label: '1:1 Square' },
  { value: '4:3', label: '4:3 Standard' },
]

const durations = [5, 8, 10]

interface VideoModelPageProps {
  config: VideoModelConfig
}

export default function VideoModelPage({ config }: VideoModelPageProps) {
  const [prompt, setPrompt] = useState('')
  const [aspectRatio, setAspectRatio] = useState(config.defaultAspect)
  const [duration, setDuration] = useState(Math.min(5, config.maxDuration))
  const [generating, setGenerating] = useState(false)
  const [videos, setVideos] = useState<any[]>([])

  async function handleGenerate() {
    if (!prompt.trim()) { toast.error('Enter a prompt'); return }
    if (!apiClient.hasKIEKey()) { toast.error('Add your KIE.API key in Settings first'); return }
    setGenerating(true)

    const vid = {
      id: `vid-${Date.now()}`,
      status: 'processing' as string,
      taskId: '',
      prompt,
      model: config.name,
      modelId: config.id,
      aspectRatio,
      duration,
      resultUrl: '',
    }
    setVideos(prev => [vid, ...prev])

    try {
      const res = await apiClient.generateVideo({
        prompt,
        model: config.id,
        aspectRatio,
      })
      vid.taskId = res.taskId
      setVideos(prev => prev.map(x => x.id === vid.id ? { ...x, taskId: res.taskId } : x))

      // Poll for result
      const result = await pollKietask<{ videoUrls: string[] }>(
        res.recordInfoPath,
        (data) => {
          const resp = data.response || data.resultJson
          const parsed = typeof resp === 'string' ? (() => { try { return JSON.parse(resp) } catch { return {} } })() : (resp || {})
          const videoUrls = parsed.resultUrls || (parsed.resultUrl ? [parsed.resultUrl] : [])
          return { videoUrls }
        },
        (attempt, data) => {
          const progress = data.progress ? `${Math.round(parseFloat(data.progress) * 100)}%` : `${attempt * 3}s`
          setVideos(prev => prev.map(x => x.id === vid.id ? { ...x, status: `generating (${progress})` } : x))
        }
      )

      const videoUrl = result.videoUrls?.[0] || ''
      setVideos(prev => prev.map(x => x.id === vid.id ? {
        ...x,
        status: videoUrl ? 'completed' : 'failed',
        resultUrl: videoUrl,
      } : x))

      if (videoUrl) {
        apiClient.saveToLibrary({ type: 'video', prompt: '', model: '', status: 'completed' })
        toast.success('Video generated! 🎬')
      } else {
        toast.error('Generation completed but no video URL returned')
      }
    } catch (err: any) {
      toast.error(err.message || 'Generation failed')
      setVideos(prev => prev.map(x => x.id === vid.id ? { ...x, status: 'failed' } : x))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{config.name}</h1>
          <p className="text-muted-foreground text-sm mt-1">{config.description}</p>
        </div>
        {apiClient.hasKIEKey() && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            KIE.API Connected
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <label className="text-sm font-medium">Prompt</label>
              <textarea
                className="min-h-[120px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none"
                placeholder={`e.g. A cinematic shot for ${config.name} — describe your video scene`}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
              />
              <Button onClick={handleGenerate} disabled={generating || !prompt} className="w-full">
                <Sparkles className="w-4 h-4 mr-2" />
                {generating ? 'Generating... (this may take a few minutes)' : `Generate Video · ${config.credits} credits`}
              </Button>
            </CardContent>
          </Card>

          {videos.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {videos.map(v => (
                <Card key={v.id} className="overflow-hidden">
                  <div className="aspect-video bg-muted flex items-center justify-center">
                    {v.status === 'completed' && v.resultUrl ? (
                      <video controls className="w-full h-full object-cover">
                        <source src={v.resultUrl} />
                      </video>
                    ) : (
                      <div className="text-center p-4">
                        <Loader2 className={`w-8 h-8 mx-auto mb-2 ${v.status === 'failed' ? '' : 'animate-spin'}`} />
                        <p className="text-sm text-muted-foreground">
                          {v.status === 'failed' ? 'Generation failed' : v.status}
                        </p>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <p className="text-sm font-medium truncate">{v.prompt}</p>
                    <p className="text-xs text-muted-foreground">{v.model} · {v.aspectRatio} · {v.duration}s</p>
                    {v.resultUrl && (
                      <a href={v.resultUrl} target="_blank" rel="noopener noreferrer"
                        className="text-primary text-sm flex items-center gap-1 mt-2">
                        <Download className="w-3 h-3" /> Download
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Model Info</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Model</span><span className="font-medium">{config.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">ID</span><span className="font-mono text-xs">{config.id}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Endpoint</span><span className="font-mono text-xs">{config.endpoint}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Credits</span><span className="font-medium">{config.credits}</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Settings</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <label className="text-sm">Aspect Ratio</label>
              <select className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={aspectRatio} onChange={e => setAspectRatio(e.target.value)}>
                {aspectRatios.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <label className="text-sm">Duration (seconds)</label>
              <select className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={duration} onChange={e => setDuration(Number(e.target.value))}>
                {durations.filter(d => d <= config.maxDuration).map(d => (
                  <option key={d} value={d}>{d}s</option>
                ))}
              </select>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}