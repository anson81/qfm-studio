import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs'
import { videoModels, aspectRatios } from '../lib/models'
import { KIEClient, getUserKIEKey } from '../lib/kie'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { Film, Loader2, Video, Download, Plus, Trash2, Sparkles } from 'lucide-react'

const FILM_SYSTEM = `You are a Film Maker AI for Muslim women's modest fashion in Malaysia.
Take a story idea and break it into 3-5 cinematic scenes suitable for TikTok.

Return JSON array of scenes:
[{"description":"scene text", "dialogue":"Bahasa Malaysia dialogue", "camera":"shot type"}]
Rules:
- Character: Malaysian Malay woman, natural beauty, hijab matching brand.
- Location: Real Malaysian home or outdoor setting (pasar, mall, etc).
- Style: UGC/organic cinematic, natural lighting.
- Language: Natural Bahasa Malaysia + Manglish.`

export default function FilmMaker() {
  const [storyIdea, setStoryIdea] = useState('')
  const [sceneCount, setSceneCount] = useState(5)
  const [aspectRatio, setAspectRatio] = useState('9:16')
  const [dialogueLanguage, setDialogueLanguage] = useState('ms')
  const [visualStyle, setVisualStyle] = useState('cinematic')
  const [scenes, setScenes] = useState<any[]>([])
  const [generatingScenes, setGeneratingScenes] = useState(false)
  const [generatingVideo, setGeneratingVideo] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const kieKey = getUserKIEKey()

  async function handleGenerateScenes() {
    if (!storyIdea.trim()) { toast.error('Enter a story idea'); return }
    const key = kieKey
    if (!key) { toast.error('Add KIE.AI key in Settings'); return }
    setGeneratingScenes(true)
    try {
      const client = new KIEClient(key)
      const res = await client.chatCompletion([
        { role: 'system', content: FILM_SYSTEM },
        { role: 'user', content: `Story Idea (${sceneCount} scenes): ${storyIdea}\n\nVisual Style: ${visualStyle}\nDialogue Language: ${dialogueLanguage}\nBreak into scenes and include dialogue.` }
      ])
      const raw = res.choices?.[0]?.message?.content || res.text || ''
      let parsed
      try {
        const cleaned = raw.replace(/```json\s*/g,'').replace(/```\s*/g,'').trim()
        parsed = JSON.parse(cleaned)
      } catch { parsed = raw.split('\n').filter((x:string) => !!x).map((s:string, i:number) => ({description:s,dialogue:'',camera:'Medium shot'})) }
      const arr = Array.isArray(parsed) ? parsed : [parsed]
      setScenes(arr.map((s:any,i:number) => ({...s, id:i+1, selected:true})))
      toast.success(`Generated ${arr.length} scenes`)
    } catch (err:any) { toast.error(err.message || 'Scene gen failed') }
    finally { setGeneratingScenes(false) }
  }

  async function handleGenerateVideos() {
    const selected = scenes.filter(s => s.selected)
    if (!selected.length) { toast.error('Select at least one scene'); return }
    const key = kieKey
    if (!key) { toast.error('Add KIE.AI key in Settings'); return }
    setGeneratingVideo(true)
    const client = new KIEClient(key)
    const newResults: any[] = []
    try {
      for (const s of selected) {
        const fullPrompt = `${s.description}. ${s.dialogue ? `Dialogue: ${s.dialogue}.` : ''} ${s.camera ? `Camera: ${s.camera}.` : ''}`
        const res = await client.generateVideo({
          prompts: [fullPrompt], model: 'veo-3.1-fast', aspectRatio, enableFallback:true
        })
        const taskId = res.task_id
        const r = { id: s.id, scene: s.description, status: 'processing', taskId, url: '' }
        newResults.push(r)
        await supabase.from('content').insert({ type:'video', prompt: fullPrompt, model:'veo-3.1-fast', aspect_ratio: aspectRatio, status:'processing', kie_task_id: taskId })
      }
      setResults(prev => [...newResults,...prev])
      toast.success('Videos queued! Monitor in Library.')
      pollStatus(newResults)
    } catch (err:any) { toast.error(err.message || 'Video gen failed') }
    finally { setGeneratingVideo(false) }
  }

  function pollStatus(items: any[]) {
    const iv = setInterval(async () => {
      const key = getUserKIEKey(); if(!key) return; const client = new KIEClient(key)
      let done = 0
      for (const item of items) {
        if (item.status !== 'processing') { done++; continue }
        try {
          const st = await client.checkVideoStatus([item.taskId])
          const t = st[item.taskId] || st[0] || st
          if (t?.status==='completed' && t?.url) {
            item.status='completed'; item.url=t.url
            await supabase.from('content').update({status:'completed',result_url:t.url}).eq('kie_task_id', item.taskId)
          } else if (t?.status==='failed') { item.status='failed' }
          else { item.progress = Math.min(90, (item.progress||0)+10) }
        } catch {}
      }
      setResults(prev => [...prev])
      if (done === items.length) clearInterval(iv)
    }, 4000)
  }

  function toggleScene(id:number) { setScenes(prev => prev.map(s => s.id===id ? {...s,selected:!s.selected} : s)) }
  function removeScene(id:number) { setScenes(prev => prev.filter(s => s.id!==id)) }
  function editScene(id:number, field:string, val:string) { setScenes(prev => prev.map(s => s.id===id ? {...s,[field]:val} : s)) }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Film Maker</h1>
      <p className="text-muted-foreground">Turn a story idea into a multi-scene TikTok video series.</p>

      {!kieKey && (
        <Card className="bg-destructive/10 border-destructive/30"><CardContent className="p-4 text-sm"><strong>API Key Required:</strong> Add your KIE.AI key in Settings.</CardContent></Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <label className="text-sm font-medium">Story Idea</label>
              <textarea className="min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none"
                value={storyIdea} onChange={e=>setStoryIdea(e.target.value)}
                placeholder="e.g. A working mom discovers a new tudung that fits her busy morning rush perfectly"
              />
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm">Scenes</label>
                  <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={sceneCount} onChange={e=>setSceneCount(Number(e.target.value))}>
                    {[3,4,5].map(n => <option key={n} value={n}>{n} scenes</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm">Aspect Ratio</label>
                  <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={aspectRatio} onChange={e=>setAspectRatio(e.target.value)}>
                    {aspectRatios.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm">Dialogue</label>
                  <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={dialogueLanguage} onChange={e=>setDialogueLanguage(e.target.value)}>
                    <option value="ms">Bahasa Malaysia</option><option value="en">English</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleGenerateScenes} disabled={generatingScenes || !storyIdea} variant="outline">
                  <Sparkles className="w-4 h-4 mr-2" />{generatingScenes?'Generating...':'Generate Scenes'}
                </Button>
                <Button onClick={handleGenerateVideos} disabled={generatingVideo || !scenes.some(s=>s.selected)} className="ml-auto">
                  <Film className="w-4 h-4 mr-2" />{generatingVideo ? 'Rendering...' : `Render ${scenes.filter(s=>s.selected).length} Scene(s)`}
                </Button>
              </div>
            </CardContent>
          </Card>

          {scenes.length>0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">Scenes ({scenes.length})</h3>
              {scenes.map(s => (
                <Card key={s.id} className={s.selected ? 'border-primary' : 'border-muted'}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={s.selected} onChange={()=>toggleScene(s.id)} className="w-4 h-4" />
                      <span className="font-semibold text-sm">Scene {s.id}</span>
                      <button className="ml-auto" onClick={()=>removeScene(s.id)}><Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" /></button>
                    </div>
                    <textarea className="min-h-[60px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={s.description} onChange={e=>editScene(s.id,'description',e.target.value)} placeholder="Scene description..." />
                    <textarea className="min-h-[40px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={s.dialogue||''} onChange={e=>editScene(s.id,'dialogue',e.target.value)} placeholder="Dialogue (Bahasa Malaysia)..." />
                    <Input value={s.camera||''} onChange={e=>editScene(s.id,'camera',e.target.value)} placeholder="Camera shot (e.g. Close-up, Panning)" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">How It Works</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p><strong>1.</strong> Write a story idea</p>
              <p><strong>2.</strong> AI breaks it into scenes</p>
              <p><strong>3.</strong> Edit scenes freely</p>
              <p><strong>4.</strong> Render each as video</p>
              <p><strong>5.</strong> Download or post individually</p>
            </CardContent>
          </Card>
          {results.length>0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Results</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {results.map(r => (
                  <div key={r.id} className="border rounded-md p-3 space-y-2">
                    <p className="text-sm font-medium">Scene {r.id}</p>
                    {r.status==='completed' && r.url ? (
                      <><video src={r.url} controls className="w-full rounded" /><a href={r.url} target="_blank" rel="noopener noreferrer" className="text-primary text-sm flex items-center gap-1"><Download className="w-3 h-3"/> Download</a></>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className={`w-4 h-4 ${r.status==='processing'?'animate-spin':''}`}/>{r.status==='processing'?`${r.progress||0}%`:'Failed'}</div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}