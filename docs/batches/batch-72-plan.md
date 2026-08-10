# Batch 72 — Marketplace Listing Automation (SDD §3)

## Research findings (mandatory pre-work, per SDD §3.4)

**Target table:** `digital_products` (confirmed — this is the Store's live catalog table, migration 024 baseline + 025 multi-vendor extension). No other candidate table exists.

**Existing human-seller listing-creation path:** `POST /api/store/seller/products` in
`server/routes/store.seller.routes.js:180-212`. Inserts:
```js
{ title, description, category, price, file_key, file_type, file_size,
  thumbnail_url, seller_id, slug, tags, status: 'pending', is_published: false }
```
This is the exact mechanism to mirror.

**Draft/pending state already exists — confirmed, do not invent one.**
`digital_products.status` has a CHECK constraint: `'draft' | 'pending' | 'approved' | 'rejected'`
(migration 025). A DB trigger (`fn_sync_digital_products_status_published`, migration 027) forces
`is_published = (status = 'approved')` **on every INSERT**, regardless of what the insert payload
says. So inserting with `status: 'pending'` is enough — `is_published` cannot accidentally come in
`true`; the trigger overrides it. This is exactly what human sellers get today after uploading a
product, before admin review.

**Existing admin review queue picks this up automatically, no new UI needed:**
`GET /api/store/admin/products/pending` (`store.admin.routes.js:10`) lists all `status='pending'`
rows and is already rendered by `client/src/modules/admin/store/StoreApprovalQueue.jsx`. That
component already handles `seller_id = null` gracefully — it renders `p.store_sellers?.display_name
|| 'Platform'` — meaning **seller-less, platform-owned listings are an already-supported, already-
tested case**, not a new concept. Historical pre-marketplace rows (migration 025 comment) are all
`seller_id = NULL` for the same reason ("platform-owned sales").

**Field mapping (`tools` row + `packaging_metadata.listing` → `digital_products` insert):**

| digital_products | source |
|---|---|
| `title` | `packaging_metadata.listing.title` (= `tools.name`) |
| `description` | `packaging_metadata.listing.description` |
| `category` | `packaging_metadata.listing.category` |
| `price` | `packaging_metadata.listing.price` (= `tools.price`, currently always 0 — see decision below) |
| `tags` | `packaging_metadata.listing.tags` |
| `file_key` | `tools.asset_url` (S3 key of the bundle's primary/entry file — see gap note below) |
| `file_type` | derived from `tools.asset_url` extension (same `mimeTypeFor`-style mapping used in `ai-factory.service.js`) |
| `thumbnail_url` | `null` (`packaging_metadata.listing.screenshots` is always `[]` today — no thumbnail source exists yet) |
| `seller_id` | `null` ("Platform" — see decision below) |
| `slug` | derived from `title`, uniqueness-checked against `digital_products` (same `slugify`/`uniqueSlug` pattern as the seller route — these are small pure helpers, duplicated rather than importing an unexported internal from `store.seller.routes.js`, since changing that file's `module.exports` shape would break its direct `require()` mount in `server/index.js:46,311`) |
| `status` | `'pending'` (→ trigger forces `is_published = false` on insert) |

**Known gap, not fixed in this batch (flagging per SDD §7 "no fix while you're there"):** AI-Factory
bundles are uploaded file-by-file to S3 (`ai-factory.service.js:406-412`), not zipped. `asset_url`
points only at the *primary* file (e.g. `index.html`), so `file_key` will only let a buyer download
that one file, not the full bundle. This is a pre-existing packaging characteristic, out of scope
here — logging to `docs/backlog.md`.

## Pricing / draft-state decision — needs your confirmation

The SDD asked me to check whether the Store already has a draft/pending state (it does, see above)
and, if so, use it rather than inventing anything new. I'm doing that: **every AI-Factory-approved
listing is created with `status: 'pending'`, which is already unpublished (`is_published = false`
via the trigger) and already shows up in the existing Admin → Store Approvals queue for a human to
Approve or Reject.** Nothing goes live without that explicit click — this satisfies "don't
auto-publish a $0 listing as if it were intentionally priced."

One real limitation I want to flag before building: **the existing approval queue has no price-edit
control** — only Approve / Reject (`StoreApprovalQueue.jsx`, `store.admin.routes.js:27-59`). The only
place price can be edited today is `PUT /api/store/seller/products/:id`, which is ownership-gated to
a real `store_sellers` row (`seller_id` must match the authenticated seller). Since these listings
have `seller_id = null`, that edit path isn't usable for them as-is.

Two ways to handle this, and I'd like you to pick:

- **Option A (recommended, zero new moving parts):** Ship it as above — `seller_id = null`,
  `status = 'pending'`. If price is `0`, the admin sees `₹0` in the queue and can Approve (ship it
  free, which is often correct — `tools.is_free` defaults `true` for these products, i.e. price=0 is
  frequently *intentional*, not a mistake) or Reject. No price-editing exists for these rows in this
  batch; a follow-up batch could add a price field to the approval queue if that turns out to matter
  in practice.
- **Option B:** Assign these listings to a real "platform" seller account (a `store_sellers` row tied
  to an actual admin user), so the existing seller-side edit-listing screen becomes usable for
  setting a real price before/after it hits the queue. This requires deciding *which* user account
  owns that seller row — a real product/account decision, not something I'll invent — and is more
  moving parts for a benefit (in-flow price editing) that may not be needed if most listings are
  intentionally free.

I recommend **Option A**. Let me know if you want A or B before I implement.

## Implementation plan (pending your answer above)

1. **New file: `server/services/marketplace-listing.service.js`**
   - Exports `createMarketplaceListing(tool)` (or similar).
   - Guards: no-op (returns `null`) if `tool.product_type === 'prompt-tool'` or
     `!tool.packaging_metadata?.listing`.
   - Builds the insert row per the mapping table above, generates a unique slug against
     `digital_products`, inserts via the service-role `supabase` client
     (`server/db/supabase.js`, same client every other store route uses).
   - Best-effort: catches and logs its own errors, never throws — matches the existing
     `generatePackaging()` non-fatal convention in `ai-factory.service.js:487-496`, since a
     marketplace-listing failure must not break tool approval.

2. **Hook point: `server/routes/tools.routes.js:257` (`PUT /:id`)**
   - After the existing `update` + `select().single()` succeeds, if `row.approved === true` **and**
     the DB row's `product_type !== 'prompt-tool'`, call
     `marketplace-listing.service.createMarketplaceListing(tool)` (fire-and-forget-safe — awaited,
     but wrapped so a failure doesn't fail the response, matching item 1's non-fatal contract).
   - No change to any other branch of this handler; prompt-tool approvals behave exactly as today.

3. **No DB migration needed** — no schema changes, `digital_products` already has every column
   required.

4. **No changes to `builder-agent.js`, `code-generator.js`, `idea-pipeline.js`,
   `PipelineOrchestrator`, `testing-agent`, `tools.status`, or `store.seller.routes.js`.**

5. **Verification (per constraint: no live Supabase calls this batch):**
   - `node -c` / lint the new service file and the modified route file.
   - Trace the insert payload by hand against the `digital_products` CHECK constraints and
     NOT NULL columns (done above) to confirm it won't be rejected at the DB layer once run live.
   - No live approval-flow test this batch — flagged for a manual verification pass before next
     deploy.

## Files touched
- `server/services/marketplace-listing.service.js` (new)
- `server/routes/tools.routes.js` (additive hook only, `PUT /:id` handler)
- `docs/backlog.md` (log the single-file-bundle `file_key` gap noted above)
- `docs/batches/batch-72-plan.md` (this file)
