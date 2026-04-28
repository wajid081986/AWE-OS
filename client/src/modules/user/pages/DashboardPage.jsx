import { Navigate } from 'react-router-dom'
import UserDashboard from '../../../components/dashboard/UserDashboard'

export default function DashboardPage() {
  const token = localStorage.getItem('awe_token')

  if (!token) return <Navigate to="/login" replace />

  return (
    <div className="min-h-screen bg-gray-900">
      <UserDashboard />
    </div>
  )
}
