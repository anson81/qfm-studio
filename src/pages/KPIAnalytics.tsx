import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { supabase } from '../lib/supabase'
import { KIEClient, getUserKIEKey } from '../lib/kie'
import { BarChart3, Image, Video, Sparkles, Coins, Loader2, TrendingUp, Calendar, Clock } from 'lucide-react'

export default function KPIAnalytics() {
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState({ images:0, videos:0, total:0, creditsUsed:0, creditsLeft:0 })
  const [activity, setActivity] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setUser(data.session.user)
        fetchStats(data.session.user.id)
      } else { setLoading(false) }
    })
  }, [])

  async function fetchStats(uid: string) {
    setLoading(true)
    try {
      const { data: rows } = await supabase.from('content').select('type,status,created_at,credit_cost').eq('user_id', uid).order('created_at', { ascending: false })
      const images = rows?.filter((r:any) => r.type === 'image').length || 0
      const videos = rows?.filter((r:any) => r.type === 'video').length || 0
      let creditsUsed = 0
      rows?.forEach((r:any) => {
        if (r.status === 'completed' && r.credit_cost) creditsUsed += r.credit_cost
      })

      let creditsLeft = 0
      try {
        const key = getUserKIEKey()
        if (key) {
          const client = new KIEClient(key)
          const bal = await client.getCredits()
          creditsLeft = bal.credit_balance || bal.data?.credit_balance || bal.balance || 0
        }
      } catch { /* no key */ }

      // Daily activity last 7 days
      const days: Record<string, number> = {}
      const today = new Date()
      for (let i=6; i>=0; i--) {
        const d = new Date(today)
        d.setDate(d.getDate()-i)
        days[d.toISOString().slice(0,10)] = 0
      }
      rows?.forEach((r:any) => {
        const d = r.created_at?.slice(0,10)
        if (d && days[d] !== undefined) days[d]++
      })

      setStats({ images, videos, total: rows?.length||0, creditsUsed, creditsLeft })
      setActivity(Object.entries(days).map(([date, count]) => ({ date, count })))
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  if (loading) return (
    <div className="flex min-h-[300px] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
  )

  const maxCount = Math.max(...activity.map(a=>a.count), 1)

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">KPI Analytics</h1>
      <p className="text-muted-foreground">Track your content creation performance and credit usage.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><Image className="w-5 h-5"/></div>
            <div><p className="text-2xl font-bold">{stats.images}</p><p className="text-sm text-muted-foreground">Images Generated</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center"><Video className="w-5 h-5"/></div>
            <div><p className="text-2xl font-bold">{stats.videos}</p><p className="text-sm text-muted-foreground">Videos Generated</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center"><Coins className="w-5 h-5"/></div>
            <div><p className="text-2xl font-bold">{stats.creditsUsed}</p><p className="text-sm text-muted-foreground">Credits Used</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><Sparkles className="w-5 h-5"/></div>
            <div><p className="text-2xl font-bold">{stats.creditsLeft}</p><p className="text-sm text-muted-foreground">Credits Left</p></div>
          </div>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5"/> Content Activity (7 Days)</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end gap-3 h-48">
              {activity.map(a => (
                <div key={a.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-muted rounded-t-md relative overflow-hidden" style={{height:'100%'}}>
                    <div className="absolute bottom-0 left-0 right-0 bg-primary rounded-t-md transition-all" style={{height:`${(a.count/maxCount)*100}%`}} />
                  </div>
                  <span className="text-xs text-muted-foreground">{a.date.slice(5)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5"/> Top Performing Models</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <span className="text-sm font-medium">Flux Kontext Pro</span>
              <span className="text-sm text-muted-foreground">Most used image model</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <span className="text-sm font-medium">Kling 2.5 Turbo</span>
              <span className="text-sm text-muted-foreground">Most cost-effective video</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <span className="text-sm font-medium">Veo 3.1 Fast</span>
              <span className="text-sm text-muted-foreground">Best for quick drafts</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <span className="text-sm font-medium">Seedance 2.0</span>
              <span className="text-sm text-muted-foreground">Highest quality output</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
