# CLAUDE.md — AWE-OS Development Protocol

This file is the constitution for all Claude Code work in this repository.
Read it fully before any task. When any instruction in a prompt conflicts
with this file, STOP and ask the user instead of proceeding.

## Changelog

- **2026-07-31** — §3 amended: carved out an explicit Admin Panel
  exception (§3a) for new internal agent modules (Image Agent now, Video
  Agent planned Phase 2), requested by the user after the Image Agent
  build prompt conflicted with the blanket Admin Panel protection. Only
  new, isolated module files are open; the four integration points
  (sidebar, Overview.jsx, App.jsx, server app.js) stay protected except
  for one additive line each. Everything else in §3 is unchanged.
- **2026-07-12** — §5 rewritten: replaced Next.js-specific language
  ("Server components," `"use client"`/`components/islands/`) with the
  actual stack's model (Vite + React SPA, SSG via
  `client/src/entry-server.jsx` / `client/scripts/ssg-build.js`).
  `docs/reference/architecture.md` still describes Next.js App Router —
  that mismatch is flagged here, not silently resolved, since
  architecture.md is frozen (§2) and out of scope to edit. Also added §6
  rule requiring approved plans to be saved under `docs/batches/`.

---

## 1. Project Overview

AWE-OS is a privacy-first online tools platform: 49+ browser-based tools
(PDF utilities, India-focused finance calculators, converters, productivity,
AI tools) where file processing happens client-side — user files are never
uploaded to a server. This is the core product promise; no change may
weaken it.

The platform has two worlds:

