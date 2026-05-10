import { useState } from 'react'
import { loadBusinessProfile, getPromptPrefix } from '../lib/businessContext'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { apiClient } from '../lib/api'
import { toast } from 'sonner'
import { Calendar, Copy, Loader2 } from 'lucide-react'

const DURATIONS = ['1 Week', '2 Weeks', '1 Month']
const PLATFORMS = ['TikTok + Instagram', 'TikTok Only', 'Instagram Only', 'All Platforms']

const LANGUAGES = [
  { value: 'ms', label: 'Bahasa Malaysia' },
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文 (Mandarin)' },
  { value: 'zh-hk', label: '粤语 (Cantonese)' },
  { value: 'ta', label: 'தமிழ் (Tamil)' },
]

const LANGUAGE_NAMES: Record<string, string> = {
  'ms': 'Bahasa Malaysia',
  'en': 'English',
  'zh': '中文 (Mandarin)',
  'zh-hk': '粤语 (Cantonese)',
  'ta': 'தமிழ் (Tamil)',
}

export default function ContentPlanner() {
  const biz = loadBusinessProfile()
  const [brand, setBrand] = useState('')
  const [dialogueLanguage, setDialogueLanguage] = useState('ms')
  const [duration, setDuration] = useState('1 Week')
  const [platforms, setPlatforms] = useState('TikTok + Instagram')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleGenerate() {
    if (!brand.trim()) { toast.error('Enter your brand/product focus'); return }
    if (!apiClient.hasKIEKey()) { toast.error('Add your KIE.API key in Settings first'); return }
    setLoading(true); setResult('')
    try {
      const res = await apiClient.generateTextSmart({
        system_prompt: `You are a social media content strategist specializing in ${getPromptPrefix(biz)}. Language: ${LANGUAGE_NAMES[dialogueLanguage]}. All content MUST be in ${LANGUAGE_NAMES[dialogueLanguage]}. Create a detailed ${duration} content calendar for ${platforms}. For each day include: 1) Date/Day, 2) Content type (Reel/Carousel/Story/Live), 3) Caption idea, 4) Hashtags (5-8), 5) Best posting time. Variety is key: mix educational, entertaining, and promotional content. Include at least 2 LIVE sessions and 1 product launch. Format as a structured calendar.`,
        user_message: `Brand/Focus: ${brand}`,
        model: 'claude-sonnet-4-5'
      })
      const text = res.result?.choices?.[0]?.message?.content || res.result?.text || res.data?.choices?.[0]?.message?.content || JSON.stringify(res.result)
      setResult(text)
      apiClient.saveToLibrary({ type: 'text', prompt: brand, model: 'content-planner', status: 'completed', result_url: text || "" })
      toast.success('Content plan generated!')
    } catch (err: any) { toast.error(err.message || 'Generation failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Content Planner</h1>
        <p className="text-muted-foreground">AI-powered content calendar for your fashion brand</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5" /> Create Content Plan</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Brand / Product Focus</label>
            <textarea className="w-full p-3 bg-sidebar border border-sidebar-border rounded-lg text-white min-h-[80px] resize-y" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g., Queen Fashion Malaysia — Baju Kurung & Hijab collection for Raya 2026..." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Duration</label>
              <select className="w-full p-2 bg-sidebar border border-sidebar-border rounded-lg text-white" value={duration} onChange={(e) => setDuration(e.target.value)}>
                {DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Platforms</label>
              <select className="w-full p-2 bg-sidebar border border-sidebar-border rounded-lg text-white" value={platforms} onChange={(e) => setPlatforms(e.target.value)}>
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
                <div>
                  <label className="text-sm">Language</label>
                  <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={dialogueLanguage} onChange={e=> setDialogueLanguage(e.target.value)}>
                    {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>
          <Button onClick={handleGenerate} disabled={loading} className="w-full">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><Calendar className="w-4 h-4 mr-2" /> Generate Plan</>}
          </Button>
        </CardContent>
      </Card>
      {result && (
        <Card>
          <CardHeader><CardTitle className="flex items-center justify-between">Your Content Plan <Button variant="ghost" onClick={() => { navigator.clipboard.writeText(result); toast.success('Copied!') }}><Copy className="w-4 h-4" /></Button></CardTitle></CardHeader>
          <CardContent><div className="p-4 bg-sidebar border border-sidebar-border rounded-lg whitespace-pre-wrap text-sm">{result}</div></CardContent>
        </Card>
      )}
    </div>
  )
}