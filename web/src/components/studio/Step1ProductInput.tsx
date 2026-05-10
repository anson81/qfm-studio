/* ─── Step 1: Product Input ─── */
/* Upload product photos, describe product, analyze with AI */

import { useState, useCallback, useRef } from 'react'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { toast } from 'sonner'
import { Upload, X, Sparkles, Loader2, Image, Info, ChevronRight } from 'lucide-react'
import type { ProductInput, ProductPhoto, ProductFeatures } from '../../lib/studioTypes'
import { uploadFileToKIE, kieChat, type ChatMessage, getKIEKey } from '../../lib/studioApi'
import { PRODUCT_ANALYSIS_SYSTEM_PROMPT, buildProductAnalysisMessages, parseProductFeatures } from '../../lib/storyboardAi'
import { generateId } from '../../lib/studioStorage'

interface Step1Props {
  product: ProductInput
  onUpdate: (product: ProductInput) => void
  onNext: () => void
}

export default function Step1ProductInput({ product, onUpdate, onNext }: Step1Props) {
  const [analyzing, setAnalyzing] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Ref to always get latest product state inside async loops.
  // React batches updates, so closures capture stale state. The ref is updated
  // every render, so it always has the latest product including user edits
  // (like typing a product name while photos are uploading).
  const productRef = useRef(product)
  productRef.current = product

  // ─── Photo handling ───

  const addPhotos = useCallback(async (files: FileList | File[]) => {
    // Check KIE key FIRST to avoid silent failures
    if (!getKIEKey()) {
      toast.error('KIE.AI key required. Go to Settings → API Keys to add your key.')
      return
    }

    const fileArray = Array.from(files)
    // Use productRef.current to always get latest state (not stale closure).
    // This prevents overwriting user edits (name, description) made during upload.
    const currentPhotos = [...productRef.current.photos]
    const newPhotos: ProductPhoto[] = []

    // Validate files and create local previews
    for (const file of fileArray) {
      if (currentPhotos.length + newPhotos.length >= 10) {
        toast.error('Maximum 10 photos allowed')
        break
      }
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`)
        continue
      }
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 20 MB)`)
        continue
      }

      const id = generateId()
      let localPreview = ''
      try {
        localPreview = await readFileAsDataURL(file)
      } catch (e) {
        toast.error(`Failed to read ${file.name}`)
        continue
      }

      newPhotos.push({
        id,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        localPreview,
        uploadStatus: 'uploading' as const,
      })
    }

    if (newPhotos.length === 0) return

    // Add ALL new photos to UI immediately (status: uploading)
    // Use productRef.current (latest state) as the base — not the closure's product
    const allPhotos = [...currentPhotos, ...newPhotos]
    onUpdate({ ...productRef.current, photos: allPhotos })

    // Upload each photo SEQUENTIALLY.
    // Key insight: we track upload status in our LOCAL allPhotos array.
    // We NEVER read productRef.current.photos during the loop because
    // React might not have flushed the previous onUpdate yet (batched updates).
    // Instead, each successful/failed upload updates allPhotos directly,
    // then pushes a fresh copy to React via onUpdate.
    for (let i = 0; i < newPhotos.length; i++) {
      const photo = newPhotos[i]
      const file = fileArray.find(f => f.name === photo.fileName)!

      try {
        const result = await uploadFileToKIE(file)
        // Mark this photo as done in our local array
        const idx = allPhotos.findIndex(p => p.id === photo.id)
        if (idx >= 0) {
          allPhotos[idx] = { ...allPhotos[idx], uploadStatus: 'done', kieFileUrl: result.fileUrl }
        }
      } catch (err: any) {
        // Mark this photo as failed in our local array
        const idx = allPhotos.findIndex(p => p.id === photo.id)
        if (idx >= 0) {
          allPhotos[idx] = { ...allPhotos[idx], uploadStatus: 'failed' }
        }
        toast.error(`Failed to upload ${photo.fileName}: ${err.message}`)
      }

      // Push current state to React after each photo.
      // Use productRef.current as base to preserve any user edits made during upload.
      onUpdate({ ...productRef.current, photos: [...allPhotos] })
    }
  }, [product, onUpdate])

  const removePhoto = (id: string) => {
    onUpdate({ ...product, photos: product.photos.filter(p => p.id !== id) })
  }

  // ─── Drag & drop ───

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    if (e.dataTransfer.files.length) {
      addPhotos(e.dataTransfer.files)
    }
  }

  // ─── AI Analysis ───

  const analyzeProduct = async () => {
    if (product.photos.length === 0 && !product.description) {
      toast.error('Please add at least one photo or description')
      return
    }

    const hasUploadedPhotos = product.photos.some(p => p.kieFileUrl)
    const allFailed = product.photos.length > 0 && product.photos.every(p => p.uploadStatus === 'failed')
    if (allFailed) {
      toast.error('All uploads failed — check your KIE.AI key in Settings, then remove and re-add photos')
      return
    }
    if (!hasUploadedPhotos && !product.description) {
      toast.error('Photos still uploading — wait for green ✓, or add a text description')
      return
    }

    setAnalyzing(true)
    try {
      const systemMessage: ChatMessage = { role: 'system', content: PRODUCT_ANALYSIS_SYSTEM_PROMPT }
      const userMessages = buildProductAnalysisMessages(product)
      const messages: ChatMessage[] = [systemMessage, ...userMessages as ChatMessage[]]

      const response = await kieChat(messages, 'claude-sonnet-4-5')
      const features = parseProductFeatures(response)

      onUpdate({ ...product, extractedFeatures: features })
      toast.success('Product analysis complete!')
    } catch (err: any) {
      toast.error(`Analysis failed: ${err.message}`)
    } finally {
      setAnalyzing(false)
    }
  }

  // ─── Validation ───

  const canProceed = product.photos.length > 0 && product.name.trim().length > 0
  const allUploaded = product.photos.every(p => p.uploadStatus === 'done')
  const hasFailedUploads = product.photos.some(p => p.uploadStatus === 'failed')
  const hasUploading = product.photos.some(p => p.uploadStatus === 'uploading')
  const allDoneOrFailed = product.photos.every(p => p.uploadStatus === 'done' || p.uploadStatus === 'failed')

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ─── Header ─── */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">📦 Product Input</h2>
        <p className="text-muted-foreground mt-1">Upload product photos and describe what you're selling. AI will extract features for your video.</p>
      </div>

      {/* ─── Product Name & Description ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Product Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Product Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={product.name}
              onChange={e => onUpdate({ ...product, name: e.target.value })}
              placeholder="e.g., Premium Silk Sleep Mask"
              className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Description <span className="text-muted-foreground text-xs">(helps AI understand your product better)</span>
            </label>
            <textarea
              value={product.description || ''}
              onChange={e => onUpdate({ ...product, description: e.target.value })}
              placeholder="Describe your product — what makes it special, key selling points, target audience..."
              rows={3}
              className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Category</label>
              <select
                value={product.category || ''}
                onChange={e => onUpdate({ ...product, category: e.target.value })}
                className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select category</option>
                <option value="beauty">Beauty & Skincare</option>
                <option value="fashion">Fashion & Clothing</option>
                <option value="electronics">Electronics & Gadgets</option>
                <option value="home">Home & Living</option>
                <option value="food">Food & Beverage</option>
                <option value="health">Health & Wellness</option>
                <option value="fitness">Fitness & Sports</option>
                <option value="kids">Kids & Baby</option>
                <option value="pets">Pets</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Platform</label>
              <select
                value={product.targetPlatform}
                onChange={e => onUpdate({ ...product, targetPlatform: e.target.value as any })}
                className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="tiktok">TikTok (9:16)</option>
                <option value="instagram">Instagram Reels (9:16)</option>
                <option value="youtube_shorts">YouTube Shorts (9:16)</option>
                <option value="generic">Generic (9:16)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Photo Upload ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Image className="w-5 h-5" />
            Product Photos
            <span className="text-muted-foreground text-sm font-normal">({product.photos.length}/10)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
              dragOver
                ? 'border-primary bg-primary/5 scale-[1.02]'
                : 'border-border hover:border-primary/50 hover:bg-muted/30'
            }`}
          >
            <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-foreground font-medium">
              {dragOver ? 'Drop photos here' : 'Drag & drop photos or click to browse'}
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              PNG, JPG, WebP • Max 20MB each • Up to 10 photos
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={e => {
                if (e.target.files && e.target.files.length > 0) {
                  addPhotos(e.target.files)
                }
                // Reset input so selecting the same files again triggers onChange
                e.target.value = ''
              }}
              className="hidden"
            />
          </div>

          {/* Photo grid */}
          {product.photos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {product.photos.map(photo => (
                <div key={photo.id} className="relative group rounded-lg overflow-hidden border border-border bg-muted/30 aspect-square">
                  {photo.localPreview && (
                    <img
                      src={photo.localPreview}
                      alt={photo.fileName}
                      className="w-full h-full object-cover"
                    />
                  )}
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
                    <button
                      onClick={(e) => { e.stopPropagation(); removePhoto(photo.id) }}
                      className="opacity-0 group-hover:opacity-100 bg-destructive text-white rounded-full p-1.5 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {/* Upload status */}
                  {photo.uploadStatus === 'uploading' && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    </div>
                  )}
                  {photo.uploadStatus === 'failed' && (
                    <div className="absolute bottom-0 inset-x-0 bg-destructive/90 text-white text-xs text-center py-1">
                      Upload failed
                    </div>
                  )}
                  {photo.uploadStatus === 'done' && (
                    <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">✓</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ─── Upload status info ─── */}
          {product.photos.length > 0 && (
            <div className="text-sm">
              {hasFailedUploads ? (
                <p className="text-red-600 flex items-center gap-1 font-medium">
                  <span>❌</span> Upload failed — check your KIE key in Settings, then remove and re-add photos
                </p>
              ) : allUploaded ? (
                <p className="text-green-600 flex items-center gap-1 font-medium">
                  <span>✅</span> All photos uploaded — ready to analyze
                </p>
              ) : (
                <p className="text-accent flex items-center gap-1">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading to storage... Wait for ✓ before analyzing
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── AI Analysis ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            AI Product Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <Info className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              AI will analyze your product photos and description to extract key features, colors, materials, mood, target audience, and optimal camera angles. This drives the storyboard generation.
            </p>
          </div>

          <Button
            onClick={analyzeProduct}
            disabled={analyzing || (product.photos.length === 0 && !product.description)}
            className="w-full"
          >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing product...
                </>
              ) : product.extractedFeatures ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Re-analyze Product
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analyze Product with AI
                </>
              )}
          </Button>

          {/* Analysis results */}
          {product.extractedFeatures && (
            <div className="space-y-3 mt-4 p-4 rounded-lg bg-muted/30 border border-border">
              <h4 className="font-medium text-foreground">Analysis Results</h4>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Style:</span>{' '}
                  <span className="text-foreground font-medium">{product.extractedFeatures.style}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Audience:</span>{' '}
                  <span className="text-foreground font-medium">{product.extractedFeatures.targetAudience}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Positioning:</span>{' '}
                  <span className="text-foreground font-medium capitalize">{product.extractedFeatures.pricePositioning}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Colors:</span>{' '}
                  <span className="text-foreground font-medium">{product.extractedFeatures.colors.join(', ')}</span>
                </div>
              </div>

              {product.extractedFeatures.keyFeatures.length > 0 && (
                <div>
                  <span className="text-muted-foreground text-sm">Key Features:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {product.extractedFeatures.keyFeatures.map((f, i) => (
                      <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {product.extractedFeatures.moodKeywords.length > 0 && (
                <div>
                  <span className="text-muted-foreground text-sm">Mood:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {product.extractedFeatures.moodKeywords.map((m, i) => (
                      <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent border border-accent/20">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Show raw response when analysis is empty or for debugging */}
              {(product.extractedFeatures.rawAnalysisText || product.extractedFeatures.keyFeatures.length === 0) && (
                <div className="mt-3 p-3 rounded bg-yellow-50 border border-yellow-200">
                  <p className="text-xs font-semibold text-yellow-800 mb-1">⚠️ AI response (for debugging):</p>
                  <pre className="text-xs text-yellow-900 whitespace-pre-wrap overflow-auto max-h-40">
                    {product.extractedFeatures.rawAnalysisText || 'No raw response captured'}
                  </pre>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Next Step ─── */}
      <div className="flex justify-end">
        <Button
          onClick={onNext}
          disabled={!canProceed}
          size="lg"
        >
          Next: Generate Storyboard
          <ChevronRight className="w-5 h-5 ml-1" />
        </Button>
      </div>
    </div>
  )
}

// ─── Utility ───

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}