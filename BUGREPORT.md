# BUG: POST /api/events/track returns 500 for blog_viewed

## Reproduction — Case A: real DB UUID `blog_post_id`

Request:
```
POST /api/events/track
Content-Type: application/json

{"event_type":"blog_viewed","metadata":{"blog_post_id":"ab126a28-8a8b-4e60-90bc-893161b221e7"}}
```
(`ab126a28-8a8b-4e60-90bc-893161b221e7` is a genuine row in `blog_posts`, confirmed via a direct `select` before this test.)

Full response:
```
HTTP/1.1 500 Internal Server Error
X-Request-ID: 08675883-a950-449e-8423-92ddd90b4784
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Origin-Agent-Cluster: ?1
Referrer-Policy: no-referrer
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-DNS-Prefetch-Control: off
X-Download-Options: noopen
X-Frame-Options: SAMEORIGIN
X-Permitted-Cross-Domain-Policies: none
X-XSS-Protection: 0
Vary: Origin, Accept-Encoding
Access-Control-Allow-Credentials: true
RateLimit-Policy: 20;w=60
RateLimit-Limit: 20
RateLimit-Remaining: 19
RateLimit-Reset: 60
Content-Type: application/json; charset=utf-8
Content-Length: 49
ETag: W/"31-FwKeKuS27wGmufzeZ9eqpmym9VI"
X-Response-Time: 235.0ms
Date: Sun, 05 Jul 2026 05:02:24 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"success":false,"error":"Failed to track event"}
```

Server console at the moment this request was handled:
```
[event.service] insert failed: new row for relation "tool_events" violates check constraint "tool_events_event_type_check"
[controller] trackEvent: new row for relation "tool_events" violates check constraint "tool_events_event_type_check"
[2026-07-05T05:16:46.139Z] POST /track 500 477ms
```

Note on "stack trace": there isn't a JS call-stack beyond these two lines. The error object returned by
`supabase.from('tool_events').insert(...)` is a `PostgrestError` (a plain data object: `{message, details, hint, code}`
from the PostgREST HTTP response), not a `new Error()` constructed in JS — so there's no `.stack` to capture. Both
`event.service.js` and the controller only log `err.message` (see `server/services/event.service.js:54` and
`server/controllers/event.controller.js:46`), which is why the console shows the message twice (once from each log
site) and nothing more. The message text above is everything Postgres returned about the failure.

## Reproduction — Case B: non-UUID `blog_post_id` (static post, e.g. `id: 48`)

Request:
```
POST /api/events/track
Content-Type: application/json

{"event_type":"blog_viewed","metadata":{"blog_post_id":48}}
```

Response:
```
HTTP/1.1 500 Internal Server Error
Content-Type: application/json; charset=utf-8

{"success":false,"error":"Failed to track event"}
```

Server console:
```
[event.service] insert failed: new row for relation "tool_events" violates check constraint "tool_events_event_type_check"
[controller] trackEvent: new row for relation "tool_events" violates check constraint "tool_events_event_type_check"
[2026-07-05T05:16:46.281Z] POST /track 500 82ms
```

**Identical failure to Case A** — same constraint, same message. The non-UUID value never gets far enough to matter.

## Control test (for comparison): `tool_viewed` against the same server/DB

Request:
```
POST /api/events/track
{"event_type":"tool_viewed","tool_id":"04469b5a-92e1-407a-acb2-c1304c10d5c9"}
```
Response:
```
{"success":true,"event_id":"edc97739-ed4d-4a3b-b84d-4ef15b0ff9bf","message":"Event tracked"}
```
No error in console for this request. This is the same live Supabase project, same code, same process — the only
variable is `event_type`.

## Root-cause conclusion

**Exact failing operation:** the `INSERT` statement executed by this call in `server/services/event.service.js`
(function `trackEvent`, ~lines 40–51):

```js
const { data: event, error } = await supabase
  .from('tool_events')
  .insert({
    tool_id,
    user_id: user_id || null,
    event_type,      // <-- 'blog_viewed' — this is the value rejected
    metadata,
    ip_address,
    user_agent,
  })
  .select()
  .single();

if (error) {
  console.error('[event.service] insert failed:', error.message);
  throw error;          // <-- propagates to controller, becomes the 500
}
```

**Why it fails:** the `tool_events` table has a Postgres `CHECK` constraint named `tool_events_event_type_check`
that enumerates a fixed allow-list of `event_type` values. That constraint was created (directly in Supabase — there
is no tracked migration for `tool_events` in this repo) before `'blog_viewed'` was added to the application-level
`VALID_EVENT_TYPES` set in `event.service.js`. So every `blog_viewed` insert is rejected at the database level, the
service function throws, and the controller's catch-all (`server/controllers/event.controller.js:45-52`) turns any
non-4xx error into a bare `500 "Failed to track event"`.

This happens **before** the code ever reaches the `increment_blog_post_views` RPC call (the block just after the
insert). That means:
- The `tool_id` NOT NULL hypothesis is **false** — confirmed nullable via PostgREST OpenAPI introspection
  (`definitions.tool_events.required` = `["id"]` only; `tool_id` not required).
- The non-UUID `blog_post_id` (static posts) hypothesis is **real as a separate, smaller issue** — passing a plain
  integer to `increment_blog_post_views` (which expects a UUID parameter) would fail that RPC call — but that call
  was already wrapped in a log-only branch (`if (rpcErr) console.error(...)`, no throw), so it was never the source
  of the 500 and never crashed anything on its own.
