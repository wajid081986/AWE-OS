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
        mint: 'var(--mint)',
        line: 'var(--line)',
      },
      borderRadius: {
        s: 'var(--radius-s)',
        m: 'var(--radius-m)',
        l: 'var(--radius-l)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        float: 'var(--shadow-float)',
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
        mono: 'var(--font-mono)',
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
