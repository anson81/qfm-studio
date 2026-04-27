import { useState } from 'react'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { toast } from 'sonner'
import { Scissors, Download, RotateCw, Trash2, Play, Pause } from 'lucide-react'

export default function VideoEditor() {
  const [videoUrl, setVideoUrl] = useState('')
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(10)
  const [speed, setSpeed] = useState(1)
  const [isPlaying, setIsPlaying] = useState(false)

  function handleExport() {
    toast.info('Video export is simulated. In production, this would process the video server-side.')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Video Editor</h1>
      <p className="text-muted-foreground">Trim, speed up, and export your TikTok videos.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="flex items-center justify-center min-h-[400px]">
            <CardContent className="p-5 text-center w-full">
              {videoUrl ? (
                <video src={videoUrl} controls className="w-full h-[400px] object-contain rounded-lg" />
              ) : (
                <div>
                  <div className="border-2 border-dashed border-border rounded-lg p-8 mb-4 cursor-pointer" onClick={() => document.getElementById('ve-upload')?.click()}>
                    <p className="text-muted-foreground">Click to upload video</p>
                  </div>
                  <input id="ve-upload" type="file" accept="video/*" className="hidden" onChange={(e) => { const f=e.target.files?.[0]; if(f) setVideoUrl(URL.createObjectURL(f)) }} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <h3 className="font-semibold flex items-center gap-2"><Scissors className="w-4 h-4"/> Trim</h3>
              <div>
                <label className="text-sm">Start: {trimStart}s</label>
                <input type="range" min={0} max={trimEnd-1} value={trimStart} onChange={e => setTrimStart(Number(e.target.value))} className="w-full" />
              </div>
              <div>
                <label className="text-sm">End: {trimEnd}s</label>
                <input type="range" min={trimStart+1} max={60} value={trimEnd} onChange={e => setTrimEnd(Number(e.target.value))} className="w-full" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-4">
              <h3 className="font-semibold">Speed</h3>
              <div className="flex gap-2">
                {[0.5,1,1.5,2].map(s => (
                  <button key={s} onClick={() => setSpeed(s)} className={`px-3 py-1.5 rounded-md text-sm border ${speed===s ? 'bg-primary text-white border-primary' : 'bg-background border-border'}`}>
                    {s}x
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleExport} className="w-full"><Download className="w-4 h-4 mr-2"/> Export Video</Button>
        </div>
      </div>
    </div>
  )
}
