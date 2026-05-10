/* ─── Step 6: Voiceover & Assembly ─── */
/* Generate voiceover per scene, then assemble final video */

import { useState, useRef } from 'react'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { toast } from 'sonner'
import {
  ChevronLeft, Loader2, Mic, Volume2, Download, Film,
  AlertTriangle, Check, Music, Settings2
} from 'lucide-react'
import type { Scene, Storyboard, Avatar, VoiceProvider } from '../../lib/studioTypes'
import { EDGE_TTS_VOICES, KIE_ELEVENLABS_VOICES } from '../../lib/studioTypes'
import { generateEdgeTTS, generateElevenLabsTTS, assembleVideo } from '../../lib/studioApi'
import { pollKietask, normalizeKietaskResponse } from '../../lib/api'

// ─── Voice provider info ───
const VOICE_PROVIDERS: { id: VoiceProvider; name: string; icon: string; cost: string; desc: string }[] = [
  { id: 'edge_tts', name: 'Edge TTS', icon: '🆓', cost: 'Free', desc: '323 voices, instant, server-side' },
  { id: 'elevenlabs', name: 'ElevenLabs', icon: '💎', cost: 'KIE Credits', desc: 'Premium voices via KIE Jobs API' },
  { id: 'fish_audio', name: 'Fish Audio', icon: '🐟', cost: '$0.02/min', desc: 'Voice cloning — coming soon' },
]

interface Step6Props {
  storyboard: Storyboard
  avatar: Avatar | undefined
  onUpdateStoryboard: (sb: Storyboard) => void
  onPrev: () => void
}

// ─── Helper: get backend API base URL ───
function getBackendUrl(path: string): string {
  const base = (import.meta as any).env?.VITE_API_URL || ''
  const cleanBase = base.replace(/\/$/, '')
  if (path.startsWith('http')) return path
  return cleanBase ? `${cleanBase}${path}` : path
}

