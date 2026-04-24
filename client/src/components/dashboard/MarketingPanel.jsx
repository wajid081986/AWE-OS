import { useState, useEffect, useCallback } from 'react';

// ── Local API layer ───────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL || 'https://awe-os.onrender.com';

function getToken() { return localStorage.getItem('awe_token'); }

async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ── Helpers ───────────────────────────────────────────────────

function n(v, fallback = 0) { return v ?? fallback; }
function fmtINR(v) { return '₹' + Number(v || 0).toLocaleString('en-IN'); }
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function daysUntil(d) {
  if (!d) return '—';
  const days = Math.ceil((new Date(d) - Date.now()) / 86400000);
  return days > 0 ? `${days}d left` : 'Expired';
}
function labelify(s) { return (s || '').replace(/_/g, ' '); }

// ── Tiny shared components ────────────────────────────────────

function Spinner({ sm }) {
  const cls = sm ? 'h-4 w-4 border-2' : 'h-5 w-5 border-2';
  return (
    <div
      className={`${cls} border-white border-t-transparent rounded-full animate-spin inline-block flex-shrink-0`}
    />
  );
}

function Badge({ label, colorClass }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colorClass}`}>
      {label}
    </span>
  );
}

function CharBar({ val, limit }) {
  const pct = Math.min(100, (val / limit) * 100);
  const ok  = val <= limit;
  return (
    <div className="mt-1">
      <div className="flex justify-between text-xs text-gray-500 mb-0.5">
        <span>{val} / {limit} chars</span>
        {!ok && <span className="text-red-400">Over limit</span>}
      </div>
      <div className="w-full bg-gray-700 rounded-full h-1">
        <div
          className={`h-1 rounded-full transition-all ${ok ? 'bg-green-500' : 'bg-red-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Badge helpers ─────────────────────────────────────────────

function seoBadgeCls(score) {
  if (score > 80)  return 'bg-green-900 text-green-300';
  if (score >= 60) return 'bg-yellow-900 text-yellow-300';
  return 'bg-red-900 text-red-300';
}

function blogStatusCls(status) {
  const map = {
    draft:     'bg-gray-700 text-gray-300',
    review:    'bg-yellow-900 text-yellow-300',
    approved:  'bg-blue-900 text-blue-300',
    published: 'bg-green-900 text-green-300',
    archived:  'bg-gray-900 text-gray-500',
  };
  return map[status] || 'bg-gray-700 text-gray-300';
}

function nlStatusCls(status) {
  const map = {
    draft:     'bg-gray-700 text-gray-300',
    approved:  'bg-blue-900 text-blue-300',
    scheduled: 'bg-purple-900 text-purple-300',
    sent:      'bg-green-900 text-green-300',
  };
  return map[status] || 'bg-gray-700 text-gray-300';
}

// ── Constants ─────────────────────────────────────────────────

const BLOG_TYPES = [
  'how_to_guide', 'listicle', 'case_study',
  'comparison', 'press_release',
];
const SEGMENTS = [
  'all_users', 'free_users', 'premium_users',
  'inactive_users', 'new_users',
];
const TABS = [
  { id: 'blog',        label: 'Blog' },
  { id: 'newsletter',  label: 'Newsletter' },
  { id: 'ads',         label: 'Ads' },
  { id: 'referrals',   label: 'Referrals' },
  { id: 'influencers', label: 'Influencers' },
  { id: 'competitors', label: 'Competitors' },
  { id: 'calendar',    label: 'Calendar' },
];

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

export default function MarketingPanel() {

  // ── Core state ─────────────────────────────────────────────
  const [activeTab,    setActiveTab]    = useState('blog');
  const [dashboard,    setDashboard]    = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [tools,        setTools]        = useState([]);

  // ── Data state ─────────────────────────────────────────────
  const [blogs,        setBlogs]        = useState([]);
  const [newsletters,  setNewsletters]  = useState([]);
  const [ads,          setAds]          = useState([]);
  const [referrals,    setReferrals]    = useState([]);
  const [influencers,  setInfluencers]  = useState([]);
  const [comparisons,  setComparisons]  = useState([]);
  const [campaigns,    setCampaigns]    = useState([]);
  const [calendar,     setCalendar]     = useState([]);

  // ── Blog UI state ──────────────────────────────────────────
  const [blogForm, setBlogForm] = useState({
    tool_id:        '',
    content_type:   'how_to_guide',
    target_keyword: '',
  });
  const [blogGenerating,  setBlogGenerating]  = useState(false);
  const [selectedBlog,    setSelectedBlog]    = useState(null);
  const [blogActLoading,  setBlogActLoading]  = useState(false);

  // ── Newsletter UI state ────────────────────────────────────
  const [nlSegment,         setNlSegment]         = useState('all_users');
  const [nlGenerating,      setNlGenerating]      = useState(false);
  const [selectedNewsletter, setSelectedNewsletter] = useState(null);
  const [nlActLoading,      setNlActLoading]      = useState(false);

  // ── Ads UI state ───────────────────────────────────────────
  const [adPlatform,    setAdPlatform]    = useState('google_search');
  const [adTool,        setAdTool]        = useState('');
  const [adCount,       setAdCount]       = useState(5);
  const [adGenerating,  setAdGenerating]  = useState(false);

  // ── Referral UI state ──────────────────────────────────────
  const [refEmail,      setRefEmail]      = useState('');
  const [refReward,     setRefReward]     = useState('discount');
  const [refCreating,   setRefCreating]   = useState(false);

  // ── Influencer UI state ────────────────────────────────────
  const [infNiche,       setInfNiche]       = useState('');
  const [infPlatform,    setInfPlatform]    = useState('youtube');
  const [infRange,       setInfRange]       = useState('10K-100K');
  const [infGenerating,  setInfGenerating]  = useState(false);
  const [expandedInf,    setExpandedInf]    = useState({});

  // ── Competitor UI state ────────────────────────────────────
  const [compTool,       setCompTool]       = useState('');
  const [compName,       setCompName]       = useState('');
  const [compGenerating, setCompGenerating] = useState(false);
  const [expandedComp,   setExpandedComp]   = useState({});

  // ── Campaign UI state ──────────────────────────────────────
  const [campGenerating, setCampGenerating] = useState(false);

  // ── Calendar UI state ──────────────────────────────────────
  const [calMonth,       setCalMonth]       = useState(new Date().getMonth() + 1);
  const [calYear,        setCalYear]        = useState(new Date().getFullYear());
  const [calTool,        setCalTool]        = useState('');
  const [calView,        setCalView]        = useState('grid');
  const [calGenerating,  setCalGenerating]  = useState(false);
  const [calPopover,     setCalPopover]     = useState(null);

  // ── On mount ───────────────────────────────────────────────
  useEffect(() => {
    fetchDashboard();
    fetchToolsList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escape key closes any open modal
  useEffect(() => {
    function handler(e) {
      if (e.key !== 'Escape') return;
      setSelectedBlog(null);
      setSelectedNewsletter(null);
      setCalPopover(null);
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Lazy-load tab data on first visit
  useEffect(() => {
    if (activeTab === 'blog')        fetchBlogs();
    if (activeTab === 'newsletter')  fetchNewsletters();
    if (activeTab === 'ads')         fetchAds();
    if (activeTab === 'referrals')   fetchReferrals();
    if (activeTab === 'influencers') fetchInfluencers();
    if (activeTab === 'competitors') fetchComparisons();
    if (activeTab === 'calendar')    fetchCalendar(calMonth, calYear, calTool);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ── Fetch helpers ──────────────────────────────────────────
  async function fetchDashboard() {
    try {
      setLoading(true);
      const res = await apiFetch('/api/marketing/dashboard');
      setDashboard(res.data || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchToolsList() {
    try {
      const res = await apiFetch('/api/tools');
      setTools(res.tools || res.data || []);
    } catch { /* non-fatal */ }
  }

  const fetchBlogs = useCallback(async (filters = {}) => {
    try {
      const p = new URLSearchParams();
      if (filters.status)  p.set('status', filters.status);
      if (filters.tool_id) p.set('tool_id', filters.tool_id);
      const qs  = p.toString();
      const res = await apiFetch(`/api/marketing/blogs${qs ? `?${qs}` : ''}`);
      setBlogs(res.data || []);
    } catch (err) { console.error('[marketing] fetchBlogs:', err.message); }
  }, []);

  const fetchNewsletters = useCallback(async () => {
    try {
      const res = await apiFetch('/api/marketing/newsletters');
      setNewsletters(res.data || []);
    } catch (err) { console.error('[marketing] fetchNewsletters:', err.message); }
  }, []);

  const fetchAds = useCallback(async (filters = {}) => {
    try {
      const p = new URLSearchParams();
      if (filters.platform) p.set('platform', filters.platform);
      if (filters.status)   p.set('status', filters.status);
      if (filters.tool_id)  p.set('tool_id', filters.tool_id);
      const qs  = p.toString();
      const res = await apiFetch(`/api/marketing/ads${qs ? `?${qs}` : ''}`);
      setAds(res.data || []);
    } catch (err) { console.error('[marketing] fetchAds:', err.message); }
  }, []);

  const fetchReferrals = useCallback(async () => {
    try {
      const res = await apiFetch('/api/marketing/referrals');
      setReferrals(res.data || []);
    } catch (err) { console.error('[marketing] fetchReferrals:', err.message); }
  }, []);

  const fetchInfluencers = useCallback(async (filters = {}) => {
    try {
      const p = new URLSearchParams();
      if (filters.status)   p.set('status', filters.status);
      if (filters.platform) p.set('platform', filters.platform);
      const qs  = p.toString();
      const res = await apiFetch(`/api/marketing/influencers${qs ? `?${qs}` : ''}`);
      setInfluencers(res.data || []);
    } catch (err) { console.error('[marketing] fetchInfluencers:', err.message); }
  }, []);

  const fetchComparisons = useCallback(async () => {
    try {
      const res = await apiFetch('/api/marketing/comparisons');
      setComparisons(res.data || []);
    } catch (err) { console.error('[marketing] fetchComparisons:', err.message); }
  }, []);

  const fetchCalendar = useCallback(async (month, year, tool_id) => {
    try {
      const p = new URLSearchParams({ month, year });
      if (tool_id) p.set('tool_id', tool_id);
      const res = await apiFetch(`/api/marketing/calendar?${p.toString()}`);
      setCalendar(res.data || []);
    } catch (err) { console.error('[marketing] fetchCalendar:', err.message); }
  }, []);

  // ── Blog handlers ──────────────────────────────────────────
  async function handleGenerateBlog() {
    if (!blogForm.tool_id || !blogForm.content_type) return;
    setBlogGenerating(true);
    setError(null);
    try {
      const tool    = tools.find(t => t.id === blogForm.tool_id);
      const keyword = blogForm.target_keyword || tool?.name || '';
      await apiFetch('/api/marketing/blog/generate', {
        method: 'POST',
        body:   JSON.stringify({ tool_id: blogForm.tool_id, content_type: blogForm.content_type, target_keyword: keyword }),
      });
      await Promise.all([fetchBlogs(), fetchDashboard()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBlogGenerating(false);
    }
  }

  async function handleBlogStatus(id, status) {
    setBlogActLoading(true);
    try {
      await apiFetch(`/api/marketing/blog/${id}/status`, {
        method: 'PATCH',
        body:   JSON.stringify({ status }),
      });
      await fetchBlogs();
      if (selectedBlog?.id === id) setSelectedBlog(prev => prev ? { ...prev, status } : null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBlogActLoading(false);
    }
  }

  // ── Newsletter handlers ────────────────────────────────────
  async function handleGenerateNewsletter() {
    setNlGenerating(true);
    setError(null);
    try {
      await apiFetch('/api/marketing/newsletter/generate', {
        method: 'POST',
        body:   JSON.stringify({ segment: nlSegment, highlights: {} }),
      });
      await Promise.all([fetchNewsletters(), fetchDashboard()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setNlGenerating(false);
    }
  }

  async function handleNewsletterStatus(id, status) {
    setNlActLoading(true);
    try {
      await apiFetch(`/api/marketing/newsletter/${id}/status`, {
        method: 'PATCH',
        body:   JSON.stringify({ status }),
      });
      await fetchNewsletters();
      if (selectedNewsletter?.id === id) setSelectedNewsletter(prev => prev ? { ...prev, status } : null);
    } catch (err) {
      setError(err.message);
    } finally {
      setNlActLoading(false);
    }
  }

  // ── Ads handlers ──────────────────────────────────────────
  async function handleGenerateAds() {
    if (!adTool) return;
    setAdGenerating(true);
    setError(null);
    try {
      await apiFetch('/api/marketing/ads/generate', {
        method: 'POST',
        body:   JSON.stringify({ tool_id: adTool, platform: adPlatform, count: adCount }),
      });
      await fetchAds({ platform: adPlatform, tool_id: adTool });
    } catch (err) {
      setError(err.message);
    } finally {
      setAdGenerating(false);
    }
  }

  async function handleAdApprove(id) {
    try {
      await apiFetch(`/api/marketing/ads/${id}/status`, {
        method: 'PATCH',
        body:   JSON.stringify({ status: 'approved' }),
      });
      await fetchAds();
    } catch (err) {
      setError(err.message);
    }
  }

  // ── Referral handlers ──────────────────────────────────────
  async function handleCreateReferral() {
    if (!refEmail) return;
    setRefCreating(true);
    setError(null);
    try {
      await apiFetch('/api/marketing/referral', {
        method: 'POST',
        body:   JSON.stringify({ user_email: refEmail, reward_type: refReward }),
      });
      setRefEmail('');
      await fetchReferrals();
    } catch (err) {
      setError(err.message);
    } finally {
      setRefCreating(false);
    }
  }

  // ── Influencer handlers ────────────────────────────────────
  async function handleGenerateInfluencers() {
    if (!infNiche) return;
    setInfGenerating(true);
    setError(null);
    try {
      await apiFetch('/api/marketing/influencers/generate', {
        method: 'POST',
        body:   JSON.stringify({ niche: infNiche, platform: infPlatform, follower_range: infRange }),
      });
      await fetchInfluencers();
    } catch (err) {
      setError(err.message);
    } finally {
      setInfGenerating(false);
    }
  }

  // ── Competitor handlers ────────────────────────────────────
  async function handleGenerateComparison() {
    if (!compTool || !compName) return;
    setCompGenerating(true);
    setError(null);
    try {
      await apiFetch('/api/marketing/comparison/generate', {
        method: 'POST',
        body:   JSON.stringify({ tool_id: compTool, competitor_name: compName }),
      });
      await fetchComparisons();
      setCompName('');
    } catch (err) {
      setError(err.message);
    } finally {
      setCompGenerating(false);
    }
  }

  async function handleCompApprove(id) {
    try {
      await apiFetch(`/api/marketing/comparison/${id}/status`, {
        method: 'PATCH',
        body:   JSON.stringify({ status: 'approved' }),
      });
      await fetchComparisons();
    } catch (err) {
      setError(err.message);
    }
  }

  // ── Calendar handlers ──────────────────────────────────────
  async function handleGenerateCalendar() {
    if (!calTool) return;
    setCalGenerating(true);
    setError(null);
    try {
      await apiFetch('/api/marketing/calendar/generate', {
        method: 'POST',
        body:   JSON.stringify({ tool_id: calTool, month: calMonth, year: calYear }),
      });
      await fetchCalendar(calMonth, calYear, calTool);
    } catch (err) {
      setError(err.message);
    } finally {
      setCalGenerating(false);
    }
  }

  async function handleCalItemStatus(id, status) {
    try {
      await apiFetch(`/api/marketing/calendar/${id}/status`, {
        method: 'PATCH',
        body:   JSON.stringify({ status }),
      });
      await fetchCalendar(calMonth, calYear, calTool);
    } catch (err) {
      setError(err.message);
    }
  }

  // ── Calendar grid helpers ──────────────────────────────────
  function buildCalendarGrid(items, month, year) {
    const daysInMonth  = new Date(year, month, 0).getDate();
    const firstWeekday = new Date(year, month - 1, 1).getDay(); // 0=Sun
    const offset       = firstWeekday === 0 ? 6 : firstWeekday - 1; // Mon-start
    const cells        = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }

  const CAL_PILL_CLS = {
    blog_post:    'bg-blue-900 text-blue-200',
    newsletter:   'bg-purple-900 text-purple-200',
    social_post:  'bg-green-900 text-green-200',
    ad_campaign:  'bg-orange-900 text-orange-200',
    influencer:   'bg-pink-900 text-pink-200',
  };

  const CAL_STATUSES = ['planned','in_progress','ready','published','postponed','cancelled'];

  // ── Today string for overdue calc ──────────────────────────
  const todayStr = new Date().toISOString().slice(0, 10);

  // ── Dashboard safe accessors ───────────────────────────────
  const db     = dashboard || {};
  const dbBlog = db.blog || db.content_pipeline || {};
  const dbNl   = db.newsletter || db.newsletters || {};
  const dbRef  = db.referral || db.referrals || {};
  const dbAds  = db.ads || {};
  const dbInf  = db.influencers || {};
  const dbCamp = db.campaigns || {};
  const dbCal  = db.content_calendar || {};

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 min-h-screen bg-gray-900 text-white">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">📣 Marketing Command Center</h1>
        <p className="text-gray-400 text-sm mt-1">AI content factory + campaigns</p>
      </div>

      {/* ── Error banner ───────────────────────────────────── */}
      {error && (
        <div className="mb-4 bg-red-900/60 border border-red-700 text-red-200 rounded-xl px-4 py-3 flex justify-between items-start gap-3">
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-white shrink-0">✕</button>
        </div>
      )}

      {/* ── Metric Cards ───────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 mb-6 text-sm">
          <Spinner sm /> Loading dashboard…
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[
            {
              icon: '📝', label: 'Blog Posts',
              line1: `${n(dbBlog.published_this_month)} published`,
              line2: `${n(dbBlog.drafts ?? dbBlog.blog_drafts)} in draft`,
            },
            {
              icon: '📧', label: 'Newsletters',
              line1: `${n(dbNl.sent_this_month)} sent`,
              line2: `${n(dbNl.avg_open_rate, 0)}% open rate`,
            },
            {
              icon: '🔗', label: 'Referrals',
              line1: `${n(dbRef.active_programs)} active`,
              line2: `${fmtINR(dbRef.revenue_attributed)} earned`,
            },
            {
              icon: '📢', label: 'Ad Copies',
              line1: `${n(dbAds.active_copies)} active`,
              line2: `${n(dbAds.avg_ctr, 0)}% avg CTR`,
            },
            {
              icon: '🌟', label: 'Influencers',
              line1: `${n(dbInf.contacted)} contacted`,
              line2: `${n(dbInf.active)} active`,
            },
            {
              icon: '🚀', label: 'Campaigns',
              line1: `${n(dbCamp.active)} running`,
              line2: `${n(dbCamp.total_roi, 0)}% avg ROI`,
            },
          ].map(card => (
            <div key={card.label} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <div className="text-xl mb-1">{card.icon}</div>
              <div className="text-xs text-gray-400 font-medium mb-2">{card.label}</div>
              <div className="text-sm font-semibold text-white">{card.line1}</div>
              <div className="text-xs text-gray-500 mt-0.5">{card.line2}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab Bar ────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1 mb-6 bg-gray-800 rounded-xl p-1 border border-gray-700">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════ */}
      {/* TAB 1 — BLOG                                        */}
      {/* ════════════════════════════════════════════════════ */}
      {activeTab === 'blog' && (
        <div>
          {/* Generate form */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-5">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-36">
                <label className="text-xs text-gray-400 block mb-1">Tool</label>
                <select
                  value={blogForm.tool_id}
                  onChange={e => setBlogForm(f => ({ ...f, tool_id: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="">Select tool…</option>
                  {tools.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-36">
                <label className="text-xs text-gray-400 block mb-1">Content Type</label>
                <select
                  value={blogForm.content_type}
                  onChange={e => setBlogForm(f => ({ ...f, content_type: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white"
                >
                  {BLOG_TYPES.map(t => (
                    <option key={t} value={t}>{labelify(t)}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-44">
                <label className="text-xs text-gray-400 block mb-1">Target Keyword</label>
                <input
                  type="text"
                  value={blogForm.target_keyword}
                  onChange={e => setBlogForm(f => ({ ...f, target_keyword: e.target.value }))}
                  placeholder="free resume builder india"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500"
                />
              </div>

              <button
                onClick={handleGenerateBlog}
                disabled={blogGenerating || !blogForm.tool_id}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium whitespace-nowrap"
              >
                {blogGenerating ? <><Spinner sm /> Generating…</> : '🤖 Generate Article'}
              </button>
            </div>
          </div>

          {/* Blog table */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 bg-gray-800/80">
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Title</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium hidden md:table-cell">Type</th>
                    <th className="text-center px-4 py-3 text-gray-400 font-medium">SEO</th>
                    <th className="text-center px-4 py-3 text-gray-400 font-medium hidden sm:table-cell">Words</th>
                    <th className="text-center px-4 py-3 text-gray-400 font-medium">Status</th>
                    <th className="text-center px-4 py-3 text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {blogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-gray-500">
                        No blog posts yet — generate one above
                      </td>
                    </tr>
                  ) : blogs.map(post => (
                    <tr key={post.id} className="border-b border-gray-700/40 hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedBlog(post)}
                          className="text-blue-400 hover:text-blue-300 text-left font-medium max-w-xs truncate block"
                        >
                          {post.title}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">
                        {labelify(post.content_type)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          label={post.seo_score}
                          colorClass={seoBadgeCls(post.seo_score)}
                        />
                      </td>
                      <td className="px-4 py-3 text-center text-gray-400 hidden sm:table-cell">
                        {(post.word_count || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge label={post.status} colorClass={blogStatusCls(post.status)} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {!['approved', 'published', 'archived'].includes(post.status) && (
                            <button
                              onClick={() => handleBlogStatus(post.id, 'approved')}
                              className="px-2 py-1 bg-blue-900 hover:bg-blue-800 text-blue-300 rounded text-xs"
                            >
                              Approve
                            </button>
                          )}
                          {post.status !== 'archived' && (
                            <button
                              onClick={() => handleBlogStatus(post.id, 'archived')}
                              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-400 rounded text-xs"
                            >
                              Archive
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* TAB 2 — NEWSLETTER                                  */}
      {/* ════════════════════════════════════════════════════ */}
      {activeTab === 'newsletter' && (
        <div>
          {/* Generate form */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-5">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-48">
                <label className="text-xs text-gray-400 block mb-1">Target Segment</label>
                <select
                  value={nlSegment}
                  onChange={e => setNlSegment(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white"
                >
                  {SEGMENTS.map(s => (
                    <option key={s} value={s}>{labelify(s)}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleGenerateNewsletter}
                disabled={nlGenerating}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium whitespace-nowrap"
              >
                {nlGenerating ? <><Spinner sm /> Generating…</> : '🤖 Generate Newsletter'}
              </button>
            </div>
          </div>

          {/* Newsletter table */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 bg-gray-800/80">
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Subject</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium hidden md:table-cell">Segment</th>
                    <th className="text-center px-4 py-3 text-gray-400 font-medium hidden sm:table-cell">Recipients</th>
                    <th className="text-center px-4 py-3 text-gray-400 font-medium hidden lg:table-cell">Pred. Open %</th>
                    <th className="text-center px-4 py-3 text-gray-400 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {newsletters.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-gray-500">
                        No newsletters yet — generate one above
                      </td>
                    </tr>
                  ) : newsletters.map(nl => (
                    <tr
                      key={nl.id}
                      onClick={() => setSelectedNewsletter(nl)}
                      className="border-b border-gray-700/40 hover:bg-gray-700/30 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-blue-400 font-medium max-w-xs truncate">
                        {nl.subject_line}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">
                        {labelify(nl.target_segment)}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-300 hidden sm:table-cell">
                        {(nl.estimated_recipients || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-300 hidden lg:table-cell">
                        {nl.predicted_open_rate ? `${nl.predicted_open_rate}%` : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge label={nl.status} colorClass={nlStatusCls(nl.status)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* TAB 3 — ADS                                         */}
      {/* ════════════════════════════════════════════════════ */}
      {activeTab === 'ads' && (
        <div>
          {/* Controls */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-5 space-y-3">
            {/* Platform toggle */}
            <div className="flex flex-wrap gap-2">
              {['google_search','meta_facebook','linkedin','twitter'].map(p => (
                <button
                  key={p}
                  onClick={() => setAdPlatform(p)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    adPlatform === p ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {p === 'google_search' ? 'Google Search'
                    : p === 'meta_facebook' ? 'Meta Facebook'
                    : p === 'linkedin' ? 'LinkedIn'
                    : 'Twitter'}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 items-end">
              {/* Tool selector */}
              <div className="flex-1 min-w-36">
                <label className="text-xs text-gray-400 block mb-1">Tool</label>
                <select
                  value={adTool}
                  onChange={e => setAdTool(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="">Select tool…</option>
                  {tools.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              {/* Count toggle */}
              <div>
                <label className="text-xs text-gray-400 block mb-1">Count</label>
                <div className="flex gap-1">
                  {[3, 5, 10].map(c => (
                    <button
                      key={c}
                      onClick={() => setAdCount(c)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        adCount === c ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerateAds}
                disabled={adGenerating || !adTool}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium whitespace-nowrap"
              >
                {adGenerating ? <><Spinner sm /> Generating…</> : '🤖 Generate Ads'}
              </button>
            </div>
          </div>

          {/* Ad cards grid */}
          {ads.length === 0 ? (
            <div className="bg-gray-800 rounded-xl p-10 border border-gray-700 text-center text-gray-500 text-sm">
              No ad copies yet — select a platform and tool, then generate
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ads.map(ad => {
                const isGoogle = ad.platform?.includes('google');
                const isMeta   = ad.platform?.includes('meta');
                return (
                  <div key={ad.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex flex-col gap-3 relative">
                    {/* Platform badge */}
                    <span className="absolute top-3 right-3 text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
                      {labelify(ad.platform)}
                    </span>

                    {isGoogle && (
                      <div className="space-y-1 pr-20">
                        {[
                          { val: ad.headline_1, limit: 30 },
                          { val: ad.headline_2, limit: 30 },
                          { val: ad.headline_3, limit: 30 },
                        ].filter(h => h.val).map((h, i) => (
                          <div key={i} className="flex items-baseline justify-between gap-2">
                            <span className="text-blue-400 font-semibold text-sm truncate">{h.val}</span>
                            <span className={`text-xs shrink-0 ${(h.val?.length || 0) > h.limit ? 'text-red-400' : 'text-gray-500'}`}>
                              {h.val?.length || 0}/{h.limit}
                            </span>
                          </div>
                        ))}
                        {[
                          { val: ad.description_1, limit: 90 },
                          { val: ad.description_2, limit: 90 },
                        ].filter(d => d.val).map((d, i) => (
                          <div key={i} className="flex items-start justify-between gap-2 mt-1">
                            <span className="text-gray-400 text-xs leading-snug">{d.val}</span>
                            <span className={`text-xs shrink-0 ${(d.val?.length || 0) > d.limit ? 'text-red-400' : 'text-gray-500'}`}>
                              {d.val?.length || 0}/{d.limit}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {isMeta && (
                      <div className="space-y-2 pr-20">
                        {ad.primary_text && (
                          <p className="text-sm text-gray-300 leading-relaxed">{ad.primary_text}</p>
                        )}
                        {ad.headline_1 && (
                          <p className="text-sm font-bold text-white">{ad.headline_1}</p>
                        )}
                      </div>
                    )}

                    {!isGoogle && !isMeta && (
                      <div className="space-y-1 pr-20">
                        {ad.headline_1 && <p className="text-sm font-bold text-white">{ad.headline_1}</p>}
                        {ad.primary_text && <p className="text-sm text-gray-300">{ad.primary_text}</p>}
                        {ad.description_1 && <p className="text-xs text-gray-400">{ad.description_1}</p>}
                      </div>
                    )}

                    {/* Scores */}
                    <div className="flex items-center gap-3 text-xs text-gray-400 border-t border-gray-700 pt-2">
                      <span>⭐ <span className={`font-semibold ${ad.quality_score >= 7 ? 'text-green-400' : ad.quality_score >= 4 ? 'text-yellow-400' : 'text-red-400'}`}>{ad.quality_score ?? '—'}</span>/10</span>
                      <span>Relevance: <span className="text-gray-300">{ad.relevance_score ?? '—'}/100</span></span>
                      <Badge
                        label={ad.status}
                        colorClass={ad.status === 'active' || ad.status === 'approved' ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {ad.status !== 'approved' && ad.status !== 'active' && (
                        <button
                          onClick={() => handleAdApprove(ad.id)}
                          className="flex-1 py-1.5 bg-blue-900 hover:bg-blue-800 text-blue-300 rounded-lg text-xs font-medium"
                        >
                          ✅ Approve
                        </button>
                      )}
                      <button
                        onClick={() => {
                          const text = [ad.headline_1, ad.headline_2, ad.headline_3, ad.description_1, ad.description_2, ad.primary_text]
                            .filter(Boolean).join('\n');
                          navigator.clipboard?.writeText(text);
                        }}
                        className="flex-1 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs font-medium"
                      >
                        📋 Copy
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* TAB 4 — REFERRALS                                   */}
      {/* ════════════════════════════════════════════════════ */}
      {activeTab === 'referrals' && (
        <div>
          {/* Summary box */}
          {referrals.length > 0 && (
            <div className="bg-gray-700 rounded-xl p-4 mb-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Total Programs</p>
                <p className="text-lg font-bold text-white">{referrals.length}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Total Clicks</p>
                <p className="text-lg font-bold text-white">
                  {referrals.reduce((a, r) => a + (r.clicks || 0), 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Conversions %</p>
                <p className="text-lg font-bold text-white">
                  {(() => {
                    const clicks = referrals.reduce((a, r) => a + (r.clicks || 0), 0);
                    const conv   = referrals.reduce((a, r) => a + (r.conversions || 0), 0);
                    return clicks > 0 ? `${((conv / clicks) * 100).toFixed(1)}%` : '—';
                  })()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Revenue</p>
                <p className="text-lg font-bold text-white">
                  {fmtINR(referrals.reduce((a, r) => a + Number(r.total_earned || 0), 0))}
                </p>
              </div>
            </div>
          )}

          {/* Create form */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-5">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-48">
                <label className="text-xs text-gray-400 block mb-1">Email</label>
                <input
                  type="email"
                  value={refEmail}
                  onChange={e => setRefEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500"
                />
              </div>
              <div className="flex-1 min-w-36">
                <label className="text-xs text-gray-400 block mb-1">Reward Type</label>
                <select
                  value={refReward}
                  onChange={e => setRefReward(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="discount">Discount</option>
                  <option value="free_month">Free Month</option>
                  <option value="cash">Cash</option>
                  <option value="credits">Credits</option>
                </select>
              </div>
              <button
                onClick={handleCreateReferral}
                disabled={refCreating || !refEmail}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium whitespace-nowrap"
              >
                {refCreating ? <><Spinner sm /> Creating…</> : '+ Create Referral Link'}
              </button>
            </div>
          </div>

          {/* Referral cards */}
          {referrals.length === 0 ? (
            <div className="bg-gray-800 rounded-xl p-10 border border-gray-700 text-center text-gray-500 text-sm">
              No referral programs yet — create one above
            </div>
          ) : (
            <div className="space-y-4">
              {referrals.map(ref => {
                const statusCls = ref.status === 'active'  ? 'bg-green-900 text-green-300'
                                : ref.status === 'paused'  ? 'bg-yellow-900 text-yellow-300'
                                : 'bg-red-900 text-red-300';
                const refUrl = ref.referral_url || `https://awe-os.vercel.app?ref=${ref.referral_code}`;
                return (
                  <div key={ref.id} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="space-y-1.5">
                        <code className="bg-gray-700 text-green-300 px-3 py-1 rounded font-mono text-sm">
                          {ref.referral_code || '—'}
                        </code>
                        <p className="text-xs text-gray-500 truncate max-w-xs">{refUrl}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge label={ref.status} colorClass={statusCls} />
                        <button
                          onClick={() => navigator.clipboard?.writeText(refUrl)}
                          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-xs"
                        >
                          📋 Copy Link
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-gray-700 pt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-400">Clicks</p>
                        <p className="font-semibold text-white">{ref.clicks || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Signups</p>
                        <p className="font-semibold text-white">{ref.signups || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Paid</p>
                        <p className="font-semibold text-white">{ref.conversions || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Revenue</p>
                        <p className="font-semibold text-white">{fmtINR(ref.total_earned)}</p>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        Expires: <span className="text-gray-300">{daysUntil(ref.expires_at)}</span>
                      </p>
                      <div className="text-xs text-gray-500">
                        Referrer: <span className="text-gray-300">{ref.referrer_reward}</span> ·
                        Referee: <span className="text-gray-300">{ref.referee_reward}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* TAB 5 — INFLUENCERS                                 */}
      {/* ════════════════════════════════════════════════════ */}
      {activeTab === 'influencers' && (
        <div>
          {/* Controls */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-5 space-y-3">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-44">
                <label className="text-xs text-gray-400 block mb-1">Niche</label>
                <input
                  type="text"
                  value={infNiche}
                  onChange={e => setInfNiche(e.target.value)}
                  placeholder="career advice"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500"
                />
              </div>

              {/* Platform buttons */}
              <div>
                <label className="text-xs text-gray-400 block mb-1">Platform</label>
                <div className="flex gap-1 flex-wrap">
                  {['youtube','instagram','linkedin','tiktok'].map(p => (
                    <button
                      key={p}
                      onClick={() => setInfPlatform(p)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                        infPlatform === p ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {p === 'youtube' ? 'YouTube' : p === 'instagram' ? 'Instagram' : p === 'linkedin' ? 'LinkedIn' : 'TikTok'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Follower range */}
              <div>
                <label className="text-xs text-gray-400 block mb-1">Followers</label>
                <div className="flex gap-1">
                  {['10K-100K','100K-1M','1M+'].map(r => (
                    <button
                      key={r}
                      onClick={() => setInfRange(r)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        infRange === r ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerateInfluencers}
                disabled={infGenerating || !infNiche}
                className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium whitespace-nowrap"
              >
                {infGenerating ? <><Spinner sm /> Finding…</> : '🤖 Find + Draft Outreach'}
              </button>
            </div>
          </div>

          {/* Influencer cards */}
          {influencers.length === 0 ? (
            <div className="bg-gray-800 rounded-xl p-10 border border-gray-700 text-center text-gray-500 text-sm">
              No influencers yet — enter a niche and generate outreach above
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {influencers.map((inf, idx) => {
                const infSteps   = ['identified','message_drafted','contacted','active','completed'];
                const stepIdx    = infSteps.indexOf(inf.status);
                const isExpanded = expandedInf[idx];
                const platColors = {
                  youtube:   'bg-red-900 text-red-300',
                  instagram: 'bg-pink-900 text-pink-300',
                  linkedin:  'bg-blue-900 text-blue-300',
                  tiktok:    'bg-gray-700 text-gray-300',
                  twitter:   'bg-sky-900 text-sky-300',
                  blog:      'bg-yellow-900 text-yellow-300',
                };
                return (
                  <div key={inf.id || idx} className="bg-gray-800 rounded-xl p-5 border border-gray-700 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-white">{inf.name}</p>
                        <p className="text-sm text-gray-400">@{inf.handle}</p>
                      </div>
                      <Badge label={inf.platform} colorClass={platColors[inf.platform] || 'bg-gray-700 text-gray-300'} />
                    </div>

                    <div className="flex items-center gap-3 text-sm text-gray-400">
                      <span>👥 {(inf.followers || 0).toLocaleString()}</span>
                      <span>💬 {inf.engagement_rate || 0}%</span>
                      {inf.niche && (
                        <span className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded text-xs">
                          {inf.niche}
                        </span>
                      )}
                    </div>

                    {/* Outreach collapsible */}
                    <div>
                      <button
                        onClick={() => setExpandedInf(prev => ({ ...prev, [idx]: !prev[idx] }))}
                        className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                      >
                        {isExpanded ? '🔼 Hide' : '📧 View Outreach Message'}
                      </button>
                      {isExpanded && (
                        <div className="mt-2 bg-gray-700/50 rounded-lg p-3 space-y-2">
                          {inf.outreach_subject && (
                            <p className="text-sm font-semibold text-white">{inf.outreach_subject}</p>
                          )}
                          {inf.outreach_message && (
                            <pre className="whitespace-pre-wrap text-xs text-gray-300 font-sans leading-relaxed">
                              {inf.outreach_message}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Status pipeline */}
                    <div className="flex items-center gap-1">
                      {infSteps.map((step, si) => (
                        <div
                          key={step}
                          className={`flex-1 text-center py-1 rounded text-xs font-medium truncate ${
                            si === stepIdx ? 'bg-blue-600 text-white'
                              : si < stepIdx ? 'bg-gray-600 text-gray-300'
                              : 'bg-gray-800 text-gray-600 border border-gray-700'
                          }`}
                          title={labelify(step)}
                        >
                          {si === stepIdx ? labelify(step) : si < stepIdx ? '✓' : '·'}
                        </div>
                      ))}
                    </div>

                    {/* Copy action */}
                    <button
                      onClick={() => {
                        const text = [inf.outreach_subject, inf.outreach_message].filter(Boolean).join('\n\n');
                        navigator.clipboard?.writeText(text);
                      }}
                      className="w-full py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs font-medium"
                    >
                      📋 Copy Message
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* TAB 6 — COMPETITORS                                 */}
      {/* ════════════════════════════════════════════════════ */}
      {activeTab === 'competitors' && (
        <div>
          {/* Controls */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-5">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-36">
                <label className="text-xs text-gray-400 block mb-1">Tool</label>
                <select
                  value={compTool}
                  onChange={e => setCompTool(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="">Select tool…</option>
                  {tools.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="flex-1 min-w-44">
                <label className="text-xs text-gray-400 block mb-1">Competitor Name</label>
                <input
                  type="text"
                  value={compName}
                  onChange={e => setCompName(e.target.value)}
                  placeholder="Canva"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500"
                />
              </div>
              <button
                onClick={handleGenerateComparison}
                disabled={compGenerating || !compTool || !compName}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium whitespace-nowrap"
              >
                {compGenerating ? <><Spinner sm /> Generating…</> : '🤖 Generate Comparison'}
              </button>
            </div>
          </div>

          {/* Comparison cards */}
          {comparisons.length === 0 ? (
            <div className="bg-gray-800 rounded-xl p-10 border border-gray-700 text-center text-gray-500 text-sm">
              No comparisons yet — pick a tool and competitor above
            </div>
          ) : (
            <div className="space-y-5">
              {comparisons.map((comp, idx) => {
                const seoExpanded = expandedComp[idx];
                return (
                  <div key={comp.id || idx} className="bg-gray-800 rounded-xl p-5 border border-gray-700 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-white text-base">{comp.page_title}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">vs {comp.competitor_name}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {comp.target_keyword && (
                          <span className="bg-purple-900 text-purple-200 text-xs px-2 py-0.5 rounded">
                            {comp.target_keyword}
                          </span>
                        )}
                        <Badge
                          label={comp.status}
                          colorClass={comp.status === 'published' ? 'bg-green-900 text-green-300' : comp.status === 'approved' ? 'bg-blue-900 text-blue-300' : 'bg-gray-700 text-gray-400'}
                        />
                      </div>
                    </div>

                    {/* Comparison table */}
                    {Array.isArray(comp.comparison_table) && comp.comparison_table.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-700">
                              <th className="text-left py-2 px-3 text-gray-400 font-medium">Feature</th>
                              <th className="text-center py-2 px-3 text-gray-400 font-medium">Ours</th>
                              <th className="text-center py-2 px-3 text-gray-400 font-medium">Theirs</th>
                              <th className="text-center py-2 px-3 text-gray-400 font-medium">Winner</th>
                            </tr>
                          </thead>
                          <tbody>
                            {comp.comparison_table.map((row, ri) => (
                              <tr key={ri} className="border-b border-gray-700/40">
                                <td className="py-2 px-3 text-gray-300 text-xs">{row.feature}</td>
                                <td className="py-2 px-3 text-center text-xs text-gray-300">{row.ours}</td>
                                <td className="py-2 px-3 text-center text-xs text-gray-300">{row.theirs}</td>
                                <td className="py-2 px-3 text-center text-xs font-semibold">
                                  {row.winner === 'us'   && <span className="text-green-400">🏆 Us</span>}
                                  {row.winner === 'them' && <span className="text-gray-400">Them</span>}
                                  {row.winner === 'tie'  && <span className="text-yellow-400">🤝 Tie</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Advantages columns */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-green-400 font-semibold mb-1">Our Advantages</p>
                        <ul className="space-y-1">
                          {(comp.our_advantages || []).map((a, ai) => (
                            <li key={ai} className="text-xs text-gray-300 flex gap-1.5">
                              <span className="text-green-500 shrink-0">●</span>{a}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-semibold mb-1">Their Advantages</p>
                        <ul className="space-y-1">
                          {(comp.their_advantages || []).map((a, ai) => (
                            <li key={ai} className="text-xs text-gray-300 flex gap-1.5">
                              <span className="text-gray-500 shrink-0">●</span>{a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {comp.conclusion_text && (
                      <p className="text-sm italic text-gray-400 border-t border-gray-700 pt-3">
                        {comp.conclusion_text}
                      </p>
                    )}

                    {/* SEO collapsible */}
                    <div>
                      <button
                        onClick={() => setExpandedComp(prev => ({ ...prev, [idx]: !prev[idx] }))}
                        className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                      >
                        {seoExpanded ? '🔼 Hide SEO' : '🔍 View SEO Details'}
                      </button>
                      {seoExpanded && (
                        <div className="mt-2 bg-gray-700/50 rounded-lg p-3 space-y-1 text-xs text-gray-300">
                          <p><span className="text-gray-400">Slug:</span> /{comp.slug}</p>
                          <p><span className="text-gray-400">Meta Title:</span> {comp.meta_title}</p>
                          <p><span className="text-gray-400">Meta Desc:</span> {comp.meta_description}</p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      {comp.status !== 'approved' && comp.status !== 'published' && (
                        <button
                          onClick={() => handleCompApprove(comp.id)}
                          className="flex-1 py-2 bg-green-700 hover:bg-green-600 rounded-lg text-sm font-medium"
                        >
                          ✅ Approve
                        </button>
                      )}
                      <button
                        onClick={() => {
                          const text = [
                            comp.page_title,
                            (comp.comparison_table || []).map(r => `${r.feature}: ${r.ours} vs ${r.theirs}`).join('\n'),
                            comp.conclusion_text,
                          ].filter(Boolean).join('\n\n');
                          navigator.clipboard?.writeText(text);
                        }}
                        className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-300"
                      >
                        📋 Copy Content
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* TAB 7 — CALENDAR                                    */}
      {/* ════════════════════════════════════════════════════ */}
      {activeTab === 'calendar' && (
        <div>
          {/* Controls */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Month</label>
                <select
                  value={calMonth}
                  onChange={e => { const m = Number(e.target.value); setCalMonth(m); fetchCalendar(m, calYear, calTool); }}
                  className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>
                      {new Date(2000, m - 1).toLocaleString('en', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Year</label>
                <input
                  type="number"
                  value={calYear}
                  onChange={e => { const y = Number(e.target.value); setCalYear(y); fetchCalendar(calMonth, y, calTool); }}
                  className="w-24 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="flex-1 min-w-36">
                <label className="text-xs text-gray-400 block mb-1">Tool (optional)</label>
                <select
                  value={calTool}
                  onChange={e => { setCalTool(e.target.value); fetchCalendar(calMonth, calYear, e.target.value); }}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="">All tools</option>
                  {tools.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <button
                onClick={handleGenerateCalendar}
                disabled={calGenerating || !calTool}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium whitespace-nowrap"
              >
                {calGenerating ? <><Spinner sm /> Generating…</> : '🤖 Generate 30-Day Calendar'}
              </button>
              {/* View toggle */}
              <div className="flex gap-1 ml-auto">
                {['grid','list'].map(v => (
                  <button
                    key={v}
                    onClick={() => setCalView(v)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                      calView === v ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {v === 'grid' ? 'Grid View' : 'List View'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Overdue banner */}
          {(() => {
            const overdue = calendar.filter(
              item => item.planned_date < todayStr && !['published','cancelled'].includes(item.status)
            ).length;
            return overdue > 0 ? (
              <div className="bg-red-900/60 border border-red-600 rounded-xl p-3 mb-4 flex items-center gap-2 text-sm text-red-200">
                <span>⚠️</span>
                <span><strong>{overdue}</strong> item{overdue !== 1 ? 's are' : ' is'} overdue — update their status</span>
              </div>
            ) : null;
          })()}

          {/* ── GRID VIEW ── */}
          {calView === 'grid' && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-gray-700">
                {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
                  <div key={d} className="text-center py-2 text-xs text-gray-400 font-medium">
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7">
                {buildCalendarGrid(calendar, calMonth, calYear).map((day, ci) => {
                  if (day === null) {
                    return <div key={`e-${ci}`} className="bg-gray-900/30 min-h-16 border-b border-r border-gray-700/40" />;
                  }
                  const dateStr  = `${calYear}-${String(calMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                  const dayItems = calendar.filter(item => item.planned_date?.startsWith(dateStr));
                  const isToday  = dateStr === todayStr;
                  return (
                    <div
                      key={day}
                      className={`min-h-16 p-1 border-b border-r border-gray-700/40 ${isToday ? 'bg-blue-900/20' : 'hover:bg-gray-700/20'}`}
                    >
                      <span className={`text-xs font-medium block mb-1 ${isToday ? 'text-blue-400' : 'text-gray-500'}`}>
                        {day}
                      </span>
                      <div className="space-y-0.5">
                        {dayItems.map((item, ii) => {
                          const pillCls = CAL_PILL_CLS[item.content_type] || 'bg-gray-700 text-gray-300';
                          const title   = (item.title || '').slice(0, 15) + ((item.title || '').length > 15 ? '…' : '');
                          return (
                            <div
                              key={item.id || ii}
                              onClick={() => setCalPopover(calPopover?.id === item.id ? null : item)}
                              className={`${pillCls} text-xs rounded px-1 py-0.5 truncate cursor-pointer hover:opacity-80`}
                              title={item.title}
                            >
                              {title}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Popover */}
              {calPopover && (
                <div className="border-t border-gray-700 p-4 bg-gray-700/50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-semibold text-white text-sm">{calPopover.title}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          label={calPopover.content_type?.replace(/_/g,' ')}
                          colorClass={CAL_PILL_CLS[calPopover.content_type] || 'bg-gray-700 text-gray-300'}
                        />
                        <Badge label={calPopover.status} colorClass="bg-gray-700 text-gray-300" />
                        {calPopover.platform && (
                          <span className="text-xs text-gray-400">{calPopover.platform}</span>
                        )}
                        {calPopover.priority && (
                          <span className="text-xs text-gray-400">Priority: {calPopover.priority}</span>
                        )}
                      </div>
                      {calPopover.notes && (
                        <p className="text-xs text-gray-400">{calPopover.notes}</p>
                      )}
                    </div>
                    <button onClick={() => setCalPopover(null)} className="text-gray-400 hover:text-white text-lg leading-none shrink-0">✕</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── LIST VIEW ── */}
          {calView === 'list' && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700 bg-gray-800/80">
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">Date</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">Type</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">Title</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium hidden md:table-cell">Platform</th>
                      <th className="text-center px-4 py-3 text-gray-400 font-medium hidden sm:table-cell">Priority</th>
                      <th className="text-center px-4 py-3 text-gray-400 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calendar.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-gray-500">
                          No calendar items — generate a 30-day plan above
                        </td>
                      </tr>
                    ) : [...calendar].sort((a, b) => (a.planned_date || '').localeCompare(b.planned_date || '')).map(item => {
                      const isOverdue = item.planned_date < todayStr && !['published','cancelled'].includes(item.status);
                      const pillCls   = CAL_PILL_CLS[item.content_type] || 'bg-gray-700 text-gray-300';
                      const priorCls  = item.priority === 'must_publish' ? 'text-red-400' : item.priority === 'high' ? 'text-yellow-400' : 'text-gray-400';
                      return (
                        <tr key={item.id} className={`border-b border-gray-700/40 hover:bg-gray-700/30 ${isOverdue ? 'bg-red-900/10' : ''}`}>
                          <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                            {item.planned_date || '—'}
                            {isOverdue && <span className="ml-1 text-red-400">⚠</span>}
                          </td>
                          <td className="px-4 py-3">
                            <Badge label={labelify(item.content_type)} colorClass={pillCls} />
                          </td>
                          <td className="px-4 py-3 text-white text-sm max-w-xs truncate">{item.title}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">{item.platform || '—'}</td>
                          <td className={`px-4 py-3 text-center text-xs font-medium hidden sm:table-cell ${priorCls}`}>
                            {labelify(item.priority)}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={item.status}
                              onChange={e => handleCalItemStatus(item.id, e.target.value)}
                              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white w-full"
                            >
                              {CAL_STATUSES.map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* MODAL — BLOG PREVIEW                                */}
      {/* ════════════════════════════════════════════════════ */}
      {selectedBlog && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-start justify-center p-4 overflow-y-auto"
          onClick={e => { if (e.target === e.currentTarget) setSelectedBlog(null); }}
        >
          <div className="bg-gray-900 rounded-2xl w-full max-w-4xl my-8 border border-gray-700 flex flex-col shadow-2xl">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 shrink-0">
              <div className="flex items-center gap-2">
                <Badge label={selectedBlog.status} colorClass={blogStatusCls(selectedBlog.status)} />
                <span className="text-xs text-gray-500">
                  {labelify(selectedBlog.content_type)} · {(selectedBlog.word_count || 0).toLocaleString()} words
                </span>
              </div>
              <button
                onClick={() => setSelectedBlog(null)}
                className="text-gray-400 hover:text-white text-2xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Modal body — two columns */}
            <div className="flex flex-col md:flex-row overflow-hidden">

              {/* Left: article content */}
              <div className="md:w-2/3 p-6 overflow-y-auto max-h-[72vh] border-b md:border-b-0 md:border-r border-gray-700">
                <h1 className="text-xl font-bold text-white mb-5 leading-snug">
                  {selectedBlog.title}
                </h1>
                <pre className="whitespace-pre-wrap text-sm text-gray-300 font-sans leading-7">
                  {selectedBlog.content}
                </pre>
                {selectedBlog.cta_text && (
                  <div className="mt-6 bg-blue-600 rounded-xl p-4">
                    <p className="font-semibold text-white">{selectedBlog.cta_text}</p>
                    {selectedBlog.cta_url && (
                      <p className="text-blue-200 text-sm mt-1 break-all">{selectedBlog.cta_url}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Right: SEO sidebar */}
              <div className="md:w-1/3 p-6 overflow-y-auto max-h-[72vh] space-y-5">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                  SEO Details
                </h3>

                <div>
                  <p className="text-xs text-gray-400 mb-1">Meta Title</p>
                  <p className="text-sm text-white">{selectedBlog.meta_title || '—'}</p>
                  {selectedBlog.meta_title && (
                    <CharBar val={selectedBlog.meta_title.length} limit={60} />
                  )}
                </div>

                <div>
                  <p className="text-xs text-gray-400 mb-1">Meta Description</p>
                  <p className="text-sm text-white">{selectedBlog.meta_description || '—'}</p>
                  {selectedBlog.meta_description && (
                    <CharBar val={selectedBlog.meta_description.length} limit={160} />
                  )}
                </div>

                <div>
                  <p className="text-xs text-gray-400 mb-1">Focus Keyword</p>
                  <Badge
                    label={selectedBlog.focus_keyword || '—'}
                    colorClass="bg-blue-900 text-blue-300"
                  />
                </div>

                <div className="flex gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 mb-1">SEO Score</p>
                    <Badge
                      label={`${selectedBlog.seo_score}/100`}
                      colorClass={seoBadgeCls(selectedBlog.seo_score)}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 mb-1">Readability</p>
                    <Badge
                      label={`${selectedBlog.readability_score}/100`}
                      colorClass={seoBadgeCls(selectedBlog.readability_score)}
                    />
                  </div>
                </div>

                {Array.isArray(selectedBlog.internal_links) && selectedBlog.internal_links.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 mb-2">Internal Links</p>
                    <ul className="space-y-2">
                      {selectedBlog.internal_links.map((link, i) => (
                        <li key={i}>
                          <span className="text-xs text-blue-400">{link.anchor_text}</span>
                          <span className="text-xs text-gray-500 block truncate">{link.suggested_url}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Sidebar actions */}
                <div className="pt-3 border-t border-gray-700 space-y-2">
                  {!['approved', 'published', 'archived'].includes(selectedBlog.status) && (
                    <button
                      onClick={() => handleBlogStatus(selectedBlog.id, 'approved')}
                      disabled={blogActLoading}
                      className="w-full py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                    >
                      {blogActLoading ? <Spinner sm /> : '✅ Approve'}
                    </button>
                  )}
                  <button
                    onClick={() => handleBlogStatus(selectedBlog.id, 'archived')}
                    disabled={blogActLoading}
                    className="w-full py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg text-sm font-medium text-gray-300 flex items-center justify-center gap-2"
                  >
                    🗑 Archive
                  </button>
                  <button
                    onClick={() => navigator.clipboard?.writeText(selectedBlog.content || '')}
                    className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-300"
                  >
                    📋 Copy Content
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* MODAL — NEWSLETTER PREVIEW                          */}
      {/* ════════════════════════════════════════════════════ */}
      {selectedNewsletter && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-start justify-center p-4 overflow-y-auto"
          onClick={e => { if (e.target === e.currentTarget) setSelectedNewsletter(null); }}
        >
          <div className="bg-gray-900 rounded-2xl w-full max-w-2xl my-8 border border-gray-700 shadow-2xl">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-300">Newsletter Preview</span>
                <Badge label={selectedNewsletter.status} colorClass={nlStatusCls(selectedNewsletter.status)} />
              </div>
              <button
                onClick={() => setSelectedNewsletter(null)}
                className="text-gray-400 hover:text-white text-2xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Email card */}
            <div className="p-6">
              <div className="bg-white text-gray-900 rounded-xl p-6 max-w-xl mx-auto shadow">
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Subject</p>
                <h2 className="text-lg font-bold text-gray-900 mb-1">
                  {selectedNewsletter.subject_line}
                </h2>
                {selectedNewsletter.preview_text && (
                  <p className="text-sm text-gray-500 italic mb-4">
                    {selectedNewsletter.preview_text}
                  </p>
                )}

                {selectedNewsletter.hero_headline && (
                  <div className="mb-5 pb-4 border-b border-gray-100">
                    <h3 className="text-base font-bold text-gray-800">
                      {selectedNewsletter.hero_headline}
                    </h3>
                    <p className="text-sm text-gray-700 mt-1 leading-relaxed">
                      {selectedNewsletter.hero_body}
                    </p>
                  </div>
                )}

                {Array.isArray(selectedNewsletter.sections) && selectedNewsletter.sections.map((sec, i) => (
                  <div key={i} className="mb-5 pb-4 border-b border-gray-100 last:border-0 last:mb-0">
                    {sec.type && (
                      <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">
                        {sec.type}
                      </p>
                    )}
                    <h4 className="font-semibold text-gray-800 mb-1">{sec.title}</h4>
                    <p className="text-sm text-gray-700 leading-relaxed">{sec.body}</p>
                    {sec.cta_text && (
                      <div className="mt-3">
                        <span className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium cursor-pointer">
                          {sec.cta_text}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Modal actions */}
            <div className="px-6 pb-5 flex flex-wrap gap-2 justify-end border-t border-gray-700 pt-4">
              {selectedNewsletter.status === 'draft' && (
                <button
                  onClick={() => handleNewsletterStatus(selectedNewsletter.id, 'approved')}
                  disabled={nlActLoading}
                  className="px-4 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 rounded-lg text-sm font-medium flex items-center gap-2"
                >
                  {nlActLoading ? <Spinner sm /> : '✅ Approve'}
                </button>
              )}
              {selectedNewsletter.status === 'approved' && (
                <button
                  onClick={() => handleNewsletterStatus(selectedNewsletter.id, 'scheduled')}
                  disabled={nlActLoading}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 rounded-lg text-sm font-medium flex items-center gap-2"
                >
                  {nlActLoading ? <Spinner sm /> : '📅 Mark Scheduled'}
                </button>
              )}
              <button
                onClick={() => {
                  const text = [
                    selectedNewsletter.subject_line,
                    selectedNewsletter.preview_text,
                    selectedNewsletter.hero_headline,
                    selectedNewsletter.hero_body,
                    ...(selectedNewsletter.sections || []).map(
                      s => `${s.title}\n${s.body}${s.cta_text ? `\n→ ${s.cta_text}` : ''}`
                    ),
                  ].filter(Boolean).join('\n\n');
                  navigator.clipboard?.writeText(text);
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-300"
              >
                📋 Copy Text
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
