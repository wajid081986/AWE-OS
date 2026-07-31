/**
 * AWE-OS Route Tree
 *
 * Tool routing architecture:
 *   /tools              → ToolsPage (directory + search)
 *   /tools/pdf          → CategoryPage (SEO landing, category="pdf")
 *   /tools/calculators  → CategoryPage (category="calculators")
 *   /tools/converters   → CategoryPage (category="converters")
 *   /tools/ai           → CategoryPage (category="ai")
 *   /tools/productivity → CategoryPage (category="productivity")
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
import { Routes, Route, Navigate } from 'react-router-dom'
import PublicLayout   from '../components/PublicLayout'
// SSG-hydrated public routes source their lazy import from here, shared
// with hydratePreload.js (batch 5.6b) — see routeImports.js's header.
import { ROUTE_IMPORTS } from '../routeImports'

// Lazy — these are internal-only (behind Login), never needed for a public
// page load. AdminShell eagerly pulls in axios via api.service.js, and none
// of the three are needed until a route inside ProtectedRoute is visited.
const AppShell       = lazy(() => import('../shared/components/AppShell'))
const AdminShell     = lazy(() => import('../shared/components/AdminShell'))
const ProtectedRoute = lazy(() => import('../shared/components/ProtectedRoute'))

// ── Public pages ──────────────────────────────────────────────────────────────
const Home           = lazy(ROUTE_IMPORTS.home)
const ToolsPage      = lazy(ROUTE_IMPORTS.toolsIndex)
const CategoryPage   = lazy(ROUTE_IMPORTS.categoryPage)
const DynamicToolPage = lazy(ROUTE_IMPORTS.dynamicToolPage)
const AboutPage      = lazy(ROUTE_IMPORTS.about)
const PrivacyPolicy  = lazy(ROUTE_IMPORTS.privacyPolicy)
const Terms          = lazy(ROUTE_IMPORTS.terms)
const Disclaimer     = lazy(ROUTE_IMPORTS.disclaimer)
const EditorialPolicy    = lazy(ROUTE_IMPORTS.editorialPolicy)
const ToolTestingPolicy  = lazy(ROUTE_IMPORTS.toolTestingPolicy)
const AiContentPolicy    = lazy(ROUTE_IMPORTS.aiContentPolicy)
const CorrectionsPolicy  = lazy(ROUTE_IMPORTS.correctionsPolicy)
const AdvertisingPolicy  = lazy(ROUTE_IMPORTS.advertisingPolicy)
const ContactPage    = lazy(ROUTE_IMPORTS.contact)
const FreeToolsPage  = lazy(ROUTE_IMPORTS.freeTools)
const BlogPage       = lazy(ROUTE_IMPORTS.blog)
const BlogPostPage   = lazy(ROUTE_IMPORTS.blogPost)
const NotFoundPage   = lazy(() => import('../pages/NotFoundPage'))

// ── Payment pages ─────────────────────────────────────────────────────────────
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

// ── Multi-vendor store marketplace ────────────────────────────────────────────
const StoreListingPage       = lazy(() => import('../modules/store/pages/StoreListingPage'))
const StoreProductDetailPage = lazy(() => import('../modules/store/pages/StoreProductDetailPage'))
const SellerOnboardingPage   = lazy(() => import('../modules/store/pages/SellerOnboardingPage'))
const SellerDashboardPage    = lazy(() => import('../modules/store/pages/SellerDashboardPage'))
const WishlistPage           = lazy(() => import('../modules/store/pages/WishlistPage'))
const StoreApprovalQueue     = lazy(() => import('../modules/admin/store/StoreApprovalQueue'))
const StorePayoutQueue       = lazy(() => import('../modules/admin/store/StorePayoutQueue'))
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
const AIFactoryPage       = lazy(() => import('../modules/admin/factory/AIFactoryPage'))
const ImageAgentPage      = lazy(() => import('../modules/admin/image-agent/ImageAgent'))
const MarketingAssistant  = lazy(() => import('../modules/admin/marketing/MarketingAssistant'))
const BlogAssistant       = lazy(() => import('../modules/admin/blog/BlogAssistant'))
const TrafficGrowth       = lazy(() => import('../modules/admin/traffic/TrafficGrowth'))
const AgentControlPage  = lazy(() => import('../modules/admin/agents/AgentControlPage'))
const AgentsMonitor          = lazy(() => import('../modules/admin/agents/AgentsMonitor'))
const MultiAgentDashboard    = lazy(() => import('../modules/admin/multi-agent/MultiAgentDashboard'))
const OptimizationDashboard  = lazy(() => import('../modules/admin/optimization/OptimizationDashboard'))
const IntelligenceDashboard  = lazy(() => import('../modules/admin/intelligence/Phase4Dashboard'))
const AutoCampaignPage       = lazy(() => import('../modules/admin/auto-campaign/AutoCampaignPage'))
const MarketplaceDashboard       = lazy(() => import('../modules/admin/marketplace/MarketplaceDashboard'))
const ExpansionCenter            = lazy(() => import('../modules/admin/marketplace/ExpansionCenter'))
const RevenueDashboard           = lazy(() => import('../modules/admin/revenue/RevenueDashboard'))
const RevenueOptimizationCenter  = lazy(() => import('../modules/admin/revenue/RevenueOptimizationCenter'))
const AgentEconomyDashboard      = lazy(() => import('../modules/admin/agents/AgentEconomyDashboard'))
const AgentMarketplaceDashboard  = lazy(() => import('../modules/admin/agents/AgentMarketplaceDashboard'))
const SelfHealingDashboard       = lazy(() => import('../modules/admin/selfHealing/SelfHealingDashboard'))
const FailureAnalyticsPanel      = lazy(() => import('../modules/admin/selfHealing/FailureAnalyticsPanel'))
const RuntimeResilienceCenter    = lazy(() => import('../modules/admin/selfHealing/RuntimeResilienceCenter'))
const ContentStudioPage          = lazy(() => import('../modules/admin/blog/ContentStudio'))
const AutomationHubPage          = lazy(() => import('../modules/admin/AutomationHub'))
const LandingBuilderPage         = lazy(() => import('../modules/admin/landing/LandingBuilderPage'))
const ContentEnginePage          = lazy(() => import('../modules/admin/content-engine/ContentEngine'))
const SeoDashboard               = lazy(() => import('../modules/admin/seo/SeoDashboard'))
const SeoAgent                   = lazy(() => import('../modules/admin/seo/SeoAgent'))
const ProgrammaticSeo            = lazy(() => import('../modules/admin/seo/ProgrammaticSeo'))
const SeoAuditEngine             = lazy(() => import('../modules/admin/seo/SeoAuditEngine'))
const CrawlEnginePage            = lazy(() => import('../modules/admin/seo/CrawlEngine'))
const SeoIntelligence            = lazy(() => import('../modules/admin/seo/SeoIntelligence'))
const CityToolPage               = lazy(ROUTE_IMPORTS.cityToolPage)
const CompareToolPage            = lazy(ROUTE_IMPORTS.compareToolPage)
const FaqCategoryPage            = lazy(ROUTE_IMPORTS.faqCategoryPage)

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

        {/* Static tool sub-pages — must be before /tools/:slug */}
        <Route path="/tools/free"        element={lazy$(<FreeToolsPage />)} />

        {/* Category landing pages — must be before /tools/:slug */}
        <Route path="/tools/pdf"          element={lazy$(<CategoryPage category="pdf" />)} />
        <Route path="/tools/calculators"  element={lazy$(<CategoryPage category="calculators" />)} />
        <Route path="/tools/converters"   element={lazy$(<CategoryPage category="converters" />)} />
        <Route path="/tools/ai"           element={lazy$(<CategoryPage category="ai" />)} />
        <Route path="/tools/productivity" element={lazy$(<CategoryPage category="productivity" />)} />

        {/* Dynamic tool renderer — handles all /tools/:slug routes.
            Dedicated components are resolved first; unknown slugs fall back
            to the API-driven ToolDetailPage (for autonomous-pipeline tools). */}
        <Route path="/tools/:slug" element={lazy$(<DynamicToolPage />)} />

        {/* Blog */}
        <Route path="/blog"           element={lazy$(<BlogPage />)} />
        <Route path="/blog/:slug"     element={lazy$(<BlogPostPage />)} />

        {/* Static pages */}
        <Route path="/about"          element={lazy$(<AboutPage />)} />
        <Route path="/privacy-policy" element={lazy$(<PrivacyPolicy />)} />
        <Route path="/terms"          element={lazy$(<Terms />)} />
        <Route path="/disclaimer"     element={lazy$(<Disclaimer />)} />
        <Route path="/editorial-policy"     element={lazy$(<EditorialPolicy />)} />
        <Route path="/tool-testing-policy"  element={lazy$(<ToolTestingPolicy />)} />
        <Route path="/ai-content-policy"    element={lazy$(<AiContentPolicy />)} />
        <Route path="/corrections-policy"   element={lazy$(<CorrectionsPolicy />)} />
        <Route path="/advertising-policy"   element={lazy$(<AdvertisingPolicy />)} />
        <Route path="/contact"        element={lazy$(<ContactPage />)} />
        <Route path="/pricing"        element={<Navigate to="/" replace />} />
        <Route path="/payment/success" element={lazy$(<PaymentSuccess />)} />

        {/* Legacy redirect shim: /privacy → /privacy-policy (same component) */}
        <Route path="/privacy" element={lazy$(<PrivacyPolicy />)} />

        {/* Comparison pages — /compare/:slug
            MUST be before /:toolSlug/:city to prevent wildcard capture. */}
        <Route path="/compare/:slug" element={lazy$(<CompareToolPage />)} />

        {/* FAQ category pages — /faq/:slug
            MUST be before /:toolSlug/:city to prevent wildcard capture. */}
        <Route path="/faq/:slug" element={lazy$(<FaqCategoryPage />)} />

        {/* Multi-vendor store — /store, /store/:slug, /store/sell
            MUST be before /:toolSlug/:city to prevent wildcard capture. */}
        <Route path="/store"      element={lazy$(<StoreListingPage />)} />
        <Route path="/store/sell" element={lazy$(<SellerOnboardingPage />)} />
        <Route path="/store/:slug" element={lazy$(<StoreProductDetailPage />)} />

        {/* City-specific tool pages — /:toolSlug/:city (e.g. /gst-calculator/mumbai).
            RR6 ranks static segments higher, so /blog/:slug, /tools/:slug etc. all
            win over this. Guard inside CityToolPage validates toolSlug vs TOOL_REGISTRY. */}
        <Route path="/:toolSlug/:city" element={lazy$(<CityToolPage />)} />

      </Route>

      {/* ── Standalone (no shared shell) ─────────────────────────────────── */}
      <Route path="/login"              element={lazy$(<LoginPage />)} />
      <Route path="/tools/resume"       element={lazy$(<ResumePage />)} />
      <Route path="/calculators"        element={lazy$(<CalculatorsListPage />)} />
      <Route path="/calculators/:slug"  element={lazy$(<CalculatorPage />)} />

      {/* ── Authenticated (persistent dark AppShell nav) ─────────────────── */}
      <Route element={lazy$(<ProtectedRoute><AppShell /></ProtectedRoute>)}>
        <Route path="/dashboard"             element={lazy$(<Dashboard />)} />
        <Route path="/dashboard/store"       element={lazy$(<StorePage />)} />
        <Route path="/dashboard/tools/:slug" element={lazy$(<ToolPage />)} />
        <Route path="/dashboard/products"    element={lazy$(<ProductsStorePage />)} />
        <Route path="/dashboard/downloads"   element={lazy$(<DownloadsPage />)} />
        <Route path="/dashboard/marketplace" element={lazy$(<MarketplacePage />)} />
        <Route path="/dashboard/analytics"   element={lazy$(<UserAnalyticsPage />)} />
        <Route path="/dashboard/store/seller"   element={lazy$(<SellerDashboardPage />)} />
        <Route path="/dashboard/store/wishlist" element={lazy$(<WishlistPage />)} />

        {/* Invoice tools */}
        <Route path="/tools/invoice"          element={lazy$(<InvoiceDashboard />)} />
        <Route path="/tools/invoice/create"   element={lazy$(<CreateInvoice />)} />
        <Route path="/tools/invoice/:id"      element={lazy$(<InvoiceDetails />)} />
        <Route path="/tools/invoice/settings" element={lazy$(<InvoiceSettings />)} />

        {/* ── Admin (AdminShell sidebar nested in AppShell) ─────────────── */}
        <Route element={lazy$(<ProtectedRoute requiredRole="admin"><AdminShell /></ProtectedRoute>)}>
          <Route path="/admin"               element={lazy$(<Admin />)} />
          <Route path="/admin/tools/builder" element={lazy$(<ToolBuilder />)} />
          <Route path="/admin/products"      element={lazy$(<ProductManager />)} />
          <Route path="/admin/store/approvals" element={lazy$(<StoreApprovalQueue />)} />
          <Route path="/admin/store/payouts"   element={lazy$(<StorePayoutQueue />)} />
          <Route path="/admin/calculators"   element={lazy$(<CalculatorBuilder />)} />
          <Route path="/admin/users"         element={lazy$(<UserManager />)} />
          <Route path="/admin/revenue"       element={lazy$(<RevenuePage />)} />
          <Route path="/admin/factory"       element={lazy$(<AIFactoryPage />)} />
          <Route path="/admin/image-agent"   element={lazy$(<ImageAgentPage />)} />
          <Route path="/admin/marketing"     element={lazy$(<MarketingAssistant />)} />
          <Route path="/admin/traffic"       element={lazy$(<TrafficGrowth />)} />
          <Route path="/admin/blog"          element={lazy$(<BlogAssistant />)} />
          <Route path="/admin/agents"        element={lazy$(<AgentsMonitor />)} />
          <Route path="/admin/pipeline"      element={lazy$(<AgentControlPage />)} />
          <Route path="/admin/multi-agent"   element={lazy$(<MultiAgentDashboard />)} />
          <Route path="/admin/optimization"  element={lazy$(<OptimizationDashboard />)} />
          <Route path="/admin/intelligence"    element={lazy$(<IntelligenceDashboard />)} />
          <Route path="/admin/auto-campaign" element={lazy$(<AutoCampaignPage />)} />
          <Route path="/admin/marketplace"           element={lazy$(<MarketplaceDashboard />)} />
          <Route path="/admin/expansion"             element={lazy$(<ExpansionCenter />)} />
          <Route path="/admin/revenue-intelligence"  element={lazy$(<RevenueDashboard />)} />
          <Route path="/admin/revenue-optimization"  element={lazy$(<RevenueOptimizationCenter />)} />
          <Route path="/admin/agent-economy"          element={lazy$(<AgentEconomyDashboard />)} />
          <Route path="/admin/agent-marketplace"      element={lazy$(<AgentMarketplaceDashboard />)} />
          <Route path="/admin/self-healing"           element={lazy$(<SelfHealingDashboard />)} />
          <Route path="/admin/failure-analytics"      element={lazy$(<FailureAnalyticsPanel />)} />
          <Route path="/admin/runtime-resilience"     element={lazy$(<RuntimeResilienceCenter />)} />
          <Route path="/admin/seo-dashboard"          element={lazy$(<SeoDashboard />)} />
          <Route path="/admin/seo-agent"              element={lazy$(<SeoAgent />)} />
          <Route path="/admin/programmatic-seo"       element={lazy$(<ProgrammaticSeo />)} />
          <Route path="/admin/seo-audit"              element={lazy$(<SeoAuditEngine />)} />
          <Route path="/admin/crawl-engine"           element={lazy$(<CrawlEnginePage />)} />
          <Route path="/admin/seo-intelligence"       element={lazy$(<SeoIntelligence />)} />
          <Route path="/admin/content-studio"        element={lazy$(<ContentStudioPage />)} />
          <Route path="/admin/automation"            element={lazy$(<AutomationHubPage />)} />
          <Route path="/admin/landing-builder"       element={lazy$(<LandingBuilderPage />)} />
          <Route path="/admin/content-engine"       element={lazy$(<ContentEnginePage />)} />
        </Route>
      </Route>

      {/* ── 404 fallback ─────────────────────────────────────────────────── */}
      <Route path="*" element={lazy$(<NotFoundPage />)} />

    </Routes>
  )
}
