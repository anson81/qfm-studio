import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadBusinessProfile, getPromptPrefix } from '../lib/businessContext'
import { Button } from '../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { aspectRatios } from '../lib/models'
import { apiClient } from '../lib/api'
import { toast } from 'sonner'
import { Clapperboard, Copy, Video, Loader2 } from 'lucide-react'

const FRAMEWORK = [
  { key: 'S1', stage: 'Hook (Setup 1)', objective: 'Hook with relatable situation', aida: 'Attention' },
  { key: 'S2', stage: 'Empathy (Setup 2)', objective: 'Build empathy and connection', aida: 'Attention' },
  { key: 'I', stage: 'Impact/Issue', objective: 'Show negative consequences', aida: 'Interest' },
  { key: 'U', stage: 'Understanding', objective: 'Reveal aha moment', aida: 'Interest' },
  { key: 'T', stage: 'Transformation', objective: 'Show visual & emotional change', aida: 'Desire' },
  { key: 'A', stage: 'Action/CTA', objective: 'Drive conversion', aida: 'Action' },
]

const LANGUAGES = [
  { value: 'ms', label: 'Bahasa Malaysia' },
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文 (Mandarin)' },
  { value: 'zh-hk', label: '粤语 (Cantonese)' },
  { value: 'ta', label: 'தமிழ் (Tamil)' },
]

const LANGUAGE_NAMES: Record<string, string> = {
  'ms': 'Bahasa Malaysia',
  'en': 'English',
  'zh': '中文 (Mandarin)',
  'zh-hk': '粤语 (Cantonese)',
  'ta': 'தமிழ் (Tamil)',
}

