# Backlog

Out-of-scope items noted during batch work. One line each. Do not fix inline — pick up in the batch noted (or a new one) with its own plan + approval.

- **Duplicate `<title>`/`<h1>` in SSG output** — Batch 0A's SSG proof-of-concept (`client/scripts/ssg-build.js`) injects real rendered content + Helmet head tags into the raw `dist/index.html` SPA shell, which still carries its own default `<title>`/meta block and a `<noscript>` fallback with its own `<h1>`. Result: 2 `<title>` and 2 `<h1>` in raw HTML source for all 3 SSG routes (crawlers executing JS see only the correct ones, since `<noscript>` is suppressed when scripting is enabled — but a raw HTML-only parser would see both). Needs: replace-not-append head injection, and dropping the now-redundant `noscript` fallback once SSG is the real serving path. Belongs in the batch that wires SSG output for actual production serving (not this POC).
