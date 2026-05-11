/**
 * Named preload functions for high-traffic routes.
 * Calling these triggers Vite to download the chunk without rendering.
 * Used by idlePreload.js and routePrefetch.js.
 *
 * Important: import() paths must be static strings — Vite uses them
 * at build time to create the split points.
 */

export const preloadHome          = () => import('../../pages/Home')
export const preloadToolsPage     = () => import('../../pages/ToolsPage')
export const preloadCategoryPage  = () => import('../../pages/CategoryPage')
export const preloadPricingPage   = () => import('../../pages/PricingPage')
export const preloadLoginPage     = () => import('../../modules/auth/pages/LoginPage')

// Tool category preloaders — call when user is browsing a category page
export const preloadMergePDF      = () => import('../../pages/tools/pdf/MergePDF')
export const preloadResumeBuilder = () => import('../../pages/tools/ai/ResumeBuilder')
export const preloadContentWriter = () => import('../../pages/tools/ai/ContentWriter')
