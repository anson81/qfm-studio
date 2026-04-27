import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { aspectRatios } from '../lib/models'
import { toast } from 'sonner'
import { Clapperboard } from 'lucide-react'

const FRAMEWORK = [
  { key: 'S1', stage: 'Hook (Setup 1)', objective: 'Hook with relatable situation', aida: 'Attention' },
  { key: 'S2', stage: 'Empathy (Setup 2)', objective: 'Build empathy and connection', aida: 'Attention' },
  { key: 'I', stage: 'Impact/Issue', objective: 'Show negative consequences', aida: 'Interest' },
  { key: 'U', stage: 'Understanding', objective: 'Reveal aha moment', aida: 'Interest' },
  { key: 'T', stage: 'Transformation', objective: 'Show visual & emotional change', aida: 'Desire' },
  { key: 'A', stage: 'Action/CTA', objective: 'Drive conversion', aida: 'Action' },
]

export default function Storyboard() {
  const [storyIdea, setStoryIdea] = useState('')
  const [aspectRatio, setAspectRatio] = useState('9:16')
  const [dialogueLanguage, setDialogueLanguage] = useState('ms')
  const [scenes, setScenes] = useState<any[]>([])
  const [generating, setGenerating] = useState(false)

  async function handleGenerate() {
    setGenerating(true)
    try {
      toast.info('Storyboard generation via KIE.AI requires credits. Add your API key in Settings.')
    } finally { setGenerating(false) }
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm">Aspect Ratio</label>
                  <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={aspectRatio} onChange={e=> setAspectRatio(e.target.value)}>
                    {aspectRatios.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm">Dialogue Language</label>
                  <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={dialogueLanguage} onChange={e=> setDialogueLanguage(e.target.value)}>
                    <option value="ms">Bahasa Malaysia</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>
              <Button onClick={handleGenerate} disabled={generating || !storyIdea.trim()}>
                <Clapperboard className="w-4 h-4 mr-2" />Generate Storyboard
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {FRAMEWORK.map(stage => (
              <Card key={stage.key} className="border-l-4 border-l-primary">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{stage.stage}</p>
                      <p className="text-sm text-muted-foreground">{stage.objective}</p>
                    </div>
                    <span className="text-xs font-medium bg-muted px-2 py-1 rounded">{stage.aida}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
