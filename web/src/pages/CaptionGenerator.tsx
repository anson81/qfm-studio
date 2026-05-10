import { useState } from 'react'
import { loadBusinessProfile, getPromptPrefix } from '../lib/businessContext'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { apiClient } from '../lib/api'
import { toast } from 'sonner'
import { MessageSquare, Copy, RefreshCw, Loader2 } from 'lucide-react'

const PLATFORMS = ['TikTok', 'Instagram', 'Shopee', 'Facebook']
const TONES = ['Professional', 'Casual', 'Playful', 'Inspirational', 'Urgent']

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

export default function CaptionGenerator() {
  const biz = loadBusinessProfile()
  const [product, setProduct] = useState('')
  const [platform, setPlatform] = useState('TikTok')
  const [tone, setTone] = useState('Casual')
  const [dialogueLanguage, setDialogueLanguage] = useState('ms')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleGenerate() {
    if (!apiClient.hasKIEKey()) { toast.error('Add your KIE.API key in Settings first'); return }
    if (!product.trim()) { toast.error('Describe your product first'); return }
    setLoading(true); setResult('')
    try {
      const res = await apiClient.generateTextSmart({
        system_prompt: `You are a marketing copywriter specializing in ${getPromptPrefix(biz)}. Create 3 engaging social media captions for ${platform}. Tone: ${tone}. Language: ${LANGUAGE_NAMES[dialogueLanguage]}. All content MUST be in ${LANGUAGE_NAMES[dialogueLanguage]}. Include relevant emojis and 5-8 hashtags. Focus on ${tone.toLowerCase()} tone that drives engagement and sales. Format: Numbered list, each caption with its own hashtags.`,
        user_message: `Product/Collection: ${product}`,
        model: 'claude-sonnet-4-5'
      })
      const text = res.result?.choices?.[0]?.message?.content || res.result?.text || res.data?.choices?.[0]?.message?.content || JSON.stringify(res.result)
      setResult(text)
      apiClient.saveToLibrary({ type: 'text', prompt: product, model: 'caption-generator', status: 'completed', result_url: text || "" })
      toast.success('Captions generated!')
    } catch (err: any) { toast.error(err.message || 'Generation failed') }
    finally { setLoading(false) }
  }

  function handleCopy() {
    navigator.clipboard.writeText(result)
    toast.success('Copied to clipboard!')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Caption Generator</h1>
        <p className="text-muted-foreground">AI-powered captions for your fashion content</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5" /> Create Captions</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Product / Collection Description</label>
            <textarea className="w-full p-3 bg-sidebar border border-sidebar-border rounded-lg text-white min-h-[100px] resize-y" value={product} onChange={(e) => setProduct(e.target.value)} placeholder="e.g., New Baju Kurung collection in pastel tones..." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Platform</label>
              <select className="w-full p-2 bg-sidebar border border-sidebar-border rounded-lg text-white" value={platform} onChange={(e) => setPlatform(e.target.value)}>
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Tone</label>
              <select className="w-full p-2 bg-sidebar border border-sidebar-border rounded-lg text-white" value={tone} onChange={(e) => setTone(e.target.value)}>
                {TONES.map(t => <option key={t} value={t}>{t}</option>)}
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
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><RefreshCw className="w-4 h-4 mr-2" /> Generate Captions</>}
          </Button>
        </CardContent>
      </Card>
      {result && (
        <Card>
          <CardHeader><CardTitle className="flex items-center justify-between">Generated Captions <Button variant="ghost" onClick={handleCopy}><Copy className="w-4 h-4" /></Button></CardTitle></CardHeader>
          <CardContent><div className="p-4 bg-sidebar border border-sidebar-border rounded-lg whitespace-pre-wrap text-sm">{result}</div></CardContent>
        </Card>
      )}
    </div>
  )
}