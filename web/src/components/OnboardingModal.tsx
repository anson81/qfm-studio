import { useState } from 'react'
import { BUSINESS_CATEGORIES, REGIONS, PLATFORMS, BusinessProfile, saveBusinessProfile } from '../lib/businessContext'
import { apiClient, getToken } from '../lib/api'
import { toast } from 'sonner'
import { Sparkles, ChevronRight, ChevronLeft, Check } from 'lucide-react'

interface OnboardingModalProps {
  onComplete: (profile: BusinessProfile) => void
}

export default function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(1)
  const [profile, setProfile] = useState<BusinessProfile>({
    business_category: '',
    business_name: '',
    business_description: '',
    business_region: 'Malaysia',
    target_audience: '',
    selling_platforms: 'TikTok Shop,Shopee',
  })
  const [saving, setSaving] = useState(false)

  const togglePlatform = (platform: string) => {
    const current = profile.selling_platforms ? profile.selling_platforms.split(',') : []
    const next = current.includes(platform)
      ? current.filter(p => p !== platform)
      : [...current, platform]
    setProfile(p => ({ ...p, selling_platforms: next.join(',') }))
  }

  const handleComplete = async () => {
    setSaving(true)
    try {
      saveBusinessProfile(profile)
      // Save to backend too
      const token = getToken()
      if (token) {
        await fetch('/api/v1/auth/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(profile),
        }).catch(() => {}) // backend may be offline
      }
      toast.success('Business profile saved! Your content will be tailored to your business. 🎯')
      onComplete(profile)
    } catch (err: any) {
      toast.error(err.message || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const totalSteps = 4
  const progress = (step / totalSteps) * 100

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Progress bar */}
        <div className="h-1.5 bg-muted">
          <div className="h-full bg-primary transition-all duration-500 rounded-r-full" style={{ width: `${progress}%` }} />
        </div>

        <div className="p-6 sm:p-8">
          {/* Step 1: Category */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-4xl mb-3">🚀</div>
                <h2 className="text-2xl font-bold text-foreground">What's your business?</h2>
                <p className="text-muted-foreground mt-2">We'll tailor all AI content to your niche. You can change this later in Settings.</p>
              </div>
              <div className="grid grid-cols-2 gap-2.5 max-h-[55vh] overflow-y-auto pr-1">
                {BUSINESS_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setProfile(p => ({ ...p, business_category: cat.id }))}
                    className={`p-3 rounded-xl border text-left transition-all duration-200 hover:border-primary/50 ${
                      profile.business_category === cat.id
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <span className="text-xl">{cat.icon}</span>
                    <p className="text-sm font-semibold text-foreground mt-1">{cat.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{cat.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Business Details */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-foreground">Tell us about your brand</h2>
                <p className="text-muted-foreground mt-1">This helps AI understand your voice and audience</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Business Name</label>
                <input
                  type="text"
                  value={profile.business_name}
                  onChange={e => setProfile(p => ({ ...p, business_name: e.target.value }))}
                  placeholder="e.g. Queen Fashion Malaysia"
                  className="w-full p-3 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">What do you sell? <span className="text-muted-foreground">(brief description)</span></label>
                <textarea
                  value={profile.business_description}
                  onChange={e => setProfile(p => ({ ...p, business_description: e.target.value }))}
                  placeholder="e.g. Muslim modest fashion brand — hijabs, baju kurung, abaya for the modern Malaysian woman"
                  rows={3}
                  className="w-full p-3 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Target Audience</label>
                <input
                  type="text"
                  value={profile.target_audience}
                  onChange={e => setProfile(p => ({ ...p, target_audience: e.target.value }))}
                  placeholder="e.g. 25-35 year old Muslim women in Malaysia"
                  className="w-full p-3 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          )}

          {/* Step 3: Region & Platforms */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-foreground">Where & how you sell</h2>
                <p className="text-muted-foreground mt-1">This customizes content for your market and platforms</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Primary Market / Region</label>
                <select
                  value={profile.business_region}
                  onChange={e => setProfile(p => ({ ...p, business_region: e.target.value }))}
                  className="w-full p-3 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {REGIONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">Selling Platforms <span className="text-muted-foreground">(select all that apply)</span></label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map(p => {
                    const selected = profile.selling_platforms.split(',').includes(p)
                    return (
                      <button
                        key={p}
                        onClick={() => togglePlatform(p)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all duration-200 ${
                          selected
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:border-primary/50 text-muted-foreground'
                        }`}
                      >
                        {selected && <Check className="w-3.5 h-3.5 inline mr-1" />}
                        {p}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Confirm */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="text-4xl mb-3">✨</div>
                <h2 className="text-2xl font-bold text-foreground">Perfect! Here's your profile</h2>
                <p className="text-muted-foreground mt-1">All AI content will be tailored to your business</p>
              </div>
              <div className="bg-muted rounded-xl p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Category</span>
                  <span className="text-sm font-medium text-foreground">{BUSINESS_CATEGORIES.find(c => c.id === profile.business_category)?.icon} {BUSINESS_CATEGORIES.find(c => c.id === profile.business_category)?.label || profile.business_category}</span>
                </div>
                {profile.business_name && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Business</span>
                    <span className="text-sm font-medium text-foreground">{profile.business_name}</span>
                  </div>
                )}
                {profile.business_description && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Description</span>
                    <span className="text-sm font-medium text-foreground text-right max-w-[250px]">{profile.business_description}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Region</span>
                  <span className="text-sm font-medium text-foreground">{profile.business_region}</span>
                </div>
                {profile.target_audience && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Audience</span>
                    <span className="text-sm font-medium text-foreground text-right max-w-[250px]">{profile.target_audience}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Platforms</span>
                  <span className="text-sm font-medium text-foreground">{profile.selling_platforms || 'None selected'}</span>
                </div>
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
                <p className="text-sm text-foreground">
                  <Sparkles className="w-4 h-4 inline text-primary mr-1" />
                  AI will generate <strong>{BUSINESS_CATEGORIES.find(c => c.id === profile.business_category)?.label}</strong> content specialized for <strong>{profile.business_region}</strong> market.
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            {step > 1 ? (
              <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <button onClick={() => onComplete({ business_category: '', business_name: '', business_description: '', business_region: 'Malaysia', target_audience: '', selling_platforms: 'TikTok Shop,Shopee' })} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Skip for now
              </button>
            )}

            {step < totalSteps ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={step === 1 && !profile.business_category}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={saving}
                className="flex items-center gap-1.5 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Start Creating!'} <Sparkles className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}