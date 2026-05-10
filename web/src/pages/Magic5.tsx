import { useState } from 'react'
import {
  PenLine, Magnet, Hash, Clock, Image,
  Sparkles, WandSparkles, Loader2, Copy, Check
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { apiClient } from '../lib/api'
import { toast } from 'sonner'
import { loadBusinessProfile, getPromptPrefix, getCategoryExamples } from '../lib/businessContext'

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

const features = [
  {
    id: 'caption',
    icon: PenLine,
    label: 'Caption Rewriter',
    description: 'Rewrite captions with @mention, hashtags, and emojis auto-inserted.',
    placeholder: 'e.g. New collection just dropped! Perfect for this season...',
    example: 'New collection just dropped! Perfect for this season — shop now at our store',
    systemPrompt: (lang: string) => `You are a social media caption expert for ${getBizPrefix()}. Rewrite the given caption to be more engaging, include relevant hashtags (5-8), emojis, and a CTA. All output MUST be in ${LANGUAGE_NAMES[lang] || lang}. Return ONLY the rewritten caption text.`,
  },
  {
    id: 'hook',
    icon: Magnet,
    label: 'Hook Generator',
    description: 'Generate 5 viral hook variations for your topic or product.',
    placeholder: 'e.g. Trending product for this season',
    example: 'Trending product for this season',
    systemPrompt: (lang: string) => `You are a TikTok hook specialist for ${getBizPrefix()}. Generate 5 attention-grabbing hook variations for the given topic. Each hook should be 1-2 sentences, designed to stop scrolling. All hooks MUST be in ${LANGUAGE_NAMES[lang] || lang}. Format as numbered list.`,
  },
  {
    id: 'hashtag',
    icon: Hash,
    label: 'Hashtag Pack',
    description: 'Get trending + branded hashtags for your niche.',
    placeholder: 'e.g. fashion Malaysia',
    example: 'fashion Malaysia',
    systemPrompt: (lang: string) => `You are a hashtag strategist for ${getBizPrefix()}. Generate a complete hashtag pack for the given niche:
1. 10 trending hashtags (popular in the region)
2. 5 branded hashtag ideas
3. 5 niche-specific hashtags
Format each group with # prefix. All descriptive text MUST be in ${LANGUAGE_NAMES[lang] || lang}.`,
  },
  {
    id: 'schedule',
    icon: Clock,
    label: 'Auto-schedule',
    description: 'Get smart scheduling suggestions for TikTok Shop & IG posting.',
    placeholder: 'e.g. Promotional video for new collection',
    example: 'Promotional video for new collection',
    systemPrompt: (lang: string) => `You are a social media scheduling expert for ${getBizPrefix()}. For the given content description, provide:
1. Best posting times for each day of the week
2. Recommended platform (TikTok/IG/Shopee) for each time slot
3. Content type suggestion (Reel/Carousel/Story/Live)
4. Week-by-week content calendar for 2 weeks
All text MUST be in ${LANGUAGE_NAMES[lang] || lang}.`,
  },
  {
    id: 'thumbnail',
    icon: Image,
    label: 'Thumbnail Generator',
    description: 'Generate an AI thumbnail image for your video.',
    placeholder: 'e.g. Product showcase with professional lighting',
    example: 'Product showcase with professional lighting',
    systemPrompt: (lang: string) => `You are an AI image prompt engineer. Take the given thumbnail description and enhance it into a detailed, high-quality image generation prompt. Add details about: lighting, composition, colors, mood, style (photorealistic), aspect ratio (9:16 vertical for TikTok). Return ONLY the enhanced prompt text. Descriptive text in ${LANGUAGE_NAMES[lang] || lang}.`,
  },
]

function getBizPrefix(): string {
  const biz = loadBusinessProfile()
  return getPromptPrefix(biz) || 'e-commerce brands'
}

export default function Magic5() {
  const [active, setActive] = useState(features[0].id)
  const [dialogueLanguage, setDialogueLanguage] = useState('ms')
  const [values, setValues] = useState<Record<string, string>>({
    caption: features[0].example,
    hook: features[1].example,
    hashtag: features[2].example,
    schedule: features[3].example,
    thumbnail: features[4].example,
  })
  const [results, setResults] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const current = features.find(f => f.id === active)!
  const isTextarea = current.id === 'caption'

  async function handleGenerate() {
    if (!values[active]?.trim()) {
      toast.error('Please enter some content first')
      return
    }
    if (!apiClient.hasKIEKey()) {
      toast.error('Add your KIE.API key in Settings first')
      return
    }
    setLoading(true)
    try {
      if (active === 'thumbnail') {
        // Generate image for thumbnail
        const promptRes = await apiClient.generateTextSmart({
          system_prompt: current.systemPrompt(dialogueLanguage),
          user_message: values[active],
        })
        const enhancedPrompt = promptRes.result?.choices?.[0]?.message?.content
          || promptRes.data?.choices?.[0]?.message?.content
          || values[active]

        const imgRes = await apiClient.generateImage({
          prompt: enhancedPrompt,
          model: 'nano-banana-pro',
          aspectRatio: '9:16',
        })
        const taskResult = await pollForImage(imgRes.taskId, imgRes.recordInfoPath)
        setResults(prev => ({ ...prev, [active]: taskResult || 'Generation in progress...' }))
          apiClient.saveToLibrary({ type: 'image', prompt: values[active], model: 'nano-banana-pro', result_url: taskResult || '', status: 'completed' })
          toast.success('Thumbnail generated! 🖼️')
      } else {
        // Text generation
        const res = await apiClient.generateTextSmart({
          system_prompt: current.systemPrompt(dialogueLanguage),
          user_message: values[active],
        })
        const text = res.result?.choices?.[0]?.message?.content
          || res.data?.choices?.[0]?.message?.content
          || 'No result returned. Please try again.'
        setResults(prev => ({ ...prev, [active]: text }))
        apiClient.saveToLibrary({ type: 'text', prompt: values[active], model: 'gemini-2.5-flash', result_url: undefined, status: 'completed' })
        toast.success(`${current.label} done! ✨`)
      }
    } catch (err: any) {
      toast.error(err.message || 'Generation failed')
    } finally {
      setLoading(false)
    }
  }

  async function pollForImage(taskId: string, recordInfoPath: string): Promise<string | null> {
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 3000))
      try {
        const status = await apiClient.imageStatus([taskId])
        const task = status[taskId]
        if (task?.status === 'completed' && task?.url) return task.url
        if (task?.status === 'failed') return null
      } catch { /* keep polling */ }
    }
    return null
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(active)
    toast.success('Copied to clipboard!')
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Magic 5</h1>
          <p className="text-muted-foreground">5 AI-powered tools to supercharge your content.</p>
        </div>
      </div>

      {/* Feature selector tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {features.map(f => (
          <button
            key={f.id}
            onClick={() => setActive(f.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
              active === f.id
                ? 'bg-primary text-white shadow-md shadow-primary/25'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            }`}
          >
            <f.icon className="w-4 h-4" />
            {f.label}
          </button>
        ))}
      </div>

      {/* Language selector */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">Output Language:</label>
        <select className="h-9 rounded-md border bg-background px-3 text-sm"
          value={dialogueLanguage} onChange={e => setDialogueLanguage(e.target.value)}>
          {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
      </div>

      {/* Active feature panel */}
      <Card className="overflow-hidden">
        <div className="border-b border-border bg-gradient-to-r from-primary/5 to-transparent p-6">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${active === current.id ? 'bg-primary/20' : 'bg-muted'}`}>
              <current.icon className={`w-5 h-5 ${active === current.id ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <CardTitle>{current.label}</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">{current.description}</p>
            </div>
          </div>
        </div>
        <CardContent className="space-y-4 pt-6 pb-6">
          <label className="block text-sm font-medium text-foreground">
            {current.id === 'caption' ? 'Original caption' : current.id === 'hook' ? 'Topic or product' : current.id === 'hashtag' ? 'Topic / niche' : current.id === 'schedule' ? 'Content description' : 'Image description'}
          </label>
          {isTextarea ? (
            <textarea
              value={values[active]}
              onChange={e => setValues(prev => ({ ...prev, [active]: e.target.value }))}
              placeholder={current.placeholder}
              rows={4}
              className="flex w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:border-primary transition-shadow resize-none"
            />
          ) : (
            <Input
              value={values[active]}
              onChange={e => setValues(prev => ({ ...prev, [active]: e.target.value }))}
              placeholder={current.placeholder}
            />
          )}
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-muted-foreground">Try the example prompt above, or enter your own.</p>
            <Button onClick={handleGenerate} disabled={loading || !values[active]?.trim()} size="sm">
              {loading ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Generating…</> : <><WandSparkles className="w-4 h-4 mr-1.5" />Generate</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results[active] && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Result</CardTitle>
              {active !== 'thumbnail' && (
                <Button variant="outline" size="sm" onClick={() => handleCopy(results[active])}>
                  {copied === active ? <><Check className="w-3.5 h-3.5 mr-1" />Copied</> : <><Copy className="w-3.5 h-3.5 mr-1" />Copy</>}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {active === 'thumbnail' && results[active].startsWith('http') ? (
              <div className="space-y-3">
                <img src={results[active]} alt="Generated thumbnail" className="rounded-lg max-h-96 mx-auto" />
                <div className="flex items-center justify-center gap-2">
                  <a href={results[active]} target="_blank" rel="noopener noreferrer"
                    className="text-primary text-sm flex items-center gap-1">
                    Open Full Size ↗
                  </a>
                </div>
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{results[active]}</div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}