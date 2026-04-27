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

// ── Skeletons ────────────────────────────────────────────────────────────────
function SkeletonBlock({ h = 80, r = 10 }) {
  return (
    <div style={{
      height: h, borderRadius: r,
      background: 'linear-gradient(90deg,#1e293b 25%,#263246 50%,#1e293b 75%)',
      backgroundSize: '200% 100%',
      animation: 'ud_shimmer 1.4s infinite linear',
    }} />
  );
}

// ── StatCard ─────────────────────────────────────────────────────────────────
const StatCard = memo(function StatCard({ icon, label, value, sub, accent, loading }) {
  const ACCENTS = {
    green:  { bg: '#052e16', border: '#16a34a', text: '#4ade80' },
    blue:   { bg: '#0c1a3a', border: '#2563eb', text: '#60a5fa' },
    purple: { bg: '#1e1040', border: '#7c3aed', text: '#a78bfa' },
    amber:  { bg: '#1c1200', border: '#d97706', text: '#fbbf24' },
  };
  const c = ACCENTS[accent] || ACCENTS.blue;

  if (loading) {
    return (
      <div style={{ flex: '1 1 160px', minWidth: 140, borderRadius: 12,
        background: '#1e293b', border: '1px solid #334155', padding: 16 }}>
        <SkeletonBlock h={16} r={6} />
        <div style={{ marginTop: 10 }}><SkeletonBlock h={28} r={6} /></div>
        <div style={{ marginTop: 6 }}><SkeletonBlock h={12} r={4} /></div>
      </div>
    );
  }
  return (
    <div style={{
      flex: '1 1 160px', minWidth: 140, borderRadius: 12,
      background: c.bg, border: `1px solid ${c.border}`, padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8',
          textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: c.text }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{sub}</div>}
    </div>
  );
});

// ── ActivityItem ─────────────────────────────────────────────────────────────
const ActivityItem = memo(function ActivityItem({ icon, title, sub, badge, badgeColor }) {
  const BC = {
    green:  { bg: '#052e16', color: '#4ade80', border: '#16a34a' },
    amber:  { bg: '#1c1200', color: '#fbbf24', border: '#d97706' },
    blue:   { bg: '#0c1a3a', color: '#60a5fa', border: '#2563eb' },
    slate:  { bg: '#1a1a2e', color: '#94a3b8', border: '#475569' },
  };
  const bc = BC[badgeColor] || BC.slate;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '9px 0', borderBottom: '1px solid #1e293b',
    }}>
      <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </div>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{sub}</div>
      </div>
      {badge && (
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
          background: bc.bg, color: bc.color, border: `1px solid ${bc.border}`,
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>{badge}</span>
      )}
    </div>
  );
});

// ── ActionCard ───────────────────────────────────────────────────────────────
function ActionCard({ icon, title, desc, btnLabel, onClick, locked, accent }) {
  const ACCENTS = {
    indigo: { border: '#4338ca', btnBg: '#3730a3', btnColor: '#e0e7ff', btnBorder: '#6366f1' },
    teal:   { border: '#0d9488', btnBg: '#0f766e', btnColor: '#ccfbf1', btnBorder: '#14b8a6' },
    rose:   { border: '#be123c', btnBg: '#9f1239', btnColor: '#ffe4e6', btnBorder: '#f43f5e' },
  };
  const c = ACCENTS[accent] || ACCENTS.indigo;
  return (
    <div style={{
      flex: '1 1 200px', minWidth: 180,
      background: '#1e293b', border: `1px solid ${locked ? '#334155' : c.border}`,
      borderRadius: 12, padding: 16,
      display: 'flex', flexDirection: 'column', gap: 8,
      opacity: locked ? 0.6 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{title}</span>
        {locked && <span style={{ fontSize: 10, marginLeft: 'auto', color: '#64748b', padding: '1px 6px',
          borderRadius: 999, background: '#0f172a', border: '1px solid #334155' }}>🔒 Pro</span>}
      </div>
      <p style={{ margin: 0, fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{desc}</p>
      <button
        onClick={locked ? undefined : onClick}
        disabled={locked}
        style={{
          marginTop: 'auto', padding: '7px 0', borderRadius: 8,
          fontSize: 12, fontWeight: 700, cursor: locked ? 'not-allowed' : 'pointer',
          background: locked ? '#0f172a' : c.btnBg,
          color: locked ? '#475569' : c.btnColor,
          border: `1px solid ${locked ? '#334155' : c.btnBorder}`,
        }}
      >{btnLabel}</button>
    </div>
  );
}

// ── MiniToolCard ─────────────────────────────────────────────────────────────
function MiniToolCard({ icon, title, desc, comingSoon }) {
  return (
    <div style={{
      flex: '1 1 140px', minWidth: 120,
      background: '#0f172a', border: '1px solid #334155',
      borderRadius: 10, padding: '12px 14px',
    }}>
      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{title}</div>
      <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>{desc}</div>
      {comingSoon && (
        <span style={{ marginTop: 8, display: 'inline-block', fontSize: 10, fontWeight: 600,
          color: '#f59e0b', padding: '1px 7px', borderRadius: 999,
          background: '#1c1200', border: '1px solid #d97706' }}>Coming Soon</span>
      )}
    </div>
  );
}

// ── ProductCard ──────────────────────────────────────────────────────────────
function ProductCard({ icon, title, desc, price, tag }) {
  return (
    <div style={{
      flex: '1 1 180px', minWidth: 160,
      background: 'linear-gradient(135deg,#1e293b,#0f172a)',
      border: '1px solid #4338ca', borderRadius: 12, padding: 16,
    }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      {tag && (
        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
          background: '#1c1200', color: '#fbbf24', border: '1px solid #d97706',
          textTransform: 'uppercase', letterSpacing: '0.08em' }}>{tag}</span>
      )}
      <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginTop: 6 }}>{title}</div>
      <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, lineHeight: 1.5 }}>{desc}</div>
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: '#a78bfa' }}>{price}</span>
        <button style={{
          padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 700,
          cursor: 'pointer', background: '#3730a3', color: '#e0e7ff', border: '1px solid #6366f1',
        }}>Get →</button>
      </div>
    </div>
  );
}

