import './index.css';
import './App.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppProviders } from './app/providers';
import ErrorBoundary from './shared/components/ErrorBoundary';
import { initMonitoring } from './monitoring';
import { validateRegistry, validateEnv } from './safety';
import { ADSENSE_CONFIG, ADS_ACTIVE } from './adsense.config';
import { isSsgRoute, isHydrationSafe } from './ssgRoutes';
import { SSG_PATHS } from './ssgRoutes.generated';

// Bootstrap Web Vitals and performance monitoring
initMonitoring()

// AdSense loader — only injected when a publisher ID is configured, so
// activation stays a single env var (VITE_ADSENSE_PUBLISHER_ID) flip.
if (ADS_ACTIVE) {
  const loader = document.createElement('script');
  loader.async = true;
  loader.crossOrigin = 'anonymous';
  loader.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CONFIG.publisherId}`;
  document.head.appendChild(loader);
}

// Dev-time safety checks (no-op in production)
if (import.meta.env.DEV) {
  validateRegistry()
  validateEnv()
}

const rootEl = document.getElementById('root');
const app = (
  <React.StrictMode>
    <ErrorBoundary>
      <AppProviders />
    </ErrorBoundary>
  </React.StrictMode>
);

// Hydrate only when #root already carries matching prerendered markup for
// THIS pathname AND that route's hydration is verified reliable. Three
// independent guards:
//   - hasChildNodes(): false in dev (Vite always serves an empty shell,
//     never prerendered HTML) and false if a build somehow shipped an
//     empty #root — falls back to a clean client render either way.
//   - isSsgRoute(): false for routes vercel.json's catch-all rewrite
//     serves via the fallback dist/index.html (the homepage's own SSG'd
//     shell — /login, /dashboard, /store, etc. all resolve there since
//     they're not in the 129-route prerendered set). Without this check,
//     hydrateRoot would attach that page's React tree to the wrong page's
//     markup.
//   - isHydrationSafe(): false for individual /tools/:slug pages and the
//     /blog family — a 3-run determination sweep found these still hit an
//     early-effect-vs-Suspense-hydration race (root cause not yet
//     isolated). They still get prerendered static HTML (SEO/first-paint
//     unaffected) — this only controls whether the client hydrates or
//     does a clean client render against it.
// See docs/batches/batch-5.6-ssg-hydration.md.
const canHydrate = rootEl.hasChildNodes()
  && isSsgRoute(window.location.pathname, SSG_PATHS)
  && isHydrationSafe(window.location.pathname);

if (canHydrate) {
  ReactDOM.hydrateRoot(rootEl, app);
} else {
  rootEl.replaceChildren(); // clear stale markup (e.g. rewrite-fallback homepage HTML) before a clean mount
  ReactDOM.createRoot(rootEl).render(app);
}

// Remove visibility:hidden guard — React has begun rendering
rootEl.classList.add('mounted');
