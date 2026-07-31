-- Migration 035: image_generations table for Image Agent (Stability AI)

create table if not exists image_generations (
  id              uuid        primary key default gen_random_uuid(),
  prompt          text        not null,
  negative_prompt text,
  style           varchar(50),
  size            varchar(20),
  image_base64    text,
  seed            bigint,
  generated_at    timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

-- Index for fast "recent generations" lookup
create index if not exists image_generations_generated_at_idx on image_generations (generated_at desc);

-- Enable RLS (admin access only via service role key)
alter table image_generations enable row level security;
