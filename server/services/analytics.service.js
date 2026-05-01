const supabase = require('../db/supabase');

const trackToolUsage = async (userId, toolSlug, inputsCount, outputLength, responseTimeMs) => {
  await supabase.from('tool_usage_events').insert({
    user_id:          userId,
    tool_slug:        toolSlug,
    inputs_count:     inputsCount,
    output_length:    outputLength,
    response_time_ms: responseTimeMs,
  });
};

const getAdminAnalytics = async (days = 30) => {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data: revenueData } = await supabase
    .from('revenue_logs')
    .select('amount, type, created_at')
    .gte('created_at', since.toISOString());

  const totalRevenue = revenueData?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;

  const monthStart = new Date();
  monthStart.setDate(1);
  const { data: mrrData } = await supabase
    .from('revenue_logs')
    .select('amount')
    .gte('created_at', monthStart.toISOString());
  const mrr = mrrData?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;

  const { count: totalUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  const { count: newUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', since.toISOString());

  const { data: usageData } = await supabase
    .from('tool_usage_events')
    .select('tool_slug')
    .gte('created_at', since.toISOString());

  const toolUsage = {};
  usageData?.forEach(e => {
    toolUsage[e.tool_slug] = (toolUsage[e.tool_slug] || 0) + 1;
  });

  const topTools = Object.entries(toolUsage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([slug, count]) => ({ slug, count }));

  const revenueByType = {};
  revenueData?.forEach(r => {
    revenueByType[r.type] = (revenueByType[r.type] || 0) + Number(r.amount);
  });

  const dailyRevenue = {};
  revenueData?.forEach(r => {
    const date = r.created_at.split('T')[0];
    dailyRevenue[date] = (dailyRevenue[date] || 0) + Number(r.amount);
  });

  return {
    totalRevenue,
    mrr,
    arr: mrr * 12,
    totalUsers,
    newUsers,
    topTools,
    revenueByType,
    dailyRevenue,
  };
};

const getUserAnalytics = async (userId) => {
  const { data: toolsUsed } = await supabase
    .from('tool_usage_events')
    .select('tool_slug, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);

  const toolCount = {};
  toolsUsed?.forEach(e => {
    toolCount[e.tool_slug] = (toolCount[e.tool_slug] || 0) + 1;
  });

  const { data: purchases } = await supabase
    .from('revenue_logs')
    .select('amount')
    .eq('user_id', userId);

  const totalSpent = purchases?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

  return {
    toolsUsed:       Object.keys(toolCount).length,
    totalGenerations: toolsUsed?.length || 0,
    favoriteTools:   Object.entries(toolCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([slug, count]) => ({ slug, count })),
    totalSpent,
    recentActivity:  toolsUsed?.slice(0, 10),
  };
};

module.exports = { trackToolUsage, getAdminAnalytics, getUserAnalytics };
