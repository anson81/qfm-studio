/* ─── Step 4: Scene Images + Videos ─── */
/* Generate scene images first, then use them as reference for video generation */

import { useState, useRef } from 'react'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { toast } from 'sonner'
import {
  ChevronRight, ChevronLeft, Loader2, Image, Film,
  Play, Check, X, RotateCcw, Sparkles, Download, AlertTriangle
} from 'lucide-react'
import type { Storyboard, Scene } from '../../lib/studioTypes'
import { apiClient, pollKietask, normalizeKietaskResponse } from '../../lib/api'
import { kiePost } from '../../lib/studioApi'

// ─── Image model options ───
const IMAGE_MODELS = [
  { id: 'google/nano-banana-2', name: 'Nano Banana 2', desc: 'Fast, cheap, good quality', credits: '~5' },
  { id: 'google/imagen4-fast', name: 'Imagen 4 Fast', desc: 'Fast, higher quality', credits: '~15' },
  { id: 'google/imagen4-ultra', name: 'Imagen 4 Ultra', desc: 'Best quality, most credits', credits: '~30' },
  { id: 'flux-2/pro-text-to-image', name: 'Flux 2 Pro', desc: 'Professional quality', credits: '~20' },
  { id: 'ideogram/v3-text-to-image', name: 'Ideogram v3', desc: 'Great for text in images', credits: '~10' },
]

// ─── Video model options ───
const VIDEO_MODELS = [
  { id: 'kling-2.6', name: 'Kling 2.6', desc: '🎬 Text→Video — affordable, reliable', credits: '55-220', endpoint: 'kling' },
  { id: 'kling-v2.1', name: 'Kling V2.1 Pro', desc: '🎬 Pro quality, cheaper', credits: '28-110', endpoint: 'kling' },
  { id: 'kling-3.0', name: 'Kling 3.0', desc: '🎬 Latest — needs ref image', credits: '60-200', endpoint: 'kling' },
  { id: 'seedance-2.0', name: 'Seedance 2.0', desc: '🎬 Bytedance, high quality', credits: '40-150', endpoint: 'seedance' },
  { id: 'hailuo-pro', name: 'Hailuo Pro', desc: '🎬 Expressive characters', credits: '40-150', endpoint: 'hailuo' },
  { id: 'sora2', name: 'Sora 2', desc: '🎬 OpenAI cinematic', credits: '60-200', endpoint: 'sora2' },
]

interface Step4Props {
  storyboard: Storyboard
  onUpdateStoryboard: (sb: Storyboard) => void
  onNext: () => void
  onPrev: () => void
}

