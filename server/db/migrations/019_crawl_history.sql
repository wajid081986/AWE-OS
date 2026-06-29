-- Migration 019: crawl_history table for SEO crawl engine results

create table if not exists crawl_history (
  id           bigserial primary key,
  crawl_date   timestamptz not null default now(),
  total_pages  int         not null default 0,
  avg_words    int         not null default 0,
  score        int         not null default 0,
  grade        text        not null default 'F',
  errors       int         not null default 0,
  warnings     int         not null default 0,
  thin_content int         not null default 0,
  results      jsonb,
  created_at   timestamptz not null default now()
);

-- Index for fast lookup of recent crawls
create index if not exists crawl_history_created_at_idx on crawl_history (created_at desc);

-- Enable RLS (admin access only via service role key)
alter table crawl_history enable row level security;
