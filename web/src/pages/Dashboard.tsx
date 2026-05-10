import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiClient, getUser } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Video, Image, Wand2, FolderOpen, TrendingUp, Zap, Wifi, WifiOff, AlertTriangle, CreditCard, Sparkles, Clock, BarChart3, Activity, Layers, MessageSquareText, Music, Film, ArrowUpRight, ArrowDownRight, Eye } from 'lucide-react'

const quickActions = [
  { icon: Video, label: 'Generate Video', to: '/video-generator', desc: 'Create TikTok/IG videos with AI', color: 'bg-purple-50 text-purple-600', border: 'border-purple-200' },
  { icon: Image, label: 'Generate Image', to: '/image-generator', desc: 'Product photos & lifestyle images', color: 'bg-blue-50 text-blue-600', border: 'border-blue-200' },
  { icon: Wand2, label: 'UGC Generator', to: '/ugc', desc: 'Model + product composite', color: 'bg-pink-50 text-pink-600', border: 'border-pink-200' },
  { icon: FolderOpen, label: 'View Library', to: '/library', desc: 'Manage all generated content', color: 'bg-amber-50 text-amber-600', border: 'border-amber-200' },
]

interface DashboardStats {
  total: number
  type_counts: Record<string, number>
  status_counts: Record<string, number>
  total_credits: number
  today: { total: number; type_counts: Record<string, number>; credits: number }
  this_week: { total: number; type_counts: Record<string, number>; credits: number }
  this_month: { total: number; type_counts: Record<string, number>; credits: number }
  daily_chart: { date: string; count: number; credits: number }[]
  model_counts: Record<string, number>
}

interface RecentItem {
  id: number
  type: string
  prompt: string
  model?: string | null
  status: string
  result_url?: string | null
  credit_cost: number
  created_at: string
}

const TYPE_CONFIG: Record<string, { icon: typeof Video; color: string; bgColor: string; label: string }> = {
  video: { icon: Film, color: 'text-purple-600', bgColor: 'bg-purple-50', label: 'Video' },
  image: { icon: Image, color: 'text-blue-600', bgColor: 'bg-blue-50', label: 'Image' },
  text: { icon: MessageSquareText, color: 'text-green-600', bgColor: 'bg-green-50', label: 'Text' },
  storyboard: { icon: Layers, color: 'text-orange-600', bgColor: 'bg-orange-50', label: 'Storyboard' },
  music: { icon: Music, color: 'text-pink-600', bgColor: 'bg-pink-50', label: 'Music' },
  voice: { icon: Video, color: 'text-indigo-600', bgColor: 'bg-indigo-50', label: 'Voice' },
}

const MODEL_LABELS: Record<string, string> = {
  'veo3': 'Veo3',
  'veo2': 'Veo2',
  'flux-kontext-pro': 'Flux Kontext Pro',
  'flux-kontext-max': 'Flux Kontext Max',
  'flux-kontext': 'Flux Kontext',
  'nano-banana-pro': 'Nano Banana Pro',
  'gpt-4o-image': 'GPT-4o Image',
  'runway-gen3a': 'Runway Gen-3A',
  'kling-2.5-turbo': 'Kling 2.5 Turbo',
  'kling-2.0': 'Kling 2.0',
  'hailuo': 'Hailuo',
  'luma': 'Luma',
  'vidu': 'Vidu',
  'minimax-video': 'MiniMax',
  'claude-sonnet-4-5': 'Claude Sonnet 4.5',
  'gemini-2.5-flash': 'Gemini 2.5 Flash',
  'V4': 'Suno V4',
  'V3_5': 'Suno V3.5',
}

