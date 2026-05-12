/**
 * AWE-OS Route Tree
 *
 * Tool routing architecture:
 *   /tools              → ToolsPage (directory + search)
 *   /tools/pdf          → CategoryPage (SEO landing, category="pdf")
 *   /tools/calculators  → CategoryPage (category="calculators")
 *   /tools/converters   → CategoryPage (category="converters")
 *   /tools/ai           → CategoryPage (category="ai")
 *   /tools/:slug        → DynamicToolPage (resolves component from registry,
 *                          falls back to API-driven ToolDetailPage for
 *                          autonomously-generated tools)
 *
 * Adding a new tool:
 *   1. Add metadata entry to client/src/data/toolRegistry.js
 *   2. Add lazy import to client/src/pages/tools/DynamicToolPage.jsx
 *   3. Done — no route changes needed.
 */

import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import PublicLayout   from '../components/PublicLayout'
import AppShell       from '../shared/components/AppShell'
import AdminShell     from '../shared/components/AdminShell'
import ProtectedRoute from '../shared/components/ProtectedRoute'

// ── Public pages ──────────────────────────────────────────────────────────────
const Home           = lazy(() => import('../pages/Home'))
const ToolsPage      = lazy(() => import('../pages/ToolsPage'))
const CategoryPage   = lazy(() => import('../pages/CategoryPage'))
const DynamicToolPage = lazy(() => import('../pages/tools/DynamicToolPage'))
const AboutPage      = lazy(() => import('../pages/AboutPage'))
const PrivacyPolicy  = lazy(() => import('../pages/PrivacyPolicy'))
const Terms          = lazy(() => import('../pages/Terms'))
const Disclaimer     = lazy(() => import('../pages/Disclaimer'))
const ContactPage    = lazy(() => import('../pages/ContactPage'))
const NotFoundPage   = lazy(() => import('../pages/NotFoundPage'))

// ── Payment pages ─────────────────────────────────────────────────────────────
const PricingPage    = lazy(() => import('../pages/PricingPage'))
const PaymentSuccess = lazy(() => import('../pages/PaymentSuccess'))

// ── Auth / standalone ─────────────────────────────────────────────────────────
const LoginPage   = lazy(() => import('../modules/auth/pages/LoginPage'))
const ResumePage  = lazy(() => import('../modules/tools/resume/pages/ResumePage'))

// ── Calculators (public, standalone dark theme) ───────────────────────────────
const CalculatorsListPage = lazy(() => import('../modules/calculators/pages/CalculatorsListPage'))
const CalculatorPage      = lazy(() => import('../modules/calculators/pages/CalculatorPage'))

// ── User dashboard ────────────────────────────────────────────────────────────
const Dashboard         = lazy(() => import('../modules/user/pages/DashboardPage'))
const StorePage         = lazy(() => import('../modules/store/pages/StorePage'))
const MarketplacePage   = lazy(() => import('../modules/store/pages/MarketplacePage'))
const ProductsStorePage = lazy(() => import('../modules/products/pages/ProductsStorePage'))
const DownloadsPage     = lazy(() => import('../modules/products/pages/DownloadsPage'))
const UserAnalyticsPage = lazy(() => import('../modules/user/pages/UserAnalyticsPage'))
const ToolPage          = lazy(() => import('../modules/tools/pages/ToolPage'))

// ── Invoice tools ─────────────────────────────────────────────────────────────
const InvoiceDashboard = lazy(() => import('../modules/tools/invoice/pages/InvoiceDashboard'))
const CreateInvoice    = lazy(() => import('../modules/tools/invoice/pages/CreateInvoice'))
const InvoiceDetails   = lazy(() => import('../modules/tools/invoice/pages/InvoiceDetails'))
const InvoiceSettings  = lazy(() => import('../modules/tools/invoice/pages/InvoiceSettings'))

