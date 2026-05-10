/* ─── Storyboard AI Prompt Builder ─── */
/* Builds prompts for the KIE Chat API to generate storyboards and analyze products */

import type { ProductInput, ProductFeatures, Storyboard, Scene } from './studioTypes'

export const PRODUCT_ANALYSIS_SYSTEM_PROMPT = `You are an expert e-commerce product analyst specializing in TikTok product videos. Analyze the provided product photos and description to extract detailed product features, brand positioning, and content strategy insights.

IMPORTANT: Return ONLY valid JSON. No markdown, no code blocks, no extra text.

Return your analysis as a JSON object with these fields:
{
  "colors": ["list of dominant colors seen in photos"],
  "materials": ["list of materials visible or mentioned"],
  "style": "one-line style description",
  "keyFeatures": ["list of 3-6 key product features"],
  "suggestedAngles": ["3-5 camera angle suggestions for video"],
  "moodKeywords": ["5-8 mood/emotion keywords for content tone"],
  "targetAudience": "specific target audience description",
  "pricePositioning": "budget/mid-range/premium/luxury",
  "rawAnalysisText": "2-3 paragraph detailed analysis"
}

Be specific and detailed. Focus on what would make this product compelling in a short TikTok video.`

export const STORYBOARD_SYSTEM_PROMPT = `You are a professional TikTok product video scriptwriter and director. Create engaging, viral-worthy video storyboards that drive sales and engagement.

Your storyboards must:
1. Hook viewers in the first 2 seconds
2. Show the product in action (not just static shots)
3. Include clear, natural voiceover text (conversational, not robotic)
4. Use specific, detailed visual prompts for AI image generation
5. End with a strong CTA (call-to-action)
6. Match the mood and tone from the product analysis
7. Be optimized for TikTok's 9:16 vertical format

IMPORTANT: Return ONLY valid JSON. No markdown, no code blocks, no extra text.`

export function buildProductAnalysisPrompt(product: ProductInput): string {
  let prompt = `Analyze this product for TikTok video content creation:\n\n`
  prompt += `Product Name: ${product.name}\n`
  if (product.description) prompt += `Description: ${product.description}\n`
  if (product.category) prompt += `Category: ${product.category}\n`
  prompt += `\nPhotos provided: ${product.photos.length}\n`
  if (product.targetPlatform) prompt += `Target Platform: ${product.targetPlatform}\n`
  prompt += `\nPlease provide a detailed product analysis as JSON.`
  return prompt
}

export function buildProductAnalysisMessages(product: ProductInput): { role: string; content: any[] }[] {
  const messages: { role: string; content: any[] }[] = [
    {
      role: 'user',
      content: [
        { type: 'text', text: buildProductAnalysisPrompt(product) },
        // Add product photos as image_url references
        ...product.photos
          .filter(p => p.kieFileUrl)
          .map(p => ({
            type: 'image_url',
            image_url: { url: p.kieFileUrl! },
          })),
      ],
    },
  ]
  return messages
}

export function buildStoryboardPrompt(
  product: ProductInput,
  features: ProductFeatures,
  options: {
    totalDuration?: number
    sceneCount?: number
    aspectRatio?: string
    previousStyle?: string
  } = {},
): string {
  const duration = options.totalDuration || 60
  const sceneCount = options.sceneCount || Math.max(4, Math.min(8, Math.floor(duration / 10)))
  const aspectRatio = options.aspectRatio || '9:16'

  let prompt = `Create a ${duration}-second TikTok product video storyboard in JSON format.\n\n`
  prompt += `## Product Information\n`
  prompt += `- Name: ${product.name}\n`
  if (product.description) prompt += `- Description: ${product.description}\n`
  prompt += `- Category: ${product.category || 'general'}\n`
  prompt += `- Key Features: ${features.keyFeatures.join(', ')}\n`
  prompt += `- Target Audience: ${features.targetAudience}\n`
  prompt += `- Price Positioning: ${features.pricePositioning}\n`
  prompt += `- Mood/Style: ${features.moodKeywords.join(', ')}\n`
  prompt += `- Suggested Angles: ${features.suggestedAngles.join(', ')}\n`
  if (options.previousStyle) prompt += `- Style Reference: ${options.previousStyle}\n`

  prompt += `\n## Requirements\n`
  prompt += `- Target platform: TikTok (${aspectRatio} vertical video)\n`
  prompt += `- Number of scenes: ${sceneCount}\n`
  prompt += `- Total duration: ~${duration} seconds\n`
  prompt += `- Each scene: 5-15 seconds\n`
  prompt += `- Voiceover text: Conversational, natural, no robotic tone\n`
  prompt += `- Visual prompts: Detailed enough for AI image generation (composition, lighting, mood, style)\n`
  prompt += `- Include: 1 hook scene, 1-2 feature scenes, 1 social proof, 1 CTA\n`

  prompt += `\n## Output Format\n`
  prompt += `Return a valid JSON object:\n`
  prompt += `{\n`
  prompt += `  "title": "string",\n`
  prompt += `  "description": "string",\n`
  prompt += `  "totalDuration": number,\n`
  prompt += `  "scenes": [\n`
  prompt += `    {\n`
  prompt += `      "number": number,\n`
  prompt += `      "title": "Scene name with purpose",\n`
  prompt += `      "description": "What happens in this scene",\n`
  prompt += `      "voiceoverText": "Exact voiceover, 15-40 words, conversational",\n`
  prompt += `      "visualPrompt": "Detailed prompt for AI: composition, lighting, mood, colors, style",\n`
  prompt += `      "visualPromptNegative": "What to avoid in generation",\n`
  prompt += `      "duration": number,\n`
  prompt += `      "transitionIn": "fade|cut|slide|zoom",\n`
  prompt += `      "transitionOut": "fade|cut|slide|zoom",\n`
  prompt += `      "textOverlay": "Short text to display or null",\n`
  prompt += `      "textPosition": "top|center|bottom",\n`
  prompt += `      "textAnimation": "pop|fade|slide|typewriter",\n`
  prompt += `      "backgroundMusicMood": "Mood descriptor"\n`
  prompt += `    }\n`
  prompt += `  ]\n`
  prompt += `}\n`

  return prompt
}

