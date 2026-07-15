// Verbatim, owner-approved 2026-07-15. Do not edit wording — see
// docs/batches/batch-8-policy-pages.md.
export default {
  slug: 'tool-testing-policy',
  title: 'Tool Testing Policy',
  metaDescription: 'After launch, tools are re-tested when browsers update or when a user reports an issue.',
  lastUpdated: 'July 15, 2026',
  sections: [
    {
      heading: 'How we test our tools',
      paragraphs: [
        'Every tool on AWE-OS goes through the same process before launch:',
      ],
    },
    {
      heading: 'Finance calculators',
      paragraphs: [
        "Finance calculators are checked against official sources — income tax slabs from the Income Tax Department's published rates, PPF and FD rates from RBI and major bank publications, GST rates from official GST Council notifications. When rates change (for example, a new financial year's tax slabs), we update the calculator and note the applicable year on the page.",
      ],
    },
    {
      heading: 'PDF tools',
      paragraphs: [
        'PDF tools are tested with real files of different types and sizes — scanned documents, large files, password-protected files, and files created by different apps (Word, mobile scanners, government portals). A tool ships only after it handles these correctly in the browser, because that is where it runs: on your device, not our server.',
      ],
    },
    {
      heading: 'After launch',
      paragraphs: [
        'After launch, tools are re-tested when browsers update or when a user reports an issue. If a tool breaks, we either fix it or mark it clearly as unavailable — we do not leave silently broken tools online.',
      ],
    },
    {
      heading: 'Found a problem?',
      paragraphs: [
        'Email us at support@awe-os.com — verified issues in calculators are corrected within 7 days, and the fix is noted on the page.',
      ],
    },
  ],
}
