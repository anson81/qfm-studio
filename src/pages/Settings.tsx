import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { apiClient, clearToken, getToken } from '../lib/api'
import { toast } from 'sonner'
import { Key, CreditCard, User, Save, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Settings() {
  const [profile, setProfile] = useState({ full_name: '', telegram: '', phone: '' })
  const [kieKey, setKieKey] = useState('')
  const [balance, setBalance] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    if (!getToken()) { navigate('/login'); return }
    apiClient.getSettings().then(data => {
      setProfile({
        full_name: data.full_name || '',
        telegram: data.telegram || '',
        phone: data.phone || '',
      })
      setBalance(data.credit_balance ?? null)
    }).catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false))
  }, [navigate])

  async function handleSave() {
    setSaving(true)
    try {
      const data: any = { ...profile }
      if (kieKey.trim()) data.kie_api_key = kieKey.trim()
      await apiClient.updateSettings(data)
      toast.success('Settings saved')
      setKieKey('')
      const s = await apiClient.getSettings()
      setBalance(s.credit_balance ?? null)
    } catch (err: any) {
      toast.error(err.message || 'Save failed')
    } finally { setSaving(false) }
  }

  async function handleLogout() {
    clearToken()
    navigate('/login')
  }

  if (loading) return <div className="p-6">Loading...</div>

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-3xl font-bold">Settings</h1>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-5 h-5" /> Account</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><label className="text-sm font-medium">Full Name</label><Input value={profile.full_name} onChange={e => setProfile(p => ({...p, full_name: e.target.value}))} /></div>
          <div><label className="text-sm font-medium">Telegram</label><Input value={profile.telegram} onChange={e => setProfile(p => ({...p, telegram: e.target.value}))} placeholder="@yourhandle" /></div>
          <div><label className="text-sm font-medium">Phone</label><Input value={profile.phone} onChange={e => setProfile(p => ({...p, phone: e.target.value}))} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Key className="w-5 h-5" /> KIE.AI API Key</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted rounded-md p-3 text-sm text-muted-foreground">
            <p>Your KIE.AI key is stored encrypted on our server. Find it at <a href="https://kie.ai" target="_blank" rel="noopener noreferrer" className="text-primary">kie.ai</a>.</p>
          </div>
          <Input type="password" value={kieKey} onChange={e => setKieKey(e.target.value)} placeholder="Enter new KIE.AI API Key" className="font-mono text-sm" />
          {balance !== null && (
            <div className="flex items-center gap-2 text-sm">
              <CreditCard className="w-4 h-4" />
              <span className="font-medium">Balance: {balance}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button onClick={handleSave} disabled={saving}><Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save Settings'}</Button>
        <Button variant="outline" onClick={handleLogout}><LogOut className="w-4 h-4 mr-2" />Log Out</Button>
      </div>
    </div>
  )
}
