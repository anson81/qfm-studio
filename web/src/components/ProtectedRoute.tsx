import { Navigate, Outlet } from 'react-router-dom'
import { getToken } from '../lib/api'

export default function ProtectedRoute() {
  const token = getToken()
  if (!token) return <Navigate to="/login" replace />
  return <Outlet />
}