// ── Admin pages ───────────────────────────────────────────────────────────────
const Admin             = lazy(() => import('../modules/admin/pages/AdminPage'))
const ToolBuilder       = lazy(() => import('../modules/admin/tools/builder/ToolBuilder'))
const ProductManager    = lazy(() => import('../modules/admin/products/ProductManager'))
const CalculatorBuilder = lazy(() => import('../modules/admin/calculators/CalculatorBuilder'))
const UserManager       = lazy(() => import('../modules/admin/users/UserManager'))
const RevenuePage       = lazy(() => import('../modules/admin/revenue/RevenuePage'))
const AIFactoryPage     = lazy(() => import('../modules/admin/factory/AIFactoryPage'))
const AgentControlPage  = lazy(() => import('../modules/admin/agents/AgentControlPage'))
const AgentsMonitor          = lazy(() => import('../modules/admin/agents/AgentsMonitor'))
const MultiAgentDashboard    = lazy(() => import('../modules/admin/multi-agent/MultiAgentDashboard'))
const OptimizationDashboard  = lazy(() => import('../modules/admin/optimization/OptimizationDashboard'))
const IntelligenceDashboard  = lazy(() => import('../modules/admin/intelligence/IntelligenceDashboard'))
const MarketplaceDashboard       = lazy(() => import('../modules/admin/marketplace/MarketplaceDashboard'))
const ExpansionCenter            = lazy(() => import('../modules/admin/marketplace/ExpansionCenter'))
const RevenueDashboard           = lazy(() => import('../modules/admin/revenue/RevenueDashboard'))
const RevenueOptimizationCenter  = lazy(() => import('../modules/admin/revenue/RevenueOptimizationCenter'))
const AgentEconomyDashboard      = lazy(() => import('../modules/admin/agents/AgentEconomyDashboard'))
const AgentMarketplaceDashboard  = lazy(() => import('../modules/admin/agents/AgentMarketplaceDashboard'))
const SelfHealingDashboard       = lazy(() => import('../modules/admin/selfHealing/SelfHealingDashboard'))
const FailureAnalyticsPanel      = lazy(() => import('../modules/admin/selfHealing/FailureAnalyticsPanel'))
const RuntimeResilienceCenter    = lazy(() => import('../modules/admin/selfHealing/RuntimeResilienceCenter'))

// ── Shared suspense wrapper ───────────────────────────────────────────────────
function PageLoader() {
  return (
    <div
      className="flex flex-1 items-center justify-center min-h-[200px]"
      role="status"
      aria-label="Loading page"
    >
      <div
        className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"
        aria-hidden="true"
      />
      <span className="sr-only">Loading…</span>
    </div>
  )
}

const lazy$ = (el) => <Suspense fallback={<PageLoader />}>{el}</Suspense>

