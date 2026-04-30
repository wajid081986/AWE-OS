import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AuthModal from '../../../components/AuthModal'

const TOKEN_KEY = 'awe_token'

export default function LoginPage() {
  const { isAuthenticated, isLoading, updateUser } = useAuth()
  const navigate   = useNavigate()
  const [showModal, setShowModal] = useState(true)

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const handleSuccess = (authUser) => {
    if (authUser?.token) localStorage.setItem(TOKEN_KEY, authUser.token)
    updateUser(authUser)
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      {showModal ? (
        <AuthModal
          onSuccess={handleSuccess}
          onClose={() => setShowModal(false)}
        />
      ) : (
        <div className="text-center space-y-4">
          <p className="text-gray-400">Sign in to access your dashboard</p>
          <button
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white
              px-6 py-3 rounded-xl font-semibold transition-all duration-150"
          >
            Sign In
          </button>
          <p className="text-gray-500 text-sm">
            or{' '}
            <a href="/tools/resume" className="text-indigo-400 hover:text-indigo-300">
              use Resume Builder as guest →
            </a>
          </p>
        </div>
      )}
    </div>
  )
}
