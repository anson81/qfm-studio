import { useState, useEffect } from 'react'
import { Button } from '../components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { toast } from 'sonner'
import { Grid3x3, Download, Heart, Trash2, Search } from 'lucide-react'

interface GeneratedImage {
  id: string
  url: string
  prompt: string
  ethnicity: string
  style: string
  hijabColor: string
  background: string
  createdAt: string
}

const STORAGE_KEY = 'qfm_ai_girls'

const mockItems: GeneratedImage[] = [
  {
    id: 'mock-1',
    url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=600&fit=crop',
    prompt: 'Elegant Malay model in dusty pink hijab and floral baju kurung, minimal white studio, soft natural lighting',
    ethnicity: 'Malay',
    style: 'Elegant',
    hijabColor: 'Dusty Pink',
    background: 'Minimal white studio',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'mock-2',
    url: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400&h=600&fit=crop',
    prompt: 'Casual Indian model in nude hijab and pastel baju kurung, cafe interior, relaxed pose',
    ethnicity: 'Indian',
    style: 'Casual',
    hijabColor: 'Nude',
    background: 'Cafe interior',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'mock-3',
    url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&h=600&fit=crop',
    prompt: 'Sporty Chinese model in black hijab and athletic modest wear, urban street, confident pose',
    ethnicity: 'Chinese',
    style: 'Sporty',
    hijabColor: 'Black',
    background: 'Urban street',
    createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
  },
  {
    id: 'mock-4',
    url: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400&h=600&fit=crop',
    prompt: 'Mixed ethnicity model in pastel purple hijab and lace telekung, batik backdrop, elegant pose',
    ethnicity: 'Mixed',
    style: 'Elegant',
    hijabColor: 'Pastel Purple',
    background: 'Batik backdrop',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
]

export default function AIGirlGallery() {
  const [items, setItems] = useState<GeneratedImage[]>([])
  const [search, setSearch] = useState('')
  const [liked, setLiked] = useState<Set<string>>(new Set())

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const stored: GeneratedImage[] = raw ? JSON.parse(raw) : []
      if (stored.length === 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mockItems))
        setItems(mockItems)
      } else {
        setItems(stored)
      }
    } catch {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockItems))
      setItems(mockItems)
    }
  }, [])

  function toggleLike(id: string) {
    setLiked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function deleteItem(id: string) {
    const next = items.filter(i => i.id !== id)
    setItems(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
    toast.success('Removed from gallery')
  }

  async function downloadImage(url: string, filename?: string) {
    try {
      const a = document.createElement('a')
      a.href = url
      a.download = filename || `ai-girl-${Date.now()}.png`
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      toast.success('Download started')
    } catch {
      toast.error('Download failed')
    }
  }

  const filtered = items.filter(i =>
    [i.ethnicity, i.style, i.hijabColor, i.background, i.prompt]
      .some(s => s.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Grid3x3 className="w-7 h-7 text-primary" />
            AI Girl Gallery
          </h1>
          <p className="text-muted-foreground">Browse your AI girl creations.</p>
        </div>
        <Button variant="outline" onClick={() => window.location.hash = '#/ai-girl-generator'}>
          Generate New
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by ethnicity, style, color, background..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map(item => (
          <Card key={item.id} className="overflow-hidden">
            <div className="relative aspect-[3/4]">
              <img
                src={item.url}
                alt={item.prompt}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute top-2 right-2 flex gap-1">
                <button
                  onClick={() => toggleLike(item.id)}
                  className="p-1.5 rounded-full bg-white/80 hover:bg-white transition"
                >
                  <Heart className={`w-4 h-4 ${liked.has(item.id) ? 'text-red-500 fill-red-500' : 'text-muted-foreground'}`} />
                </button>
              </div>
            </div>
            <CardContent className="p-4 space-y-2">
              <div className="flex flex-wrap gap-1">
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{item.ethnicity}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{item.style}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{item.hijabColor}</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{item.prompt}</p>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => downloadImage(item.url, `ai-girl-${item.id}.png`)}>
                  <Download className="w-3.5 h-3.5 mr-1" /> Download
                </Button>
                <Button variant="ghost" size="sm" onClick={() => deleteItem(item.id)}>
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <Card>
          <CardContent className="p-5 text-center text-muted-foreground">
            No images match your search. Try a different keyword or generate new images.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
