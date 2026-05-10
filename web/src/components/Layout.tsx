import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Video, Wrench, Sparkles, MessageSquare,
  BarChart3, FolderOpen, GraduationCap, Settings, ChevronRight, Zap, Menu, X, User, Search
} from 'lucide-react'
import OnboardingModal from './OnboardingModal'
import { loadBusinessProfile, saveBusinessProfile, type BusinessProfile } from '../lib/businessContext'

const menu = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/', exact: true },
  {
    icon: Video, label: '7 AI Video', to: '/video-generator', children: [
      { label: 'Video Generator', to: '/video-generator' },
      { label: 'Kling 3.0', to: '/video/kling' },
      { label: 'Wan 2.7', to: '/video/wan' },
      { label: 'Grok', to: '/video/grok' },
      { label: 'Sora 2 Pro', to: '/video/sora2' },
      { label: 'Seedance 2.0', to: '/video/seedance' },
      { label: 'Hailuo', to: '/video/hailuo' },
      { label: 'Runway', to: '/video/runway' },
      { label: 'Veo 3', to: '/video/veo3' },
    ]
  },
  { icon: Zap, label: '🎬 TikTok Studio', to: '/tiktok-studio' },
  { icon: Wrench, label: 'AI Tools', to: '/ugc', children: [
      { label: 'UGC Generator', to: '/ugc' },
      { label: 'Image Generator', to: '/image-generator' },
      { label: 'Storyboard', to: '/storyboard' },
      { label: 'Video Analyzer', to: '/video-analyzer' },
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

function SidebarItem({ item, onNavigate }: { item: any; onNavigate?: () => void }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const active = item.to && (item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to.split('?')[0]))

  if (item.children) {
    return (
      <div className="mb-0.5">
        <button
          onClick={() => {
            setOpen(!open)
            if (item.to) {
              navigate(item.to)
              onNavigate?.()
            }
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-sidebar-hover text-sidebar-text hover:text-white"
        >
          <item.icon className="w-5 h-5" />
          <span className="flex-1 text-left">{item.label}</span>
          {item.label.includes('AI Video') && (
            <span className="bg-primary/20 text-primary-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">9</span>
          )}
          {item.label.includes('AI Tools') && (
            <span className="bg-primary/20 text-primary-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">8</span>
          )}
          <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${open ? 'rotate-90' : ''}`} />
        </button>
        {open && (
          <div className="ml-4 border-l border-sidebar-border pl-3 mt-1 space-y-0.5">
            {item.children.map((c: any) => (
              <Link
                key={c.to}
                to={c.to}
                onClick={onNavigate}
                className={`block px-3 py-2 rounded-md text-sm transition-all duration-200 ${
                  location.pathname + location.search === c.to
                    ? 'bg-primary text-white font-medium shadow-sm'
                    : 'text-sidebar-text hover:text-white hover:bg-sidebar-hover'
                }`}
              >
                {c.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
        active
          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
          : 'text-sidebar-text hover:text-white hover:bg-sidebar-hover'
      }`}
    >
      <item.icon className={`w-5 h-5 ${active ? 'text-white' : ''}`} />
      <span>{item.label}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent" />}
    </Link>
  )
}

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

  // Check if business profile is set up
  useEffect(() => {
    const profile = loadBusinessProfile()
    if (!profile || !profile.business_category) {
      setShowOnboarding(true)
    }
  }, [])

  const handleOnboardingComplete = (profile: BusinessProfile) => {
    saveBusinessProfile(profile)
    setShowOnboarding(false)
  }

  // Close sidebar on route change (mobile)
  const location = useLocation()
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  // Prevent body scroll when sidebar overlay is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  return (
    <div className="min-h-screen bg-background flex">
      {/* Onboarding Modal */}
      {showOnboarding && <OnboardingModal onComplete={handleOnboardingComplete} />}
      {/* ─── Mobile Sidebar Overlay ─── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ─── Sidebar ─── */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-sidebar flex flex-col border-r border-sidebar-border
        transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0 lg:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand Logo */}
        <div className="p-6 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-700 flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform duration-200">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-white tracking-tight">QFM Studio</span>
              <p className="text-[10px] text-sidebar-text leading-tight">AI Content Creation</p>
            </div>
          </Link>
          {/* Close button on mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-5 right-4 p-1 rounded-md text-sidebar-text hover:text-white hover:bg-sidebar-hover lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto">
          {menu.map((item) => <SidebarItem key={item.label} item={item} onNavigate={() => setSidebarOpen(false)} />)}
        </nav>

        {/* Bottom branding */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-2 text-sidebar-text text-xs">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span>Powered by KIE.AI</span>
          </div>
        </div>
      </aside>

      {/* ─── Main Content Area ─── */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-14 lg:h-16 border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-30 flex items-center px-4 lg:px-6 gap-3">
          {/* Hamburger menu button (mobile only) */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1"></div>
          <Link to="/settings" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <span className="hidden sm:inline">Settings</span>
          </Link>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}