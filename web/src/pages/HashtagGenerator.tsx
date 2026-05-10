import { useState } from 'react'
import { loadBusinessProfile, getPromptPrefix } from '../lib/businessContext'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { apiClient } from '../lib/api'
import { toast } from 'sonner'
import { Hash, Copy, Loader2 } from 'lucide-react'

const PLATFORMS = ['TikTok', 'Instagram', 'Shopee', 'Facebook']

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

export default function HashtagGenerator() {
  const biz = loadBusinessProfile()
  const [description, setDescription] = useState('')
  const [platform, setPlatform] = useState('TikTok')
  const [dialogueLanguage, setDialogueLanguage] = useState('ms')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleGenerate() {
    if (!apiClient.hasKIEKey()) { toast.error('Add your KIE.API key in Settings first'); return }
    if (!description.trim()) { toast.error('Describe your content first'); return }
    setLoading(true); setResult('')
    try {
      const res = await apiClient.generateTextSmart({
        system_prompt: `You are a hashtag strategist for e-commerce, specializing in ${getPromptPrefix(biz)}. Language: ${LANGUAGE_NAMES[dialogueLanguage]}. All content MUST be in ${LANGUAGE_NAMES[dialogueLanguage]}. Generate optimized hashtags for ${platform}. Include: 1) Trending hashtags (high volume), 2) Niche hashtags (targeted), 3) Branded hashtags. Format: Three sections with counts, total hashtag count at the end. Keep each hashtag relevant and under 30 characters.`,
        user_message: `Content/Product: ${description}`,
        model: 'claude-sonnet-4-5'
      })
      const text = res.result?.choices?.[0]?.message?.content || res.result?.text || res.data?.choices?.[0]?.message?.content || JSON.stringify(res.result)
      setResult(text)
      apiClient.saveToLibrary({ type: 'text', prompt: description, model: 'hashtag-generator', status: 'completed', result_url: text || "" })
      toast.success('Hashtags generated!')
    } catch (err: any) { toast.error(err.message || 'Generation failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Hashtag Generator</h1>
        <p className="text-muted-foreground">Optimized hashtags for maximum reach on every platform</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Hash className="w-5 h-5" /> Generate Hashtags</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Content / Product Description</label>
            <textarea className="w-full p-3 bg-sidebar border border-sidebar-border rounded-lg text-white min-h-[100px] resize-y" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g., Modern Hijab styling for Raya, Baju Kurung collection in earthy tones..." />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Platform</label>
            <select className="w-full p-2 bg-sidebar border border-sidebar-border rounded-lg text-white" value={platform} onChange={(e) => setPlatform(e.target.value)}>
              {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Language</label>
            <select className="w-full p-2 bg-sidebar border border-sidebar-border rounded-lg text-white" value={dialogueLanguage} onChange={e => setDialogueLanguage(e.target.value)}>
              {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
          <Button onClick={handleGenerate} disabled={loading} className="w-full">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><Hash className="w-4 h-4 mr-2" /> Generate Hashtags</>}
          </Button>
        </CardContent>
      </Card>
      {result && (
        <Card>
          <CardHeader><CardTitle className="flex items-center justify-between">Your Hashtags <Button variant="ghost" onClick={() => { navigator.clipboard.writeText(result); toast.success('Copied!') }}><Copy className="w-4 h-4" /></Button></CardTitle></CardHeader>
          <CardContent><div className="p-4 bg-sidebar border border-sidebar-border rounded-lg whitespace-pre-wrap text-sm">{result}</div></CardContent>
        </Card>
      )}
    </div>
  )
}