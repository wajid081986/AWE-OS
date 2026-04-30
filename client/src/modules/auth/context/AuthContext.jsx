import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const BASE_URL   = import.meta.env.VITE_API_URL || 'https://awe-os.onrender.com'
const TOKEN_KEY  = 'awe_token'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,      setUser]      = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate                  = useNavigate()
  const tokenRef                  = useRef(localStorage.getItem(TOKEN_KEY))

  const storeToken = (token) => {
    tokenRef.current = token
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else        localStorage.removeItem(TOKEN_KEY)
  }

  const authFetch = useCallback(async (path, options = {}) => {
    const token = tokenRef.current
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    })
    if (res.status === 401) {
      const isAuthAttempt = path.includes('/auth/login') || path.includes('/auth/register')
      if (isAuthAttempt) return res.json()
      storeToken(null)
      setUser(null)
      throw new Error('TOKEN_EXPIRED')
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  }, [])

  // Restore session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY)
    if (!savedToken) { setIsLoading(false); return }
    tokenRef.current = savedToken
    authFetch('/api/auth/me')
      .then(data => { if (data.success) setUser(data.user); else storeToken(null) })
      .catch(() => storeToken(null))
      .finally(() => setIsLoading(false))
  }, [authFetch])

  const login = useCallback(async (email, password) => {
    const data = await authFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    if (!data.success) throw new Error(data.error || data.message || 'Login failed')
    storeToken(data.token)
    setUser(data.user)
    return data.user
  }, [authFetch])

  const logout = useCallback(async () => {
    try { await authFetch('/api/auth/logout', { method: 'POST' }) } catch { /* ignore */ }
    storeToken(null)
    setUser(null)
    navigate('/login', { replace: true })
  }, [authFetch, navigate])

  // Called by AuthModal's onSuccess callback — syncs modal auth result into context
  const updateUser = useCallback((updatedUser) => {
    if (!updatedUser) return
    if (updatedUser.token) storeToken(updatedUser.token)
    setUser(updatedUser)
  }, [])

  const value = {
    user,
    role:            user?.role        ?? null,
    permissions:     user?.permissions ?? [],
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    updateUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
