import { useState } from 'react'
import { loadBusinessProfile, getPromptPrefix } from '../lib/businessContext'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { apiClient } from '../lib/api'
import { toast } from 'sonner'
import { Mic, RefreshCw, Loader2, Copy, Volume2 } from 'lucide-react'

const VOICES = ['Malay Female (Natural)', 'Malay Female (Professional)', 'English Female (Warm)', 'English Male (Authoritative)', 'Bilingual Malay-English', 'Mandarin Female (温柔)', 'Mandarin Male (专业)', 'Cantonese Female (溫柔)', 'Cantonese Male (專業)', 'Tamil Female (இயல்பான)', 'Tamil Male (தொழில்முறை)']
const STYLES = ['Product Review', 'Storytelling', 'Tutorial', 'ASMR Soft', 'Energetic Promo']

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

export default function VoiceGenerator() {
  const biz = loadBusinessProfile()
  const [script, setScript] = useState('')
  const [voice, setVoice] = useState('Malay Female (Natural)')
  const [style, setStyle] = useState('Product Review')
  const [dialogueLanguage, setDialogueLanguage] = useState('ms')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleGenerate() {
    if (!apiClient.hasKIEKey()) { toast.error('Add your KIE.API key in Settings first'); return }
    if (!script.trim()) { toast.error('Enter your voiceover script first'); return }
    setLoading(true); setResult('')
    try {
      const res = await apiClient.generateTextSmart({
        system_prompt: `You are a multilingual voice script writer for ${getPromptPrefix(biz)} TikTok content. 
Voice: ${voice}. Style: ${style}. Language: ${LANGUAGE_NAMES[dialogueLanguage]}. All content MUST be in ${LANGUAGE_NAMES[dialogueLanguage]}.
Create an optimized voiceover script with:
1. A clean narration script (in the specified language)
2. Pronunciation guide for difficult words
3. Timing cues [PAUSE], [EMPHASIS]
4. Background music suggestion
5. An ElevenLabs-ready voice config suggestion (voice name, stability, clarity, style settings)

Format as: 
### Narration Script
[script]

### Pronunciation Guide  
[guide]

### Timing Cues
[cues]

### Music Suggestion
[suggestion]

### ElevenLabs Config
[config JSON]`,
        user_message: script,
        model: 'claude-sonnet-4-5'
      })
      const text = res.result?.choices?.[0]?.message?.content || res.result?.text || res.data?.choices?.[0]?.message?.content || JSON.stringify(res.result)
      setResult(text)
      apiClient.saveToLibrary({ type: 'text', prompt: script, model: 'voice-generator', status: 'completed', result_url: text || "" })
      toast.success('Voice script generated!')
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
        <h1 className="text-3xl font-bold flex items-center gap-2"><Mic className="w-8 h-8" /> Voice Generator</h1>
        <p className="text-muted-foreground">Generate Bahasa Malaysia and English voiceover scripts for TikTok videos</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Volume2 className="w-5 h-5" /> Create Voice Script</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Video Script / Topic</label>
            <textarea className="w-full p-3 bg-sidebar border border-sidebar-border rounded-lg text-white min-h-[120px] resize-y" value={script} onChange={(e) => setScript(e.target.value)} placeholder="e.g., Introduce our new Tudung collection, emphasize comfort and breathable fabric for Malaysian weather..." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Voice</label>
              <select className="w-full p-2 bg-sidebar border border-sidebar-border rounded-lg text-white" value={voice} onChange={(e) => setVoice(e.target.value)}>
                {VOICES.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Style</label>
              <select className="w-full p-2 bg-sidebar border border-sidebar-border rounded-lg text-white" value={style} onChange={(e) => setStyle(e.target.value)}>
                {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Language</label>
            <select className="w-full p-2 bg-sidebar border border-sidebar-border rounded-lg text-white" value={dialogueLanguage} onChange={e => setDialogueLanguage(e.target.value)}>
              {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
          <Button onClick={handleGenerate} disabled={loading} className="w-full">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating Script...</> : <><RefreshCw className="w-4 h-4 mr-2" /> Generate Voice Script</>}
          </Button>
        </CardContent>
      </Card>
      {result && (
        <Card>
          <CardHeader><CardTitle className="flex items-center justify-between">Voice Script <Button variant="ghost" onClick={handleCopy}><Copy className="w-4 h-4" /></Button></CardTitle></CardHeader>
          <CardContent><div className="p-4 bg-sidebar border border-sidebar-border rounded-lg whitespace-pre-wrap text-sm">{result}</div></CardContent>
        </Card>
      )}
    </div>
  )
}