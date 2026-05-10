import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { toast } from 'sonner'
import { apiClient } from '../lib/api'
import { Search, Download, Trash2, Loader2, FolderOpen, Plus, Video, Image } from 'lucide-react'

export default function ContentLibrary() {
  const [content, setContent] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')

  useEffect(() => {
    fetchContent()
  }, [])

  async function fetchContent() {
    setLoading(true)
    try {
      const data = await apiClient.listContent()
      setContent(data || [])
    } catch (err: any) { toast.error('Failed to load content') }
    finally { setLoading(false) }
  }

  async function deleteItem(id: number) {
    if (!confirm('Delete this item?')) return
    try {
      await apiClient.deleteContent(id)
      setContent(prev => prev.filter(c => c.id !== id))
      toast.success('Deleted')
    } catch { toast.error('Delete failed') }
  }

  async function refreshStatuses() {
    const processing = content.filter(c => c.status === 'processing' && c.kie_task_id)
    if (processing.length === 0) return
    try {
      const taskIds = processing.map(c => c.kie_task_id)
      const videoIds = processing.filter(c => c.type === 'video' && c.kie_task_id).map(c => c.kie_task_id)
      const imageIds = processing.filter(c => c.type === 'image' && c.kie_task_id).map(c => c.kie_task_id)

      let updates: Record<string, any> = {}
      if (videoIds.length > 0) {
        const v = await apiClient.videoStatus(videoIds)
        if (typeof v === 'object') Object.assign(updates, v)
      }
      if (imageIds.length > 0) {
        const i = await apiClient.imageStatus(imageIds)
        if (typeof i === 'object') Object.assign(updates, i)
      }

      setContent(prev => prev.map(c => {
        if (!c.kie_task_id) return c
        const st = updates[c.kie_task_id]
        if (!st) return c
        if (st.status === 'completed' && st.url) {
          return { ...c, status: 'completed', result_url: st.url }
        } else if (st.status === 'failed') {
          return { ...c, status: 'failed' }
        }
        return c
      }))
    } catch { /* ignore */ }
  }

  useEffect(() => {
    const iv = setInterval(refreshStatuses, 5000)
    return () => clearInterval(iv)
  }, [content])

  const filtered = content.filter(c => {
    if (filterType !== 'all' && c.type !== filterType) return false
    if (search && !c.prompt?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Content Library</h1>
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by prompt..." className="pl-10" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="h-10 rounded-md border border-border bg-background px-3 text-sm">
          <option value="all">All Types</option>
          <option value="image">Images</option>
          <option value="video">Videos</option>
          <option value="text">Text</option>
          <option value="ugc">UGC</option>
          <option value="storyboard">Storyboards</option>
        </select>
      </div>
      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>
      ) : filtered.length === 0 && content.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-5">
            <FolderOpen className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No content yet</h3>
          <p className="text-muted-foreground mb-6 max-w-sm">Create your first image or video to get started with AI-powered content creation.</p>
          <div className="flex gap-3">
            <Link to="/image-generator">
              <Button variant="outline" className="gap-2">
                <Image className="w-4 h-4" /> Create Image
              </Button>
            </Link>
            <Link to="/video-generator">
              <Button className="gap-2">
                <Video className="w-4 h-4" /> Create Video
              </Button>
            </Link>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No content matches your search.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => (
            <Card key={item.id} className="overflow-hidden">
              {item.type === 'image' && item.result_url ? (
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <img src={item.result_url} alt="" className="w-full h-full object-cover" />
                </div>
              ) : item.type === 'video' && item.result_url ? (
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <video src={item.result_url} controls className="w-full h-full object-cover" />
                </div>
              ) : item.type === 'text' ? null : (
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                </div>
              )}
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium uppercase bg-muted px-2 py-1 rounded">{item.type}</span>
                  <span className={`text-xs px-2 py-1 rounded ${item.status === 'completed' ? 'bg-green-100 text-green-700' : item.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>{item.status}</span>
                </div>
                <p className="text-sm font-medium line-clamp-2 mb-2">{item.prompt}</p>
                <p className="text-xs text-muted-foreground mb-3">{item.model}{item.aspect_ratio ? ` · ${item.aspect_ratio}` : ''}</p>
                {item.type === 'text' && item.result_url && (
                  <p className="text-xs text-muted-foreground bg-muted p-2 rounded line-clamp-3 mb-2">{item.result_url}</p>
                )}
                <div className="flex gap-2">
                  {item.result_url && item.type !== 'text' && <Button variant="outline" size="sm" onClick={() => window.open(item.result_url, '_blank')}><Download className="w-3 h-3" /></Button>}
                  {item.type === 'text' && item.result_url && <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(item.result_url); toast.success('Copied!') }}>Copy</Button>}
                  <Button variant="outline" size="sm" className="text-red-500" onClick={() => deleteItem(item.id)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
