import { useState } from 'react'
import { loadBusinessProfile, getPromptPrefix } from '../lib/businessContext'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { apiClient } from '../lib/api'
import { toast } from 'sonner'
import { TrendingUp, Copy, Loader2 } from 'lucide-react'

const CATEGORIES = ['Modest Fashion', 'Hijab Styles', 'Baju Kurung', 'Accessories', 'Formal Wear', 'Casual Modest']
const TIMEFRAMES = ['Next 3 Months', 'Next 6 Months', 'Next 12 Months']

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

export default function TrendForecaster() {
  const biz = loadBusinessProfile()
  const [category, setCategory] = useState('Modest Fashion')
  const [dialogueLanguage, setDialogueLanguage] = useState('ms')
  const [timeframe, setTimeframe] = useState('Next 3 Months')
  const [context, setContext] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleForecast() {
    if (!apiClient.hasKIEKey()) { toast.error('Add your KIE.API key in Settings first'); return }
    setLoading(true); setResult('')
    try {
      const res = await apiClient.generateTextSmart({
        system_prompt: `You are a trend forecaster specializing in ${getPromptPrefix(biz)}. Language: ${LANGUAGE_NAMES[dialogueLanguage]}. All content MUST be in ${LANGUAGE_NAMES[dialogueLanguage]}. Forecast trends for: ${category} over ${timeframe}. Include: 1) Top 5 Emerging Trends (with confidence %), 2) Color Palette Predictions, 3) Material & Product Trends, 4) Consumer Behavior Shifts, 5) Influencer/Macro Trends, 6) Action Items for a business to capitalize on each trend. Be specific and actionable. Cite relevant cultural events that drive trends.`,
        user_message: context ? `Additional context: ${context}` : `Forecast ${category} trends for ${timeframe}.`,
        model: 'claude-sonnet-4-5'
      })
      const text = res.result?.choices?.[0]?.message?.content || res.result?.text || res.data?.choices?.[0]?.message?.content || JSON.stringify(res.result)
      setResult(text)
      apiClient.saveToLibrary({ type: 'text', prompt: context || category, model: 'trend-forecaster', status: 'completed', result_url: text || "" })
      toast.success('Trends forecasted!')
    } catch (err: any) { toast.error(err.message || 'Forecast failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Trend Forecaster</h1>
        <p className="text-muted-foreground">Predict upcoming modest fashion trends with AI</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Forecast Trends</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Category</label>
              <select className="w-full p-2 bg-sidebar border border-sidebar-border rounded-lg text-white" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Timeframe</label>
              <select className="w-full p-2 bg-sidebar border border-sidebar-border rounded-lg text-white" value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
                {TIMEFRAMES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Additional Context (optional)</label>
            <textarea className="w-full p-3 bg-sidebar border border-sidebar-border rounded-lg text-white min-h-[80px] resize-y" value={context} onChange={(e) => setContext(e.target.value)} placeholder="e.g., Target audience is young professionals 25-35, budget range RM150-RM400..." />
          </div>
          <div>
            <label className="text-sm text-gray-300">Language</label>
            <select className="h-10 w-full rounded-md border border-sidebar-border bg-sidebar text-white px-3 text-sm" value={dialogueLanguage} onChange={e=> setDialogueLanguage(e.target.value)}>
              {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
          <Button onClick={handleForecast} disabled={loading} className="w-full">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Forecasting...</> : <><TrendingUp className="w-4 h-4 mr-2" /> Forecast Trends</>}
          </Button>
        </CardContent>
      </Card>
      {result && (
        <Card>
          <CardHeader><CardTitle className="flex items-center justify-between">Trend Forecast <Button variant="ghost" onClick={() => { navigator.clipboard.writeText(result); toast.success('Copied!') }}><Copy className="w-4 h-4" /></Button></CardTitle></CardHeader>
          <CardContent><div className="p-4 bg-sidebar border border-sidebar-border rounded-lg whitespace-pre-wrap text-sm">{result}</div></CardContent>
        </Card>
      )}
    </div>
  )
}