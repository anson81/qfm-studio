import { useState } from 'react'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { toast } from 'sonner'
import { ImagePlus, Download, Crop, RotateCw, Trash2 } from 'lucide-react'

export default function ImageEditor() {
  const [imageUrl, setImageUrl] = useState('')
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [saturation, setSaturation] = useState(100)
  const [blur, setBlur] = useState(0)

  const filterStyle = {
    filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`
  }

  function handleExport() {
    toast.info('Export is simulated. In production, this would render the filtered image server-side.')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Image Editor</h1>
      <p className="text-muted-foreground">Adjust, crop, and export your AI-generated product photos.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="flex items-center justify-center min-h-[400px]">
            <CardContent className="p-5 text-center w-full">
              {imageUrl ? (
                <img src={imageUrl} alt="Edit" className="w-full h-[400px] object-contain rounded-lg" style={filterStyle} />
              ) : (
                <div>
                  <div className="border-2 border-dashed border-border rounded-lg p-8 mb-4 cursor-pointer" onClick={() => document.getElementById('ie-upload')?.click()}>
                    <ImagePlus className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">Click to upload image</p>
                  </div>
                  <input id="ie-upload" type="file" accept="image/*" className="hidden" onChange={(e) => { const f=e.target.files?.[0]; if(f) setImageUrl(URL.createObjectURL(f)) }} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-5 space-y-5">
              <div>
                <label className="text-sm">Brightness {brightness}%</label>
                <input type="range" min={50} max={150} value={brightness} onChange={e => setBrightness(Number(e.target.value))} className="w-full" />
              </div>
              <div>
                <label className="text-sm">Contrast {contrast}%</label>
                <input type="range" min={50} max={150} value={contrast} onChange={e => setContrast(Number(e.target.value))} className="w-full" />
              </div>
              <div>
                <label className="text-sm">Saturation {saturation}%</label>
                <input type="range" min={0} max={200} value={saturation} onChange={e => setSaturation(Number(e.target.value))} className="w-full" />
              </div>
              <div>
                <label className="text-sm">Blur {blur}px</label>
                <input type="range" min={0} max={10} value={blur} onChange={e => setBlur(Number(e.target.value))} className="w-full" />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => { setBrightness(100);setContrast(100);setSaturation(100);setBlur(0) }}><RotateCw className="w-4 h-4 mr-2"/> Reset</Button>
            <Button className="flex-1" onClick={handleExport}><Download className="w-4 h-4 mr-2"/> Export</Button>
          </div>
          {imageUrl && <Button variant="outline" className="w-full text-red-500" onClick={() => setImageUrl('')}><Trash2 className="w-4 h-4 mr-2"/> Remove Image</Button>}
        </div>
      </div>
    </div>
  )
}
