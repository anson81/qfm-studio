import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { apiClient } from '../lib/api'
import { toast } from 'sonner'
import { Scissors, Copy, Loader2 } from 'lucide-react'

export default function ImageEditor() {
  const [prompt, setPrompt] = useState('')
  const [editInstruction, setEditInstruction] = useState('')
  const [model, setModel] = useState('flux-kontext-pro')
  const [result, setResult] = useState<{url: string, status: string} | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleEdit() {
    if (!prompt.trim() || !editInstruction.trim()) { toast.error('Enter both image description and edit instructions'); return }
    if (!apiClient.hasKIEKey()) { toast.error('Add your KIE.API key in Settings first'); return }
    setLoading(true); setResult(null)
    try {
      const fullPrompt = `${prompt}, ${editInstruction}, high quality, professional fashion photography, detailed editing`
      const res = await apiClient.generateImage({ prompt: fullPrompt, model, aspectRatio: '9:16', num_images: 1 })
      const taskId = res.taskId
      if (!taskId) { toast.error('No task ID received'); return }
      setResult({ url: '', status: 'processing' })
      // Poll for result
      const pollInterval = setInterval(async () => {
        try {
          const status = await apiClient.imageStatus([taskId])
          const task = status.tasks?.[0] || status.data?.[0]
          if (task?.status === 'completed' && task?.result_url) {
            setResult({ url: task.result_url, status: 'completed' })
            clearInterval(pollInterval)
          }
        } catch { }
      }, 3000)
      setTimeout(() => clearInterval(pollInterval), 120000) // 2 minute timeout
    } catch (err: any) { toast.error(err.message || 'Generation failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Image Editor</h1>
        <p className="text-muted-foreground">AI-powered image editing for fashion photography</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Scissors className="w-5 h-5" /> Edit Image</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Base Image Description</label>
            <textarea className="w-full p-3 bg-sidebar border border-sidebar-border rounded-lg text-white min-h-[80px] resize-y" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., Young woman wearing white Baju Kurung, standing in a garden..." />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Edit Instructions</label>
            <textarea className="w-full p-3 bg-sidebar border border-sidebar-border rounded-lg text-white min-h-[60px] resize-y" value={editInstruction} onChange={(e) => setEditInstruction(e.target.value)} placeholder="e.g., Change background to indoor studio, add warm lighting, make the outfit pastel pink..." />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Model</label>
            <select className="w-full p-2 bg-sidebar border border-sidebar-border rounded-lg text-white" value={model} onChange={(e) => setModel(e.target.value)}>
              <option value="flux-kontext-pro">Flux Kontext Pro</option>
              <option value="flux-1.1-pro">Flux 1.1 Pro</option>
            </select>
          </div>
          <Button onClick={handleEdit} disabled={loading} className="w-full">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Editing...</> : <><Scissors className="w-4 h-4 mr-2" /> Edit Image</>}
          </Button>
        </CardContent>
      </Card>
      {result && (
        <Card>
          <CardHeader><CardTitle>Result</CardTitle></CardHeader>
          <CardContent>
            {result.status === 'completed' && result.url ? (
              <img src={result.url} alt="Edited" className="w-full max-w-md mx-auto rounded-lg" />
            ) : (
              <div className="aspect-[3/4] bg-sidebar rounded-lg flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}