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
import { preloadForHydration } from './hydratePreload';

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
//
// window.__AWE_FORCE_HYDRATE__: test-only override for Batch 5.6b's
// hydration-race stress harness (docs/batches/batch-5.6b-hydration-race.md).
// Undefined in all real traffic — only Playwright's page.addInitScript()
// sets it, to force hydrateRoot on isHydrationSafe()-excluded routes so
// the harness can actually exercise the race those routes are gated
// against, instead of testing the inert createRoot fallback. Widens the
// hydrate path only, never narrows it — production behavior when this is
// unset is byte-identical to before this line existed. Kept intentionally
// past Batch 5.6b's end: future determination sweeps need this to
// re-test excluded routes before isHydrationSafe() is ever expanded.
const canHydrate = rootEl.hasChildNodes()
  && isSsgRoute(window.location.pathname, SSG_PATHS)
  && (window.__AWE_FORCE_HYDRATE__ === true || isHydrationSafe(window.location.pathname));

// Batch 5.6b (docs/batches/batch-5.6b-hydration-race.md): root cause of
// the #421/#422 hydration race was entry-server.jsx's SSR output never
// actually suspending (every page imported directly, no lazy()), while
// the client MUST resolve one or more lazy() chunks before it can render
// the same tree — any real resolution latency lets that chunk's promise
// "ping" its Suspense boundary mid-hydration. Fix: resolve every lazy
// import the matched route needs BEFORE calling hydrateRoot, so nothing
// is left to resolve asynchronously once hydration starts. This is why
// mount() is async — hydrateRoot below simply isn't reached until
// preloadForHydration's awaits settle. No UX cost: the SSG'd HTML is
// already painted on screen for the whole wait, and the page wasn't
// interactive before this chunk loaded either way.
async function mount() {
  if (canHydrate) {
    await preloadForHydration(window.location.pathname);
    ReactDOM.hydrateRoot(rootEl, app);
  } else {
    rootEl.replaceChildren(); // clear stale markup (e.g. rewrite-fallback homepage HTML) before a clean mount
    ReactDOM.createRoot(rootEl).render(app);
  }

  // Remove visibility:hidden guard — React has begun rendering
  rootEl.classList.add('mounted');
}

mount();
