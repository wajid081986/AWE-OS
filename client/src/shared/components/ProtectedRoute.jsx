import { Navigate } from 'react-router-dom'
import { useAuth } from '../../modules/auth/context/AuthContext'

function Spinner() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, isLoading, user, role } = useAuth()

  if (isLoading) return <Spinner />
  if (!isAuthenticated) return <Navigate to="/login" replace />

  if (requiredRole === 'admin') {
    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL
    const isAdmin    = role === 'admin' || user?.email === adminEmail
    if (!isAdmin) return <Navigate to="/dashboard" replace />
  }

  return children
}
