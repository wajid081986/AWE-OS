# Batch 19 — Three New Calculators (HRA, NPS, Capital Gains)

## Context

AWE-OS's Calculators category currently has 13 live tools (FD, PPF, SIP, ROI, Tax, BMI, Age, Loan, Percentage, GST, Tip, Discount, GPA). The user wants three more India-focused finance calculators added: HRA Exemption, NPS, and Capital Gains (FY 2025-26 / Finance Act 2024 rates). These must slot into the existing tool-registration system exactly like the 13 that already exist — no new architecture, no route changes, no new npm packages (recharts is already a dependency and already used for bar/pie charts elsewhere).

I read `docs/reference/ux-blueprint.md` and `docs/reference/architecture.md` per the request. Architecture.md still describes a Next.js App Router stack — this mismatch is already flagged in CLAUDE.md's own changelog as known and out of scope; the actual stack is the Vite SPA pattern below, confirmed by reading the real registration code.

## How a tool actually gets registered (verified by reading the code, not the docs)

Contrary to `routes.jsx`'s header comment suggesting it needs edits, **no route file changes are needed**. The real chain is:

1. `client/src/data/toolRegistry.js` — `TOOL_REGISTRY` array entry (slug, name, category, subcategory, icon, description, tags, relatedSlugs, seo.title/description). This is what the header comment calls the "single source of truth."
2. `client/src/pages/tools/toolComponentMap.js` — one line: `'slug': () => import('./Component')`. `DynamicToolPage.jsx` resolves `/tools/:slug` through this map automatically.
3. `client/src/ssgRoutes.js` — add the 3 slugs to the `TOOL_SLUGS` array (used for static-path generation).
4. `client/src/entry-server.jsx` — add 3 static imports + 3 entries to `TOOL_PAGE_COMPONENTS`. This file has a build-time assertion (`assertNoRouteDrift`) that **throws if `TOOL_PAGE_COMPONENTS` keys don't exactly match `ssgRoutes.js`'s `TOOL_SLUGS`** — both must be updated together or the build fails loudly.
5. `client/src/data/toolCatalogue.js` — add 3 items under `calculators.sections` → the `Finance` section (this is what actually drives the Header mega-menu, not `Header.jsx` itself).
6. `client/src/data/toolPageContent.js` — `TOOL_ABOUT` entries (description, features[], useCases[], howToUse[], faqs[]) — this satisfies the user's explicit SEO-content requirement.
7. `client/src/data/toolGuideContent.js` — `TOOL_GUIDE` entries (tips[], mistakes[]).

