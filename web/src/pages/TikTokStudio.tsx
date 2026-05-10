/* ─── TikTok Studio ─── */
/* Multi-step wizard for creating TikTok product videos */

import { useState, useCallback } from 'react'
import { Check, ChevronLeft } from 'lucide-react'
import type { ProjectStep, VideoProject, Storyboard, Avatar } from '../lib/studioTypes'
import { STEP_LABELS, STEP_ICONS } from '../lib/studioTypes'
import { saveProject, loadProject, generateId } from '../lib/studioStorage'
import Step1ProductInput from '../components/studio/Step1ProductInput'
import Step2Storyboard from '../components/studio/Step2Storyboard'
import Step3AvatarVoice from '../components/studio/Step3AvatarVoice'
import Step4SceneImages from '../components/studio/Step4SceneImages'
import Step5SceneVideos from '../components/studio/Step5SceneVideos'
import Step6VoiceAssembly from '../components/studio/Step6VoiceAssembly'

const STEPS: ProjectStep[] = [
  'product_input',
  'storyboard',
  'avatar_voice',
  'scene_images',
  'scene_videos',
  'voiceover_assembly',
]

const defaultProject: VideoProject = {
  id: generateId(),
  name: '',
  currentStep: 'product_input',
  product: {
    name: '',
    description: '',
    category: '',
    targetPlatform: 'tiktok',
    photos: [],
  },
  defaultImageModel: 'google/nano-banana-2',
  defaultVideoModel: 'kling-2.6/text-to-video',
  defaultVoiceProvider: 'edge_tts',
  assemblyStatus: 'pending',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

// ─── Helper: persist storyboard + avatar alongside project ───

function saveAll(p: VideoProject, sb?: Storyboard, av?: Avatar) {
  const updated = {
    ...p,
    // Store storyboard/avatar inside project so they survive page reload
    storyboard: sb,
    avatar: av,
    updatedAt: new Date().toISOString(),
  }
  saveProject(updated as any)  // VideoProject type doesn't have these but we store them anyway
}

export default function TikTokStudio() {
  // ─── Initialize from localStorage ───
  const [project, setProject] = useState<VideoProject>(() => {
    const saved = loadProject()
    if (saved) return { ...saved }
    return { ...defaultProject }
  })

  const [storyboard, setStoryboard] = useState<Storyboard | undefined>(() => {
    const saved = loadProject()
    // Restore storyboard from saved project data
    return (saved as any)?.storyboard ?? undefined
  })

  const [avatar, setAvatar] = useState<Avatar | undefined>(() => {
    const saved = loadProject()
    return (saved as any)?.avatar ?? undefined
  })

  const currentStepIndex = STEPS.indexOf(project.currentStep)

  const updateProject = useCallback((updates: Partial<VideoProject>) => {
    setProject(prev => {
      const updated = { ...prev, ...updates, updatedAt: new Date().toISOString() }
      // Save project + storyboard + avatar together
      saveAll(updated, storyboard, avatar)
      return updated
    })
  }, [storyboard, avatar])

  // ─── Persist storyboard changes ───
  const handleUpdateStoryboard = useCallback((sb: Storyboard) => {
    setStoryboard(sb)
    // Also persist to localStorage immediately
    setProject(prev => {
      const updated = { ...prev, updatedAt: new Date().toISOString() }
      saveAll(updated, sb, avatar)
      return updated
    })
  }, [avatar])

  // ─── Persist avatar changes ───
  const handleUpdateAvatar = useCallback((av: Avatar | undefined) => {
    setAvatar(av)
    setProject(prev => {
      const updated = { ...prev, updatedAt: new Date().toISOString() }
      saveAll(updated, storyboard, av)
      return updated
    })
  }, [storyboard])

  const goToStep = (step: ProjectStep) => {
    updateProject({ currentStep: step })
  }

  const goNext = () => {
    const idx = STEPS.indexOf(project.currentStep)
    if (idx < STEPS.length - 1) {
      goToStep(STEPS[idx + 1])
    }
  }

  const goPrev = () => {
    const idx = STEPS.indexOf(project.currentStep)
    if (idx > 0) {
      goToStep(STEPS[idx - 1])
    }
  }

  const updateProduct = (product: typeof project.product) => {
    updateProject({ product })
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* ─── Header ─── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">🎬 TikTok Video Studio</h1>
            <p className="text-muted-foreground text-sm mt-1">Create professional product videos for TikTok in 6 steps</p>
          </div>
          <button
            onClick={() => {
              if (confirm('Start a new project? Current progress will be lost.')) {
                const fresh = { ...defaultProject, id: generateId() }
                setProject(fresh)
                setStoryboard(undefined)
                setAvatar(undefined)
                saveAll(fresh, undefined, undefined)
              }
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            New Project
          </button>
        </div>

        {/* ─── Step Indicator ─── */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, idx) => {
              const isCompleted = idx < currentStepIndex
              const isCurrent = idx === currentStepIndex

              return (
                <div key={step} className="flex items-center">
                  <button
                    onClick={() => isCompleted ? goToStep(step) : null}
                    className={`
                      flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold transition-all duration-200 shrink-0
                      ${isCompleted
                        ? 'bg-green-500 text-white cursor-pointer hover:bg-green-600'
                        : isCurrent
                          ? 'bg-primary text-white ring-4 ring-primary/20'
                          : 'bg-muted text-muted-foreground cursor-default'
                      }
                    `}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : STEP_ICONS[step]}
                  </button>
                  {idx < STEPS.length - 1 && (
                    <div className={`hidden sm:block h-0.5 flex-1 mx-2 transition-colors duration-200 ${idx < currentStepIndex ? 'bg-green-500' : 'bg-border'}`} />
                  )}
                  <div className="hidden md:block ml-2 min-w-0">
                    <p className={`text-xs font-medium ${isCurrent ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-muted-foreground'} truncate`}>
                      {STEP_LABELS[step]}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ─── Step Content ─── */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          {project.currentStep === 'product_input' && (
            <Step1ProductInput
              product={project.product}
              onUpdate={updateProduct}
              onNext={goNext}
            />
          )}

          {project.currentStep === 'storyboard' && (
            <Step2Storyboard
              product={project.product}
              storyboard={storyboard}
              onUpdateStoryboard={handleUpdateStoryboard}
              onNext={goNext}
              onPrev={goPrev}
            />
          )}

          {project.currentStep === 'avatar_voice' && (
            <Step3AvatarVoice
              avatar={avatar}
              onUpdateAvatar={handleUpdateAvatar}
              onNext={goNext}
              onPrev={goPrev}
            />
          )}

          {project.currentStep === 'scene_images' && storyboard && (
            <Step4SceneImages
              storyboard={storyboard}
              onUpdateStoryboard={handleUpdateStoryboard}
              onNext={goNext}
              onPrev={goPrev}
            />
          )}
          {project.currentStep === 'scene_images' && !storyboard && (
            <div className="text-center py-12">
              <p className="text-xl font-medium text-foreground">🖼️ Scene Images</p>
              <p className="text-muted-foreground mt-2">Please generate a storyboard first (Step 2).</p>
              <button onClick={() => goToStep('storyboard')} className="text-primary hover:underline mt-4">
                Go to Storyboard →
              </button>
            </div>
          )}

          {project.currentStep === 'scene_videos' && storyboard && (
            <Step5SceneVideos
              storyboard={storyboard}
              onUpdateStoryboard={handleUpdateStoryboard}
              onNext={goNext}
              onPrev={goPrev}
            />
          )}
          {project.currentStep === 'scene_videos' && !storyboard && (
            <div className="text-center py-12">
              <p className="text-xl font-medium text-foreground">📹 Video Generation</p>
              <p className="text-muted-foreground mt-2">Please generate a storyboard first (Step 2).</p>
              <button onClick={() => goToStep('storyboard')} className="text-primary hover:underline mt-4">
                Go to Storyboard →
              </button>
            </div>
          )}

          {project.currentStep === 'voiceover_assembly' && storyboard && (
            <Step6VoiceAssembly
              storyboard={storyboard}
              avatar={avatar}
              onUpdateStoryboard={handleUpdateStoryboard}
              onPrev={goPrev}
            />
          )}
          {project.currentStep === 'voiceover_assembly' && !storyboard && (
            <div className="text-center py-12">
              <p className="text-xl font-medium text-foreground">🎙️ Voiceover & Assembly</p>
              <p className="text-muted-foreground mt-2">Please complete previous steps first.</p>
              <button onClick={() => goToStep('scene_images')} className="text-primary hover:underline mt-4">
                ← Back to Scene Images
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}