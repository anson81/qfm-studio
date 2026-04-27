import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { KIEClient, getUserKIEKey } from '../lib/kie'
import { toast } from 'sonner'
import { Sparkles, Loader2, Download } from 'lucide-react'

const OUTFITS = ['Baju Kurung','Tudung Plain','Tudung Pattern','Baju Melayu','Kebaya','Modest Dress','Casual Tunic','Sporty Hijab']
const COLORS = ['Baby Blue','Pastel Pink','Dusty Rose','Nude Beige','Emerald Green','Maroon','Black','White','Lilac']
const BACKGROUNDS = ['Studio White','Bedroom','Garden','Cafe','Mall','Mosque','Office','Beach']

export default function AIGirlOutfitSwap() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [outfit, setOutfit] = useState('Baju Kurung')
  const [color, setColor] = useState('Pastel Pink')
  const [background, setBackground] = useState('Garden')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const kieKey = getUserKIEKey()

  async function handleGenerate() {
    if (!kieKey) { toast.error('Add KIE.AI key in Settings'); return }
    setGenerating(true)
    try {
      const client = new KIEClient(kieKey)
      const prompt = `Photorealistic Malaysian Malay woman wearing ${color.toLowerCase()} ${outfit.toLowerCase()} with matching hijab, standing in a ${background.toLowerCase()} setting, UGC-style natural lighting, organic social media content feel, 9:16 vertical format.`
      const res = await client.generateImage({ prompt, model: 'flux-kontext-pro', aspectRatio: '9:16', numImages: 1 })
      const taskId = res.task_id
      // Poll
      const iv = setInterval(async () => {
        try {
          const st = await client.checkImageStatus([taskId])
          const t = st[taskId] || st[0] || st
          if (t?.status === 'completed' && t?.url) {
            clearInterval(iv)
            setResult(t.url)
            toast.success('Outfit generated!')
          } else if (t?.status === 'failed') {
            clearInterval(iv)
            toast.error('Generation failed')
          }
        } catch { clearInterval(iv) }
      }, 4000)
    } catch (err:any) { toast.error(err.message || 'Failed') }
    finally { setGenerating(false) }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">AI Girl Outfit Swap</h1>
      <p className="text-muted-foreground">Generate your AI model wearing different outfits for your brand.</p>

      {!kieKey && (
        <Card className="bg-destructive/10 border-destructive/30"><CardContent className="p-4 text-sm"><strong>API Key Required:</strong> Add your KIE.AI key in Settings.</CardContent></Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Card><CardContent className="p-5 space-y-4">
            <div><label className="text-sm font-medium">Outfit</label>
              <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={outfit} onChange={e=>setOutfit(e.target.value)}>
                {OUTFITS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div><label className="text-sm font-medium">Color</label>
              <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={color} onChange={e=>setColor(e.target.value)}>
                {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><label className="text-sm font-medium">Background</label>
              <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={background} onChange={e=>setBackground(e.target.value)}>
                {BACKGROUNDS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <Button onClick={handleGenerate} disabled={generating} className="w-full">
              <Sparkles className="w-4 h-4 mr-2" />{generating ? 'Swapping...' : 'Generate Outfit'}
            </Button>
          </CardContent></Card>
        </div>

        <Card className="flex items-center justify-center min-h-[400px]">
          <CardContent className="p-5 text-center w-full">
            {result ? (
              <>
                <img src={result} alt="AI Girl" className="w-full h-[500px] object-cover rounded-lg mb-3" />
                <Button variant="outline" onClick={()=> window.open(result, '_blank')}><Download className="w-4 h-4 mr-2" /> Download</Button>
              </>
            ) : generating ? (
              <div><Loader2 className="w-10 h-10 animate-spin mx-auto mb-3" /><p className="text-muted-foreground">Generating...</p></div>
            ) : (
              <p className="text-muted-foreground">Select outfit and click generate to see your AI model</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
