import { useState, useCallback, useEffect, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

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

// ── Formatters ────────────────────────────────────────────────

function fmtINR(v) {
  const n = Number(v || 0);
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtPct(v) { return Number(v || 0).toFixed(2) + '%'; }
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}
function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Revenue Trend Chart (recharts) ───────────────────────────

const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    background: '#1f2937', border: '1px solid #374151',
    borderRadius: 6, fontSize: 12, color: '#f9fafb',
  },
  labelStyle: { color: '#9ca3af', marginBottom: 4 },
  itemStyle:  { color: '#d1d5db' },
};

function RevenueTrendChart({ data = [] }) {
  if (!data.length) {
    return (
      <div style={{ color: '#4b5563', textAlign: 'center', padding: '32px 0', fontSize: 13 }}>
        No history data yet — run a snapshot first
      </div>
    );
  }

  const chartData = data.map(d => ({
    date:    fmtDate(d.snapshot_date),
    revenue: Number(d.daily_revenue || 0),
    mrr:     Number(d.mrr || 0),
  }));

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: '#6b7280', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: '#6b7280', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          width={70}
          tickFormatter={v => `₹${v.toLocaleString('en-IN')}`}
        />
        <Tooltip
          {...CHART_TOOLTIP_STYLE}
          formatter={(v, name) => [
            fmtINR(v),
            name === 'revenue' ? 'Daily Revenue' : 'MRR',
          ]}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, color: '#6b7280', paddingTop: 4 }}
          formatter={name => name === 'revenue' ? 'Daily Revenue' : 'MRR'}
        />
        <Line
          type="monotone" dataKey="revenue"
          stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }}
        />
        <Line
          type="monotone" dataKey="mrr"
          stroke="#7c3aed" strokeWidth={1.5} strokeDasharray="5 3" dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Score Bar ─────────────────────────────────────────────────

function ScoreBar({ score = 0, max = 100 }) {
  const pct = Math.min((score / max) * 100, 100);
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444';
  return (
    <div style={{ background: '#1f2937', borderRadius: 4, height: 6, width: '100%', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.4s' }} />
    </div>
  );
}

// ── Alert dot ─────────────────────────────────────────────────

function AlertDot({ severity }) {
  const color = severity === 'critical' ? '#ef4444' : severity === 'warning' ? '#eab308' : '#3b82f6';
  return <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: color, marginRight: 8, flexShrink: 0 }} />;
}

// ── Styles ────────────────────────────────────────────────────

const CARD    = { background: '#111827', border: '1px solid #1f2937', borderRadius: 8, padding: 20, marginBottom: 16 };
const TITLE   = { fontSize: 15, fontWeight: 700, color: '#f9fafb', margin: '0 0 14px' };
const BTN     = (bg = '#3b82f6', disabled = false) => ({
  padding: '7px 14px', borderRadius: 6, border: 'none',
  background: disabled ? '#374151' : bg, color: disabled ? '#6b7280' : '#fff',
  fontSize: 12, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.7 : 1,
});
const METRIC  = (color) => ({
  background: '#1a1a2e', border: `1px solid ${color}40`,
  borderRadius: 8, padding: '14px 16px', flex: 1, minWidth: 130,
});
const BADGE   = (bg, color) => ({
  display: 'inline-block', padding: '2px 8px', borderRadius: 12,
  background: bg, color, fontSize: 11, fontWeight: 600,
});

// ── Main Component ────────────────────────────────────────────

