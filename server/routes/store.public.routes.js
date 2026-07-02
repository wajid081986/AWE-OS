'use strict';

const express  = require('express');
const supabase = require('../db/supabase');

const router = express.Router();

const PUBLIC_LIST_COLUMNS =
  'id, title, slug, description, category, price, thumbnail_url, tags, ' +
  'rating_avg, rating_count, sales_count, created_at, store_sellers ( display_name, slug )';

const SORTS = {
  popular:    { column: 'sales_count',  ascending: false },
  newest:     { column: 'created_at',   ascending: false },
  price_asc:  { column: 'price',        ascending: true },
  price_desc: { column: 'price',        ascending: false },
  rating:     { column: 'rating_avg',   ascending: false },
};

function sanitizeSearch(q) {
  return String(q || '').replace(/[,()%_]/g, ' ').trim().slice(0, 100);
}

// ── GET /api/store/products ──────────────────────────────────────────────────
router.get('/products', async (req, res) => {
  try {
    const { q, category, sort = 'newest', minPrice, maxPrice } = req.query;
    const page  = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 24, 1), 60);
    const from  = (page - 1) * limit;
    const to    = from + limit - 1;

    let query = supabase
      .from('digital_products')
      .select(PUBLIC_LIST_COLUMNS, { count: 'exact' })
      .eq('status', 'approved')
      .eq('is_published', true);

    if (category) query = query.eq('category', category);
    if (minPrice) query = query.gte('price', Number(minPrice));
    if (maxPrice) query = query.lte('price', Number(maxPrice));

    const safeQ = sanitizeSearch(q);
    if (safeQ) query = query.or(`title.ilike.%${safeQ}%,description.ilike.%${safeQ}%`);

    const { column, ascending } = SORTS[sort] || SORTS.newest;
    query = query.order(column, { ascending }).range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ products: data, page, limit, total: count || 0 });
  } catch (err) {
    console.error('GET /store/products error:', err.message);
    res.status(500).json({ error: 'Failed to load products' });
  }
});

// ── GET /api/store/categories ─────────────────────────────────────────────────
router.get('/categories', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('digital_products')
      .select('category')
      .eq('status', 'approved')
      .eq('is_published', true);
    if (error) throw error;

    const counts = {};
    for (const row of data) counts[row.category] = (counts[row.category] || 0) + 1;
    const categories = Object.entries(counts).map(([category, count]) => ({ category, count }));

    res.json({ categories });
  } catch (err) {
    console.error('GET /store/categories error:', err.message);
    res.status(500).json({ error: 'Failed to load categories' });
  }
});

// ── GET /api/store/featured ────────────────────────────────────────────────────
router.get('/featured', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('digital_products')
      .select(PUBLIC_LIST_COLUMNS)
      .eq('status', 'approved')
      .eq('is_published', true)
      .order('sales_count', { ascending: false })
      .order('rating_avg', { ascending: false })
      .limit(12);
    if (error) throw error;

    res.json({ products: data });
  } catch (err) {
    console.error('GET /store/featured error:', err.message);
    res.status(500).json({ error: 'Failed to load featured products' });
  }
});

// ── GET /api/store/products/:slug ──────────────────────────────────────────────
// MUST be registered after /products/featured-style static paths but slug is a
// separate segment (/products/:slug) so no ordering conflict with /products above.
router.get('/products/:slug', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('digital_products')
      .select(
        'id, title, slug, description, category, price, thumbnail_url, tags, ' +
        'rating_avg, rating_count, sales_count, created_at, seller_id, ' +
        'store_sellers ( id, display_name, slug, avatar_url, bio )'
      )
      .eq('slug', req.params.slug)
      .eq('status', 'approved')
      .eq('is_published', true)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Product not found' });

    res.json({ product: data });
  } catch (err) {
    console.error('GET /store/products/:slug error:', err.message);
    res.status(500).json({ error: 'Failed to load product' });
  }
});

// ── GET /api/store/products/:slug/reviews ──────────────────────────────────────
router.get('/products/:slug/reviews', async (req, res) => {
  try {
    const page  = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    const from  = (page - 1) * limit;
    const to    = from + limit - 1;

    const { data: product, error: productErr } = await supabase
      .from('digital_products')
      .select('id')
      .eq('slug', req.params.slug)
      .eq('status', 'approved')
      .eq('is_published', true)
      .maybeSingle();
    if (productErr) throw productErr;
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const { data, error, count } = await supabase
      .from('store_reviews')
      .select('id, rating, title, body, created_at', { count: 'exact' })
      .eq('product_id', product.id)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw error;

    res.json({ reviews: data, page, limit, total: count || 0 });
  } catch (err) {
    console.error('GET /store/products/:slug/reviews error:', err.message);
    res.status(500).json({ error: 'Failed to load reviews' });
  }
});

module.exports = router;
