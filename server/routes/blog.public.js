const express  = require('express')
const supabase = require('../db/supabase')

const router = express.Router()

// snake_case DB row → camelCase frontend shape
function normalise(row) {
  return {
    id:              row.id,
    slug:            row.slug,
    title:           row.title,
    date:            row.date,
    category:        row.category     || 'General',
    author:          row.author       || 'AWE-OS Team',
    readTime:        row.read_time    || '5 min read',
    excerpt:         row.excerpt      || '',
    metaTitle:       row.meta_title   || row.title,
    metaDescription: row.meta_description || '',
    content:         row.content      || [],
    faqs:            row.faqs         || [],
    relatedTools:    row.related_tools || [],
    tags:            row.tags         || [],
  }
}

// GET /api/blog/posts
router.get('/posts', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('id, slug, title, date, category, author, read_time, excerpt, meta_title, meta_description, related_tools')
      .eq('status', 'published')
      .order('date', { ascending: false })
    if (error) throw error
    res.json({ success: true, posts: (data || []).map(normalise) })
  } catch (err) {
    console.error('[blog/posts]', err.message)
    res.json({ success: true, posts: [] })
  }
})

// GET /api/blog/posts/:slug
router.get('/posts/:slug', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', req.params.slug)
      .eq('status', 'published')
      .maybeSingle()
    if (error) throw error
    if (!data) return res.status(404).json({ success: false, error: 'Post not found' })
    res.json({ success: true, post: normalise(data) })
  } catch (err) {
    console.error('[blog/posts/:slug]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = router
