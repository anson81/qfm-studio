import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import { toast } from 'sonner'
import { Camera } from 'lucide-react'

export default function UGCGenerator() {
  const [productImage, setProductImage] = useState<string | null>(null)
  const [modelStyle, setModelStyle] = useState('casual')
  const [modelGender, setModelGender] = useState('female')
  const [ethnicity, setEthnicity] = useState('Malaysian Malay')
  const [generating, setGenerating] = useState(false)

  async function handleGenerate() {
    toast.info('UGC generation is in development. Connect your KIE.AI API key and test with real credits.')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">UGC Generator</h1>
      <Card>
        <CardContent className="p-6 max-w-2xl">
          <p className="text-muted-foreground mb-4">Upload a product photo and generate UGC-style content with an AI model.</p>
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center mb-4">
            <Camera className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Drag product image here, or click to upload</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Model Style</label>
              <select value={modelStyle} onChange={e=> setModelStyle(e.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
                <option>casual</option>
                <option>formal</option>
                <option>ethnic</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Gender</label>
              <select value={modelGender} onChange={e=> setModelGender(e.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
                <option>female</option>
                <option>male</option>
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="text-sm font-medium">Ethnicity</label>
            <select value={ethnicity} onChange={e=> setEthnicity(e.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
              <option>Malaysian Malay</option>
              <option>Chinese Malaysian</option>
              <option>Indian Malaysian</option>
            </select>
          </div>

          <Button onClick={handleGenerate} className="mt-4" disabled={generating}>Generate UGC Content</Button>
        </CardContent>
      </Card>
    </div>
  )
}
