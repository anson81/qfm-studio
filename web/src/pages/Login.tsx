import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiClient, setToken, setUser } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { toast } from 'sonner'
import { Zap, Sparkles } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await apiClient.login(email, password)
      setToken(res.access_token)
      // Fetch user data and store in localStorage
      try {
        const user = await apiClient.me()
        setUser(user)
      } catch {
        // Non-critical: user data will be fetched on Dashboard
      }
      toast.success('Welcome back!')
      navigate('/')
    } catch (err: any) {
      toast.error(err.message || 'Login failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-login-gradient relative overflow-hidden">
      {/* Decorative background pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-400/10 rounded-full blur-3xl" />
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md mx-4 relative z-10">
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/20 p-8">
          {/* Brand */}
          <div className="text-center space-y-4 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-700 flex items-center justify-center shadow-lg shadow-primary/30 mx-auto">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
              <p className="text-muted-foreground mt-1">Sign in to QFM AI Studio</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                <Input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
                <Input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
            </div>

            <div className="flex justify-end">
              <span className="text-sm text-primary opacity-50 cursor-not-allowed" title="Coming Soon">Forgot password?</span>
            </div>

            <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary font-medium hover:text-primary-700 transition-colors">
              Sign up
            </Link>
          </p>

        </div>

        {/* Tagline */}
        <p className="text-center mt-6 text-white/70 text-sm flex items-center justify-center gap-1.5">
          <Sparkles className="w-4 h-4" />
          AI-Powered Content Creation for E-Commerce
        </p>
      </div>
    </div>
  )
}