export default function RevenuePanel() {
  const [open, setOpen]             = useState(true);
  const [dashboard, setDashboard]   = useState(null);
  const [history, setHistory]       = useState([]);
  const [upsells, setUpsells]       = useState([]);
  const [failedPays, setFailedPays] = useState([]);
  const [alerts, setAlerts]         = useState([]);
  const [loading, setLoading]       = useState(false);
  const [snapLoading, setSnapLoading] = useState(false);
  const [upsellLoading, setUpsellLoading] = useState(false);
  const [error, setError]           = useState(null);

  // ── Fetch dashboard ──────────────────────────────────────────

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, histRes, upsellRes, failRes, alertRes] = await Promise.allSettled([
        apiFetch('/api/revenue-agent/dashboard'),
        apiFetch('/api/revenue-agent/history?days=30'),
        apiFetch('/api/revenue-agent/upsells?status=identified&limit=10'),
        apiFetch('/api/revenue-agent/failed-payments?resolved=false'),
        apiFetch('/api/revenue-agent/alerts?acknowledged=false'),
      ]);

      if (dashRes.status === 'fulfilled')   setDashboard(dashRes.value.data);
      if (histRes.status === 'fulfilled')   setHistory(histRes.value.data || []);
      if (upsellRes.status === 'fulfilled') setUpsells(upsellRes.value.data || []);
      if (failRes.status === 'fulfilled')   setFailedPays(failRes.value.data || []);
      if (alertRes.status === 'fulfilled')  setAlerts(alertRes.value.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  // ── Run Snapshot ─────────────────────────────────────────────

  const runSnapshot = useCallback(async () => {
    setSnapLoading(true);
    setError(null);
    try {
      await apiFetch('/api/revenue-agent/snapshot', { method: 'POST' });
      await fetchDashboard();
    } catch (err) {
      setError(err.message);
    } finally {
      setSnapLoading(false);
    }
  }, [fetchDashboard]);

  // ── Find Upsells ──────────────────────────────────────────────

  const runFindUpsells = useCallback(async () => {
    setUpsellLoading(true);
    try {
      await apiFetch('/api/revenue-agent/upsells/find', { method: 'POST' });
      const res = await apiFetch('/api/revenue-agent/upsells?status=identified&limit=10');
      setUpsells(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setUpsellLoading(false);
    }
  }, []);

  // ── Acknowledge Alert ─────────────────────────────────────────

  const acknowledgeAlert = useCallback(async (id) => {
    try {
      await apiFetch(`/api/revenue-agent/alerts/${id}/acknowledge`, { method: 'PATCH' });
      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch (_) {}
  }, []);

  // ── Resolve Failed Payment ────────────────────────────────────

  const resolvePayment = useCallback(async (id) => {
    try {
      await apiFetch(`/api/revenue-agent/failed-payments/${id}/resolve`, { method: 'PATCH' });
      setFailedPays(prev => prev.filter(p => p.id !== id));
    } catch (_) {}
  }, []);

  // ── Update Upsell Status ──────────────────────────────────────

  const updateUpsellStatus = useCallback(async (id, status) => {
    try {
      await apiFetch(`/api/revenue-agent/upsells/${id}/status`, {
        method: 'PATCH', body: JSON.stringify({ status }),
      });
      setUpsells(prev => prev.map(u => u.id === id ? { ...u, status } : u));
    } catch (_) {}
  }, []);

  // ── Derived values ────────────────────────────────────────────

  const D     = dashboard;
  const curr  = D?.current || {};
  const txns  = D?.transactions || {};
  const subs  = D?.subscribers || {};
  const ai    = D?.ai_insights || {};
  const tools = D?.top_tools || [];
  const hs    = ai.health_score ?? null;

  const churnColor = subs.churn_rate > 10 ? '#ef4444' : subs.churn_rate > 5 ? '#eab308' : '#22c55e';
  const hsColor    = hs === null ? '#6b7280' : hs >= 70 ? '#22c55e' : hs >= 40 ? '#eab308' : '#ef4444';
  const trendEmoji = ai.trend === 'growing' ? '📈' : ai.trend === 'declining' ? '📉' : '📊';
  const trendColor = ai.trend === 'growing' ? '#22c55e' : ai.trend === 'declining' ? '#ef4444' : '#60a5fa';

  const totalFailedAmt = failedPays.reduce((s, p) => s + Number(p.amount || 0), 0);

  // ── Render ────────────────────────────────────────────────────

  return (
    <section style={{ marginBottom: 24, fontFamily: 'inherit' }}>
      <style>{`
        .rev-card:hover { background: #1f2937 !important; }
        .rev-fade { animation: revFade 0.3s ease forwards; }
        @keyframes revFade { to { opacity: 0; transform: translateX(8px); } }
      `}</style>

      {/* ── Header ────────────────────────────────────────── */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: open ? 0 : 4 }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f9fafb', margin: 0 }}>
          💰 Revenue Agent
          {D && <span style={{ marginLeft: 10, fontSize: 13, color: '#22c55e', fontWeight: 400 }}>{fmtINR(curr.mrr)}/mo</span>}
        </h2>
        <span style={{ color: '#6b7280', fontSize: 13 }}>{open ? '▲ collapse' : '▼ expand'}</span>
      </div>

      {!open && <div style={{ height: 8 }} />}

      {open && (
        <div style={{ marginTop: 16 }}>

          {/* Error */}
          {error && (
            <div style={{ background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 6, padding: '8px 14px', color: '#fca5a5', fontSize: 13, marginBottom: 14, display: 'flex', justifyContent: 'space-between' }}>
              <span>⚠ {error}</span>
              <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }}>✕</button>
            </div>
          )}

          {/* ── SECTION A: Metric Cards ──────────────────── */}
          <div style={{ ...CARD, paddingBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ ...TITLE, margin: 0 }}>Revenue Metrics</h3>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {D?.last_snapshot && <span style={{ color: '#6b7280', fontSize: 11 }}>Last: {fmtDate(D.last_snapshot)}</span>}
                <button onClick={runSnapshot} disabled={snapLoading} style={BTN('#6d28d9', snapLoading)}>
                  {snapLoading ? '⟳ Calculating…' : '🔄 Run Analysis'}
                </button>
                <button onClick={fetchDashboard} disabled={loading} style={BTN('#374151', loading)}>
                  {loading ? '⟳' : '↻'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
              {[
                { label: 'MRR', val: fmtINR(curr.mrr),   sub: 'Monthly', color: '#22c55e' },
                { label: 'ARR', val: fmtINR(curr.arr),   sub: 'Annual',  color: '#22c55e' },
                { label: 'Total Rev', val: fmtINR(curr.total), sub: 'All time', color: '#22c55e' },
              ].map(m => (
                <div key={m.label} style={METRIC(m.color)}>
                  <div style={{ color: '#6b7280', fontSize: 11, marginBottom: 4 }}>{m.label}</div>
                  <div style={{ color: m.color, fontSize: 18, fontWeight: 700 }}>{loading ? '—' : m.val}</div>
                  <div style={{ color: '#4b5563', fontSize: 10, marginTop: 2 }}>{m.sub}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <div style={METRIC('#a78bfa')}>
                <div style={{ color: '#6b7280', fontSize: 11, marginBottom: 4 }}>LTV</div>
                <div style={{ color: '#a78bfa', fontSize: 18, fontWeight: 700 }}>{loading ? '—' : fmtINR(curr.ltv)}</div>
                <div style={{ color: '#4b5563', fontSize: 10, marginTop: 2 }}>Per user</div>
              </div>
              <div style={METRIC(churnColor)}>
                <div style={{ color: '#6b7280', fontSize: 11, marginBottom: 4 }}>Churn Rate</div>
                <div style={{ color: churnColor, fontSize: 18, fontWeight: 700 }}>{loading ? '—' : fmtPct(subs.churn_rate)}</div>
                <div style={{ color: '#4b5563', fontSize: 10, marginTop: 2 }}>Monthly</div>
              </div>
              <div style={METRIC(hsColor)}>
                <div style={{ color: '#6b7280', fontSize: 11, marginBottom: 4 }}>Health Score</div>
                <div style={{ color: hsColor, fontSize: 18, fontWeight: 700 }}>
                  {loading ? '—' : hs !== null ? `${hs}/100` : 'N/A'}
                </div>
                <div style={{ color: '#4b5563', fontSize: 10, marginTop: 2 }}>AI Score</div>
              </div>
            </div>

            {/* Quick stats row */}
            {D && (
              <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap' }}>
                <span style={{ color: '#9ca3af', fontSize: 12 }}>Today: <strong style={{ color: '#f9fafb' }}>{fmtINR(curr.daily)}</strong></span>
                <span style={{ color: '#9ca3af', fontSize: 12 }}>Txns: <strong style={{ color: '#f9fafb' }}>{txns.today}</strong></span>
                <span style={{ color: '#9ca3af', fontSize: 12 }}>Avg: <strong style={{ color: '#f9fafb' }}>{fmtINR(txns.avg_value)}</strong></span>
                <span style={{ color: '#9ca3af', fontSize: 12 }}>Subscribers: <strong style={{ color: '#f9fafb' }}>{subs.active}</strong></span>
                <span style={{ color: '#9ca3af', fontSize: 12 }}>Success Rate: <strong style={{ color: '#22c55e' }}>{fmtPct(txns.success_rate)}</strong></span>
              </div>
            )}
          </div>

          {/* ── SECTION B: Revenue Trend Chart ──────────── */}
          <div style={CARD}>
            <h3 style={TITLE}>📈 Revenue Trend (30 days)</h3>
            <RevenueTrendChart data={history} />
          </div>

          {/* ── SECTION C: AI Insights ───────────────────── */}
          {(ai.summary || snapLoading) && (
            <div style={{ ...CARD, border: '1px solid #4338ca40' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <h3 style={{ ...TITLE, margin: 0 }}>🤖 AI Revenue Analysis</h3>
                {ai.trend && (
                  <span style={BADGE(trendColor + '20', trendColor)}>
                    {trendEmoji} {ai.trend}
                  </span>
                )}
              </div>

              {ai.summary && (
                <p style={{ color: '#d1d5db', fontSize: 13, lineHeight: 1.6, margin: '0 0 16px' }}>
                  {ai.summary}
                </p>
              )}

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
                {/* Risks */}
                {ai.risks?.length > 0 && (
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ color: '#ef4444', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>⚠ Risks</div>
                    {ai.risks.map((r, i) => (
                      <div key={i} style={{ color: '#fca5a5', fontSize: 12, marginBottom: 5 }}>• {r}</div>
                    ))}
                  </div>
                )}
                {/* Opportunities */}
                {ai.opportunities?.length > 0 && (
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ color: '#22c55e', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>💡 Opportunities</div>
                    {ai.opportunities.map((o, i) => (
                      <div key={i} style={{ color: '#86efac', fontSize: 12, marginBottom: 5 }}>• {o}</div>
                    ))}
                  </div>
                )}
              </div>

              {ai.top_priority && (
                <div style={{ background: '#1f2937', borderRadius: 6, padding: '8px 12px' }}>
                  <span style={{ color: '#fbbf24', fontSize: 12, fontWeight: 600 }}>🎯 Top Priority: </span>
                  <span style={{ color: '#d1d5db', fontSize: 12 }}>{ai.top_priority}</span>
                </div>
              )}
              {ai.revenue_forecast_30d > 0 && (
                <div style={{ color: '#6b7280', fontSize: 11, marginTop: 8 }}>
                  30-day forecast: <strong style={{ color: '#60a5fa' }}>{fmtINR(ai.revenue_forecast_30d)}</strong>
                </div>
              )}
            </div>
          )}

          {/* ── SECTION D: Alerts ────────────────────────── */}
          <div style={CARD}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <h3 style={{ ...TITLE, margin: 0 }}>🚨 Revenue Alerts</h3>
              {alerts.length > 0 && (
                <span style={BADGE('#450a0a', '#f87171')}>{alerts.length}</span>
              )}
            </div>

            {alerts.length === 0 ? (
              <div style={{ color: '#4b5563', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>✅ No active alerts</div>
            ) : (
              alerts.map(alert => (
                <div key={alert.id} style={{
                  background: '#1a1a1a', border: `1px solid ${alert.severity === 'critical' ? '#7f1d1d' : alert.severity === 'warning' ? '#78350f' : '#1e3a5f'}`,
                  borderRadius: 8, padding: '10px 14px', marginBottom: 8,
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                }}>
                  <AlertDot severity={alert.severity} />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#f9fafb', fontSize: 13, fontWeight: 600 }}>{alert.title}</div>
                    <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>{alert.message}</div>
                    {alert.suggested_action && (
                      <div style={{ color: '#60a5fa', fontSize: 11, marginTop: 4 }}>→ {alert.suggested_action}</div>
                    )}
                  </div>
                  <button
                    onClick={() => acknowledgeAlert(alert.id)}
                    style={{ ...BTN('#374151'), fontSize: 11, padding: '4px 10px', flexShrink: 0 }}
                  >✓ Ack</button>
                </div>
              ))
            )}
          </div>

          {/* ── SECTION E: Two Columns ────────────────────── */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>

            {/* LEFT — Upsell Opportunities */}
            <div style={{ ...CARD, flex: 1, minWidth: 280, marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ ...TITLE, margin: 0 }}>💰 Upsell Opportunities</h3>
                <button onClick={runFindUpsells} disabled={upsellLoading} style={BTN('#0284c7', upsellLoading)}>
                  {upsellLoading ? '⟳ Scanning…' : '🔍 Find'}
                </button>
              </div>

              {upsells.length === 0 ? (
                <div style={{ color: '#4b5563', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
                  No open opportunities — click Find
                </div>
              ) : (
                upsells.map(u => (
                  <div key={u.id} className="rev-card" style={{
                    background: '#1a1a1a', borderRadius: 8, padding: '10px 12px', marginBottom: 8,
                    border: '1px solid #1f2937',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ color: '#9ca3af', fontSize: 12, fontFamily: 'monospace' }}>{u.user_email}</span>
                      <span style={BADGE('#0c1a3a', '#60a5fa')}>{u.opportunity_type?.replace(/_/g, ' ')}</span>
                    </div>
                    <div style={{ marginBottom: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ color: '#6b7280', fontSize: 11 }}>Score</span>
                        <span style={{ color: '#f9fafb', fontSize: 11, fontWeight: 600 }}>{u.score}/100</span>
                      </div>
                      <ScoreBar score={u.score} />
                    </div>
                    {u.suggested_price && (
                      <div style={{ color: '#22c55e', fontSize: 12, marginBottom: 4 }}>
                        Suggested: {fmtINR(u.suggested_price)}
                      </div>
                    )}
                    {u.ai_message && (
                      <div style={{ color: '#9ca3af', fontSize: 11, fontStyle: 'italic', marginBottom: 8, lineHeight: 1.5 }}>
                        "{u.ai_message}"
                      </div>
                    )}
                    <select
                      value={u.status}
                      onChange={e => updateUpsellStatus(u.id, e.target.value)}
                      style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 4, color: '#f9fafb', padding: '3px 8px', fontSize: 11, cursor: 'pointer', width: '100%' }}
                    >
                      <option value="identified">identified</option>
                      <option value="contacted">contacted</option>
                      <option value="converted">converted</option>
                      <option value="dismissed">dismissed</option>
                    </select>
                  </div>
                ))
              )}
            </div>

            {/* RIGHT — Failed Payments */}
            <div style={{ ...CARD, flex: 1, minWidth: 280, marginBottom: 0 }}>
              <h3 style={{ ...TITLE, marginBottom: 8 }}>❌ Failed Payments</h3>
              {failedPays.length > 0 && (
                <div style={{ color: '#ef4444', fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
                  {fmtINR(totalFailedAmt)} <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 400 }}>lost</span>
                </div>
              )}

              {failedPays.length === 0 ? (
                <div style={{ color: '#4b5563', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>✅ No unresolved failed payments</div>
              ) : (
                failedPays.map(p => (
                  <div key={p.id} style={{ background: '#1a1a1a', borderRadius: 8, padding: '10px 12px', marginBottom: 8, border: '1px solid #7f1d1d40' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ color: '#f87171', fontWeight: 700, fontSize: 14 }}>{fmtINR(p.amount)}</span>
                      <span style={{ color: '#6b7280', fontSize: 11 }}>{timeAgo(p.created_at)}</span>
                    </div>
                    {p.failure_reason && (
                      <div style={{ color: '#9ca3af', fontSize: 11, marginBottom: 4 }}>{p.failure_reason}</div>
                    )}
                    <div style={{ color: '#6b7280', fontSize: 11, marginBottom: 6 }}>
                      Retry #{p.retry_count}
                      {p.next_retry_at && <span> · Next: {fmtDate(p.next_retry_at)}</span>}
                    </div>
                    <button
                      onClick={() => resolvePayment(p.id)}
                      style={{ ...BTN('#059669'), fontSize: 11, padding: '3px 10px' }}
                    >✓ Mark Resolved</button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── SECTION F: Top Revenue Tools ────────────── */}
          {tools.length > 0 && (
            <div style={{ ...CARD, marginTop: 16 }}>
              <h3 style={TITLE}>🏆 Revenue by Tool</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Rank', 'Tool', 'Revenue', 'Transactions', 'Avg Value'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', color: '#6b7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', textAlign: 'left', borderBottom: '1px solid #1f2937' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tools.map((t, i) => (
                      <tr key={t.tool_id} style={{ borderBottom: '1px solid #111827' }}>
                        <td style={{ padding: '9px 10px', color: i === 0 ? '#fbbf24' : '#6b7280', fontSize: 13, fontWeight: i === 0 ? 700 : 400 }}>#{i + 1}</td>
                        <td style={{ padding: '9px 10px', color: '#f9fafb', fontSize: 13 }}>{t.tool_name}</td>
                        <td style={{ padding: '9px 10px', color: '#22c55e', fontSize: 13, fontWeight: 600 }}>{fmtINR(t.revenue)}</td>
                        <td style={{ padding: '9px 10px', color: '#d1d5db', fontSize: 13 }}>{t.transactions}</td>
                        <td style={{ padding: '9px 10px', color: '#9ca3af', fontSize: 13 }}>{fmtINR(t.transactions > 0 ? t.revenue / t.transactions : 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}
    </section>
  );
}