function MiniBarChart({ data }: { data: { date: string; count: number }[] }) {
  const maxCount = Math.max(...data.map(d => d.count), 1)
  return (
    <div className="flex items-end gap-1.5 h-20">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5 flex-1">
          <div
            className="w-full rounded-t-sm bg-primary/80 transition-all hover:bg-primary"
            style={{ height: `${Math.max((d.count / maxCount) * 60, d.count > 0 ? 6 : 2)}px` }}
            title={`${d.date}: ${d.count} items`}
          />
          <span className="text-[10px] text-muted-foreground">{d.date}</span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [kieConnected, setKieConnected] = useState<boolean | null>(null)
  const [creditBalance, setCreditBalance] = useState<number | null>(null)

  useEffect(() => {
    const stored = getUser()
    if (stored) setUser(stored)
    apiClient.me().then(u => {
      setUser(u)
      localStorage.setItem('qfm_user', JSON.stringify(u))
    }).catch(() => {})

    // Load dashboard stats
    apiClient.getDashboardStats().then((data: DashboardStats) => {
      setStats(data)
    }).catch(() => {})

    // Load recent content items
    apiClient.listContent().then((items: RecentItem[]) => {
      setRecentItems(items.slice(0, 10))
    }).catch(() => {})

    // Check KIE key
    const hasKey = apiClient.hasKIEKey()
    setKieConnected(hasKey ? true : false)
    if (hasKey) {
      apiClient.getCredits().then(result => {
        setKieConnected(true)
        const cb = result.data
        if (cb !== null) setCreditBalance(typeof cb === 'number' ? cb : parseFloat(cb))
      }).catch(() => {
        setKieConnected(false)
      })
    }

    setLoading(false)
  }, [])

  const totalItems = stats?.total || 0
  const totalVideos = stats?.type_counts?.video || 0
  const totalImages = stats?.type_counts?.image || 0
  const totalText = stats?.type_counts?.text || 0
  const totalOther = totalItems - totalVideos - totalImages - totalText
  const completedCount = stats?.status_counts?.completed || 0
  const processingCount = stats?.status_counts?.processing || 0
  const failedCount = stats?.status_counts?.failed || 0

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Welcome back{' '}
            {user?.email ? <span className="text-muted-foreground text-lg font-normal ml-1">{user.email.split('@')[0]}</span> : null}
          </h1>
          <p className="text-muted-foreground mt-1">Here's your content creation overview</p>
        </div>
        <Link to="/video-generator">
          <Button className="shadow-md shadow-primary/20"><Zap className="w-4 h-4 mr-2" />Create</Button>
        </Link>
      </div>

      {/* KIE Connection Status Banner */}
      <div className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border-2 transition-all duration-300 ${
        kieConnected
          ? 'bg-green-50 border-green-300'
          : kieConnected === false
            ? 'bg-red-50 border-red-300'
            : 'bg-amber-50 border-amber-300'
      }`}>
        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 ${
          kieConnected ? 'bg-green-100' : kieConnected === false ? 'bg-red-100' : 'bg-amber-100'
        }`}>
          {kieConnected ? <Wifi className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" /> : <WifiOff className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-bold text-sm sm:text-base ${
            kieConnected ? 'text-green-800' : kieConnected === false ? 'text-red-800' : 'text-amber-800'
          }`}>
            {kieConnected === null ? 'Checking KIE.API status...' : kieConnected ? 'KIE.API Connected' : 'KIE.API Not Connected'}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">
            {kieConnected
              ? 'Your KIE.AI API key is valid and ready to generate content.'
              : kieConnected === false
                ? 'Add your KIE.AI API key in Settings to start generating.'
                : 'Attempting to verify your KIE.AI API key...'}
          </p>
        </div>
        {creditBalance !== null && (
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border shadow-sm shrink-0">
            <CreditCard className="w-3.5 h-3.5 text-primary" />
            <span className="text-base sm:text-lg font-bold text-foreground">{creditBalance.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">cr</span>
          </div>
        )}
        {!kieConnected && (
          <Link to="/settings">
            <Button variant="outline" size="sm" className="shrink-0">Setup</Button>
          </Link>
        )}
      </div>

      {/* Main Stats Cards — 4 across */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Content */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-xs text-muted-foreground font-medium">Total</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-foreground">{totalItems}</p>
            <p className="text-xs text-muted-foreground mt-0.5">All content generated</p>
          </CardContent>
        </Card>
        {/* Videos */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Video className="w-5 h-5 text-purple-500" />
              <span className="text-xs text-muted-foreground font-medium">Videos</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-foreground">{totalVideos}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {stats?.today?.type_counts?.video || 0} today
            </p>
          </CardContent>
        </Card>
        {/* Images */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Image className="w-5 h-5 text-blue-500" />
              <span className="text-xs text-muted-foreground font-medium">Images</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-foreground">{totalImages}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {stats?.today?.type_counts?.image || 0} today
            </p>
          </CardContent>
        </Card>
        {/* Credits Spent */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <CreditCard className="w-5 h-5 text-amber-500" />
              <span className="text-xs text-muted-foreground font-medium">Credits</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-foreground">{stats?.total_credits?.toLocaleString() || '0'}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {stats?.today?.credits?.toLocaleString() || '0'} today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickActions.map(a => (
          <Link key={a.label} to={a.to} className="group">
            <Card className={`hover:shadow-lg transition-all duration-300 cursor-pointer h-full border ${a.border}`}>
              <CardContent className="p-3 sm:p-4 space-y-2">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${a.color} group-hover:scale-110 transition-transform duration-200`}>
                  <a.icon className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{a.label}</h3>
                <p className="text-xs text-muted-foreground hidden sm:block">{a.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Two-column layout: Activity Chart + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: 7-day chart + Usage by Type */}
        <div className="lg:col-span-2 space-y-6">
          {/* Activity Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="w-4 h-4 text-primary" /> Last 7 Days Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MiniBarChart data={stats?.daily_chart || [
                { date: 'Mon', count: 0, credits: 0 },
                { date: 'Tue', count: 0, credits: 0 },
                { date: 'Wed', count: 0, credits: 0 },
                { date: 'Thu', count: 0, credits: 0 },
                { date: 'Fri', count: 0, credits: 0 },
                { date: 'Sat', count: 0, credits: 0 },
                { date: 'Sun', count: 0, credits: 0 },
              ]} />
              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                <span className="text-sm text-muted-foreground">This week total</span>
                <span className="text-sm font-semibold">{stats?.this_week?.total || 0} items · {stats?.this_week?.credits?.toLocaleString() || '0'} credits</span>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="w-4 h-4 text-primary" /> Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center text-muted-foreground">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  Loading...
                </div>
              ) : recentItems.length === 0 ? (
                <div className="py-8 text-center space-y-3">
                  <Sparkles className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                  <p className="text-muted-foreground text-sm">No content yet. Start creating!</p>
                  <Link to="/video-generator">
                    <Button size="sm"><Zap className="w-3 h-3 mr-1.5" />Create Your First Content</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-1">
                  {recentItems.map(item => {
                    const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.text
                    const Icon = cfg.icon
                    const statusStyle = item.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : item.status === 'failed'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                    const modelLabel = item.model ? (MODEL_LABELS[item.model] || item.model) : ''
                    return (
                      <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.bgColor}`}>
                          <Icon className={`w-4 h-4 ${cfg.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{item.prompt.slice(0, 60)}{item.prompt.length > 60 ? '...' : ''}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">{cfg.label}</span>
                            {modelLabel && (
                              <>
                                <span className="text-xs text-muted-foreground">·</span>
                                <span className="text-xs text-muted-foreground">{modelLabel}</span>
                              </>
                            )}
                            {item.credit_cost > 0 && (
                              <>
                                <span className="text-xs text-muted-foreground">·</span>
                                <span className="text-xs text-amber-600">{item.credit_cost} cr</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusStyle}`}>
                            {item.status}
                          </span>
                          {item.result_url && item.type !== 'text' && (
                            <a href={item.result_url} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <Eye className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                            </a>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar: Usage Breakdown + Model Stats + Quick Setup */}
        <div className="space-y-6">
          {/* Usage by Type */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="w-4 h-4 text-primary" /> Usage Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Videos', count: totalVideos, total: totalItems || 1, color: 'bg-purple-500', textColor: 'text-purple-600' },
                { label: 'Images', count: totalImages, total: totalItems || 1, color: 'bg-blue-500', textColor: 'text-blue-600' },
                { label: 'Text/Captions', count: totalText, total: totalItems || 1, color: 'bg-green-500', textColor: 'text-green-600' },
                { label: 'Other', count: totalOther, total: totalItems || 1, color: 'bg-amber-500', textColor: 'text-amber-600' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-foreground">{item.label}</span>
                    <span className={`font-semibold ${item.textColor}`}>{item.count}</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full transition-all duration-500`}
                      style={{ width: `${Math.max((item.count / item.total) * 100, item.count > 0 ? 5 : 0)}%` }} />
                  </div>
                </div>
              ))}

              {/* Status summary */}
              <div className="pt-3 mt-3 border-t space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" /> Completed</span>
                  <span className="font-semibold">{completedCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Processing</span>
                  <span className="font-semibold">{processingCount}</span>
                </div>
                {failedCount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> Failed</span>
                    <span className="font-semibold text-red-600">{failedCount}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Model Usage */}
          {stats?.model_counts && Object.keys(stats.model_counts).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Layers className="w-4 h-4 text-primary" /> Top Models
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(stats.model_counts)
                    .sort(([,a], [,b]) => (b as number) - (a as number))
                    .slice(0, 5)
                    .map(([model, count]) => (
                      <div key={model} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{MODEL_LABELS[model] || model}</span>
                        <span className="font-semibold text-muted-foreground">{count as number}×</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Setup */}
          <Card>
            <CardHeader><CardTitle className="text-base">Quick Setup</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className={`w-2.5 h-2.5 rounded-full ${kieConnected ? 'bg-success' : 'bg-slate-300'}`} />
                <span className="text-foreground">{kieConnected ? 'KIE.API key configured' : 'Add your KIE.AI API key'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className={`w-2.5 h-2.5 rounded-full ${creditBalance !== null && creditBalance > 0 ? 'bg-success' : 'bg-slate-300'}`} />
                <span className="text-foreground">{creditBalance !== null && creditBalance > 0 ? `${creditBalance.toLocaleString()} credits available` : 'Top up KIE.AI credits'}</span>
              </div>
              {creditBalance !== null && creditBalance <= 10 && creditBalance > 0 && (
                <div className="flex items-center gap-3 text-sm text-amber-600">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  <span>Low credit balance</span>
                </div>
              )}
              <Link to="/settings">
                <Button variant="outline" className="w-full mt-2">Manage Settings</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Content Auto-Deletion Warning */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-800">
          <strong>Note:</strong> Generated content URLs expire after 1 hour. Download or save any content you want to keep to your Content Library.
        </p>
      </div>
    </div>
  )
}