// ── Route tree ────────────────────────────────────────────────────────────────
export default function AppRoutes() {
  return (
    <Routes>

      {/* ── Public website (Header + Footer) ─────────────────────────────── */}
      <Route element={<PublicLayout />}>

        {/* Homepage */}
        <Route path="/" element={lazy$(<Home />)} />

        {/* Tools directory */}
        <Route path="/tools" element={lazy$(<ToolsPage />)} />

        {/* Category landing pages — must be before /tools/:slug */}
        <Route path="/tools/pdf"         element={lazy$(<CategoryPage category="pdf" />)} />
        <Route path="/tools/calculators" element={lazy$(<CategoryPage category="calculators" />)} />
        <Route path="/tools/converters"  element={lazy$(<CategoryPage category="converters" />)} />
        <Route path="/tools/ai"          element={lazy$(<CategoryPage category="ai" />)} />

        {/* Dynamic tool renderer — handles all /tools/:slug routes.
            Dedicated components are resolved first; unknown slugs fall back
            to the API-driven ToolDetailPage (for autonomous-pipeline tools). */}
        <Route path="/tools/:slug" element={lazy$(<DynamicToolPage />)} />

        {/* Static pages */}
        <Route path="/about"          element={lazy$(<AboutPage />)} />
        <Route path="/privacy-policy" element={lazy$(<PrivacyPolicy />)} />
        <Route path="/terms"          element={lazy$(<Terms />)} />
        <Route path="/disclaimer"     element={lazy$(<Disclaimer />)} />
        <Route path="/contact"        element={lazy$(<ContactPage />)} />
        <Route path="/pricing"        element={lazy$(<PricingPage />)} />
        <Route path="/payment/success" element={lazy$(<PaymentSuccess />)} />

        {/* Legacy redirect shim: /privacy → /privacy-policy (same component) */}
        <Route path="/privacy" element={lazy$(<PrivacyPolicy />)} />

      </Route>

      {/* ── Standalone (no shared shell) ─────────────────────────────────── */}
      <Route path="/login"              element={lazy$(<LoginPage />)} />
      <Route path="/tools/resume"       element={lazy$(<ResumePage />)} />
      <Route path="/calculators"        element={lazy$(<CalculatorsListPage />)} />
      <Route path="/calculators/:slug"  element={lazy$(<CalculatorPage />)} />

      {/* ── Authenticated (persistent dark AppShell nav) ─────────────────── */}
      <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route path="/dashboard"             element={lazy$(<Dashboard />)} />
        <Route path="/dashboard/store"       element={lazy$(<StorePage />)} />
        <Route path="/dashboard/tools/:slug" element={lazy$(<ToolPage />)} />
        <Route path="/dashboard/products"    element={lazy$(<ProductsStorePage />)} />
        <Route path="/dashboard/downloads"   element={lazy$(<DownloadsPage />)} />
        <Route path="/dashboard/marketplace" element={lazy$(<MarketplacePage />)} />
        <Route path="/dashboard/analytics"   element={lazy$(<UserAnalyticsPage />)} />

        {/* Invoice tools */}
        <Route path="/tools/invoice"          element={lazy$(<InvoiceDashboard />)} />
        <Route path="/tools/invoice/create"   element={lazy$(<CreateInvoice />)} />
        <Route path="/tools/invoice/:id"      element={lazy$(<InvoiceDetails />)} />
        <Route path="/tools/invoice/settings" element={lazy$(<InvoiceSettings />)} />

        {/* ── Admin (AdminShell sidebar nested in AppShell) ─────────────── */}
        <Route element={<ProtectedRoute requiredRole="admin"><AdminShell /></ProtectedRoute>}>
          <Route path="/admin"               element={lazy$(<Admin />)} />
          <Route path="/admin/tools/builder" element={lazy$(<ToolBuilder />)} />
          <Route path="/admin/products"      element={lazy$(<ProductManager />)} />
          <Route path="/admin/calculators"   element={lazy$(<CalculatorBuilder />)} />
          <Route path="/admin/users"         element={lazy$(<UserManager />)} />
          <Route path="/admin/revenue"       element={lazy$(<RevenuePage />)} />
          <Route path="/admin/factory"       element={lazy$(<AIFactoryPage />)} />
          <Route path="/admin/agents"        element={lazy$(<AgentsMonitor />)} />
          <Route path="/admin/pipeline"      element={lazy$(<AgentControlPage />)} />
          <Route path="/admin/multi-agent"   element={lazy$(<MultiAgentDashboard />)} />
          <Route path="/admin/optimization"  element={lazy$(<OptimizationDashboard />)} />
          <Route path="/admin/intelligence"  element={lazy$(<IntelligenceDashboard />)} />
          <Route path="/admin/marketplace"           element={lazy$(<MarketplaceDashboard />)} />
          <Route path="/admin/expansion"             element={lazy$(<ExpansionCenter />)} />
          <Route path="/admin/revenue-intelligence"  element={lazy$(<RevenueDashboard />)} />
          <Route path="/admin/revenue-optimization"  element={lazy$(<RevenueOptimizationCenter />)} />
          <Route path="/admin/agent-economy"          element={lazy$(<AgentEconomyDashboard />)} />
          <Route path="/admin/agent-marketplace"      element={lazy$(<AgentMarketplaceDashboard />)} />
          <Route path="/admin/self-healing"           element={lazy$(<SelfHealingDashboard />)} />
          <Route path="/admin/failure-analytics"      element={lazy$(<FailureAnalyticsPanel />)} />
          <Route path="/admin/runtime-resilience"     element={lazy$(<RuntimeResilienceCenter />)} />
        </Route>
      </Route>

      {/* ── 404 fallback ─────────────────────────────────────────────────── */}
      <Route path="*" element={lazy$(<NotFoundPage />)} />

    </Routes>
  )
}
