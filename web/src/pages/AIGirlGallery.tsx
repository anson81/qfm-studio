import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { apiClient } from '../lib/api'
import { toast } from 'sonner'
import { Images, Trash2, Loader2 } from 'lucide-react'

export default function AIGirlGallery() {
  const [images, setImages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadGallery() }, [])

  async function loadGallery() {
    try {
      const content = await apiClient.listContent()
      const imageItems = (content || []).filter((c: any) => c.type === 'image').slice(0, 20)
      // For completed images, try to fetch status
      const withStatus = await Promise.all(imageItems.map(async (item: any) => {
        if (item.status === 'processing' && item.kie_task_id) {
          try {
            const status = await apiClient.imageStatus([item.kie_task_id])
            const task = status[item.kie_task_id]
            if (task?.status === 'completed' && task?.url) {
              return { ...item, status: 'completed', url: task.url }
            }
          } catch {}
        }
        return item
      }))
      setImages(withStatus)
    } catch (err: any) { toast.error('Failed to load gallery') }
    finally { setLoading(false) }
  }

  async function handleDelete(id: number) {
    try {
      await apiClient.deleteContent(id)
      setImages(prev => prev.filter((img: any) => img.id !== id))
      toast.success('Deleted')
    } catch { toast.error('Failed to delete') }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Model Gallery</h1>
        <p className="text-muted-foreground">Your generated AI fashion model images</p>
      </div>
      {images.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          <Images className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No images yet. Generate your first AI model photo!</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((img: any) => (
            <Card key={img.id} className="overflow-hidden">
              <div className="aspect-[3/4] bg-sidebar relative">
                {img.url ? (
                  <img src={img.url} alt={img.prompt} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>
                )}
              </div>
              <CardContent className="p-2">
                <p className="text-xs text-muted-foreground truncate">{img.prompt}</p>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-muted-foreground">{img.model}</span>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(img.id)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}