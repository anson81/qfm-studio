import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Layout } from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import VideoGenerator from './pages/VideoGenerator'
import VideoModelPage from './pages/VideoModelPage'
import type { VideoModelConfig } from './pages/VideoModelPage'
import ImageGenerator from './pages/ImageGenerator'
import Storyboard from './pages/Storyboard'
import FilmMaker from './pages/FilmMaker'
import UGCGenerator from './pages/UGCGenerator'
import ContentLibrary from './pages/ContentLibrary'
import AIAssistant from './pages/AIAssistant'
import CaptionGenerator from './pages/CaptionGenerator'
import HookGenerator from './pages/HookGenerator'
import HashtagGenerator from './pages/HashtagGenerator'
import ContentPlanner from './pages/ContentPlanner'
import AutoPostBot from './pages/AutoPostBot'
import CampaignManager from './pages/CampaignManager'
import KPIAnalytics from './pages/KPIAnalytics'
import MarketSpy from './pages/MarketSpy'
import TrendForecaster from './pages/TrendForecaster'
import VideoEditor from './pages/VideoEditor'
import ImageEditor from './pages/ImageEditor'
import AIGirlGenerator from './pages/AIGirlGenerator'
import AIGirlGallery from './pages/AIGirlGallery'
import AIGirlOutfitSwap from './pages/AIGirlOutfitSwap'
import Settings from './pages/Settings'
import Magic5 from './pages/Magic5'
import ChatPage from './pages/ChatPage'
import AnalyticsPage from './pages/AnalyticsPage'
import Tutorials from './pages/Tutorials'
import VoiceGenerator from './pages/VoiceGenerator'
import Music from './pages/Music'
import Avatar from './pages/Avatar'
import VideoAnalyzer from './pages/VideoAnalyzer'
import TikTokStudio from './pages/TikTokStudio'
import ProtectedRoute from './components/ProtectedRoute'

const videoModelConfigs: Record<string, VideoModelConfig> = {
  kling: {
    id: 'kling-2.5-turbo',
    name: 'Kling 3.0',
    endpoint: '/api/v1/veo/generate',
    defaultAspect: '9:16',
    maxDuration: 10,
    description: 'Kuaishou Kling 3.0 — high-quality motion and text rendering',
    credits: '~25',
  },
  wan: {
    id: 'wan-2.7',
    name: 'Wan 2.7',
    endpoint: '/api/v1/veo/generate',
    defaultAspect: '16:9',
    maxDuration: 8,
    description: 'Alibaba Wan 2.7 — fast and versatile video generation',
    credits: '~20',
  },
  grok: {
    id: 'grok-video',
    name: 'Grok',
    endpoint: '/api/v1/veo/generate',
    defaultAspect: '9:16',
    maxDuration: 8,
    description: 'xAI Grok Video — creative AI video generation',
    credits: '~25',
  },
  sora2: {
    id: 'sora-2-pro',
    name: 'Sora 2 Pro',
    endpoint: '/api/v1/veo/generate',
    defaultAspect: '16:9',
    maxDuration: 10,
    description: 'OpenAI Sora 2 Pro — cinematic quality video generation',
    credits: '~30',
  },
  seedance: {
    id: 'seedance-2.0',
    name: 'Seedance 2.0',
    endpoint: '/api/v1/veo/generate',
    defaultAspect: '9:16',
    maxDuration: 8,
    description: 'ByteDance Seedance 2.0 — smooth dance & motion AI video',
    credits: '~20',
  },
  hailuo: {
    id: 'hailuo-2.3',
    name: 'Hailuo',
    endpoint: '/api/v1/veo/generate',
    defaultAspect: '9:16',
    maxDuration: 8,
    description: 'MiniMax Hailuo — expressive character & motion video',
    credits: '~20',
  },
  runway: {
    id: 'runway',
    name: 'Runway',
    endpoint: '/api/v1/runway/generate',
    defaultAspect: '16:9',
    maxDuration: 10,
    description: 'Runway Gen-3 Alpha — creative control and style',
    credits: '~20',
  },
  veo3: {
    id: 'veo3',
    name: 'Veo 3',
    endpoint: '/api/v1/veo/generate',
    defaultAspect: '16:9',
    maxDuration: 8,
    description: 'Google Veo 3 — best quality, most realistic video generation',
    credits: '~30',
  },
}

function App() {
  return (
    <HashRouter>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/video-generator" element={<VideoGenerator />} />
            <Route path="/video/kling" element={<VideoModelPage config={videoModelConfigs.kling} />} />
            <Route path="/video/wan" element={<VideoModelPage config={videoModelConfigs.wan} />} />
            <Route path="/video/grok" element={<VideoModelPage config={videoModelConfigs.grok} />} />
            <Route path="/video/sora2" element={<VideoModelPage config={videoModelConfigs.sora2} />} />
            <Route path="/video/seedance" element={<VideoModelPage config={videoModelConfigs.seedance} />} />
            <Route path="/video/hailuo" element={<VideoModelPage config={videoModelConfigs.hailuo} />} />
            <Route path="/video/runway" element={<VideoModelPage config={videoModelConfigs.runway} />} />
            <Route path="/video/veo3" element={<VideoModelPage config={videoModelConfigs.veo3} />} />
            <Route path="/image-generator" element={<ImageGenerator />} />
            <Route path="/storyboard" element={<Storyboard />} />
            <Route path="/video-analyzer" element={<VideoAnalyzer />} />
            <Route path="/film-maker" element={<FilmMaker />} />
            <Route path="/ugc" element={<UGCGenerator />} />
            <Route path="/caption-generator" element={<CaptionGenerator />} />
            <Route path="/hook-generator" element={<HookGenerator />} />
            <Route path="/hashtag-generator" element={<HashtagGenerator />} />
            <Route path="/content-planner" element={<ContentPlanner />} />
            <Route path="/auto-post-bot" element={<AutoPostBot />} />
            <Route path="/campaign-manager" element={<CampaignManager />} />
            <Route path="/kpi-analytics" element={<KPIAnalytics />} />
            <Route path="/market-spy" element={<MarketSpy />} />
            <Route path="/trend-forecaster" element={<TrendForecaster />} />
            <Route path="/ai-assistant" element={<AIAssistant />} />
            <Route path="/library" element={<ContentLibrary />} />
            <Route path="/tiktok-studio" element={<TikTokStudio />} />
            <Route path="/video-editor" element={<VideoEditor />} />
            <Route path="/image-editor" element={<ImageEditor />} />
            <Route path="/ai-girl-generator" element={<AIGirlGenerator />} />
            <Route path="/ai-girl-gallery" element={<AIGirlGallery />} />
            <Route path="/ai-girl-outfit-swap" element={<AIGirlOutfitSwap />} />
            <Route path="/magic5" element={<Magic5 />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/tutorials" element={<Tutorials />} />
            <Route path="/voice-generator" element={<VoiceGenerator />} />
            <Route path="/music" element={<Music />} />
            <Route path="/avatar" element={<Avatar />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App