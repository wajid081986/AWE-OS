import { Navigate } from 'react-router-dom'
import UserDashboard from '../components/dashboard/UserDashboard'

export default function Dashboard() {
  const token = localStorage.getItem('awe_token')
  const user = JSON.parse(localStorage.getItem('awe_user') || '{}')
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL

  const isAdmin = user.email === adminEmail

  // 🔐 Not logged in → show login UI
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Welcome to AWE-OS</h1>
          <p className="text-gray-400">Login to continue</p>

          <button
            onClick={() => {
              localStorage.setItem('awe_token', 'demo-token')
              localStorage.setItem(
                'awe_user',
                JSON.stringify({ email: 'wajid081986@gmail.com' })
              )
              window.location.reload()
            }}
            className="bg-blue-600 px-6 py-2 rounded-lg"
          >
            Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      
      {/* Admin Bar */}
      {isAdmin && (
        <div className="bg-purple-900/30 border-b border-purple-700 px-6 py-2 flex justify-between items-center">
          <span className="text-purple-300 text-sm">👑 Admin Mode</span>
          <a href="/admin" className="text-purple-400 hover:text-purple-200 text-sm">
            Go to Admin →
          </a>
        </div>
      )}

      {/* USER DASHBOARD ONLY */}
      <UserDashboard />
    </div>
  )
}