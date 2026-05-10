import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { apiClient, clearToken, getToken } from '../lib/api'
import { toast } from 'sonner'
import {
  User, Key, CreditCard, Bell, Shield, Save, LogOut,
  Wifi, WifiOff, RefreshCw, ExternalLink, Trash2
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const TABS = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'api', label: 'API Keys', icon: Key },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
] as const

type TabId = typeof TABS[number]['id']

export default function Settings() {
  // Default to API Keys tab if KIE key is not set
  const [activeTab, setActiveTab] = useState<TabId>(!localStorage.getItem('qfm_kie_key') ? 'api' : 'account')
  const [profile, setProfile] = useState({ full_name: '', telegram: '', phone: '' })
  const [kieKey, setKieKey] = useState('')
  const [googleKey, setGoogleKey] = useState('')
  const [balance, setBalance] = useState<number | null>(null)
  const [kieConnected, setKieConnected] = useState<boolean | null>(null)
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const [testingKIE, setTestingKIE] = useState(false)
  const [testingGoogle, setTestingGoogle] = useState(false)
  const [loading, setLoading] = useState(true)

  /* ─── Key mask helper: abc****xyz ─── */
  function maskKey(key: string | null): string {
    if (!key) return ''
    if (key.length <= 8) return key
    const start = key.slice(0, 4)
    const end = key.slice(-4)
    return `${start}****${end}`
  }
  const [telegramBotToken, setTelegramBotToken] = useState('')
  const [telegramChatId, setTelegramChatId] = useState('')
  const [telegramConfigured, setTelegramConfigured] = useState(false)
  const [notifications, setNotifications] = useState({
    generationComplete: true,
    lowCredits: true,
    newFeatures: false,
    emailUpdates: false,
  })
  const navigate = useNavigate()

  useEffect(() => {
    if (!getToken()) { navigate('/login'); return }
    apiClient.getSettings().then(data => {
      setProfile({
        full_name: data.full_name || '',
        telegram: data.telegram || '',
        phone: data.phone || '',
      })
    }).catch(() => {})
    setKieConnected(apiClient.hasKIEKey())
    setGoogleConnected(!!localStorage.getItem('qfm_google_key'))
    if (apiClient.hasKIEKey()) {
      apiClient.getCredits().then(result => {
        setKieConnected(true)
        setBalance(result.data)
      }).catch(() => setKieConnected(false))
    }
    // Load Telegram settings from backend
    fetch('/api/v1/notify/telegram', { headers: { 'Authorization': `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.configured) {
          setTelegramConfigured(true)
          if (data.chat_id) setTelegramChatId(data.chat_id)
        }
      }).catch(() => {})
    setLoading(false)
  }, [navigate])

  async function handleTestKIEConnection() {
    // Auto-save key to localStorage if user typed one but hasn't saved yet
    if (kieKey.trim()) {
      apiClient.setKIEKey(kieKey.trim())
    }
    if (!apiClient.hasKIEKey()) {
      toast.error('Please enter your KIE.AI API key first')
      setTestingKIE(false)
      return
    }
    setTestingKIE(true)
    try {
      const result = await apiClient.testKIEConnection()
      if (result.success) {
        setKieConnected(true)
        setBalance(result.credits ?? null)
        toast.success(`KIE.API Connected! Credits: ${result.credits ?? 'N/A'}`)
      } else {
        setKieConnected(false)
        setBalance(null)
        toast.error(result.error || 'KIE.API connection failed')
      }
    } catch (err: any) {
      setKieConnected(false)
      setBalance(null)
      toast.error(err.message || 'KIE.API connection failed')
    } finally {
      setTestingKIE(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      if (kieKey.trim()) {
        apiClient.setKIEKey(kieKey.trim())
        setKieKey('')
        // Auto-test after saving key
        try {
          const result = await apiClient.testKIEConnection()
          if (result.success) {
            setKieConnected(true)
            setBalance(result.credits ?? null)
            toast.success(`API key saved! Credits: ${result.credits ?? 'N/A'}`)
          } else {
            setKieConnected(false)
            setBalance(null)
            toast.error(result.error || 'Key saved but connection failed')
          }
        } catch {
          setKieConnected(false)
          setBalance(null)
          toast.error('Key saved but connection test failed')
        }
      } else {
        toast.success('Settings saved')
      }
      try {
        const data: any = { ...profile }
        await apiClient.updateSettings(data)
      } catch { /* backend may be unreachable */ }
    } catch (err: any) {
      toast.error(err.message || 'Save failed')
    } finally { setSaving(false) }
  }

  function handleLogout() {
    clearToken()
    navigate('/login')
  }

  if (loading) return <div className="p-6 text-foreground">Loading...</div>

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-3xl font-bold text-foreground">Settings</h1>

      {/* Tab bar — horizontally scrollable on mobile */}
      <div className="border-b border-border -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 overflow-x-auto">
        <nav className="flex gap-1 -mb-px min-w-max">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ─── Account Tab ─── */}
      {activeTab === 'account' && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-primary" /> Account Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
              <Input value={profile.full_name} onChange={e => setProfile(p => ({...p, full_name: e.target.value}))} placeholder="Your name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Telegram</label>
              <Input value={profile.telegram} onChange={e => setProfile(p => ({...p, telegram: e.target.value}))} placeholder="@yourhandle" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Phone</label>
              <Input value={profile.phone} onChange={e => setProfile(p => ({...p, phone: e.target.value}))} placeholder="+60..." />
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving}><Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save Changes'}</Button>
              <Button variant="outline" onClick={handleLogout}><LogOut className="w-4 h-4 mr-2" />Log Out</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── API Keys Tab ─── */}
      {activeTab === 'api' && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Key className="w-5 h-5 text-primary" /> KIE.AI API Key</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/* KIE Connection Status */}
              <div className={`flex items-center gap-3 p-3 rounded-lg border ${
                kieConnected ? 'bg-green-50 border-green-200' : kieConnected === false ? 'bg-red-50 border-red-200' : 'bg-muted border-border'
              }`}>
                {kieConnected ? <Wifi className="w-5 h-5 text-green-600" /> : <WifiOff className="w-5 h-5 text-red-500" />}
                <div className="flex-1">
                  <p className={`font-semibold text-sm ${kieConnected ? 'text-green-800' : kieConnected === false ? 'text-red-800' : 'text-muted-foreground'}`}>
                    {kieConnected ? 'KIE.API Connected' : kieConnected === false ? 'KIE.API Not Connected' : 'KIE.API Status: Unknown'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {!kieKey && !kieConnected ? 'Add your API key below and save to connect' : kieConnected ? 'Your API key is valid and active' : 'Check your API key and try again'}
                  </p>
                </div>
                {balance !== null && (
                  <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border shadow-sm">
                    <CreditCard className="w-3.5 h-3.5 text-primary" />
                    <span className="text-sm font-semibold text-foreground">{balance.toLocaleString()} credits</span>
                  </div>
                )}
              </div>

              <div className="bg-muted rounded-lg p-3 text-sm text-muted-foreground">
                <p>Your KIE.AI API key is stored locally in your browser (never sent to our servers).</p>
                <p className="mt-1">Get your key at <a href="https://kie.ai/api-key" target="_blank" rel="noopener noreferrer" className="text-primary font-medium inline-flex items-center gap-1 hover:text-primary-700 transition-colors">kie.ai/api-key <ExternalLink className="w-3 h-3" /></a></p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">API Key</label>
                <Input type="password" value={kieKey} onChange={e => setKieKey(e.target.value)}
                  placeholder={kieConnected ? 'Enter new key to replace current' : 'Enter your KIE.AI API Key'}
                  className="font-mono text-sm" />
                {kieConnected && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Saved key: <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-foreground">{maskKey(localStorage.getItem('qfm_kie_key'))}</code>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={handleTestKIEConnection} disabled={testingKIE}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${testingKIE ? 'animate-spin' : ''}`} />
                  {testingKIE ? 'Testing...' : 'Test & Save'}
                </Button>
                {kieConnected && (
                  <Button variant="outline" size="sm" className="text-destructive border-red-200 hover:bg-red-50 hover:border-red-300" onClick={() => {
                    apiClient.clearKIEKey()
                    setKieConnected(false)
                    setBalance(null)
                    toast.success('KIE.API key removed')
                  }}>
                    <Trash2 className="w-4 h-4 mr-1" />Remove
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Key className="w-5 h-5 text-blue-500" /> Google AI Studio Key <span className="ml-2 text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">FREE Text & Image</span></CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className={`flex items-center gap-3 p-3 rounded-lg border ${
                googleConnected ? 'bg-green-50 border-green-200' : googleConnected === false ? 'bg-red-50 border-red-200' : 'bg-muted border-border'
              }`}>
                {googleConnected ? <Wifi className="w-5 h-5 text-green-600" /> : <WifiOff className="w-5 h-5 text-slate-400" />}
                <div className="flex-1">
                  <p className={`font-semibold text-sm ${googleConnected ? 'text-green-800' : 'text-muted-foreground'}`}>
                    {googleConnected ? 'Google AI Studio Connected' : 'Not Connected'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {googleConnected ? 'Free Gemini Flash for text & image generation' : 'Add key to unlock FREE text generation (saves KIE credits)'}
                  </p>
                </div>
                {googleConnected && (
                  <span className="text-xs px-2.5 py-1 bg-green-50 text-green-700 rounded-full font-medium border border-green-200">$0</span>
                )}
              </div>

              <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800 border border-blue-100">
                <p><strong>Why add this?</strong> Google AI Studio provides Gemini 2.5 Flash — perfect for captions, hooks, hashtags, and text generation. It's <strong>100% FREE</strong> with generous rate limits.</p>
                <p className="mt-1">This saves your KIE credits for video & premium image generation.</p>
              </div>

              <div className="bg-muted rounded-lg p-3 text-sm text-muted-foreground">
                <p>Get your free key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-primary font-medium inline-flex items-center gap-1 hover:text-primary-700 transition-colors">aistudio.google.com/apikey <ExternalLink className="w-3 h-3" /></a></p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">API Key</label>
                <Input type="password" value={googleKey} onChange={e => setGoogleKey(e.target.value)}
                  placeholder={googleConnected ? 'Enter new key to replace current' : 'Enter your Google AI Studio API Key'}
                  className="font-mono text-sm" />
                {googleConnected && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Saved key: <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-foreground">{maskKey(localStorage.getItem('qfm_google_key'))}</code>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={async () => {
                  const key = googleKey.trim()
                  if (!key) { toast.error('Enter your Google AI Studio key first'); return }
                  // Test by making a simple API call
                  try {
                    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ contents: [{ parts: [{ text: 'Say hi' }] }] })
                    })
                    if (res.ok) {
                      localStorage.setItem('qfm_google_key', key)
                      setGoogleConnected(true)
                      setGoogleKey('')
                      // Sync to backend for Video Analyzer server-side use
                      try { await apiClient.updateSettings({ google_api_key: key }) } catch {}
                      toast.success('Google AI Studio connected! FREE text generation enabled 🎉')
                    } else {
                      const err = await res.json().catch(() => ({}))
                      setGoogleConnected(false)
                      toast.error(err.error?.message || 'Invalid API key')
                    }
                  } catch { setGoogleConnected(false); toast.error('Connection failed') }
                }}>
                  <RefreshCw className="w-4 h-4 mr-2" />Test & Save
                </Button>
                {googleConnected && (
                  <Button variant="outline" size="sm" className="text-destructive border-red-200 hover:bg-red-50 hover:border-red-300" onClick={() => {
                    localStorage.removeItem('qfm_google_key')
                    setGoogleConnected(false)
                    // Remove from backend too
                    try { apiClient.updateSettings({ google_api_key: '' }) } catch {}
                    toast.success('Google AI Studio key removed')
                  }}>
                    <Trash2 className="w-4 h-4 mr-1" />Remove
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">API Key Security</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>⚠️ <strong className="text-foreground">Never share your API key</strong> — it provides direct access to your KIE.AI credits.</p>
              <p>🔒 Your key is stored in <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">localStorage</code> and never transmitted to our backend.</p>
              <p>💡 If your key is compromised, regenerate it at <a href="https://kie.ai/api-key" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-700 transition-colors">kie.ai/api-key</a>.</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Billing Tab ─── */}
      {activeTab === 'billing' && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary" /> Credit Balance</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-6 p-6 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
                <div>
                  <p className="text-sm text-muted-foreground">Available Credits</p>
                  <p className="text-4xl font-bold text-foreground">{balance !== null ? balance.toLocaleString() : '—'}</p>
                </div>
                <div className="flex-1" />
                <a href="https://kie.ai/billing" target="_blank" rel="noopener noreferrer">
                  <Button><CreditCard className="w-4 h-4 mr-2" />Add Credits</Button>
                </a>
              </div>

              <div className="bg-muted rounded-lg p-3 text-sm text-muted-foreground">
                <p><strong className="text-foreground">How credits work:</strong></p>
                <ul className="mt-1 list-disc list-inside space-y-1">
                  <li>Credits are deducted per generation (images ~2-3, videos ~15-30, music ~5)</li>
                  <li>Purchase credits directly at <a href="https://kie.ai/billing" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-700 transition-colors">kie.ai/billing</a></li>
                  <li>Check your <a href="https://kie.ai/logs" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-700 transition-colors">usage logs</a> for detailed history</li>
                </ul>
              </div>

              <Button variant="outline" onClick={handleTestKIEConnection} disabled={testingKIE}>
                <RefreshCw className={`w-4 h-4 mr-2 ${testingKIE ? 'animate-spin' : ''}`} />
                {testingKIE ? 'Refreshing...' : 'Refresh Balance'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Pricing Guide</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                  <p className="text-2xl font-bold text-foreground">~2</p>
                  <p className="text-sm text-muted-foreground">Image generation</p>
                </div>
                <div className="p-4 rounded-xl bg-purple-50 border border-purple-100">
                  <p className="text-2xl font-bold text-foreground">~15-30</p>
                  <p className="text-sm text-muted-foreground">Video generation</p>
                </div>
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
                  <p className="text-2xl font-bold text-foreground">~5</p>
                  <p className="text-sm text-muted-foreground">Music generation</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">* Prices vary by model. See <a href="https://kie.ai/billing" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-700 transition-colors">kie.ai/billing</a> for current rates.</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Notifications Tab ─── */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5 text-primary" /> Notification Preferences</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'generationComplete' as const, label: 'Generation Complete', desc: 'Notify when image/video/music generation finishes' },
                { key: 'lowCredits' as const, label: 'Low Credit Warning', desc: 'Alert when credit balance drops below 50' },
                { key: 'newFeatures' as const, label: 'New Features', desc: 'Updates about new models and tools' },
                { key: 'emailUpdates' as const, label: 'Email Updates', desc: 'Monthly product and tips newsletter' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <button
                    onClick={() => setNotifications(n => ({...n, [item.key]: !n[item.key]}))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                      notifications[item.key] ? 'bg-primary' : 'bg-border'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                      notifications[item.key] ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2">📱 Telegram Notifications <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">New</span></CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800 border border-blue-100">
                <p><strong>Get instant Telegram notifications</strong> when your AI generations complete — perfect for long-running video generations!</p>
                <p className="mt-1">Create a bot via <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-primary font-medium">@BotFather</a>, then get your Chat ID from <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="text-primary font-medium">@userinfobot</a>.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Bot Token</label>
                <Input type="password" value={telegramBotToken} onChange={e => setTelegramBotToken(e.target.value)}
                  placeholder={telegramConfigured ? 'Bot token saved ••••••••' : '123456:ABC-DEF...'} className="font-mono text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Chat ID</label>
                <Input value={telegramChatId} onChange={e => setTelegramChatId(e.target.value)}
                  placeholder={telegramConfigured ? 'Chat ID saved' : 'Your Telegram Chat ID (numbers)'} className="font-mono text-sm" />
              </div>

              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={async () => {
                  const token = telegramBotToken.trim() || ''
                  const chatId = telegramChatId.trim() || ''
                  if (!token || !chatId) { toast.error('Enter bot token and chat ID first'); return }
                  try {
                    const res = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ chat_id: chatId, text: '✅ QFM Studio Telegram notifications connected!' })
                    })
                    if (res.ok) { toast.success('Test notification sent! Check your Telegram.') }
                    else { const err = await res.json().catch(() => ({})); toast.error(err.description || 'Failed to send test notification') }
                  } catch { toast.error('Connection failed. Check your bot token.') }
                }}>
                  📨 Test Notification
                </Button>
                {(telegramBotToken.trim() || telegramChatId.trim()) && (
                  <Button onClick={async () => {
                    try {
                      await fetch('/api/v1/notify/telegram/setup', {
                        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                        body: JSON.stringify({ bot_token: telegramBotToken.trim(), chat_id: telegramChatId.trim() })
                      })
                      toast.success('Telegram settings saved! You\'ll get notifications when generations complete.')
                    } catch { toast.error('Failed to save — backend may be offline') }
                  }}><Save className="w-4 h-4 mr-2" />Save</Button>
                )}
                {telegramConfigured && (
                  <Button variant="outline" size="sm" className="text-destructive border-red-200 hover:bg-red-50" onClick={async () => {
                    try {
                      await fetch('/api/v1/notify/telegram', { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } })
                      setTelegramConfigured(false)
                      setTelegramBotToken('')
                      setTelegramChatId('')
                      toast.success('Telegram settings removed')
                    } catch { toast.error('Failed to remove') }
                  }}><Trash2 className="w-4 h-4 mr-1" />Remove</Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Security Tab ─── */}
      {activeTab === 'security' && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> Security Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">API Key Storage</p>
                  <p className="text-xs text-muted-foreground">Your KIE.AI key is stored in browser localStorage (not on our servers)</p>
                </div>
                <span className="text-xs px-2.5 py-1 bg-green-50 text-green-700 rounded-full font-medium border border-green-200">Secure</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">Direct API Calls</p>
                  <p className="text-xs text-muted-foreground">Generation requests go directly to KIE.AI (not through our servers)</p>
                </div>
                <span className="text-xs px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full font-medium border border-purple-200">Privacy-first</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">Content Auto-Deletion</p>
                  <p className="text-xs text-muted-foreground">Generated content URLs expire after 1 hour</p>
                </div>
                <span className="text-xs px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full font-medium border border-amber-200">Auto-delete</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Danger Zone</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Clear KIE.API Key</p>
                  <p className="text-xs text-muted-foreground">Remove your API key from this browser</p>
                </div>
                <Button variant="outline" size="sm" className="text-destructive border-red-200 hover:bg-red-50 hover:border-red-300" onClick={() => {
                  apiClient.clearKIEKey()
                  setKieConnected(false)
                  setBalance(null)
                  toast.success('KIE.API key removed')
                }}>
                  <Trash2 className="w-4 h-4 mr-1" />Clear Key
                </Button>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Sign Out</p>
                  <p className="text-xs text-muted-foreground">Sign out of your QFM Studio account</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-1" />Log Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}