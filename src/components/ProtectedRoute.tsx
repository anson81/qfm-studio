import { Navigate, Outlet } from 'react-router-dom'
import { getCurrentUser } from '../lib/supabase'
import { useEffect, useState } from 'react'

export default function ProtectedRoute() {
  const [user, setUser] = useState<any>(undefined)
  useEffect(() => { getCurrentUser().then(setUser) }, [])
  if (user === undefined) return <div className="flex items-center justify-center h-screen">Loading...</div>
  return user ? <Outlet /> : <Navigate to="/login" />
}
