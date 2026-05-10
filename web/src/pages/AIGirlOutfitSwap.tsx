import { useState, useRef, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { apiClient } from '../lib/api'
import { visualStyles } from '../lib/styles'
import { toast } from 'sonner'
import { Shirt, Loader2, Sparkles, Download, Upload } from 'lucide-react'

const OUTFIT_CATEGORIES = ['Baju Kurung', 'Hijab Style', 'Jubah', 'Kurung Moden', 'Blouse & Skirt', 'Formal Professional']
const BODY_TYPES = ['Slim', 'Average', 'Curvy']

export default function AIGirlOutfitSwap() {
  const [prompt, setPrompt] = useState('')
  const [outfit, setOutfit] = useState('Baju Kurung')
  const [bodyType, setBodyType] = useState('Average')
  const [model, setModel] = useState('flux-kontext-pro')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<{url: string, status: string} | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function handleGenerate() {
    if (!apiClient.hasKIEKey()) { toast.error('Add your KIE.API key in Settings first'); return }
    if (!prompt.trim()) { toast.error('Describe the model base appearance'); return }
    setGenerating(true); setResult(null)
    try {
      const fullPrompt = `${prompt}, wearing ${outfit}, ${bodyType} body type, professional photography, studio lighting, full body shot, high detail`
      const res = await apiClient.generateImage({ prompt: fullPrompt, model, aspectRatio: '9:16' })
      const taskId = res.taskId
      if (!taskId) { toast.error('No task ID received'); return }
      setResult({ url: '', status: 'processing' })
      const poll = async () => {
        try {
          const status = await apiClient.imageStatus([taskId])
          const task = status[taskId]
          if (task?.status === 'completed' && task?.url) {
            setResult({ url: task.url, status: 'completed' })
            if (intervalRef.current) clearInterval(intervalRef.current)
          }
        } catch {}
      }
      intervalRef.current = setInterval(poll, 3000)
    } catch (err: any) { toast.error(err.message || 'Generation failed') }
    finally { setGenerating(false) }
  }

  useEffect(() => { return () => { if (intervalRef.current) clearInterval(intervalRef.current) } }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Outfit Swap</h1>
        <p className="text-muted-foreground">Visualize different outfits on AI fashion models</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Shirt className="w-5 h-5" /> Try an Outfit</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Model Description</label>
            <textarea className="w-full p-3 bg-sidebar border border-sidebar-border rounded-lg text-white min-h-[80px] resize-y" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., Young Malay woman, elegant posture, warm skin tone, confident expression..." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Outfit</label>
              <select className="w-full p-2 bg-sidebar border border-sidebar-border rounded-lg text-white" value={outfit} onChange={(e) => setOutfit(e.target.value)}>
                {OUTFIT_CATEGORIES.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Body Type</label>
              <select className="w-full p-2 bg-sidebar border border-sidebar-border rounded-lg text-white" value={bodyType} onChange={(e) => setBodyType(e.target.value)}>
                {BODY_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>
          <Button onClick={handleGenerate} disabled={generating} className="w-full">
            {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4 mr-2" /> Generate Outfit</>}
          </Button>
        </CardContent>
      </Card>
      {result && (
        <Card>
          <CardHeader><CardTitle>Result</CardTitle></CardHeader>
          <CardContent>
            {result.status === 'completed' && result.url ? (
              <div className="space-y-2">
                <img src={result.url} alt="Generated outfit" className="w-full max-w-md mx-auto rounded-lg" />
                <Button variant="outline" className="w-full" onClick={() => { window.open(result.url, '_blank') }}><Download className="w-4 h-4 mr-2" /> Download</Button>
              </div>
            ) : (
              <div className="aspect-[3/4] bg-sidebar rounded-lg flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}