export default function Step6VoiceAssembly({
  storyboard, avatar, onUpdateStoryboard, onPrev,
}: Step6Props) {
  const [voiceProvider, setVoiceProvider] = useState<VoiceProvider>(
    avatar?.voice?.provider || 'edge_tts'
  )
  const [edgeVoice, setEdgeVoice] = useState(
    avatar?.voice?.edgeVoiceName || 'en-US-AriaNeural'
  )
  const [elevenlabsVoice, setElevenlabsVoice] = useState(
    avatar?.voice?.elevenlabsVoice || 'Rachel'
  )
  const [voiceRate, setVoiceRate] = useState(avatar?.voice?.speed || 1.0)
  const [selectedScenes, setSelectedScenes] = useState<Set<number>>(new Set())
  const [generatingVoiceover, setGeneratingVoiceover] = useState(false)
  const [generatingIdx, setGeneratingIdx] = useState<number | null>(null)
  const [assembling, setAssembling] = useState(false)
  const [assemblyResult, setAssemblyResult] = useState<{ videoUrl: string; duration: number } | null>(null)
  const [audioPreviews, setAudioPreviews] = useState<Record<number, string>>({})

  const scenes = storyboard.scenes
  const totalVoiceoverDone = scenes.filter(s => s.voiceoverStatus === 'done').length
  const totalVideosDone = scenes.filter(s => s.videoStatus === 'done').length

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

  // ─── Generate voiceover for selected scenes ───
  const generateVoiceovers = async () => {
    const targetIndices = selectedScenes.size > 0 ? Array.from(selectedScenes) : scenes.map((_, i) => i)
    setGeneratingVoiceover(true)

    for (const idx of targetIndices) {
      const scene = scenes[idx]
      if (scene.voiceoverStatus === 'done' && scene.voiceoverUrl) continue
      if (!scene.voiceoverText?.trim()) {
        toast.error(`Scene ${idx + 1} has no voiceover text`)
        continue
      }

      setGeneratingIdx(idx)
      updateScene(idx, { voiceoverStatus: 'generating' })

      try {
        if (voiceProvider === 'edge_tts') {
          // ── Edge TTS (free, server-side) ──
          const rateStr = voiceRate !== 1.0 ? `${voiceRate > 1 ? '+' : ''}${Math.round((voiceRate - 1) * 100)}%` : undefined

          const result = await generateEdgeTTS({
            text: scene.voiceoverText,
            voice: edgeVoice,
            rate: rateStr,
            format: 'mp3',
          })

          // Result: { audio_url: "/api/v1/tts/file/xxx.mp3", duration, voice }
          // This is a backend path — need to prefix with API_BASE for browser playback
          // but keep as-is for backend assembly (backend resolves its own paths)
          const audioUrl = getBackendUrl(result.audio_url)

          updateScene(idx, {
            voiceoverStatus: 'done',
            voiceoverUrl: audioUrl,
          })
          setAudioPreviews(prev => ({ ...prev, [idx]: audioUrl }))

        } else if (voiceProvider === 'elevenlabs') {
          // ── ElevenLabs via KIE Jobs API ──
          const taskId = await generateElevenLabsTTS({
            text: scene.voiceoverText,
            voice: elevenlabsVoice,
          })

          // Poll for result
          const data = await pollKietask(
            `/api/v1/jobs/recordInfo?taskId=${taskId}`,
            (data: any) => data,
          )
          const status = normalizeKietaskResponse(data)

          if (status.done && !status.failed) {
            const response = status.response
            let audioUrl = ''
            if (response?.resultUrls?.[0]) audioUrl = response.resultUrls[0]
            else if (response?.url) audioUrl = response.url
            else if (typeof response === 'string') audioUrl = response

            if (audioUrl) {
              updateScene(idx, { voiceoverStatus: 'done', voiceoverUrl: audioUrl })
              setAudioPreviews(prev => ({ ...prev, [idx]: audioUrl }))
            } else {
              updateScene(idx, { voiceoverStatus: 'failed' })
              toast.error(`Scene ${idx + 1} voiceover: no audio URL in response`)
            }
          } else {
            updateScene(idx, { voiceoverStatus: 'failed' })
            toast.error(`Scene ${idx + 1} voiceover failed: ${status.errorMsg}`)
          }
        } else {
          toast.error('Fish Audio voice cloning is coming soon. Please use Edge TTS or ElevenLabs.')
          updateScene(idx, { voiceoverStatus: 'failed' })
        }
      } catch (err: any) {
        updateScene(idx, { voiceoverStatus: 'failed' })
        toast.error(`Scene ${idx + 1} voiceover error: ${err.message}`)
      }
    }

    setGeneratingIdx(null)
    setGeneratingVoiceover(false)
    toast.success(`Generated ${targetIndices.length} voiceovers`)

    // Save project after voiceover generation
    const updatedProject = JSON.parse(localStorage.getItem('qfm_studio_project') || '{}')
    if (updatedProject) {
      // Trigger a save
      localStorage.setItem('qfm_studio_project', JSON.stringify({
        ...updatedProject,
        storyboard: { ...storyboard },
        updatedAt: new Date().toISOString(),
      }))
    }
  }

  // ─── Assemble final video ───
  const assembleFinalVideo = async () => {
    if (totalVideosDone === 0) {
      toast.error('No videos available. Generate scene videos first.')
      return
    }

    setAssembling(true)
    setAssemblyResult(null)

    try {
      // Build scene list — only include scenes with videos
      const sceneInputs = storyboardRef.current.scenes
        .filter(s => s.videoUrl)
        .map(s => ({
          video_url: s.videoUrl!,
          voiceover_url: s.voiceoverUrl || undefined,
          duration: s.duration || 5,
          text_overlay: s.textOverlay || undefined,
          text_position: s.textPosition || undefined,
        }))

      const result = await assembleVideo({
        scenes: sceneInputs,
        transition: 'cut',
        output_resolution: storyboard.aspectRatio === '9:16' ? '1080x1920' : storyboard.aspectRatio === '16:9' ? '1920x1080' : '1080x1080',
        background_music_volume: 0.15,
      })

      if (result.video_url) {
        const videoUrl = getBackendUrl(result.video_url)
        setAssemblyResult({ videoUrl, duration: result.duration })
        toast.success(`Video assembled! ${result.duration.toFixed(1)}s, ${sceneInputs.length} scenes`)
      } else {
        toast.error(`Assembly failed: ${result.message || 'No video URL returned'}`)
      }
    } catch (err: any) {
      toast.error(`Assembly error: ${err.message}`)
    } finally {
      setAssembling(false)
    }
  }

  // ─── Preview voice for a single scene ───
  const previewVoice = async (idx: number) => {
    const scene = scenes[idx]
    if (!scene.voiceoverUrl) {
      toast.error('No voiceover generated for this scene yet')
      return
    }
    const audio = new Audio(scene.voiceoverUrl)
    audio.play().catch(e => toast.error('Cannot play audio: ' + e.message))
  }

  // ─── Filter voices by language ───
  const filteredEdgeVoices = EDGE_TTS_VOICES
  const filteredElevenlabsVoices = KIE_ELEVENLABS_VOICES

  const canGenerateVoiceover = voiceProvider !== 'fish_audio'
  const canAssemble = totalVideosDone > 0
  const voiceCostLabel = voiceProvider === 'edge_tts' ? 'Free' : voiceProvider === 'elevenlabs' ? '~5 credits/scene' : '$0.02/min'

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">🎙️ Voiceover & Assembly</h2>
        <p className="text-muted-foreground mt-1">
          Generate voiceover for each scene, then assemble the final video.
        </p>
      </div>

      {/* Avatar info */}
      {avatar && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="py-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-lg">
                {avatar.gender === 'female' ? '👩' : avatar.gender === 'male' ? '👨' : '🧑'}
              </div>
              <div>
                <p className="font-medium text-foreground">Avatar: {avatar.name}</p>
                <p className="text-sm text-muted-foreground">
                  Voice: {avatar.voice.edgeVoiceName || avatar.voice.elevenlabsVoice || 'Default'} · {avatar.voice.provider === 'edge_tts' ? '🆓 Free' : avatar.voice.provider === 'elevenlabs' ? '💎 KIE Credits' : '🐟 Fish Audio'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Voice provider selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mic className="w-5 h-5 text-primary" />
            Voice Provider
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {VOICE_PROVIDERS.map(vp => (
              <button
                key={vp.id}
                onClick={() => { if (vp.id !== 'fish_audio') setVoiceProvider(vp.id) }}
                disabled={vp.id === 'fish_audio'}
                className={`p-3 rounded-lg border text-left transition-all ${
                  vp.id === 'fish_audio' ? 'opacity-50 cursor-not-allowed border-border' :
                  voiceProvider === vp.id ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border hover:border-primary/50'
                }`}
              >
                <p className="font-medium text-foreground">{vp.icon} {vp.name}</p>
                <p className="text-xs text-muted-foreground">{vp.cost}</p>
                <p className="text-xs text-muted-foreground mt-1">{vp.desc}</p>
              </button>
            ))}
          </div>

          {/* Voice selection */}
          {voiceProvider === 'edge_tts' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Edge TTS Voice</label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {filteredEdgeVoices.map(v => (
                  <button
                    key={v.nameKey}
                    onClick={() => setEdgeVoice(v.nameKey)}
                    className={`p-2 rounded-lg border text-left text-sm transition-all ${
                      edgeVoice === v.nameKey ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <p className="font-medium text-foreground">{v.name}</p>
                    <p className="text-xs text-muted-foreground">{v.accent} · {v.tone}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {voiceProvider === 'elevenlabs' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">ElevenLabs Voice</label>
              <div className="grid grid-cols-2 gap-2">
                {filteredElevenlabsVoices.map(v => (
                  <button
                    key={v.nameKey}
                    onClick={() => setElevenlabsVoice(v.nameKey)}
                    className={`p-2 rounded-lg border text-left text-sm transition-all ${
                      elevenlabsVoice === v.nameKey ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <p className="font-medium text-foreground">{v.name}</p>
                    <p className="text-xs text-muted-foreground">{v.tone}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Speed control */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Speech Speed: {voiceRate.toFixed(1)}x
            </label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={voiceRate}
              onChange={e => setVoiceRate(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0.5x Slow</span>
              <span>1.0x Normal</span>
              <span>2.0x Fast</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress summary */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Voiceover:</span>
                <span className="font-medium text-foreground">{totalVoiceoverDone}/{scenes.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Videos:</span>
                <span className="font-medium text-foreground">{totalVideosDone}/{scenes.length}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Cost: {voiceCostLabel}</span>
              <label className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={selectedScenes.size === scenes.length} onChange={selectAll} className="rounded border-border" />
                Select all
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scene voiceover cards */}
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
                <p className="text-xs text-muted-foreground mt-0.5">{scene.voiceoverText?.slice(0, 100)}{scene.voiceoverText?.length > 100 ? '...' : ''}</p>
              </div>
              <div className="flex items-center gap-2 text-xs shrink-0">
                {/* Voiceover status */}
                <span className={`px-2 py-0.5 rounded-full ${
                  scene.voiceoverStatus === 'done' ? 'bg-green-100 text-green-700' :
                  scene.voiceoverStatus === 'generating' ? 'bg-purple-100 text-purple-700 animate-pulse' :
                  scene.voiceoverStatus === 'failed' ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground'
                }`}>
                  {scene.voiceoverStatus === 'done' ? '✓ Voice' : scene.voiceoverStatus === 'generating' ? '⏳ Voice' : scene.voiceoverStatus === 'failed' ? '✗ Voice' : 'Voice'}
                </span>
                {/* Video status */}
                <span className={`px-2 py-0.5 rounded-full ${
                  scene.videoStatus === 'done' ? 'bg-green-100 text-green-700' :
                  scene.videoStatus === 'generating' ? 'bg-primary/10 text-primary animate-pulse' :
                  scene.videoStatus === 'failed' ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground'
                }`}>
                  {scene.videoStatus === 'done' ? '✓ Vid' : scene.videoStatus === 'generating' ? '⏳ Vid' : scene.videoStatus === 'failed' ? '✗ Vid' : 'Vid'}
                </span>
                <span className="text-muted-foreground">{scene.duration}s</span>
              </div>
              {generatingIdx === idx && <Loader2 className="w-4 h-4 text-purple-500 animate-spin shrink-0" />}
            </div>

            {/* Audio preview + video thumbnail */}
            {(scene.voiceoverUrl || scene.videoUrl) && (
              <div className="px-4 pb-4 flex gap-3 items-center">
                {scene.videoUrl && (
                  <div className="relative w-24 h-36 rounded-lg overflow-hidden bg-muted border border-border shrink-0">
                    <video src={scene.videoUrl} className="w-full h-full object-cover" />
                  </div>
                )}
                {scene.voiceoverUrl && (
                  <div className="flex-1 flex items-center gap-2">
                    <button onClick={() => previewVoice(idx)} className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors">
                      <Volume2 className="w-5 h-5" />
                    </button>
                    <div className="flex-1 text-xs text-muted-foreground">
                      <p>Voiceover ready</p>
                      <p>{scene.voiceoverText?.slice(0, 60)}{scene.voiceoverText?.length > 60 ? '...' : ''}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Retry */}
            {scene.voiceoverStatus === 'failed' && (
              <div className="px-4 pb-3">
                <Button size="sm" variant="outline" onClick={() => updateScene(idx, { voiceoverStatus: 'pending' })}>
                  Retry Voiceover
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Generate voiceover button */}
      <Card>
        <CardContent className="py-3 space-y-3">
          <Button onClick={generateVoiceovers} disabled={generatingVoiceover || !canGenerateVoiceover} className="w-full sm:w-auto">
            {generatingVoiceover ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating voiceover...</>
            ) : (
              <><Mic className="w-4 h-4 mr-2" />Generate {selectedScenes.size > 0 ? selectedScenes.size : 'All'} Voiceovers ({voiceCostLabel})</>
            )}
          </Button>
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <div>
              <p>Edge TTS is free and instant. ElevenLabs uses KIE credits (~5 per scene). Voiceovers are matched to each scene's duration.</p>
              {voiceProvider === 'edge_tts' && (
                <p className="mt-1"><strong>Note:</strong> Edge TTS requires the backend server running. If you see connection errors, make sure the NAS backend is online.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Final Assembly ─── */}
      <Card className="border-accent">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Film className="w-5 h-5 text-accent" />
            Assemble Final Video
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>Stitch all scene videos together with voiceover audio overlay.</p>
            <ul className="mt-2 space-y-1">
              <li>✅ Videos with voiceover: audio replaces video audio</li>
              <li>✅ Videos without voiceover: original audio kept</li>
              <li>✅ Output: {storyboard.aspectRatio === '9:16' ? '1080×1920 (TikTok 9:16)' : storyboard.aspectRatio === '16:9' ? '1920×1080 (16:9)' : '1080×1080 (1:1)'} MP4</li>
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Scenes to assemble:</p>
            <div className="flex flex-wrap gap-2">
              {scenes.filter(s => s.videoUrl).map((s, i) => (
                <span key={i} className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs">
                  Scene {s.number} {s.voiceoverUrl ? '🎙️' : '📹'}
                </span>
              ))}
              {scenes.filter(s => !s.videoUrl).length > 0 && (
                <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs">
                  {scenes.filter(s => !s.videoUrl).length} scenes without video (skipped)
                </span>
              )}
            </div>
          </div>

          <Button onClick={assembleFinalVideo} disabled={assembling || !canAssemble} className="w-full sm:w-auto bg-accent hover:bg-accent-600">
            {assembling ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Assembling video...</>
            ) : (
              <><Film className="w-4 h-4 mr-2" />Assemble Final Video</>
            )}
          </Button>

          {!canAssemble && (
            <p className="text-xs text-muted-foreground">⚠️ Generate at least one scene video first (Step 5).</p>
          )}

          {/* Assembly result */}
          {assemblyResult && (
            <Card className="border-green-500 bg-green-50">
              <CardContent className="py-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-600" />
                  <p className="font-medium text-green-800">Video Assembled Successfully!</p>
                </div>
                <p className="text-sm text-green-700">
                  Duration: {assemblyResult.duration.toFixed(1)}s · {scenes.filter(s => s.videoUrl).length} scenes
                </p>
                <div className="space-y-2">
                  <video
                    src={assemblyResult.videoUrl}
                    controls
                    className="w-full max-w-md rounded-lg border"
                  />
                  <a
                    href={assemblyResult.videoUrl}
                    download
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download MP4
                  </a>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          <ChevronLeft className="w-5 h-5 mr-1" /> Scene Videos
        </Button>
      </div>
    </div>
  )
}