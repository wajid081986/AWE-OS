import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const BASE_URL = import.meta.env.VITE_API_URL || 'https://awe-os.onrender.com'
const TOKEN_KEY = 'awe_token'

const input =
  'w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 ' +
  'rounded-lg py-3 px-4 text-sm focus:outline-none focus:border-blue-500 ' +
  'focus:ring-1 focus:ring-blue-500 transition-colors disabled:opacity-50'

const submitBtn =
  'w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 ' +
  'hover:to-blue-700 text-white font-semibold py-3 rounded-lg transition-all ' +
  'duration-150 disabled:opacity-50 disabled:cursor-not-allowed'

// ── Social row ────────────────────────────────────────────────────────────────
function SocialRow({ onToast }) {
  const btn =
    'flex-1 flex items-center justify-center bg-gray-800 border border-gray-700 ' +
    'rounded-full p-3 hover:bg-gray-700 hover:border-gray-600 transition-colors'

  return (
    <>
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-gray-800" />
        <span className="text-gray-500 text-xs">Or continue with</span>
        <div className="flex-1 h-px bg-gray-800" />
      </div>

      <div className="flex gap-3">
        <button onClick={() => onToast('Google login coming soon')} className={btn} aria-label="Google">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.083 17.64 11.775 17.64 9.2z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
        </button>

        <button onClick={() => onToast('Apple login coming soon')} className={btn} aria-label="Apple">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="white">
            <path d="M12.47 0c.073 1.01-.29 2.01-.91 2.74-.63.74-1.6 1.3-2.56 1.22-.1-.96.32-1.97.92-2.67C10.55.55 11.58.03 12.47 0zm3.48 12.96c-.38.87-.56 1.26-1.05 2.03-.68 1.09-1.64 2.45-2.83 2.46-1.06.01-1.33-.68-2.77-.67-1.44.01-1.74.69-2.8.68-1.19-.01-2.1-1.27-2.78-2.36C1.5 13.27.85 10.73 1.6 8.9c.53-1.29 1.71-2.11 2.97-2.13 1.17-.02 1.91.68 2.88.68.96 0 1.55-.7 2.93-.68 1.01.01 2.06.5 2.7 1.38-.24.14-2.27 1.17-2.25 3.5.02 2.77 2.59 3.7 2.62 3.71z"/>
          </svg>
        </button>

        <button onClick={() => onToast('Facebook login coming soon')} className={btn} aria-label="Facebook">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="#1877F2">
            <path d="M18 9a9 9 0 10-10.406 8.892V11.63H5.309V9h2.285V7.017c0-2.255 1.344-3.5 3.4-3.5.984 0 2.014.175 2.014.175V5.9h-1.135c-1.118 0-1.467.694-1.467 1.406V9h2.496l-.399 2.63H10.41v6.262A9.003 9.003 0 0018 9z"/>
          </svg>
        </button>
      </div>
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const { login, updateUser, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab]               = useState('login') // 'login' | 'register' | 'forgot'
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [toast, setToast]           = useState('')

  // Login fields
  const [loginEmail, setLoginEmail]       = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPw, setShowLoginPw]     = useState(false)

  // Register fields
  const [name, setName]                       = useState('')
  const [regEmail, setRegEmail]               = useState('')
  const [regPassword, setRegPassword]         = useState('')
  const [confirmPw, setConfirmPw]             = useState('')
  const [showRegPw, setShowRegPw]             = useState(false)
  const [showConfirmPw, setShowConfirmPw]     = useState(false)

  // Forgot password fields
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent]   = useState(false)

  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate('/dashboard', { replace: true })
  }, [isAuthenticated, isLoading, navigate])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const switchTab = (next) => {
    setTab(next)
    setError('')
    setShowLoginPw(false)
    setShowRegPw(false)
    setShowConfirmPw(false)
    setForgotSent(false)
  }

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(loginEmail, loginPassword)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    if (regPassword !== confirmPw) { setError('Passwords do not match'); return }
    if (regPassword.length < 8)   { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      const res  = await fetch(`${BASE_URL}/api/auth/register`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: regEmail, password: regPassword }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Registration failed')
      localStorage.setItem(TOKEN_KEY, data.token)
      updateUser(data.user)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res  = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: forgotEmail }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to send reset link')
      setForgotSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden">

      {/* Ambient glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
        <div className="w-[500px] h-[500px] bg-blue-600/8 rounded-full blur-3xl" />
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-gray-800 border border-gray-700 text-white text-sm px-5 py-3 rounded-xl shadow-2xl whitespace-nowrap">
          {toast}
        </div>
      )}

      {/* Card */}
      <div className="relative w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">

        {/* Back arrow */}
        <button
          onClick={() => navigate('/')}
          className="absolute top-6 left-6 text-gray-500 hover:text-white transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>

        {/* ── LOGIN ── */}
        {tab === 'login' && (
          <>
            <div className="mb-8 pt-2">
              <h1 className="text-2xl font-bold text-white uppercase tracking-wide mb-3">
                Welcome Back!
              </h1>
              <p className="text-gray-400 text-sm leading-relaxed">
                Today is a new day. It's your day. Sign in to start managing your projects.
              </p>
            </div>

            <form onSubmit={handleLogin} noValidate className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="Email Address"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  disabled={loading}
                  className={input}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showLoginPw ? 'text' : 'password'}
                    placeholder="Password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    disabled={loading}
                    className={`${input} pr-11`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowLoginPw(!showLoginPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {showLoginPw ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end -mt-1">
                <button
                  type="button"
                  onClick={() => switchTab('forgot')}
                  className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button type="submit" disabled={loading} className={submitBtn}>
                {loading ? 'Signing in…' : 'Login'}
              </button>
            </form>

            <p className="text-center text-gray-500 text-sm mt-5">
              Don't have an account?{' '}
              <button
                onClick={() => switchTab('register')}
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                Sign Up
              </button>
            </p>

            <SocialRow onToast={showToast} />
          </>
        )}

        {/* ── REGISTER ── */}
        {tab === 'register' && (
          <>
            <div className="mb-8 pt-2">
              <h1 className="text-2xl font-bold text-white uppercase tracking-wide mb-3">
                Create Account!
              </h1>
              <p className="text-gray-400 text-sm leading-relaxed">
                Join AWE-OS — free to start, no credit card required.
              </p>
            </div>

            <form onSubmit={handleRegister} noValidate className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  className={input}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="Email Address"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                  disabled={loading}
                  className={input}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showRegPw ? 'text' : 'password'}
                    placeholder="Password (min 8 characters)"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                    minLength={8}
                    disabled={loading}
                    className={`${input} pr-11`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowRegPw(!showRegPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {showRegPw ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPw ? 'text' : 'password'}
                    placeholder="Confirm Password"
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    required
                    disabled={loading}
                    className={`${input} pr-11`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirmPw(!showConfirmPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {showConfirmPw ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button type="submit" disabled={loading} className={submitBtn}>
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
            </form>

            <p className="text-center text-gray-500 text-sm mt-5">
              Already have an account?{' '}
              <button
                onClick={() => switchTab('login')}
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                Sign In
              </button>
            </p>

            <SocialRow onToast={showToast} />
          </>
        )}

        {/* ── FORGOT PASSWORD ── */}
        {tab === 'forgot' && (
          <>
            <div className="mb-8 pt-2">
              <h1 className="text-2xl font-bold text-white uppercase tracking-wide mb-3">
                Reset Password
              </h1>
              <p className="text-gray-400 text-sm leading-relaxed">
                Enter your email and we'll send you a reset link.
              </p>
            </div>

            {forgotSent ? (
              <div className="text-center space-y-5 py-4">
                <div className="w-14 h-14 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-green-400 text-xl font-bold">✓</span>
                </div>
                <p className="text-gray-300 text-sm">
                  Reset link sent to{' '}
                  <span className="text-white font-medium">{forgotEmail}</span>
                </p>
                <button
                  onClick={() => switchTab('login')}
                  className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                >
                  ← Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} noValidate className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    disabled={loading}
                    className={input}
                  />
                </div>

                {error && <p className="text-red-400 text-sm">{error}</p>}

                <button type="submit" disabled={loading} className={submitBtn}>
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>

                <button
                  type="button"
                  onClick={() => switchTab('login')}
                  className="w-full text-gray-400 hover:text-white text-sm transition-colors py-2"
                >
                  ← Back to Sign In
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}
