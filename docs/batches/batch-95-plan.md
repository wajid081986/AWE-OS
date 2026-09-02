# Batch 95 — phantom budget-calculator fix + continued blog audit

## Part 1 — fix phantom "budget calculator" references (done this batch)

`how-to-create-a-budget-that-works-for-you-in-india` referenced a
"budget calculator" / "budget-calculator" tool 8 times (excerpt, intro,
one paragraph, a callout, closing paragraph, and 2 FAQ entries, one of
which existed solely to answer "How can a budget calculator help").
Confirmed via `toolRegistry.js` / `toolComponentMap.js` that no such
tool exists in the 54-tool catalogue — same phantom-URL class as the
`/tools/budget-calculator` redirect batch-91 already added.

No existing AWE-OS tool does generic monthly budget/expense tracking
(closest are SIP/Loan calculators, which are investment/loan-specific).
Fix approach: rewrite each of the 8 spots rather than delete —
- 6 spots: removed the specific tool claim, replaced with honest
  tool-agnostic advice (spreadsheet/notes app/notebook — consistency
  matters more than the tool).
- 1 spot (callout): repurposed to point to the SIP Calculator (already
  a `relatedTools` entry for this post) with a real working link —
  "once you know your monthly savings number, see what it could grow
  into" is a genuine, honest next step, unlike the phantom tool.
- 1 spot (FAQ pair "How can a budget calculator help..."): question and
  answer both existed only to describe a tool that doesn't exist —
  replaced with "Do I need budgeting software to make this work?",
  answered honestly (no) with the same real SIP Calculator pointer at
  the end.

Also fixed a small leftover from batch-94's heading fix while in the
same paragraph: the "Conclusion" h2 was followed by a paragraph that
still redundantly started with the literal text "Conclusion: " — removed
the redundant prefix. (The other 10 posts fixed in batch-94 likely have
the same redundant prefix; not touched here, flagged as a minor future
cleanup, not urgent since it's not misleading, just slightly clunky.)

## Part 2 — read-through of the 3 cleaned-up posts (read-only, findings only)

Assess whether `how-to-create-a-budget-that-works-for-you-in-india`,
`merge-pdf-files-for-bank-documents-india`, and
`qr-code-generator-10-practical-uses` read as complete, coherent articles
after batch-94's deletions, or whether the gaps need real content before
these are in good shape. No edits — findings reported to user.

## Part 3 — continued audit of the remaining 30 posts (read-only, findings only)

Priority: the 4 GST-calculator posts and 3 resume/ATS posts, checked
specifically for near-duplicate/overlapping content (a distinct "scaled
content" risk on top of individual quality). Then broader pass across
the rest. No edits — findings reported to user before any further
action, per explicit instruction.
