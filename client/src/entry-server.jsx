/**
 * entry-server.jsx — Batch 0A SSG proof-of-concept entry point.
 *
 * Scope: exactly 3 routes (/, /tools/merge-pdf, /privacy-policy). This is a
 * PARALLEL render path — it does not import main.jsx, App.jsx, routes.jsx,
 * or AppProviders. Those stay untouched; the existing SPA/prerender.js
 * pipeline is unaffected by this file's existence.
 *
 * Why not reuse App.jsx: App.jsx gates its whole tree behind
 * useAuth().isLoading, which starts true and only flips inside a
 * useEffect (never runs during renderToString) — reusing it here would
 * render only the "Loading AWE-OS…" splash. This entry composes the
 * minimal provider stack each of the 3 pages actually needs instead.
 */

import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import { HelmetProvider } from 'react-helmet-async'
import { AuthProvider } from './modules/auth/context/AuthContext'
import PublicLayout from './components/PublicLayout'
import Home from './pages/Home'
import PrivacyPolicy from './pages/PrivacyPolicy'
import MergePDF from './pages/tools/pdf/MergePDF'

// Small publicRoutes data-router array — ONLY these 3 routes, per Batch 0A scope.
export const SSG_ROUTES = [
  { path: '/',                Page: Home,          outFile: 'index.html' },
  { path: '/tools/merge-pdf', Page: MergePDF,       outFile: 'tools/merge-pdf/index.html' },
  { path: '/privacy-policy',  Page: PrivacyPolicy,  outFile: 'privacy-policy/index.html' },
]

export function renderRoute(path, Page) {
  const helmetContext = {}

  const html = renderToString(
    <HelmetProvider context={helmetContext}>
      <StaticRouter location={path}>
        <AuthProvider>
          <PublicLayout>
            <Page />
          </PublicLayout>
        </AuthProvider>
      </StaticRouter>
    </HelmetProvider>
  )

  const { helmet } = helmetContext
  return { html, helmet }
}
