import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../modules/auth/context/AuthContext'
import ProtectedRoute from '../shared/components/ProtectedRoute'
import PublicRoute    from '../shared/components/PublicRoute'

// ── Lazy pages ────────────────────────────────────────────────
const LoginPage        = lazy(() => import('../pages/LoginPage'))
const ResumePage       = lazy(() => import('../pages/ResumePage'))
const Dashboard        = lazy(() => import('../pages/Dashboard'))
const Admin            = lazy(() => import('../pages/Admin'))
const InvoiceDashboard = lazy(() => import('../pages/InvoiceDashboard'))
const CreateInvoice    = lazy(() => import('../pages/CreateInvoice'))
const InvoiceDetails   = lazy(() => import('../pages/InvoiceDetails'))
const InvoiceSettings  = lazy(() => import('../pages/InvoiceSettings'))

// ── Shared UI ─────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function ComingSoon({ title }) {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-4">
      <span className="text-5xl">🚧</span>
      <h1 className="text-2xl font-bold text-white">{title}</h1>
      <p className="text-gray-400">Coming in the next phase</p>
      <a href="/dashboard" className="text-indigo-400 hover:text-indigo-300 text-sm font-medium">
        ← Back to Dashboard
      </a>
    </div>
  )
}

function RootRedirect() {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <PageLoader />
  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />
}

const lazy$ = (el) => <Suspense fallback={<PageLoader />}>{el}</Suspense>

// ── Route tree ────────────────────────────────────────────────
export default function AppRoutes() {
  return (
    <Routes>
      {/* Root */}
      <Route path="/" element={<RootRedirect />} />

      {/* Auth */}
      <Route path="/login" element={lazy$(<LoginPage />)} />

      {/* Resume Builder — public tool, no auth required */}
      <Route path="/tools/resume" element={lazy$(<ResumePage />)} />

      {/* Calculators — public, SEO-crawlable */}
      <Route path="/calculators"       element={<PublicRoute><ComingSoon title="Calculators" /></PublicRoute>} />
      <Route path="/calculators/:slug" element={<PublicRoute><ComingSoon title="Calculator" /></PublicRoute>} />

      {/* User Dashboard */}
      <Route path="/dashboard"           element={<ProtectedRoute>{lazy$(<Dashboard />)}</ProtectedRoute>} />
      <Route path="/dashboard/store"     element={<ProtectedRoute><ComingSoon title="Store" /></ProtectedRoute>} />
      <Route path="/dashboard/tools"     element={<ProtectedRoute><ComingSoon title="Tools" /></ProtectedRoute>} />
      <Route path="/dashboard/products"  element={<ProtectedRoute><ComingSoon title="Products" /></ProtectedRoute>} />
      <Route path="/dashboard/downloads" element={<ProtectedRoute><ComingSoon title="Downloads" /></ProtectedRoute>} />

      {/* Invoice tools */}
      <Route path="/tools/invoice"          element={<ProtectedRoute>{lazy$(<InvoiceDashboard />)}</ProtectedRoute>} />
      <Route path="/tools/invoice/create"   element={<ProtectedRoute>{lazy$(<CreateInvoice />)}</ProtectedRoute>} />
      <Route path="/tools/invoice/:id"      element={<ProtectedRoute>{lazy$(<InvoiceDetails />)}</ProtectedRoute>} />
      <Route path="/tools/invoice/settings" element={<ProtectedRoute>{lazy$(<InvoiceSettings />)}</ProtectedRoute>} />

      {/* Admin */}
      <Route path="/admin"                element={<ProtectedRoute requiredRole="admin">{lazy$(<Admin />)}</ProtectedRoute>} />
      <Route path="/admin/tools/builder"  element={<ProtectedRoute requiredRole="admin"><ComingSoon title="Tools Builder" /></ProtectedRoute>} />
      <Route path="/admin/products"       element={<ProtectedRoute requiredRole="admin"><ComingSoon title="Admin Products" /></ProtectedRoute>} />
      <Route path="/admin/calculators"    element={<ProtectedRoute requiredRole="admin"><ComingSoon title="Admin Calculators" /></ProtectedRoute>} />
      <Route path="/admin/users"          element={<ProtectedRoute requiredRole="admin"><ComingSoon title="Admin Users" /></ProtectedRoute>} />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
