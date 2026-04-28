import { Navigate } from 'react-router-dom'
import AdminDashboard from '../components/admin/AdminDashboard'

export default function Admin() {
  const token      = localStorage.getItem('awe_token')
  const user       = JSON.parse(localStorage.getItem('awe_user') || '{}')
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL

  if (!token)
    return <Navigate to="/" replace />
  if (user.email !== adminEmail)
    return <Navigate to="/dashboard" replace />

  return (
    <AdminDashboard />
  )
}
