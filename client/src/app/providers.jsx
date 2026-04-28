import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../modules/auth/context/AuthContext'
import App from './App'

export function AppProviders() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  )
}
