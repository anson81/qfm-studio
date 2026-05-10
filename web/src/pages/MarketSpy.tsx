import { useState } from 'react'
import { loadBusinessProfile, getPromptPrefix } from '../lib/businessContext'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { apiClient } from '../lib/api'
import { toast } from 'sonner'
import { Search, Copy, Loader2 } from 'lucide-react'

const FOCUS_AREAS = ['Pricing Strategy', 'Content & Branding', 'Customer Experience', 'Product Mix', 'All Areas']

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

export default function MarketSpy() {
  const biz = loadBusinessProfile()
  const [query, setQuery] = useState('')
  const [dialogueLanguage, setDialogueLanguage] = useState('ms')
  const [focus, setFocus] = useState('All Areas')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleAnalyze() {
    if (!query.trim()) { toast.error('Enter what you want to analyze'); return }
    if (!apiClient.hasKIEKey()) { toast.error('Add your KIE.API key in Settings first'); return }
    setLoading(true); setResult('')
    try {
      const res = await apiClient.generateTextSmart({
        system_prompt: `You are a market analyst specializing in e-commerce, particularly ${getPromptPrefix(biz)}. Language: ${LANGUAGE_NAMES[dialogueLanguage]}. All content MUST be in ${LANGUAGE_NAMES[dialogueLanguage]}. Analyze the market landscape focusing on ${focus}. Include: 1) Market Size & Trends, 2) Top 5 Competitors & Their Strategy, 3) Content Gap Opportunities, 4) Pricing Analysis, 5) Recommended Actions. Be specific with data points, percentages, and local currency figures where possible.`,
        user_message: `Analyze: ${query}`,
        model: 'claude-sonnet-4-5'
      })
      const text = res.result?.choices?.[0]?.message?.content || res.result?.text || JSON.stringify(res.result)
      setResult(text)
      apiClient.saveToLibrary({ type: 'text', prompt: query, model: 'market-spy', status: 'completed', result_url: text || "" })
      toast.success('Analysis complete!')
    } catch (err: any) { toast.error(err.message || 'Analysis failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Market Spy</h1>
        <p className="text-muted-foreground">Analyze market trends, competitors, and opportunities</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Search className="w-5 h-5" /> Market Analysis</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">What do you want to analyze?</label>
            <textarea className="w-full p-3 bg-sidebar border border-sidebar-border rounded-lg text-white min-h-[100px] resize-y" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g., Baju Kurung market on Shopee Malaysia, modest fashion TikTok trends, competitor analysis of [brand]..." />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Focus Area</label>
            <select className="w-full p-2 bg-sidebar border border-sidebar-border rounded-lg text-white" value={focus} onChange={(e) => setFocus(e.target.value)}>
              {FOCUS_AREAS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-300">Language</label>
            <select className="h-10 w-full rounded-md border border-sidebar-border bg-sidebar text-white px-3 text-sm" value={dialogueLanguage} onChange={e=> setDialogueLanguage(e.target.value)}>
              {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
          <Button onClick={handleAnalyze} disabled={loading} className="w-full">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</> : <><Search className="w-4 h-4 mr-2" /> Analyze Market</>}
          </Button>
        </CardContent>
      </Card>
      {result && (
        <Card>
          <CardHeader><CardTitle className="flex items-center justify-between">Market Analysis <Button variant="ghost" onClick={() => { navigator.clipboard.writeText(result); toast.success('Copied!') }}><Copy className="w-4 h-4" /></Button></CardTitle></CardHeader>
          <CardContent><div className="p-4 bg-sidebar border border-sidebar-border rounded-lg whitespace-pre-wrap text-sm">{result}</div></CardContent>
        </Card>
      )}
    </div>
  )
}