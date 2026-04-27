import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { KIEClient, getUserKIEKey } from '../lib/kie'
import { toast } from 'sonner'
import { CalendarDays, Plus, Trash2, Sparkles, Loader2, Copy, Check } from 'lucide-react'

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

export default function ContentPlanner() {
  const [topic, setTopic] = useState('')
  const [weeks, setWeeks] = useState(2)
  const [postsPerWeek, setPostsPerWeek] = useState(5)
  const [plan, setPlan] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState<number | null>(null)
  const kieKey = getUserKIEKey()

  const SYSTEM = `You are a TikTok content strategist for Queen Fashion Malaysia (modest fashion, hijab, baju kurung, telekung).
Create a detailed content calendar.
Return ONLY valid JSON array of posts: [{"day":"Monday","time":"7:00 PM","type":"Video","topic":"Raya collection unboxing","hook":"Show 3 outfit ideas","caption":"Which one for Raya?","hashtags":["#tudung","#raya2026"]}]`

  async function handleGenerate() {
    if (!topic.trim()) { toast.error('Enter a topic'); return }
    if (!kieKey) { toast.error('Add KIE.AI key in Settings'); return }
    setLoading(true)
    try {
      const client = new KIEClient(kieKey)
      const res = await client.chatCompletion([
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `Create a ${weeks}-week content plan (${postsPerWeek} posts/week) for: ${topic}. Focus on Malaysian Muslim modest fashion.` }
      ])
      const raw = res.choices?.[0]?.message?.content || res.text || ''
      let parsed
      try {
        const cleaned = raw.replace(/```json\s*/g,'').replace(/```\s*/g,'').trim()
        parsed = JSON.parse(cleaned)
      } catch { parsed = [] }
      const arr = Array.isArray(parsed) ? parsed : [parsed]
      setPlan(arr.map((p:any,i:number) => ({...p, id: i+1})))
      toast.success(`Generated ${arr.length} post ideas`)
    } catch (err:any) { toast.error(err.message || 'Failed') }
    finally { setLoading(false) }
  }

  function copyPost(p:any) {
    const text = `${p.day} | ${p.type}\n${p.topic}\n${p.hook || ''}\n${p.caption || ''}\n${(p.hashtags || []).join(' ')}`
    navigator.clipboard.writeText(text)
    setCopied(p.id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">AI Content Planner</h1>
      <p className="text-muted-foreground">Generate a multi-week TikTok content calendar for your modest fashion brand.</p>

      {!kieKey && (
        <Card className="bg-destructive/10 border-destructive/30"><CardContent className="p-4 text-sm"><strong>API Key Required:</strong> Add your KIE.AI key in Settings.</CardContent></Card>
      )}

      <Card>
        <CardContent className="p-5 space-y-4">
          <label className="text-sm font-medium">Campaign Theme / Topic</label>
          <Input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="e.g. Raya 2026 new collection, Ramadan prep" />
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm">Weeks</label>
              <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={weeks} onChange={e=>setWeeks(Number(e.target.value))}>
                {[1,2,4].map(n => <option key={n} value={n}>{n} week{n>1?'s':''}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm">Posts/Week</label>
              <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={postsPerWeek} onChange={e=>setPostsPerWeek(Number(e.target.value))}>
                {[3,5,7].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleGenerate} disabled={loading}>
                <Sparkles className="w-4 h-4 mr-2" />{loading ? 'Planning...' : 'Generate Plan'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {plan.length > 0 && (
        <div className="space-y-3">
          {plan.map((p:any) => (
            <Card key={p.id} className="border-l-4 border-l-primary">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">Week {Math.ceil(p.id / postsPerWeek)} — {p.day}</span>
                    <span className="text-xs bg-muted px-2 py-1 rounded">{p.time || '7:00 PM'}</span>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">{p.type}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={()=>copyPost(p)}>
                    {copied===p.id ? <Check className="w-3 h-3"/> : <Copy className="w-3 h-3"/>}
                  </Button>
                </div>
                <p className="font-medium">{p.topic}</p>
                <p className="text-sm text-muted-foreground">{p.hook}</p>
                <p className="text-sm">{p.caption}</p>
                <div className="flex flex-wrap gap-1">
                  {(p.hashtags || []).map((h:string,i:number) => <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded">{h}</span>)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
