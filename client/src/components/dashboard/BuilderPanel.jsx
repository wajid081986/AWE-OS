import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { getTools, generatePlan, getAllBuilderPlans } from '../../services/api.service';
import PlanModal from './PlanModal';

const COMPLEXITY_STYLE = {
  low:    { bg: '#052e16', color: '#4ade80', border: '#16a34a' },
  medium: { bg: '#1c1200', color: '#fbbf24', border: '#d97706' },
  high:   { bg: '#2d0808', color: '#f87171', border: '#dc2626' },
};

const STATUS_STYLE = {
  pending_review: { bg: '#1a1a2e', color: '#94a3b8', border: '#475569' },
  approved:       { bg: '#052e16', color: '#4ade80', border: '#16a34a' },
  rejected:       { bg: '#2d0808', color: '#f87171', border: '#dc2626' },
  in_progress:    { bg: '#0c1a3a', color: '#60a5fa', border: '#2563eb' },
  completed:      { bg: '#1a0533', color: '#c084fc', border: '#7c3aed' },
};

const TABS = ['all', 'pending_review', 'approved', 'in_progress'];

function Badge({ styleMap, value }) {
  const s = styleMap[value] || { bg: '#1e293b', color: '#94a3b8', border: '#334155' };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: '999px',
      fontSize: '11px', fontWeight: 700, background: s.bg, color: s.color,
      border: `1px solid ${s.border}`, textTransform: 'capitalize',
    }}>
      {value?.replace('_', ' ')}
    </span>
  );
}

function SkeletonCard() {
  const bar = (w) => ({
    height: '12px', width: `${w}%`, borderRadius: '4px', marginBottom: '8px',
    background: 'linear-gradient(90deg,#1e293b 25%,#334155 50%,#1e293b 75%)',
    backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
  });
  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b',
                  borderRadius: '10px', padding: '16px' }}>
      <div style={bar(60)} /><div style={bar(40)} /><div style={bar(80)} />
    </div>
  );
}

/**
 * BuilderPanel — Section within Dashboard for AI build plan generation and review.
 */
