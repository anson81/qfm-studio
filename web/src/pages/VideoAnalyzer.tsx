import { useState, useRef } from 'react'
import { loadBusinessProfile, getPromptPrefix } from '../lib/businessContext'
import { apiClient } from '../lib/api'
import { toast } from 'sonner'
import {
  Video, Link, Upload, Play, Copy, Check, Loader2,
  Target, Megaphone, Zap, TrendingUp, Lightbulb, Film, BarChart3, ArrowRight
} from 'lucide-react'

type AnalysisResult = {
  summary?: string
  video_type?: string
  hook?: { description: string; effectiveness: string; suggestion: string }
  selling_points?: { point: string; timestamp: string; visual: string }[]
  call_to_action?: { description: string; type: string; placement: string }
  pacing?: { style: string; estimated_cuts: number; avg_cut_duration: string }
  visual_style?: { lighting: string; color_grading: string; camera_work: string; text_on_screen: boolean; text_style: string }
  audio_cues?: { trending_audio: boolean; voiceover: boolean; music_genre: string; sound_effects: boolean }
  storyboard?: { scene: number; timestamp: string; description: string; visual: string; text_overlay: string; action: string }[]
  clone_prompt?: string
  improvement_tips?: string[]
  viral_potential?: { score: number; reasons: string[] }
  raw_analysis?: string
}

const VIRAL_COLORS: Record<number, string> = {
  1: 'text-red-500', 2: 'text-red-500', 3: 'text-orange-500',
  4: 'text-orange-500', 5: 'text-yellow-500', 6: 'text-yellow-500',
  7: 'text-green-500', 8: 'text-green-500', 9: 'text-emerald-500', 10: 'text-emerald-500',
}

