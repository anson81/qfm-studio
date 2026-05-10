import { useState } from 'react'
import { loadBusinessProfile, getPromptPrefix } from '../lib/businessContext'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { apiClient } from '../lib/api'
import { toast } from 'sonner'
import { Megaphone, Copy, Loader2 } from 'lucide-react'

const CAMPAIGN_TYPES = ['Flash Sale', 'New Collection Launch', 'Seasonal Campaign (Raya/Merdeka)', 'Clearance', 'Brand Awareness']

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

export default function CampaignManager() {
  const biz = loadBusinessProfile()
  const [brief, setBrief] = useState('')
  const [dialogueLanguage, setDialogueLanguage] = useState('ms')
  const [campaignType, setCampaignType] = useState('New Collection Launch')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleGenerate() {
    if (!brief.trim()) { toast.error('Enter your campaign brief'); return }
    if (!apiClient.hasKIEKey()) { toast.error('Add your KIE.API key in Settings first'); return }
    setLoading(true); setResult('')
    try {
      const res = await apiClient.generateTextSmart({
        system_prompt: `You are an e-commerce campaign manager specializing in ${getPromptPrefix(biz)}. Language: ${LANGUAGE_NAMES[dialogueLanguage]}. All content MUST be in ${LANGUAGE_NAMES[dialogueLanguage]}. Create a complete campaign plan for a ${campaignType}. Include: 1) Campaign Name & Tagline, 2) Duration & Phases (Pre-launch, Launch, Sustain, Close), 3) Content Pillars (3-5 themes), 4) Platform Strategy, 5) KPIs & Targets, 6) Budget Allocation %, 7) Daily Action Items. Be specific with numbers and timelines.`,
        user_message: `Campaign Brief: ${brief}`,
        model: 'claude-sonnet-4-5'
      })
      const text = res.result?.choices?.[0]?.message?.content || res.result?.text || res.data?.choices?.[0]?.message?.content || JSON.stringify(res.result)
      setResult(text)
      apiClient.saveToLibrary({ type: 'text', prompt: brief, model: 'campaign-manager', status: 'completed', result_url: text || "" })
      toast.success('Campaign plan generated!')
    } catch (err: any) { toast.error(err.message || 'Generation failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Campaign Manager</h1>
        <p className="text-muted-foreground">Plan and execute fashion sales campaigns with AI</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Megaphone className="w-5 h-5" /> Create Campaign</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Campaign Brief</label>
            <textarea className="w-full p-3 bg-sidebar border border-sidebar-border rounded-lg text-white min-h-[120px] resize-y" value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="e.g., Raya 2026 collection launch — 50 new Baju Kurung designs, targeting women 25-45, budget RM5,000..." />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Campaign Type</label>
            <select className="w-full p-2 bg-sidebar border border-sidebar-border rounded-lg text-white" value={campaignType} onChange={(e) => setCampaignType(e.target.value)}>
              {CAMPAIGN_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
                <div>
                  <label className="text-sm">Language</label>
                  <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={dialogueLanguage} onChange={e=> setDialogueLanguage(e.target.value)}>
                    {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>
          <Button onClick={handleGenerate} disabled={loading} className="w-full">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Planning...</> : <><Megaphone className="w-4 h-4 mr-2" /> Create Campaign Plan</>}
          </Button>
        </CardContent>
      </Card>
      {result && (
        <Card>
          <CardHeader><CardTitle className="flex items-center justify-between">Campaign Plan <Button variant="ghost" onClick={() => { navigator.clipboard.writeText(result); toast.success('Copied!') }}><Copy className="w-4 h-4" /></Button></CardTitle></CardHeader>
          <CardContent><div className="p-4 bg-sidebar border border-sidebar-border rounded-lg whitespace-pre-wrap text-sm">{result}</div></CardContent>
        </Card>
      )}
    </div>
  )
}