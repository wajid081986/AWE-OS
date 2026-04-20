const supabase = require('../db/supabase');

/**
 * GET /api/tools
 * Returns all tools with their current metrics.
 * JWT-protected — dashboard use only.
 */
async function getAllTools(req, res) {
  try {
    const { data: tools, error } = await supabase
      .from('tools')
      .select('id, name, status, usage_count, conversion_rate, revenue, manual_override, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.json({ success: true, tools: tools || [] });
  } catch (err) {
    console.error('[tool.controller] getAllTools:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch tools' });
  }
}

module.exports = { getAllTools };
