# Batch 1 — Design Tokens & Global CSS — Approved Plan

Approved: 2026-07-12. Branch: `batch-1-design-tokens`.

## Context

This plan was reconstructed in-session after the original Batch 1 planning
discussion fell outside the retained conversation context. It is saved here
so future sessions have a durable record instead of reconstructing from
memory. See CLAUDE.md §6 (workflow) for why this file now exists as a rule,
not just a one-off artifact.

## Scope

Playbook §115 batch text: "Implement Batch 1 only: design system foundation.
Create design-system/tokens.css and globals.css implementing Blueprint §3
(typography), §4 (color), §5 (tokens), §9 (spacing scale), §20 (motion).
Wire the three fonts (Bricolage Grotesque, Instrument Sans, JetBrains Mono)
with font-display: swap, subset latin, per the §9 font budget. Do not modify
any page, component, or route. Stop after Batch 1."

## Files to create

- `design-system/tokens.css` — `:root` custom properties: color (Blueprint
  §4), radius (`--radius-s/m/l`), shadow (`--shadow-card`, `--shadow-float`),
  border widths, z-index scale (header 50, modal 100, toast 150), spacing
  scale (§9: 4/8/12/16/24/32/48/72), motion tokens (§20: `--ease`, durations
  150/300/600ms).
- `design-system/globals.css` — `@font-face` declarations for the three
  fonts (Google Fonts, `font-display: swap`, latin subset) plus typography
  as font-stack custom properties and non-colliding utility classes
  (`.ds-h1`, `.ds-h2`, `.ds-h3`, `.ds-body`, `.ds-small`, `.ds-caption`,
  `.ds-mono-eyebrow`) implementing the §3 type scale. **No bare element
  selectors** (`body`, `h1`, `p`, …) — see risk #1 below.

## Files to modify

- `client/tailwind.config.js` — `theme.extend` maps token names to
  `var(--token-name)` so future components can use `bg-cobalt`,
  `text-ink`, `rounded-m`, etc. without duplicating raw values.
- `client/src/index.css` — add `@import` for `tokens.css` and
  `globals.css` (resolved relative to `design-system/`), ordered before
  the existing `@tailwind` directives.
- `docs/backlog.md` — two additions (see below).

## Approach

Tokens ship as plain CSS custom properties, not Tailwind-only config,
satisfying §4's "no raw hex/px/ms in components" rule while staying
framework-agnostic (the codebase is Vite + React, not Next.js — see risk
#2). Nothing in the existing component tree is changed to consume these
tokens yet; that migration is later-batch work (Primitives, batch 2+).

## Risk #1 — App.css collision (resolved: inert-only globals.css)

`client/src/App.css` is legacy "Resume Builder — Dark Professional Theme"
CSS that sets bare `body { font-family: 'Inter'; background: #0a0a0f;
color: #f1f5f9; }` and is imported in `main.jsx` *after* `index.css`, so it
wins the cascade on every bare-selector collision. Blueprint §3/§4 want a
light paper/ink theme applied via bare `body`/`h1` selectors eventually —
doing that now would visually change already-rendered output and break the
byte-diff verification this batch is required to pass. Resolution:
`globals.css` for Batch 1 is **additive-only** — custom properties and
net-new classes nothing currently references — so it is inert by
construction. Retiring App.css in favor of token-driven global typography
is backlogged (see below), not part of Batch 1.

## Risk #2 — Next.js vs. actual stack (resolved: CLAUDE.md updated this batch)

`docs/reference/architecture.md` specifies Next.js App Router; the actual
codebase is Vite + React SPA with a custom SSG pipeline
(`client/scripts/ssg-build.js`, `client/src/entry-server.jsx`, shipped in
batch-0a/0b). CLAUDE.md §5's Next.js-specific language ("Server components
by default," `"use client"` only in `components/islands/`) has been
rewritten this batch to describe the actual SSG-entry + hydration model.
architecture.md itself is a frozen source-of-truth document and is *not*
edited (CLAUDE.md §2) — the mismatch is flagged here and in CLAUDE.md's
changelog for whoever next reconciles that doc.

## Risk #3 — Font loading vs. SSG shell

Fonts must not visually shift the SSG-rendered shell between raw HTML and
post-hydration paint. `font-display: swap` covers the FOUT case; no other
mitigation needed since Batch 1 doesn't apply the fonts to any rendered
element yet (risk #1).

## Backlog additions (this batch)

- App.css (legacy dark "Resume Builder" theme, global `body`/font
  overrides) still collides with the Blueprint's light paper/ink theme
  and needs migration to consume design-system tokens once components
  start being rebuilt — currently left in place untouched (protected by
  inert-only globals.css, risk #1).
- Batch 1B — hide "ADVERTISEMENT" placeholder boxes on public pages
  (render nothing when no publisher approval); keep components + ads.txt.

## Explicitly out of scope

- Ad-placeholder visual changes (would break byte-diff verification;
  becomes Batch 1B immediately after this merges).
- Any page, component, or route change.
- Migrating App.css or any component off hardcoded values.

## Verification

`npm run build` (Vite build + `ssg-build.js`) against the branch, byte-diff
of `client/dist/**/index.html` (129 route files) against a `main` build,
plus a branch preview deploy. Expected diff: none in body/head content;
the shared shell's CSS `<link>` asset-hash line will change uniformly
across all 129 files once `tokens.css`/`globals.css` join the bundle via
`index.css` — this is disclosed as expected, not a regression.
