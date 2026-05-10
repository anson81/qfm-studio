import { useState, useEffect, useRef } from 'react'
import { Button } from '../components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { apiClient, pollKietask, type KIETaskStatus } from '../lib/api'
import { toast } from 'sonner'
import { Image, Loader2, Download, Sparkles } from 'lucide-react'

const imageModels = [
  { id: 'nano-banana-pro', name: 'Nano Banana Pro', desc: 'Gemini 3 Pro — versatile, great detail', credits: '~3' },
  { id: 'nano-banana-pro-2', name: 'Nano Banana Pro 2', desc: 'Next-gen Gemini — sharper detail', credits: '~3' },
  { id: 'nano-banana-ultra', name: 'Nano Banana Ultra', desc: 'Ultra quality — premium output', credits: '~5' },
  { id: 'nano-banana-2', name: 'Nano Banana 2', desc: 'Balanced speed and quality', credits: '~2' },
  { id: 'nano-banana', name: 'Nano Banana', desc: 'Fast and lightweight', credits: '~1' },
  { id: 'flux-kontext-pro', name: 'Flux Kontext Pro', desc: 'Fast, high quality', credits: '~2' },
  { id: 'flux-kontext-max', name: 'Flux Kontext Max', desc: 'Maximum quality, enhanced detail', credits: '~4' },
  { id: 'gpt4o', name: 'GPT-4o Image', desc: 'Versatile, great text rendering', credits: '~3' },
]

const aspectRatios = [
  { value: '1:1', label: '1:1 Square' },
  { value: '9:16', label: '9:16 Portrait (TikTok)' },
  { value: '16:9', label: '16:9 Landscape' },
  { value: '4:3', label: '4:3 Standard' },
  { value: '3:4', label: '3:4 Portrait' },
]

export default function ImageGenerator() {
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState('nano-banana-pro')
  const [aspectRatio, setAspectRatio] = useState('9:16')
  const [numImages, setNumImages] = useState(1)
  const [generating, setGenerating] = useState(false)
  const [images, setImages] = useState<any[]>([])

  async function handleGenerate() {
    if (!prompt.trim()) { toast.error('Enter a prompt'); return }
    if (!apiClient.hasKIEKey()) { toast.error('Add your KIE.API key in Settings first'); return }
    setGenerating(true)

    for (let i = 0; i < numImages; i++) {
      const img = {
        id: `img-${Date.now()}-${i}`,
        status: 'processing' as string,
        taskId: '',
        prompt,
        model,
        aspectRatio,
        url: '',
      }
      setImages(prev => [img, ...prev])

      try {
        // Use the unified generateImage which auto-selects the right endpoint
        const res = await apiClient.generateImage({
          prompt,
          model: model as string,
          aspectRatio,
        })
        img.taskId = res.taskId
        setImages(prev => prev.map(x => x.id === img.id ? { ...x, taskId: res.taskId } : x))

        // Poll for result using the recordInfoPath
        const result = await pollKietask<{ imageUrl: string | null }>(
          res.recordInfoPath,
          (data) => {
            // Extract image URL from response
            const resp = data.response || {}
            // Nano Banana / GPT-4o returns resultUrls[], Flux returns resultImageUrl/originImageUrl
            const imageUrl = resp.resultImageUrl || resp.originImageUrl || (Array.isArray(resp.resultUrls) ? resp.resultUrls[0] : null) || null
            if (!imageUrl && data.successFlag === 1) {
              console.warn('Task succeeded but no image URL in response:', data)
            }
            return { imageUrl }
          },
          (attempt, data) => {
            // Update progress
            const progress = data.progress ? `${Math.round(parseFloat(data.progress) * 100)}%` : `${attempt * 3}s`
            setImages(prev => prev.map(x => x.id === img.id ? { ...x, status: `generating (${progress})` } : x))
          }
        )

        setImages(prev => prev.map(x => x.id === img.id ? {
          ...x,
          status: result.imageUrl ? 'completed' : 'failed',
          url: result.imageUrl || '',
        } : x))

        if (result.imageUrl) {
          apiClient.saveToLibrary({ type: 'image', prompt, model, aspectRatio, result_url: result.imageUrl, status: 'completed' })
          toast.success('Image generated! 🎨')
        } else {
          toast.error('Generation completed but no image URL returned')
        }
      } catch (err: any) {
        toast.error(err.message || 'Generation failed')
        setImages(prev => prev.map(x => x.id === img.id ? { ...x, status: 'failed' } : x))
      }
    }
    setGenerating(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Image Generator</h1>
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
                placeholder="e.g. A Malay woman in a dusty rose telekung, soft lighting at home, modest fashion photography"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
              />
              <Button
                onClick={handleGenerate}
                disabled={generating || !prompt}
                className="w-full"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {generating ? 'Generating...' : `Generate ${numImages > 1 ? `${numImages} ` : ''}Image${numImages > 1 ? 's' : ''}`}
              </Button>
            </CardContent>
          </Card>

          {images.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {images.map(img => (
                <Card key={img.id} className="overflow-hidden">
                  <div className="aspect-square bg-muted flex items-center justify-center">
                    {img.status === 'completed' && img.url ? (
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-4">
                        <Loader2 className={`w-8 h-8 mx-auto mb-2 ${img.status === 'failed' ? '' : 'animate-spin'}`} />
                        <p className="text-sm text-muted-foreground">
                          {img.status === 'failed' ? 'Generation failed' : img.status}
                        </p>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <p className="text-sm font-medium truncate">{img.prompt}</p>
                    <p className="text-xs text-muted-foreground">{img.model} · {img.aspectRatio}</p>
                    {img.url && (
                      <a href={img.url} target="_blank" rel="noopener noreferrer"
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
            <CardHeader><CardTitle className="text-base">Model</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {imageModels.map(m => (
                <button key={m.id} onClick={() => setModel(m.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${model === m.id ? 'bg-primary text-white' : 'hover:bg-muted'}`}>
                  <div className="font-medium">{m.name}</div>
                  <div className={`text-xs ${model === m.id ? 'opacity-90' : 'opacity-70'}`}>{m.desc} · {m.credits} credits</div>
                </button>
              ))}
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
              <label className="text-sm">Quantity: {numImages}</label>
              <input type="range" min={1} max={4} value={numImages}
                onChange={e => setNumImages(Number(e.target.value))} className="w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}