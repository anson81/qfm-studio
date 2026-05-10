/* ─── Step 5: Scene Videos ─── */
/* Review video generation status for each scene, re-generate if needed */

import { useState, useRef } from 'react'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { toast } from 'sonner'
import {
  ChevronRight, ChevronLeft, Loader2, Film, Play, Check, X,
  RotateCcw, Download, AlertTriangle
} from 'lucide-react'
import type { Storyboard, Scene } from '../../lib/studioTypes'
import { apiClient, pollKietask, normalizeKietaskResponse } from '../../lib/api'

const VIDEO_MODELS = [
  { id: 'kling-2.6', name: 'Kling 2.6', desc: '🎬 Text→Video — affordable, reliable', credits: '55-220' },
  { id: 'kling-v2.1', name: 'Kling V2.1 Pro', desc: '🎬 Pro quality, cheaper', credits: '28-110' },
  { id: 'kling-3.0', name: 'Kling 3.0', desc: '🎬 Latest — needs ref image', credits: '60-200' },
  { id: 'seedance-2.0', name: 'Seedance 2.0', desc: '🎬 Bytedance, high quality', credits: '40-150' },
  { id: 'hailuo-pro', name: 'Hailuo Pro', desc: '🎬 Expressive characters', credits: '40-150' },
  { id: 'sora2', name: 'Sora 2', desc: '🎬 OpenAI cinematic', credits: '60-200' },
]

interface Step5Props {
  storyboard: Storyboard
  onUpdateStoryboard: (sb: Storyboard) => void
  onNext: () => void
  onPrev: () => void
}

