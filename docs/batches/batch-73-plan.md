# Batch 73 — Admin Product Price Edit (+ Currency Label)

## Context

`docs/backlog.md` (2026-08-10 entry, batch-72): AI-Factory-originated
marketplace listings are created with `seller_id: null` ("Platform") and
`price` always `0` (no pricing logic exists upstream). The only existing
price-edit path, `PUT /api/store/seller/products/:id`, is ownership-gated
to `req.seller.id` and unreachable for these rows. The admin's only
options in the Store Approvals queue are Approve-as-is or Reject — no way
to correct a price before publishing. This batch closes that gap and adds
a display-only currency label alongside price.

## Research (completed before this plan)

- `StoreApprovalQueue.jsx` (`client/src/modules/admin/store/StoreApprovalQueue.jsx`)
  is the single queue for **all** pending `digital_products` rows —
  human-seller submissions and Platform/AI-Factory rows alike. Confirmed
  via `GET /api/store/admin/products/pending`
  (`server/routes/store.admin.routes.js:10-16`), which filters only on
  `status = 'pending'`, with no `seller_id` filter. Today this component
  is Approve/Reject only; price renders as static text (`₹{p.price}`).
- **No admin-side price editing exists anywhere today.** The only
  existing price-edit route, `PUT /api/store/seller/products/:id`
  (`store.seller.routes.js:215`), is ownership-gated to `req.seller.id`
  — unusable for `seller_id: null` rows, and not wired into any admin UI
  regardless. It also triggers re-approval (`status` back to `pending`)
  on a price change, which does not apply here since queue rows are
  already `pending`.
- `ProductManager.jsx` (`client/src/modules/admin/products/ProductManager.jsx`,
  backed by `/api/products/*` in `products.routes.js`) is a separate,
  older single-vendor "Digital Products" admin CRUD (upload /
  publish-toggle / delete). It never touches `status = 'pending'` or the
  approval queue — out of scope, since AI-Factory listings and seller
  submissions both surface via `StoreApprovalQueue.jsx`, not here.
- `digital_products` has no `currency` column today (confirmed against
  migrations 024, 025, 027). One clean additive column is needed.

## Scope

1. **Migration** — `server/db/migrations/041_digital_products_currency.sql`,
   additive only:
   ```sql
   ALTER TABLE digital_products
     ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'INR'
     CHECK (currency IN ('INR', 'USD'));
   ```

2. **New admin route** in `server/routes/store.admin.routes.js`:
   `PUT /admin/products/:id/price` — `requireAuth, requireAdmin`. Body
   `{ price, currency }`. Validates `price` is a finite number ≥ 0 and
   `currency` is one of `INR`/`USD`. Updates the row, returns it. No
   ownership check (admin route). No status/reapproval side effects —
   the row is already `pending` when this is used.

3. **`StoreApprovalQueue.jsx`** — replace the static price text with an
   inline editor per row (chosen over a modal: it's a single-field edit
   and the component already has an inline pattern for the reject-reason
   input, so this stays visually consistent):
   - A small number input (price) + a 2-option `<select>` for currency
     (₹ INR / $ USD), placed where the static price text is now.
   - A "Save" button appears next to the controls when the value differs
     from what was loaded; calls the new route; updates local state on
     success; reuses the existing `acting`-state loading/disable pattern
     already in the component.
   - Price + currency only — no title/description editing in this batch.

4. No changes to Approve/Reject logic, the seller-side route,
   `ProductManager.jsx`, or any other file.

## Explicitly NOT in this batch

- No changes to the public `/store` UI (batch-70/71).
- No changes to the AI Factory generation flow itself (batch-62–69).
- No bulk-edit — one row at a time.
- No real multi-currency payment collection/checkout — Razorpay
  integration, Stripe, forex conversion, tax/compliance are a separate,
  dedicated future feature requiring its own research. This batch only
  lets an admin label a price as ₹ or $ for display.
- No real-time currency conversion — if a product is priced in USD but
  checkout still charges in INR, that mismatch is a known, accepted
  limitation here, not a bug to work around.
- No title/description inline editing (declined for this batch; can be
  logged to `docs/backlog.md` as a nice-to-have if wanted later).

## Hard constraints (unchanged from all prior AI Factory batches)

Do not touch `tools.status`, `builder-agent.js`, `code-generator.js`,
`idea-pipeline.js`, `PipelineOrchestrator`, `testing-agent`, or the 5
competing status-writing code paths. This batch touches `digital_products`
records only, not the `tools` table.

## Files touched

- `server/db/migrations/041_digital_products_currency.sql` (new)
- `server/routes/store.admin.routes.js` (new route added)
- `client/src/modules/admin/store/StoreApprovalQueue.jsx` (edit)
- `docs/batches/batch-73-plan.md` (this file)

## Process

1. Branch `batch-73-admin-product-price-edit` (created off `main`; this
   batch doesn't depend on any batch-72-only code — `StoreApprovalQueue.jsx`
   and `store.admin.routes.js` predate batch-72).
2. This plan committed as the first commit on the branch.
3. Implement exactly the scope above.
4. Build/syntax verification only — no live Supabase calls.
