import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { KIEClient, getUserKIEKey } from '../lib/kie'
import { toast } from 'sonner'
import { Copy, Check, Loader2, Zap, Languages } from 'lucide-react'

interface HookResult {
  text: string
  copied: boolean
}

const emotionLabels: Record<string, { bm: string; en: string }> = {
  curiosity: { bm: 'Rasa ingin tahu', en: 'Curiosity' },
  desire: { bm: 'Keinginan / Hasrat', en: 'Desire' },
  fear: { bm: 'Takut ketinggalan (FOMO)', en: 'Fear of Missing Out' },
  joy: { bm: 'Sukacita / Gembira', en: 'Joy' },
}

export default function HookGenerator() {
  const [description, setDescription] = useState('')
  const [emotion, setEmotion] = useState<'curiosity' | 'desire' | 'fear' | 'joy'>('curiosity')
  const [language, setLanguage] = useState<'bm' | 'en'>('bm')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<HookResult[]>([])

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
        ? 'Anda adalah penulis hook viral TikTok untuk Queen Fashion Malaysia, jenama fesyen wanita Muslim Malaysia. Hasilkan 5 ayat pembuka (hook) yang menarik perhatian dalam Bahasa Malaysia. Format: JSON array string sahaja. Tiada penjelasan tambahan.'
        : 'You are a viral TikTok hook writer for Queen Fashion Malaysia, a Malaysian Muslim women modest fashion brand. Generate 5 attention-grabbing opening lines (hooks) in English. Format: JSON array of strings only. No extra explanation.'

      const userPrompt = `Product: ${description}\nTarget emotion: ${emotion}\nLanguage: ${language.toUpperCase()}\nGenerate 5 viral TikTok hooks.${language === 'bm' ? ' Gunakan Bahasa Malaysia yang mesra, gaul, dan sesuai untuk wanita Muslim Malaysia. Jangan lebih 150 patah perkataan setiap hook.' : ' Use casual, warm English relatable to Malaysian Muslim women. Keep each hook under 150 characters.'}`

      const res = await client.chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ])

      const raw = res.choices?.[0]?.message?.content || res.text || ''
      let parsed: HookResult[] = []
      try {
        const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
        const arr = JSON.parse(cleaned)
        if (Array.isArray(arr)) {
          parsed = arr.map((item: any) => ({ text: String(item.hook || item.text || item), copied: false }))
        } else {
          parsed = [{ text: String(arr.hook || arr.text || raw), copied: false }]
        }
      } catch {
        parsed = raw.split('\n').filter((x: string) => x.trim()).slice(0, 5).map((s: string) => ({ text: s.replace(/^\d+\.\s*/, ''), copied: false }))
      }
      setResults(parsed.slice(0, 5))
      toast.success(language === 'bm' ? `${parsed.length} hook dihasilkan!` : `${parsed.length} hooks generated!`)
    } catch (err: any) {
      toast.error(err.message || (language === 'bm' ? 'Gagal hasilkan hook' : 'Failed to generate hooks'))
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
          <Zap className="w-7 h-7 text-primary" />
          {language === 'bm' ? 'Penjana Hook Viral' : 'Viral Hook Generator'}
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
            {language === 'bm' ? 'Butiran Produk & Emosi Sasaran' : 'Product Details & Target Emotion'}
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

          <div>
            <label className="text-sm font-medium mb-1 block">
              {language === 'bm' ? 'Emosi Sasaran' : 'Target Emotion'}
            </label>
            <div className="flex flex-wrap gap-2">
              {(['curiosity', 'desire', 'fear', 'joy'] as const).map((em) => (
                <Button
                  key={em}
                  variant={emotion === em ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setEmotion(em)}
                >
                  {emotionLabels[em][language]}
                </Button>
              ))}
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
                <Zap className="w-4 h-4 mr-2" />
                {language === 'bm' ? 'Hasilkan 5 Hook' : 'Generate 5 Hooks'}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">
            {language === 'bm' ? '5 Hook Viral Anda' : 'Your 5 Viral Hooks'}
          </h2>
          {results.map((item, idx) => (
            <Card key={idx}>
              <CardContent className="p-5 flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white text-sm font-bold">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-relaxed break-words">{item.text}</p>
                  <div className="mt-2">
                    <Button size="sm" variant="outline" onClick={() => copyText(item.text, idx)}>
                      {item.copied ? <Check className="w-4 h-4 mr-1 text-green-600" /> : <Copy className="w-4 h-4 mr-1" />}
                      {item.copied ? (language === 'bm' ? 'Disalin' : 'Copied') : (language === 'bm' ? 'Salin Hook' : 'Copy Hook')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
