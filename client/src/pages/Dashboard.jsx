import { Navigate } from 'react-router-dom'
import UserDashboard from '../components/dashboard/UserDashboard'

export default function Dashboard() {
  const token      = localStorage.getItem('awe_token')
  const user       = JSON.parse(localStorage.getItem('awe_user') || '{}')
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL

  if (!token) return <Navigate to="/" replace />

  return (
    <div className="min-h-screen bg-gray-900">
      {user.email === adminEmail && (
        <div className="bg-purple-900/30 border-b border-purple-700 px-6 py-2 flex justify-between items-center">
          <span className="text-purple-300 text-sm">
            👑 Admin Mode
          </span>
          <a
            href="/admin"
            className="text-purple-400 hover:text-purple-200 text-sm font-medium"
          >
            Go to Admin Panel →
          </a>
        </div>
      )}
      <UserDashboard />
    </div>
  )
}
