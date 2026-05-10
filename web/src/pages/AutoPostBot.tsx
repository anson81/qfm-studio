import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { apiClient } from '../lib/api'
import { toast } from 'sonner'
import { Clock, Loader2, Send, CheckCircle, XCircle } from 'lucide-react'

const LANGUAGES = [
  { value: 'ms', label: 'Bahasa Malaysia' },
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文 (Mandarin)' },
  { value: 'zh-hk', label: '粤语 (Cantonese)' },
  { value: 'ta', label: 'தமிழ் (Tamil)' },
]

const LANGUAGE_NAMES: Record<string, string> = {
  'ms': 'Bahasa Malaysia',
  'en': 'English',
  'zh': '中文 (Mandarin)',
  'zh-hk': '粤语 (Cantonese)',
  'ta': 'தமிழ் (Tamil)',
}

interface ScheduleItem {
  id: number
  platform: string
  content: string
  scheduled_at: string
  repeat: string
  status: string
}

export default function AutoPostBot() {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([])
  const [platform, setPlatform] = useState('TikTok')
  const [content, setContent] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [repeat, setRepeat] = useState('none')
  const [loading, setLoading] = useState(true)
  const [dialogueLanguage, setDialogueLanguage] = useState('ms')
  const [generating, setGenerating] = useState(false)

  // Using the content API as a simple scheduler for now
  // A real implementation would need a separate scheduler table and worker
  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const content = await apiClient.listContent()
      // Filter for text content that might be scheduled posts
      const textItems = (content || []).filter((c: any) => c.type === 'text').slice(0, 20)
      setSchedules(textItems.map((c: any) => ({
        id: c.id,
        platform: 'TikTok',
        content: c.prompt?.slice(0, 100) || c.result_url?.slice(0, 100) || 'Draft',
        scheduled_at: c.created_at || '',
        repeat: 'none',
        status: 'draft'
      })))
    } catch { /* empty */ }
    finally { setLoading(false) }
  }

  async function handleCreate() {
    if (!apiClient.hasKIEKey()) { toast.error('Add your KIE.API key in Settings first'); return }
    if (!content.trim()) { toast.error('Enter content'); return }
    setGenerating(true)
    try {
      const res = await apiClient.generateTextSmart({
        system_prompt: `You are a social media post formatter. Language: ${LANGUAGE_NAMES[dialogueLanguage]}. All content MUST be in ${LANGUAGE_NAMES[dialogueLanguage]}. Format the following as an engaging social media post for the specified platform. Add relevant hashtags.`,
        user_message: `Platform: ${platform}. Content: ${content}`,
        model: 'claude-sonnet-4-5'
      })
      toast.success('Draft saved!')
      loadData()
      setContent('')
    } catch (err: any) { toast.error(err.message || 'Failed') }
    finally { setGenerating(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Auto Post Bot</h1>
        <p className="text-muted-foreground">Schedule and manage your social media content</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" /> Create Post</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Content</label>
            <textarea className="w-full p-3 bg-sidebar border border-sidebar-border rounded-lg text-white min-h-[100px] resize-y" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your post content or describe what you want to post..." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Platform</label>
              <select className="w-full p-2 bg-sidebar border border-sidebar-border rounded-lg text-white" value={platform} onChange={(e) => setPlatform(e.target.value)}>
                {['TikTok', 'Instagram', 'Shopee', 'Facebook'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Schedule (optional)</label>
              <input type="datetime-local" className="w-full p-2 bg-sidebar border border-sidebar-border rounded-lg text-white" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Repeat</label>
              <select className="w-full p-2 bg-sidebar border border-sidebar-border rounded-lg text-white" value={repeat} onChange={(e) => setRepeat(e.target.value)}>
                {['none', 'daily', 'weekly'].map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Language</label>
            <select className="w-full p-2 bg-sidebar border border-sidebar-border rounded-lg text-white" value={dialogueLanguage} onChange={e => setDialogueLanguage(e.target.value)}>
              {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
          <Button onClick={handleCreate} disabled={generating} className="w-full">{generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</> : <><Send className="w-4 h-4 mr-2" />Save Draft</>}</Button>
        </CardContent>
      </Card>
      {schedules.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Recent Drafts</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {schedules.map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-sidebar border border-sidebar-border rounded-lg">
                <div className="flex-1">
                  <p className="text-sm truncate">{s.content}</p>
                  <p className="text-xs text-muted-foreground">{s.platform} · {s.scheduled_at ? new Date(s.scheduled_at).toLocaleDateString() : 'No date'}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-400">{s.status}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}