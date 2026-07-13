# Component Library — Primitives (Batch 2)

Source: `docs/reference/ux-blueprint.md` §10–§12, cross-checked against
`docs/reference/awe-os-homepage.html` and
`docs/reference/tool-page-merge-pdf.html` (both frozen — see CLAUDE.md
§2). All components live in `client/src/components/primitives/` and are
**not yet imported by any page** — this batch is visually inert on
production; adoption is future work.

## Known naming overlap with `client/src/components/ui/`

`Button`, `Badge`, and `Container` exist in both `ui/` (pre-redesign,
raw Tailwind, live on all 129 routes today) and `primitives/` (new,
token-driven, unused). This is deliberate — see
`docs/batches/batch-2-plan.md` for the reasoning. A future batch decides
how existing pages migrate off `ui/`; until then, import path
disambiguates which one you get.

## Verification note

No browser-automation tool was available while building this batch, so
these components have **not been visually rendered and compared against
the reference HTML** — verification was static: every Tailwind
utility/arbitrary-value class was traced through the compiled CSS output
to confirm it resolves to the exact declaration the reference files
specify (colors, radii, shadows, padding, the 560px media query). See
`docs/batches/batch-2-plan.md` verification section. Treat visual
fidelity as unconfirmed until someone opens each component in a browser
against the reference HTML.

## Token addendum

The plan's approved token table (19 entries) missed several component
padding values that only became apparent while writing the components
against the exact reference CSS (`.chip`/`.badge` padding, `.ledger`
padding-x, `.callout` padding in both variants). Added during
implementation, same sourcing method (copied from reference CSS, not
invented): `--chip-padding-y/x`, `--badge-padding-y/x`,
`--ledger-padding-x`, `--callout-padding-y/x`,
`--callout-padding-y-success`, `--text-callout`,
`--text-callout-success`. All in `design-system/tokens.css` /
`globals.css`.

---

## Button

`client/src/components/primitives/Button.jsx`

Two variants only, per Blueprint §12. Renders as `<button>` by default;
pass `as="a"` (or any component) for link-styled buttons, matching the
reference HTML's `<a class="btn btn-primary">` pattern.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `variant` | `'primary' \| 'ghost'` | `'primary'` | primary = cobalt fill; ghost = transparent + line border |
| `size` | `'default' \| 'compact'` | `'default'` | compact matches the reference header nav button's inline `padding:9px 18px` override |
| `as` | component/string | `'button'` | e.g. `as="a"` for a link button |
| `className` | string | `''` | appended, not replaced |

```jsx
<Button variant="primary">Merge PDFs</Button>
<Button variant="ghost" as="a" href="/tools">Browse all 49 tools →</Button>
<Button variant="primary" size="compact" as="a" href="/tools">Browse 49 Tools</Button>
```

Focus ring (`outline: 3px solid cobalt, offset 2px`) is scoped to this
component only via `focus-visible:*` Tailwind classes — **not** a global
`:focus-visible` rule, unlike the reference HTML. See plan for why
(inertness requirement — `globals.css` is already loaded on all 129
routes).

Source: Blueprint §12; reference `.btn`/`.btn-primary`/`.btn-ghost`.

---

## Chip

`client/src/components/primitives/Chip.jsx`

Pill used for the hero's verifiable-fact row ("✓ 100% browser-based").
Distinct from `Badge` — see reference HTML, where `.chip` and `.badge`
are two separately-named, differently-sized classes.

| Prop | Type | Default |
|---|---|---|
| `icon` | node | — (renders inside a bold, mint-colored `<strong>`) |
| `children` | node | — |
| `className` | string | `''` |

```jsx
<Chip icon="✓">100% browser-based</Chip>
```

Source: reference `.chip`/`.chip strong` (`awe-os-homepage.html`).

---

## Badge

`client/src/components/primitives/Badge.jsx`