export default function VideoAnalyzer() {
  const biz = loadBusinessProfile()
  const fileRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<'url' | 'upload'>('url')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [contentId, setContentId] = useState<number | null>(null)
  const [title, setTitle] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  async function handleAnalyze() {
    if (mode === 'url' && !url.trim()) {
      toast.error('Please paste a TikTok, Douyin, or video URL')
      return
    }
    if (mode === 'upload' && !file) {
      toast.error('Please select a video file to upload')
      return
    }

    setAnalyzing(true)
    setAnalysis(null)
    try {
      const context = biz ? `${getPromptPrefix(biz)} — ${biz.business_description || ''}` : undefined
      let result: any
      if (mode === 'url') {
        result = await apiClient.analyzeVideoUrl(url.trim(), context)
      } else {
        result = await apiClient.analyzeVideoUpload(file!, context)
      }
      setAnalysis(result.analysis || {})
      setContentId(result.content_id)
      setTitle(result.title || 'Video Analysis')
      toast.success('Analysis complete!')
    } catch (err: any) {
      toast.error(err.message || 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
    toast.success(`${label} copied!`)
  }

  const viralScore = analysis?.viral_potential?.score ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Video className="w-7 h-7 text-primary" />
          Video Analyzer
        </h1>
        <p className="text-muted-foreground mt-1">
          Paste a TikTok/Douyin link or upload a video — AI breaks down the hook, selling points, story structure, and gives you a clone prompt.
        </p>
      </div>

      {/* Input Section */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        {/* Mode tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setMode('url')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              mode === 'url' ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Link className="w-4 h-4" />
            Paste URL
          </button>
          <button
            onClick={() => setMode('upload')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              mode === 'upload' ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload Video
          </button>
        </div>

        <div className="p-5">
          {mode === 'url' ? (
            <div className="space-y-3">
              <label className="block text-sm font-medium">Video URL</label>
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://www.tiktok.com/@user/video/... or https://www.douyin.com/video/..."
                className="w-full px-4 py-3 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
              />
              <p className="text-xs text-muted-foreground">
                Supports TikTok, Douyin, Instagram Reels, YouTube Shorts, and most video URLs
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
                onDrop={e => { e.preventDefault(); setFile(e.dataTransfer.files[0]) }}
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="video/*"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                {file ? (
                  <div>
                    <Video className="w-10 h-10 mx-auto text-primary mb-2" />
                    <p className="font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(file.size / 1024 / 1024).toFixed(1)} MB — Click to change
                    </p>
                    <p className="text-xs text-green-600 mt-1 font-medium">✓ Ready to analyze</p>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                    <p className="font-medium">Drop a video file here or click to browse</p>
                    <p className="text-xs text-muted-foreground mt-1">MP4, MOV, WEBM, AVI — max 200MB</p>
                  </div>
                )}
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800 border border-blue-100">
                💡 <strong>Tip:</strong> The file uploads when you click "Analyze Video" below. No need to wait after selecting.
              </div>
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={analyzing || (mode === 'url' ? !url.trim() : !file)}
            className="mt-4 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-primary/20"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyzing... (extracting frames + AI analysis)
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Analyze Video
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results Section */}
      {analysis && (
        <div className="space-y-4">
          {/* Summary + Viral Score */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-white rounded-xl border border-border shadow-sm p-5">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Summary</h3>
              <p className="text-sm leading-relaxed">{analysis.summary || analysis.raw_analysis?.slice(0, 200)}</p>
              {analysis.video_type && (
                <span className="inline-block mt-2 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  {analysis.video_type.replace(/_/g, ' ')}
                </span>
              )}
            </div>
            <div className="bg-white rounded-xl border border-border shadow-sm p-5 text-center">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Viral Potential</h3>
              <div className={`text-5xl font-bold ${VIRAL_COLORS[viralScore] || 'text-muted-foreground'}`}>
                {viralScore}<span className="text-lg text-muted-foreground">/10</span>
              </div>
              {analysis.viral_potential?.reasons && (
                <ul className="mt-3 space-y-1 text-xs text-muted-foreground text-left">
                  {analysis.viral_potential.reasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <TrendingUp className="w-3 h-3 mt-0.5 text-green-500 shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Clone Prompt — the most valuable output */}
          {analysis.clone_prompt && (
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/20 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  Clone Prompt
                </h3>
                <button
                  onClick={() => copyToClipboard(analysis.clone_prompt!, 'Clone Prompt')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-white text-xs font-medium hover:bg-primary-700 transition-colors"
                >
                  {copied === 'Clone Prompt' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy Prompt
                </button>
              </div>
              <p className="text-sm leading-relaxed bg-white/80 rounded-lg p-4 border border-primary/10">
                {analysis.clone_prompt}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                💡 Paste this prompt directly into Video Generator to create a similar-style video.
              </p>
            </div>
          )}

          {/* Hook Analysis */}
          {analysis.hook && (
            <div className="bg-white rounded-xl border border-border shadow-sm p-5">
              <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-orange-500" />
                Hook Analysis
              </h3>
              <div className="space-y-2">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground">Description</span>
                  <p className="text-sm">{analysis.hook.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">Effectiveness</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    analysis.hook.effectiveness === 'high' ? 'bg-green-100 text-green-700' :
                    analysis.hook.effectiveness === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {analysis.hook.effectiveness}
                  </span>
                </div>
                {analysis.hook.suggestion && (
                  <div className="bg-green-50 rounded-lg p-3 text-sm">
                    <span className="text-xs font-semibold text-green-700">💡 Improvement</span>
                    <p className="text-green-900 mt-0.5">{analysis.hook.suggestion}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Selling Points */}
          {analysis.selling_points && analysis.selling_points.length > 0 && (
            <div className="bg-white rounded-xl border border-border shadow-sm p-5">
              <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 mb-3">
                <Megaphone className="w-4 h-4 text-blue-500" />
                Selling Points
              </h3>
              <div className="space-y-2">
                {analysis.selling_points.map((sp, i) => (
                  <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{sp.point}</p>
                      <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                        {sp.timestamp && <span>⏱ {sp.timestamp}</span>}
                        {sp.visual && <span>👁 {sp.visual}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Call to Action */}
          {analysis.call_to_action && (
            <div className="bg-white rounded-xl border border-border shadow-sm p-5">
              <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 mb-3">
                <ArrowRight className="w-4 h-4 text-purple-500" />
                Call to Action
              </h3>
              <div className="flex items-center gap-4">
                <p className="text-sm flex-1">{analysis.call_to_action.description}</p>
                <div className="flex flex-col gap-1 items-end text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                    {analysis.call_to_action.type?.replace(/_/g, ' ')}
                  </span>
                  <span className="text-muted-foreground">{analysis.call_to_action.placement}</span>
                </div>
              </div>
            </div>
          )}

          {/* Visual Style + Audio */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysis.visual_style && (
              <div className="bg-white rounded-xl border border-border shadow-sm p-5">
                <h3 className="text-sm font-bold uppercase tracking-wider mb-3">🎬 Visual Style</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lighting</span>
                    <span className="font-medium capitalize">{analysis.visual_style.lighting}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Color Grading</span>
                    <span className="font-medium capitalize">{analysis.visual_style.color_grading}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Camera</span>
                    <span className="font-medium capitalize">{analysis.visual_style.camera_work}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Text on Screen</span>
                    <span className="font-medium">{analysis.visual_style.text_on_screen ? '✓ Yes' : '✗ No'}</span>
                  </div>
                  {analysis.visual_style.text_style && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Text Style</span>
                      <span className="font-medium capitalize">{analysis.visual_style.text_style.replace(/_/g, ' ')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            {analysis.audio_cues && (
              <div className="bg-white rounded-xl border border-border shadow-sm p-5">
                <h3 className="text-sm font-bold uppercase tracking-wider mb-3">🎵 Audio Cues</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Trending Audio</span>
                    <span className="font-medium">{analysis.audio_cues.trending_audio ? '✓ Yes' : '✗ No'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Voiceover</span>
                    <span className="font-medium">{analysis.audio_cues.voiceover ? '✓ Yes' : '✗ No'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Music Genre</span>
                    <span className="font-medium capitalize">{analysis.audio_cues.music_genre}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sound Effects</span>
                    <span className="font-medium">{analysis.audio_cues.sound_effects ? '✓ Yes' : '✗ No'}</span>
                  </div>
                  {analysis.pacing && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pacing</span>
                        <span className="font-medium capitalize">{analysis.pacing.style.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Est. Cuts</span>
                        <span className="font-medium">{analysis.pacing.estimated_cuts}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Storyboard */}
          {analysis.storyboard && analysis.storyboard.length > 0 && (
            <div className="bg-white rounded-xl border border-border shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                  <Film className="w-4 h-4 text-primary" />
                  Storyboard Breakdown
                </h3>
                <button
                  onClick={() => {
                    const text = analysis.storyboard!.map(s =>
                      `Scene ${s.scene} [${s.timestamp}]: ${s.description}\n  Visual: ${s.visual}\n  Text: ${s.text_overlay}\n  Action: ${s.action}`
                    ).join('\n\n')
                    copyToClipboard(text, 'Storyboard')
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted text-xs font-medium hover:bg-muted/80 transition-colors"
                >
                  {copied === 'Storyboard' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy All
                </button>
              </div>
              <div className="space-y-3">
                {analysis.storyboard.map((scene, i) => (
                  <div key={i} className="flex gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                        {scene.scene}
                      </div>
                      <span className="text-[10px] text-muted-foreground">{scene.timestamp}</span>
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{scene.description}</p>
                      {scene.visual && <p className="text-xs text-muted-foreground">👁 {scene.visual}</p>}
                      {scene.text_overlay && <p className="text-xs text-primary/80">💬 "{scene.text_overlay}"</p>}
                      {scene.action && <p className="text-xs text-muted-foreground">🎬 {scene.action}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Improvement Tips */}
          {analysis.improvement_tips && analysis.improvement_tips.length > 0 && (
            <div className="bg-white rounded-xl border border-border shadow-sm p-5">
              <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-yellow-500" />
                Improvement Tips
              </h3>
              <ul className="space-y-2">
                {analysis.improvement_tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Save indicator */}
          {contentId && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
              <BarChart3 className="w-3.5 h-3.5" />
              Saved to Content Library (ID: {contentId})
            </div>
          )}
        </div>
      )}

      {/* Empty state if no analysis yet */}
      {!analysis && !analyzing && (
        <div className="bg-white rounded-xl border border-border shadow-sm p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Video className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-semibold text-lg">Analyze Any Video</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Paste a TikTok or Douyin link, or upload a video file. Our AI will extract the hook, selling points, CTA, visual style, storyboard, and give you a ready-to-use clone prompt.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 max-w-lg mx-auto">
            {[
              { icon: '🎯', label: 'Hook Analysis' },
              { icon: '💰', label: 'Selling Points' },
              { icon: '📋', label: 'Storyboard' },
              { icon: '⚡', label: 'Clone Prompt' },
            ].map(item => (
              <div key={item.label} className="p-3 rounded-lg bg-muted/50">
                <div className="text-2xl mb-1">{item.icon}</div>
                <div className="text-xs font-medium">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}