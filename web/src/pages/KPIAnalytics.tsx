import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { apiClient } from '../lib/api'
import { toast } from 'sonner'
import { BarChart3, Loader2, Image, Video, Type } from 'lucide-react'

export default function KPIAnalytics() {
  const [stats, setStats] = useState({ total: 0, images: 0, videos: 0, texts: 0, recentItems: [] as any[] })
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const content = await apiClient.listContent()
      const items = content || []
      const images = items.filter((c: any) => c.type === 'image').length
      const videos = items.filter((c: any) => c.type === 'video').length
      const texts = items.filter((c: any) => c.type === 'text').length
      setStats({
        total: items.length,
        images,
        videos,
        texts,
        recentItems: items.slice(0, 10)
      })
    } catch (err: any) { toast.error('Failed to load analytics') }
    finally { setLoading(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>

  const statCards = [
    { label: 'Total Generations', value: stats.total, icon: BarChart3, color: 'text-blue-400' },
    { label: 'Images', value: stats.images, icon: Image, color: 'text-green-400' },
    { label: 'Videos', value: stats.videos, icon: Video, color: 'text-purple-400' },
    { label: 'Text', value: stats.texts, icon: Type, color: 'text-amber-400' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">KPI Analytics</h1>
        <p className="text-muted-foreground">Track your content generation performance</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <s.icon className={`w-8 h-8 mx-auto mb-2 ${s.color}`} />
              <div className="text-3xl font-bold">{s.value}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Recent Generations</CardTitle></CardHeader>
        <CardContent>
          {stats.recentItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No generations yet. Start creating!</p>
          ) : (
            <div className="space-y-2">
              {stats.recentItems.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-sidebar border border-sidebar-border rounded-lg">
                  <div className="flex items-center gap-3">
                    {item.type === 'image' && <Image className="w-4 h-4 text-green-400" />}
                    {item.type === 'video' && <Video className="w-4 h-4 text-purple-400" />}
                    {item.type === 'text' && <Type className="w-4 h-4 text-amber-400" />}
                    <div>
                      <p className="text-sm truncate max-w-[200px]">{item.prompt?.slice(0, 60) || 'Untitled'}</p>
                      <p className="text-xs text-muted-foreground">{item.model || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${item.status === 'completed' ? 'bg-green-500/20 text-green-400' : item.status === 'processing' ? 'bg-yellow-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                      {item.status}
                    </span>
                    <span className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Type Distribution</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: 'Images', value: stats.images, total: stats.total, color: 'bg-green-500' },
              { label: 'Videos', value: stats.videos, total: stats.total, color: 'bg-purple-500' },
              { label: 'Text', value: stats.texts, total: stats.total, color: 'bg-yellow-500' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{item.label}</span>
                  <span>{item.value} ({item.total > 0 ? Math.round(item.value / item.total * 100) : 0}%)</span>
                </div>
                <div className="w-full bg-sidebar rounded-full h-2">
                  <div className={`${item.color} h-2 rounded-full`} style={{ width: `${item.total > 0 ? (item.value / item.total * 100) : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}