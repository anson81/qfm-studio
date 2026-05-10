import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { apiClient } from '../lib/api'
import { toast } from 'sonner'
import { UserCircle, RefreshCw, Loader2, Upload } from 'lucide-react'

const STYLES = ['Talking Head', 'News Anchor', 'Product Review', 'Story Telling', 'Lip Sync']

export default function Avatar() {
  const [prompt, setPrompt] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [style, setStyle] = useState('Talking Head')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function handleGenerate() {
    if (!prompt.trim() && !imageUrl.trim()) { toast.error('Enter a prompt or provide a reference image'); return }
    if (!apiClient.hasKIEKey()) { toast.error('Add your KIE.API key in Settings first'); return }
    setLoading(true); setResult(null)
    try {
      const res = await apiClient.generateVideo({
        prompt: `Avatar lip-sync video, ${style} style: ${prompt || 'Professional person speaking naturally to camera'}`,
        model: 'kling-2.5-turbo',
        aspectRatio: '9:16',
        resolution: '720p',
        num_videos: 1
      })
      setResult(res)
      toast.success('Avatar video generation started!')
    } catch (err: any) { toast.error(err.message || 'Generation failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><UserCircle className="w-8 h-8" /> Avatar Lip Sync</h1>
        <p className="text-muted-foreground">Create AI avatar videos that lip-sync with your script — perfect for product showcases</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Upload className="w-5 h-5" /> Create Avatar Video</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Script / Prompt</label>
            <textarea className="w-full p-3 bg-sidebar border border-sidebar-border rounded-lg text-white min-h-[100px] resize-y" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., A professional introducing a new product collection, speaking warmly..." />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Reference Image URL (optional)</label>
            <input className="w-full p-3 bg-sidebar border border-sidebar-border rounded-lg text-white" value={imageUrl} onChange={(e: any) => setImageUrl(e.target.value)} placeholder="https://example.com/face.jpg" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Video Style</label>
            <select className="w-full p-2 bg-sidebar border border-sidebar-border rounded-lg text-white" value={style} onChange={(e) => setStyle(e.target.value)}>
              {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <Button onClick={handleGenerate} disabled={loading} className="w-full">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating Avatar...</> : <><RefreshCw className="w-4 h-4 mr-2" /> Generate Avatar Video</>}
          </Button>
        </CardContent>
      </Card>
      {result && (
        <Card>
          <CardHeader><CardTitle>Generation Started</CardTitle></CardHeader>
          <CardContent>
            <div className="p-4 bg-sidebar border border-sidebar-border rounded-lg text-sm space-y-2">
              <p><strong>Task ID:</strong> {result.taskId}</p>
              <p><strong>Status:</strong> {result.status}</p>
              <p><strong>Content ID:</strong> {result.content_id}</p>
              <p className="text-muted-foreground">Check your Content Library for progress.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}