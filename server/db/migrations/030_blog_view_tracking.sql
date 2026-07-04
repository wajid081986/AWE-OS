-- Migration 030: Blog view tracking RPC
--
-- blog_posts already has a `views` column (default 0) that no code path has
-- ever incremented — reusing it rather than adding a duplicate view_count
-- column. Mirrors the increment_usage_count pattern already used for
-- tools.usage_count: atomic UPDATE via RPC, called from event.service.js
-- when event_type = 'blog_viewed'.

CREATE OR REPLACE FUNCTION increment_blog_post_views(p_blog_post_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE blog_posts
  SET views = COALESCE(views, 0) + 1
  WHERE id = p_blog_post_id;
END;
$$;