export default function Storyboard() {
  const biz = loadBusinessProfile()
  const navigate = useNavigate()
  const [storyIdea, setStoryIdea] = useState('')
  const [aspectRatio, setAspectRatio] = useState('9:16')
  const [dialogueLanguage, setDialogueLanguage] = useState('ms')
  const [scenes, setScenes] = useState<any[]>([])
  const [rawStoryboard, setRawStoryboard] = useState('')
  const [generating, setGenerating] = useState(false)

  async function handleGenerate() {
    if (!storyIdea.trim()) { toast.error('Enter a story idea first'); return }
    if (!apiClient.hasKIEKey()) { toast.error('Add your KIE.API key in Settings first'); return }
    setGenerating(true); setScenes([])
    const systemPrompt = `You are a TikTok content strategist specializing in ${getPromptPrefix(biz)}. Generate a 6-scene storyboard for maximum engagement using the SEITU framework (Setup1, Setup2, Impact, Understanding, Transformation, Action).

CRITICAL INSTRUCTIONS:
- Output ONLY a JSON array. No preamble, no explanation, no "I will create..." text.
- Start your response with [ and end with ]
- Each scene object must have keys: scene (number), stage (string), visual (string), dialogue (string), on_screen_text (string), duration (string like "3s")
- All dialogue and on-screen text MUST be in ${LANGUAGE_NAMES[dialogueLanguage] || 'Bahasa Malaysia'}
- Visual descriptions in English only
- Aspect ratio: ${aspectRatio}

Example first scene:
{"scene": 1, "stage": "Hook (Setup 1)", "visual": "Close-up of...", "dialogue": "...", "on_screen_text": "...", "duration": "3s"}`
    const langName = LANGUAGE_NAMES[dialogueLanguage] || 'Bahasa Malaysia'
    try {
      // Always use KIE Claude for storyboards — Gemini returns meta-commentary instead of JSON
      let res = await apiClient.generateText({
        system_prompt: systemPrompt,
        user_message: storyIdea,
        model: 'claude-sonnet-4-5'
      })
      let raw = res.result?.choices?.[0]?.message?.content || res.result?.text || res.data?.choices?.[0]?.message?.content || ''
      // If Claude also returned meta-commentary (very rare), try Gemini as fallback
      const trimmed = raw.trim()
      if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) {
        console.warn('[Storyboard] Claude returned commentary, trying Gemini fallback...')
        try {
          res = await apiClient.generateTextGemini({
            system_prompt: systemPrompt,
            user_message: storyIdea,
            model: 'gemini-2.5-flash'
          })
          raw = res.result?.choices?.[0]?.message?.content || res.result?.text || res.data?.choices?.[0]?.message?.content || ''
        } catch (e: any) {
          console.warn('[Storyboard] Gemini fallback also failed:', e.message)
        }
      }
      try {
        const cleaned = raw.trim().replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
        const parsed = JSON.parse(cleaned)
        const scenesArray = Array.isArray(parsed) ? parsed : [parsed]
        if (scenesArray.length >= 3) {
          setScenes(scenesArray)
        } else {
          // Fallback: display as scene cards even if fewer than 3
          setScenes(scenesArray)
        }
      } catch {
        // JSON parse failed — show raw text as a single scene
        setScenes([{ scene: 1, description: raw }])
      }
      setRawStoryboard(raw)
      apiClient.saveToLibrary({ type: 'text', model: 'storyboard', prompt: storyIdea, status: 'completed', result_url: raw || "" })
      toast.success('Storyboard generated!')
    } catch (err: any) {
      toast.error(err.message || 'Generation failed')
    }
    finally { setGenerating(false) }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Storyboard Generator</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <label className="text-sm font-medium">Story Idea</label>
              <textarea className="min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none"
                value={storyIdea} onChange={e=> setStoryIdea(e.target.value)}
                placeholder="e.g. My tudung collection launching for Raya 2026"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm">Aspect Ratio</label>
                  <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={aspectRatio} onChange={e=> setAspectRatio(e.target.value)}>
                    {aspectRatios.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm">Dialogue Language</label>
                  <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={dialogueLanguage} onChange={e=> setDialogueLanguage(e.target.value)}>
                    {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>
              </div>
              <Button onClick={handleGenerate} disabled={generating || !storyIdea.trim()}>
                {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</> : <><Clapperboard className="w-4 h-4 mr-2" />Generate Storyboard</>}
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {scenes.length === 0 && !generating && (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                <Clapperboard className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No storyboard yet. Fill in your idea above and click Generate.</p>
              </div>
            )}
            {generating && (
              <div className="text-center py-8 text-muted-foreground">
                <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin" />
                <p className="text-sm">Generating 6-scene storyboard...</p>
              </div>
            )}
            {scenes.length > 0 && scenes.map((scene, i) => (
              <Card key={i} className="border-l-4 border-l-primary">
                <CardContent className="p-4">
                  <div>
                    <p className="font-semibold">Scene {scene.scene || scene.scene_number || i+1}: {scene.stage || scene.title || ''}</p>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{scene.description || scene.visual || scene.dialogue || JSON.stringify(scene)}</p>
                    {(scene.duration || scene.on_screen_text) && (
                      <p className="text-xs text-muted-foreground mt-1">{scene.duration && `Duration: ${scene.duration}`} {scene.on_screen_text && `| Text: ${scene.on_screen_text}`}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Action buttons after storyboard */}
          {scenes.length > 0 && (
            <div className="flex gap-3 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Format scenes as readable text
                  const text = scenes.map((s, i) => {
                    const num = s.scene || s.scene_number || i + 1
                    const stage = s.stage || s.title || ''
                    const visual = s.visual || s.description || ''
                    const dialogue = s.dialogue || ''
                    const onscreen = s.on_screen_text || ''
                    const dur = s.duration || ''
                    return `Scene ${num}: ${stage}\nVisual: ${visual}\nDialogue: ${dialogue}\nOn-screen: ${onscreen}\nDuration: ${dur}`
                  }).join('\n\n')
                  navigator.clipboard.writeText(text).then(() => toast.success('Storyboard copied!')).catch(() => {
                    // Fallback for mobile
                    const ta = document.createElement('textarea')
                    ta.value = text
                    document.body.appendChild(ta)
                    ta.select()
                    document.execCommand('copy')
                    document.body.removeChild(ta)
                    toast.success('Storyboard copied!')
                  })
                }}
              >
                <Copy className="w-4 h-4 mr-1" /> Copy All
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  // Pass both formatted text AND raw JSON storyboard to video generator
                  // JSON is preferred — storyboardToVideoPrompts parses it directly into per-scene prompts
                  navigate('/video-generator', { state: { storyboardPrompt: rawStoryboard || scenes.map((s, i) => {
                    const num = s.scene || s.scene_number || i + 1
                    const visual = s.visual || s.description || ''
                    const dialogue = s.dialogue || ''
                    const onscreen = s.on_screen_text || ''
                    return `Scene ${num}: ${visual}${onscreen ? `. On-screen: ${onscreen}` : ''}${dialogue ? `. Dialogue: ${dialogue}` : ''}`
                  }).join('\n\n') } })
                }}
              >
                <Video className="w-4 h-4 mr-1" /> Send to Video Generator
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">6-Scene Framework</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm"><strong>Convert Storytelling Framework:</strong> 6 scenes designed for maximum TikTok engagement.</p>
              <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                <li>Hook (Setup 1)</li>
                <li>Empathy (Setup 2)</li>
                <li>Impact/Issue</li>
                <li>Understanding (Aha!)</li>
                <li>Transformation</li>
                <li>Action/CTA</li>
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Tips</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ul className="list-disc list-inside space-y-1">
                <li>Keep story ideas under 2 sentences</li>
                <li>Include product name for auto-placement</li>
                <li>Specify target audience (e.g. "25-35 Muslim women")</li>
                <li>Choose dialogue language — all on-screen text & voiceover will be in that language</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}