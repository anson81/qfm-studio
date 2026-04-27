import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs'
import { KIEClient, getUserKIEKey } from '../lib/kie'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { Camera, Loader2, Upload, Download, RefreshCw } from 'lucide-react'

const UGC_SYSTEM = `You are a UGC content creator specializing in Malaysian modest fashion.
Create a product placement scene description for AI image generation.

Guidelines:
- Model: natural Malaysian Malay woman, wearing modest fashion.
- Hijab color should complement or contrast product color elegantly.
- Location: relatable Malaysian setting (home/cafe/mall/pasar).
- Style: UGC/organic, natural lighting, no studio look.
- Pose: showing/using the product naturally.
- Return ONLY: a single image generation prompt (not JSON).`

export default function UGCGenerator() {
  const [productImage, setProductImage] = useState<string | null>(null)
  const [productFile, setProductFile] = useState<File | null>(null)
  const [modelStyle, setModelStyle] = useState('casual')
  const [modelGender, setModelGender] = useState('female')
  const [ethnicity, setEthnicity] = useState('Malaysian Malay')
  const [pose, setPose] = useState('showing')
  const [location, setLocation] = useState('home')
  const [scenes, setScenes] = useState<any[]>([])
  const [generating, setGenerating] = useState(false)
  const [kieKey] = useState(getUserKIEKey)

  const styles = ['casual','elegant','street','formal','sporty','minimal']
  const poses = [
    {value:'showing',label:'Showing the product'},
    {value:'wearing',label:'Wearing/using it'},
    {value:'holding',label:'Holding package'},
  ]
  const locations = [
    {value:'home',label:'Living room (home)'},
    {value:'bedroom',label:'Bedroom mirror'},
    {value:'cafe',label:'Cafe/Mamak'},
    {value:'mall',label:'Shopping mall'},
    {value:'outdoor',label:'Park/Pasar area'},
    {value:'workplace',label:'Office/workspace'},
  ]

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setProductFile(f)
    const url = URL.createObjectURL(f)
    setProductImage(url)
  }

  async function handleGenerate() {
    if (!productImage) { toast.error('Upload a product image'); return }
    const key = kieKey
    if (!key) { toast.error('Add KIE.AI key in Settings'); return }
    setGenerating(true)
    try {
      const client = new KIEClient(key)
      const poseText = poses.find(p=>p.value===pose)?.label || pose
      const locText = locations.find(l=>l.value===location)?.label || location
      const userPrompt = `Create a ${modelStyle} UGC photo: ${ethnicity} ${modelGender} ${poseText} in ${locText}. Product: modest fashion.`
      const res = await client.chatCompletion([
        { role: 'system', content: UGC_SYSTEM },
        { role: 'user', content: userPrompt }
      ])
      const prompt = res.choices?.[0]?.message?.content || res.text || userPrompt
      const stylePrefix = `UGC-style, ${modelStyle}, natural lighting, ${location === 'home' ? 'cozy Malaysian home' : locText}. `
      const fullPrompt = `${stylePrefix}${prompt}`.trim()

      // Generate image via KIE
      const imgRes = await client.generateImage({
        prompt: fullPrompt, model: 'flux-kontext-pro', aspectRatio: '9:16', numImages: 1
      })
      const taskId = imgRes.task_id
      const newScene = { id: Date.now().toString(), prompt: fullPrompt, status: 'processing', taskId, url: '', locText, poseText }
      setScenes(prev => [newScene,...prev])
      await supabase.from('content').insert({ type:'image', prompt: fullPrompt, model:'flux-kontext-pro', aspect_ratio:'9:16', status:'processing', kie_task_id: taskId })
      toast.success('UGC image queued!')
      pollImage(newScene)
    } catch (err:any) { toast.error(err.message || 'Generation failed') }
    finally { setGenerating(false) }
  }

  async function handleRegenerateScene(scene: any) {
    const key = kieKey
    if (!key) return
    setScenes(prev => prev.map(s => s.id===scene.id ? {...s, status:'processing', progress:0} : s))
    try {
      const client = new KIEClient(key)
      const imgRes = await client.generateImage({ prompt: scene.prompt, model: 'flux-kontext-pro', aspectRatio: '9:16', numImages: 1 })
      setScenes(prev => prev.map(s => s.id===scene.id ? {...s, taskId: imgRes.task_id, status:'processing', url:''} : s))
      pollImage({...scene, taskId: imgRes.task_id})
    } catch { toast.error('Regenerate failed') }
  }

  function pollImage(scene: any) {
    const iv = setInterval(async () => {
      const key = getUserKIEKey(); if (!key) return
      const client = new KIEClient(key)
      try {
        const st = await client.checkImageStatus([scene.taskId])
        const t = st[scene.taskId] || st[0] || st
        if (t?.status === 'completed' && t?.url) {
          clearInterval(iv)
          setScenes(prev => prev.map(s => s.id===scene.id ? {...s, status:'completed', url:t.url} : s))
          await supabase.from('content').update({ status:'completed', result_url:t.url }).eq('kie_task_id', scene.taskId)
        } else if (t?.status === 'failed') {
          clearInterval(iv)
          setScenes(prev => prev.map(s => s.id===scene.id ? {...s, status:'failed'} : s))
        }
      } catch { clearInterval(iv) }
    }, 4000)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">UGC Generator</h1>
      <p className="text-muted-foreground">Upload a product photo, customize the model and scene, and generate UGC-style content.</p>

      {!kieKey && (
        <Card className="bg-destructive/10 border-destructive/30"><CardContent className="p-4 text-sm"><strong>API Key Required:</strong> Add your KIE.AI key in Settings.</CardContent></Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div>
                <label className="text-sm font-medium">Product Image</label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center mt-2 cursor-pointer hover:border-primary/50 transition-colors" onClick={()=>document.getElementById('ugc-upload')?.click()}>
                  {productImage ? (
                    <img src={productImage} alt="Product" className="w-full h-48 object-contain rounded" />
                  ) : (
                    <><Camera className="w-10 h-10 mx-auto mb-2 text-muted-foreground" /><p className="text-sm text-muted-foreground">Click or drag product image here</p></>
                  )}
                </div>
                <input id="ugc-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </div>

              <div>
                <label className="text-sm font-medium">Style</label>
                <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={modelStyle} onChange={e=>setModelStyle(e.target.value)}>
                  {styles.map(s => <option key={s} value={s}>{s[0].toUpperCase()+s.slice(1)}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Gender</label>
                <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={modelGender} onChange={e=>setModelGender(e.target.value)}>
                  <option value="female">Female</option><option value="male">Male</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Ethnicity</label>
                <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={ethnicity} onChange={e=>setEthnicity(e.target.value)}>
                  <option value="Malaysian Malay">Malaysian Malay</option>
                  <option value="Chinese Malaysian">Chinese Malaysian</option>
                  <option value="Indian Malaysian">Indian Malaysian</option>
                  <option value="Mixed Malaysian">Mixed Malaysian</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Pose</label>
                <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={pose} onChange={e=>setPose(e.target.value)}>
                  {poses.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Location</label>
                <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={location} onChange={e=>setLocation(e.target.value)}>
                  {locations.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>

              <Button onClick={handleGenerate} disabled={generating || !productImage} className="w-full">
                <Camera className="w-4 h-4 mr-2" />{generating ? 'Generating...' : 'Generate UGC Image'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {scenes.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground text-center">
              <Camera className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">No UGC content yet</p>
              <p className="text-sm">Upload a product image and configure your model to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {scenes.map(s => (
                <Card key={s.id} className="overflow-hidden">
                  <div className="aspect-[9/16] bg-muted flex items-center justify-center relative">
                    {s.status === 'completed' && s.url ? (
                      <img src={s.url} alt="UGC" className="w-full h-full object-cover" />
                    ) : s.status === 'processing' ? (
                      <div className="text-center"><Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-muted-foreground" /><p className="text-sm text-muted-foreground">Generating...</p></div>
                    ) : (
                      <div className="text-center"><p className="text-sm text-red-500">Failed</p></div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <p className="text-xs font-medium truncate">{s.locText} · {s.poseText}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{s.prompt.slice(0,80)}...</p>
                    <div className="flex gap-2">
                      {s.url && <Button variant="outline" size="sm" onClick={()=>window.open(s.url,'_blank')}><Download className="w-3 h-3" /></Button>}
                      <Button variant="outline" size="sm" onClick={()=>handleRegenerateScene(s)} disabled={s.status==='processing'}><RefreshCw className="w-3 h-3" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