const BuilderPanel = memo(function BuilderPanel() {
  const [tools,         setTools]         = useState([]);
  const [plans,         setPlans]         = useState([]);
  const [selectedTool,  setSelectedTool]  = useState('');
  const [activeTab,     setActiveTab]     = useState('all');
  const [modal,         setModal]         = useState(null);
  const [loadingTools,  setLoadingTools]  = useState(false);
  const [loadingPlans,  setLoadingPlans]  = useState(false);
  const [generating,    setGenerating]    = useState(false);
  const [genError,      setGenError]      = useState(null);
  const [genSuccess,    setGenSuccess]    = useState(null);

  // ── Data fetch ───────────────────────────────────────────────
  const fetchTools = useCallback(async () => {
    setLoadingTools(true);
    try {
      const res = await getTools();
      setTools((res.tools || []).filter(t => t.status === 'idea'));
    } catch (_) {
      // non-critical: empty dropdown is acceptable
    } finally {
      setLoadingTools(false);
    }
  }, []);

  const fetchPlans = useCallback(async () => {
    setLoadingPlans(true);
    try {
      const res = await getAllBuilderPlans();
      setPlans(res.data || []);
    } catch (_) {
    } finally {
      setLoadingPlans(false);
    }
  }, []);

  useEffect(() => {
    fetchTools();
    fetchPlans();
  }, [fetchTools, fetchPlans]);

  // ── Generate ─────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!selectedTool) return;
    setGenerating(true);
    setGenError(null);
    setGenSuccess(null);

    try {
      const res = await generatePlan(selectedTool);
      setGenSuccess(`Plan created for "${res.data.tool_name}" — ${res.data.plan_id}`);
      setSelectedTool('');
      fetchPlans();
      fetchTools(); // tool may have changed status
    } catch (err) {
      setGenError(err.message);
    } finally {
      setGenerating(false);
    }
  }, [selectedTool, fetchPlans, fetchTools]);

  // ── Filtered plans ───────────────────────────────────────────
  const filtered = useMemo(() => {
    if (activeTab === 'all') return plans;
    return plans.filter(p => p.status === activeTab);
  }, [plans, activeTab]);

  // ── Plan update callback (from modal) ─────────────────────────
  const handlePlanUpdated = useCallback(() => {
    setModal(null);
    fetchPlans();
    fetchTools();
  }, [fetchPlans, fetchTools]);

  const S = STYLES;

  return (
    <div>
      {/* ── SECTION A: Generate ─────────────────────────────── */}
      <section style={S.card}>
        <div style={S.cardHeader}>
          <div>
            <h2 style={S.cardTitle}>🔨 Builder Agent</h2>
            <p style={S.cardSub}>
              Select an idea-stage tool and let AI generate a complete technical build plan.
            </p>
          </div>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 240px' }}>
            <label style={S.label}>Select Idea Tool</label>
            <select
              value={selectedTool}
              onChange={e => setSelectedTool(e.target.value)}
              disabled={loadingTools || generating}
              style={S.select}
            >
              <option value="">
                {loadingTools ? 'Loading tools…' : tools.length === 0
                  ? 'No idea-stage tools found'
                  : '— Select a tool —'}
              </option>
              {tools.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!selectedTool || generating}
            style={{
              ...S.btnPrimary,
              opacity: (!selectedTool || generating) ? 0.5 : 1,
              cursor:  (!selectedTool || generating) ? 'not-allowed' : 'pointer',
            }}
          >
            {generating
              ? <><span style={S.spinner} />AI is architecting your tool…</>
              : '🔨 Generate Build Plan'}
          </button>
        </div>

        {genError && (
          <div style={{ margin: '0 20px 16px', padding: '10px 14px',
            background: '#2d0808', border: '1px solid #7f1d1d', borderRadius: '8px',
            color: '#f87171', fontSize: '13px' }}>
            ⚠ {genError}
          </div>
        )}
        {genSuccess && (
          <div style={{ margin: '0 20px 16px', padding: '10px 14px',
            background: '#052e16', border: '1px solid #14532d', borderRadius: '8px',
            color: '#4ade80', fontSize: '13px' }}>
            ✓ {genSuccess}
          </div>
        )}
      </section>

      {/* ── SECTION B: Plans List ─────────────────────────────── */}
      <section style={S.card}>
        <div style={S.cardHeader}>
          <h2 style={S.cardTitle}>Build Plans</h2>
          <span style={S.badgeCount}>{plans.length} total</span>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', padding: '0 20px 16px',
                      borderBottom: '1px solid #334155', flexWrap: 'wrap' }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{
                padding: '5px 12px', borderRadius: '6px', fontSize: '12px',
                fontWeight: 600, cursor: 'pointer', border: 'none',
                background: activeTab === tab ? '#4338ca' : '#1e293b',
                color: activeTab === tab ? '#e0e7ff' : '#64748b',
                textTransform: 'capitalize',
              }}>
              {tab === 'all' ? `All (${plans.length})` : tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div style={{ padding: '16px 20px' }}>
          {loadingPlans ? (
            <div style={{ display: 'grid', gap: '12px',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
              {[1,2,3].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#475569' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
              <p style={{ margin: 0, fontSize: '14px' }}>
                {activeTab === 'all' ? 'No plans generated yet.' : `No plans with status "${activeTab.replace('_', ' ')}".`}
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {filtered.map(plan => (
                <PlanCard key={plan.id} plan={plan} onView={() => setModal(plan)} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Modal */}
      {modal && (
        <PlanModal
          plan={modal}
          onClose={() => setModal(null)}
          onUpdated={handlePlanUpdated}
        />
      )}
    </div>
  );
});

const PlanCard = memo(function PlanCard({ plan, onView }) {
  const complexity = plan.complexity_level || 'medium';
  return (
    <div style={{
      background: '#0f172a', border: '1px solid #1e293b',
      borderRadius: '10px', padding: '16px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between',
                    alignItems: 'flex-start', marginBottom: '10px', gap: '8px' }}>
        <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#f1f5f9',
                    flex: 1, lineHeight: 1.3 }}>
          {plan.tool_name}
        </p>
        <Badge styleMap={STATUS_STYLE} value={plan.status} />
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <Badge styleMap={COMPLEXITY_STYLE} value={complexity} />
        <span style={{ fontSize: '11px', color: '#64748b', alignSelf: 'center' }}>
          ~{plan.estimated_hours}h
        </span>
      </div>

      <p style={{ margin: '0 0 12px', fontSize: '11px', color: '#475569' }}>
        {new Date(plan.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        {' · '}v{plan.version || 1}
      </p>

      <button onClick={onView} style={{
        width: '100%', padding: '7px', borderRadius: '6px', fontSize: '12px',
        fontWeight: 600, cursor: 'pointer', background: '#1e293b',
        color: '#a5b4fc', border: '1px solid #4338ca',
      }}>
        👁 View Plan
      </button>
    </div>
  );
});

const STYLES = {
  card: {
    background: '#1e293b', border: '1px solid #334155',
    borderRadius: '12px', overflow: 'hidden', marginBottom: '20px',
  },
  cardHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    flexWrap: 'wrap', gap: '10px', padding: '16px 20px', borderBottom: '1px solid #334155',
  },
  cardTitle: { margin: 0, fontSize: '15px', fontWeight: 700, color: '#f1f5f9' },
  cardSub:   { margin: '2px 0 0', fontSize: '12px', color: '#64748b' },
  badgeCount: {
    padding: '2px 10px', borderRadius: '999px', fontSize: '11px',
    fontWeight: 700, background: '#0f172a', color: '#94a3b8', border: '1px solid #334155',
  },
  label: { display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b',
           textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' },
  select: {
    width: '100%', padding: '8px 12px', borderRadius: '8px',
    background: '#0f172a', color: '#f1f5f9', border: '1px solid #334155',
    fontSize: '13px', outline: 'none',
  },
  btnPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '9px 18px', borderRadius: '8px', fontWeight: 700,
    fontSize: '13px', background: '#4338ca', color: '#e0e7ff', border: '1px solid #6366f1',
  },
  spinner: {
    display: 'inline-block', width: '12px', height: '12px',
    border: '2px solid #6366f1', borderTop: '2px solid transparent',
    borderRadius: '50%', animation: 'spin 0.8s linear infinite',
  },
};

export default BuilderPanel;
