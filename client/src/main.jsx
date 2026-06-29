import './index.css';
import './App.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppProviders } from './app/providers';
import ErrorBoundary from './shared/components/ErrorBoundary';
import { initMonitoring } from './monitoring';
import { validateRegistry, validateEnv } from './safety';

// Bootstrap Web Vitals and performance monitoring
initMonitoring()

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
