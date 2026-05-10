import { useState } from 'react'
import { loadBusinessProfile, getPromptPrefix } from '../lib/businessContext'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { apiClient } from '../lib/api'
import { toast } from 'sonner'
import { Music2, RefreshCw, Loader2, Copy } from 'lucide-react'

const GENRES = ['Lo-fi Chill', 'Upbeat Pop', 'Traditional Malay', 'Romantic', 'Dramatic Cinematic']
const MOODS = ['Energetic', 'Peaceful', 'Inspiring', 'Nostalgic', 'Playful']

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

export default function Music() {
  const biz = loadBusinessProfile()
  const [concept, setConcept] = useState('')
  const [dialogueLanguage, setDialogueLanguage] = useState('ms')
  const [genre, setGenre] = useState('Lo-fi Chill')
  const [mood, setMood] = useState('Peaceful')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleGenerate() {
    if (!apiClient.hasKIEKey()) { toast.error('Add your KIE.API key in Settings first'); return }
    if (!concept.trim()) { toast.error('Describe your music idea first'); return }
    setLoading(true); setResult('')
    try {
      const res = await apiClient.generateTextSmart({
        system_prompt: `You are an expert music producer specializing in short-form video background music. Language: ${LANGUAGE_NAMES[dialogueLanguage]}. All descriptions MUST be in ${LANGUAGE_NAMES[dialogueLanguage]}. Generate detailed music creation prompts for Suno AI / AudioCraft. Genre: ${genre}. Mood: ${mood}. Context: ${getPromptPrefix(biz)}. Include: title, style tags, tempo, instruments, mood description, and a Suno-ready prompt string.`,
        user_message: concept,
        model: 'claude-sonnet-4-5'
      })
      const text = res.result?.choices?.[0]?.message?.content || res.result?.text || res.data?.choices?.[0]?.message?.content || JSON.stringify(res.result)
      setResult(text)
      apiClient.saveToLibrary({ type: 'text', prompt: concept, model: 'suno', status: 'completed', result_url: text || "" })
      toast.success('Music prompts generated!')
    } catch (err: any) { toast.error(err.message || 'Generation failed') }
    finally { setLoading(false) }
  }

  function handleCopy() {
    navigator.clipboard.writeText(result)
    toast.success('Copied to clipboard!')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><Music2 className="w-8 h-8" /> Music Generator</h1>
        <p className="text-muted-foreground">Create background music tracks tailored for TikTok content</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Music2 className="w-5 h-5" /> Create Music Prompt</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Video / Content Concept</label>
            <textarea className="w-full p-3 bg-sidebar border border-sidebar-border rounded-lg text-white min-h-[100px] resize-y" value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="e.g., Hijab try-on video showing a new Kurung collection in soft pastels..." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Genre</label>
              <select className="w-full p-2 bg-sidebar border border-sidebar-border rounded-lg text-white" value={genre} onChange={(e) => setGenre(e.target.value)}>
                {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Mood</label>
              <select className="w-full p-2 bg-sidebar border border-sidebar-border rounded-lg text-white" value={mood} onChange={(e) => setMood(e.target.value)}>
                {MOODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
                <div>
                  <label className="text-sm">Language</label>
                  <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={dialogueLanguage} onChange={e=> setDialogueLanguage(e.target.value)}>
                    {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>
          <Button onClick={handleGenerate} disabled={loading} className="w-full">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><RefreshCw className="w-4 h-4 mr-2" /> Generate Music Prompt</>}
          </Button>
        </CardContent>
      </Card>
      {result && (
        <Card>
          <CardHeader><CardTitle className="flex items-center justify-between">Music Prompts <Button variant="ghost" onClick={handleCopy}><Copy className="w-4 h-4" /></Button></CardTitle></CardHeader>
          <CardContent><div className="p-4 bg-sidebar border border-sidebar-border rounded-lg whitespace-pre-wrap text-sm">{result}</div></CardContent>
        </Card>
      )}
    </div>
  )
}