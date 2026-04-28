import { useReducer, useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import StatsCard        from '../components/dashboard/StatsCard';
import ToolsTable       from '../components/dashboard/ToolsTable';
import DecisionModal    from '../components/dashboard/DecisionModal';
import BuilderPanel     from '../components/dashboard/BuilderPanel';
import CodeViewer       from '../components/dashboard/CodeViewer';
import AutonomousPanel  from '../components/dashboard/AutonomousPanel';
import IdeaPanel        from '../components/dashboard/IdeaPanel';
import MonetizationPanel from '../components/dashboard/MonetizationPanel';
import DeploymentPanel  from '../components/dashboard/DeploymentPanel';
import RevenuePanel     from '../components/dashboard/RevenuePanel';
import MarketingPanel   from '../components/dashboard/MarketingPanel';
import SupportPanel     from '../components/dashboard/SupportPanel';
import {
  getTools, getDecision, getAllDecisions,
  approveDecision, rejectDecision,
} from '../services/api.service';

// ── Admin guard (read before any hooks) ──────────────────────
const _token     = localStorage.getItem('awe_token');
const _user      = JSON.parse(localStorage.getItem('awe_user') || '{}');
const _adminEmail = import.meta.env.VITE_ADMIN_EMAIL;

// ── State ─────────────────────────────────────────────────────
const initialState = {
  tools:               [],
  allDecisions:        null,
  modal:               null,
  codeViewer:          null,
  loadingTools:        false,
  loadingAllDecisions: false,
  loadingSingleId:     null,
  error:               null,
  lastRefresh:         null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'FETCH_TOOLS_START':
      return { ...state, loadingTools: true, error: null };
    case 'FETCH_TOOLS_OK':
      return { ...state, loadingTools: false, tools: action.payload, lastRefresh: new Date() };
    case 'FETCH_TOOLS_FAIL':
      return { ...state, loadingTools: false, error: action.payload };

    case 'RUN_ALL_START':
      return { ...state, loadingAllDecisions: true, error: null };
    case 'RUN_ALL_OK':
      return { ...state, loadingAllDecisions: false, allDecisions: action.payload };
    case 'RUN_ALL_FAIL':
      return { ...state, loadingAllDecisions: false, error: action.payload };

    case 'RUN_SINGLE_START':
      return { ...state, loadingSingleId: action.payload, error: null };
    case 'RUN_SINGLE_OK':
      return { ...state, loadingSingleId: null, modal: action.payload };
    case 'RUN_SINGLE_FAIL':
      return { ...state, loadingSingleId: null, error: action.payload };

    case 'CLOSE_MODAL':
      return { ...state, modal: null };
    case 'OPEN_CODE_VIEWER':
      return { ...state, codeViewer: action.payload };
    case 'CLOSE_CODE_VIEWER':
      return { ...state, codeViewer: null };

    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

// ── Helpers ───────────────────────────────────────────────────
const fmt = {
  inr:   (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
  count: (v) => Number(v || 0).toLocaleString('en-IN'),
  rate:  (v) => `${Number(v || 0).toFixed(2)}%`,
};

// ── Component ─────────────────────────────────────────────────
export default function AdminPanel() {
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(reducer, initialState);
  const intervalRef = useRef(null);

  // Admin guard — redirect non-admins before any data fetching
  if (!_token)                            return <Navigate to="/" replace />;
  if (!_adminEmail || _user.email !== _adminEmail) return <Navigate to="/dashboard" replace />;

  // ── Data fetch ───────────────────────────────────────────────
  const fetchTools = useCallback(async () => {
    dispatch({ type: 'FETCH_TOOLS_START' });
    try {
      const res = await getTools();
      dispatch({ type: 'FETCH_TOOLS_OK', payload: res.tools || [] });
    } catch (err) {
      if (err.code === 'UNAUTHORIZED') navigate('/', { replace: true });
      else dispatch({ type: 'FETCH_TOOLS_FAIL', payload: err.message });
    }
  }, [navigate]);

  useEffect(() => {
    fetchTools();
    intervalRef.current = setInterval(fetchTools, 300_000);
    return () => clearInterval(intervalRef.current);
  }, [fetchTools]);

  // ── Actions ───────────────────────────────────────────────────
  const handleRunAll = useCallback(async () => {
    dispatch({ type: 'RUN_ALL_START' });
    try {
      const res = await getAllDecisions();
      dispatch({ type: 'RUN_ALL_OK', payload: res.data });
    } catch (err) {
      dispatch({ type: 'RUN_ALL_FAIL', payload: err.message });
    }
  }, []);

  const handleRunSingle = useCallback(async (tool) => {
    dispatch({ type: 'RUN_SINGLE_START', payload: tool.id });
    try {
      const res = await getDecision(tool.id);
      dispatch({ type: 'RUN_SINGLE_OK', payload: res.data });
    } catch (err) {
      dispatch({ type: 'RUN_SINGLE_FAIL', payload: err.message });
    }
  }, []);

  const handleApprove = useCallback(async (tool_id) => {
    try {
      await approveDecision(tool_id);
      dispatch({ type: 'CLOSE_MODAL' });
      fetchTools();
    } catch (err) {
      dispatch({ type: 'RUN_SINGLE_FAIL', payload: err.message });
    }
  }, [fetchTools]);

  const handleReject = useCallback(async (tool_id) => {
    try {
      await rejectDecision(tool_id);
      dispatch({ type: 'CLOSE_MODAL' });
      fetchTools();
    } catch (err) {
      dispatch({ type: 'RUN_SINGLE_FAIL', payload: err.message });
    }
  }, [fetchTools]);

  // ── Derived stats ────────────────────────────────────────────
  const stats = useMemo(() => {
    const live = state.tools.filter(t => t.status === 'live' || t.status === 'scaling');
    const totalRevenue  = state.tools.reduce((s, t) => s + Number(t.revenue || 0), 0);
    const totalUsage    = state.tools.reduce((s, t) => s + Number(t.usage_count || 0), 0);
    const avgConversion = live.length
      ? live.reduce((s, t) => s + Number(t.conversion_rate || 0), 0) / live.length
      : 0;
    return { totalRevenue, totalUsage, activeCount: live.length, avgConversion };
  }, [state.tools]);

  const sidebarStats = useMemo(() => {
    const byStatus = state.tools.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {});
    const top3 = [...state.tools]
      .sort((a, b) => Number(b.revenue || 0) - Number(a.revenue || 0))
      .slice(0, 3);
    const dead = state.tools.filter(t => t.status === 'killed');
    return { byStatus, top3, dead };
  }, [state.tools]);

  const S = STYLES;

  return (
    <div style={S.page}>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        * { box-sizing: border-box; }
        body { margin: 0; }
      `}</style>

      {/* ── Header ─────────────────────────────────────────── */}
      <header style={S.header}>
        <div>
          <h1 style={S.h1}>AWE-OS Admin Panel</h1>
          <p style={S.subtitle}>Autonomous Wealth Engine — Command Center</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {state.lastRefresh && (
            <span style={S.refreshTime}>
              Last refresh: {state.lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button onClick={fetchTools} disabled={state.loadingTools} style={S.btnSecondary}>
            {state.loadingTools ? '⟳ Refreshing…' : '↻ Refresh'}
          </button>
          <button onClick={() => navigate('/dashboard')} style={S.btnGhost}>
            ← User Dashboard
          </button>
          <button onClick={() => navigate('/')} style={S.btnGhost}>
            ← Resume Builder
          </button>
        </div>
      </header>

      {/* ── Error banner ───────────────────────────────────── */}
      {state.error && (
        <div style={S.errorBanner}>
          <span>⚠ {state.error}</span>
          <button onClick={() => dispatch({ type: 'CLEAR_ERROR' })} style={S.errorClose}>✕</button>
        </div>
      )}

      {/* ── Body grid ──────────────────────────────────────── */}
      <div style={S.body}>
        {/* ── LEFT / MAIN ─────────────────────────────────── */}
        <div style={S.main}>

          {/* SECTION 1 — Stats Cards */}
          <div style={S.statsRow}>
            <StatsCard title="Total Revenue"   value={fmt.inr(stats.totalRevenue)}
                       icon="₹" color="green"  loading={state.loadingTools} />
            <StatsCard title="Total Usage"     value={fmt.count(stats.totalUsage)}
                       icon="📊" color="blue"  loading={state.loadingTools} />
            <StatsCard title="Active Tools"    value={String(stats.activeCount)}
                       icon="🛠" color="purple" loading={state.loadingTools} />
            <StatsCard title="Avg Conv. Rate"  value={fmt.rate(stats.avgConversion)}
                       icon="%" color="orange"  loading={state.loadingTools} />
          </div>

          {/* SECTION 2 — Tools Performance */}
          <section style={S.card}>
            <div style={S.cardHeader}>
              <h2 style={S.cardTitle}>Tools Performance</h2>
              <span style={S.badgeCount}>{state.tools.length} tools</span>
            </div>
            <ToolsTable
              tools={state.tools}
              onRunDecision={handleRunSingle}
              loadingId={state.loadingSingleId}
              loading={state.loadingTools}
            />
          </section>

          {/* SECTION 3 — Autonomous Agent */}
          <AutonomousPanel />

          {/* SECTION 4 — AI Idea Review */}
          <IdeaPanel />

          {/* SECTION 5 — Monetization Intelligence */}
          <MonetizationPanel tools={state.tools} />

          {/* SECTION 6 — Builder Agent */}
          <BuilderPanel />

          {/* SECTION 7 — Generated Code */}
          <GeneratedCodeSection
            onViewCode={(code) => dispatch({ type: 'OPEN_CODE_VIEWER', payload: code })}
          />

          {/* SECTION 8 — Revenue Agent */}
          <RevenuePanel />

          {/* SECTION 9 — Deployment Agent */}
          <DeploymentPanel />

          {/* SECTION 10 — Marketing Command Center */}
          <MarketingPanel />

          {/* SECTION 11 — Support Agent */}
          <SupportPanel />

          {/* SECTION 12 — Decision Engine */}
          <section style={S.card}>
            <div style={S.cardHeader}>
              <div>
                <h2 style={S.cardTitle}>Decision Engine</h2>
                <p style={S.cardSub}>Run the engine across all live tools at once</p>
              </div>
              <button
                onClick={handleRunAll}
                disabled={state.loadingAllDecisions}
                style={S.btnPrimary}
              >
                {state.loadingAllDecisions
                  ? <><span style={S.spinner} />Running…</>
                  : '🤖 Run All Decisions'}
              </button>
            </div>

            {!state.loadingAllDecisions && !state.allDecisions && (
              <div style={S.emptyState}>
                <div style={{ fontSize: '36px' }}>🤖</div>
                <p style={{ margin: '8px 0 0', color: '#64748b' }}>
                  No decisions run yet. Click "Run All Decisions" to start.
                </p>
              </div>
            )}

            {state.loadingAllDecisions && (
              <div style={S.emptyState}>
                <div style={{ fontSize: '28px', animation: 'spin 1s linear infinite' }}>⚙</div>
                <p style={{ margin: '10px 0 0', color: '#64748b' }}>Evaluating all tools…</p>
              </div>
            )}

            {state.allDecisions && (
              <>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
                  {Object.entries(state.allDecisions.summary || {}).map(([d, count]) => (
                    <div key={d} style={S.summaryPill(d)}>
                      <span style={{ textTransform: 'capitalize', fontWeight: 700 }}>{d}</span>
                      <span style={{ fontWeight: 800, fontSize: '18px' }}>{count}</span>
                    </div>
                  ))}
                  <div style={S.summaryPill('total')}>
                    <span style={{ fontWeight: 700 }}>Total</span>
                    <span style={{ fontWeight: 800, fontSize: '18px' }}>
                      {state.allDecisions.total_evaluated}
                    </span>
                  </div>
                </div>

                {(state.allDecisions.results || []).length === 0 ? (
                  <p style={{ color: '#475569', textAlign: 'center', padding: '20px' }}>
                    No decisions available.
                  </p>
                ) : (
                  <div style={{ display: 'grid', gap: '12px',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                    {state.allDecisions.results.map(r => (
                      <DecisionResultCard key={r.tool_id} result={r}
                        onOpen={() => dispatch({ type: 'RUN_SINGLE_OK', payload: r })} />
                    ))}
                  </div>
                )}

                {(state.allDecisions.errors || []).length > 0 && (
                  <div style={{ marginTop: '16px', padding: '12px 16px',
                    background: '#2d0808', border: '1px solid #7f1d1d', borderRadius: '8px' }}>
                    <p style={{ margin: 0, fontSize: '12px', color: '#f87171', fontWeight: 600 }}>
                      {state.allDecisions.errors.length} tool(s) failed evaluation:
                    </p>
                    {state.allDecisions.errors.map(e => (
                      <p key={e.tool_id} style={{ margin: '4px 0 0', fontSize: '12px', color: '#fca5a5' }}>
                        • {e.tool_name}: {e.error}
                      </p>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </div>

        {/* ── RIGHT / SIDEBAR ──────────────────────────────── */}
        <aside style={S.sidebar}>

          <div style={S.sideCard}>
            <h3 style={S.sideTitle}>Tools by Status</h3>
            {Object.keys(sidebarStats.byStatus).length === 0
              ? <p style={S.muted}>No tools yet.</p>
              : Object.entries(sidebarStats.byStatus).map(([status, count]) => (
                <div key={status} style={S.sideRow}>
                  <StatusDot status={status} />
                  <span style={{ flex: 1, fontSize: '13px', color: '#cbd5e1',
                                 textTransform: 'capitalize' }}>{status}</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9' }}>{count}</span>
                </div>
              ))
            }
          </div>

          <div style={S.sideCard}>
            <h3 style={S.sideTitle}>Top Revenue</h3>
            {sidebarStats.top3.length === 0
              ? <p style={S.muted}>No revenue data yet.</p>
              : sidebarStats.top3.map((t, i) => (
                <div key={t.id} style={S.sideRow}>
                  <span style={{ fontSize: '14px', fontWeight: 800,
                                 color: ['#fbbf24','#94a3b8','#b45309'][i] }}>
                    #{i + 1}
                  </span>
                  <span style={{ flex: 1, fontSize: '13px', color: '#cbd5e1',
                                 overflow: 'hidden', textOverflow: 'ellipsis',
                                 whiteSpace: 'nowrap' }}>{t.name}</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#4ade80' }}>
                    {fmt.inr(t.revenue)}
                  </span>
                </div>
              ))
            }
          </div>

          <div style={S.sideCard}>
            <h3 style={S.sideTitle}>Killed Tools</h3>
            {sidebarStats.dead.length === 0
              ? <p style={S.muted}>No killed tools — all healthy.</p>
              : sidebarStats.dead.map(t => (
                <div key={t.id} style={S.sideRow}>
                  <span style={{ fontSize: '12px' }}>💀</span>
                  <span style={{ flex: 1, fontSize: '13px', color: '#f87171',
                                 textDecoration: 'line-through' }}>{t.name}</span>
                </div>
              ))
            }
          </div>
        </aside>
      </div>

      {/* ── Code Viewer Modal ─────────────────────────────── */}
      {state.codeViewer && (
        <CodeViewer
          code={state.codeViewer}
          onClose={() => dispatch({ type: 'CLOSE_CODE_VIEWER' })}
          onApproved={() => {
            dispatch({ type: 'CLOSE_CODE_VIEWER' });
            fetchTools();
          }}
          onRejected={() => dispatch({ type: 'CLOSE_CODE_VIEWER' })}
        />
      )}

      {/* ── Decision modal ────────────────────────────────── */}
      <DecisionModal
        result={state.modal}
        onClose={() => dispatch({ type: 'CLOSE_MODAL' })}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

const DECISION_COLORS = {
  scale:   { text: '#60a5fa', border: '#2563eb', bg: '#0c1a3a' },
  improve: { text: '#fbbf24', border: '#d97706', bg: '#1c1200' },
  kill:    { text: '#f87171', border: '#dc2626', bg: '#2d0808' },
  observe: { text: '#94a3b8', border: '#475569', bg: '#1a1a2e' },
};

function GeneratedCodeSection({ onViewCode }) {
  const [codes,   setCodes]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('awe_token');
      const res   = await fetch(
        `${import.meta.env.VITE_API_URL || 'https://awe-os.onrender.com'}/api/codegen`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data  = await res.json();
      setCodes(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCodes(); }, [fetchCodes]);

  const STATUS_COLORS = {
    ready_for_review: { bg: '#1c1200', color: '#fbbf24', border: '#d97706' },
    approved:         { bg: '#052e16', color: '#4ade80', border: '#16a34a' },
    rejected:         { bg: '#2d0808', color: '#f87171', border: '#dc2626' },
  };

  return (
    <section style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #334155' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#f1f5f9' }}>
            🖥️ Generated Code
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
            Review and approve AI-generated code
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ padding: '2px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, background: '#0f172a', color: '#94a3b8', border: '1px solid #334155' }}>
            {codes.length} total
          </span>
          <button
            onClick={fetchCodes}
            style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', background: '#1e293b', color: '#94a3b8', border: '1px solid #334155' }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>⟳ Loading...</div>
        )}
        {error && (
          <div style={{ padding: '12px', background: '#2d0808', borderRadius: '8px', color: '#f87171', fontSize: '12px' }}>
            ⚠ {error}
          </div>
        )}
        {!loading && codes.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px', color: '#475569' }}>
            <div style={{ fontSize: '32px' }}>💻</div>
            <p style={{ margin: '8px 0 0' }}>No code generated yet.</p>
          </div>
        )}
        <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {codes.map(code => {
            const s = STATUS_COLORS[code.status] || { bg: '#1e293b', color: '#94a3b8', border: '#334155' };
            return (
              <div key={code.id} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#f1f5f9' }}>
                    {code.tool_name}
                  </p>
                  <span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: 'nowrap', marginLeft: '8px' }}>
                    {code.status?.replace(/_/g, ' ')}
                  </span>
                </div>
                <p style={{ margin: '0 0 10px', fontSize: '11px', color: '#64748b' }}>
                  📁 {code.total_files} files · 🕒 {code.generation_ms ? `${(code.generation_ms / 1000).toFixed(1)}s` : 'N/A'}
                </p>
                <button
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem('awe_token');
                      const res   = await fetch(
                        `${import.meta.env.VITE_API_URL || 'https://awe-os.onrender.com'}/api/codegen/${code.tool_id}`,
                        { headers: { Authorization: `Bearer ${token}` } },
                      );
                      const data  = await res.json();
                      if (data.success) onViewCode(data.data);
                    } catch (err) {
                      console.error('Failed to fetch full code:', err);
                    }
                  }}
                  style={{ width: '100%', padding: '7px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: '#1e3a5f', color: '#93c5fd', border: '1px solid #2563eb' }}
                >
                  👁️ View Code
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function DecisionResultCard({ result, onOpen }) {
  const c = DECISION_COLORS[result.decision] || DECISION_COLORS.observe;
  return (
    <div style={{ background: '#0f172a', border: `1px solid ${c.border}`, borderRadius: '10px', padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#f1f5f9' }}>
          {result.tool_name}
        </p>
        <span style={{ padding: '2px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, background: c.bg, color: c.text, border: `1px solid ${c.border}`, textTransform: 'capitalize' }}>
          {result.decision}
        </span>
      </div>
      <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
        {result.reason}
      </p>
      <p style={{ margin: '0 0 12px', fontSize: '11px', color: '#475569', lineHeight: 1.5 }}>
        {result.recommended_action}
      </p>
      <button onClick={onOpen} style={{ padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', background: '#1e293b', color: '#a5b4fc', border: '1px solid #4338ca' }}>
        View Details →
      </button>
    </div>
  );
}

function StatusDot({ status }) {
  const colors = {
    live: '#22c55e', scaling: '#3b82f6', killed: '#ef4444',
    idea: '#64748b', building: '#f59e0b',
  };
  return (
    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors[status] || '#64748b', flexShrink: 0 }} />
  );
}

// ── Style constants ───────────────────────────────────────────
const STYLES = {
  page: {
    minHeight: '100vh', background: '#0f172a',
    color: '#f1f5f9', fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    fontSize: '14px',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    flexWrap: 'wrap', gap: '12px',
    padding: '20px 24px', borderBottom: '1px solid #1e293b',
    background: '#0f172a', position: 'sticky', top: 0, zIndex: 100,
  },
  h1:       { margin: 0, fontSize: '20px', fontWeight: 800, color: '#f1f5f9' },
  subtitle: { margin: '2px 0 0', fontSize: '12px', color: '#64748b' },
  refreshTime: { fontSize: '11px', color: '#475569' },
  body: {
    display: 'flex', gap: '20px', padding: '20px 24px', alignItems: 'flex-start',
  },
  main:    { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '20px' },
  sidebar: { width: '260px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '16px' },
  statsRow: { display: 'flex', gap: '14px', flexWrap: 'wrap' },
  card: {
    background: '#1e293b', border: '1px solid #334155',
    borderRadius: '12px', overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    flexWrap: 'wrap', gap: '10px',
    padding: '16px 20px', borderBottom: '1px solid #334155',
  },
  cardTitle: { margin: 0, fontSize: '15px', fontWeight: 700, color: '#f1f5f9' },
  cardSub:   { margin: '2px 0 0', fontSize: '12px', color: '#64748b' },
  badgeCount: {
    padding: '2px 10px', borderRadius: '999px', fontSize: '11px',
    fontWeight: 700, background: '#0f172a', color: '#94a3b8', border: '1px solid #334155',
  },
  sideCard: {
    background: '#1e293b', border: '1px solid #334155',
    borderRadius: '12px', padding: '16px',
  },
  sideTitle: {
    margin: '0 0 12px', fontSize: '12px', fontWeight: 700, color: '#64748b',
    textTransform: 'uppercase', letterSpacing: '0.08em',
  },
  sideRow: {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '6px 0', borderBottom: '1px solid #0f172a',
  },
  muted: { margin: 0, fontSize: '12px', color: '#475569' },
  emptyState: { padding: '40px', textAlign: 'center', color: '#475569' },
  errorBanner: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 24px', background: '#2d0808', borderBottom: '1px solid #7f1d1d',
    color: '#f87171', fontSize: '13px',
  },
  errorClose: {
    background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '16px',
  },
  btnPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '8px 18px', borderRadius: '8px', fontWeight: 700,
    fontSize: '13px', cursor: 'pointer',
    background: '#4338ca', color: '#e0e7ff', border: '1px solid #6366f1',
  },
  btnSecondary: {
    padding: '7px 14px', borderRadius: '8px', fontWeight: 600,
    fontSize: '12px', cursor: 'pointer',
    background: '#1e293b', color: '#94a3b8', border: '1px solid #334155',
  },
  btnGhost: {
    padding: '7px 14px', borderRadius: '8px', fontWeight: 600,
    fontSize: '12px', cursor: 'pointer',
    background: 'transparent', color: '#64748b', border: '1px solid #1e293b',
  },
  spinner: {
    display: 'inline-block', width: '12px', height: '12px',
    border: '2px solid #6366f1', borderTop: '2px solid transparent',
    borderRadius: '50%', animation: 'spin 0.8s linear infinite',
  },
  summaryPill: (decision) => {
    const colors = {
      scale:   { bg: '#0c1a3a', color: '#60a5fa', border: '#2563eb' },
      kill:    { bg: '#2d0808', color: '#f87171', border: '#dc2626' },
      improve: { bg: '#1c1200', color: '#fbbf24', border: '#d97706' },
      observe: { bg: '#1a1a2e', color: '#94a3b8', border: '#475569' },
      total:   { bg: '#1e293b', color: '#f1f5f9', border: '#334155' },
    };
    const c = colors[decision] || colors.total;
    return {
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '10px 16px', borderRadius: '10px',
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      minWidth: '72px', fontSize: '12px',
    };
  },
};
