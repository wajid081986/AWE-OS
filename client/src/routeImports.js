/**
 * routeImports.js — shared `import()` closures for the SSG-hydrated
 * public routes, batch 5.6b (docs/batches/batch-5.6b-hydration-race.md).
 *
 * `routes.jsx` wraps these in `lazy()` for React Router; `hydratePreload.js`
 * awaits the same closures directly, before `hydrateRoot` is ever called,
 * so the relevant chunk is already resolved by the time React's `lazy()`
 * tries to render it — see hydratePreload.js for why this is what
 * actually closes the hydration race (a lazy() promise settling mid-
 * hydration, not a mismatch in rendered content).
 *
 * Only covers routes that can be part of an SSG'd, hydrated page (per
 * ssgRoutes.js's STATIC_PATHS/CATEGORY_SLUGS/TOOL_SLUGS plus the city/
 * compare/faq/blog-post patterns) — every other route in routes.jsx
 * (login, dashboard, admin, store, calculators, etc.) is never part of
 * a hydrateRoot call and keeps its lazy import inline there, untouched.
 */

export const ROUTE_IMPORTS = {
  home:               () => import('./pages/Home'),
  toolsIndex:         () => import('./pages/ToolsPage'),
  freeTools:          () => import('./pages/FreeToolsPage'),
  categoryPage:       () => import('./pages/CategoryPage'),
  dynamicToolPage:    () => import('./pages/tools/DynamicToolPage'),
  blog:               () => import('./pages/BlogPage'),
  blogPost:           () => import('./pages/BlogPostPage'),
  about:              () => import('./pages/AboutPage'),
  privacyPolicy:      () => import('./pages/PrivacyPolicy'),
  terms:              () => import('./pages/Terms'),
  disclaimer:         () => import('./pages/Disclaimer'),
  editorialPolicy:    () => import('./pages/EditorialPolicy'),
  toolTestingPolicy:  () => import('./pages/ToolTestingPolicy'),
  aiContentPolicy:    () => import('./pages/AiContentPolicy'),
  correctionsPolicy:  () => import('./pages/CorrectionsPolicy'),
  advertisingPolicy:  () => import('./pages/AdvertisingPolicy'),
  contact:            () => import('./pages/ContactPage'),
  cityToolPage:       () => import('./pages/CityToolPage'),
  compareToolPage:    () => import('./pages/CompareToolPage'),
  faqCategoryPage:    () => import('./pages/FaqCategoryPage'),
}
