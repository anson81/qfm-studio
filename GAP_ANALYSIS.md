# QFM Studio vs UGGii Studio — Gap Analysis

## Architecture Differences

| Aspect | UGGii Studio (Reference) | QFM Studio (Current) |
|--------|-------------------------|---------------------|
| **Backend** | Supabase (Postgres + Edge Functions) | FastAPI + SQLite/Postgres |
| **Auth** | Supabase Auth | Custom JWT (FastAPI) |
| **API Key Storage** | Supabase (kie_api_key in user table) | Encrypted in SQLite (AES) |
| **Frontend** | React + Vite | React + Vite + HashRouter |
| **CSS/Theme** | Proper dark/light mode + visible text | White-on-white text issue in BrowserOS |
| **API Proxy** | Supabase Edge Functions proxy KIE.AI | FastAPI backend proxies KIE.AI |
| **Generation** | Works end-to-end | Fails — API call never reaches backend |
| **Hosting** | Vercel/Netlify (likely) | GitHub Pages + Cloudflare Tunnel |

## Generation Flow Comparison

### UGGii Studio (WORKING)
1. User enters prompt → Frontend calls Supabase Edge Function
2. Edge Function calls KIE.AI API with user's key
3. Returns task_id → Frontend polls status
4. When complete → Shows generated image/video

### QFM Studio (BROKEN)
1. User enters prompt → Frontend calls `/api/v1/generate/image`
2. **Bug**: API_BASE resolves to Cloudflare tunnel URL (e.g., `gibson-presently-sussex-learning.trycloudflare.com`)
3. **Bug**: Cloudflare tunnel URL is temporary — changes on restart
4. **Bug**: The browser on BrowserOS gets 405 error when calling API (wrong URL resolution)
5. Even when URL is correct, backend returns "Could not validate credentials" — possible token format issue

## Route Comparison

### UGGii Studio Routes (COMPLETE)
| Route | Feature | Status |
|-------|---------|--------|
| `/dashboard` | Dashboard with stats, KIE credits | ✅ Working |
| `/dashboard/video-generator` | Video Generator (Kling, Wan, Grok, Sora, Seedance, Hailuo) | ✅ Working |
| `/dashboard/kling26` | Kling 3.0 | ✅ Working |
| `/dashboard/wan26` | Wan 2.7 | ✅ Working |
| `/dashboard/grok` | Grok Video | ✅ Working |
| `/dashboard/sora2pro` | Sora 2 Pro | ✅ Working |
| `/dashboard/seedance` | Seedance 2.0 | ✅ Working |
| `/dashboard/hailuo` | Hailuo | ✅ Working |
| `/dashboard/storyboard` | Storyboard creator | ✅ Working |
| `/dashboard/film-maker` | Film Maker | ✅ Working |
| `/dashboard/voice-generator` | Voice over generation | ✅ Working |
| `/dashboard/music` | Music generation | ✅ Working |
| `/dashboard/avatar-lipsync` | Avatar Lip Sync | ✅ Working |
| `/dashboard/affiliate` | Affiliate system | ✅ Working |
| `/dashboard/ugc` | UGC Generator | ✅ Working |
| `/dashboard/image-generator` | Image Generator (Flux, Nano Banana, etc) | ✅ Working |
| `/dashboard/nano-banana` | Nano Banana | ✅ Working |
| `/dashboard/magic-5` | Magic 5 feature | ✅ Working |
| `/dashboard/se2-prompt-gen` | SE2.0 Prompt Generator | ✅ Working |
| `/dashboard/chat` | AI Chat | ✅ Working |
| `/dashboard/analytics` | Analytics dashboard | ✅ Working |
| `/dashboard/library` | Content Library | ✅ Working |
| `/dashboard/tutorials` | Tutorials | ✅ Working |
| `/dashboard/settings` | Settings (Account, API, Billing, Notifications, Security) | ✅ Working |
| `/dashboard/ai-mv` | AI Music Video | ✅ |
| `/dashboard/music-video` | Music Video | ✅ |
| `/dashboard/storyboard-viral-2` | Viral Storyboard v2 | ✅ |
| `/dashboard/storyboard-viral-video` | Viral Storyboard Video | ✅ |
| `/dashboard/viral-repurpose` | Viral Repurpose | ✅ |
| `/dashboard/conversion` | Conversion tracking | ✅ |
| `/dashboard/performance` | Performance metrics | ✅ |
| `/dashboard/aida` | AIDA framework | ✅ |
| `/dashboard/camera-angle` | Camera Angle | ✅ |
| `/dashboard/motion-control` | Motion Control | ✅ |
| `/dashboard/image-to-prompt` | Image to Prompt | ✅ |
| `/dashboard/seedance-prompt` | Seedance Prompt | ✅ |
| `/dashboard/subscription-testing` | Subscription testing | ✅ |