- **PUBLIC WEBSITE** (this redesign's entire scope): homepage, /tools,
  category pages, tool pages, blog, policies, search, about/contact.
  Goal: authority-grade quality, SEO, E-E-A-T, and Google AdSense approval.
- **INTERNAL SYSTEMS** (permanently out of scope): everything behind
  Login — Control Panel, Admin Panel, Builder Agent, Marketing Agent,
  internal dashboards. These are production systems used daily by the team.

## 2. Source of Truth (frozen documents — never edit these)

1. `docs/ux-blueprint.md` — UX Blueprint v1.0 (what to build)
2. `docs/architecture.md` — Frontend Architecture v2.1 (how to build it)
3. `docs/reference/awe-os-homepage.html` and
   `docs/reference/tool-page-merge-pdf.html` — visual fidelity references
4. `docs/claude-code-execution-playbook.md` — batch sequence and prompts

Never change architecture decisions, redesign UX, invent new components,
alter navigation structure, or add routes outside the route table in
architecture.md §2. If a document seems wrong or two documents conflict,
report it and wait — do not "fix" documents or improvise around them.

## 3. Protected Zones (never modify, never read-and-refactor)

- **Login**: the Login link opens the internal Control Panel. Never modify
  auth logic, its route, its destination, or session handling. Its only
  permitted change is visual restyling as the header's rightmost ghost
  link per Blueprint §15.
- **Internal namespace**: any code serving `/app/*` (or the auth
  subdomain), the Admin Panel, Control Panel, Builder Agent, or Marketing
  Agent. Do not edit, rename, move, reformat, or "clean up" these files —
  even if linters complain about them. Exclude them from lint/test scope
  instead.
- **Public copy hygiene**: never mention Builder Agent, Marketing Agent,
  Admin, Control Panel, or any internal terminology in public page
  content, metadata, or schema.
- **Privacy promise**: never add code that transmits user file names,
  file contents, or tool inputs to any server — including in analytics,
  error monitoring (beforeSend must scrub these), or logging.

### 3a. Admin Panel — Allowed Scope (Internal Agent Modules)

Narrow, explicit exception to §3's Admin Panel protection, for building
new self-contained internal agent modules only.

**Open** for Claude Code work:

- `/admin/image-agent` (Image Agent module — new)
- `/admin/video-agent` (Video Agent module — future Phase 2)
- Any new agent module under `client/src/modules/admin/` that does NOT
  modify existing agents
- `server/routes/admin-image-agent.js` and similar NEW route files
- `server/core/image-agent/` and similar NEW core directories

**Still protected** (do not touch beyond the one additive line noted):

- `AdminSidebar.jsx` — read-only to learn the pattern; add ONE new nav
  entry only
- `Overview.jsx` — read-only to learn the pattern; add ONE new card only
- `App.jsx` — add ONE new route import + route only
- `server/app.js` (or equivalent main server file) — add ONE new route
  registration only
- All existing agent files (CrawlEngine, BlogAssistant, etc.) — unchanged

This exception does not reopen the rest of §3: public copy hygiene, the
privacy promise, and the Login/auth restriction all still apply in full.

## 4. Design System Rules

- All colors, spacing, radii, shadows, borders, and motion durations come
  from `design-system/tokens.css`. A raw hex, px, or ms value in a
  component is a defect.
- Only the components defined in Blueprint §10 exist. Need something new?
  Log it in `docs/backlog.md` and ask — do not create it.
- Two button variants only (primary, ghost). One accent color for actions
  (cobalt). Marigold is never a button or body text.
- Every new route must serve complete HTML with JavaScript disabled.
  Interactive tools are client islands inside static shells.

## 5. Coding Standards

- Match the existing stack and patterns found in the repository; do not
  introduce a new styling approach, state library, or framework feature
  the codebase doesn't already use.
- No new npm dependencies without stating the package, reason, size cost,
  and getting explicit approval first.
- Pages render via the SSG entry (`client/src/entry-server.jsx`,
  `client/scripts/ssg-build.js`) into static HTML shells; there are no
  server components in this stack. Browser-only interactivity lives in
  components that are SSR-safe (no module-scope browser APIs — no
  `window`/`document`/`localStorage` reads outside effects or handlers)
  and hydrate client-side via `client/src/main.jsx`.
- Content lives in `content/`; pages compose components; components never
  fetch. A new tool is a content file, not a new page design.
- TypeScript strict; zod-validate all content at build time.
- Accessibility is not optional: semantic landmarks, one h1 per page,
  visible focus, keyboard operability, reduced-motion respected. These
  are CI-enforced (architecture §11) — do not disable the gates.

## 6. Workflow (every batch, no exceptions)

1. Read the batch prompt and the relevant Blueprint/architecture sections.
2. Produce a short implementation plan: files to create/modify, approach,
   risks. **WAIT for user approval before editing any file.** Once
   approved, save it verbatim to `docs/batches/batch-N-plan.md` as the
   first commit on the batch's branch — plans live in the repo, not just
   in conversation history that may not survive to the next session.
3. Implement ONLY the batch scope. Out-of-scope problems you notice go
   into `docs/backlog.md` with one line each — never fix them "while
   you're there."
4. One commit per logical unit. Message format: `batch-N: <what>`.
   Never commit a broken build.
5. After implementing: run build, lint, and all CI gates that exist so
   far. Fix failures within scope before reporting.
6. End every batch with: implementation summary, changed-files list, a
   human verification checklist, known issues — then **STOP**. Never
   start the next batch unprompted.

## 7. Safety Rules

- **Rollback**: if a batch causes regressions unfixable within its scope,
  revert the batch's commits entirely and report why. `main` is always
  deployable.
- **No mass changes**: if a task appears to require touching more than
  ~25 files, stop and confirm the plan first — that scale usually means
  the scope was misread.
- **No content generation**: tool-page prose, policy text, and blog posts
  are human-written and supplied by the user. If content is missing,
  insert a `TODO-CONTENT` marker and list it — never generate filler
  prose to make validators pass. (Site-wide `TODO-CONTENT` search is part
  of the pre-deploy checklist; markers must reach zero before the
  AdSense review request.)
- **No ads yet**: zero ad units, ad scripts, or ad placeholders anywhere
  until the user explicitly says AdSense is approved. Then use only the
  reserved slots defined in Blueprint §24.
- **Secrets**: never print, log, or commit environment variables, API
  keys, or anything from `.env*`.

## 8. Communication

- Code, comments, and commit messages: English.
- Explanations and plans to the user: Hinglish is welcome — the user
  writes in Hinglish.
- When uncertain, ask one precise question instead of guessing. A wrong
  assumption implemented across 49 tool pages is expensive; a question
  costs thirty seconds.
