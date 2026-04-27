import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { toast } from 'sonner'
import { Clock, Calendar, Repeat, Zap, Check, Trash2 } from 'lucide-react'

const PLATFORMS = ['TikTok','Instagram','Shopee','Facebook']
const TIMES = ['7:00 AM','12:00 PM','5:00 PM','8:00 PM','10:00 PM']

interface Schedule {
  id: string
  platform: string
  content: string
  date: string
  time: string
  repeat: boolean
  status: 'scheduled' | 'posted' | 'draft'
}

export default function AutoPostBot() {
  const [schedules, setSchedules] = useState<Schedule[]>(() => {
    const s = localStorage.getItem('qfm_autopost_schedules')
    return s ? JSON.parse(s) : [
      { id:'1', platform:'TikTok', content:'New Raya collection drop!', date:'2026-04-28', time:'8:00 PM', repeat:false, status:'scheduled' },
      { id:'2', platform:'Instagram', content:'Behind the scenes: how we fold tudung', date:'2026-04-29', time:'12:00 PM', repeat:true, status:'draft' },
    ]
  })
  const [platform, setPlatform] = useState('TikTok')
  const [content, setContent] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('8:00 PM')

  function save(s: Schedule[]) {
    localStorage.setItem('qfm_autopost_schedules', JSON.stringify(s))
    setSchedules(s)
  }

  function addSchedule() {
    if (!content.trim() || !date) { toast.error('Fill content and date'); return }
    const s: Schedule = { id: Date.now().toString(), platform, content, date, time, repeat:false, status:'scheduled' }
    save([...schedules, s])
    setContent('')
    toast.success('Scheduled!')
  }

  function deleteSchedule(id: string) {
    save(schedules.filter(s => s.id !== id))
  }

  function markPosted(id: string) {
    save(schedules.map(s => s.id===id ? {...s, status:'posted' as const} : s))
  }

  const upcoming = schedules.filter(s => s.status !== 'posted').sort((a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
  const posted = schedules.filter(s => s.status === 'posted')

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">AutoPost Bot</h1>
      <p className="text-muted-foreground">Schedule your content to post automatically across platforms.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card><CardContent className="p-5 space-y-4">
            <h3 className="font-semibold flex items-center gap-2"><Zap className="w-4 h-4"/> New Schedule</h3>
            <div><label className="text-sm">Platform</label>
              <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={platform} onChange={e=>setPlatform(e.target.value)}>
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div><label className="text-sm">Content</label>
              <textarea className="min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm" value={content} onChange={e=>setContent(e.target.value)} placeholder="Caption..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm">Date</label>
                <input type="date" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={date} onChange={e=>setDate(e.target.value)} />
              </div>
              <div><label className="text-sm">Time</label>
                <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={time} onChange={e=>setTime(e.target.value)}>
                  {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <Button onClick={addSchedule} className="w-full"><Calendar className="w-4 h-4 mr-2"/>Schedule Post</Button>
          </CardContent></Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-semibold">Upcoming ({upcoming.length})</h3>
          {upcoming.map(s => (
            <Card key={s.id} className={s.status==='draft'?'border-yellow-200':'border-border'}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium bg-primary text-white px-2 py-0.5 rounded">{s.platform}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${s.status==='scheduled'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>{s.status}</span>
                    {s.repeat && <span className="text-xs bg-muted px-2 py-0.5 rounded"><Repeat className="w-3 h-3 inline"/></span>}
                  </div>
                  <p className="font-medium text-sm">{s.content}</p>
                  <p className="text-xs text-muted-foreground">{s.date} at {s.time}</p>
                </div>
                <div className="flex gap-2">
                  {s.status==='scheduled' && <Button variant="outline" size="sm" onClick={()=>markPosted(s.id)}><Check className="w-3 h-3"/></Button>}
                  <Button variant="outline" size="sm" className="text-red-500" onClick={()=>deleteSchedule(s.id)}><Trash2 className="w-3 h-3"/></Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {upcoming.length===0 && <p className="text-muted-foreground text-center py-8">No upcoming posts. Schedule one!</p>}

          {posted.length>0 && (
            <>
              <h3 className="font-semibold mt-6">Posted ({posted.length})</h3>
              {posted.map(s => (
                <Card key={s.id} className="opacity-60">
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded">{s.platform}</span>
                      <p className="font-medium text-sm">{s.content}</p>
                      <p className="text-xs text-muted-foreground">{s.date} at {s.time}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
