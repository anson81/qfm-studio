import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Video, Image, Wand2, FolderOpen, TrendingUp, Zap } from 'lucide-react'

const quickActions = [
  { icon: Video, label: 'Generate Video', to: '/video-generator', desc: 'Create TikTok/IG videos with AI', color: 'bg-red-50 text-red-600' },
  { icon: Image, label: 'Generate Image', to: '/image-generator', desc: 'Product photos & lifestyle images', color: 'bg-blue-50 text-blue-600' },
  { icon: Wand2, label: 'UGC Generator', to: '/ugc', desc: 'Model + product composite', color: 'bg-pink-50 text-pink-600' },
  { icon: FolderOpen, label: 'View Library', to: '/library', desc: 'Manage all generated content', color: 'bg-emerald-50 text-emerald-600' },
]

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState({ videos: 0, images: 0, storage: 0 })

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    // TODO: load real stats from content table
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome back
            {user?.email ? <span className="text-muted-foreground text-lg font-normal ml-2">{user.email.split('@')[0]}</span> : null}
          </h1>
          <p className="text-muted-foreground">Here&apos;s what&apos;s happening with your content creation</p>
        </div>
        <Link to="/video-generator">
          <Button><Zap className="w-4 h-4 mr-2" />Create Content</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map(a => (
          <Link key={a.label} to={a.to} className="group">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-5 space-y-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${a.color}`}><a.icon className="w-5 h-5" /></div>
                <h3 className="font-semibold group-hover:text-primary transition-colors">{a.label}</h3>
                <p className="text-sm text-muted-foreground">{a.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" /> Content Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-3xl font-bold">{stats.videos}</p>
                <p className="text-sm text-muted-foreground">Videos</p>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-3xl font-bold">{stats.images}</p>
                <p className="text-sm text-muted-foreground">Images</p>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-3xl font-bold">{stats.storage}</p>
                <p className="text-sm text-muted-foreground">MB Used</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span>Add your KIE.AI API key</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span>Top up KIE.AI credits</span>
            </div>
            <Link to="/settings">
              <Button variant="outline" className="w-full">Manage Settings</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
