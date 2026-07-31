# Batch 43 — Video Agent module

## Scope

Build a Video Agent admin module, following the Image Agent pattern exactly,
per CLAUDE.md §3a (Admin Panel — Allowed Scope for new internal agent
modules). `/admin/video-agent` is explicitly listed as open in that
exception; Video Agent is the "Phase 2" module named there.

## New files (mirrors Image Agent 1:1)

| File | Notes |
|---|---|
| `server/db/migrations/036_video_generations.sql` | Same shape as `035_image_generations.sql` — table + `generated_at` index + RLS enabled |
| `server/core/video-agent/generator.js` | `generateVideo()` via Replicate `wan-ai/wan2.7-t2v` / `wan2.7-i2v`, same folded-prompt pattern as `image-agent/generator.js` |
| `server/core/video-agent/history.js` | `saveGeneration/getHistory/deleteGeneration` against `video_generations` |
| `server/core/video-agent/index.js` | Barrel export, same as image-agent's |
| `server/routes/admin-video-agent.js` | Same `requireAuth`+`requireAdmin` pattern, POST generate / GET history / DELETE history/:id |
| `client/src/modules/admin/video-agent/VideoAgent.jsx` | Same dark-card structure as `ImageAgent.jsx`; mode toggle, prompt card, cycling loading messages (15s interval), `<video>` result + history grid |

**Deliberate deviation from the batch prompt's sample code:** the prompt's
`history.js` snippet takes `supabase` as a function argument. The actual,
live `image-agent/history.js` doesn't — it imports the singleton via
`require('../../db/supabase')` directly. Per "follow EXACT same pattern as
Image Agent," the real file wins over the snippet — no `supabase` param.

## Existing files — one additive line each (CLAUDE.md §3a limit)

1. `AdminShell.jsx` — insert Video Agent nav entry (badge `NEW`) after Image
   Agent in `NAV_ITEMS`.
2. `AdminPage.jsx` — insert Video Agent into `QUICK_ITEMS` after Image Agent.
3. `client/src/app/routes.jsx` — one lazy import line + one
   `<Route path="/admin/video-agent">` line inside the existing AdminShell
   protected block.
4. `server/index.js` — one `require('./routes/admin-video-agent')` line, one
   `app.use('/api/admin/video-agent', adminLimiter, ...)` line (matching the
   `admin-image-agent` registration), and one timeout-override middleware
   line for the generate route (5 min), matching the existing codegen
   pattern at the top of that route registration.

## New dependency (approved by user)

- **Package:** `replicate` (official Node client), v1.4.0
- **Reason:** required to call `replicate.run()` for Wan 2.7 text/image-to-video
- **Size cost:** ~147 KB unpacked, zero runtime dependencies, requires Node ≥18
- Installed via `npm install replicate` in `server/`

## Explicitly out of scope for this batch

- `.env` / Render env vars — `REPLICATE_API_TOKEN` must be added by the user
  locally and in Render; not touched by Claude Code (no `.env` access).
- Migration 036 is created as a file only — run manually in Supabase SQL
  Editor by the user, not executed live by Claude Code.
- Model slugs `wan-ai/wan2.7-t2v` / `wan-ai/wan2.7-i2v` are used exactly as
  specified by the user. Not independently verified against Replicate's
  current model catalog — flagged as a pre-go-live check, not a build
  blocker (per user: $0 credit is fine for building; errors only surface on
  an actual Generate click).

## Risks

- Wan 2.7 generation is long-running (2–5 min); Express's default socket
  timeout could still cut this short even with `req.setTimeout` — same risk
  class as the existing codegen route, not a new risk introduced here.
- File count: 6 new files + 4 one-line edits = 10 files, well under the
  25-file mass-change threshold (CLAUDE.md §7).
