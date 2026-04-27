import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { toast } from 'sonner'
import { Search, Download, Trash2, Loader2 } from 'lucide-react'

export default function ContentLibrary() {
  const [content, setContent] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setUser(data.session.user)
        fetchContent(data.session.user.id)
      } else { setLoading(false) }
    })
  }, [])

  async function fetchContent(uid: string) {
    let q = supabase.from('content').select('*').eq('user_id', uid).order('created_at', { ascending: false })
    const { data, error } = await q
    if (error) { toast.error('Failed to load content'); console.error(error) }
    else setContent(data || [])
    setLoading(false)
  }
  
  async function deleteItem(id: string) {
    if (!confirm('Delete this item?')) return
    const { error } = await supabase.from('content').delete().eq('id', id)
    if (error) toast.error('Delete failed')
    else { setContent(prev => prev.filter(c => c.id !== id)); toast.success('Deleted') }
  }

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
          <option value="ugc">UGC</option>
          <option value="storyboard">Storyboards</option>
        </select>
      </div>
      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No content found. Start generating!</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => (
            <Card key={item.id} className="overflow-hidden">
              {item.result_url && (
                <div className="aspect-video bg-muted flex items-center justify-center">
                  {item.type === 'image' ? (
                    <img src={item.result_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <video src={item.result_url} controls className="w-full h-full object-cover" />
                  )}
                </div>
              )}
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium uppercase bg-muted px-2 py-1 rounded">{item.type}</span>
                  <span className={`text-xs px-2 py-1 rounded ${item.status === 'completed' ? 'bg-green-100 text-green-700' : item.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{item.status}</span>
                </div>
                <p className="text-sm font-medium line-clamp-2 mb-2">{item.prompt}</p>
                <p className="text-xs text-muted-foreground mb-3">{item.model}{item.aspect_ratio ? ` • ${item.aspect_ratio}` : ''}</p>
                <div className="flex gap-2">
                  {item.result_url && <Button variant="outline" size="sm" onClick={() => window.open(item.result_url, '_blank')}><Download className="w-3 h-3" /></Button>}
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
