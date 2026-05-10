/* ─── Step 3: Avatar & Voice ─── */
/* Choose/create avatar with voice attachment */

import { useState, useEffect, useCallback } from 'react'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { toast } from 'sonner'
import {
  ChevronRight, ChevronLeft, User, Mic, Play, Square, Loader2,
  Plus, Sparkles, Volume2, Trash2, Edit3, Check
} from 'lucide-react'
import type { Avatar, VoiceConfig, VoiceProvider, VoiceLibraryEntry } from '../../lib/studioTypes'
import { EDGE_TTS_VOICES } from '../../lib/studioTypes'
import { generateId, loadAvatars, saveAvatar, deleteAvatar } from '../../lib/studioStorage'

interface Step3Props {
  avatar: Avatar | undefined
  onUpdateAvatar: (avatar: Avatar | undefined) => void
  onNext: () => void
  onPrev: () => void
}

// ─── Voice Preview (Edge TTS via backend) ───

function VoicePreview({ voice, text }: { voice: VoiceConfig; text: string }) {
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const audioRef = useState<HTMLAudioElement | null>(null)

  const preview = async () => {
    if (playing) {
      audioRef[0]?.pause()
      setPlaying(false)
      return
    }

    setLoading(true)
    try {
      // For Edge TTS, we'll generate a short preview
      if (voice.provider === 'edge_tts') {
        // Create a simple audio element with TTS URL
        // For now, show a toast that preview requires backend
        toast.info(`Voice: ${voice.edgeVoiceName} — Preview available during voiceover generation`)
      } else if (voice.provider === 'elevenlabs') {
        toast.info(`Voice: ${voice.elevenlabsVoice} — Preview via KIE ElevenLabs during voiceover step`)
      } else if (voice.provider === 'fish_audio') {
        toast.info('Fish Audio voice preview requires API key — available during voiceover step')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={preview}
      disabled={loading || !text}
      className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary-700 transition-colors"
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : playing ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
      Preview
    </button>
  )
}

export default function Step3AvatarVoice({ avatar, onUpdateAvatar, onNext, onPrev }: Step3Props) {
  const [avatars, setAvatars] = useState<Avatar[]>([])
  const [creating, setCreating] = useState(false)
  const [selectedVoiceProvider, setSelectedVoiceProvider] = useState<VoiceProvider>('edge_tts')
  const [selectedVoiceFilter, setSelectedVoiceFilter] = useState<string>('en')
  const [selectedVoiceEntry, setSelectedVoiceEntry] = useState<VoiceLibraryEntry | null>(null)
  const [customName, setCustomName] = useState('')
  const [customGender, setCustomGender] = useState<'female' | 'male' | 'neutral'>('female')
  const [customStyle, setCustomStyle] = useState('casual_chic')
  const [customTone, setCustomTone] = useState('warm_aspirational')

  // Load saved avatars
  useEffect(() => {
    setAvatars(loadAvatars())
  }, [])

  // Filter voices by language
  const filteredVoices = EDGE_TTS_VOICES.filter(v => v.language === selectedVoiceFilter)

  // ─── Create Avatar ───

  const createAvatar = () => {
    if (!customName.trim()) {
      toast.error('Please enter an avatar name')
      return
    }
    if (!selectedVoiceEntry) {
      toast.error('Please select a voice')
      return
    }

    const voiceConfig: VoiceConfig = {
      provider: selectedVoiceEntry.provider,
      language: selectedVoiceEntry.language,
      speed: 1.0,
      volume: 50,
      // Edge TTS
      edgeVoiceName: selectedVoiceEntry.provider === 'edge_tts' ? selectedVoiceEntry.nameKey : undefined,
      // ElevenLabs
      elevenlabsVoice: selectedVoiceEntry.provider === 'elevenlabs' ? selectedVoiceEntry.nameKey : undefined,
      elevenlabsModel: selectedVoiceEntry.provider === 'elevenlabs' ? 'elevenlabs/text-to-speech-turbo-2-5' : undefined,
    }

    const newAvatar: Avatar = {
      id: generateId(),
      name: customName,
      description: `${customGender}, ${customStyle}, ${customTone}`,
      gender: customGender,
      ageRange: '25-34',
      style: customStyle,
      expression: 'confident_smile',
      tone: customTone,
      voice: voiceConfig,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
      isPreset: false,
      tags: [customStyle, selectedVoiceEntry.language, customTone],
    }

    saveAvatar(newAvatar)
    setAvatars(loadAvatars())
    onUpdateAvatar(newAvatar)
    setCreating(false)
    toast.success(`Avatar "${customName}" created!`)
  }

  // ─── Select existing avatar ───
  const selectAvatar = (a: Avatar) => {
    onUpdateAvatar(a)
    toast.success(`Selected "${a.name}"`)
  }

  // ─── Use a quick preset ───
  const quickPreset = (entry: VoiceLibraryEntry) => {
    const presetAvatar: Avatar = {
      id: `preset_${entry.id}`,
      name: `${entry.name} Voice`,
      description: `${entry.gender}, ${entry.accent} accent, ${entry.tone}`,
      gender: entry.gender,
      ageRange: '25-34',
      style: 'product_demo',
      expression: 'confident',
      tone: entry.tone.toLowerCase(),
      voice: {
        provider: entry.provider,
        language: entry.language,
        speed: 1.0,
        volume: 50,
        edgeVoiceName: entry.provider === 'edge_tts' ? entry.nameKey : undefined,
        elevenlabsVoice: entry.provider === 'elevenlabs' ? entry.nameKey : undefined,
        elevenlabsModel: entry.provider === 'elevenlabs' ? 'elevenlabs/text-to-speech-turbo-2-5' : undefined,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
      isPreset: true,
      tags: entry.tags,
    }
    onUpdateAvatar(presetAvatar)
    toast.success(`Using ${entry.name}`)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ─── Header ─── */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">🧑 Avatar & Voice</h2>
        <p className="text-muted-foreground mt-1">Choose a voice personality for your video. Same avatar = same voice across all videos.</p>
      </div>

      {/* ─── Current Selection ─── */}
      {avatar && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-lg">
                  {avatar.gender === 'female' ? '👩' : avatar.gender === 'male' ? '👨' : '🧑'}
                </div>
                <div>
                  <p className="font-medium text-foreground">{avatar.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {avatar.voice.provider === 'edge_tts' ? '🆓 Free' : avatar.voice.provider === 'elevenlabs' ? '💎 KIE Credits' : '🐟 Fish Audio'} · {avatar.voice.language?.toUpperCase()}
                  </p>
                </div>
              </div>
              <Check className="w-5 h-5 text-green-500" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Quick Select (Free Voices) ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-green-500" />
            Quick Select — Free Voices
            <span className="text-xs text-muted-foreground font-normal">(Edge TTS · $0/min)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Language filter */}
          <div className="flex gap-2 flex-wrap">
            {[
              { code: 'en', label: '🇺🇸 English' },
              { code: 'en', label: '🇸🇬 SG English' },
              { code: 'zh', label: '🇨🇳 Chinese' },
              { code: 'ms', label: '🇲🇾 Malay' },
            ].map(lang => (
              <button
                key={lang.code + lang.label}
                onClick={() => setSelectedVoiceFilter(lang.code)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedVoiceFilter === lang.code
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>

          {/* Voice grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filteredVoices.map(voice => (
              <button
                key={voice.id}
                onClick={() => quickPreset(voice)}
                className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                  avatar?.voice?.edgeVoiceName === voice.nameKey || avatar?.voice?.elevenlabsVoice === voice.nameKey
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-muted/30'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{voice.name}</p>
                  <p className="text-xs text-muted-foreground">{voice.accent} · {voice.tone}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {voice.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="px-1.5 py-0.5 text-[10px] rounded bg-muted text-muted-foreground">{tag}</span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ─── Create Custom Avatar ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Create Custom Avatar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Avatar Name *</label>
              <input
                type="text"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                placeholder="e.g., Sarah — Sleep Mask Ambassador"
                className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Gender</label>
              <select
                value={customGender}
                onChange={e => setCustomGender(e.target.value as any)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Style</label>
              <select
                value={customStyle}
                onChange={e => setCustomStyle(e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="casual_chic">Casual Chic</option>
                <option value="professional">Professional</option>
                <option value="bohemian">Bohemian</option>
                <option value="luxury">Luxury</option>
                <option value="sporty">Sporty</option>
                <option value="minimalist">Minimalist</option>
                <option value="trendy">Trendy</option>
                <option value="product_demo">Product Demo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Tone</label>
              <select
                value={customTone}
                onChange={e => setCustomTone(e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="warm_aspirational">Warm & Aspirational</option>
                <option value="confident_professional">Confident & Professional</option>
                <option value="friendly_casual">Friendly & Casual</option>
                <option value="energetic_excited">Energetic & Excited</option>
                <option value="calm_review">Calm Review</option>
                <option value="luxurious">Luxurious</option>
                <option value="authoritative">Authoritative</option>
              </select>
            </div>
          </div>

          {/* Voice provider selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Voice Provider</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => { setSelectedVoiceProvider('edge_tts'); setSelectedVoiceEntry(null) }}
                className={`p-3 rounded-lg border text-left transition-all ${
                  selectedVoiceProvider === 'edge_tts' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
              >
                <p className="font-medium text-foreground text-sm">🆓 Edge TTS</p>
                <p className="text-xs text-muted-foreground">Free · 323 voices</p>
              </button>
              <button
                onClick={() => { setSelectedVoiceProvider('elevenlabs'); setSelectedVoiceEntry(null) }}
                className={`p-3 rounded-lg border text-left transition-all ${
                  selectedVoiceProvider === 'elevenlabs' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
              >
                <p className="font-medium text-foreground text-sm">💎 ElevenLabs</p>
                <p className="text-xs text-muted-foreground">KIE Credits · Premium</p>
              </button>
              <button
                onClick={() => { setSelectedVoiceProvider('fish_audio'); setSelectedVoiceEntry(null) }}
                className={`p-3 rounded-lg border text-left transition-all ${
                  selectedVoiceProvider === 'fish_audio' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
              >
                <p className="font-medium text-foreground text-sm">🐟 Fish Audio</p>
                <p className="text-xs text-muted-foreground">$0.005/min · Clone</p>
              </button>
            </div>
          </div>

          {/* Voice selection based on provider */}
          {selectedVoiceProvider === 'edge_tts' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Select Voice</label>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {filteredVoices.map(voice => (
                  <button
                    key={voice.id}
                    onClick={() => setSelectedVoiceEntry(voice)}
                    className={`p-2 rounded-lg border text-left text-sm transition-all ${
                      selectedVoiceEntry?.id === voice.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <p className="font-medium text-foreground">{voice.name}</p>
                    <p className="text-xs text-muted-foreground">{voice.accent} · {voice.tone}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedVoiceProvider === 'elevenlabs' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Select ElevenLabs Voice</label>
              <p className="text-xs text-muted-foreground mb-2">Uses KIE credits. ~$0.02/min.</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'rachel', name: 'Rachel', desc: 'Warm, storytelling' },
                  { id: 'aria', name: 'Aria', desc: 'Confident, clear' },
                  { id: 'roger', name: 'Roger', desc: 'Lively, energetic' },
                  { id: 'sarah', name: 'Sarah', desc: 'Professional, warm' },
                ].map(voice => (
                  <button
                    key={voice.id}
                    onClick={() => setSelectedVoiceEntry({
                      id: `elevenlabs-${voice.id}`,
                      provider: 'elevenlabs',
                      name: `${voice.name} (ElevenLabs)`,
                      nameKey: voice.id,
                      gender: voice.id === 'roger' ? 'male' : 'female',
                      language: 'en',
                      accent: 'American',
                      tone: voice.desc,
                      tags: ['premium'],
                      isPreset: true,
                    })}
                    className={`p-2 rounded-lg border text-left text-sm transition-all ${
                      selectedVoiceEntry?.nameKey === voice.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <p className="font-medium text-foreground">{voice.name}</p>
                    <p className="text-xs text-muted-foreground">{voice.desc}</p>
                    <span className="text-[10px] text-accent">💎 KIE Credits</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedVoiceProvider === 'fish_audio' && (
            <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
              <p className="font-medium text-foreground text-sm">🐟 Fish Audio — Voice Cloning</p>
              <p className="text-xs text-muted-foreground mt-1">
                Fish Audio requires a separate API key and supports voice cloning from 3-10 second samples.
                200K+ community voices, 100K chars/mo free.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Voice cloning configuration will be available in a future update.
                For now, please select Edge TTS or ElevenLabs.
              </p>
              <p className="text-xs text-primary mt-2">Coming soon in Phase 5! 🚀</p>
            </div>
          )}

          <Button onClick={createAvatar} disabled={!customName || !selectedVoiceEntry || selectedVoiceProvider === 'fish_audio'}>
            <Plus className="w-4 h-4 mr-1" /> Create Avatar
          </Button>
        </CardContent>
      </Card>

      {/* ─── Saved Avatars ─── */}
      {avatars.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5" />
              Saved Avatars
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {avatars.map(a => (
                <div
                  key={a.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    avatar?.id === a.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => selectAvatar(a)}
                >
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">
                    {a.gender === 'female' ? '👩' : a.gender === 'male' ? '👨' : '🧑'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{a.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.voice.provider === 'edge_tts' ? '🆓 Free' : a.voice.provider === 'elevenlabs' ? '💎 KIE' : '🐟 Fish'} · {a.tone} · Used {a.usageCount}x
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteAvatar(a.id); setAvatars(loadAvatars()); if (avatar?.id === a.id) onUpdateAvatar(undefined as any) }}
                    className="p-1.5 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Navigation ─── */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          <ChevronLeft className="w-5 h-5 mr-1" /> Storyboard
        </Button>
        <Button onClick={onNext}>
          Next: Scene Images <ChevronRight className="w-5 h-5 ml-1" />
        </Button>
      </div>
    </div>
  )
}