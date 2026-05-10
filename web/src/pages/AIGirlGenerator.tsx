import { useState, useRef, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { imageModels } from '../lib/models'
import { visualStyles } from '../lib/styles'
import { apiClient } from '../lib/api'
import { toast } from 'sonner'
import { Sparkles, Loader2, Download } from 'lucide-react'

const POSES = ['Standing pose, hands by side', 'Walking pose, natural movement', 'Sitting pose, elegant', 'Three-quarter turn, dynamic', 'Close-up portrait, smiling']
const STYLES = ['Modern Professional', 'Casual Chic', 'Raya Festive', 'Minimalist Elegant', 'Street Style Modest', 'Traditional Contemporary']

export default function AIGirlGenerator() {
  const [prompt, setPrompt] = useState('')
  const [pose, setPose] = useState(POSES[0])
  const [style, setStyle] = useState(STYLES[0])
  const [model, setModel] = useState('flux-kontext-pro')
  const [aspectRatio, setAspectRatio] = useState('9:16')
  const [visualStyle, setVisualStyle] = useState('cinematic')
  const [generating, setGenerating] = useState(false)
  const [images, setImages] = useState<any[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function handleGenerate() {
    if (!apiClient.hasKIEKey()) { toast.error('Add your KIE.API key in Settings first'); return }
    if (!prompt.trim()) { toast.error('Describe your model first'); return }
    setGenerating(true)
    try {
      const stylePrefix = (visualStyles as any)[visualStyle]?.prompt || ''
      const fullPrompt = `${prompt}, ${pose}, ${stylePrefix}, professional product photography, studio lighting, high detail`
      const res = await apiClient.generateImage({ prompt: fullPrompt, model, aspectRatio })
      const taskId = res.taskId
      if (!taskId) { toast.error('No task ID received'); return }
      setImages(prev => [...prev, { id: `temp-${Date.now()}`, taskId, prompt: fullPrompt, model, aspectRatio, status: 'processing', url: '' }])
      pollStatus(taskId)
    } catch (err: any) { toast.error(err.message || 'Generation failed') }
    finally { setGenerating(false) }
  }

  async function pollStatus(taskId: string) {
    const poll = async () => {
      try {
        const res = await apiClient.imageStatus([taskId])
        const task = res[taskId]
        if (task?.status === 'completed' && task?.url) {
          setImages(prev => prev.map(img => img.taskId === taskId ? { ...img, status: 'completed', url: task.url } : img))
          if (intervalRef.current) clearInterval(intervalRef.current)
        }
      } catch {}
    }
    intervalRef.current = setInterval(poll, 3000)
  }

  useEffect(() => { return () => { if (intervalRef.current) clearInterval(intervalRef.current) } }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Model Generator</h1>
        <p className="text-muted-foreground">Generate fashion model photos with AI</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5" /> Create Model Photo</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Describe the Model Look</label>
            <textarea className="w-full p-3 bg-sidebar border border-sidebar-border rounded-lg text-white min-h-[80px] resize-y" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., Professional model showcasing your product with studio lighting..." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Pose</label>
              <select className="w-full p-2 bg-sidebar border border-sidebar-border rounded-lg text-white" value={pose} onChange={(e) => setPose(e.target.value)}>
                {POSES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Style</label>
              <select className="w-full p-2 bg-sidebar border border-sidebar-border rounded-lg text-white" value={style} onChange={(e) => setStyle(e.target.value)}>
                {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Model</label>
              <select className="w-full p-2 bg-sidebar border border-sidebar-border rounded-lg text-white" value={model} onChange={(e) => setModel(e.target.value)}>
                {imageModels.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Aspect Ratio</label>
              <select className="w-full p-2 bg-sidebar border border-sidebar-border rounded-lg text-white" value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
                {['1:1','9:16','16:9','4:3','3:4'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <Button onClick={handleGenerate} disabled={generating} className="w-full">
            {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4 mr-2" /> Generate Model Photo</>}
          </Button>
        </CardContent>
      </Card>
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map(img => (
            <Card key={img.id}>
              <CardContent className="p-2">
                {img.status === 'completed' && img.url ? (
                  <img src={img.url} alt={img.prompt} className="w-full rounded-lg" />
                ) : (
                  <div className="aspect-[3/4] bg-sidebar rounded-lg flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}