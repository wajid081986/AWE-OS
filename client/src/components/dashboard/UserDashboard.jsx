import React, { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';

const BASE      = import.meta.env.VITE_API_URL || 'https://awe-os.onrender.com';
const CACHE_KEY = 'awe_ud_cache';
const CACHE_TTL = 5 * 60 * 1000;

function apiFetch(path) {
  const token = localStorage.getItem('awe_token');
  return fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });
}

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const timeAgo = (dateStr) => {
  if (!dateStr) return 'recently';
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
};

// ── Explicit Tailwind color maps (dynamic strings are not purge-safe) ────────
const STAT_C = {
  blue:   { icon: 'bg-blue-500/10',   text: 'text-blue-400',   bd: 'hover:border-blue-500/50',   sh: 'hover:shadow-blue-500/10'   },
  purple: { icon: 'bg-purple-500/10', text: 'text-purple-400', bd: 'hover:border-purple-500/50', sh: 'hover:shadow-purple-500/10' },
  green:  { icon: 'bg-green-500/10',  text: 'text-green-400',  bd: 'hover:border-green-500/50',  sh: 'hover:shadow-green-500/10'  },
  orange: { icon: 'bg-orange-500/10', text: 'text-orange-400', bd: 'hover:border-orange-500/50', sh: 'hover:shadow-orange-500/10' },
};

const PROD_C = {
  blue:   { hdr: 'from-blue-900/80 to-blue-800/40',     text: 'text-blue-400',   btn: 'bg-blue-600 hover:bg-blue-500',     bd: 'hover:border-blue-500/50'   },
  purple: { hdr: 'from-purple-900/80 to-purple-800/40', text: 'text-purple-400', btn: 'bg-purple-600 hover:bg-purple-500', bd: 'hover:border-purple-500/50' },
  green:  { hdr: 'from-green-900/80 to-green-800/40',   text: 'text-green-400',  btn: 'bg-green-600 hover:bg-green-500',   bd: 'hover:border-green-500/50'  },
};

