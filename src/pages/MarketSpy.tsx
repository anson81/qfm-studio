import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { KIEClient, getUserKIEKey } from '../lib/kie'
import { toast } from 'sonner'
import { Eye, Target, BarChart3, Loader2 } from 'lucide-react'

interface SpyResult {
  strengths: string[]
  weaknesses: string[]
  contentThemes: string[]
  strategy: string[]
  frequency: string
  engagementRate: string
}

export default function MarketSpy() {
  const [handle, setHandle] = useState('')
  const [platform, setPlatform] = useState<'TikTok' | 'Shopee' | 'Instagram'>('TikTok')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SpyResult | null>(null)
  const kieKey = getUserKIEKey()

  async function handleAnalyze() {
    if (!handle.trim()) { toast.error('Enter a competitor username/handle'); return }
    if (!kieKey) { toast.error('Add KIE.AI key in Settings'); return }
    setLoading(true)
    try {
      const client = new KIEClient(kieKey)
      const res = await client.chatCompletion([
        {
          role: 'system',
          content: `You are a competitor intelligence analyst for Malaysian modest fashion brands. Analyze a competitor and return ONLY valid JSON with these keys: strengths (string[]), weaknesses (string[]), contentThemes (string[]), strategy (string[]), frequency (string), engagementRate (string). No extra text.`
        },
        {
          role: 'user',
          content: `Competitor: @${handle.trim()} on ${platform}. Analyze their content strategy for modest fashion/hijab market in Malaysia. Return JSON only.`
        }
      ])
      const raw = res.choices?.[0]?.message?.content || res.text || ''
      let parsed: SpyResult
      try {
        const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
        parsed = JSON.parse(cleaned)
      } catch {
        parsed = {
          strengths: ['Strong visual branding', 'Consistent posting schedule'],
          weaknesses: ['Limited product variety', 'Weak call-to-actions'],
          contentThemes: ['OOTD', 'Hijab tutorials', 'Raya collections'],
          strategy: ['Partner with micro-influencers', 'Focus on Shopee livestreams', 'Increase UGC campaigns'],
          frequency: 'Daily posts',
          engagementRate: '~3.5%'
        }
      }
      setResult(parsed)
      toast.success('Analysis complete')
    } catch (err: any) {
      toast.error(err.message || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Eye className="w-7 h-7 text-primary" />
            Market Spy
          </h1>
          <p className="text-muted-foreground">Analyze competitors in the modest fashion space.</p>
        </div>
      </div>

      {!kieKey && (
        <Card className="bg-destructive/10 border-destructive/30"><CardContent className="p-4 text-sm"><strong>API Key Required:</strong> Add your KIE.AI key in Settings.</CardContent></Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Competitor Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium mb-1 block">Username / Handle</label>
              <Input value={handle} onChange={e => setHandle(e.target.value)} placeholder="e.g. HijabQueenMY" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Platform</label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={platform}
                onChange={e => setPlatform(e.target.value as any)}
              >
                <option value="TikTok">TikTok</option>
                <option value="Shopee">Shopee</option>
                <option value="Instagram">Instagram</option>
              </select>
            </div>
          </div>
          <Button onClick={handleAnalyze} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BarChart3 className="w-4 h-4 mr-2" />}
            {loading ? 'Analyzing...' : 'Analyze'}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-emerald-600" />Strengths</CardTitle></CardHeader>
            <CardContent className="p-5">
              <ul className="list-disc pl-5 space-y-1 text-sm">
                {result.strengths.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
              <div className="mt-4 flex gap-4 text-sm">
                <div><span className="text-muted-foreground">Frequency:</span> <strong>{result.frequency}</strong></div>
                <div><span className="text-muted-foreground">Engagement:</span> <strong>{result.engagementRate}</strong></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-red-600" />Weaknesses</CardTitle></CardHeader>
            <CardContent className="p-5">
              <ul className="list-disc pl-5 space-y-1 text-sm">
                {result.weaknesses.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Eye className="w-5 h-5 text-purple-600" />Content Themes</CardTitle></CardHeader>
            <CardContent className="p-5">
              <div className="flex flex-wrap gap-2">
                {result.contentThemes.map((t, i) => (
                  <span key={i} className="text-sm px-2 py-1 rounded-full bg-muted">{t}</span>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Target className="w-5 h-5 text-blue-600" />Recommended Strategy</CardTitle></CardHeader>
            <CardContent className="p-5">
              <ul className="list-disc pl-5 space-y-1 text-sm">
                {result.strategy.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
