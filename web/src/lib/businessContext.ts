// Business Profile Context — provides tailored prompt context for all generation pages
// Loaded from backend settings, falls back to localStorage for offline use

export interface BusinessProfile {
  business_category: string   // e.g. "modest-fashion", "electronics", "food-beverage"
  business_name: string       // e.g. "Queen Fashion Malaysia"
  business_description: string // e.g. "Muslim modest fashion brand on TikTok Shop & Shopee"
  business_region: string     // e.g. "Malaysia", "Indonesia", "Global"
  target_audience: string     // e.g. "25-35 Muslim women"
  selling_platforms: string   // e.g. "TikTok Shop,Shopee,Instagram"
}

const STORAGE_KEY = 'qfm_business_profile'

// Category-specific templates
export const BUSINESS_CATEGORIES = [
  { id: 'modest-fashion', label: 'Muslim Modest Fashion', icon: '🧕', description: 'Hijab, baju kurung, tudung, abaya — modest wear' },
  { id: 'fashion', label: 'Fashion & Apparel', icon: '👗', description: 'General fashion, clothing, accessories' },
  { id: 'beauty', label: 'Beauty & Cosmetics', icon: '💄', description: 'Skincare, makeup, beauty tools' },
  { id: 'food-beverage', label: 'Food & Beverage', icon: '🍜', description: 'Restaurants, snacks, beverages, F&B' },
  { id: 'electronics', label: 'Electronics & Gadgets', icon: '📱', description: 'Phones, accessories, tech products' },
  { id: 'home-living', label: 'Home & Living', icon: '🏠', description: 'Furniture, decor, household items' },
  { id: 'health-wellness', label: 'Health & Wellness', icon: '💪', description: 'Supplements, fitness, wellness products' },
  { id: 'kids-baby', label: 'Kids & Baby', icon: '👶', description: 'Children clothing, toys, baby products' },
  { id: 'pets', label: 'Pets & Animals', icon: '🐾', description: 'Pet food, accessories, grooming' },
  { id: 'automotive', label: 'Automotive', icon: '🚗', description: 'Car accessories, parts, services' },
  { id: 'education', label: 'Education & Courses', icon: '📚', description: 'Online courses, tutoring, books' },
  { id: 'services', label: 'Professional Services', icon: '💼', description: 'Consulting, design, freelance services' },
  { id: 'other', label: 'Other / Custom', icon: '📦', description: 'Something else entirely' },
] as const

// Regions
export const REGIONS = [
  'Malaysia', 'Indonesia', 'Singapore', 'Thailand', 'Philippines', 'Vietnam',
  'Middle East', 'Global', 'United States', 'United Kingdom', 'Europe', 'Australia',
] as const

// Selling platforms
export const PLATFORMS = [
  'TikTok Shop', 'Shopee', 'Lazada', 'Instagram', 'Facebook',
  'Website', 'WhatsApp', 'Etsy', 'Amazon', 'eBay',
] as const

// Get business-specific context for prompts
export function getBusinessContext(profile: BusinessProfile | null): string {
  if (!profile || !profile.business_category) {
    return 'e-commerce and online selling'
  }

  const parts: string[] = []

  // Business name / description
  if (profile.business_name) {
    parts.push(profile.business_name)
  }

  // Category-specific language
  const categoryContexts: Record<string, string> = {
    'modest-fashion': 'Muslim modest fashion (hijab, baju kurung, tudung, abaya)',
    'fashion': 'fashion and apparel',
    'beauty': 'beauty and cosmetics',
    'food-beverage': 'food and beverage (F&B)',
    'electronics': 'electronics and gadgets',
    'home-living': 'home and living products',
    'health-wellness': 'health and wellness products',
    'kids-baby': 'kids and baby products',
    'pets': 'pet products and services',
    'automotive': 'automotive products and services',
    'education': 'education and online courses',
    'services': 'professional services',
    'other': profile.business_description || 'e-commerce',
  }

  parts.push(categoryContexts[profile.business_category] || profile.business_description || 'e-commerce')

  // Description override
  if (profile.business_description) {
    parts.push(profile.business_description)
  }

  // Region
  if (profile.business_region) {
    parts.push(`in ${profile.business_region}`)
  }

  // Target audience
  if (profile.target_audience) {
    parts.push(`targeting ${profile.target_audience}`)
  }

  // Selling platforms
  if (profile.selling_platforms) {
    parts.push(`selling on ${profile.selling_platforms}`)
  }

  return parts.join(', ')
}