export function parseStoryboardResponse(response: string, projectId: string, productFeatures: ProductFeatures, model: string, prompt: string): Storyboard {
  // Try to extract JSON from the response (may be wrapped in markdown code blocks)
  let jsonStr = response.trim()

  // Remove markdown code blocks if present
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim()
  }

  // Try to find JSON object
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    jsonStr = jsonMatch[0]
  }

  const parsed = JSON.parse(jsonStr)

  const scenes: Scene[] = (parsed.scenes || []).map((s: any, i: number) => ({
    number: s.number || i + 1,
    title: s.title || `Scene ${i + 1}`,
    description: s.description || '',
    voiceoverText: s.voiceoverText || '',
    visualPrompt: s.visualPrompt || '',
    visualPromptNegative: s.visualPromptNegative || '',
    duration: s.duration || 8,
    transitionIn: s.transitionIn || 'cut',
    transitionOut: s.transitionOut || 'cut',
    textOverlay: s.textOverlay || undefined,
    textPosition: s.textPosition || 'center',
    textAnimation: s.textAnimation || 'pop',
    backgroundMusicMood: s.backgroundMusicMood || undefined,
    soundEffectHint: undefined,
    imageStatus: 'pending' as const,
    videoStatus: 'pending' as const,
    voiceoverStatus: 'pending' as const,
  }))

  return {
    id: `sb_${Date.now()}`,
    projectId,
    title: parsed.title || 'Untitled Storyboard',
    description: parsed.description || '',
    totalDuration: parsed.totalDuration || scenes.reduce((sum: number, s: Scene) => sum + s.duration, 0),
    aspectRatio: '9:16',
    resolution: '1080p',
    scenes,
    model,
    prompt,
    productFeatures,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function parseProductFeatures(response: string): ProductFeatures {
  let jsonStr = response.trim()

  // Strip markdown code blocks aggressively
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) jsonStr = codeBlockMatch[1].trim()

  // Find the outermost JSON object — handle text before/after
  const firstBrace = jsonStr.indexOf('{')
  const lastBrace = jsonStr.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    jsonStr = jsonStr.slice(firstBrace, lastBrace + 1)
  }

  // Strip trailing commas before } or ]
  jsonStr = jsonStr.replace(/,\s*(\}|\])/g, '$1')

  try {
    const parsed = JSON.parse(jsonStr)
    return {
      colors: Array.isArray(parsed.colors) ? parsed.colors : [],
      materials: Array.isArray(parsed.materials) ? parsed.materials : [],
      style: typeof parsed.style === 'string' ? parsed.style : '',
      keyFeatures: Array.isArray(parsed.keyFeatures) ? parsed.keyFeatures : [],
      suggestedAngles: Array.isArray(parsed.suggestedAngles) ? parsed.suggestedAngles : [],
      moodKeywords: Array.isArray(parsed.moodKeywords) ? parsed.moodKeywords : [],
      targetAudience: typeof parsed.targetAudience === 'string' ? parsed.targetAudience : '',
      pricePositioning: typeof parsed.pricePositioning === 'string' ? parsed.pricePositioning : 'mid-range',
      // rawAnalysisText: only keep raw response if parsing failed (empty key fields)
      ...(Array.isArray(parsed.keyFeatures) && parsed.keyFeatures.length === 0 ? { rawAnalysisText: response } : {}),
    }
  } catch {
    console.warn('parseProductFeatures failed — raw response stored in rawAnalysisText')
    return {
      colors: [],
      materials: [],
      style: '',
      keyFeatures: [],
      suggestedAngles: [],
      moodKeywords: [],
      targetAudience: '',
      pricePositioning: 'mid-range',
      rawAnalysisText: response,
    }
  }
}