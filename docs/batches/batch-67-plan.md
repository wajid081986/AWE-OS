# Batch 67 — AI Factory Admin UI Wiring (frontend for Phases 1-4)

Source: `docs/sdd/AWE-OS_AI-Factory_Advancement-SDD.md`. Backend for Phases
1-4 (batches 62-66) is complete, merged, and live-verified. Nothing in it
is reachable from the admin UI yet — this batch wires the existing admin
factory page to the real endpoints.

## Research findings (before proposing anything)

**File:** `client/src/modules/admin/factory/AIFactoryPage.jsx` — 4 tabs
(`⚡ Generate Tool`, `💡 AI Ideas`, `📋 My Ideas`, `⚖️ Compare`). This batch
only touches the **Generate Tool** tab (tab id `'tool'`).

**Confirmed bug (item 2):** `handleGenerate` (line 269) calls
`fetch('/api/generate-tool', ...)` with a raw `fetch` + manual
`x-admin-secret` header — this route does not exist server-side (confirmed
404 in the earlier audit, and confirmed again just now: `factory.routes.js`
only defines `POST /api/factory/generate`). **This means the "⚡ Generate
Tool" button has never worked end-to-end** — every click has always
thrown, which is why the actual post-generation UI (`ToolPreviewCard`,
"Publish Tool →") has effectively never been exercised against real data.

**A second, tightly-coupled bug this surfaces (not asked for directly, but
unavoidable — see "Corollary fix" below):** `POST /api/factory/generate`
already **inserts the tool into `tools`** server-side (`approved: false`)
and returns that saved row as `tool` — confirmed by reading
`runFactory()` in `ai-factory.service.js` (lines 283-354: `insertRow` →
`supabase.from('tools').insert(insertRow)` → `return { success: true,
tool: newTool }`). The current `handlePublish` (line 355) assumes the
opposite — that `tool` is an *unsaved* draft — and does a second
`POST /api/tools` to insert it. Once the URL bug is fixed and `/generate`
actually returns a real, already-inserted row, clicking "Publish Tool →"
would try to **insert a second, duplicate tools row** for the same
product. This has to be fixed in the same batch or "Generate" would work
but "Publish" would immediately break in a new way.

**"Generated-tools review/approval list" (item 5 target):** I looked for a
dedicated multi-row "pending tools" queue and found none scoped to AI
Factory. The two candidates:
- `ToolBuilder.jsx` (`client/src/modules/admin/tools/builder/`) — single-
  tool editor with an `Approved` toggle, opened via `?id=`. Not a list —
  one tool at a time.
- The **"Session History" panel** inside `AIFactoryPage.jsx` (right column
  of the Generate Tool tab, lines 576-608) — a real list of rows, one per
  generated tool, populated on mount from `GET /api/factory/jobs` and
  appended to client-side after each successful generate.

