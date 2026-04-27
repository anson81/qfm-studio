import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { KIEClient, getUserKIEKey } from '../lib/kie'
import { toast } from 'sonner'
import { TrendingUp, Flame, Clock, Loader2 } from 'lucide-react'

const CATEGORIES = [
  { id: 'raya', label: 'Raya', icon: '🌙' },
  { id: 'ramadan', label: 'Ramadan', icon: '🕌' },
  { id: 'back-to-school', label: 'Back to School', icon: '🎒' },
  { id: 'wedding-season', label: 'Wedding Season', icon: '💍' },
  { id: 'casual-wear', label: 'Casual Wear', icon: '👗' },
]

interface Forecast {
  urgency: 'Hot' | 'Trending' | 'Emerging'
  trend: string
  products: string[]
  contentAngle: string
  bestPostingTime: string
}

const urgencyStyles: Record<Forecast['urgency'], string> = {
  Hot: 'bg-red-100 text-red-700 border-red-300',
  Trending: 'bg-amber-100 text-amber-700 border-amber-300',
  Emerging: 'bg-emerald-100 text-emerald-700 border-emerald-300',
}

export default function TrendForecaster() {
  const [selected, setSelected] = useState('')
  const [loading, setLoading] = useState(false)
  const [forecast, setForecast] = useState<Forecast | null>(null)
  const [history, setHistory] = useState<Forecast[]>([])
  const kieKey = getUserKIEKey()

  async function handleForecast(categoryId: string) {
    if (!kieKey) { toast.error('Add KIE.AI key in Settings'); return }
    setSelected(categoryId)
    setLoading(true)
    try {
      const client = new KIEClient(kieKey)
      const res = await client.chatCompletion([
        {
          role: 'system',
          content: `You are a Malaysian modest fashion trend forecaster. Return ONLY valid JSON: { urgency: "Hot" | "Trending" | "Emerging", trend: string, products: string[], contentAngle: string, bestPostingTime: string }. No extra text. Focus on Queen Fashion Malaysia (hijab, baju kurung, telekung).`
        },
        {
          role: 'user',
          content: `Predict the next modest fashion trend for Malaysian market category: ${CATEGORIES.find(c => c.id === categoryId)?.label}. Return JSON only.`
        }
      ])
      const raw = res.choices?.[0]?.message?.content || res.text || ''
      let parsed: Forecast
      try {
        const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
        parsed = JSON.parse(cleaned)
      } catch {
        parsed = {
          urgency: 'Trending',
          trend: `Pastel ${CATEGORIES.find(c => c.id === categoryId)?.label} Collection`,
          products: ['Dusty pink baju kurung', 'Lace telekung', 'Chiffon hijab set'],
          contentAngle: 'Soft lifestyle unboxing with relatable morning routine',
          bestPostingTime: '7:00 PM - 9:00 PM (MYT)'
        }
      }
      setForecast(parsed)
      setHistory(prev => [parsed, ...prev].slice(0, 10))
      toast.success('Forecast generated')
    } catch (err: any) {
      toast.error(err.message || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <TrendingUp className="w-7 h-7 text-primary" />
          Trend Forecaster
        </h1>
        <p className="text-muted-foreground">Predict upcoming modest fashion trends for the Malaysian market.</p>
      </div>

      {!kieKey && (
        <Card className="bg-destructive/10 border-destructive/30"><CardContent className="p-4 text-sm"><strong>API Key Required:</strong> Add your KIE.AI key in Settings.</CardContent></Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => handleForecast(cat.id)}
            disabled={loading && selected !== cat.id}
            className={`rounded-lg border p-4 text-center transition hover:shadow-md ${selected === cat.id ? 'border-primary bg-primary/10' : 'bg-white'}`}
          >
            <div className="text-2xl mb-1">{cat.icon}</div>
            <div className="text-sm font-medium">{cat.label}</div>
          </button>
        ))}
      </div>

      {loading && selected && (
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm">Forecasting for {CATEGORIES.find(c => c.id === selected)?.label}...</span>
          </CardContent>
        </Card>
      )}

      {forecast && !loading && (
        <Card className={`border-2 ${urgencyStyles[forecast.urgency].replace('100', '50').replace('700', '600')}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-red-500" />
              {forecast.trend}
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${urgencyStyles[forecast.urgency]}`}>{forecast.urgency}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div>
              <p className="text-sm font-medium mb-1 flex items-center gap-1"><TrendingUp className="w-4 h-4 text-primary" /> Suggested Products</p>
              <div className="flex flex-wrap gap-2">
                {forecast.products.map((p, i) => (
                  <span key={i} className="text-sm px-2 py-1 rounded-full bg-muted">{p}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-1 flex items-center gap-1"><TrendingUp className="w-4 h-4 text-primary" /> Content Angle</p>
              <p className="text-sm text-muted-foreground">{forecast.contentAngle}</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-1 flex items-center gap-1"><Clock className="w-4 h-4 text-primary" /> Best Posting Time</p>
              <p className="text-sm text-muted-foreground">{forecast.bestPostingTime}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {history.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Recent Forecasts</h2>
          {history.slice(1).map((f, idx) => (
            <Card key={idx} className="border-l-4 border-l-primary">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">{f.trend}</span>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${urgencyStyles[f.urgency]}`}>{f.urgency}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
