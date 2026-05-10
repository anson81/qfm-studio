/* ─── Step 2: Storyboard ─── */
/* Generate storyboard from product analysis, then edit scenes */

import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { toast } from 'sonner'
import {
  Sparkles, Loader2, ChevronRight, ChevronLeft, Plus, Trash2,
  GripVertical, Edit3, Clock, MessageSquare, Image, ChevronDown, ChevronUp, RotateCcw
} from 'lucide-react'
import type { ProductInput, Storyboard, Scene, ProductFeatures } from '../../lib/studioTypes'
import { kieChat } from '../../lib/studioApi'
import {
  STORYBOARD_SYSTEM_PROMPT,
  buildStoryboardPrompt,
  parseStoryboardResponse,
} from '../../lib/storyboardAi'
import { generateId } from '../../lib/studioStorage'

interface Step2Props {
  product: ProductInput
  storyboard: Storyboard | undefined
  onUpdateStoryboard: (sb: Storyboard) => void
  onNext: () => void
  onPrev: () => void
}

export default function Step2Storyboard({ product, storyboard, onUpdateStoryboard, onNext, onPrev }: Step2Props) {
  const [generating, setGenerating] = useState(false)
  const [editingScene, setEditingScene] = useState<number | null>(null)
  const [model, setModel] = useState('claude-sonnet-4-5')
  const [sceneCount, setSceneCount] = useState(6)
  const [duration, setDuration] = useState(60)
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1'>('9:16')

  // ─── Generate Storyboard ───

  const generateStoryboard = async () => {
    if (!product.extractedFeatures) {
      toast.error('Please analyze your product first (Step 1)')
      return
    }

    setGenerating(true)
    try {
      const prompt = buildStoryboardPrompt(product, product.extractedFeatures, {
        totalDuration: duration,
        sceneCount,
        aspectRatio,
      })

      const messages = [
        { role: 'system' as const, content: STORYBOARD_SYSTEM_PROMPT },
        { role: 'user' as const, content: prompt },
      ]

      const response = await kieChat(messages, model)
      const sb = parseStoryboardResponse(response, generateId(), product.extractedFeatures, model, prompt)
      sb.aspectRatio = aspectRatio

      onUpdateStoryboard(sb)
      toast.success(`Generated ${sb.scenes.length} scenes!`)
    } catch (err: any) {
      toast.error(`Generation failed: ${err.message}`)
    } finally {
      setGenerating(false)
    }
  }

  // ─── Scene Editing ───

  const updateScene = (index: number, updates: Partial<Scene>) => {
    if (!storyboard) return
    const scenes = [...storyboard.scenes]
    scenes[index] = { ...scenes[index], ...updates }
    onUpdateStoryboard({ ...storyboard, scenes })
  }

  const addScene = () => {
    if (!storyboard) return
    const newScene: Scene = {
      number: storyboard.scenes.length + 1,
      title: `Scene ${storyboard.scenes.length + 1}`,
      description: '',
      voiceoverText: '',
      visualPrompt: '',
      visualPromptNegative: '',
      duration: 8,
      transitionIn: 'cut',
      transitionOut: 'cut',
      textOverlay: undefined,
      textPosition: 'center',
      textAnimation: 'pop',
      backgroundMusicMood: '',
      imageStatus: 'pending',
      videoStatus: 'pending',
      voiceoverStatus: 'pending',
    }
    onUpdateStoryboard({ ...storyboard, scenes: [...storyboard.scenes, newScene] })
  }

  const removeScene = (index: number) => {
    if (!storyboard || storyboard.scenes.length <= 2) {
      toast.error('Minimum 2 scenes required')
      return
    }
    const scenes = storyboard.scenes.filter((_, i) => i !== index).map((s, i) => ({ ...s, number: i + 1 }))
    onUpdateStoryboard({ ...storyboard, scenes })
  }

  const moveScene = (index: number, direction: 'up' | 'down') => {
    if (!storyboard) return
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === storyboard.scenes.length - 1) return
    const scenes = [...storyboard.scenes]
    const swapWith = direction === 'up' ? index - 1 : index + 1
    ;[scenes[index], scenes[swapWith]] = [scenes[swapWith], scenes[index]]
    scenes.forEach((s, i) => (s.number = i + 1))
    onUpdateStoryboard({ ...storyboard, scenes })
  }

  const totalDuration = storyboard?.scenes.reduce((sum, s) => sum + s.duration, 0) ?? 0

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ─── Header ─── */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">🎬 Storyboard</h2>
        <p className="text-muted-foreground mt-1">AI generates a video script from your product analysis. Edit scenes, voiceover, and visuals.</p>
      </div>

      {/* ─── Generation Settings ─── */}
      {!storyboard && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" />
              Generate Storyboard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Duration (sec)</label>
                <select
                  value={duration}
                  onChange={e => setDuration(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value={30}>30s</option>
                  <option value={45}>45s</option>
                  <option value={60}>60s</option>
                  <option value={90}>90s</option>
                  <option value={120}>2min</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Scenes</label>
                <select
                  value={sceneCount}
                  onChange={e => setSceneCount(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {[4, 5, 6, 7, 8].map(n => (
                    <option key={n} value={n}>{n} scenes</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Aspect Ratio</label>
                <select
                  value={aspectRatio}
                  onChange={e => setAspectRatio(e.target.value as any)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="9:16">9:16 (TikTok)</option>
                  <option value="16:9">16:9 (YouTube)</option>
                  <option value="1:1">1:1 (Instagram)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">AI Model</label>
                <select
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="claude-sonnet-4-5">Claude Sonnet 4.5 (Best)</option>
                  <option value="claude-haiku-4-5">Claude Haiku 4.5 (Fast)</option>
                  <option value="deepseek-chat">DeepSeek Chat (Budget)</option>
                </select>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted/30 border border-border text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Product Context</p>
              <p className="mt-1"><strong>{product.name}</strong>
                {product.extractedFeatures && ` — ${product.extractedFeatures.style}`}
              </p>
              {product.extractedFeatures && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {product.extractedFeatures.moodKeywords.slice(0, 5).map((kw, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-accent/10 text-accent border border-accent/20">{kw}</span>
                  ))}
                </div>
              )}
            </div>

            <Button onClick={generateStoryboard} disabled={generating} className="w-full">
              {generating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating storyboard...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" />Generate Storyboard</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ─── Storyboard Editor ─── */}
      {storyboard && (
        <>
          {/* Storyboard Header */}
          <Card>
            <CardContent className="py-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{storyboard.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {storyboard.scenes.length} scenes · ~{totalDuration}s · {storyboard.aspectRatio}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={generateStoryboard} disabled={generating}>
                    <RotateCcw className="w-4 h-4 mr-1" /> Regenerate
                  </Button>
                  <Button variant="outline" size="sm" onClick={addScene}>
                    <Plus className="w-4 h-4 mr-1" /> Add Scene
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scene Cards */}
          <div className="space-y-3">
            {storyboard.scenes.map((scene, idx) => (
              <SceneCard
                key={idx}
                scene={scene}
                index={idx}
                total={storyboard.scenes.length}
                expanded={editingScene === idx}
                onToggleExpand={() => setEditingScene(editingScene === idx ? null : idx)}
                onUpdate={(updates) => updateScene(idx, updates)}
                onRemove={() => removeScene(idx)}
                onMoveUp={() => moveScene(idx, 'up')}
                onMoveDown={() => moveScene(idx, 'down')}
              />
            ))}
          </div>

          {/* Duration Summary */}
          <Card>
            <CardContent className="py-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex gap-4">
                  <span className="text-muted-foreground">Total: <strong className="text-foreground">{totalDuration}s</strong></span>
                  <span className="text-muted-foreground">Scenes: <strong className="text-foreground">{storyboard.scenes.length}</strong></span>
                </div>
                <div className="flex gap-2">
                  {totalDuration > 90 && (
                    <span className="text-accent text-xs">⚠️ Over 90s — may need trimming for TikTok</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ─── Navigation ─── */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          <ChevronLeft className="w-5 h-5 mr-1" /> Product Input
        </Button>
        <Button onClick={onNext} disabled={!storyboard}>
          Next: Avatar & Voice <ChevronRight className="w-5 h-5 ml-1" />
        </Button>
      </div>
    </div>
  )
}

// ─── Scene Card Component ───

function SceneCard({
  scene, index, total, expanded, onToggleExpand, onUpdate, onRemove, onMoveUp, onMoveDown,
}: {
  scene: Scene
  index: number
  total: number
  expanded: boolean
  onToggleExpand: () => void
  onUpdate: (updates: Partial<Scene>) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  return (
    <Card className={`transition-all duration-200 ${expanded ? 'ring-2 ring-primary' : ''}`}>
      {/* Collapsed Header */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
          {scene.number}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground truncate">{scene.title}</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />{scene.duration}s
            </span>
          </div>
          <p className="text-sm text-muted-foreground truncate">{scene.voiceoverText || scene.description}</p>
        </div>
        <div className="flex items-center gap-1">
          {index > 0 && (
            <button onClick={(e) => { e.stopPropagation(); onMoveUp() }} className="p-1 hover:bg-muted rounded">
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          {index < total - 1 && (
            <button onClick={(e) => { e.stopPropagation(); onMoveDown() }} className="p-1 hover:bg-muted rounded">
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          {expanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <CardContent className="border-t border-border pt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Scene Title</label>
              <input
                type="text"
                value={scene.title}
                onChange={e => onUpdate({ title: e.target.value })}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Duration (seconds)</label>
              <select
                value={scene.duration}
                onChange={e => onUpdate({ duration: Number(e.target.value) })}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {[5, 6, 7, 8, 9, 10, 12, 15].map(d => (
                  <option key={d} value={d}>{d}s</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              <MessageSquare className="w-4 h-4 inline mr-1" />
              Voiceover Text
            </label>
            <textarea
              value={scene.voiceoverText}
              onChange={e => onUpdate({ voiceoverText: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              placeholder="What the voice says in this scene..."
            />
            <p className="text-xs text-muted-foreground mt-1">{scene.voiceoverText.length} chars · ~{Math.ceil(scene.voiceoverText.length / 150)}s spoken</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              <Image className="w-4 h-4 inline mr-1" />
              Visual Prompt
            </label>
            <textarea
              value={scene.visualPrompt}
              onChange={e => onUpdate({ visualPrompt: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              placeholder="Detailed visual prompt for AI image/video generation..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Negative Prompt</label>
            <input
              type="text"
              value={scene.visualPromptNegative || ''}
              onChange={e => onUpdate({ visualPromptNegative: e.target.value })}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="What to avoid (blurry, low quality, text, watermark...)"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Text Overlay</label>
              <input
                type="text"
                value={scene.textOverlay || ''}
                onChange={e => onUpdate({ textOverlay: e.target.value || undefined })}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="e.g., 40% OFF 🔥"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Position</label>
              <select
                value={scene.textPosition || 'center'}
                onChange={e => onUpdate({ textPosition: e.target.value as any })}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="top">Top</option>
                <option value="center">Center</option>
                <option value="bottom">Bottom</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Animation</label>
              <select
                value={scene.textAnimation || 'pop'}
                onChange={e => onUpdate({ textAnimation: e.target.value as any })}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="pop">Pop</option>
                <option value="fade">Fade In</option>
                <option value="slide">Slide</option>
                <option value="typewriter">Typewriter</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Transition In</label>
              <select
                value={scene.transitionIn || 'cut'}
                onChange={e => onUpdate({ transitionIn: e.target.value as any })}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="cut">Cut</option>
                <option value="fade">Fade</option>
                <option value="slide">Slide</option>
                <option value="zoom">Zoom</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Transition Out</label>
              <select
                value={scene.transitionOut || 'cut'}
                onChange={e => onUpdate({ transitionOut: e.target.value as any })}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="cut">Cut</option>
                <option value="fade">Fade</option>
                <option value="slide">Slide</option>
                <option value="zoom">Zoom</option>
              </select>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Music Mood</label>
              <input
                type="text"
                value={scene.backgroundMusicMood || ''}
                onChange={e => onUpdate({ backgroundMusicMood: e.target.value })}
                className="rounded-lg border border-border bg-white px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 w-48"
                placeholder="e.g., upbeat, calm"
              />
            </div>
            <Button variant="destructive" size="sm" onClick={onRemove}>
              <Trash2 className="w-4 h-4 mr-1" /> Remove Scene
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  )
}