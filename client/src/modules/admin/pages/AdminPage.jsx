import { Navigate } from 'react-router-dom'
import { useAuth } from '../../auth/context/AuthContext'
import AdminDashboard from '../../../components/admin/AdminDashboard'

function Spinner() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function AdminPage() {
  const { isAuthenticated, isLoading, user, role } = useAuth()
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL

  if (isLoading) return <Spinner />
  if (!isAuthenticated) return <Navigate to="/login" replace />

  const isAdmin = role === 'admin' || user?.email === adminEmail
  if (!isAdmin) return <Navigate to="/dashboard" replace />

  return (
    <div className="min-h-screen bg-gray-900">
      <AdminDashboard />
    </div>
  )
}
