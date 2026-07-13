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

---

# Cards & Strips (Batch 4)

Live in `client/src/components/cards/` — composite/molecule-level
components, distinct from the atomic `primitives/` roster (matches
architecture.md §3's `components/cards/` structure). **Not yet imported
by any page** — this batch is visually inert on production, same as
Batch 2; adoption is future work (Batch 5+).

## Known naming overlap with `client/src/components/ToolCard.jsx`

The existing `ToolCard.jsx` (top-level `components/`, not `cards/`) is
live today, imported by `ToolsPage.jsx` and `ToolDetailPage.jsx`. It is a
different component with different props and styling (raw Tailwind gray/
blue palette, pre-redesign) from `cards/ToolCard.jsx` below. Same
deliberate-duplication situation as Batch 2's `ui/`-vs-`primitives/`
overlap — a future adoption batch decides how existing pages migrate;
until then, import path disambiguates which one you get.

## ToolCard

`client/src/components/cards/ToolCard.jsx`

40px cobalt-tint icon square, title, two-line description, and a
mandatory mono tag row.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `icon` | node | — | rendered inside the 40px icon square |
| `name` | string | — | |
| `description` | string | — | two-line clamp |
| `to` | string | — | route, via `react-router-dom` `Link` |
| `tag` | `{ label: string, variant: 'no-upload' \| 'india-ready' \| 'ai-assisted' }` | — | **mandatory per Blueprint §11** ("the tag row is mandatory — it repeats the differentiation on every single card"), not technically enforced by the component |
| `className` | string | `''` | |

```jsx
<ToolCard
  icon="📎"
  name="Merge PDF"
  description="Combine multiple PDF files into one document."
  to="/tools/merge-pdf"
  tag={{ label: 'No upload', variant: 'no-upload' }}
/>
```

**Deviates from the reference file, deliberately:**
- **Tag color assignment** — the reference HTML's `.tool-tag` class is a
  single mint style applied to all six example tags regardless of label
  ("No upload," "India-ready," "FY 2026-27," "AI-assisted" all render
  identically). This component instead gives each `variant` its own
  color (`no-upload`→mint, `india-ready`→marigold, `ai-assisted`→cobalt),
  interpreting Blueprint §11's "in *their* tint colors" (plural) as
  intending three distinct colors. Approved 2026-07-13.
- **Tag text color** — even where the reference does specify a color
  (`no-upload`, raw `--mint` on `--mint-tint`), it measures ≈3.05:1,
  failing WCAG AA (needs 4.5:1 at this text size). Uses `--mint-text-strong`
  / `--marigold-text-strong` instead of raw `--mint`/`--marigold` (both
  Batch 2 tokens, originally built for `Callout`'s tinted backgrounds) —
  ≈8.0:1 and ≈7.5:1 respectively. `ai-assisted` uses raw `--cobalt` on
  `--cobalt-tint` (≈6.5:1), which already passes — no change needed
  there, matches the reference's own cobalt-as-link-color pattern.

Hover: translateY(-3px) + border→cobalt + `--shadow-card-hover`,
`motion-reduce:` respected. Source: Blueprint §11; reference `.tool-card`/
`.tool-icon`/`.tool-tag` (`awe-os-homepage.html`).

## CategoryRow

`client/src/components/cards/CategoryRow.jsx`

Full-width prose row: name + count on the left, description prose in the
middle, a view-all link on the right. `170px 1fr auto` grid on desktop,
collapses to one column at `md:` (768px — Tailwind default, not the
reference's literal 960px, consistent with Batch 3's Header breakpoint
simplification).

| Prop | Type | Default | Notes |
|---|---|---|---|
| `name` | string | — | |
| `count` | number | — | rendered as `{count} TOOLS`, mono, uppercase |
| `description` | **ReactNode** | — | not a raw string — the reference's `.cat-desc` embeds inline links inside prose; accepting children lets a page compose `<CategoryRow description={<>text <Link to="...">link</Link></>}>` without `dangerouslySetInnerHTML` |
| `to` | string | — | view-all link route |
| `linkLabel` | string | — | e.g. `"View PDF tools →"` |
| `className` | string | `''` | |

```jsx
<CategoryRow
  name="PDF Tools"
  count={21}
  description={<>Merge, split, compress, and convert PDFs. Start with <Link to="/tools/merge-pdf">Merge PDF</Link>.</>}
  to="/tools#pdf"
  linkLabel="View PDF tools →"
/>
```

**Deviates from the reference:** `.cat-count{color:var(--marigold)}` on
white/`--card` measures ≈2.7:1 — fails AA. Uses `--marigold-text-strong`
instead (≈7.5:1), same fix category as ToolCard's tag.

**No hover** — the reference defines no `.cat:hover` rule; this is a
static content block, not a single-anchor card. Approved as a
reference-specified exception to the shared card-hover grammar.

Source: Blueprint §11 (roster: §10); reference `.cat`/`.cat-name`/
`.cat-count`/`.cat-desc`/`.cat-link` (`awe-os-homepage.html`).

## BlogCard

`client/src/components/cards/BlogCard.jsx`

7px gradient band (cobalt→marigold), mono meta row, title, excerpt, and
an author row with an initials avatar.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `to` | string | — | |
| `category` | string | — | meta row first item |
| `updatedDate` | string | — | pre-formatted, e.g. `"Updated Jul 2026"` — formatting is the consuming page's job, matching `Ledger`'s pre-formatted `value` strings |
| `title` | string | — | |
| `excerpt` | string | — | |
| `authorInitials` | string | — | avatar text |
| `authorName` | string | — | |
| `readTime` | string | — | e.g. `"9 min read"` |
| `className` | string | `''` | |

```jsx
<BlogCard
  to="/blog/old-vs-new-tax-regime"
  category="Personal Finance"
  updatedDate="Updated Jul 2026"
  title="Old vs New Tax Regime in FY 2026-27"
  excerpt="A worked comparison across five income levels."
  authorInitials="AK"
  authorName="Team AWE-OS"
  readTime="9 min read"
/>
```

**Deviates from the reference, deliberately — approved 2026-07-13:** the
reference's `.post:hover` sets translateY(-3px) + shadow but **omits**
border-color→cobalt, unlike `.tool-card:hover` which sets all three.
Blueprint §11 says the hover grammar is shared across "all cards" — this
component adds border-color→cobalt to BlogCard's hover so every card
uses one consistent grammar, treating the reference's omission as a gap
rather than a deliberate exception (unlike RelatedToolCard's hover,
below, which the reference specifies completely and deliberately).

Source: Blueprint §11; reference `.post`/`.post-band`/`.post-body`/
`.post-meta`/`.post-author`/`.avatar` (`awe-os-homepage.html`).

## RelatedToolCard

`client/src/components/cards/RelatedToolCard.jsx`

Compact card: title + one description line. Used inside articles/tool
pages in a 3-up grid (the grid itself is the consuming page's concern,
not this component's).

| Prop | Type | Default | Notes |
|---|---|---|---|
| `to` | string | — | |
| `title` | string | — | |
| `description` | string | — | one line |
| `className` | string | `''` | |

```jsx
<RelatedToolCard
  to="/tools/split-pdf"
  title="Split PDF"
  description="The reverse operation — break one PDF into separate files or page ranges."
/>
```

**Hover — reference-specified exception, not an interpretation call:**
border→cobalt + translateY(**-2px**, not -3px) + **no shadow**, exactly
as `.rel-card:hover` specifies. Blueprint's own prose already anticipates
a lighter treatment here ("compact... used only inside articles").

Source: Blueprint §11; reference `.rel-card` (`tool-page-merge-pdf.html`).

## StatsStrip

`client/src/components/cards/StatsStrip.jsx`

Ink-background strip, 4-up grid (collapses to 2-up at `md:`), each stat a
large mono numeral over a small dimmed label. Uses the `Container`
primitive internally for the constrained content width, same pattern as
`Footer`.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `stats` | `{ value: string, suffix?: string, label: string }[]` | `[]` | `suffix` renders in marigold, e.g. the "+" in "49+" |
| `className` | string | `''` | |

```jsx
<StatsStrip
  stats={[
    { value: '49', suffix: '+', label: 'free tools across 5 categories' },
    { value: '21', label: 'PDF utilities — merge to sign' },
    { value: '13', label: 'calculators built for Indian finance' },
    { value: '0', label: 'files ever uploaded to our servers' },
  ]}
/>
```

Checked `--statsstrip-text-dim` (`rgba(255,255,255,.65)`) against `--ink`
before implementing: ≈7.9:1, passes AA comfortably — no fix needed here,
unlike the footer's `.45` (Batch 3).

No hover — static, non-interactive strip, matches the reference (no
`.strip:hover`/`.stat:hover` rule exists).

Source: Blueprint §10/§11, §30 (homepage IA "Stats strip"); reference
`.strip`/`.stat` (`awe-os-homepage.html`).
