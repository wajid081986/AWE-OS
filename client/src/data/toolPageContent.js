/**
 * Shared SEO content (about text) for tool pages.
 * Imported by both the React page components (for the visible UI)
 * and by scripts/prerender.js (to inject into static HTML for crawlers).
 *
 * Keys match tool slugs from toolRegistry.js.
 */

export const TOOL_ABOUT = {
  'merge-pdf': [
    "AWE-OS Merge PDF is a free, browser-based tool that combines multiple PDF documents into a single file instantly. It is built for professionals, students, and everyday users who regularly work with multi-part documents — contract annexures, research paper appendices, scanned invoice sets, or multi-chapter reports that need to be submitted as one file.",
    "The tool uses pdf-lib, a pure JavaScript PDF manipulation library, to merge files entirely within your browser. This means zero server uploads, zero privacy risk, and zero waiting time for file transfers. Processing speed depends on your device hardware and the total file size — modern laptops typically merge 10 files in under 3 seconds.",
    "Page order control is built in. Before merging, you can drag file cards to rearrange the order of entire documents. For finer control over individual page order within each document, use the Organize PDF tool after merging. The ↑↓ arrow controls and drag handles work on both desktop and mobile browsers.",
    "AWE-OS Merge PDF works on all modern browsers including Google Chrome, Mozilla Firefox, Apple Safari, and Microsoft Edge — on Windows, macOS, Android, and iOS. No software installation, no browser extension, and no account registration is required. The tool is free to use with no watermarks added to the output file.",
  ],

  'bmi-calculator': [
    "AWE-OS BMI Calculator is a free online tool that instantly computes your Body Mass Index from height and weight inputs in either metric or imperial units. It is designed for Indian and South Asian users who need both the standard WHO BMI thresholds and the stricter Asian-specific thresholds recommended by the ICMR and Asia-Pacific clinical guidelines, which set the overweight cutoff at BMI 23 rather than the Western standard of 25.",
    "The calculator uses the standard WHO BMI formula: weight (kg) divided by height (m) squared. Results are displayed with a colour-coded visual scale showing four categories — Underweight, Normal weight, Overweight, and Obese — using both WHO and ICMR thresholds side by side. Imperial inputs (feet, inches, pounds) are automatically converted to metric before calculation, so results are always consistent regardless of the unit system chosen.",
    "BMI is a widely used population screening tool, but it has recognised limitations. It does not differentiate between fat mass and muscle mass, does not account for fat distribution patterns such as abdominal obesity, and may not accurately reflect health risks in athletes, elderly individuals, or people with high muscle mass. The Indian Council of Medical Research notes that Indians tend to have higher visceral fat at lower BMI values, which is why the 23 cutoff is clinically more relevant for South Asian populations.",
    "This tool is intended for general health awareness and informational purposes only. It is not a substitute for professional medical advice, clinical assessment, or diagnosis. If you are concerned about your weight or health status, please consult a qualified doctor, dietitian, or healthcare provider who can evaluate your complete health profile including waist measurement, blood glucose, lipid panel, and other relevant indicators.",
  ],

  'sip-calculator': [
    "AWE-OS SIP Calculator is a free online tool for Indian investors to estimate the future value of Systematic Investment Plan (SIP) contributions in mutual funds. It supports three calculation modes — standard SIP (monthly investment to corpus), Lumpsum (one-time investment growth), and Goal-Based (required monthly SIP to reach a target) — making it suitable for a wide range of investment planning scenarios from retirement planning to children's education funds.",
    "The calculator uses the standard compound interest formula endorsed by AMFI (Association of Mutual Funds in India): FV = P × [(1 + r)^n – 1] ÷ r × (1 + r), where rupee-cost averaging is implicit in the monthly compounding structure. Results are displayed as three summary cards (Total Invested, Estimated Returns, Final Corpus) alongside a year-by-year corpus growth chart and a rate sensitivity table comparing outcomes at 8%, 12%, 15%, and 18% annual returns.",
    "SIP projections assume constant annual returns, no fund expense ratios, and full reinvestment of all returns. In practice, equity mutual fund returns vary significantly year to year based on market conditions. The SEBI-mandated disclaimer applies: mutual fund investments are subject to market risks and past performance does not guarantee future returns. The return rate range shown (8–18%) reflects the historical long-term performance band of different mutual fund categories in India, from conservative debt funds to aggressive small-cap equity funds.",
    "This tool is designed for financial awareness and preliminary investment planning. It is not registered investment advice. Before starting or modifying a SIP, consult a SEBI-registered investment advisor (RIA) or a certified financial planner (CFP) who can evaluate your complete financial profile including risk tolerance, tax situation, existing investments, insurance coverage, and specific financial goals.",
  ],
}
