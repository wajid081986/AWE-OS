import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { AuthProvider } from '../modules/auth/context/AuthContext'
import { ToastProvider } from '../shared/components/ToastContext'
import { useWebVitals } from '../hooks/usePerformanceMonitor'
import App from './App'

function VitalsObserver() {
  useWebVitals()
  return null
}

export function AppProviders() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <VitalsObserver />
            <App />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </HelmetProvider>
  )
}