// ── StatCard ─────────────────────────────────────────────────────────────────
const StatCard = memo(function StatCard({ icon, label, value, color, loading, trend }) {
  const c = STAT_C[color] || STAT_C.blue;
  return (
    <div className={`bg-gray-800/60 backdrop-blur-sm rounded-2xl p-5 border
      border-gray-700/50 ${c.bd} transition-all duration-200
      hover:shadow-lg ${c.sh} group`}>
      <div className="flex justify-between items-start mb-3">
        <div className={`w-10 h-10 rounded-xl ${c.icon} flex items-center
          justify-center text-xl group-hover:scale-110 transition-transform duration-200`}>
          {icon}
        </div>
        {trend != null && (
          <span className={`text-xs px-2 py-1 rounded-full ${
            trend > 0 ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
          }`}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      {loading ? (
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded mb-2 w-16" />
          <div className="h-4 bg-gray-700 rounded w-24" />
        </div>
      ) : (
        <>
          <p className={`text-3xl font-bold ${c.text} mb-1`}>{value}</p>
          <p className="text-gray-400 text-sm">{label}</p>
        </>
      )}
    </div>
  );
});

// ── ToolCard ─────────────────────────────────────────────────────────────────
function ToolCard({ icon, title, desc, badge, badgeColor, href, locked, onUpgrade }) {
  return (
    <div className={`relative bg-gray-800/60 backdrop-blur-sm rounded-2xl p-6
      border transition-all duration-200 group
      ${locked
        ? 'border-gray-700/30 opacity-75'
        : 'border-gray-700/50 hover:border-blue-500/50'}
      hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-0.5`}>

      {locked && (
        <div className="absolute inset-0 rounded-2xl bg-gray-900/60
          backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-3">
          <span className="text-4xl">🔒</span>
          <button onClick={onUpgrade}
            className="bg-amber-500 hover:bg-amber-400 active:scale-95
            text-white text-sm font-semibold px-5 py-2.5 rounded-xl
            transition-all duration-150">
            Unlock Premium — ₹49
          </button>
        </div>
      )}

      <div className="flex justify-between items-start mb-4">
        <div className="text-4xl group-hover:scale-110 transition-transform duration-200">
          {icon}
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${badgeColor}`}>
          {badge}
        </span>
      </div>

      <h3 className="text-white font-bold text-lg mb-1">{title}</h3>
      <p className="text-gray-400 text-sm mb-4">{desc}</p>

      {!locked && (
        <a href={href}
          className="inline-flex items-center gap-1 text-blue-400
          hover:text-blue-300 text-sm font-medium
          group-hover:gap-2 transition-all duration-150">
          Open Tool <span>→</span>
        </a>
      )}
    </div>
  );
}

// ── ProductCard ──────────────────────────────────────────────────────────────
function ProductCard({ emoji, title, desc, price, oldPrice, color }) {
  const c = PROD_C[color] || PROD_C.blue;
  return (
    <div className={`relative bg-gray-800/60 rounded-2xl overflow-hidden
      border border-gray-700/50 ${c.bd}
      transition-all duration-200 hover:-translate-y-1 group`}>

      <div className={`h-24 bg-gradient-to-br ${c.hdr} flex items-center
        justify-center text-5xl
        group-hover:scale-105 transition-transform duration-300`}>
        {emoji}
      </div>

      <div className="absolute top-3 right-3 bg-red-500 text-white
        text-xs font-bold px-2 py-0.5 rounded-full">
        SALE
      </div>

      <div className="p-5">
        <h3 className="text-white font-bold mb-1">{title}</h3>
        <p className="text-gray-400 text-sm mb-4">{desc}</p>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-gray-500 line-through text-sm mr-1">{oldPrice}</span>
            <span className={`${c.text} font-bold text-xl`}>{price}</span>
          </div>
          <button className={`${c.btn} text-white text-sm font-semibold
            px-4 py-2 rounded-xl transition-colors active:scale-95`}>
            Buy Now
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MiniToolCard ─────────────────────────────────────────────────────────────
function MiniToolCard({ icon, title, desc, comingSoon }) {
  return (
    <div className="flex-1 min-w-[130px] bg-gray-900/60 border border-gray-700/50
      rounded-xl p-4 hover:border-gray-600/50 transition-colors">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-sm font-bold text-gray-200">{title}</div>
      <div className="text-xs text-gray-500 mt-1 leading-relaxed">{desc}</div>
      {comingSoon && (
        <span className="mt-2 inline-block text-xs font-semibold text-amber-400
          px-2 py-0.5 rounded-full bg-amber-900/30 border border-amber-700/50">
          Soon
        </span>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function UserDashboard() {
  const navigate = useNavigate();

  const [apiData,     setApiData]     = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [upgrading,   setUpgrading]   = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const rawUser   = JSON.parse(localStorage.getItem('awe_user') || '{}');
  const isPremium = rawUser.isPremium || false;
  const userName  = rawUser.name || rawUser.email?.split('@')[0] || 'there';

  const handleUpgrade = () => {
    setUpgrading(true);
    navigate('/');
  };

  // Post-payment success notification via sessionStorage flag
  useEffect(() => {
    const flag = sessionStorage.getItem('premium_success');
    if (flag) {
      setShowSuccess(true);
      sessionStorage.removeItem('premium_success');
      setTimeout(() => setShowSuccess(false), 5000);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        setApiData(cached.data);
        setLoading(false);
        return;
      }
    } catch { /* stale/corrupt cache */ }

    const [resumesRes, invoiceRes, ticketsRes] = await Promise.allSettled([
      apiFetch('/api/resumes'),
      apiFetch('/api/invoices/stats'),
      apiFetch('/api/support/tickets'),
    ]);

    const d = {
      resumes:      resumesRes.status === 'fulfilled'
        ? (resumesRes.value.resumes || resumesRes.value.data || []) : [],
      invoiceStats: invoiceRes.status === 'fulfilled'
        ? (invoiceRes.value.stats || null) : null,
      tickets:      ticketsRes.status === 'fulfilled'
        ? (ticketsRes.value.tickets || ticketsRes.value.data || []) : [],
    };

    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: d })); } catch { /* quota */ }
    setApiData(d);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const resumes      = apiData?.resumes      || [];
  const invoiceStats = apiData?.invoiceStats || {};
  const tickets      = apiData?.tickets      || [];
  const totalRevenue = invoiceStats.total_revenue || 0;
  const openTickets  = tickets.filter(t => t.status === 'open').length || tickets.length;

  const fmtINR = v => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

  // Combined activity feed
  const allActivity = [
    ...resumes.slice(0, 4).map(r => ({
      type:       'resume',
      title:      r.name || r.title || 'Untitled Resume',
      created_at: r.updated_at || r.created_at,
      status:     'draft',
      href:       '/',
    })),
    ...(invoiceStats.recent || []).slice(0, 4).map(inv => ({
      type:       'invoice',
      title:      inv.client_name || 'Unknown Client',
      created_at: inv.created_at || inv.updated_at,
      status:     inv.status || 'draft',
      href:       `/tools/invoice/${inv.id}`,
    })),
  ]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 6);

  const AI_SUGGESTIONS = [
    isPremium
      ? '⭐ Export resume as PDF — try now'
      : '🔓 Unlock all 12 templates for ₹49',
    resumes.length === 0
      ? '📄 Create your first resume in 3 minutes'
      : `📄 Update your resume — last edited ${resumes[0]?.updated_at ? new Date(resumes[0].updated_at).toLocaleDateString() : 'recently'}`,
    invoiceStats.pending_count > 0
      ? `💰 ${invoiceStats.pending_count} invoice(s) pending — follow up`
      : '🧾 Create a professional invoice — gets paid 2× faster',
    '📊 Add skills section to get 40% more recruiter views',
    '🌟 Share your resume link — gets 3× more responses',
  ];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

      {/* ── Success Toast ─────────────────────────────────────────────────── */}
      {showSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-green-900
          border border-green-500/50 rounded-2xl p-4
          shadow-2xl shadow-green-900/50">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎉</span>
            <div>
              <p className="text-green-300 font-bold">Premium Activated!</p>
              <p className="text-green-400 text-sm">Welcome to AWE-OS Pro</p>
            </div>
            <button onClick={() => setShowSuccess(false)}
              className="ml-4 text-green-600 hover:text-green-400 text-lg leading-none">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ── SECTION 1: Hero ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl
        bg-gradient-to-br from-gray-900 via-blue-950 to-purple-950
        border border-blue-800/30 p-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10
          rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600/10
          rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <p className="text-blue-400 text-sm font-medium mb-1">
            {getGreeting()} {isPremium ? '⭐' : '☀️'}
          </p>
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back, {userName} 👋
          </h1>
          <p className="text-gray-400 text-lg mb-6">
            {loading
              ? 'Loading your workspace…'
              : resumes.length > 0 || invoiceStats.total_count
              ? `${resumes.length} resume${resumes.length !== 1 ? 's' : ''} · ${invoiceStats.total_count || 0} invoice${(invoiceStats.total_count || 0) !== 1 ? 's' : ''} · ${fmtINR(totalRevenue)} earned`
              : 'What do you want to create today?'}
          </p>

          <div className="flex flex-wrap gap-3">
            <a href="/"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500
              active:scale-95 px-5 py-3 rounded-xl font-semibold text-white
              transition-all duration-150 shadow-lg shadow-blue-600/25">
              📄 Build Resume
              <span className="text-blue-200 text-sm">→</span>
            </a>
            <a href="/tools/invoice"
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500
              active:scale-95 px-5 py-3 rounded-xl font-semibold text-white
              transition-all duration-150 shadow-lg shadow-purple-600/25">
              🧾 Create Invoice
              <span className="text-purple-200 text-sm">→</span>
            </a>
            {!isPremium && (
              <button onClick={handleUpgrade} disabled={upgrading}
                className="flex items-center gap-2
                bg-gradient-to-r from-amber-500 to-orange-500
                hover:from-amber-400 hover:to-orange-400
                disabled:opacity-50 active:scale-95
                px-5 py-3 rounded-xl font-semibold text-white
                transition-all duration-150 shadow-lg shadow-amber-600/25
                animate-pulse">
                ⚡ Go Premium — ₹49
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── SECTION 2: Stats Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="📄" label="Resumes Created" color="blue"
          value={loading ? '…' : String(resumes.length)}
          loading={loading} />
        <StatCard icon="🧾" label="Invoices Sent" color="purple"
          value={loading ? '…' : String(invoiceStats.total_count || 0)}
          loading={loading} />
        <StatCard icon="💰" label="Revenue Tracked" color="green"
          value={loading ? '…' : fmtINR(totalRevenue)}
          loading={loading} />
        <StatCard icon="🎧" label="Open Tickets" color="orange"
          value={loading ? '…' : String(openTickets)}
          loading={loading} />
      </div>

      {/* ── SECTION 3: Quick Actions ─────────────────────────────────────────── */}
      <div>
        <h2 className="text-white font-bold text-lg mb-4">🚀 Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <ToolCard
            icon="📄"
            title="Resume Builder"
            desc="Create ATS-friendly resumes in minutes. Free PDF download."
            badge="Free"
            badgeColor="bg-green-900/50 text-green-400"
            href="/"
            locked={false}
            onUpgrade={handleUpgrade} />
          <ToolCard
            icon="🧾"
            title="Invoice Generator Pro"
            desc="Professional invoices with live preview and PDF export."
            badge="Free"
            badgeColor="bg-green-900/50 text-green-400"
            href="/tools/invoice"
            locked={false}
            onUpgrade={handleUpgrade} />
          <ToolCard
            icon="✨"
            title="AI Content Writer"
            desc="Generate blogs, emails, social posts with AI in seconds."
            badge="Premium"
            badgeColor="bg-amber-900/50 text-amber-400"
            href="/tools/content"
            locked={!isPremium}
            onUpgrade={handleUpgrade} />
        </div>
      </div>

      {/* ── SECTION 4: Premium Upsell (non-premium only) ─────────────────────── */}
      {!isPremium && (
        <div className="relative overflow-hidden rounded-3xl
          bg-gradient-to-r from-purple-900/80 via-blue-900/80 to-indigo-900/80
          border border-purple-500/30 p-8">
          <div className="absolute top-0 right-0 w-72 h-72
            bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row
            justify-between items-start md:items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">⚡</span>
                <span className="bg-amber-500/20 text-amber-400 text-xs font-bold
                  px-2 py-1 rounded-full border border-amber-500/30">
                  LIMITED TIME
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Unlock AWE-OS Premium
              </h2>
              <p className="text-gray-300 mb-4">Everything you need to work faster</p>

              <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                {[
                  '✅ No watermark on PDFs',
                  '✅ Premium resume templates',
                  '✅ Unlimited invoices',
                  '✅ AI Content Writer',
                  '✅ Priority support',
                  '✅ Advanced analytics',
                ].map(f => (
                  <div key={f} className="text-gray-300 text-sm">{f}</div>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 shrink-0">
              <div className="text-center">
                <div className="text-gray-500 line-through text-sm">₹499</div>
                <div className="text-4xl font-black text-white">₹49</div>
                <div className="text-gray-400 text-xs">one-time payment</div>
              </div>
              <button onClick={handleUpgrade} disabled={upgrading}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600
                hover:from-purple-500 hover:to-blue-500
                disabled:opacity-50 disabled:cursor-not-allowed
                px-8 py-4 rounded-2xl font-bold text-lg text-white
                transition-all duration-200 hover:scale-105
                shadow-xl shadow-purple-600/30">
                {upgrading ? '⏳ Processing...' : '🚀 Upgrade Now'}
              </button>
              <div className="flex items-center gap-1 text-gray-400 text-xs">
                ⭐⭐⭐⭐⭐
                <span>4.8/5 from 2,400+ users</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION 5: Recent Activity ───────────────────────────────────────── */}
      <div className="bg-gray-800/60 backdrop-blur-sm rounded-2xl
        border border-gray-700/50 overflow-hidden">
        <div className="flex justify-between items-center p-5
          border-b border-gray-700/50">
          <h2 className="text-white font-bold text-lg">Recent Activity</h2>
          <span className="text-gray-500 text-sm">Last 7 days</span>
        </div>

        {loading ? (
          <div className="p-5 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse flex gap-3 items-center">
                <div className="w-10 h-10 bg-gray-700 rounded-xl shrink-0" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-700 rounded mb-2 w-48" />
                  <div className="h-3 bg-gray-700 rounded w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : allActivity.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-4xl mb-3">🌱</div>
            <p className="text-gray-400 mb-4">No activity yet — start creating!</p>
            <a href="/"
              className="inline-block bg-blue-600 hover:bg-blue-500 text-white
              px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
              Create First Resume →
            </a>
          </div>
        ) : (
          <div className="divide-y divide-gray-700/50">
            {allActivity.map((item, i) => (
              <div key={i}
                className="flex items-center gap-4 p-5
                hover:bg-gray-700/30 transition-colors group">
                <div className={`w-10 h-10 rounded-xl flex items-center
                  justify-center text-xl shrink-0 ${
                  item.type === 'resume' ? 'bg-blue-900/50' : 'bg-purple-900/50'
                }`}>
                  {item.type === 'resume' ? '📄' : '🧾'}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{item.title}</p>
                  <p className="text-gray-500 text-sm">{timeAgo(item.created_at)}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    item.status === 'paid'
                      ? 'bg-green-900/50 text-green-400'
                      : item.status === 'pending'
                      ? 'bg-yellow-900/50 text-yellow-400'
                      : 'bg-gray-700/50 text-gray-400'
                  }`}>
                    {item.status}
                  </span>
                  <a href={item.href}
                    className="text-gray-500 hover:text-blue-400 text-sm
                    opacity-0 group-hover:opacity-100 transition-all duration-150">
                    Continue →
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── SECTION 6: Digital Products ──────────────────────────────────────── */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white font-bold text-lg">🛒 Digital Products</h2>
          <span className="text-gray-500 text-sm">Ready-to-use templates & guides</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <ProductCard
            emoji="📄"
            title="Premium Resume Templates"
            desc="20+ ATS-optimized professional designs"
            price="₹199" oldPrice="₹499" color="blue" />
          <ProductCard
            emoji="🧾"
            title="Invoice Template Pack"
            desc="50+ professional invoice designs"
            price="₹149" oldPrice="₹399" color="purple" />
          <ProductCard
            emoji="🎓"
            title="Career Accelerator Course"
            desc="Get hired 3x faster with proven strategies"
            price="₹999" oldPrice="₹2999" color="green" />
        </div>
      </div>

      {/* ── SECTION 7: Tools & Calculators ───────────────────────────────────── */}
      <div className="bg-gray-800/60 backdrop-blur-sm rounded-2xl
        border border-gray-700/50 overflow-hidden">
        <div className="p-5 border-b border-gray-700/50">
          <h2 className="text-white font-bold">🛠 Tools & Calculators</h2>
          <p className="text-gray-500 text-sm mt-0.5">Productivity add-ons</p>
        </div>
        <div className="p-5 flex flex-wrap gap-3">
          <MiniToolCard icon="🧮" title="Tax Calculator"   desc="Estimate income tax instantly"    comingSoon />
          <MiniToolCard icon="💳" title="EMI Calculator"   desc="Loan EMI in seconds"              comingSoon />
          <MiniToolCard icon="📊" title="GST Calculator"   desc="GST-inclusive / exclusive"        comingSoon />
          <MiniToolCard icon="📝" title="Word Counter"     desc="Words, chars, reading time"       comingSoon />
        </div>
      </div>

      {/* ── SECTION 8: AI Suggestions ─────────────────────────────────────────── */}
      <div className="bg-gray-800/60 backdrop-blur-sm rounded-2xl
        border border-gray-700/50 overflow-hidden">
        <div className="p-5 border-b border-gray-700/50">
          <h2 className="text-white font-bold">🤖 AI Suggestions</h2>
          <p className="text-gray-500 text-sm mt-0.5">Personalised next steps for you</p>
        </div>
        <div className="p-5 flex flex-wrap gap-2">
          {AI_SUGGESTIONS.map((s, i) => (
            <span key={i}
              className="px-4 py-2 rounded-full text-sm font-medium
              bg-gray-900/60 text-gray-400 border border-gray-700/50
              hover:border-gray-600/50 hover:text-gray-300
              transition-colors cursor-default">
              {s}
            </span>
          ))}
        </div>
      </div>

    </div>
  );
}
