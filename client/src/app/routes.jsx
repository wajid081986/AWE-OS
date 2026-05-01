import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../modules/auth/context/AuthContext'
import ProtectedRoute from '../shared/components/ProtectedRoute'
import PublicRoute    from '../shared/components/PublicRoute'

// ── Lazy pages ────────────────────────────────────────────────
const LandingPage      = lazy(() => import('../modules/landing/pages/LandingPage'))
const NotFoundPage     = lazy(() => import('../pages/NotFoundPage'))
const LoginPage        = lazy(() => import('../modules/auth/pages/LoginPage'))
const ResumePage       = lazy(() => import('../modules/tools/resume/pages/ResumePage'))
const Dashboard        = lazy(() => import('../modules/user/pages/DashboardPage'))
const Admin            = lazy(() => import('../modules/admin/pages/AdminPage'))
const InvoiceDashboard = lazy(() => import('../modules/tools/invoice/pages/InvoiceDashboard'))
const CreateInvoice    = lazy(() => import('../modules/tools/invoice/pages/CreateInvoice'))
const InvoiceDetails   = lazy(() => import('../modules/tools/invoice/pages/InvoiceDetails'))
const InvoiceSettings  = lazy(() => import('../modules/tools/invoice/pages/InvoiceSettings'))

// ── Admin sub-pages ───────────────────────────────────────────
const ToolBuilder       = lazy(() => import('../modules/admin/tools/builder/ToolBuilder'))
const ProductManager    = lazy(() => import('../modules/admin/products/ProductManager'))
const CalculatorBuilder = lazy(() => import('../modules/admin/calculators/CalculatorBuilder'))
const UserManager       = lazy(() => import('../modules/admin/users/UserManager'))
const AdminRevenuePage  = lazy(() => import('../modules/admin/pages/AdminRevenuePage'))
const RevenuePage       = lazy(() => import('../modules/admin/revenue/RevenuePage'))
const UserAnalyticsPage = lazy(() => import('../modules/user/pages/UserAnalyticsPage'))
const AIFactoryPage     = lazy(() => import('../modules/admin/factory/AIFactoryPage'))
const AgentControlPage  = lazy(() => import('../modules/admin/agents/AgentControlPage'))

// ── Tool pages ────────────────────────────────────────────────
const ToolPage             = lazy(() => import('../modules/tools/pages/ToolPage'))

// ── User sub-pages ────────────────────────────────────────────
const StorePage            = lazy(() => import('../modules/store/pages/StorePage'))
const MarketplacePage      = lazy(() => import('../modules/store/pages/MarketplacePage'))
const ProductsStorePage    = lazy(() => import('../modules/products/pages/ProductsStorePage'))
const DownloadsPage        = lazy(() => import('../modules/products/pages/DownloadsPage'))
const CalculatorsListPage  = lazy(() => import('../modules/calculators/pages/CalculatorsListPage'))
const CalculatorPage       = lazy(() => import('../modules/calculators/pages/CalculatorPage'))

// ── Shared UI ─────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
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
      {/* Root — public landing page */}
      <Route path="/" element={lazy$(<LandingPage />)} />

      {/* Auth */}
      <Route path="/login" element={lazy$(<LoginPage />)} />

      {/* Resume Builder — public tool, no auth required */}
      <Route path="/tools/resume" element={lazy$(<ResumePage />)} />

      {/* Calculators — public, SEO-crawlable */}
      <Route path="/calculators"       element={<PublicRoute>{lazy$(<CalculatorsListPage />)}</PublicRoute>} />
      <Route path="/calculators/:slug" element={<PublicRoute>{lazy$(<CalculatorPage />)}</PublicRoute>} />

      {/* User Dashboard */}
      <Route path="/dashboard"           element={<ProtectedRoute>{lazy$(<Dashboard />)}</ProtectedRoute>} />
      <Route path="/dashboard/store"     element={<ProtectedRoute>{lazy$(<StorePage />)}</ProtectedRoute>} />
      <Route path="/dashboard/tools/:slug" element={<ProtectedRoute>{lazy$(<ToolPage />)}</ProtectedRoute>} />
      <Route path="/dashboard/products"  element={<ProtectedRoute>{lazy$(<ProductsStorePage />)}</ProtectedRoute>} />
      <Route path="/dashboard/downloads"    element={<ProtectedRoute>{lazy$(<DownloadsPage />)}</ProtectedRoute>} />
      <Route path="/dashboard/marketplace" element={<ProtectedRoute>{lazy$(<MarketplacePage />)}</ProtectedRoute>} />
      <Route path="/dashboard/analytics"  element={<ProtectedRoute>{lazy$(<UserAnalyticsPage />)}</ProtectedRoute>} />

      {/* Invoice tools */}
      <Route path="/tools/invoice"          element={<ProtectedRoute>{lazy$(<InvoiceDashboard />)}</ProtectedRoute>} />
      <Route path="/tools/invoice/create"   element={<ProtectedRoute>{lazy$(<CreateInvoice />)}</ProtectedRoute>} />
      <Route path="/tools/invoice/:id"      element={<ProtectedRoute>{lazy$(<InvoiceDetails />)}</ProtectedRoute>} />
      <Route path="/tools/invoice/settings" element={<ProtectedRoute>{lazy$(<InvoiceSettings />)}</ProtectedRoute>} />

      {/* Admin */}
      <Route path="/admin"                element={<ProtectedRoute requiredRole="admin">{lazy$(<Admin />)}</ProtectedRoute>} />
      <Route path="/admin/tools/builder"  element={<ProtectedRoute requiredRole="admin">{lazy$(<ToolBuilder />)}</ProtectedRoute>} />
      <Route path="/admin/products"       element={<ProtectedRoute requiredRole="admin">{lazy$(<ProductManager />)}</ProtectedRoute>} />
      <Route path="/admin/calculators"    element={<ProtectedRoute requiredRole="admin">{lazy$(<CalculatorBuilder />)}</ProtectedRoute>} />
      <Route path="/admin/users"          element={<ProtectedRoute requiredRole="admin">{lazy$(<UserManager />)}</ProtectedRoute>} />
      <Route path="/admin/revenue"        element={<ProtectedRoute requiredRole="admin">{lazy$(<RevenuePage />)}</ProtectedRoute>} />
      <Route path="/admin/factory"        element={<ProtectedRoute requiredRole="admin">{lazy$(<AIFactoryPage />)}</ProtectedRoute>} />
      <Route path="/admin/agents"         element={<ProtectedRoute requiredRole="admin">{lazy$(<AgentControlPage />)}</ProtectedRoute>} />

      {/* 404 */}
      <Route path="*" element={lazy$(<NotFoundPage />)} />
    </Routes>
  )
}
