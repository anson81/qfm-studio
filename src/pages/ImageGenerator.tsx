import { useState, useEffect, useRef } from 'react'
import { Button } from '../components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { imageModels, aspectRatios } from '../lib/models'
import { apiClient } from '../lib/api'
import { visualStyles } from '../lib/styles'
import { toast } from 'sonner'
import { Image, Loader2, Download, RefreshCw } from 'lucide-react'

export default function ImageGenerator() {
  const [prompt, setPrompt] = useState('')
  const [expanded, setExpanded] = useState('')
  const [model, setModel] = useState('flux-kontext-pro')
  const [aspectRatio, setAspectRatio] = useState('9:16')
  const [visualStyle, setVisualStyle] = useState('cinematic')
  const [numImages, setNumImages] = useState(1)
  const [generating, setGenerating] = useState(false)
  const [expanding, setExpanding] = useState(false)
  const [images, setImages] = useState<any[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function handleExpand() {
    if (!prompt.trim()) { toast.error('Enter a prompt first'); return }
    setExpanding(true)
    try {
      const res = await apiClient.generateText({
        system_prompt: 'You are a professional fashion photographer. Expand this idea into a detailed prompt for AI image generation. Focus on Muslim modest fashion. Return ONLY the expanded prompt.',
        user_message: `Expand: ${prompt}`, model: 'gpt-5.2'
      })
      const raw = res.result.choices?.[0]?.message?.content || res.result.text || ''
      const stylePrefix = (visualStyles[visualStyle as keyof typeof visualStyles] as any)?.prompt || ''
      const final = `${raw} ${stylePrefix}`.trim()
      setExpanded(final)
      setPrompt(final)
      toast.success('Prompt expanded!')
    } catch (err: any) { toast.error(err.message || 'Expansion failed') }
    finally { setExpanding(false) }
  }

  async function handleGenerate() {
    if (!prompt.trim()) { toast.error('Enter a prompt'); return }
    setGenerating(true)
    const newImages = Array.from({ length: numImages }, (_, i) => ({
      id: `temp-${Date.now()}-${i}`, status: 'queued', taskId: '', prompt, model, aspectRatio, url: ''
    }))
    setImages(prev => [...newImages, ...prev])
    try {
      for (const img of newImages) {
        const res = await apiClient.generateImage({
          prompt: img.prompt, model: img.model, aspect_ratio: img.aspectRatio, num_images: 1
        })
        img.taskId = res.task_id as string
        img.status = 'processing'
        setImages(prev => prev.map(x => x.id === img.id ? { ...x, taskId: img.taskId, status: 'processing' } : x))
      }
      toast.success('Images queued!')
      startPolling()
    } catch (err: any) {
      toast.error(err.message || 'Generation failed')
      setImages(prev => prev.map(img => img.status === 'queued' ? { ...img, status: 'failed' } : img))
    } finally { setGenerating(false) }
  }

  function startPolling() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(async () => {
      const processing = images.filter(i => i.status === 'processing' && i.taskId)
      if (processing.length === 0) { if (intervalRef.current) clearInterval(intervalRef.current); return }
      try {
        const taskIds = processing.map(i => i.taskId)
        const st = await apiClient.imageStatus(taskIds)
        const map = typeof st === 'object' ? st : {}
        setImages(prev => prev.map(i => {
          if (!i.taskId) return i
          const t = map[i.taskId]
          if (!t) return i
          if (t.status === 'completed' && t.url) return { ...i, status: 'completed', url: t.url }
          if (t.status === 'failed') return { ...i, status: 'failed' }
          return i
        }))
      } catch { /* ignore */ }
    }, 3000)
  }

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current) }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Image Generator</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <label className="text-sm font-medium">Your Idea</label>
              <textarea className="min-h-[100px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none" placeholder="e.g. A Malay woman in a dusty rose telekung, soft lighting at home" value={prompt} onChange={e => setPrompt(e.target.value)} />
              <div className="flex gap-2">
                <Button onClick={handleExpand} disabled={expanding || !prompt} variant="outline"><Loader2 className="w-4 h-4 mr-2" />{expanding ? 'Expanding...' : 'Expand Prompt'}</Button>
                <Button onClick={handleGenerate} disabled={generating || !prompt} className="ml-auto"><Image className="w-4 h-4 mr-2" />{generating ? 'Generating...' : `Generate ${numImages} Image${numImages > 1 ? 's' : ''}`}</Button>
              </div>
            </CardContent>
          </Card>
          {images.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {images.map(img => (
                <Card key={img.id} className="overflow-hidden">
                  <div className="aspect-[9/16] bg-muted flex items-center justify-center">
                    {img.status === 'completed' && img.url ? (
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <Loader2 className={`w-8 h-8 mx-auto mb-2 ${img.status === 'processing' ? 'animate-spin' : ''}`} />
                        <p className="text-sm text-muted-foreground">{img.status}</p>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <p className="text-sm font-medium truncate">{img.prompt}</p>
                    <p className="text-xs text-muted-foreground">{img.model} · {img.aspectRatio}</p>
                    {img.url && <a href={img.url} target="_blank" rel="noopener noreferrer" className="text-primary text-sm flex items-center gap-1 mt-2"><Download className="w-3 h-3" /> Download</a>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Image Model</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {imageModels.map(m => (
                <button key={m.id} onClick={() => setModel(m.id)} className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${model === m.id ? 'bg-primary text-white' : 'hover:bg-muted'}`}>
                  <div className="font-medium">{m.name}</div>
                  <div className="text-xs opacity-70">{m.credits}</div>
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
              <label className="text-sm">Visual Style</label>
              <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={visualStyle} onChange={e => setVisualStyle(e.target.value)}>
                {Object.entries(visualStyles).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
              </select>
              <label className="text-sm">Quantity: {numImages}</label>
              <input type="range" min={1} max={4} value={numImages} onChange={e => setNumImages(Number(e.target.value))} className="w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
