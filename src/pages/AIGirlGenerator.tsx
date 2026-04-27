import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { KIEClient, getUserKIEKey } from '../lib/kie'
import { toast } from 'sonner'
import { User, Palette, Camera, Loader2, Download } from 'lucide-react'

interface GeneratedImage {
  id: string
  url: string
  prompt: string
  ethnicity: string
  style: string
  hijabColor: string
  background: string
  createdAt: string
}

const ETHNICITIES = ['Malay', 'Chinese', 'Indian', 'Mixed'] as const
const STYLES = ['Casual', 'Elegant', 'Sporty'] as const
const HIJAB_COLORS = ['Dusty Pink', 'Nude', 'Black', 'White', 'Pastel Purple', 'Mint Green', 'Rose Gold'] as const
const BACKGROUNDS = ['Minimal white studio', 'Outdoor garden', 'Urban street', 'Cafe interior', 'Batik backdrop', 'Sunset beach', 'Shopping mall'] as const

const STORAGE_KEY = 'qfm_ai_girls'

export default function AIGirlGenerator() {
  const [ethnicity, setEthnicity] = useState<(typeof ETHNICITIES)[number]>('Malay')
  const [style, setStyle] = useState<(typeof STYLES)[number]>('Elegant')
  const [hijabColor, setHijabColor] = useState('Dusty Pink')
  const [background, setBackground] = useState('Minimal white studio')
  const [customNote, setCustomNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [generatingPrompt, setGeneratingPrompt] = useState(false)
  const [result, setResult] = useState<GeneratedImage | null>(null)
  const kieKey = getUserKIEKey()

  async function generatePromptAndImage() {
    if (!kieKey) { toast.error('Add KIE.AI key in Settings'); return }
    setGeneratingPrompt(true)
    try {
      const client = new KIEClient(kieKey)
      const system = `You are an AI image prompt engineer for Queen Fashion Malaysia. Return ONLY a JSON object: { prompt: string, negativePrompt: string }. The prompt must be detailed, under 500 chars, and describe a modest fashion model photo.`
      const user = `Create a prompt for an AI fashion model image:\nEthnicity: ${ethnicity}\nStyle: ${style}\nHijab color: ${hijabColor}\nBackground: ${background}\nExtra note: ${customNote || 'None'}`
      const res = await client.chatCompletion([
        { role: 'system', content: system },
        { role: 'user', content: user },
      ])
      const raw = res.choices?.[0]?.message?.content || res.text || ''
      let parsed: { prompt: string; negativePrompt: string }
      try {
        const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
        parsed = JSON.parse(cleaned)
      } catch {
        parsed = {
          prompt: `Professional modest fashion photo of a ${ethnicity.toLowerCase()} woman wearing ${style.toLowerCase()} ${hijabColor.toLowerCase()} hijab and baju kurung, ${background.toLowerCase()}, soft natural lighting, elegant pose, high quality fashion photography, hijabista style`,
          negativePrompt: 'revealing clothing, inappropriate, low quality, blurry'
        }
      }
      setGeneratingPrompt(false)
      await generateImage(parsed.prompt, parsed.negativePrompt)
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate prompt')
      setGeneratingPrompt(false)
    }
  }

  async function generateImage(prompt: string, negativePrompt?: string) {
    if (!kieKey) return
    setLoading(true)
    try {
      const client = new KIEClient(kieKey)
      const res = await client.generateImage({
        prompt,
        aspectRatio: '9:16',
        numImages: 1,
        negativePrompt,
      })
      const taskId = res.task_id || res.data?.task_id
      let url = ''
      if (taskId) {
        const dl = await client.getDownloadUrl(taskId)
        url = dl.download_url || dl.url || ''
      }
      if (!url && res.image_url) url = res.image_url
      if (!url && res.data?.image_url) url = res.data.image_url
      if (!url) throw new Error('No image URL returned')

      const item: GeneratedImage = {
        id: crypto.randomUUID(),
        url,
        prompt,
        ethnicity,
        style,
        hijabColor,
        background,
        createdAt: new Date().toISOString(),
      }
      setResult(item)
      saveToGallery(item)
      toast.success('Image generated and saved to gallery')
    } catch (err: any) {
      toast.error(err.message || 'Image generation failed')
    } finally {
      setLoading(false)
    }
  }

  function saveToGallery(item: GeneratedImage) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const arr: GeneratedImage[] = raw ? JSON.parse(raw) : []
      arr.unshift(item)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr.slice(0, 100)))
    } catch {}
  }

  async function downloadImage(url: string, filename?: string) {
    try {
      const a = document.createElement('a')
      a.href = url
      a.download = filename || `ai-girl-${Date.now()}.png`
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      toast.success('Download started')
    } catch {
      toast.error('Download failed')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Camera className="w-7 h-7 text-primary" />
            AI Girl Generator
          </h1>
          <p className="text-muted-foreground">Generate AI fashion models for Queen Fashion Malaysia campaigns.</p>
        </div>
        <Button variant="outline" onClick={() => window.location.hash = '#/ai-girl-gallery'}>
          Open Gallery
        </Button>
      </div>

      {!kieKey && (
        <Card className="bg-destructive/10 border-destructive/30"><CardContent className="p-4 text-sm"><strong>API Key Required:</strong> Add your KIE.AI key in Settings.</CardContent></Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            Model Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block"><User className="w-3.5 h-3.5 inline mr-1" />Ethnicity</label>
              <div className="flex flex-wrap gap-2">
                {ETHNICITIES.map(e => (
                  <Button key={e} variant={ethnicity === e ? 'default' : 'outline'} size="sm" onClick={() => setEthnicity(e)}>{e}</Button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block"><Palette className="w-3.5 h-3.5 inline mr-1" />Style</label>
              <div className="flex flex-wrap gap-2">
                {STYLES.map(s => (
                  <Button key={s} variant={style === s ? 'default' : 'outline'} size="sm" onClick={() => setStyle(s)}>{s}</Button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Hijab Color</label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={hijabColor}
                onChange={e => setHijabColor(e.target.value)}
              >
                {HIJAB_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Background</label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={background}
                onChange={e => setBackground(e.target.value)}
              >
                {BACKGROUNDS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Extra Note / Prompt Override</label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Optional: add specific details like 'wearing floral baju kurung'"
              value={customNote}
              onChange={e => setCustomNote(e.target.value)}
            />
          </div>

          <Button onClick={generatePromptAndImage} disabled={loading || generatingPrompt} className="w-full sm:w-auto">
            {(loading || generatingPrompt) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Camera className="w-4 h-4 mr-2" />}
            {generatingPrompt ? 'Crafting prompt...' : loading ? 'Generating...' : 'Generate AI Girl'}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader><CardTitle>Result</CardTitle></CardHeader>
          <CardContent className="p-5 space-y-4">
            <img src={result.url} alt={result.prompt} className="w-full max-w-md rounded-lg border object-cover" />
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="px-2 py-1 rounded-full bg-muted">{result.ethnicity}</span>
              <span className="px-2 py-1 rounded-full bg-muted">{result.style}</span>
              <span className="px-2 py-1 rounded-full bg-muted">{result.hijabColor}</span>
              <span className="px-2 py-1 rounded-full bg-muted">{result.background}</span>
            </div>
            <p className="text-xs text-muted-foreground">{result.prompt}</p>
            <Button variant="outline" onClick={() => downloadImage(result.url, `ai-girl-${result.id}.png`)}>
              <Download className="w-4 h-4 mr-2" /> Download
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