- The one and only reproducible cause of the 500 is the stale `event_type` CHECK constraint.

## Migration 031 — still needed

Yes, still needed — it is the actual fix for the 500. Kept as `server/db/migrations/031_tool_events_event_type_check.sql`,
not applied (file only, per your process — paste into the Supabase SQL Editor).

Full contents:

```sql
-- Migration 031: Widen tool_events.event_type CHECK to allow blog_viewed
--
-- BUG: POST /api/events/track returned 500 in production for every
-- blog_viewed event. Root cause (confirmed via local repro + server logs):
-- tool_events has a CHECK constraint on event_type that predates
-- 'blog_viewed' being added to VALID_EVENT_TYPES (event.service.js) — the
-- INSERT itself violates the constraint, before the code ever reaches the
-- increment_blog_post_views RPC call.
--
-- Same situation as migration 029 (newsletters.status): tool_events was not
-- created by any tracked migration in this repo, so its exact CHECK
-- definition is unknown ahead of time. Find and replace it at execution
-- time, widened to match VALID_EVENT_TYPES exactly.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.tool_events'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%event_type%'
  LOOP
    EXECUTE format('ALTER TABLE tool_events DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE tool_events
  ADD CONSTRAINT tool_events_event_type_check
  CHECK (event_type IN (
    'tool_viewed', 'tool_used', 'resume_generated', 'payment_success',
    'user_signup', 'tool_shared', 'feature_clicked', 'blog_viewed'
  ));
```

It dynamically finds and drops whatever the existing `event_type` CHECK constraint is named (name unknown ahead of
time, same as migration 029 for `newsletters.status`), then re-adds it widened to the exact 8 values in
`VALID_EVENT_TYPES`.

## Diff summary of all code changes

### `client/src/pages/BlogPostPage.jsx` — frontend guard

```diff
   // Fire once per browser session per post — fire-and-forget, never blocks render.
+  // Only for DB-backed posts: static posts (data/blogPosts.js) use plain
+  // integer ids with no matching blog_posts row, so increment_blog_post_views
+  // (which expects a UUID) has nothing to increment — skip them silently.
   useEffect(() => {
-    if (!post?.id) return
-    const sessionKey = VIEWED_SESSION_PREFIX + (post.slug || slug)
+    if (!dbPost?.id) return
+    const sessionKey = VIEWED_SESSION_PREFIX + (dbPost.slug || slug)
     if (sessionStorage.getItem(sessionKey)) return
     sessionStorage.setItem(sessionKey, '1')
-    trackEvent('blog_viewed', { blog_post_id: post.id })
-  }, [post, slug, trackEvent])
+    trackEvent('blog_viewed', { blog_post_id: dbPost.id })
+  }, [dbPost, slug, trackEvent])
```
`post` was `staticPost || dbPost`. Static posts never populate `dbPost` (the fetch effect returns early when
`staticPost` exists), so keying off `dbPost` means `blog_viewed` only fires when a real DB UUID exists.

### `server/services/event.service.js` — backend guard (defense-in-depth, not the 500 fix itself)

```diff
 const supabase = require('../db/supabase');
 
+// increment_blog_post_views expects a UUID — static-post ids (plain integers,
+// see client/src/data/blogPosts.js) don't match and would fail the RPC.
+const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
+
 const VALID_EVENT_TYPES = new Set([
   ...
   // blog_viewed has no tool_id — the post is identified via metadata.blog_post_id
   if (event_type === 'blog_viewed' && metadata?.blog_post_id) {
-    const { error: rpcErr } = await supabase.rpc('increment_blog_post_views', { p_blog_post_id: metadata.blog_post_id });
-    if (rpcErr) console.error('[event.service] blog view increment failed:', rpcErr.message);
+    if (UUID_REGEX.test(String(metadata.blog_post_id))) {
+      const { error: rpcErr } = await supabase.rpc('increment_blog_post_views', { p_blog_post_id: metadata.blog_post_id });
+      if (rpcErr) console.error('[event.service] blog view increment failed:', rpcErr.message);
+    } else {
+      console.warn('[event.service] blog_viewed: blog_post_id is not a UUID, skipping view increment:', metadata.blog_post_id);
+    }
   }
```
Only the `event_type === 'blog_viewed'` branch is touched. A non-UUID `blog_post_id` (e.g. from a direct API call
bypassing the frontend guard) is now skipped with a warning log instead of attempting an RPC call that would fail
Postgres's UUID cast. This does not fix the 500 — migration 031 does — it only hardens the RPC call for any client
that still sends a bad id after the migration is applied.

### `server/db/migrations/031_tool_events_event_type_check.sql` — new file (not applied)

See full contents above.

## `tool_viewed` behavior — confirmed unchanged

- Neither diff touches the `event_type === 'tool_used'` block (`increment_usage_count` RPC) or
  `client/src/hooks/useTrackToolView.js` — both untouched.
- Migration 031 only *adds* `'blog_viewed'` to the CHECK constraint's allow-list; `'tool_viewed'` was already present
  (proven by the control test above returning 201) and stays present.
- The control test above (`tool_viewed` → 201 success) was run against the same live Supabase project used for the
  failing `blog_viewed` reproductions, confirming `tool_viewed` was never affected — in dev or production.
