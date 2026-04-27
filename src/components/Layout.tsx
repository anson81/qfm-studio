import { Outlet, Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard, Video, Wrench, Sparkles, MessageSquare,
  BarChart3, FolderOpen, GraduationCap, Settings, ChevronRight
} from 'lucide-react'

const menu = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/', exact: true },
  {
    icon: Video, label: '7 AI Video', to: '/video-generator', children: [
      { label: 'Video Generator', to: '/video-generator' },
      { label: 'Kling 2.6', to: '/video-generator?model=kling-2.5-turbo' },
      { label: 'Veo 3.1', to: '/video-generator?model=veo-3.1-fast' },
      { label: 'Seedance 2.0', to: '/video-generator?model=seedance-2.0' },
      { label: 'Hailuo', to: '/video-generator?model=hailuo-2.3' },
    ]
  },
  { icon: Wrench, label: 'AI Tools', to: '/ai-tools', children: [
      { label: 'UGC Generator', to: '/ugc' },
      { label: 'Image Generator', to: '/image-generator' },
      { label: 'Storyboard', to: '/storyboard' },
      { label: 'Voice Generator', to: '/voice-generator' },
      { label: 'Music', to: '/music' },
      { label: 'Avatar Lip Sync', to: '/avatar' },
      { label: 'Film Maker', to: '/film-maker' },
    ]
  },
  { icon: Sparkles, label: 'Magic 5', to: '/magic5' },
  { icon: MessageSquare, label: 'Chat', to: '/chat' },
  { icon: BarChart3, label: 'Analytics', to: '/analytics' },
  { icon: FolderOpen, label: 'Library', to: '/library' },
  { icon: GraduationCap, label: 'Tutorials', to: '/tutorials' },
  { icon: Settings, label: 'Settings', to: '/settings' },
]

function SidebarItem({ item }: { item: any }) {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const active = item.to && (item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to.split('?')[0]))

  if (item.children) {
    return (
      <div className="mb-0.5">
        <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-muted text-muted-foreground hover:text-foreground">
          <item.icon className="w-5 h-5" />
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronRight className={`w-4 h-4 transition-transform ${open ? 'rotate-90' : ''}`} />
        </button>
        {open && (
          <div className="ml-4 border-l border-border pl-3 mt-1 space-y-0.5">
            {item.children.map((c: any) => (
              <Link key={c.to} to={c.to} className={`block px-3 py-2 rounded-md text-sm transition-colors ${location.pathname + location.search === c.to ? 'bg-muted text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}>{c.label}</Link>
            ))}
          </div>
        )}
      </div>
    )
  }
  return (
    <Link to={item.to} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
      <item.icon className="w-5 h-5" />
      <span>{item.label}</span>
    </Link>
  )
}

export function Layout() {
  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-lg">Q</div>
            <span className="text-xl font-bold">QFM Studio</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 overflow-y-auto">
          {menu.map((item) => <SidebarItem key={item.label} item={item} />)}
        </nav>
      </aside>
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30 flex items-center px-6">
          <div className="flex-1"></div>
          <div className="text-sm font-medium text-muted-foreground">
            QFM AI Studio
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
