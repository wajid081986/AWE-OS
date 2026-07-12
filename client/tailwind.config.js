/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      // design-system/tokens.css + globals.css (Batch 1). Maps token
      // names to the CSS custom properties so components can consume
      // e.g. `bg-cobalt`, `rounded-m`, `shadow-card`, `font-display`
      // instead of raw hex/px/ms values (CLAUDE.md §4). Not yet used
      // by any component — additive only, see docs/batches/batch-1-plan.md.
      colors: {
        ink: 'var(--ink)',
        'ink-soft': 'var(--ink-soft)',
        paper: 'var(--paper)',
        card: 'var(--card)',
        cobalt: 'var(--cobalt)',
        'cobalt-deep': 'var(--cobalt-deep)',
        'cobalt-tint': 'var(--cobalt-tint)',
        marigold: 'var(--marigold)',
        'marigold-tint': 'var(--marigold-tint)',
        'marigold-border': 'var(--marigold-border)',
        'marigold-text-strong': 'var(--marigold-text-strong)',
        mint: 'var(--mint)',
        'mint-tint': 'var(--mint-tint)',
        'mint-border': 'var(--mint-border)',
        'mint-text-strong': 'var(--mint-text-strong)',
        line: 'var(--line)',
      },
      borderRadius: {
        s: 'var(--radius-s)',
        m: 'var(--radius-m)',
        l: 'var(--radius-l)',
        ledger: 'var(--radius-ledger)',
        callout: 'var(--radius-callout)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        float: 'var(--shadow-float)',
        button: 'var(--shadow-button)',
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
        mono: 'var(--font-mono)',
      },
      maxWidth: {
        content: 'var(--content-width)',
        'content-narrow': 'var(--content-width-narrow)',
      },
      transitionTimingFunction: {
        'ds-ease': 'var(--ease)',
      },
      transitionDuration: {
        micro: 'var(--duration-micro)',
        structural: 'var(--duration-structural)',
        ambient: 'var(--duration-ambient)',
      },
    },
  },
  plugins: [],
};
