import { useAuth } from '../modules/auth/context/AuthContext'
import AppRoutes from './routes'

const splashStyle = {
  background: '#0f172a',
  width: '100vw',
  height: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#94a3b8',
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: '0.95rem',
  letterSpacing: '0.01em',
}

export default function App() {
  const { isLoading } = useAuth()

  if (isLoading) {
    return <div style={splashStyle}>Loading AWE-OS…</div>
  }

  return <AppRoutes />
}