// ── SectionHeader ────────────────────────────────────────────────────────────
function SectionHeader({ title, sub, badge }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10,
      padding: '14px 18px', borderBottom: '1px solid #334155' }}>
      <div style={{ flex: 1 }}>
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{title}</h2>
        {sub && <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>{sub}</p>}
      </div>
      {badge != null && (
        <span style={{ padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
          background: '#0f172a', color: '#94a3b8', border: '1px solid #334155' }}>
          {badge}
        </span>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function UserDashboard() {
  const navigate  = useNavigate();
  const [apiData,  setApiData]  = useState(null);
  const [loading,  setLoading]  = useState(true);

  const rawUser  = JSON.parse(localStorage.getItem('awe_user') || '{}');
  const isPremium = rawUser.isPremium || false;
  const userName  = rawUser.name || rawUser.email?.split('@')[0] || 'Builder';

  const loadData = useCallback(async () => {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        setApiData(cached.data);
        setLoading(false);
        return;
      }
    } catch { /* stale or corrupt cache */ }

    const [resumesRes, invoiceRes, ticketsRes] = await Promise.allSettled([
      apiFetch('/api/resumes'),
      apiFetch('/api/invoices/stats'),
      apiFetch('/api/support/tickets'),
    ]);

    const d = {
      resumes:      resumesRes.status  === 'fulfilled' ? (resumesRes.value.resumes  || resumesRes.value.data  || []) : [],
      invoiceStats: invoiceRes.status  === 'fulfilled' ? (invoiceRes.value.stats   || null) : null,
      tickets:      ticketsRes.status  === 'fulfilled' ? (ticketsRes.value.tickets || ticketsRes.value.data || []) : [],
    };

    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: d })); } catch { /* quota */ }
    setApiData(d);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const resumes      = apiData?.resumes      || [];
  const invoiceStats = apiData?.invoiceStats || {};
  const tickets      = apiData?.tickets      || [];

  const totalRevenue = invoiceStats.total_revenue  || 0;
  const fmtINR = v => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

  const AI_SUGGESTIONS = [
    isPremium ? '⭐ Export resume as PDF — try now' : '🔓 Unlock all 12 templates for ₹49',
    resumes.length === 0 ? '📄 Create your first resume in 3 minutes' : `📄 Update your resume — last edited ${resumes[0]?.updated_at ? new Date(resumes[0].updated_at).toLocaleDateString() : 'recently'}`,
    invoiceStats.pending_count > 0 ? `💰 ${invoiceStats.pending_count} invoice(s) pending payment — follow up` : '🧾 Create a professional invoice — gets paid 2× faster',
    '📊 Add skills section to get 40% more recruiter views',
    '🌟 Share your resume link — gets 3× more responses',
  ];

  const card = {
    background: '#1e293b', border: '1px solid #334155',
    borderRadius: 12, overflow: 'hidden',
  };

  return (
    <>
      {/* Shimmer keyframe — injected once, harmless if duplicate */}
      <style>{`@keyframes ud_shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      {/* ── SECTION 1: Hero ────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg,#1e1040 0%,#0c1a3a 50%,#052e16 100%)',
        border: '1px solid #4338ca', borderRadius: 14, padding: '22px 24px',
        display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center',
      }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <p style={{ margin: '0 0 4px', fontSize: 12, color: '#7c3aed', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {isPremium ? '⭐ Premium Member' : '🆓 Free Plan'}
          </p>
          <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: '#f1f5f9' }}>
            Welcome back, {userName} 👋
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
            {resumes.length} resume{resumes.length !== 1 ? 's' : ''} created
            {invoiceStats.total_count ? ` · ${invoiceStats.total_count} invoice${invoiceStats.total_count !== 1 ? 's' : ''} sent` : ''}
            {totalRevenue > 0 ? ` · ${fmtINR(totalRevenue)} earned` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/')}
            style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
              cursor: 'pointer', background: '#3730a3', color: '#e0e7ff', border: '1px solid #6366f1' }}>
            📄 Create Resume
          </button>
          <button onClick={() => navigate('/tools/invoice/create')}
            style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
              cursor: 'pointer', background: '#0f766e', color: '#ccfbf1', border: '1px solid #14b8a6' }}>
            🧾 New Invoice
          </button>
          {!isPremium && (
            <button onClick={() => navigate('/')}
              style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                cursor: 'pointer', background: '#92400e', color: '#fef3c7', border: '1px solid #f59e0b' }}>
              ✨ Go Premium — ₹49
            </button>
          )}
        </div>
      </div>

      {/* ── SECTION 2: Stats Cards ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <StatCard icon="📄" label="Resumes"       accent="blue"
          value={loading ? '…' : String(resumes.length)}
          sub="created all time" loading={loading} />
        <StatCard icon="💰" label="Revenue"       accent="green"
          value={loading ? '…' : fmtINR(totalRevenue)}
          sub="from paid invoices" loading={loading} />
        <StatCard icon="🧾" label="Invoices Sent" accent="purple"
          value={loading ? '…' : String(invoiceStats.total_count || 0)}
          sub={`${invoiceStats.pending_count || 0} pending`} loading={loading} />
        <StatCard icon="🎫" label="Support"       accent="amber"
          value={loading ? '…' : String(tickets.length)}
          sub="open tickets" loading={loading} />
      </div>

      {/* ── SECTION 3: Quick Actions ────────────────────────────────────────── */}
      <div style={card}>
        <SectionHeader title="🚀 Quick Actions" sub="Your most-used tools" />
        <div style={{ padding: '14px 16px', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <ActionCard
            icon="📄" title="Resume Builder" accent="indigo"
            desc="ATS-optimised resumes with 12+ templates. Stand out in any job search."
            btnLabel="Build Resume →"
            onClick={() => navigate('/')} />
          <ActionCard
            icon="🧾" title="Invoice Generator" accent="teal"
            desc="Professional PDF invoices. Auto-number, GST, multi-currency support."
            btnLabel="Open Invoices →"
            onClick={() => navigate('/tools/invoice')} />
          <ActionCard
            icon="🤖" title="AI Career Coach" accent="rose"
            desc="Get personalised resume feedback and cover letter suggestions."
            btnLabel={isPremium ? 'Open AI Coach →' : 'Unlock with Pro'}
            locked={!isPremium}
            onClick={() => {}} />
        </div>
      </div>

      {/* ── SECTION 4: Premium Upsell (guests only) ────────────────────────── */}
      {!isPremium && (
        <div style={{
          background: 'linear-gradient(135deg,#1c1200,#1e1040)',
          border: '1px solid #d97706', borderRadius: 14, padding: '18px 22px',
          display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center',
        }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#f59e0b',
              textTransform: 'uppercase', letterSpacing: '0.08em' }}>✨ Upgrade to Premium</p>
            <p style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 800, color: '#fef3c7' }}>
              One-time ₹49 — Lifetime Access
            </p>
            <p style={{ margin: 0, fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
              ✔ Remove watermark &nbsp;·&nbsp; ✔ All 12 templates &nbsp;·&nbsp;
              ✔ AI cover letter &nbsp;·&nbsp; ✔ Priority support
            </p>
          </div>
          <button onClick={() => navigate('/')}
            style={{ padding: '10px 22px', borderRadius: 9, fontSize: 13, fontWeight: 800,
              cursor: 'pointer', background: '#d97706', color: '#1c1200', border: 'none',
              whiteSpace: 'nowrap' }}>
            Upgrade Now →
          </button>
        </div>
      )}

      {/* ── SECTION 5: Recent Activity ──────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {/* Recent Resumes */}
        <div style={{ ...card, flex: '1 1 260px', minWidth: 240 }}>
          <SectionHeader title="📄 Recent Resumes" badge={resumes.length} />
          <div style={{ padding: '4px 16px 12px' }}>
            {loading ? (
              [1,2,3].map(i => <div key={i} style={{ paddingTop: 10 }}><SkeletonBlock h={40} r={8} /></div>)
            ) : resumes.length === 0 ? (
              <p style={{ padding: '16px 0', textAlign: 'center', color: '#475569', fontSize: 12 }}>
                No resumes yet.{' '}
                <span onClick={() => navigate('/')}
                  style={{ color: '#60a5fa', cursor: 'pointer', textDecoration: 'underline' }}>
                  Create one →
                </span>
              </p>
            ) : resumes.slice(0, 3).map(r => (
              <ActivityItem
                key={r.id}
                icon="📄"
                title={r.name || r.title || 'Untitled Resume'}
                sub={r.updated_at ? new Date(r.updated_at).toLocaleDateString() : 'No date'}
                badge={r.template || 'Classic'}
                badgeColor="blue" />
            ))}
          </div>
        </div>

        {/* Recent Invoices */}
        <div style={{ ...card, flex: '1 1 260px', minWidth: 240 }}>
          <SectionHeader title="🧾 Recent Invoices"
            badge={(invoiceStats.recent || []).length || 0} />
          <div style={{ padding: '4px 16px 12px' }}>
            {loading ? (
              [1,2,3].map(i => <div key={i} style={{ paddingTop: 10 }}><SkeletonBlock h={40} r={8} /></div>)
            ) : (invoiceStats.recent || []).length === 0 ? (
              <p style={{ padding: '16px 0', textAlign: 'center', color: '#475569', fontSize: 12 }}>
                No invoices yet.{' '}
                <span onClick={() => navigate('/tools/invoice/create')}
                  style={{ color: '#4ade80', cursor: 'pointer', textDecoration: 'underline' }}>
                  Create one →
                </span>
              </p>
            ) : (invoiceStats.recent || []).slice(0, 3).map(inv => (
              <ActivityItem
                key={inv.id}
                icon="🧾"
                title={inv.client_name || 'Unknown Client'}
                sub={`${inv.invoice_number || 'INV'} · ${fmtINR(inv.total_amount)}`}
                badge={inv.status}
                badgeColor={inv.status === 'paid' ? 'green' : inv.status === 'pending' ? 'amber' : 'slate'} />
            ))}
          </div>
        </div>
      </div>

      {/* ── SECTION 6: Tools & Calculators ─────────────────────────────────── */}
      <div style={card}>
        <SectionHeader title="🛠 Tools & Calculators" sub="Productivity add-ons" />
        <div style={{ padding: '14px 16px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <MiniToolCard icon="🧮" title="Tax Calculator"   desc="Estimate income tax instantly" comingSoon />
          <MiniToolCard icon="💳" title="EMI Calculator"   desc="Loan EMI in seconds" comingSoon />
          <MiniToolCard icon="📊" title="GST Calculator"   desc="GST-inclusive / exclusive" comingSoon />
          <MiniToolCard icon="📝" title="Word Counter"     desc="Words, chars, reading time" comingSoon />
        </div>
      </div>

      {/* ── SECTION 7: Digital Products Store ──────────────────────────────── */}
      <div style={card}>
        <SectionHeader title="🛒 Digital Products" sub="Ready-to-use templates & guides" />
        <div style={{ padding: '14px 16px', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <ProductCard
            icon="📄" title="Premium Resume Pack"
            desc="12 ATS-optimised Tailwind resume templates for any industry."
            price="₹149" tag="Bestseller" />
          <ProductCard
            icon="🧾" title="Invoice Template Pack"
            desc="20 professional invoice designs — freelancer, agency, GST-ready."
            price="₹99" tag="New" />
          <ProductCard
            icon="📚" title="Career Accelerator Guide"
            desc="Step-by-step PDF guide to land your dream job in 60 days."
            price="₹49" tag="Free with Pro" />
        </div>
      </div>

      {/* ── SECTION 8: AI Suggestions ──────────────────────────────────────── */}
      <div style={card}>
        <SectionHeader title="🤖 AI Suggestions" sub="Personalised next steps for you" />
        <div style={{ padding: '12px 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {AI_SUGGESTIONS.map((s, i) => (
            <span key={i} style={{
              padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 500,
              background: '#0f172a', color: '#94a3b8', border: '1px solid #334155',
              cursor: 'default',
            }}>{s}</span>
          ))}
        </div>
      </div>
    </>
  );
}
