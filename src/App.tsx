import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Layout } from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import VideoGenerator from './pages/VideoGenerator'
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
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/video-generator" element={<VideoGenerator />} />
            <Route path="/image-generator" element={<ImageGenerator />} />
            <Route path="/storyboard" element={<Storyboard />} />
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
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
