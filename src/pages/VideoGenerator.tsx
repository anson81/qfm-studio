import { useState, useRef, useEffect } from 'react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs'
import { videoModels, aspectRatios, resolutions } from '../lib/models'
import { visualStyles } from '../lib/styles'
import { KIEClient, getUserKIEKey } from '../lib/kie'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { Wand2, Video, Loader2, Download, ImagePlus } from 'lucide-react'

const PROMPT_EXPANSION_SYSTEM = `You are a professional TikTok content director specializing in Muslim women's modest fashion marketing for the Malaysian market.

Take the user's simple idea and expand it into a structured, cinematic prompt for AI video generation.

RULES:
- Character: Malaysian Malay woman, warm skin tone, natural beauty. Hijab color to match brand/product.
- Location: Real Malaysian home setting (living room, bedroom, kitchen). NOT a studio.
- Lighting: Natural daylight, golden hour glow, warm inviting atmosphere.
- Camera: 9:16 vertical format, medium close-up, eye-level angle, natural movement.
- Style: UGC / organic content feel. No studio perfection.
- Language: If dialogue exists, use natural Bahasa Malaysia with some Manglish.

Return ONLY valid JSON with these keys:
{
  "expanded_prompt": "the full cinematic description",
  "scene_title": "short title",
  "location": "where it happens",
  "lighting": "lighting description",
  "action": "what the model is doing"
}`

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
  const [kieKey, setKieKey] = useState(getUserKIEKey())
  const intervalRef = useRef<ReturnType<typeof setInterval>|null>(null)

  async function handleExpand() {
    if (!prompt.trim()) { toast.error('Enter a prompt first'); return }
    const key = kieKey
    if (!key) { toast.error('Add your KIE.AI key in Settings'); return }
    setExpanding(true)
    try {
      const stylePrefix = visualStyles[visualStyle as keyof typeof visualStyles]?.prompt || ''
      const client = new KIEClient(key)
      const res = await client.chatCompletion([
        { role: 'system', content: PROMPT_EXPANSION_SYSTEM },
        { role: 'user', content: `Expand this idea into a detailed video prompt. Visual Style: ${visualStyle}\n\nUser Idea: ${prompt}` },
      ])
      const raw = res.choices?.[0]?.message?.content || res.text || ''
      // Try JSON parse, fallback to raw
      let parsed
      try {
        const cleaned = raw.replace(/\`\`\`json\s*/g, '').replace(/\`\`\`\s*/g, '').trim()
        parsed = JSON.parse(cleaned)
      } catch { parsed = { expanded_prompt: raw, scene_title: prompt.slice(0,40), location: '', lighting: '', action: prompt } }
      const finalPrompt = `${parsed.expanded_prompt || parsed.action || raw} ${stylePrefix}`.trim()
      setExpanded(finalPrompt)
      setPrompt(finalPrompt)
      toast.success('Prompt expanded!')
    } catch (err: any) {
      toast.error(err.message || 'Expansion failed')
    } finally { setExpanding(false) }
  }

  async function handleGenerate() {
    if (!prompt.trim()) { toast.error('Enter a prompt'); return }
    const key = kieKey
    if (!key) { toast.error('Add your KIE.AI key in Settings'); return }
    setGenerating(true)
    const newVideos = Array.from({ length: batchCount }, (_, i) => ({
      id: `temp-${Date.now()}-${i}`,
      status: 'queued',
      kieTaskId: '',
      prompt,
      model,
      aspectRatio,
      resolution,
      progress: 0,
    }))
    setVideos(prev => [...newVideos, ...prev])

    try {
      const client = new KIEClient(key)
      for (const v of newVideos) {
        const res = await client.generateVideo({
          prompts: [v.prompt],
          model: v.model,
          aspectRatio: v.aspectRatio,
          resolution: v.resolution,
          enableFallback: true,
        })
        v.kieTaskId = res.task_id
        v.status = 'processing'
        setVideos(prev => prev.map(x => x.id === v.id ? {...x, ...v} : x))
        // Save to DB
        await supabase.from('content').insert({
          type: 'video',
          prompt: v.prompt,
          model: v.model,
          status: 'processing',
          kie_task_id: v.kieTaskId,
          aspect_ratio: v.aspectRatio,
        })
      }
      toast.success(`Queued ${batchCount} video(s)! Polling for results...`)
      startPolling()
    } catch (err: any) {
      toast.error(err.message || 'Generation failed')
      setVideos(prev => prev.map(v => v.status === 'queued' ? {...v, status: 'failed'} : v))
    } finally { setGenerating(false) }
  }

  function startPolling() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(async () => {
      const key = getUserKIEKey()
      if (!key) return
      const client = new KIEClient(key)
      setVideos(prev => {
        const processing = prev.filter(v => v.status === 'processing' && v.kieTaskId)
        if (processing.length === 0) { if (intervalRef.current) clearInterval(intervalRef.current); return prev }
        processing.forEach(async v => {
          try {
            const status = await client.checkVideoStatus([v.kieTaskId])
            const task = status[v.kieTaskId] || status[0] || status
            if (task?.status === 'completed' && task?.url) {
              setVideos(p => p.map(x => x.kieTaskId === v.kieTaskId ? {...x, status: 'completed', url: task.url, resultUrl: task.url} : x))
              await supabase.from('content').update({ status: 'completed', result_url: task.url }).eq('kie_task_id', v.kieTaskId)
            } else if (task?.status === 'failed') {
              setVideos(p => p.map(x => x.kieTaskId === v.kieTaskId ? {...x, status: 'failed'} : x))
              await supabase.from('content').update({ status: 'failed' }).eq('kie_task_id', v.kieTaskId)
            } else {
              setVideos(p => p.map(x => x.kieTaskId === v.kieTaskId ? {...x, progress: Math.min(95, (x.progress || 0) + 10)} : x))
            }
          } catch { /* ignore polling errors */ }
        })
        return prev
      })
    }, 3000)
  }

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current) }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Video Generator</h1>

      {!kieKey && (
        <Card className="bg-destructive/10 border-destructive/30">
          <CardContent className="p-4">
            <p className="text-sm"><strong>API Key Required:</strong> Add your KIE.AI key in Settings to generate content.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <label className="text-sm font-medium">Your Idea</label>
              <textarea
                className="flex min-h-[100px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none"
                placeholder="e.g. A Malay woman showing off her new pink tudung collection for Raya"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
              />

              <div className="flex gap-2">
                <Button onClick={handleExpand} disabled={expanding || !prompt} variant="outline">
                  <Wand2 className="w-4 h-4 mr-2" />{expanding ? 'Expanding...' : 'Expand Prompt'}
                </Button>
                <Button onClick={handleGenerate} disabled={generating || !prompt} className="ml-auto">
                  <Video className="w-4 h-4 mr-2" />{generating ? 'Generating...' : `Generate ${batchCount} Video${batchCount > 1 ? 's' : ''}`}
                </Button>
              </div>
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
                      <div className="text-center">
                        <Loader2 className={`w-8 h-8 mx-auto mb-2 ${v.status === 'processing' ? 'animate-spin' : ''}`} />
                        <p className="text-sm text-muted-foreground">{v.status === 'queued' ? 'Queued' : `${v.progress || 0}%`}</p>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <p className="text-sm font-medium truncate">{v.prompt}</p>
                    <p className="text-xs text-muted-foreground">{v.model} · {v.aspectRatio}</p>
                    {v.resultUrl && (
                      <a href={v.resultUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-sm flex items-center gap-1 mt-2">
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
              <select className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2" value={aspectRatio} onChange={e => setAspectRatio(e.target.value)}>
                {aspectRatios.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>

              <label className="text-sm">Resolution</label>
              <select className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm" value={resolution} onChange={e => setResolution(e.target.value)}>
                {resolutions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>

              <label className="text-sm">Visual Style</label>
              <select className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm" value={visualStyle} onChange={e => setVisualStyle(e.target.value)}>
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
