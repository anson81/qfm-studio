import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { toast } from 'sonner'
import { Key, CreditCard, User, Save, LogOut } from 'lucide-react'

export default function Settings() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState({ full_name: '', telegram: '', phone: '' })
  const [kieKey, setKieKey] = useState('')
  const [balance, setBalance] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return
      setUser(data.session.user)
      fetchProfile(data.session.user.id)
    })
  }, [])

  async function fetchProfile(uid: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single()
    if (data) {
      setProfile(data)
      setKieKey(data.kie_api_key || '')
    }
    try {
      const res = await supabase.functions.invoke('kie-balance')
      if (res.data?.credit_balance) setBalance(res.data.credit_balance)
    } catch { /* no key set yet */ }
  }

  async function handleSave() {
    if (!user) return
    setSaving(true)
    const { error } = await supabase.from('profiles').upsert({
      id: user.id, ...profile, kie_api_key: kieKey,
      updated_at: new Date().toISOString(),
    })
    if (error) { toast.error('Save failed'); console.error(error) }
    else { toast.success('Settings saved'); localStorage.setItem('kie_api_key', kieKey) }
    setSaving(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    localStorage.removeItem('kie_api_key')
    window.location.reload()
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-3xl font-bold">Settings</h1>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-5 h-5" /> Account</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><label className="text-sm font-medium">Full Name</label><Input value={profile.full_name} onChange={e => setProfile(p => ({...p, full_name: e.target.value}))} /></div>
          <div><label className="text-sm font-medium">Email</label><Input value={user?.email || ''} disabled className="bg-muted" /></div>
          <div><label className="text-sm font-medium">Telegram</label><Input value={profile.telegram} onChange={e => setProfile(p => ({...p, telegram: e.target.value}))} placeholder="@yourhandle" /></div>
          <div><label className="text-sm font-medium">Phone</label><Input value={profile.phone} onChange={e => setProfile(p => ({...p, phone: e.target.value}))} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Key className="w-5 h-5" /> KIE.AI API Key</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted rounded-md p-3 text-sm text-muted-foreground">
            <p>Your KIE.AI API key is stored securely. Find it at <a href="https://kie.ai" target="_blank" rel="noopener noreferrer" className="text-primary">kie.ai</a> under Account &gt; API.</p>
          </div>
          <Input type="password" value={kieKey} onChange={e => setKieKey(e.target.value)} placeholder="Enter KIE.AI API Key" className="font-mono text-sm" />
          {balance && (
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
