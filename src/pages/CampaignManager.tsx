import { useState, useEffect } from 'react'
import { Button } from '../components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { toast } from 'sonner'
import { Megaphone, TrendingUp, Coins, Plus, Trash2, CalendarDays } from 'lucide-react'

interface Campaign {
  id: string
  name: string
  platform: 'TikTok' | 'Shopee'
  budget: number
  startDate: string
  endDate: string
  status: 'Draft' | 'Running' | 'Completed'
  notes: string
}

const STORAGE_KEY = 'qfm_campaigns'

function getProgress(start: string, end: string): number {
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  const now = Date.now()
  if (e <= s) return 100
  const pct = ((now - s) / (e - s)) * 100
  return Math.min(100, Math.max(0, pct))
}

function statusBadge(status: Campaign['status']) {
  const map: Record<string, string> = {
    Draft: 'bg-slate-100 text-slate-700',
    Running: 'bg-emerald-100 text-emerald-700',
    Completed: 'bg-blue-100 text-blue-700',
  }
  return map[status] || 'bg-muted text-muted-foreground'
}

export default function CampaignManager() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [platform, setPlatform] = useState<'TikTok' | 'Shopee'>('TikTok')
  const [budget, setBudget] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setCampaigns(JSON.parse(raw))
    } catch {}
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(campaigns))
  }, [campaigns])

  function addCampaign() {
    if (!name.trim() || !startDate || !endDate) {
      toast.error('Please fill in name, start date and end date')
      return
    }
    const now = new Date().toISOString().split('T')[0]
    let status: Campaign['status'] = 'Draft'
    if (startDate <= now && endDate >= now) status = 'Running'
    if (endDate < now) status = 'Completed'

    const newCampaign: Campaign = {
      id: crypto.randomUUID(),
      name: name.trim(),
      platform,
      budget: Number(budget) || 0,
      startDate,
      endDate,
      status,
      notes: notes.trim(),
    }
    setCampaigns(prev => [newCampaign, ...prev])
    toast.success('Campaign created')
    setName('')
    setBudget('')
    setStartDate('')
    setEndDate('')
    setNotes('')
    setShowForm(false)
  }

  function deleteCampaign(id: string) {
    setCampaigns(prev => prev.filter(c => c.id !== id))
    toast.success('Campaign deleted')
  }

  const totalBudget = campaigns.reduce((sum, c) => sum + (c.budget || 0), 0)
  const runningCount = campaigns.filter(c => c.status === 'Running').length
  const completedCount = campaigns.filter(c => c.status === 'Completed').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Megaphone className="w-7 h-7 text-primary" />
            Campaign Manager
          </h1>
          <p className="text-muted-foreground">Track marketing campaigns across TikTok and Shopee.</p>
        </div>
        <Button onClick={() => setShowForm(s => !s)}>
          <Plus className="w-4 h-4 mr-2" />
          {showForm ? 'Close' : 'New Campaign'}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <Coins className="w-8 h-8 text-amber-500" />
            <div>
              <p className="text-sm text-muted-foreground">Total Budget</p>
              <p className="text-xl font-bold">RM {totalBudget.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-emerald-500" />
            <div>
              <p className="text-sm text-muted-foreground">Running</p>
              <p className="text-xl font-bold">{runningCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <CalendarDays className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-xl font-bold">{completedCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Campaign</CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Campaign Name</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Raya 2026 Collection" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Platform</label>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={platform}
                  onChange={e => setPlatform(e.target.value as 'TikTok' | 'Shopee')}
                >
                  <option value="TikTok">TikTok</option>
                  <option value="Shopee">Shopee</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Budget (RM)</label>
                <Input type="number" value={budget} onChange={e => setBudget(e.target.value)} placeholder="5000" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Start Date</label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">End Date</label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                placeholder="Campaign objectives, notes..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
            <Button onClick={addCampaign} className="w-full sm:w-auto">
              Save Campaign
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {campaigns.length === 0 && (
          <Card>
            <CardContent className="p-5 text-center text-muted-foreground">
              No campaigns yet. Click "New Campaign" to create one.
            </CardContent>
          </Card>
        )}
        {campaigns.map(c => {
          const pct = c.status === 'Completed' ? 100 : c.status === 'Draft' ? 0 : getProgress(c.startDate, c.endDate)
          return (
            <Card key={c.id} className="border-l-4 border-l-primary">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{c.name}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge(c.status)}`}>{c.status}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>{c.platform}</span>
                      <span className="flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5" />
                        RM {c.budget.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {c.startDate} &rarr; {c.endDate}
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => deleteCampaign(c.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
                {c.status === 'Running' && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Progress</span>
                      <span>{Math.round(pct)}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}
                {c.notes && <p className="text-sm text-muted-foreground">{c.notes}</p>}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
