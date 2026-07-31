-- Migration 036: video_generations table for Video Agent (Wan 2.7 via Replicate)

create table if not exists video_generations (
  id              uuid        primary key default gen_random_uuid(),
  prompt          text        not null,
  negative_prompt text,
  style           varchar(50),
  duration        integer,
  mode            varchar(20) default 'text-to-video',
  video_url       text,
  generated_at    timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

-- Index for fast "recent generations" lookup
create index if not exists video_generations_generated_at_idx on video_generations (generated_at desc);

-- Enable RLS (admin access only via service role key)
alter table video_generations enable row level security;