export default function Step4SceneImages({
  storyboard, onUpdateStoryboard, onNext, onPrev,
}: Step4Props) {
  const [imageModel, setImageModel] = useState('google/nano-banana-2')
  const [videoModel, setVideoModel] = useState('kling-2.6')
  const [generatingImages, setGeneratingImages] = useState(false)
  const [generatingVideos, setGeneratingVideos] = useState(false)
  const [selectedScenes, setSelectedScenes] = useState<Set<number>>(new Set())
  const [generatingSceneIdx, setGeneratingSceneIdx] = useState<number | null>(null)

  const scenes = storyboard.scenes
  const totalImagesDone = scenes.filter(s => s.imageStatus === 'done').length
  const totalVideosDone = scenes.filter(s => s.videoStatus === 'done').length

  // ─── Toggle scene selection ───

  const toggleScene = (idx: number) => {
    const next = new Set(selectedScenes)
    if (next.has(idx)) next.delete(idx)
    else next.add(idx)
    setSelectedScenes(next)
  }

  const selectAll = () => {
    if (selectedScenes.size === scenes.length) {
      setSelectedScenes(new Set())
    } else {
      setSelectedScenes(new Set(scenes.map((_, i) => i)))
    }
  }

  // ─── Use ref to avoid stale closure in async generation loops ───
  const storyboardRef = useRef(storyboard)
  storyboardRef.current = storyboard

  // ─── Update scene helper ───

  const updateScene = (idx: number, updates: Partial<Scene>) => {
    const currentSb = storyboardRef.current
    const newScenes = [...currentSb.scenes]
    newScenes[idx] = { ...newScenes[idx], ...updates }
    const updatedSb = { ...currentSb, scenes: newScenes }
    onUpdateStoryboard(updatedSb)
  }

  // ─── Generate Images ───

  const generateImages = async () => {
    const targetIndices = selectedScenes.size > 0 ? Array.from(selectedScenes) : scenes.map((_, i) => i)
    setGeneratingImages(true)

    for (const idx of targetIndices) {
      const scene = scenes[idx]
      if (scene.imageStatus === 'done' && scene.imageUrl) continue

      setGeneratingSceneIdx(idx)
      updateScene(idx, { imageStatus: 'generating' })

      try {
        // Use scene's image model override or the selected model
        const model = scene.imageModel || imageModel

        // Generate image via KIE Jobs API
        const result = await kiePost('/api/v1/jobs/createTask', {
          model,
          input: {
            prompt: scene.visualPrompt + (scene.visualPromptNegative ? `. Avoid: ${scene.visualPromptNegative}` : ''),
            aspect_ratio: storyboard.aspectRatio === '9:16' ? '9:16' : storyboard.aspectRatio === '16:9' ? '16:9' : '1:1',
          },
        })

        // Poll for result
        const data = await pollKietask(
          `/api/v1/jobs/recordInfo?taskId=${result.data.taskId}`,
          (data: any) => data, // extractResult: return raw data
          () => { updateScene(idx, { imageTaskId: result.data.taskId }) }
        )

        const status = normalizeKietaskResponse(data)
        if (status.done && !status.failed) {
          // Extract image URL from response
          const response = status.response
          let imageUrl = ''
          if (response?.resultUrls?.[0]) {
            imageUrl = response.resultUrls[0]
          } else if (response?.images?.[0]?.url) {
            imageUrl = response.images[0].url
          } else if (typeof response === 'string') {
            imageUrl = response
          }

          if (imageUrl) {
            updateScene(idx, { imageStatus: 'done', imageUrl })
          } else {
            updateScene(idx, { imageStatus: 'failed' })
            toast.error(`Scene ${idx + 1} image: no URL in response`)
          }
        } else {
          updateScene(idx, { imageStatus: 'failed' })
          toast.error(`Scene ${idx + 1} image failed: ${status.errorMsg}`)
        }
      } catch (err: any) {
        updateScene(idx, { imageStatus: 'failed' })
        toast.error(`Scene ${idx + 1} image error: ${err.message}`)
      }
    }

    setGeneratingSceneIdx(null)
    setGeneratingImages(false)
    const totalGenerated = targetIndices.length
    toast.success(`Generated ${totalGenerated} scene images`)
  }

  // ─── Generate Videos ───

  const generateVideos = async () => {
    const targetIndices = selectedScenes.size > 0 ? Array.from(selectedScenes) : scenes.map((_, i) => i)
    setGeneratingVideos(true)

    for (const idx of targetIndices) {
      const scene = scenes[idx]
      if (scene.videoStatus === 'done' && scene.videoUrl) continue

      setGeneratingSceneIdx(idx)
      updateScene(idx, { videoStatus: 'generating' })

      try {
        const model = scene.videoModel || videoModel

        // Build prompt — prefer using scene image as reference for image-to-video
        const videoResult = await apiClient.generateVideo({
          prompt: scene.visualPrompt,
          model,
          aspectRatio: storyboard.aspectRatio,
          duration: String(scene.duration || 5),
          sound: false,
          ...(scene.imageUrl ? { image_urls: [scene.imageUrl] } : {}),
          ...(model === 'kling-3.0' ? { mode: 'std' } : {}),
        })

        // Poll for result
        const data = await pollKietask(
          videoResult.recordInfoPath,
          (data: any) => data, // extractResult: return raw data
          () => { updateScene(idx, { videoTaskId: videoResult.taskId }) }
        )

        const status = normalizeKietaskResponse(data)
        if (status.done && !status.failed) {
          const response = status.response
          let videoUrl = ''
          if (response?.resultUrls?.[0]) {
            videoUrl = response.resultUrls[0]
          } else if (response?.videos?.[0]?.url) {
            videoUrl = response.videos[0].url
          } else if (typeof response === 'string') {
            videoUrl = response
          }

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
    setGeneratingVideos(false)
    const totalGenerated = targetIndices.length
    toast.success(`Generated ${totalGenerated} scene videos`)
  }

  const allImagesDone = scenes.every(s => s.imageStatus === 'done')
  const allVideosDone = scenes.every(s => s.videoStatus === 'done')
  const canProceed = totalVideosDone > 0

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ─── Header ─── */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">🖼️ Scene Images & 📹 Videos</h2>
        <p className="text-muted-foreground mt-1">Generate images for each scene, then use them as reference for video generation.</p>
      </div>

      {/* ─── Progress Summary ─── */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Image className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Images:</span>
                <span className="font-medium text-foreground">{totalImagesDone}/{scenes.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Videos:</span>
                <span className="font-medium text-foreground">{totalVideosDone}/{scenes.length}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedScenes.size === scenes.length}
                  onChange={selectAll}
                  className="rounded border-border"
                />
                Select all
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Model Selection ─── */}
      {!allImagesDone && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" />
              Image Generation Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {IMAGE_MODELS.map(m => (
                <button
                  key={m.id}
                  onClick={() => setImageModel(m.id)}
                  className={`px-3 py-2 rounded-lg border text-sm text-left transition-all ${
                    imageModel === m.id ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <p className="font-medium text-foreground">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.desc} · {m.credits} credits</p>
                </button>
              ))}
            </div>
            <Button onClick={generateImages} disabled={generatingImages} className="w-full sm:w-auto">
              {generatingImages ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating images...</>
              ) : (
                <><Image className="w-4 h-4 mr-2" />Generate {selectedScenes.size > 0 ? selectedScenes.size : 'All'} Images</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Film className="w-5 h-5 text-primary" />
            Video Generation Settings
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
              <span>Kling 3.0 works best with a reference image. Scene images will be used as the starting frame.</span>
            </div>
          )}
          <Button onClick={generateVideos} disabled={generatingVideos || totalImagesDone === 0} className="w-full sm:w-auto">
            {generatingVideos ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating videos...</>
            ) : (
              <><Film className="w-4 h-4 mr-2" />Generate {selectedScenes.size > 0 ? selectedScenes.size : 'All'} Videos</>
            )}
          </Button>
          {totalImagesDone === 0 && (
            <p className="text-xs text-muted-foreground">Generate images first (they become reference frames for videos)</p>
          )}
        </CardContent>
      </Card>

      {/* ─── Scene Cards ─── */}
      <div className="space-y-3">
        {scenes.map((scene, idx) => (
          <div
            key={idx}
            className={`rounded-xl border bg-white overflow-hidden transition-all ${
              selectedScenes.has(idx) ? 'border-primary ring-2 ring-primary/20' : 'border-border'
            }`}
          >
            {/* Scene header with selection */}
            <div
              className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => toggleScene(idx)}
            >
              <input
                type="checkbox"
                checked={selectedScenes.has(idx)}
                onChange={() => toggleScene(idx)}
                className="rounded border-border"
                onClick={e => e.stopPropagation()}
              />
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                {scene.number}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm">{scene.title}</p>
                <p className="text-xs text-muted-foreground truncate">{scene.voiceoverText?.slice(0, 80)}{scene.voiceoverText?.length > 80 ? '...' : ''}</p>
              </div>
              <div className="flex items-center gap-2 text-xs shrink-0">
                {/* Image status badge */}
                <span className={`px-2 py-0.5 rounded-full ${
                  scene.imageStatus === 'done' ? 'bg-green-100 text-green-700' :
                  scene.imageStatus === 'generating' ? 'bg-primary/10 text-primary animate-pulse' :
                  scene.imageStatus === 'failed' ? 'bg-red-100 text-red-700' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {scene.imageStatus === 'done' ? '✓ Img' : scene.imageStatus === 'generating' ? '⏳ Img' : scene.imageStatus === 'failed' ? '✗ Img' : 'Img'}
                </span>
                {/* Video status badge */}
                <span className={`px-2 py-0.5 rounded-full ${
                  scene.videoStatus === 'done' ? 'bg-green-100 text-green-700' :
                  scene.videoStatus === 'generating' ? 'bg-primary/10 text-primary animate-pulse' :
                  scene.videoStatus === 'failed' ? 'bg-red-100 text-red-700' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {scene.videoStatus === 'done' ? '✓ Vid' : scene.videoStatus === 'generating' ? '⏳ Vid' : scene.videoStatus === 'failed' ? '✗ Vid' : 'Vid'}
                </span>
                <span className="text-muted-foreground">{scene.duration}s</span>
              </div>
              {/* Generating indicator */}
              {generatingSceneIdx === idx && (
                <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
              )}
            </div>

            {/* Image/Video previews */}
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
                {scene.imageStatus === 'generating' && !scene.imageUrl && (
                  <div className="w-32 h-48 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  </div>
                )}
                {scene.videoStatus === 'generating' && !scene.videoUrl && (
                  <div className="w-32 h-48 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  </div>
                )}
              </div>
            )}

            {/* Failed actions */}
            {scene.imageStatus === 'failed' && (
              <div className="px-4 pb-3">
                <Button size="sm" variant="outline" onClick={() => {
                  updateScene(idx, { imageStatus: 'pending' })
                }}>
                  <RotateCcw className="w-3 h-3 mr-1" /> Retry Image
                </Button>
              </div>
            )}
            {scene.videoStatus === 'failed' && (
              <div className="px-4 pb-3">
                <Button size="sm" variant="outline" onClick={() => {
                  updateScene(idx, { videoStatus: 'pending' })
                }}>
                  <RotateCcw className="w-3 h-3 mr-1" /> Retry Video
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ─── Tips ─── */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <div>
              <p><strong>Credits tip:</strong> Images use ~5-30 credits each. Videos use ~28-220 each. Generate images first — they become reference frames for video, improving quality significantly.</p>
              <p className="mt-1"><strong>Selected scenes:</strong> {selectedScenes.size > 0 ? `${selectedScenes.size} scenes selected` : 'All scenes will be generated'}. Click a scene to toggle selection.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Navigation ─── */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          <ChevronLeft className="w-5 h-5 mr-1" /> Avatar & Voice
        </Button>
        <Button onClick={onNext} disabled={!canProceed}>
          Next: Voiceover & Assembly <ChevronRight className="w-5 h-5 ml-1" />
        </Button>
      </div>
    </div>
  )
}