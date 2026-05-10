import { useState } from 'react'
import { loadBusinessProfile, getPromptPrefix } from '../lib/businessContext'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { apiClient } from '../lib/api'
import { toast } from 'sonner'
import { BarChart3, TrendingUp, RefreshCw, Loader2 } from 'lucide-react'

const METRICS = ['Revenue', 'Orders', 'Conversion Rate', 'Avg Order Value', 'Return Rate', 'Customer Growth']
const PLATFORMS = ['TikTok Shop', 'Shopee', 'Combined']

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

export default function AnalyticsPage() {
  const biz = loadBusinessProfile()
  const [question, setQuestion] = useState('')
  const [dialogueLanguage, setDialogueLanguage] = useState('ms')
  const [platform, setPlatform] = useState('TikTok Shop')
  const [metric, setMetric] = useState('Revenue')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleAnalyze() {
    if (!question.trim()) { toast.error('Describe what you want to analyze'); return }
    if (!apiClient.hasKIEKey()) { toast.error('Add your KIE.API key in Settings first'); return }
    setLoading(true); setResult('')
    try {
      const res = await apiClient.generateTextSmart({
        system_prompt: `You are an e-commerce analytics expert specializing in ${getPromptPrefix(biz)}. Language: ${LANGUAGE_NAMES[dialogueLanguage]}. All content MUST be in ${LANGUAGE_NAMES[dialogueLanguage]}. Analyze the business question and provide actionable insights with specific numbers, trends, and recommendations. Focus on ${platform} platform, ${metric} metric. Format with clear sections: Key Findings, Trend Analysis, Actionable Recommendations, and Quick Wins.`,
        user_message: question,
        model: 'claude-sonnet-4-5'
      })
      const text = res.result?.choices?.[0]?.message?.content || res.result?.text || res.data?.choices?.[0]?.message?.content || JSON.stringify(res.result)
      setResult(text)
      apiClient.saveToLibrary({ type: 'text', model: 'analytics', prompt: question, status: 'completed', result_url: text || "" })
      toast.success('Analysis complete!')
    } catch (err: any) { toast.error(err.message || 'Analysis failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><BarChart3 className="w-8 h-8" /> Analytics</h1>
        <p className="text-muted-foreground">AI-powered business analytics for your fashion store</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Ask Your Data</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">What do you want to analyze?</label>
            <textarea className="w-full p-3 bg-sidebar border border-sidebar-border rounded-lg text-white min-h-[100px] resize-y" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g., Why did my TikTok sales drop last week? What products should I promote for Hari Raya?" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Platform</label>
              <select className="w-full p-2 bg-sidebar border border-sidebar-border rounded-lg text-white" value={platform} onChange={(e) => setPlatform(e.target.value)}>
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Focus Metric</label>
              <select className="w-full p-2 bg-sidebar border border-sidebar-border rounded-lg text-white" value={metric} onChange={(e) => setMetric(e.target.value)}>
                {METRICS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-300">Language</label>
            <select className="h-10 w-full rounded-md border border-sidebar-border bg-sidebar text-white px-3 text-sm" value={dialogueLanguage} onChange={e=> setDialogueLanguage(e.target.value)}>
              {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
          <Button onClick={handleAnalyze} disabled={loading} className="w-full">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</> : <><RefreshCw className="w-4 h-4 mr-2" /> Analyze</>}
          </Button>
        </CardContent>
      </Card>
      {result && (
        <Card>
          <CardHeader><CardTitle>Analysis Results</CardTitle></CardHeader>
          <CardContent><div className="p-4 bg-sidebar border border-sidebar-border rounded-lg whitespace-pre-wrap text-sm">{result}</div></CardContent>
        </Card>
      )}
    </div>
  )
}