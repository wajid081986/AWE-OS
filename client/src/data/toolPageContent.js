/**
 * Shared SEO content (about text) for tool pages.
 * Imported by both the React page components (for the visible UI)
 * and by scripts/prerender.js (to inject into static HTML for crawlers).
 *
 * Keys match tool slugs from toolRegistry.js.
 */

export const TOOL_ABOUT = {
  'merge-pdf': {
  "description": "Merge PDF combines two or more PDF files into one, in whatever order you arrange them in the list. It runs entirely in the browser tab using pdf-lib, a JavaScript library that copies pages from your source files into a new document — nothing gets uploaded anywhere. Need to reorder or delete pages after merging? Use Organize PDF. Only want a few pages from one of the files, not all of them? Extract those first, then merge."
},

  'bmi-calculator': {
    description: "AWE-OS BMI Calculator is a free online tool that instantly computes your Body Mass Index from height and weight inputs in either metric (cm/kg) or imperial (ft/lb) units. It is designed for Indian and South Asian users who need both the standard WHO BMI thresholds and the stricter Asian-specific thresholds recommended by the ICMR (Indian Council of Medical Research) and Asia-Pacific clinical guidelines, which set the overweight cutoff at BMI 23 rather than the Western standard of 25. The calculator uses the WHO formula — weight in kg divided by height in metres squared — and displays results with a colour-coded scale showing Underweight, Normal weight, Overweight, and Obese categories. Imperial inputs are automatically converted to metric before calculation. BMI is a widely used population screening tool, but does not differentiate between fat mass and muscle mass, nor account for abdominal obesity patterns common in South Asians. Always consult a qualified doctor for personalised health assessment.",
    features: [
      "Supports both metric (cm, kg) and imperial (ft, in, lb) unit inputs with automatic conversion",
      "Displays both WHO global thresholds and ICMR Asian-specific thresholds side by side",
      "Colour-coded BMI scale: Underweight (<18.5), Normal (18.5–22.9), Overweight (23–27.4), Obese (≥27.5) for Asian populations",
      "Instant calculation with no page reload — results appear as you type",
      "Includes health guidance notes based on ICMR and Asia-Pacific clinical guidelines",
      "Works offline once loaded — no internet connection needed for calculation",
    ],
    useCases: [
      "Individuals tracking their weight and health status for general awareness and annual health check-ups",
      "Fitness enthusiasts and gym-goers monitoring progress alongside their workout and diet programmes",
      "Parents and teachers checking BMI-for-age percentiles for children in school health programmes",
      "Healthcare students and professionals needing a quick reference tool for patient screening discussions",
    ],
    howToUse: [
      "Select your preferred unit system — Metric (cm and kg) or Imperial (feet, inches, and pounds)",
      "Enter your height in the appropriate fields — for metric, enter centimetres; for imperial, enter feet and inches separately",
      "Enter your weight — kilograms for metric, or pounds for imperial",
      "Click 'Calculate BMI' to see your result with the category label and colour indicator",
      "Review both the WHO and ICMR thresholds shown below your result to understand the Indian-specific risk levels",
    ],
    whyUseUs: [
      "India-specific ICMR thresholds shown alongside global WHO thresholds — most BMI calculators only show Western cutoffs, missing the clinically relevant 23 overweight threshold for South Asians",
      "100% browser-based and private — your height and weight data is never sent to any server and is discarded when you close the tab",
      "Free, instant, and mobile-friendly with no account required — use it on any device without installation",
    ],
    faqs: [
      { q: "What is a healthy BMI for Indians?", a: "According to ICMR and Asia-Pacific guidelines, a BMI of 18.5–22.9 is considered Normal weight for South Asians. A BMI of 23–27.4 is classified as Overweight, and 27.5 or above is Obese. These thresholds are stricter than the global WHO cutoffs (Overweight at 25, Obese at 30) because research shows Indians carry more visceral (abdominal) fat at lower BMI values, which increases the risk of diabetes and cardiovascular disease at a lower body weight than in Western populations." },
      { q: "Does BMI accurately reflect health for all body types?", a: "BMI has recognised limitations. It does not differentiate between fat mass and lean muscle mass, so athletes with high muscle mass may be misclassified as Overweight or Obese. It also does not account for fat distribution — waist circumference and waist-to-hip ratio are additional important indicators, especially for Indians who tend to accumulate abdominal fat. BMI should be used as one of several screening indicators alongside blood glucose, lipid panel, blood pressure, and waist measurement." },
      { q: "Is this tool a substitute for medical advice?", a: "No. The AWE-OS BMI Calculator is intended for general health awareness and informational purposes only. It is not a medical device and cannot diagnose any health condition. If you are concerned about your weight, BMI category, or overall health, please consult a qualified doctor, dietitian, or registered nutritionist who can evaluate your complete health profile." },
    ],
  },

  'sip-calculator': {
    description: "AWE-OS SIP Calculator is a free online tool for Indian investors to estimate the future value of Systematic Investment Plan (SIP) contributions in mutual funds. It supports three calculation modes — standard SIP (monthly investment to corpus), Lumpsum (one-time investment growth), and Goal-Based (required monthly SIP to reach a target amount) — making it suitable for a wide range of investment planning scenarios from retirement savings to children's education funds. The calculator uses the standard compound interest formula endorsed by AMFI (Association of Mutual Funds in India): FV = P × [(1 + r)^n – 1] ÷ r × (1 + r), where monthly compounding reflects rupee-cost averaging. Results include Total Invested, Estimated Returns, and Final Corpus alongside a year-by-year growth chart and a rate sensitivity table comparing outcomes at 8%, 12%, 15%, and 18% annual returns. SIP projections assume constant annual returns and full reinvestment. As mandated by SEBI, mutual fund investments are subject to market risks and past performance does not guarantee future returns. Consult a SEBI-registered investment advisor before making investment decisions.",
    features: [
      "Three calculation modes: SIP (monthly to corpus), Lumpsum (one-time growth), and Goal-Based (target-to-monthly SIP)",
      "Year-by-year corpus growth chart with area visualization for easy trend understanding",
      "Rate sensitivity table comparing results at 8%, 12%, 15%, and 18% annual returns simultaneously",
      "Displays Total Invested, Estimated Returns, and Final Corpus in Indian number format (lakhs/crores)",
      "Supports investment horizons from 1 to 40 years and monthly amounts from ₹500 upward",
      "SEBI-compliant disclaimer and AMFI-aligned formula for accurate mutual fund projections",
    ],
    useCases: [
      "Salaried professionals planning monthly SIP contributions for retirement corpus calculation over 20–30 year horizons",
      "Parents calculating the monthly SIP amount required today to fund their child's higher education in 15–18 years",
      "First-time investors in India comparing equity mutual fund SIP growth against FD and PPF alternatives",
      "NRIs planning lumpsum investments in Indian mutual funds through NRE/NRO accounts for wealth creation",
    ],
    howToUse: [
      "Select your calculation mode: 'SIP' for monthly investment to corpus, 'Lumpsum' for one-time investment, or 'Goal' to find required monthly SIP for a target",
      "Enter the relevant amount — monthly investment for SIP, principal for Lumpsum, or target corpus for Goal mode",
      "Set the investment duration in years and the expected annual return rate (historical long-term equity mutual fund returns in India: 12–15%)",
      "Click 'Calculate' to see the corpus breakdown with Total Invested, Returns Earned, and Final Corpus",
      "Review the year-by-year growth chart and rate sensitivity table to understand how different return scenarios affect your corpus",
    ],
    whyUseUs: [
      "Three calculation modes in one tool — most SIP calculators only offer standard SIP; our Goal-Based mode helps you work backwards from a target corpus, which is essential for goal-based financial planning",
      "Rate sensitivity table shows corpus at 8%, 12%, 15%, and 18% simultaneously — no need to recalculate manually for different market scenarios",
      "India-first design: Indian number formatting (₹ lakhs and crores), AMFI-aligned formula, SEBI-mandated disclaimers, and a return range calibrated to Indian mutual fund historical data",
    ],
    faqs: [
      { q: "What annual return rate should I use for SIP calculation in India?", a: "For long-term equity mutual fund SIPs (10+ years), Indian markets have historically delivered 12–15% CAGR. Large-cap funds have averaged 10–12%, mid-cap funds 13–16%, and small-cap funds 14–18% over 15-year periods, though with higher volatility. Conservative investors can use 8–10% for debt-oriented or balanced funds. It is prudent to run projections at 10%, 12%, and 15% to understand the range of outcomes, which is why our rate sensitivity table shows all four scenarios simultaneously." },
      { q: "Is SIP better than a Fixed Deposit (FD) for long-term savings in India?", a: "For long-term goals (7+ years), equity mutual fund SIPs have historically outperformed FDs significantly. A 15-year SIP at 12% grows more than twice as fast as an FD at 6.5–7%. However, SIP returns are market-linked and not guaranteed, while FD returns are fixed and guaranteed by the bank (up to ₹5 lakh per bank per depositor under DICGC insurance). SIPs are suitable for wealth creation goals where you can tolerate short-term market volatility. FDs are better for capital preservation and short-term goals." },
      { q: "How much SIP should I start with as a beginner in India?", a: "SEBI and AMFI allow SIP investments starting from ₹100–₹500 per month, depending on the fund. A common beginner rule is to invest at least 20% of your monthly income in SIPs. For example, on a ₹50,000 monthly salary, a ₹10,000 SIP in a diversified equity mutual fund started at age 25 and continued for 30 years at 12% annual returns would grow to approximately ₹3.5 crore — nearly 29× the total invested amount of ₹36 lakh. Start with whatever you can afford consistently and increase by 10–15% every year using the Step-Up SIP feature offered by most AMCs." },
    ],
  },

  'pdf-editor': {
  "description": "PDF Editor lets you annotate, highlight, draw, stamp, and sign PDFs directly in the browser — PDF.js renders the pages, pdf-lib saves your changes. Every tool, including Whiteout and Redact, draws a new layer on top of the page. Nothing you add replaces what was already there."
},

  'word-counter': {
  "description": "Word Counter tracks words, characters (with and without spaces), sentences, paragraphs, and estimated reading time as you type or paste — no button to click, every keystroke updates the counts. Sentence counting looks for periods, question marks, and exclamation points, so an abbreviation like \"Dr.\" or a decimal like \"3.14\" can inflate the count; treat it as a rough guide, not an exact figure."
},

  // ── BATCH 19 — HRA, NPS, CAPITAL GAINS ──────────────────────────────────────

  'hra-calculator': {
    description: "AWE-OS HRA Calculator computes your House Rent Allowance tax exemption under Section 10(13A) of the Income Tax Act for salaried employees in India who pay rent and receive HRA as part of their salary. The exemption is the smallest of three amounts: the actual HRA received from your employer, 50% of Basic Salary for metro cities (Delhi, Mumbai, Chennai, Kolkata) or 40% for non-metro cities, and actual rent paid minus 10% of Basic Salary. The calculator shows all three conditions side by side with the applicable minimum clearly marked, along with monthly and annual figures for both the exempt and taxable portions of your HRA. This exemption is available only under the Old Tax Regime — it is not available if you have opted into the New Tax Regime, which removes most exemptions and deductions in exchange for lower slab rates. Getting the correct exemption figure matters for accurate TDS deduction by your employer and for filing your income tax return without a mismatch that could trigger a notice.",
    features: [
      "Computes the exact Section 10(13A) minimum-of-three-conditions formula used by every Indian employer's payroll system",
      "Metro (50% of Basic) vs Non-Metro (40% of Basic) toggle covering Delhi, Mumbai, Chennai, Kolkata correctly",
      "Real-time calculation — results update instantly as you type, with no submit button",
      "Side-by-side breakdown of all 3 conditions with a clear checkmark on whichever value is the exemption",
      "Monthly and annual figures for both HRA Exemption and Taxable HRA in one view",
      "100% browser-based — your salary and rent figures are never sent to any server",
    ],
    useCases: [
      "Salaried employees under the Old Tax Regime submitting rent receipts to their HR/payroll team for accurate monthly TDS deduction",
      "Employees choosing between the Old and New Tax Regime who need their exact HRA exemption amount to compare total tax liability under both",
      "Anyone who recently moved to a metro city (or out of one) and needs to recompute their exemption under the new 50%/40% threshold",
      "Employees filing their own ITR who need to independently verify the HRA exemption figure shown in their Form 16",
    ],
    howToUse: [
      "Enter your monthly Basic Salary exactly as shown on your payslip",
      "Enter the monthly HRA you receive from your employer and the monthly rent you actually pay",
      "Select Metro or Non-Metro based on your city of residence",
      "Review the 3-condition breakdown — the smallest value, marked with a ✓, is your exempt HRA",
      "Note the monthly and annual Exemption and Taxable HRA figures for your ITR or rent-receipt submission",
    ],
    whyUseUs: [
      "Shows the full 3-condition comparison, not just the final number — so you can see exactly why your exemption is what it is, the same way a payroll system computes it",
      "Correctly distinguishes the 4 metro cities from every other Indian city, a detail many simplified calculators get wrong",
      "No sign-up, no data storage — your salary details stay in your browser only",
    ],
    faqs: [
      { q: "Is HRA exemption available if I live with my parents and pay them rent?", a: "Yes, provided the arrangement is genuine and documented: you pay rent to your parent(s) via bank transfer (not cash), your parent(s) own the property, and they declare the rental income in their own income tax return. The Income Tax Department has upheld such claims in several tribunal rulings when properly documented, but it is scrutinised more closely than renting from an unrelated landlord — keep bank transfer records and a rent agreement." },
      { q: "What happens if my rent exceeds ₹1 lakh a year?", a: "If your annual rent paid exceeds ₹1,00,000 (roughly ₹8,333/month), your employer will require your landlord's PAN in addition to rent receipts before allowing HRA exemption in monthly TDS calculations. Without the landlord's PAN, your employer may not process the exemption at source, though you can still claim it directly while filing your ITR if you have valid rent receipts." },
      { q: "Can I claim HRA exemption and home loan interest deduction at the same time?", a: "Yes, but only if the rented accommodation and the home you own (on which you're claiming home loan interest under Section 24) are in different cities, or if you can demonstrate a genuine reason you don't live in your own house (e.g., it's too far from your workplace). Claiming both for the same city without justification is a common scrutiny trigger." },
      { q: "Why does the calculator show my exemption as zero when I enter valid numbers?", a: "This happens when your Rent Paid minus 10% of Basic Salary works out to zero or negative — usually because your rent is low relative to your Basic Salary, or you entered no rent at all. In that case, condition (3) of the formula becomes the binding minimum at zero, meaning none of your HRA is exempt for that month. This is the correct, intended behaviour of Section 10(13A), not a calculation error." },
      { q: "Should I choose the Old or New Tax Regime if I have a large HRA exemption?", a: "It depends on your total exemptions and deductions relative to the tax saved by the New Regime's lower slabs. As a rough guide, if your HRA exemption plus 80C/80D and other deductions are large relative to your income, the Old Regime often works out cheaper; if you claim few deductions, the New Regime usually wins. Run your numbers through both regimes using the AWE-OS Tax Calculator with and without this HRA exemption included to compare your actual total tax liability." },
    ],
  },

  'nps-calculator': {
    description: "AWE-OS NPS Calculator projects your National Pension System retirement corpus, tax-free lump-sum withdrawal, and monthly pension based on your current age, monthly contribution, and expected return assumptions. NPS is a government-regulated, PFRDA-administered retirement savings scheme available to all Indian citizens between 18 and 70. At retirement (fixed at age 60 for this calculator), a minimum of 40% of your accumulated corpus must be used to purchase an annuity plan that pays you a monthly pension for life, while up to 60% can be withdrawn as a tax-free lump sum. The calculator uses the standard SIP future-value formula to project your corpus growth from monthly contributions, then splits the projected corpus between lump sum and annuity based on your chosen annuity rate, and estimates your resulting monthly pension using your chosen annuity return rate. All return and annuity rate assumptions are adjustable so you can model conservative and optimistic scenarios rather than relying on a single fixed projection.",
    features: [
      "Age-based investment period calculation — automatically computes years remaining to the fixed NPS retirement age of 60",
      "Adjustable expected return rate (8–14%) to match your NPS fund's equity/debt/government-securities allocation",
      "PFRDA-compliant annuity rate slider with the 40% statutory minimum clearly labelled",
      "Adjustable annuity return rate (5–9%) reflecting current insurer annuity payout rates",
      "Pie chart visualization of the Lump Sum vs Annuity Portion split of your projected corpus",
      "Five summary cards: Total Corpus, Lump Sum Withdrawal, Monthly Pension, Total Invested, and Wealth Gained",
    ],
    useCases: [
      "Salaried employees deciding how much to contribute monthly to their NPS Tier-I account for retirement planning",
      "Employees comparing NPS against PPF and SIP-based retirement corpus growth using AWE-OS's other finance calculators",
      "Anyone approaching retirement modelling different annuity allocation percentages (40% minimum vs a higher voluntary share) to see the lump-sum vs monthly-pension trade-off",
      "Financial planning enthusiasts stress-testing their retirement corpus projection under conservative vs optimistic return assumptions",
    ],
    howToUse: [
      "Set your Current Age using the slider — the investment period to retirement (fixed at 60) is calculated automatically",
      "Enter your planned Monthly Contribution amount",
      "Adjust the Expected Return Rate slider based on your NPS fund allocation",
      "Set the Annuity Rate (minimum 40%) and Annuity Return Rate sliders to match your retirement income strategy",
      "Review the summary cards and the Lump Sum vs Annuity pie chart",
    ],
    whyUseUs: [
      "Every rate assumption is user-adjustable, not hardcoded — so you can see how sensitive your retirement outcome is to return and annuity rate changes",
      "Correctly enforces the PFRDA 40% minimum annuity rule rather than presenting an unconstrained withdrawal split",
      "Free, instant, and entirely browser-based — no account or login required to plan your retirement numbers",
    ],
    faqs: [
      { q: "Is NPS better than PPF for retirement savings?", a: "NPS and PPF serve different purposes. NPS offers market-linked returns (via equity, corporate bond, and government security allocation) that historically outperform PPF's fixed government rate over long horizons, plus an additional ₹50,000 tax deduction under Section 80CCD(1B) beyond the ₹1.5 lakh Section 80C limit. PPF offers a fixed, government-guaranteed return with full tax-free withdrawal at maturity and no compulsory annuitization. Many investors use both — PPF for guaranteed capital protection and NPS for market-linked growth with a bundled pension." },
      { q: "What tax benefits does NPS offer?", a: "NPS contributions qualify for a deduction of up to ₹1.5 lakh under Section 80CCD(1) (within the overall 80C limit) plus an additional exclusive deduction of up to ₹50,000 under Section 80CCD(1B) — meaning NPS can give you tax benefits beyond what 80C alone allows. At retirement, the 60% lump-sum withdrawal is entirely tax-free, though the monthly annuity/pension income is taxed at your slab rate when received." },
      { q: "Can I withdraw from NPS before age 60?", a: "Partial withdrawal is allowed after 3 years of account opening, up to 25% of your own contributions (not the employer's), for specific purposes like higher education, marriage, home purchase, or medical treatment, and only up to 3 times during the entire tenure. Full premature exit before 60 is allowed after 5 years of joining but is subject to compulsory annuitization of at least 80% of the corpus, with lower thresholds than the normal retirement exit." },
      { q: "How is my NPS corpus actually invested?", a: "Your NPS contributions are invested by pension fund managers you select, across a mix of Equity (E), Corporate Bonds (C), and Government Securities (G), based on either your own chosen allocation (Active Choice) or an age-based glide path that automatically reduces equity exposure as you approach 60 (Auto Choice). The expected return rate you enter into this calculator should reflect your actual chosen allocation's historical or projected blended return, not a single asset class in isolation." },
      { q: "What happens if I don't touch the annuity rate — is 40% always the right choice?", a: "40% is only the regulatory minimum, not a recommendation. A higher annuity rate gives you a larger guaranteed monthly pension but a smaller immediate tax-free lump sum; a lower rate (down to the 40% floor) maximises your lump sum but gives a smaller pension. The right choice depends on whether you have other retirement income sources and how much you value a guaranteed monthly payout versus a larger one-time withdrawal — model both ends of the slider to compare." },
    ],
  },

  'capital-gains-calculator': {
    description: "AWE-OS Capital Gains Calculator computes short-term and long-term capital gains tax across four asset classes — Equity/Stocks/Equity Mutual Funds, Debt Mutual Funds/Bonds, Real Estate/Property, and Gold/Other Assets — using the rates introduced by the Finance Act 2024 (Budget 2024), applicable for FY 2025-26. Each asset class has a distinct holding-period threshold and tax treatment: equity uses a 12-month threshold with a 20% STCG rate and 12.5% LTCG rate (with a ₹1.25 lakh annual exemption); real estate and gold use a 24-month threshold with LTCG taxed at 12.5% without indexation (a change from the pre-Budget-2024 20%-with-indexation regime); and debt mutual funds acquired after April 2023 are taxed entirely at your income tax slab rate regardless of holding period, per the Finance Act 2023's removal of indexation for debt funds. For Real Estate, the calculator also shows a reference-only comparison using the pre-Budget-2024 indexed-cost method and the real, CBDT-published Cost Inflation Index, so you can see exactly how the rule change affects your specific transaction. Because capital gains rules change with nearly every Union Budget, this calculator states its rate basis explicitly and recommends confirming with a Chartered Accountant before any filing or sale decision.",
    features: [
      "Four asset-type tabs — Equity, Debt Mutual Funds, Real Estate, Gold — each with the correct holding-period threshold and rate",
      "Automatic holding-period calculation and STCG/LTCG classification from your buy and sell dates",
      "Equity: 20% STCG / 12.5% LTCG with the ₹1.25 lakh annual LTCG exemption applied automatically",
      "Real Estate: 12.5% no-indexation LTCG (Budget 2024) shown alongside a reference-only indexed-cost figure using the real published CBDT Cost Inflation Index",
      "Debt Mutual Funds: correctly taxed at your income tax slab rate with no LTCG/STCG distinction, per the post-April-2023 rule",
      "Effective tax rate and net profit after tax computed for every asset type where a fixed rate applies",
    ],
    useCases: [
      "Equity investors calculating tax liability before selling shares or equity mutual fund units near a financial year-end",
      "Property sellers comparing their tax liability under the new 12.5% no-indexation rule versus the old indexed-cost method for the same sale",
      "Gold investors (physical gold, gold ETFs, or SGBs redeemed early) estimating capital gains tax on a sale",
      "Debt mutual fund investors confirming that their gain will be taxed at their slab rate rather than a flat capital gains rate",
    ],
    howToUse: [
      "Select the Asset Type — Equity, Debt Mutual Funds, Real Estate, or Gold",
      "Enter your buy/sell price (or NAV/units for debt funds, or price-per-gram/weight for gold) and the exact Buy Date and Sell Date",
      "For Real Estate, also enter Stamp Duty & Registration cost, which is added to your purchase cost",
      "Review the automatic Holding Period, STCG/LTCG classification, Taxable Gain, Tax Amount, Effective Tax Rate, and Net Profit After Tax",
      "For Real Estate held long-term, compare the new 12.5% method against the reference indexed-cost figure shown separately",
    ],
    whyUseUs: [
      "Reflects the actual Finance Act 2024 rate changes (12.5% flat LTCG, no indexation) rather than outdated pre-2024 assumptions many calculators still use",
      "Uses the real, officially published CBDT Cost Inflation Index table for the Real Estate reference comparison — not an invented or approximated index",
      "Honest about what it can't compute: for slab-rate cases (Debt MF, and short-term Real Estate/Gold), it shows the taxable gain without inventing a tax amount that depends on your personal income slab",
    ],
    faqs: [
      { q: "What counts as the 'holding period' for capital gains — is it the exact number of days?", a: "For this calculator, holding period is measured in complete months between your buy date and sell date, which is how the STCG/LTCG threshold (12 months for equity, 24 months for real estate and gold) is actually applied under the Income Tax Act. A holding period of exactly 12 months and 1 day for equity, for example, qualifies as long-term, while exactly 12 months does not." },
      { q: "Does the ₹1.25 lakh equity LTCG exemption apply per transaction or per year?", a: "It applies per financial year across all your equity LTCG combined, not per individual transaction. This calculator applies the ₹1.25 lakh exemption to the single transaction you enter, which is accurate if this is your only equity LTCG for the year — if you have multiple equity sales in the same financial year, you should sum all your LTCG first and apply the ₹1.25 lakh exemption only once to the total." },
      { q: "Why is the Real Estate indexed-cost figure only a 'reference' and not the actual tax I owe?", a: "Budget 2024 (effective for transfers from 23 July 2024) replaced the old 20%-with-indexation LTCG rate for real estate with a flat 12.5% rate without indexation. The indexed-cost figure this calculator shows is the pre-Budget-2024 calculation method, included only so you can compare how much tax you would have owed under the old rule versus the new one — the 12.5% no-indexation figure is what actually applies to your sale." },
      { q: "I sold my property before 23 July 2024 — does the 12.5% no-indexation rate still apply to me?", a: "No. The Budget 2024 rate change applies to transfers made on or after 23 July 2024. If your actual sale happened before that date, the pre-Budget-2024 20%-with-indexation rate applied instead. This calculator computes both figures for every Real Estate entry, but you should use whichever rate was actually in force on your specific sale date." },
      { q: "Can I offset capital losses against capital gains using this calculator?", a: "No, this calculator computes the tax on a single transaction in isolation. Under Indian tax rules, short-term capital losses can be set off against both STCG and LTCG, while long-term capital losses can only be set off against LTCG, and unabsorbed losses can be carried forward for up to 8 assessment years. If you have losses from other transactions in the same or earlier years, apply the set-off rules manually or consult a CA before arriving at your final tax liability." },
    ],
  },

  'text-editor': {
    description: "AWE-OS Online Text Editor is a free, browser-based word processor built for anyone who needs to draft, format, and export a document without installing Microsoft Word or paying for a subscription. It supports the formatting Indian students, freelancers, and small-business owners actually use day to day — bold, italic, underline, headings, bullet and numbered lists, tables, text and highlight colors, and hyperlinks — all through a familiar toolbar above an A4-proportioned page. Because everything runs inside your browser tab, there is no waiting for a cloud editor to load and no risk of a half-written letter or assignment being saved to someone else's server. When you are done, export directly to .txt, .html, or .docx, or send the page straight to your printer.",
    features: [
      "Full formatting toolbar: bold, italic, underline, strikethrough, font family, font size, text color, and highlight color",
      "Paragraph tools: H1/H2/H3 headings, bullet and numbered lists, indent/outdent, and blockquote",
      "Insert tools: tables (custom rows × columns), horizontal rules, hyperlinks, and images by URL",
      "Live word count, character count, and cursor line/column shown in the status bar as you type",
      "Simple Find & Replace across the whole document",
      "Export to .txt, .html, or .docx, or print directly from the browser — no file ever leaves your device until you choose to download it",
    ],
    useCases: [
      "Students in India drafting assignments, application essays, or project reports who need basic formatting without opening a heavyweight desktop app",
      "Freelancers and consultants writing quick proposals, cover letters, or client notes that need to be emailed as a .docx attachment",
      "Anyone who wants a distraction-free page to draft a letter, resignation notice, or affidavit text before printing it",
      "Bloggers and content writers who want to format a draft with headings and lists and export clean .html for pasting into a CMS",
    ],
    howToUse: [
      "Step 1: Open the AWE-OS Online Text Editor and start typing directly on the page — no sign-up or file upload needed.",
      "Step 2: Use the toolbar to format your text — change fonts, sizes, colors, alignment, headings, or insert a table, link, or image by URL.",
      "Step 3: Check your live word count, character count, and cursor position in the status bar at the bottom of the editor.",
      "Step 4: Use Find & Replace from the toolbar if you need to update a word or phrase throughout the document.",
      "Step 5: When finished, download your document as .txt, .html, or .docx, or click Print to send it straight to your printer.",
    ],
    whyUseUs: [
      "No installation, no account, and no subscription — the editor loads instantly in any modern browser and works the moment the page opens",
      "Your document is never uploaded to a server at any point; formatting, editing, and exporting to .docx all happen locally in your browser",
      "Genuine .docx export (not just a renamed HTML file) built with a real OOXML document library, so the file opens correctly in Microsoft Word and Google Docs",
    ],
    faqs: [
      { q: "Is this a full replacement for Microsoft Word?", a: "No — it is a lightweight, free alternative for everyday formatting tasks like letters, notes, and short reports. Advanced Word features such as mail merge, macros, tracked changes, and complex multi-column layouts are not supported. For simple documents that need headings, lists, tables, and basic styling, this editor covers the common cases." },
      { q: "Is my document saved anywhere while I'm typing?", a: "No. Your document exists only in your browser tab's memory while you work. It is never auto-saved to a server, and closing or refreshing the tab without downloading will lose your unsaved work — always export before you close the tab." },
      { q: "Can I upload an image file directly into my document?", a: "No, by design. AWE-OS never accepts file uploads for this editor, in keeping with the platform's no-server-upload promise. You can insert an image by pasting a publicly accessible image URL instead." },
      { q: "Will my formatting survive when I export to .docx?", a: "Yes, for the formatting this editor supports — bold, italic, underline, strikethrough, colors, highlights, fonts, sizes, alignment, headings, lists, blockquotes, and tables are all converted into the equivalent Word formatting. Images inserted by URL are embedded where the browser allows it; if a particular image can't be read due to the source site's cross-origin restrictions, it is replaced with a text placeholder in the exported file." },
      { q: "Does the 'Page N of M' counter reflect exactly how the document will print?", a: "It's an estimate based on comparing your content's height against a standard A4 page height, not a true print-layout engine. Actual pagination when you print or open the .docx in Word depends on your printer settings, margins, and Word's own layout engine, so treat the on-screen count as a rough guide rather than an exact figure." },
    ],
  },
}