Session History is the literal list-with-rows match, so that's what I'm
targeting for item 5. **One data caveat:** `GET /api/factory/jobs`
(`factory.routes.js` lines 50-65) intentionally does a plain
`SELECT * FROM factory_jobs` — no join to `tools` — to avoid FK-join
errors ("Intentionally simple SELECT * — avoids FK join errors if tools
relation isn't configured in Supabase"). That means rows loaded from
history on page load will **not** carry `product_type`/`slug`/
`packaging_metadata` (their `job.tool` will be `null`, same as today).
Only tools generated **in the current browser session** (added client-side
via `addToJobs` right after a successful generate) will have full tool
data to show a product_type badge / download link / packaging blurb on.
Fixing the historical case would mean touching the `/jobs` route — out of
scope (no backend changes this batch). I'll surface this as a known gap
rather than silently limit the feature.

**Not found / not touched:** `AgentControlPage.jsx`'s "Decisions" and
"Optimization" tabs also list `tools` rows with approve/reject actions,
but those belong to the separate agent-pipeline/decision-engine system
(`/api/decision/*`) that SDD §8/§9 explicitly protects — not touched.

## Scope for this batch (client-side only, 3 files)

### File 1: `client/src/modules/admin/factory/AIFactoryPage.jsx`

**Commit 1 — bug fix, isolated:** `handleGenerate` — replace the raw
`fetch('/api/generate-tool', ...)` block with
`api.post('/api/factory/generate', { category, idea, product_type: productType })`,
using the same `api` axios instance already imported and already used
elsewhere in this file (`handlePublish`, job history load) — drops the
now-dead manual `x-admin-secret` header entirely (the axios instance
already attaches `Authorization: Bearer` via its interceptor, same as
every other admin call in this file). Parsing stays the same
(`responseData.tool || responseData` still matches the real
`{jobId, status, tool}` response shape).

**Commit 2 — corollary fix, called out separately:** `handlePublish` +
`ToolPreviewCard` — since `tool.id` is now real and already inserted the
moment generation succeeds, change "Publish Tool →" from *insert* to
*approve*: `api.put(`/api/tools/${generatedTool.id}`, { approved: true })`
(same `PUT /api/tools/:id` endpoint `ToolBuilder.jsx` already uses to set
`approved`). Drop the `savedId` concept (no longer meaningful — the row
was never unsaved) and drive the button's disabled/label state off
`tool.approved` instead: `disabled={publishing || tool.approved}`,
label `tool.approved ? 'Approved ✓' : 'Publish Tool →'`. "Edit in Builder"
and "Generate Another Tool" are unaffected.

**Commit 3 — product_type selector (item 3):** new state
`const [productType, setProductType] = useState('prompt-tool')`. UI: the
existing single-column "Category" field becomes a 2-column row —
`Category` (unchanged select) next to a new `Product Type` select with
the 5 known values:
```
prompt-tool       → "Prompt Tool (default)"
static-bundle     → "Static Bundle"
ui-kit            → "UI Kit"
notion-template   → "Notion Template"
browser-extension → "Browser Extension"
```
Sent as `product_type: productType` in the `/api/factory/generate` body
(commit 1's payload). Not sent anywhere else — Ideas/Analyze/Blueprint
calls are untouched (those are prompt-tool-shaped intelligence features,
out of scope).

**Commit 4 — "Check demand" action (item 4):** new state
`const [demandCheck, setDemandCheck] = useState({ loading: false, result: null, error: null })`.
A small outlined button directly under the Category/Product Type row:
`📈 Check demand for this combo` — disabled while `isGenerating` or
`demandCheck.loading`. On click: `api.post('/api/factory/score-idea', { idea, category, product_type: productType })`,
result rendered inline right below the button as a small pill + text, not
a modal — colored by `demand` value (`high-demand` → green,
`saturated` → red/amber, `emerging` → blue, `unrated` → gray, matching
the badge-pill style already used elsewhere in this file, e.g.
`JobStatusBadge`/category pills) followed by the `reasoning` sentence in
muted gray text. This is a separate button from "⚡ Generate Tool" — never
called automatically, never disables/blocks Generate.

**Commit 5 — Session History list enhancements (item 5):** in the
Session History row renderer (line ~589-604):
- When `job.tool?.product_type` is known: show a small capitalized badge
  next to the category text (e.g. `ui-kit`), same pill style as the
  category badge already used in `ToolPreviewCard`.
- When `job.tool?.product_type` is known, non-`'prompt-tool'`, and
  `job.tool?.slug` is known: add a `⬇ Download` link
  (`<a href="${BASE_URL}/api/tools/${slug}/download" target="_blank" rel="noopener noreferrer">`)
  in place of no action today. **Known limitation, disclosed inline in the
  UI, not silently hidden:** the download route allows admins to preview
  unapproved products, but only via an `Authorization: Bearer` header
  (`tools.routes.js` lines 196-205) — a plain `<a href>` navigation can't
  attach that header (it's managed by the axios interceptor for `api.*`
  calls only, not real browser navigations). So the link will 404 until
  the tool is approved. I'll show a small `(approve to enable public
  download)` hint next to the link when `!job.tool.approved`, rather than
  hiding the link or claiming it always works. A fully working pre-approval
  admin preview would need a backend change (e.g. a short-lived signed
  query param) — out of scope, logged to `docs/backlog.md`.
- When `job.tool?.packaging_metadata?.listing` is present: show
  `listing.title` / `listing.description` as a small muted two-line blurb
  under the row (only rendered when present — always `undefined` for
  `prompt-tool` rows, since packaging only runs for non-prompt types).

`BASE_URL` for the anchor: inline the same
`import.meta.env.VITE_API_URL || 'https://awe-os.onrender.com'` expression
already used in `api.service.js`, kept local to this file rather than
exporting a new constant from the shared service — smaller diff, no
change to a file used by the rest of the app.

### File 2 & 3: none — no other files need changes to satisfy the 5 scope
items. (`ToolBuilder.jsx` is deliberately left untouched — see "Known
limitation" below.)

## Known limitations / explicitly deferred (flagging, not fixing here)

- **`ToolBuilder.jsx`'s "Edit in Builder" button** still opens the same
  prompt-tool-shaped editor (Input Fields + AI Prompt sections) for
  *every* product type, including non-prompt-tool ones. It won't corrupt
  anything — `PUT /api/tools/:id` only updates the keys ToolBuilder sends
  (`input_fields`/`ai_prompt`/basic fields), so `asset_url`/`product_type`/
  `packaging_metadata` are left alone by Supabase's partial update — but
  the editor UI itself will look wrong/irrelevant for those types. A
  dedicated non-prompt-tool edit view is a separate, larger batch, not
  part of "wire the existing endpoints" scope. Logged to `docs/backlog.md`.
- **Historical Session History rows** (loaded from `GET /api/factory/jobs`
  on page mount, before this session) will not show product_type/download/
  packaging info, only current-session-generated rows will — see the
  research note above. Logged to `docs/backlog.md` as a possible follow-up
  (`/jobs` route joining `tools` safely).
- **Pre-approval download for admins** shows a link that will 404 until
  approved, with an inline hint rather than working silently — see above.

## Explicitly NOT in this batch (per instructions)

- No backend route/service/schema changes — every endpoint used here
  already exists and is live-verified (`/api/factory/generate`,
  `/api/factory/score-idea`, `/api/tools/:id` PUT, `/api/tools/:slug/download`).
- No changes to `ToolRenderer.jsx`'s execution-side rendering.
- No screenshot/thumbnail UI — `packaging_metadata.listing.screenshots`
  is always `[]` today.
- `tools.status`, `builder-agent.js`, `code-generator.js`,
  `idea-pipeline.js`, `PipelineOrchestrator`, `testing-agent`,
  `AgentControlPage.jsx`'s Decisions/Optimization tabs — untouched.

## Testing (no live Supabase/S3/LLM calls this batch)

- `npm run build` (client) — confirm the SPA build succeeds with the new
  JSX/state.
- Manual code-level trace of the 5 commits' data flow (no live calls):
  confirm `handleGenerate`'s payload shape matches
  `factory.routes.js`'s `/generate` body destructuring exactly, confirm
  `handlePublish`'s new PUT payload matches what `ToolBuilder.jsx` already
  sends successfully for the same field, confirm the `score-idea` request/
  response shape matches batch-66's `scoreIdea()` return shape exactly.

## Open items for your review before I implement

1. Confirm the Session History reading of item 5 (vs. `ToolBuilder.jsx`)
   is what you meant.
2. Confirm the "Publish → approve, don't re-insert" corollary fix
   (Commit 2) — it's necessary for Publish to keep working after Commit 1,
   but it's an extra change beyond the literal ask, so flagging for
   explicit sign-off rather than assuming.
3. Confirm the pre-approval download 404 + inline hint is an acceptable
   stopgap, vs. wanting a backend follow-up batch for it now instead of
   later.
