import { useState } from 'react'
import { loadBusinessProfile, getPromptPrefix } from '../lib/businessContext'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { apiClient } from '../lib/api'
import { toast } from 'sonner'
import { Zap, Copy, Loader2 } from 'lucide-react'

const HOOK_TYPES = ['Question', 'Shocking Stat', 'Story', 'Controversial', 'Direct', 'Curiosity Gap']
const VIDEO_TYPES = ['Product Showcase', 'Try-On Haul', 'Styling Tutorial', 'Before/After', 'Get Ready With Me', 'Unboxing']

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

export default function HookGenerator() {
  const biz = loadBusinessProfile()
  const [topic, setTopic] = useState('')
  const [hookType, setHookType] = useState('Curiosity Gap')
  const [videoType, setVideoType] = useState('Product Showcase')
  const [dialogueLanguage, setDialogueLanguage] = useState('ms')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleGenerate() {
    if (!apiClient.hasKIEKey()) { toast.error('Add your KIE.API key in Settings first'); return }
    if (!topic.trim()) { toast.error('Enter your video topic'); return }
    setLoading(true); setResult('')
    try {
      const res = await apiClient.generateTextSmart({
        system_prompt: `You are a viral hook specialist for TikTok and Reels, focusing on ${getPromptPrefix(biz)}. Create 5 scroll-stopping hooks using the ${hookType} pattern for a ${videoType} video. Language: ${LANGUAGE_NAMES[dialogueLanguage]}. All content MUST be in ${LANGUAGE_NAMES[dialogueLanguage]}. Each hook must be under 3 seconds to say. Format: numbered list with hook + brief explanation of why it works.`,
        user_message: `Topic: ${topic}`,
        model: 'claude-sonnet-4-5'
      })
      const text = res.result?.choices?.[0]?.message?.content || res.result?.text || res.data?.choices?.[0]?.message?.content || JSON.stringify(res.result)
      setResult(text)
      apiClient.saveToLibrary({ type: 'text', prompt: topic, model: 'hook-generator', status: 'completed', result_url: text || "" })
      toast.success('Hooks generated!')
    } catch (err: any) { toast.error(err.message || 'Generation failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Hook Generator</h1>
        <p className="text-muted-foreground">Create scroll-stopping video hooks for TikTok & Reels</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Zap className="w-5 h-5" /> Create Hooks</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Video Topic / Product</label>
            <textarea className="w-full p-3 bg-sidebar border border-sidebar-border rounded-lg text-white min-h-[80px] resize-y" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g., New Hijab collection launch, Baju Kurung styling tips..." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Hook Type</label>
              <select className="w-full p-2 bg-sidebar border border-sidebar-border rounded-lg text-white" value={hookType} onChange={(e) => setHookType(e.target.value)}>
                {HOOK_TYPES.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Video Type</label>
              <select className="w-full p-2 bg-sidebar border border-sidebar-border rounded-lg text-white" value={videoType} onChange={(e) => setVideoType(e.target.value)}>
                {VIDEO_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Language</label>
            <select className="w-full p-2 bg-sidebar border border-sidebar-border rounded-lg text-white" value={dialogueLanguage} onChange={e => setDialogueLanguage(e.target.value)}>
              {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
          <Button onClick={handleGenerate} disabled={loading} className="w-full">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><Zap className="w-4 h-4 mr-2" /> Generate Hooks</>}
          </Button>
        </CardContent>
      </Card>
      {result && (
        <Card>
          <CardHeader><CardTitle className="flex items-center justify-between">Your Hooks <Button variant="ghost" onClick={() => { navigator.clipboard.writeText(result); toast.success('Copied!') }}><Copy className="w-4 h-4" /></Button></CardTitle></CardHeader>
          <CardContent><div className="p-4 bg-sidebar border border-sidebar-border rounded-lg whitespace-pre-wrap text-sm">{result}</div></CardContent>
        </Card>
      )}
    </div>
  )
}