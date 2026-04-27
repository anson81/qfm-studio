import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { toast } from 'sonner'
import { UserPlus } from 'lucide-react'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) { toast.error(error.message) }
    else { toast.success('Account created!'); navigate('/login') }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-primary text-white flex items-center justify-center font-bold text-2xl mx-auto">Q</div>
          <h1 className="text-2xl font-bold">Create account</h1>
          <p className="text-muted-foreground">Start generating AI content</p>
        </div>
        <form onSubmit={handleRegister} className="space-y-4">
          <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <Input type="password" placeholder="Password (min 6 chars)" value={password} onChange={e => setPassword(e.target.value)} required />
          <Button type="submit" className="w-full" disabled={loading}>
            <UserPlus className="w-4 h-4 mr-2" />{loading ? 'Creating...' : 'Create Account'}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">Already have an account? <Link to="/login" className="text-primary font-medium">Sign in</Link></p>
      </div>
    </div>
  )
}
