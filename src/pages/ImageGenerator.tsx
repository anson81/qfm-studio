import { useState, useRef, useEffect } from 'react'
import { Button } from '../components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { imageModels, aspectRatios } from '../lib/models'
import { visualStyles } from '../lib/styles'
import { KIEClient, getUserKIEKey } from '../lib/kie'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { ImagePlus, Loader2, Download } from 'lucide-react'

export default function ImageGenerator() {
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState('flux-kontext-pro')
  const [aspectRatio, setAspectRatio] = useState('9:16')
  const [visualStyle, setVisualStyle] = useState('cinematic')
  const [numImages, setNumImages] = useState(1)
  const [generating, setGenerating] = useState(false)
  const [images, setImages] = useState<any[]>([])
  const intervalRef = useRef<any>(null)

  async function handleGenerate() {
    if (!prompt.trim()) { toast.error('Enter a prompt'); return }
    const key = getUserKIEKey()
    if (!key) { toast.error('Add your KIE.AI key in Settings'); return }
    setGenerating(true)
    const stylePrefix = visualStyles[visualStyle as keyof typeof visualStyles]?.prompt || ''
    const finalPrompt = `${prompt} ${stylePrefix}`.trim()
    const newImgs = Array.from({ length: numImages }, (_, i) => ({
      id: `img-${Date.now()}-${i}`, status: 'queued', kieTaskId: '', prompt: finalPrompt, model, aspectRatio,
    }))
    setImages(prev => [...newImgs, ...prev])

    try {
      const client = new KIEClient(key)
      for (const img of newImgs) {
        const res = await client.generateImage({
          prompt: img.prompt, model: img.model, aspectRatio: img.aspectRatio, numImages: 1,
        })
        img.kieTaskId = res.task_id
        img.status = 'processing'
        setImages(p => p.map(x => x.id === img.id ? {...x, ...img} : x))
        await supabase.from('content').insert({
          type: 'image', prompt: img.prompt, model: img.model, status: 'processing',
          kie_task_id: img.kieTaskId, aspect_ratio: img.aspectRatio,
        })
      }
      toast.success(`Queued ${numImages} image(s)!`)
      startPolling()
    } catch (err: any) { toast.error(err.message); setImages(p => p.map(v => v.status === 'queued' ? {...v, status: 'failed'} : v))
    } finally { setGenerating(false) }
  }

  function startPolling() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(async () => {
      const key = getUserKIEKey(); if (!key) return
      const client = new KIEClient(key)
      const processing = images.filter(v => v.status === 'processing' && v.kieTaskId)
      if (!processing.length) { clearInterval(intervalRef.current); return }
      for (const img of processing) {
        try {
          const status = await client.checkImageStatus([img.kieTaskId])
          const task = status[img.kieTaskId] || status[0] || status
          if (task.status === 'completed' && task.url) {
            setImages(p => p.map(x => x.kieTaskId === img.kieTaskId ? {...x, status:'completed', resultUrl: task.url} : x))
            await supabase.from('content').update({ status: 'completed', result_url: task.url }).eq('kie_task_id', img.kieTaskId)
          }
        } catch { /* ignore */ }
      }
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
              <label className="text-sm font-medium">Prompt</label>
              <textarea className="flex min-h-[100px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 resize-none"
                placeholder="A Malaysian Malay woman in a pink tudung holding a skincare bottle in her bedroom, morning light"
                value={prompt} onChange={e => setPrompt(e.target.value)}
              />
              <Button onClick={handleGenerate} disabled={generating || !prompt}>
                <ImagePlus className="w-4 h-4 mr-2" />{generating ? 'Generating...' : `Generate ${numImages} Image${numImages > 1 ? 's' : ''}`}
              </Button>
            </CardContent>
          </Card>
          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {images.map(img => (
                <Card key={img.id} className="overflow-hidden">
                  <div className="aspect-square bg-muted flex items-center justify-center">
                    {img.status === 'completed' && img.resultUrl ? (
                      <img src={img.resultUrl} alt={img.prompt} className="w-full h-full object-cover" />
                    ) : (
                      <Loader2 className={`w-6 h-6 ${img.status === 'processing' ? 'animate-spin' : ''}`} />
                    )}
                  </div>
                  <CardContent className="p-3">
                    <p className="text-xs font-medium truncate">{img.prompt}</p>
                    {img.resultUrl && <a href={img.resultUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-xs flex items-center gap-1"><Download className="w-3 h-3" /> Download</a>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-4">
          <Card><CardHeader><CardTitle className="text-base">Image Model</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {imageModels.map(m => (
                <button key={m.id} onClick={() => setModel(m.id)} className={`w-full text-left px-3 py-2 rounded-md text-sm ${model === m.id ? 'bg-primary text-white' : 'hover:bg-muted'}`}>
                  <div className="font-medium">{m.name}</div>
                  <div className="text-xs opacity-70">~{m.credits} credits</div>
                </button>
              ))}
            </CardContent>
          </Card>
          <Card><CardHeader><CardTitle className="text-base">Settings</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <label className="text-sm">Aspect Ratio</label>
              <select className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm" value={aspectRatio} onChange={e=> setAspectRatio(e.target.value)}>
                {aspectRatios.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <label className="text-sm">Visual Style</label>
              <select className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm" value={visualStyle} onChange={e=> setVisualStyle(e.target.value)}>
                {Object.entries(visualStyles).map(([k,v]) => <option key={k} value={k}>{v.name}</option>)}
              </select>
              <label className="text-sm">Quantity: {numImages}</label>
              <input type="range" min={1} max={8} value={numImages} onChange={e=> setNumImages(Number(e.target.value))} className="w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
