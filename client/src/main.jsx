import './index.css';
import './App.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppProviders } from './app/providers';
import ErrorBoundary from './shared/components/ErrorBoundary';
import { initMonitoring } from './monitoring';
import { validateRegistry, validateEnv } from './safety';
import { ADSENSE_CONFIG, ADS_ACTIVE } from './adsense.config';

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
const root   = ReactDOM.createRoot(rootEl);

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppProviders />
    </ErrorBoundary>
  </React.StrictMode>
);

// Remove visibility:hidden guard — React has begun rendering
rootEl.classList.add('mounted');
