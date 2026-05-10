import { useState } from 'react'
import { loadBusinessProfile, getPromptPrefix } from '../lib/businessContext'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { apiClient } from '../lib/api'
import { toast } from 'sonner'
import { Users, Copy, Loader2 } from 'lucide-react'

const UGC_TYPES = ['Product Review', 'Unboxing', 'Styling Tutorial', 'Get Ready With Me', 'OOTD (Outfit of the Day)', 'Testimonial']
const PLATFORMS = ['TikTok', 'Instagram Reels', 'Shopee Video', 'YouTube Shorts']

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

export default function UGCGenerator() {
  const biz = loadBusinessProfile()
  const [product, setProduct] = useState('')
  const [ugcType, setUgcType] = useState('Product Review')
  const [platform, setPlatform] = useState('TikTok')
  const [dialogueLanguage, setDialogueLanguage] = useState('ms')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleGenerate() {
    if (!apiClient.hasKIEKey()) { toast.error('Add your KIE.API key in Settings first'); return }
    if (!product.trim()) { toast.error('Describe your product first'); return }
    setLoading(true); setResult('')
    try {
      const res = await apiClient.generateTextSmart({
        system_prompt: `You are a UGC (User-Generated Content) specialist for ${getPromptPrefix(biz)}. Language: ${LANGUAGE_NAMES[dialogueLanguage]}. All content MUST be in ${LANGUAGE_NAMES[dialogueLanguage]}. Create a complete UGC script/plan for a ${ugcType} video on ${platform}. Include: 1) Hook (first 3 seconds — scroll-stopper), 2) Script with timestamps, 3) Visual directions (camera angles, transitions), 4) Dialogue/Narration, 5) Hashtags (8-12), 6) Caption for the post, 7) CTA (call-to-action). Make it authentic, not overly polished. Real people energy.`,
        user_message: `Product: ${product}`,
        model: 'claude-sonnet-4-5'
      })
      const text = res.result?.choices?.[0]?.message?.content || res.result?.text || res.data?.choices?.[0]?.message?.content || JSON.stringify(res.result)
      setResult(text)
      apiClient.saveToLibrary({ type: 'text', prompt: product, model: 'ugc-generator', status: 'completed', result_url: text || "" })
      toast.success('UGC script created!')
    } catch (err: any) { toast.error(err.message || 'Generation failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">UGC Generator</h1>
        <p className="text-muted-foreground">Create authentic user-generated content scripts for your fashion brand</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Create UGC Script</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Product Description</label>
            <textarea className="w-full p-3 bg-sidebar border border-sidebar-border rounded-lg text-white min-h-[100px] resize-y" value={product} onChange={(e) => setProduct(e.target.value)} placeholder="e.g., Premium Baju Kurung in dusty pink, RM189, cotton-blend fabric, perfect for Raya..." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">UGC Type</label>
              <select className="w-full p-2 bg-sidebar border border-sidebar-border rounded-lg text-white" value={ugcType} onChange={(e) => setUgcType(e.target.value)}>
                {UGC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Platform</label>
              <select className="w-full p-2 bg-sidebar border border-sidebar-border rounded-lg text-white" value={platform} onChange={(e) => setPlatform(e.target.value)}>
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
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
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : <><Users className="w-4 h-4 mr-2" /> Generate UGC Script</>}
          </Button>
        </CardContent>
      </Card>
      {result && (
        <Card>
          <CardHeader><CardTitle className="flex items-center justify-between">UGC Script <Button variant="ghost" onClick={() => { navigator.clipboard.writeText(result); toast.success('Copied!') }}><Copy className="w-4 h-4" /></Button></CardTitle></CardHeader>
          <CardContent><div className="p-4 bg-sidebar border border-sidebar-border rounded-lg whitespace-pre-wrap text-sm">{result}</div></CardContent>
        </Card>
      )}
    </div>
  )
}