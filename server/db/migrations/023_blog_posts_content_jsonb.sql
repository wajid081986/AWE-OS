-- Migration 023: Fix blog_posts.content column type (TEXT -> JSONB)
-- Run in Supabase SQL Editor, AFTER 020 and 022.
--
-- Root cause of "raw JSON showing" on blog posts: this column was created as
-- TEXT (originally meant for markdown from the marketing-agent pipeline), but
-- admin-blog.js / auto-campaign.js write {type,text} block arrays into it.
-- Supabase/PostgREST silently stringifies those arrays into the TEXT column,
-- so the frontend receives a JSON string instead of a real array and renders
-- it as one raw, unparsed blob of text.
--
-- Pre-requisite (already done for the current 8 rows by an ad-hoc script):
-- every row's `content` value must be valid JSON before this cast runs, or
-- the ALTER will fail outright. If you add more marketing-agent-authored
-- rows with plain markdown content before running this, convert them to a
-- JSON block array first (e.g. `[{"type":"p","text":"<markdown>"}]` at a
-- minimum) or the cast below will error on that row.

ALTER TABLE blog_posts
  ALTER COLUMN content TYPE JSONB USING content::jsonb,
  ALTER COLUMN content SET DEFAULT '[]'::jsonb;

-- Force PostgREST to reload the schema cache so the new column type is
-- picked up immediately (no server restart needed).
NOTIFY pgrst, 'reload schema';