Two conventions coexist for the `about` prop passed to `ToolPageShell`: newer tools (`BMICalculator.jsx`, `SIPCalculator.jsx`, `WordCounter.jsx`) import the structured object from `TOOL_ABOUT`; older ones (`GSTCalculator.jsx`, `FDCalculator.jsx`, `PPFCalculator.jsx`) define a local paragraph-string array instead. Since the user explicitly asked for the SEO content to live in `toolPageContent.js`, the 3 new components will follow the `TOOL_ABOUT`-import convention (matching `BMICalculator.jsx`) rather than duplicating a local array — this actually reduces duplication versus the file GST/FD/PPF use. Everything else (local `STEPS` for the HowTo schema + step list, local `FAQS` for the accordion + FAQPage schema, `ToolPageShell` wrapper, `limitation` prop for the honest-limitation callout, plain Tailwind utility classes matching `GSTCalculator.jsx`/`BMICalculator.jsx`'s light theme) mirrors the reference implementation exactly.

Note on styling: tool-interior components across the whole repo use raw Tailwind utility classes (`bg-blue-600`, `text-gray-700`, etc.), not the `--cobalt` design-token system — this is pre-existing, already logged in `docs/backlog.md` (2026-07-27 entry, 77 files). I will match that existing convention rather than introduce a third styling approach, per CLAUDE.md §5 ("match the existing stack and patterns").

## New tool specs

### 1. HRA Calculator (`hra-calculator`)
- Component: `client/src/pages/tools/HRACalculator.jsx`
- Inputs: Basic Salary (monthly, number), HRA Received (monthly, number), Rent Paid (monthly, number), City Type toggle (Metro/Non-Metro) — helper text "Metro cities: Delhi, Mumbai, Chennai, Kolkata" under the toggle.
- Real-time calc via `useMemo` (no submit button, per explicit spec):
  - `a` = HRA Received
  - `b` = Basic × (metro ? 0.50 : 0.40)
  - `c` = max(0, Rent Paid − 0.10 × Basic)
  - `exemption = min(a, b, c)`; `taxableHRA = HRA Received − exemption`
- UI: 3-row breakdown (a/b/c) with a ✓ badge on whichever value equals the minimum; monthly + annual (×12) summary cards for exemption and taxable HRA.
- Icon: 🏠. Category: calculators / Finance.

### 2. NPS Calculator (`nps-calculator`)
- Component: `client/src/pages/tools/NPSCalculator.jsx`
- Inputs: Current Age (slider 18–60), Retirement Age (fixed 60, shown as read-only info), Monthly Contribution ₹ (number), Expected Return Rate (slider 8–14%, default 10), Annuity Rate (slider 40–100%, default 40 — labelled "PFRDA minimum"), Annuity Return Rate (slider 5–9%, default 6). Slider UI follows `FDCalculator.jsx`'s `RangeSlider` sub-component pattern, restyled for the light theme (accent classes instead of dark `bg-white/5`).
- Calc (reusing the exact SIP future-value formula already used in `SIPCalculator.jsx`/`FDCalculator.jsx`: `FV = monthly × (((1+r)^n − 1)/r) × (1+r)`, `r` = monthly rate, `n` = months):
  - `investmentYears = 60 − currentAge`
  - `corpus` = FV of monthly contribution at expected return rate over `investmentYears`
  - `lumpSum = corpus × (1 − annuityRate/100)`
  - `monthlyPension = corpus × (annuityRate/100) × (annuityReturnRate/100) / 12`
  - `totalInvested = monthly × 12 × investmentYears`
  - `wealthGained = corpus − totalInvested`
- Output cards: Total Corpus, Lump Sum (60% max tax-free), Monthly Pension, Total Invested, Wealth Gained.
- Chart: `recharts` `PieChart`/`Pie`/`Cell` (same import pattern as `FDCalculator.jsx`) showing Lump Sum vs Annuity portion of the corpus.
- Notes shown near the results (plain text, not a Callout — these are already-given facts, not the "limitation" disclaimer): "Minimum 40% must be used for annuity (PFRDA rule)", "60% lump sum withdrawal is tax-free", "Returns are estimated, actual may vary."
- Icon: 🧓. Category: calculators / Finance.

### 3. Capital Gains Calculator (`capital-gains-calculator`)
- Component: `client/src/pages/tools/CapitalGainsCalculator.jsx`
- Asset-type selector: 4-way tab row (Equity / Debt MF / Real Estate / Gold), same toggle-button pattern as `GSTCalculator.jsx`'s Add/Extract mode toggle, just 4 options instead of 2.
- Per-asset-type logic (all per the exact figures given in the request — nothing invented):
  - **Equity**: inputs Buy Price, Sell Price, Quantity, Buy Date, Sell Date. Holding ≤12mo → STCG @ 20% flat; >12mo → LTCG @ 12.5% on gain above ₹1.25L/year exemption.
  - **Debt MF**: inputs Buy NAV, Sell NAV, Units, dates. All gains taxed at slab rate (post-April-2023 rule, no indexation) — the tool reports the taxable gain amount and states "taxed at your income tax slab rate" rather than inventing a slab percentage, since the user's own slab isn't an input this tool collects.
  - **Real Estate**: inputs Buy Price, Sell Price, Buy Date, Sell Date, Stamp Duty & Registration (added to cost base). Holding ≤24mo → STCG at slab (same slab caveat as above); >24mo → LTCG @ 12.5% without indexation (Budget 2024). Show both methods for comparison: the new-method result (12.5%, no indexation) as the actual applicable tax, and the old indexed-cost method as a reference figure, computed using the real, published CBDT Cost Inflation Index (CII) table (FY 2001-02 = 100 through FY 2024-25 = 363, hardcoded as a lookup-by-financial-year — same precedent as `FDCalculator.jsx` hardcoding real SBI/HDFC/ICICI/Axis/Kotak/Post-Office rates in its `BANKS` array). Indexed cost = (Purchase Cost + Stamp Duty) × (CII of sale FY / CII of purchase FY); indexed LTCG taxed at 20% (the pre-Budget-2024 rate) purely for the reference comparison, clearly labelled as historical/reference-only, not the applicable rate.
  - **Gold**: inputs Buy Price/gram, Sell Price/gram, Weight (grams), dates. Holding ≤24mo → STCG at slab; >24mo → LTCG @ 12.5%.
- Common outputs: Holding Period (auto from dates), STCG/LTCG classification, Taxable Gain, Tax Amount (where a flat rate applies; for slab-rate cases, shows taxable gain only with a note that tax depends on the user's slab), Effective Tax Rate, Net Profit after tax.
- Prominent `Callout variant="warning"` (via the existing `limitation` prop) with the exact disclaimer text from the spec: "Tax laws change frequently. This calculator reflects Finance Act 2024 rates. Consult a CA for your specific situation."
- Icon: 📈. Category: calculators / Finance.

## Files to create
- `client/src/pages/tools/HRACalculator.jsx`
- `client/src/pages/tools/NPSCalculator.jsx`
- `client/src/pages/tools/CapitalGainsCalculator.jsx`

## Files to modify
- `client/src/data/toolRegistry.js` — 3 new `TOOL_REGISTRY` entries (Finance subcategory, tags/seo per the request)
- `client/src/data/toolPageContent.js` — 3 new `TOOL_ABOUT` entries (description, features[5-6], useCases[4-5], howToUse[4-5], faqs[5])
- `client/src/data/toolGuideContent.js` — 3 new `TOOL_GUIDE` entries (tips, mistakes)
- `client/src/data/toolCatalogue.js` — 3 new items in `calculators.sections` → `Finance`
- `client/src/pages/tools/toolComponentMap.js` — 3 new map entries
- `client/src/ssgRoutes.js` — 3 new `TOOL_SLUGS` entries
- `client/src/entry-server.jsx` — 3 new imports + 3 new `TOOL_PAGE_COMPONENTS` entries (must match ssgRoutes.js exactly or the build's own assertion throws)

10 files total (3 new, 7 modified) — well under the 25-file mass-change threshold in CLAUDE.md §7.

## Out of scope (goes to `docs/backlog.md`, not fixed here)
- `toolCatalogue.js`'s `calculators.count: '6+'` is already stale (13 live tools, will be 16) — pre-existing drift, not introduced by this batch, left as-is with a one-line backlog note.

## Verification
1. `npm run build` (from `client/`) — confirms the zod/content validators, the `assertNoRouteDrift` check in `entry-server.jsx`, and SSG generation all pass with the 3 new routes.
2. Confirm `dist/tools/hra-calculator/index.html`, `.../nps-calculator/index.html`, `.../capital-gains-calculator/index.html` exist and contain real prerendered content (not just a loading shell).
3. `npm run lint`.
4. Manually sanity-check the HRA min-of-3 logic, NPS corpus formula (cross-check one scenario by hand), and Capital Gains STCG/LTCG date-based classification with a couple of hand-picked example dates/amounts.
5. Confirm the 3 tools appear under Calculators → Finance in the header mega-menu and on `/tools/calculators`.

## Commit
One commit per logical unit (HRA, NPS, Capital Gains, or grouped if simpler — will follow existing batch commit-message convention `batch-19: <what>`), per CLAUDE.md §6. Plan gets saved verbatim to `docs/batches/batch-19-three-calculators-plan.md` as the first commit on this batch once approved.