export default function Step5SceneVideos({
  storyboard, onUpdateStoryboard, onNext, onPrev,
}: Step5Props) {
  const [videoModel, setVideoModel] = useState('kling-2.6')
  const [generating, setGenerating] = useState(false)
  const [generatingSceneIdx, setGeneratingSceneIdx] = useState<number | null>(null)
  const [selectedScenes, setSelectedScenes] = useState<Set<number>>(new Set())

  const scenes = storyboard.scenes
  const totalVideosDone = scenes.filter(s => s.videoStatus === 'done').length
  const totalImagesDone = scenes.filter(s => s.imageStatus === 'done').length

  const toggleScene = (idx: number) => {
    const next = new Set(selectedScenes)
    if (next.has(idx)) { next.delete(idx) } else { next.add(idx) }
    setSelectedScenes(next)
  }

  const selectAll = () => {
    if (selectedScenes.size === scenes.length) setSelectedScenes(new Set())
    else setSelectedScenes(new Set(scenes.map((_, i) => i)))
  }

  // ─── Use ref to avoid stale closure in async loops ───
  const storyboardRef = useRef(storyboard)
  storyboardRef.current = storyboard

  const updateScene = (idx: number, updates: Partial<Scene>) => {
    // Always read current storyboard from ref to avoid stale closures
    const currentSb = storyboardRef.current
    const newScenes = [...currentSb.scenes]
    newScenes[idx] = { ...newScenes[idx], ...updates }
    const updatedSb = { ...currentSb, scenes: newScenes }
    onUpdateStoryboard(updatedSb)
  }

  const generateVideos = async () => {
    const targetIndices = selectedScenes.size > 0 ? Array.from(selectedScenes) : scenes.map((_, i) => i)
    setGenerating(true)

    for (const idx of targetIndices) {
      const scene = scenes[idx]
      if (scene.videoStatus === 'done' && scene.videoUrl) continue

      setGeneratingSceneIdx(idx)
      updateScene(idx, { videoStatus: 'generating' })

      try {
        const model = scene.videoModel || videoModel
        const videoResult = await apiClient.generateVideo({
          prompt: scene.visualPrompt,
          model,
          aspectRatio: storyboard.aspectRatio,
          duration: String(scene.duration || 5),
          sound: false,
          ...(scene.imageUrl ? { image_urls: [scene.imageUrl] } : {}),
          ...(model === 'kling-3.0' ? { mode: 'std' } : {}),
        })

        const data = await pollKietask(
          videoResult.recordInfoPath,
          (data: any) => data,
          () => { updateScene(idx, { videoTaskId: videoResult.taskId }) }
        )

        const status = normalizeKietaskResponse(data)
        if (status.done && !status.failed) {
          const response = status.response
          let videoUrl = ''
          if (response?.resultUrls?.[0]) videoUrl = response.resultUrls[0]
          else if (response?.videos?.[0]?.url) videoUrl = response.videos[0].url
          else if (typeof response === 'string') videoUrl = response

          if (videoUrl) {
            updateScene(idx, { videoStatus: 'done', videoUrl })
          } else {
            updateScene(idx, { videoStatus: 'failed' })
            toast.error(`Scene ${idx + 1} video: no URL in response`)
          }
        } else {
          updateScene(idx, { videoStatus: 'failed' })
          toast.error(`Scene ${idx + 1} video failed: ${status.errorMsg}`)
        }
      } catch (err: any) {
        updateScene(idx, { videoStatus: 'failed' })
        toast.error(`Scene ${idx + 1} video error: ${err.message}`)
      }
    }

    setGeneratingSceneIdx(null)
    setGenerating(false)
    toast.success(`Generated ${targetIndices.length} scene videos`)
  }

  const canProceed = totalVideosDone > 0

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">📹 Scene Videos</h2>
        <p className="text-muted-foreground mt-1">
          Review and generate videos for each scene. Videos are created from scene images for best quality.
        </p>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Videos:</span>
                <span className="font-medium text-foreground">{totalVideosDone}/{scenes.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Images:</span>
                <span className="font-medium text-foreground">{totalImagesDone}/{scenes.length}</span>
              </div>
            </div>
            <label className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={selectedScenes.size === scenes.length} onChange={selectAll} className="rounded border-border" />
              Select all
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Model selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Film className="w-5 h-5 text-primary" />
            Video Model
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {VIDEO_MODELS.map(m => (
              <button
                key={m.id}
                onClick={() => setVideoModel(m.id)}
                className={`px-3 py-2 rounded-lg border text-sm text-left transition-all ${
                  videoModel === m.id ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border hover:border-primary/50'
                }`}
              >
                <p className="font-medium text-foreground">{m.name}</p>
                <p className="text-xs text-muted-foreground">{m.desc}</p>
              </button>
            ))}
          </div>
          {videoModel === 'kling-3.0' && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Kling 3.0 works best with a reference image. Scene images are used as the starting frame.</span>
            </div>
          )}
          <Button onClick={generateVideos} disabled={generating || totalImagesDone === 0} className="w-full sm:w-auto">
            {generating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating videos...</>
            ) : (
              <><Film className="w-4 h-4 mr-2" />Generate {selectedScenes.size > 0 ? selectedScenes.size : 'All'} Videos</>
            )}
          </Button>
          {totalImagesDone === 0 && (
            <p className="text-xs text-muted-foreground">⚠️ Generate scene images first (Step 4) — they become reference frames for videos.</p>
          )}
        </CardContent>
      </Card>

      {/* Scene cards */}
      <div className="space-y-3">
        {scenes.map((scene, idx) => (
          <div
            key={idx}
            className={`rounded-xl border bg-white overflow-hidden transition-all ${
              selectedScenes.has(idx) ? 'border-primary ring-2 ring-primary/20' : 'border-border'
            }`}
          >
            <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => toggleScene(idx)}>
              <input type="checkbox" checked={selectedScenes.has(idx)} onChange={() => toggleScene(idx)} className="rounded border-border" onClick={e => e.stopPropagation()} />
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">{scene.number}</div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm">{scene.title}</p>
                <p className="text-xs text-muted-foreground truncate">{scene.voiceoverText?.slice(0, 80)}{scene.voiceoverText?.length > 80 ? '...' : ''}</p>
              </div>
              <div className="flex items-center gap-2 text-xs shrink-0">
                <span className={`px-2 py-0.5 rounded-full ${
                  scene.imageStatus === 'done' ? 'bg-green-100 text-green-700' :
                  scene.imageStatus === 'generating' ? 'bg-primary/10 text-primary animate-pulse' :
                  scene.imageStatus === 'failed' ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground'
                }`}>
                  {scene.imageStatus === 'done' ? '✓ Img' : scene.imageStatus === 'generating' ? '⏳ Img' : scene.imageStatus === 'failed' ? '✗ Img' : 'Img'}
                </span>
                <span className={`px-2 py-0.5 rounded-full ${
                  scene.videoStatus === 'done' ? 'bg-green-100 text-green-700' :
                  scene.videoStatus === 'generating' ? 'bg-primary/10 text-primary animate-pulse' :
                  scene.videoStatus === 'failed' ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground'
                }`}>
                  {scene.videoStatus === 'done' ? '✓ Vid' : scene.videoStatus === 'generating' ? '⏳ Vid' : scene.videoStatus === 'failed' ? '✗ Vid' : 'Vid'}
                </span>
                <span className="text-muted-foreground">{scene.duration}s</span>
              </div>
              {generatingSceneIdx === idx && <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />}
            </div>

            {/* Previews */}
            {(scene.imageUrl || scene.videoUrl) && (
              <div className="px-4 pb-4 flex gap-3">
                {scene.imageUrl && (
                  <div className="relative w-32 h-48 rounded-lg overflow-hidden bg-muted border border-border">
                    <img src={scene.imageUrl} alt={`Scene ${scene.number}`} className="w-full h-full object-cover" />
                    <a href={scene.imageUrl} target="_blank" rel="noopener noreferrer" className="absolute bottom-1 right-1 p-1 bg-black/50 rounded text-white hover:bg-black/70">
                      <Download className="w-3 h-3" />
                    </a>
                  </div>
                )}
                {scene.videoUrl && (
                  <div className="relative w-32 h-48 rounded-lg overflow-hidden bg-muted border border-border">
                    <video src={scene.videoUrl} className="w-full h-full object-cover" />
                    <a href={scene.videoUrl} target="_blank" rel="noopener noreferrer" className="absolute bottom-1 right-1 p-1 bg-black/50 rounded text-white hover:bg-black/70">
                      <Download className="w-3 h-3" />
                    </a>
                  </div>
                )}
                {scene.videoStatus === 'generating' && !scene.videoUrl && (
                  <div className="w-32 h-48 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  </div>
                )}
              </div>
            )}

            {/* Retry buttons */}
            {scene.videoStatus === 'failed' && (
              <div className="px-4 pb-3">
                <Button size="sm" variant="outline" onClick={() => updateScene(idx, { videoStatus: 'pending' })}>
                  <RotateCcw className="w-3 h-3 mr-1" /> Retry Video
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tips */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <div>
              <p><strong>Tips:</strong> Generate images first in Step 4. They become reference frames for better video quality. Kling 2.6 is the most affordable reliable model.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          <ChevronLeft className="w-5 h-5 mr-1" /> Scene Images
        </Button>
        <Button onClick={onNext} disabled={!canProceed}>
          Next: Voiceover & Assembly <ChevronRight className="w-5 h-5 ml-1" />
        </Button>
      </div>
    </div>
  )
}