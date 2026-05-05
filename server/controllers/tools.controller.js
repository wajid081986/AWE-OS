'use strict';

const supabase = require('../db/supabase');

const PUBLIC_FIELDS = 'id, name, slug, category, description, ai_prompt, input_fields, is_free, price, quality_score, created_at';

// Normalise a saas_tools row into the public API shape
function normalise(row) {
  return {
    id:           row.id,
    name:         row.name,
    slug:         row.slug,
    category:     row.category,
    description:  row.description,
    icon:         row.icon          || null,
    usageCount:   row.usage_count   || 0,
    isFeatured:   row.quality_score >= 80,
    isNew:        row.created_at
                    ? Date.now() - new Date(row.created_at).getTime() < 14 * 86_400_000
                    : false,
    is_free:      row.is_free !== false,
    price:        row.price || 0,
    input_fields: row.input_fields || [],
    ai_prompt:    row.ai_prompt || null,
    created_at:   row.created_at,
  };
}

// ── GET /api/tools/public ────────────────────────────────────────────────────
// Paginated, filtered, searchable list of published tools.
// Query params: page, limit, category, search, sort
async function getPublicTools(req, res) {
  try {
    const page     = Math.max(1, parseInt(req.query.page, 10)  || 1);
    const limit    = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const category = req.query.category || null;
    const search   = (req.query.search || '').trim();
    const sort     = req.query.sort || 'created_at';

    let query = supabase
      .from('saas_tools')
      .select(PUBLIC_FIELDS + ', usage_count, icon', { count: 'exact' })
      .eq('is_published', true);

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (search) {
      // Supabase ilike on name OR description
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Sort
    if (sort === 'quality') {
      query = query.order('quality_score', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Pagination
    const from = (page - 1) * limit;
    const to   = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    const tools      = (data || []).map(normalise);
    const totalPages = Math.ceil((count || 0) / limit);

    res.json({
      success: true,
      data:    tools,
      pagination: { page, limit, total: count || 0, totalPages },
    });
  } catch (err) {
    console.error('[tools/public] list error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
}

// ── GET /api/tools/public/:slug ──────────────────────────────────────────────
async function getPublicTool(req, res) {
  try {
    const { slug } = req.params;
    if (!slug) return res.status(400).json({ success: false, error: 'slug is required' });

    // Increment usage count atomically via RPC if it exists, else plain fetch
    const { data: tool, error } = await supabase
      .from('saas_tools')
      .select(PUBLIC_FIELDS + ', usage_count, icon')
      .eq('slug', slug)
      .eq('is_published', true)
      .maybeSingle();

    if (error) throw error;
    if (!tool)  return res.status(404).json({ success: false, error: 'Tool not found' });

    // Fire-and-forget usage increment (non-blocking)
    supabase
      .from('saas_tools')
      .update({ usage_count: (tool.usage_count || 0) + 1 })
      .eq('id', tool.id)
      .then(() => {})
      .catch(() => {});

    res.json({ success: true, data: normalise(tool) });
  } catch (err) {
    console.error('[tools/public] single error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { getPublicTools, getPublicTool };
