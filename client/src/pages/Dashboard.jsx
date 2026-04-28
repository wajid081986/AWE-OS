import { Navigate } from 'react-router-dom'
import UserDashboard from '../components/dashboard/UserDashboard'

export default function Dashboard() {
  const token = localStorage.getItem('awe_token')

  // 👇 IMPORTANT: allow guest access
  if (!token) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-white text-2xl mb-4">Welcome to AWE-OS</h1>
          
          <a
            href="/login"
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg"
          >
            Login / Sign Up
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <UserDashboard />
    </div>
  )
}