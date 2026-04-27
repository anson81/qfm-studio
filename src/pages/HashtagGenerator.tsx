import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { KIEClient, getUserKIEKey } from '../lib/kie'
import { toast } from 'sonner'
import { Copy, Check, Loader2, Hash, Languages, RefreshCw } from 'lucide-react'

interface TagResult {
  text: string
  copied: boolean
}

const trendingTags: Record<'bm' | 'en', string[]> = {
  bm: [
    '#BajuKurung',
    '#FesyenMuslimah',
    '#OOTDHijab',
    '#Raya2025',
    '#QueenFashion',
    '#FesyenMalaysia',
    '#BajuRaya',
    '#Hijabista',
    '#ModestFashionMY',
    '#WanitaBerkerjaya',
  ],
  en: [
    '#BajuKurung',
    '#MuslimahFashion',
    '#OOTDHijab',
    '#Raya2025',
    '#QueenFashion',
    '#MalaysianFashion',
    '#HalalStyle',
    '#Hijabista',
    '#ModestFashionMY',
    '#WorkingMuslimah',
  ],
}

export default function HashtagGenerator() {
  const [keywords, setKeywords] = useState('')
  const [count, setCount] = useState(15)
  const [language, setLanguage] = useState<'bm' | 'en'>('bm')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<TagResult[]>([])
  const [trendingOpen, setTrendingOpen] = useState(false)

  async function handleGenerate() {
    if (!keywords.trim()) {
      toast.error(language === 'bm' ? 'Sila masukkan kata kunci niche' : 'Please enter niche keywords')
      return
    }
    const key = getUserKIEKey()
    if (!key) {
      toast.error(language === 'bm' ? 'Sila tambah kunci KIE.AI di Tetapan' : 'Please add your KIE.AI key in Settings')
      return
    }
    setLoading(true)
    try {
      const client = new KIEClient(key)
      const systemPrompt = language === 'bm'
        ? `Anda adalah pakar hashtag TikTok/Instagram untuk jenama fesyen wanita Muslim Malaysia. Hasilkan ${count} hashtag yang relevan dalam Bahasa Malaysia dan Inggeris. Format: JSON array string sahaja (setiap item bermula dengan #). Tiada penjelasan tambahan.`
        : `You are a TikTok/Instagram hashtag expert for a Malaysian Muslim women's modest fashion brand. Generate ${count} relevant hashtags in English and Malay. Format: JSON array of strings only (each starting with #). No extra explanation.`

      const userPrompt = `Niche keywords: ${keywords}\nLanguage: ${language.toUpperCase()}\nCount: ${count}\nGenerate ${count} hashtags for modest fashion content targeting Malaysian Muslim women. Mix branded, trending, and niche tags.`

      const res = await client.chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ])

      const raw = res.choices?.[0]?.message?.content || res.text || ''
      let parsed: TagResult[] = []
      try {
        const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
        const arr = JSON.parse(cleaned)
        if (Array.isArray(arr)) {
          parsed = arr.map((item: any) => ({ text: String(item.tag || item.hashtag || item).trim(), copied: false }))
        } else {
          parsed = [{ text: String(arr.tag || arr.hashtag || raw).trim(), copied: false }]
        }
      } catch {
        parsed = raw
          .split(/[\n,]/)
          .map((s: string) => s.trim())
          .filter((s: string) => s)
          .map((s: string) => ({ text: s.startsWith('#') ? s : `#${s}`, copied: false }))
      }
      setResults(parsed.slice(0, count))
      toast.success(language === 'bm' ? `${parsed.length} hashtag dihasilkan!` : `${parsed.length} hashtags generated!`)
    } catch (err: any) {
      toast.error(err.message || (language === 'bm' ? 'Gagal hasilkan hashtag' : 'Failed to generate hashtags'))
    } finally {
      setLoading(false)
    }
  }

  function copyTag(text: string, idx: number) {
    navigator.clipboard.writeText(text)
    setResults(prev => prev.map((r, i) => (i === idx ? { ...r, copied: true } : r)))
    toast.success(language === 'bm' ? 'Disalin ke papan klip' : 'Copied to clipboard')
    setTimeout(() => {
      setResults(prev => prev.map((r, i) => (i === idx ? { ...r, copied: false } : r)))
    }, 2000)
  }

  function copyAll() {
    const all = results.map((r) => r.text).join(' ')
    navigator.clipboard.writeText(all)
    toast.success(language === 'bm' ? 'Semua hashtag disalin!' : 'All hashtags copied!')
  }

  function addTrending(tag: string) {
    if (results.some((r) => r.text === tag)) return
    setResults((prev) => [...prev, { text: tag, copied: false }])
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Hash className="w-7 h-7 text-primary" />
          {language === 'bm' ? 'Penjana Hashtag' : 'Hashtag Generator'}
        </h1>
        <div className="flex gap-2">
          <Button variant={language === 'bm' ? 'default' : 'outline'} size="sm" onClick={() => setLanguage('bm')} aria-label="Bahasa Malaysia">
            <Languages className="w-4 h-4 mr-1" /> BM
          </Button>
          <Button variant={language === 'en' ? 'default' : 'outline'} size="sm" onClick={() => setLanguage('en')} aria-label="English">
            <Languages className="w-4 h-4 mr-1" /> EN
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {language === 'bm' ? 'Kata Kunci Niche & Tetapan' : 'Niche Keywords & Settings'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">
              {language === 'bm' ? 'Kata Kunci Niche' : 'Niche Keywords'}
            </label>
            <Input
              placeholder={language === 'bm' ? 'Contoh: baju kurung moden, lace, raya, dusty pink' : 'E.g. modern baju kurung, lace, raya, dusty pink'}
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">
              {language === 'bm' ? 'Bilangan Hashtag' : 'Number of Hashtags'}
            </label>
            <div className="flex items-center gap-3">
              <Input
                type="range"
                min={5}
                max={30}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full"
              />
              <span className="text-sm font-bold w-8 text-right">{count}</span>
            </div>
            <p className="text-xs text-muted-foreground">5-30</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setTrendingOpen((v) => !v)}>
              <RefreshCw className="w-4 h-4 mr-1" />
              {language === 'bm' ? (trendingOpen ? 'Sembunyi Trending' : 'Tunjuk Trending') : (trendingOpen ? 'Hide Trending' : 'Show Trending')}
            </Button>
          </div>

          {trendingOpen && (
            <div className="rounded-md border bg-muted/40 p-3 space-y-2">
              <p className="text-sm font-medium">
                {language === 'bm' ? 'Hashtag Trending untuk Fesyen Muslimah Malaysia:' : 'Trending Hashtags for Malaysian Modest Fashion:'}
              </p>
              <div className="flex flex-wrap gap-2">
                {trendingTags[language].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => addTrending(tag)}
                    className="text-sm px-2 py-1 rounded-full bg-secondary text-secondary-foreground hover:bg-primary/20 transition"
                    type="button"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button className="w-full" onClick={handleGenerate} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {language === 'bm' ? 'Menjana...' : 'Generating...'}
              </>
            ) : (
              <>
                <Hash className="w-4 h-4 mr-2" />
                {language === 'bm' ? 'Hasilkan Hashtag' : 'Generate Hashtags'}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {language === 'bm' ? `Hashtag Anda (${results.length})` : `Your Hashtags (${results.length})`}
              </CardTitle>
              <Button size="sm" variant="outline" onClick={copyAll}>
                <Copy className="w-4 h-4 mr-1" />
                {language === 'bm' ? 'Salin Semua' : 'Copy All'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <div className="flex flex-wrap gap-2">
              {results.map((item, idx) => (
                <button
                  key={`${item.text}-${idx}`}
                  onClick={() => copyTag(item.text, idx)}
                  className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition"
                  type="button"
                >
                  {item.copied ? <Check className="w-3.5 h-3.5" /> : <Hash className="w-3.5 h-3.5" />}
                  {item.text}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
