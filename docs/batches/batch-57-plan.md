# Batch 57 — Fix toolCatalogue.js nav drift from toolRegistry.js

## Context

`docs/backlog.md` items flagged `toolCatalogue.js` (Header mega-menu /
ToolsPage tab nav data) as drifted from `toolRegistry.js` (the source of
truth for real tools): missing entries and a stale `calculators.count: '6+'`
label.

## Investigation

Re-verified from scratch with a programmatic slug comparison (first attempt
had a parser bug — falsely flagged `pdf-editor` as a dead nav link; a
looser slug-only match confirmed it's real and corrected the check).

Confirmed: `toolRegistry.js` has zero `comingSoon: true` entries — every
registry tool is live and buildable.

- **9 real, live registry tools missing from nav**: `pdf-to-text`,
  `pdf-to-ppt` (PDF); `gst-calculator`, `tip-calculator`,
  `discount-calculator` (Calculators); `currency-converter`,
  `base-converter`, `json-formatter` (Converters); `invoice-generator`
  ("Invoice Generator (Quick)" — a distinct tool from the existing
  "Invoice Generator" entry linking to `/tools/invoice`).
- **`test-ai-tool` deliberately excluded** — its own registry entry says
  `subcategory: 'Testing Tools'`, description `'Test tool for verifying
  dynamic architecture system'`. Internal dev/QA artifact, not a real
  product feature; adding it to public nav would be wrong. (Separately
  worth a backlog note: it's still publicly live/indexable at
  `/tools/test-ai-tool` with real SEO tags — out of scope for this fix.)
- **Zero actual dead links in `toolCatalogue.js`** once the parser bug was
  fixed — nothing currently in nav points to a nonexistent tool.
- **Count labels stale**: pdf 18+→20+, calculators 6+→16+,
  converters 9+→10+, productivity 3+→4+. `ai` stays 2+ (unchanged —
  `test-ai-tool` excluded from the visible count too, consistent with
  excluding it from nav).

## Plan

Additive-only edit to `client/src/data/toolCatalogue.js`:
- Add the 9 missing items to their matching existing `sections` (PDF's
  "Convert from PDF", Calculators' "Finance", Productivity's "Billing"),
  using each tool's real registry `name`/`icon`.
- Add one new "Data Tools" section under Converters (matching
  `base-converter`/`json-formatter`'s own registry `subcategory`) rather
  than forcing them into an unrelated existing section.
- Update the 4 changed `count` labels.
- Add a `docs/backlog.md` note for `test-ai-tool` being publicly live/
  indexable despite being an internal dev artifact (found, not fixed —
  separate concern).

No new component/pattern — reuses the file's existing
`{ title, items: [{ icon, label, to }] }` section shape used elsewhere in
the same file. Build check, single commit
(`batch-57: fix toolCatalogue.js nav drift`).
