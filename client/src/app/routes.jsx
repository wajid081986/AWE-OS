import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import PublicLayout  from '../components/PublicLayout'
import AppShell      from '../shared/components/AppShell'
import AdminShell    from '../shared/components/AdminShell'
import ProtectedRoute from '../shared/components/ProtectedRoute'

// ── Public pages ─────────────────────────────────────────────
const Home           = lazy(() => import('../pages/Home'))
const ToolsPage      = lazy(() => import('../pages/ToolsPage'))
const ToolDetailPage = lazy(() => import('../pages/ToolDetailPage'))
const AboutPage      = lazy(() => import('../pages/AboutPage'))
const PrivacyPolicy  = lazy(() => import('../pages/PrivacyPolicy'))
const Terms          = lazy(() => import('../pages/Terms'))
const ContactPage    = lazy(() => import('../pages/ContactPage'))
const NotFoundPage   = lazy(() => import('../pages/NotFoundPage'))

// ── Standalone pages ──────────────────────────────────────────
const LandingPage = lazy(() => import('../modules/landing/pages/LandingPage'))
const LoginPage   = lazy(() => import('../modules/auth/pages/LoginPage'))
const ResumePage  = lazy(() => import('../modules/tools/resume/pages/ResumePage'))

// ── Calculators (public, standalone dark theme) ───────────────
const CalculatorsListPage = lazy(() => import('../modules/calculators/pages/CalculatorsListPage'))
const CalculatorPage      = lazy(() => import('../modules/calculators/pages/CalculatorPage'))

// ── User dashboard ────────────────────────────────────────────
const Dashboard         = lazy(() => import('../modules/user/pages/DashboardPage'))
const StorePage         = lazy(() => import('../modules/store/pages/StorePage'))
const MarketplacePage   = lazy(() => import('../modules/store/pages/MarketplacePage'))
const ProductsStorePage = lazy(() => import('../modules/products/pages/ProductsStorePage'))
const DownloadsPage     = lazy(() => import('../modules/products/pages/DownloadsPage'))
const UserAnalyticsPage = lazy(() => import('../modules/user/pages/UserAnalyticsPage'))
const ToolPage          = lazy(() => import('../modules/tools/pages/ToolPage'))

// ── Invoice tools ─────────────────────────────────────────────
const InvoiceDashboard = lazy(() => import('../modules/tools/invoice/pages/InvoiceDashboard'))
const CreateInvoice    = lazy(() => import('../modules/tools/invoice/pages/CreateInvoice'))
const InvoiceDetails   = lazy(() => import('../modules/tools/invoice/pages/InvoiceDetails'))
const InvoiceSettings  = lazy(() => import('../modules/tools/invoice/pages/InvoiceSettings'))

// ── Admin pages ───────────────────────────────────────────────
const Admin             = lazy(() => import('../modules/admin/pages/AdminPage'))
const ToolBuilder       = lazy(() => import('../modules/admin/tools/builder/ToolBuilder'))
const ProductManager    = lazy(() => import('../modules/admin/products/ProductManager'))
const CalculatorBuilder = lazy(() => import('../modules/admin/calculators/CalculatorBuilder'))
const UserManager       = lazy(() => import('../modules/admin/users/UserManager'))
const RevenuePage       = lazy(() => import('../modules/admin/revenue/RevenuePage'))
const AIFactoryPage     = lazy(() => import('../modules/admin/factory/AIFactoryPage'))
const AgentControlPage  = lazy(() => import('../modules/admin/agents/AgentControlPage'))

// ── Shared UI ─────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex flex-1 items-center justify-center min-h-[200px]">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

const lazy$ = (el) => <Suspense fallback={<PageLoader />}>{el}</Suspense>

// ── Route tree ────────────────────────────────────────────────
export default function AppRoutes() {
  return (
    <Routes>

      {/* Public website — shared PublicLayout shell (Header + Footer) */}
      <Route element={<PublicLayout />}>
        <Route path="/"            element={lazy$(<Home />)}           />
        <Route path="/tools"       element={lazy$(<ToolsPage />)}      />
        <Route path="/tools/:slug" element={lazy$(<ToolDetailPage />)} />
        <Route path="/about"       element={lazy$(<AboutPage />)}      />
        <Route path="/privacy"     element={lazy$(<PrivacyPolicy />)}  />
        <Route path="/terms"       element={lazy$(<Terms />)}          />
        <Route path="/contact"     element={lazy$(<ContactPage />)}    />
      </Route>

      {/* Standalone — no shared shell */}
      <Route path="/home"          element={lazy$(<LandingPage />)}         />
      <Route path="/login"         element={lazy$(<LoginPage />)}           />
      <Route path="/tools/resume"  element={lazy$(<ResumePage />)}          />
      <Route path="/calculators"       element={lazy$(<CalculatorsListPage />)} />
      <Route path="/calculators/:slug" element={lazy$(<CalculatorPage />)}      />

      {/* Authenticated — shared AppShell (persistent dark nav) */}
      <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route path="/dashboard"              element={lazy$(<Dashboard />)}         />
        <Route path="/dashboard/store"        element={lazy$(<StorePage />)}         />
        <Route path="/dashboard/tools/:slug"  element={lazy$(<ToolPage />)}          />
        <Route path="/dashboard/products"     element={lazy$(<ProductsStorePage />)} />
        <Route path="/dashboard/downloads"    element={lazy$(<DownloadsPage />)}     />
        <Route path="/dashboard/marketplace"  element={lazy$(<MarketplacePage />)}   />
        <Route path="/dashboard/analytics"    element={lazy$(<UserAnalyticsPage />)} />
        <Route path="/tools/invoice"          element={lazy$(<InvoiceDashboard />)}  />
        <Route path="/tools/invoice/create"   element={lazy$(<CreateInvoice />)}     />
        <Route path="/tools/invoice/:id"      element={lazy$(<InvoiceDetails />)}    />
        <Route path="/tools/invoice/settings" element={lazy$(<InvoiceSettings />)}   />

        {/* Admin — AdminShell (sidebar) nested inside AppShell */}
        <Route element={<ProtectedRoute requiredRole="admin"><AdminShell /></ProtectedRoute>}>
          <Route path="/admin"               element={lazy$(<Admin />)}             />
          <Route path="/admin/tools/builder" element={lazy$(<ToolBuilder />)}       />
          <Route path="/admin/products"      element={lazy$(<ProductManager />)}    />
          <Route path="/admin/calculators"   element={lazy$(<CalculatorBuilder />)} />
          <Route path="/admin/users"         element={lazy$(<UserManager />)}       />
          <Route path="/admin/revenue"       element={lazy$(<RevenuePage />)}       />
          <Route path="/admin/factory"       element={lazy$(<AIFactoryPage />)}     />
          <Route path="/admin/agents"        element={lazy$(<AgentControlPage />)}  />
          <Route path="/admin/pipeline"      element={lazy$(<AgentControlPage />)}  />
        </Route>
      </Route>

      {/* 404 — standalone, uses its own PublicLayout wrapper */}
      <Route path="*" element={lazy$(<NotFoundPage />)} />

    </Routes>
  )
}
