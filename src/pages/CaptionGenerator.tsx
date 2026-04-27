import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { KIEClient, getUserKIEKey } from '../lib/kie'
import { toast } from 'sonner'
import { Copy, Check, Loader2, Sparkles, Languages, MessageSquare } from 'lucide-react'

interface CaptionResult {
  caption: string
  hashtags: string
  copied: boolean
}

const toneLabels: Record<string, { bm: string; en: string }> = {
  funny: { bm: 'Kelakar / Santai', en: 'Funny / Relatable' },
  informative: { bm: 'Informatif / Edukatif', en: 'Informative / Educational' },
  sexy: { bm: 'Yakin & Berani (Modest)', en: 'Confident & Bold (Modest)' },
}

export default function CaptionGenerator() {
  const [description, setDescription] = useState('')
  const [tone, setTone] = useState<'funny' | 'informative' | 'sexy'>('funny')
  const [language, setLanguage] = useState<'bm' | 'en'>('bm')
  const [count, setCount] = useState(3)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<CaptionResult[]>([])

  async function handleGenerate() {
    if (!description.trim()) {
      toast.error(language === 'bm' ? 'Sila isi penerangan produk' : 'Please enter a product description')
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
        ? 'Anda adalah penulis kandungan TikTok/Instagram untuk Queen Fashion Malaysia, platform fesyen wanita Muslim Malaysia. Hasilkan kapsyen menarik dalam Bahasa Malaysia yang santai, relevan dengan budaya Malaysia, dan mematuhi nilai kesopanan (modest fashion). Kembalikan JSON array sahaja dengan key "caption" dan "hashtags".'
        : 'You are a TikTok/Instagram copywriter for Queen Fashion Malaysia, a Malaysian Muslim women\'s modest fashion brand. Generate catchy captions in English with Malaysian cultural relevance and modest fashion values. Return ONLY a JSON array with keys "caption" and "hashtags".'

      const userPrompt = `Product: ${description}\nTone: ${tone}\nLanguage: ${language.toUpperCase()}\nCount: ${count}\nGenerate ${count} TikTok/Instagram captions.${language === 'bm' ? ' Guna Bahasa Malaysia yang santai, gaul, dan mesra TikTok. Sertakan hashtag yang relevan dengan fesyen Muslim wanita Malaysia.' : ' Use casual, TikTok-friendly English with Malaysian warmth. Include hashtags relevant to Muslim women fashion in Malaysia.'}`

      const res = await client.chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ])

      const raw = res.choices?.[0]?.message?.content || res.text || ''
      let parsed: CaptionResult[] = []
      try {
        const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
        const arr = JSON.parse(cleaned)
        if (Array.isArray(arr)) {
          parsed = arr.map((item: any) => ({
            caption: String(item.caption || item.text || item),
            hashtags: String(item.hashtags || ''),
            copied: false,
          }))
        } else {
          parsed = [{ caption: String(arr.caption || arr.text || raw), hashtags: String(arr.hashtags || ''), copied: false }]
        }
      } catch {
        parsed = raw.split('\n').filter((x: string) => x.trim()).map((c: string) => ({ caption: c, hashtags: '', copied: false }))
      }
      setResults(parsed.slice(0, count))
      toast.success(language === 'bm' ? `${parsed.length} kapsyen dihasilkan!` : `${parsed.length} captions generated!`)
    } catch (err: any) {
      toast.error(err.message || (language === 'bm' ? 'Gagal hasilkan kapsyen' : 'Failed to generate captions'))
    } finally {
      setLoading(false)
    }
  }

  function copyText(text: string, idx: number) {
    navigator.clipboard.writeText(text)
    setResults(prev => prev.map((r, i) => (i === idx ? { ...r, copied: true } : r)))
    toast.success(language === 'bm' ? 'Disalin ke papan klip' : 'Copied to clipboard')
    setTimeout(() => {
      setResults(prev => prev.map((r, i) => (i === idx ? { ...r, copied: false } : r)))
    }, 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <MessageSquare className="w-7 h-7 text-primary" />
          {language === 'bm' ? 'Penjana Kapsyen' : 'Caption Generator'}
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
            {language === 'bm' ? 'Butiran Produk & Nada' : 'Product Details & Tone'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">
              {language === 'bm' ? 'Penerangan Produk' : 'Product Description'}
            </label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              placeholder={language === 'bm' ? 'Contoh: Baju kurung moden warna dusty pink, lace di leher, sesuai untuk raya dan kenduri...' : 'E.g. Modern dusty pink baju kurung with lace neckline, perfect for Raya and weddings...'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                {language === 'bm' ? 'Nada / Tone' : 'Tone'}
              </label>
              <div className="flex flex-wrap gap-2">
                {(['funny', 'informative', 'sexy'] as const).map((t) => (
                  <Button
                    key={t}
                    variant={tone === t ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTone(t)}
                  >
                    {toneLabels[t][language]}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                {language === 'bm' ? 'Bilangan Kapsyen' : 'Number of Captions'}
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={count}
                  onChange={(e) => setCount(Math.min(10, Math.max(1, Number(e.target.value))))}
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">1-10</span>
              </div>
            </div>
          </div>

          <Button className="w-full" onClick={handleGenerate} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {language === 'bm' ? 'Menjana...' : 'Generating...'}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                {language === 'bm' ? 'Hasilkan Kapsyen' : 'Generate Captions'}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">
            {language === 'bm' ? 'Keputusan' : 'Results'}
          </h2>
          {results.map((item, idx) => (
            <Card key={idx}>
              <CardContent className="p-5 space-y-3">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.caption}</p>
                {item.hashtags && (
                  <p className="text-sm text-primary font-medium">{item.hashtags}</p>
                )}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => copyText(item.caption + (item.hashtags ? ' ' + item.hashtags : ''), idx)}>
                    {item.copied ? <Check className="w-4 h-4 mr-1 text-green-600" /> : <Copy className="w-4 h-4 mr-1" />}
                    {item.copied ? (language === 'bm' ? 'Disalin' : 'Copied') : (language === 'bm' ? 'Salin' : 'Copy')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