Same pill shape as `Chip`, smaller text (`--text-badge`, 0.7rem vs
Chip's 0.74rem), used for tool-page hero badge rows ("✓ 100% free").

| Prop | Type | Default |
|---|---|---|
| `icon` | node | — (renders inside a bold, mint-colored `<b>`) |
| `children` | node | — |
| `className` | string | `''` |

```jsx
<Badge icon="✓">100% free</Badge>
```

Source: reference `.badge`/`.badge b` (`tool-page-merge-pdf.html`).

**Not implemented in Batch 2**: the mono, uppercase, tint-background
mini-tag on `ToolCard` (`.tool-tag` in the homepage reference — "NO
UPLOAD", "INDIA-READY") is a visually different element and belongs to
`ToolCard` (Batch 4), not this primitive.

---

## Ledger

`client/src/components/primitives/Ledger.jsx`

The site's signature element (Blueprint §2). Dashed box, monospace rows,
dotted row dividers, an optional mint highlight for verified/notable
values.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `title` | string | — | optional label above the rows |
| `rows` | `{label, value, highlight?}[]` | `[]` | `highlight: true` renders the value in mint, matching the reference's `.ledger-val.zero` pattern (used for "0 — ever", "NO") |
| `className` | string | `''` | |

```jsx
<Ledger
  rows={[
    { label: 'Tools available', value: '49' },
    { label: 'Signup required (most tools)', value: 'NO', highlight: true },
    { label: 'Your files stored on our servers', value: '0 — ever', highlight: true },
  ]}
/>
```

Source: Blueprint §2, §16; reference `.ledger`/`.ledger-row`/
`.ledger-val`/`.ledger-val.zero` (`awe-os-homepage.html`).

---

## Callout

`client/src/components/primitives/Callout.jsx`

Two variants found in the reference files, both structurally identical
(tinted box + border + strong-colored text), different token sets.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `variant` | `'warning' \| 'success'` | `'warning'` | warning = marigold, matches reference `.callout` ("honest limitation"); success = mint, matches reference `.promise` ("privacy promise") |
| `title` | string | — | optional heading (only `.promise` uses one in the reference) |
| `children` | node | — | body text |
| `className` | string | `''` | |

```jsx
<Callout variant="warning">
  <strong>Honest limitation:</strong> merging very large files on an
  older phone can be slow or fail if memory runs out.
</Callout>

<Callout variant="success" title="🔒 Our privacy promise">
  Files processed by our browser-based tools are never transmitted to,
  stored on, or readable by our servers.
</Callout>
```

Source: Blueprint §10 ("Callout (honesty/warning)"), §23, §28; reference
`.callout` (`tool-page-merge-pdf.html`) and `.promise`
(`awe-os-homepage.html`).

---

## Breadcrumb

`client/src/components/primitives/Breadcrumb.jsx`

Slim mono trail, per Blueprint §15. Uses `react-router-dom`'s `Link` for
internal navigation (matches the rest of the codebase's routing, not the
reference HTML's raw `<a>`, since the reference is a static demo page).

| Prop | Type | Default | Notes |
|---|---|---|---|
| `items` | `{label, href?}[]` | `[]` | last item should omit `href` — renders as `<strong>` (current page), matching the reference exactly |
| `className` | string | `''` | Top spacing (`.crumbs{padding:20px 0 0}` in the reference) is deliberately **not** baked into this component — it's page-layout spacing, the caller's responsibility |

```jsx
<Breadcrumb
  items={[
    { label: 'Home', href: '/' },
    { label: 'PDF Tools', href: '/tools/pdf' },
    { label: 'Merge PDF' },
  ]}
/>
```

Source: Blueprint §15; reference `.crumbs` (`tool-page-merge-pdf.html`).

---

## Section

`client/src/components/primitives/Section.jsx`

Vertical padding wrapper: 72px desktop, 52px at ≤560px (Blueprint §9).
Implemented as a **scoped React component** (className-based), not a
global bare `section{}` selector like the reference HTML uses — avoids
the App.css collision risk Batch 1 already sidestepped for `body`/`h1`/
`p` (confirmed no existing `section` rule in App.css, but scoping stays
the safer choice regardless of that check).

| Prop | Type | Default |
|---|---|---|
| `as` | component/string | `'section'` |
| `className` | string | `''` |

```jsx
<Section>
  <Container>...</Container>
</Section>
```

Source: Blueprint §6, §9; reference `section{padding:72px 0}` +
`@media(max-width:560px){section{padding:52px 0}}`.

---

## Container

`client/src/components/primitives/Container.jsx`

Two widths per Blueprint §6: default content column (1120px) and narrow
prose column (760px, for long-form guide/blog content). Both centered
with 24px side padding.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `size` | `'default' \| 'narrow'` | `'default'` | matches reference `.wrap` (1120px) / `.narrow` (760px, combined with `.wrap`) |
| `className` | string | `''` | |

```jsx
<Container>...</Container>
<Container size="narrow">...</Container>
```

Source: Blueprint §6; reference `.wrap`/`.narrow` (both files).
