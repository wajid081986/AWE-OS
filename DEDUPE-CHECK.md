# Dedupe Check — DATA_GATE_PROGRESS (read-only)

Generated: 2026-07-05 (IST), read-only, no writes/migrations/commits performed.

## 1. Derived dedupe_key

Logic used (from `server/services/opportunity-detector.service.js`, `isoWeekKey()` + `detectDataGateProgress()`, unchanged):

```js
function isoWeekKey(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const weekNum = 1 + Math.round(((d - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}
// dedupe_key: `data_gate_progress:${week}`
```

Evaluated for "now" (2026-07-05, 17:51 UTC / 23:21 IST — same calendar day in both zones, so the result is timezone-safe for this check):

```
isoWeekKey(now) = 2026-W27
```

**Exact current dedupe_key: `data_gate_progress:2026-W27`**

## 2. Live query (SELECT only)

```sql
SELECT id, detector, risk, title, status, created_at
FROM recommendations
WHERE dedupe_key = 'data_gate_progress:2026-W27'
  AND status = 'open';
```

Run via `@supabase/supabase-js` using the existing service-role client (`server/db/supabase.js` pattern), no rows written.

## 3. Result

- **Matching row count: 0**
- **Matching rows: none**

## 4. Prediction for a real scan run right now

The unique index (`idx_recommendations_dedupe_open`, migration 033) only blocks an insert when an **open** row already shares the same `dedupe_key`. Since no open row currently has `dedupe_key = 'data_gate_progress:2026-W27'`:

**Predicted outcome: INSERT 1 new row** (not a duplicate skip).