// Get tailored prompt prefix (system prompt snippet) based on category
export function getPromptPrefix(profile: BusinessProfile | null): string {
  if (!profile?.business_category) return ''

  const prefixes: Record<string, string> = {
    'modest-fashion': 'fashion marketing specializing in Muslim modest fashion',
    'fashion': 'fashion marketing specializing in apparel and style',
    'beauty': 'beauty marketing specializing in cosmetics and skincare',
    'food-beverage': 'F&B marketing specializing in food and beverage businesses',
    'electronics': 'tech marketing specializing in consumer electronics and gadgets',
    'home-living': 'home & lifestyle marketing specializing in home products',
    'health-wellness': 'wellness marketing specializing in health products and supplements',
    'kids-baby': 'family marketing specializing in kids and baby products',
    'pets': 'pet industry marketing specializing in pet products and services',
    'automotive': 'automotive marketing specializing in car accessories and services',
    'education': 'education marketing specializing in online courses and learning',
    'services': 'professional services marketing',
    'other': 'e-commerce marketing',
  }

  const region = profile.business_region ? ` in ${profile.business_region}` : ''
  const platforms = profile.selling_platforms ? `, selling on ${profile.selling_platforms}` : ''
  const audience = profile.target_audience ? `, targeting ${profile.target_audience}` : ''

  return `${prefixes[profile.business_category] || 'e-commerce marketing'}${region}${platforms}${audience}`
}

// Load business profile from localStorage (sync, for immediate use)
export function loadBusinessProfile(): BusinessProfile | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return null
}

// Save business profile to localStorage (sync, for immediate use)
export function saveBusinessProfile(profile: BusinessProfile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
}

// Placeholder/prompt examples per category
export function getCategoryExamples(category: string): { placeholder: string; example: string } {
  const examples: Record<string, { placeholder: string; example: string }> = {
    'modest-fashion': { placeholder: 'e.g. New hijab collection for Raya...', example: 'New hijab collection just dropped! Perfect for Raya' },
    'fashion': { placeholder: 'e.g. Summer dress collection launch...', example: 'Summer dress collection — 50% off launch sale' },
    'beauty': { placeholder: 'e.g. New skincare serum launch...', example: 'New vitamin C serum — glow up your skin routine' },
    'food-beverage': { placeholder: 'e.g. New menu item promotion...', example: 'New nasi lemak special — limited time offer' },
    'electronics': { placeholder: 'e.g. New phone case collection...', example: 'Premium phone cases — protect in style' },
    'home-living': { placeholder: 'e.g. Home decor sale announcement...', example: 'Minimalist home decor — transform your space' },
    'health-wellness': { placeholder: 'e.g. New supplement launch...', example: 'Daily multivitamin gummies — boost your energy' },
    'kids-baby': { placeholder: 'e.g. Baby clothes new arrival...', example: 'Organic cotton baby clothes — soft & safe' },
    'pets': { placeholder: 'e.g. New pet food brand...', example: 'Grain-free dog food — your pup deserves the best' },
    'automotive': { placeholder: 'e.g. Car accessory promotion...', example: 'LED headlight upgrade — see the difference' },
    'education': { placeholder: 'e.g. Online course launch...', example: 'Learn digital marketing in 30 days — enroll now' },
    'services': { placeholder: 'e.g. Service promotion...', example: 'Professional logo design — elevate your brand' },
    'other': { placeholder: 'e.g. Product/service description...', example: 'Describe your product or service here' },
  }
  return examples[category] || examples['other']
}