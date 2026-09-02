# Batch 92 — fix duplicate FAQ / duplicate How-to-Use rendering

## Background

An AdSense "Low Value Content" audit found that `ToolPageShell.jsx` (the
shared shell every tool page renders through) can render two separate
"How to Use {name}" sections and two separate "Frequently Asked
Questions" sections on the same page: one sourced from the page's own
`steps`/`faqs` props, and one sourced from `about.howToUse`/`about.faqs`
when the `about` prop is the object-shaped entry from the shared
`TOOL_ABOUT` data file (`client/src/data/toolPageContent.js`).

## Corrected scope

An initial grep-based estimate (~28 pages) over-counted. Most tool pages
that pass all three props (`steps`, `faqs`, `about`) define their own
**local, array-shaped** `ABOUT` constant (`const ABOUT = [...]`).
`ToolPageShell.jsx` renders array-shaped `about` as a single generic
"About" paragraph block only — it has no `.howToUse`/`.faqs` sub-fields,
so no duplication occurs on those pages.

The bug is real only where `about` resolves to the **object**-shaped
`TOOL_ABOUT[slug]` entry (which does carry `.howToUse` and `.faqs`) *and*
the page also passes its own `steps`/`faqs` props. That is exactly 9
files:

1. `client/src/pages/tools/BMICalculator.jsx`
2. `client/src/pages/tools/SIPCalculator.jsx`
3. `client/src/pages/tools/HRACalculator.jsx`
4. `client/src/pages/tools/NPSCalculator.jsx`
5. `client/src/pages/tools/CapitalGainsCalculator.jsx`
6. `client/src/pages/tools/TextEditor.jsx`
7. `client/src/pages/tools/WordCounter.jsx`
8. `client/src/pages/tools/pdf/MergePDF.jsx`
9. `client/src/pages/tools/pdf/PdfEditorV2/index.jsx`

The other ~38 pages that also pass all three props are unaffected — their
`about` is a local array, safe by construction.

## Which source wins

Compared each file's local `STEPS`/`FAQS` against
`TOOL_ABOUT[slug].howToUse`/`.faqs`. In all 9 cases the component-local
version is more specific and current — it references the actual UI
(sliders, tabs, field names), current-law specifics (e.g. Finance Act
2024 capital-gains rates, PFRDA NPS rules), and named implementation
detail (`pdf-lib`, specific edge-case behavior) that the shared
data-file version lacks. Local `STEPS`/`FAQS` wins in all 9 files.

## Fix approach (no prose rewritten)

At each of the 9 call sites, drop the now-redundant `howToUse`/`faqs`
keys from the `about` object before it reaches `ToolPageShell`, leaving
`.description`/`.features`/`.useCases`/`.whyUseUs` untouched (those
aren't duplicated by anything and should keep rendering):

```js
// before
const ABOUT = TOOL_ABOUT['bmi-calculator']

// after
const { howToUse: _aboutHowToUse, faqs: _aboutFaqs, ...ABOUT } = TOOL_ABOUT['bmi-calculator']
```

`WordCounter.jsx` passes `about={TOOL_ABOUT['word-counter']}` inline —
introduce the same destructured `const ABOUT` and switch the prop to
`about={ABOUT}`.

Not touching `toolPageContent.js` (the prose itself) or
`ToolPageShell.jsx` (no shell change needed — the fix is entirely at
each call site).

### Side effect (beneficial)

`ToolPageShell.jsx` merges `about.faqs` into the page's `FAQPage`
JSON-LD schema in addition to the `faqs` prop, so the structured data
currently can include FAQs that aren't in a single visible block. After
this fix, the schema will automatically match only the visible
(local) FAQs — better aligned with Google's structured-data requirement
that schema match visible content.

## Verification

- Grep each of the 9 files to confirm `about.howToUse`/`about.faqs` are
  no longer passed to `ToolPageShell`.
- `npm run build` in `client/` to confirm the destructuring doesn't
  break anything.
- Confirm no page ends up with zero How-to-Use or zero FAQ section —
  each local `STEPS`/`FAQS` already has 3–6 items, so this can't happen
  from this change alone.

## Out of scope

- Rewriting any prose/content.
- The Era 1 vs Era 2 PDF-tool content-quality gap identified in the
  audit (separate, future batch).
- The `toolPageContent.js` entries for these 9 slugs becoming partially
  unused (their `.howToUse`/`.faqs` are no longer read) — left in place
  since deleting data-file content is a content change, not a rendering
  fix, and those fields may be reused later.