### QFM Studio Routes (INCOMPLETE/BROKEN)
| Route | Feature | Status |
|-------|---------|--------|
| `/` | Dashboard | ⚠️ Shows stats but no KIE connection status |
| `/video-generator` | Video Generator | ❌ Generation fails |
| `/image-generator` | Image Generator | ❌ Generation fails (API 405 error) |
| `/storyboard` | Storyboard | ⚠️ Unknown |
| `/film-maker` | Film Maker | ⚠️ Unknown |
| `/ugc` | UGC Generator | ⚠️ Unknown |
| `/caption-generator` | Caption Generator | ❌ Not in UGGii |
| `/hook-generator` | Hook Generator | ❌ Not in UGGii |
| `/hashtag-generator` | Hashtag Generator | ❌ Not in UGGii |
| `/content-planner` | Content Planner | ❌ Not in UGGii |
| `/auto-post-bot` | Auto Post Bot | ❌ Not in UGGii |
| `/campaign-manager` | Campaign Manager | ❌ Not in UGGii |
| `/kpi-analytics` | KPI Analytics | ❌ Not in UGGii |
| `/market-spy` | Market Spy | ❌ Not in UGGii |
| `/trend-forecaster` | Trend Forecaster | ❌ Not in UGGii |
| `/ai-assistant` | AI Assistant | ❌ Not in UGGii |
| `/library` | Content Library | ⚠️ Probably exists |
| `/video-editor` | Video Editor | ❌ Not in UGGii |
| `/image-editor` | Image Editor | ❌ Not in UGGii |
| `/ai-girl-generator` | AI Girl Generator | ❌ Not in UGGii |
| `/ai-girl-gallery` | AI Girl Gallery | ❌ Not in UGGii |
| `/ai-girl-outfit-swap` | AI Girl Outfit Swap | ❌ Not in UGGii |
| `/magic5` | Magic 5 | ⚠️ Unknown |
| `/chat` | Chat | ⚠️ Unknown |
| `/settings` | Settings | ⚠️ Basic - no tabs like UGGii |
| `/voice-generator` | Voice Generator | ⚠️ Unknown |
| `/music` | Music | ⚠️ Unknown |
| `/avatar` | Avatar/Lip Sync | ⚠️ Unknown |

## Critical Bugs to Fix (Priority Order)

### 🔴 P0 — Generation Completely Broken
1. **API URL resolution**: The frontend uses a temporary Cloudflare tunnel URL that may be unreachable from browsers or expire. Need a persistent HTTPS endpoint.
2. **405 Not Allowed**: Browser gets wrong response from API calls. The API_BASE in the bundled JS is the Cloudflare URL but the browser may be resolving it differently.
3. **Auth token validation**: "Could not validate credentials" — the JWT from login doesn't work for subsequent API calls.

### 🟡 P1 — UI/UX Issues  
4. **White-on-white text**: Boss reports text is invisible. May be CSS dark mode conflict or component-level color override.
5. **Missing settings tabs**: UGGii has Account/API/Billing/Notifications/Security tabs. QFM only has a flat settings page.
6. **No KIE connection status**: UGGii shows "KIE.API Connected + credits" prominently. QFM doesn't.
7. **Credit balance shows 0**: Even with KIE key set, shows Balance: 0.

### 🟢 P2 — Feature Alignment
8. **Missing video models**: UGGii has Kling 3.0, Wan 2.7, Grok, Sora 2 Pro, Seedance 2.0, Hailuo as separate routes. QFM only has a generic VideoGenerator.
9. **Missing Storyboard system**: UGGii has storyboard + viral storyboard + film maker. QFM has generic storyboard.
10. **Missing SE2.0 Prompt Gen**: UGGii has dedicated prompt generator.
11. **Missing Affiliate page**: UGGii has affiliate system.
12. **Missing Avatar Lip Sync**: UGGii supports avatar lip sync.
13. **Extra pages not in UGGii**: Caption Generator, Hook Generator, Hashtag Generator, Content Planner, Auto Post Bot, Campaign Manager, KPI Analytics, Market Spy, Trend Forecaster, AI Assistant, Video Editor, Image Editor, AI Girl Generator/Gallery/Outfit Swap.

## UGGii Studio Feature Details (from screenshots)

### Image Generator
- Tabs: Single Prompt / Batch Prompt (up to 10)
- Prompt field with character counter (e.g., 37/8000)
- Negative Prompt (optional)
- Random Prompt button
- AI Model selector: KIE.AI Flux Kontext Pro (~5-10 credits)
- Style Preset: Cinematic (and more)
- Aspect Ratio: 1:1, 16:9, 9:16 (button group)
- Advanced Options: Number of Images (slider), HD Quality (switch)
- Generated Images section with download/link buttons
- "Images appear instantly • Powered by KIE.AI Flux Kontext Pro"

### Video Generator
- Sub-models: Kling 3.0, Wan 2.7, Grok, Sora 2 Pro, Seedance 2.0, Hailuo
- Each sub-model is a separate route/page

### AI Tools
- Storyboard
- Voice Generator
- Music
- Avatar Lip Sync
- Affiliate
- UGC
- Image Generator
- Nano Banana

### Settings
- 5 tabs: Account, API, Billing, Notifications, Security
- Account: Profile Photo upload, Full Name, Business Name, Email, Change Password, Danger Zone (Delete Account)
- API: KIE.AI key management
- Billing: Credit management
- Notifications: Alert preferences
- Security: 2FA, sessions

### Dashboard
- "Made in Malaysia 🇲🇾" banner
- KIE.API Connected status + credit count
- Stats: Videos Generated, Images Created, Storage Used, API Credits
- Quick action cards: 7+ links
- Recent Activity section
- Strategic Partners section (Bambooinnovasia, CEDAR, UMEC, Uniti Office, TVET MARA, Teknoviq)
- Warning: "Generated content is automatically deleted after 1 hour"

## Next Steps

1. **Fix the API connection** — make the backend accessible via a persistent trusted HTTPS URL
2. **Fix auth flow** — ensure login tokens work for subsequent API calls
3. **Fix white-on-white text** — debug CSS dark/light mode
4. **Rewrite QFM to match UGGii's exact structure** — replace custom pages with UGGii-style pages
5. **Add missing critical features** — Video sub-models, proper Settings tabs, KIE connection status
6. **Remove non-UGGii pages** — Caption Generator, Hook Generator, etc. (or keep as extras)
7. **Replace all UGGii branding** — Replace "UGGii Studio" with "QFM AI Studio"
