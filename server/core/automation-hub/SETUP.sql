-- ════════════════════════════════════════════════════════
-- Phase 6 — Automation Hub: Supabase Table Setup
-- Run this in the Supabase SQL Editor
-- ════════════════════════════════════════════════════════

-- 1. GSC Indexing Log
create table if not exists gsc_index_log (
  id            uuid        primary key default gen_random_uuid(),
  url           text        not null,
  type          text        default 'URL_UPDATED',
  status        text        not null,          -- submitted | failed | skipped
  error_message text,
  submitted_at  timestamptz default now()
);
create index if not exists idx_gsc_url       on gsc_index_log(url);
create index if not exists idx_gsc_status    on gsc_index_log(status);
create index if not exists idx_gsc_submitted on gsc_index_log(submitted_at);

-- 2. Scheduled Social Posts
create table if not exists scheduled_posts (
  id               uuid        primary key default gen_random_uuid(),
  platform         text        not null,       -- reddit | quora | pinterest
  title            text        not null,
  content          text        not null,
  target_community text,
  hashtags         text[],
  call_to_action   text,
  tool_url         text,
  status           text        default 'scheduled',  -- scheduled | published | cancelled
  scheduled_at     timestamptz,
  published_at     timestamptz,
  created_at       timestamptz default now(),
  updated_at       timestamptz
);
create index if not exists idx_posts_platform  on scheduled_posts(platform);
create index if not exists idx_posts_status    on scheduled_posts(status);
create index if not exists idx_posts_scheduled on scheduled_posts(scheduled_at);

-- 3. Publish Queue
create table if not exists publish_queue (
  id            uuid        primary key default gen_random_uuid(),
  type          text        not null,           -- blog | city | comparison | faq
  title         text        not null,
  slug          text,
  page_data     jsonb,
  priority      integer     default 5,          -- higher = sooner
  status        text        default 'queued',   -- queued | processing | published | failed
  live_url      text,
  error_message text,
  published_at  timestamptz,
  created_at    timestamptz default now()
);
create index if not exists idx_queue_status   on publish_queue(status);
create index if not exists idx_queue_priority on publish_queue(priority desc);
create index if not exists idx_queue_created  on publish_queue(created_at);
