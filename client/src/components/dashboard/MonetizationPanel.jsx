import { useState, useEffect, useCallback, memo } from 'react';

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
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.code = data.code || 'API_ERROR';
    throw err;
  }
  return data;
}

// ── Style constants ───────────────────────────────────────────

const S = {
  card: {
    background: '#1e293b', border: '1px solid #334155',
    borderRadius: '12px', overflow: 'hidden',
  },
  block: {
    background: '#0f172a', border: '1px solid #1e293b',
    borderRadius: '10px', padding: '14px 16px',
  },
  label: {
    margin: '0 0 4px', fontSize: '10px', color: '#64748b',
    textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700,
  },
  muted: { margin: 0, fontSize: '12px', color: '#475569' },
  input: {
    width: '100%', padding: '8px 12px', borderRadius: '8px',
    background: '#0f172a', color: '#f1f5f9', border: '1px solid #334155',
    fontSize: '13px', outline: 'none', boxSizing: 'border-box',
  },
};

const STRATEGY_TYPE_STYLE = {
  pricing:  { bg: '#0c1a3a', color: '#60a5fa', border: '#2563eb' },
  freemium: { bg: '#052e16', color: '#4ade80', border: '#16a34a' },
  upsell:   { bg: '#1a0533', color: '#c084fc', border: '#7c3aed' },
  trial:    { bg: '#1c1200', color: '#fbbf24', border: '#d97706' },
  bundle:   { bg: '#1e293b', color: '#94a3b8', border: '#475569' },
};

const STATUS_STYLE = {
  suggested:   { bg: '#0c1a3a', color: '#60a5fa', border: '#2563eb' },
  testing:     { bg: '#1c1200', color: '#fbbf24', border: '#d97706' },
  implemented: { bg: '#052e16', color: '#4ade80', border: '#16a34a' },
  rejected:    { bg: '#2d0808', color: '#f87171', border: '#dc2626' },
};

function Badge({ text, styleMap, value }) {
  const s = (styleMap && styleMap[value]) || { bg: '#1e293b', color: '#94a3b8', border: '#334155' };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 9px', borderRadius: '999px',
      fontSize: '11px', fontWeight: 700,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      textTransform: 'capitalize',
    }}>
      {text || value}
    </span>
  );
}

function scoreColor(score) {
  if (score >= 70) return '#4ade80';
  if (score >= 40) return '#fbbf24';
  return '#f87171';
}

function fmt(v) {
  return `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

// ── Skeleton loader ───────────────────────────────────────────

function Skeleton({ w = 100, h = 12, mb = 8 }) {
  return (
    <div style={{
      height: `${h}px`, width: `${w}%`, borderRadius: '4px', marginBottom: `${mb}px`,
      background: 'linear-gradient(90deg,#1e293b 25%,#334155 50%,#1e293b 75%)',
      backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
    }} />
  );
}

// ── Experiment progress bar ───────────────────────────────────

function VariantBar({ label, price, views, conversions, rate, color }) {
  const pct = Math.min(100, views > 0 ? (views / Math.max(views, 1)) * 100 : 0);
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#f1f5f9' }}>
          Variant {label} — {fmt(price)}
        </span>
        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
          {conversions}/{views} · {rate.toFixed(1)}%
        </span>
      </div>
      <div style={{ height: '6px', background: '#0f172a', borderRadius: '999px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '999px', transition: 'width 0.4s' }} />
      </div>
      <span style={{ fontSize: '10px', color: '#475569' }}>{views} views</span>
    </div>
  );
}

// ── A/B Experiment card ───────────────────────────────────────

const ExperimentCard = memo(function ExperimentCard({ exp, onConclude }) {
  const [concluding, setConcluding] = useState(false);
  const [result,     setResult]     = useState(null);
  const [error,      setError]      = useState(null);

  const rateA = exp.variant_a_views > 0
    ? (exp.variant_a_conversions / exp.variant_a_views) * 100 : 0;
  const rateB = exp.variant_b_views > 0
    ? (exp.variant_b_conversions / exp.variant_b_views) * 100 : 0;

  const handleConclude = async () => {
    setConcluding(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/monetize/experiment/${exp.id}/conclude`, { method: 'POST' });
      setResult(res.data);
      onConclude?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setConcluding(false);
    }
  };

  const concluded = exp.status === 'completed' || result;
  const displayExp = result || exp;

  return (
    <div style={{ ...S.block, marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#f1f5f9' }}>
            {exp.experiment_name}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#475569' }}>
            Started {new Date(exp.started_at).toLocaleDateString()}
          </p>
        </div>
        <Badge
          text={displayExp.status}
          styleMap={{
            running:   { bg: '#052e16', color: '#4ade80', border: '#16a34a' },
            completed: { bg: '#1e293b', color: '#94a3b8', border: '#334155' },
            stopped:   { bg: '#2d0808', color: '#f87171', border: '#dc2626' },
          }}
          value={displayExp.status}
        />
      </div>

      <VariantBar
        label={`A (${exp.variant_a_label})`}
        price={exp.variant_a_price}
        views={exp.variant_a_views}
        conversions={exp.variant_a_conversions}
        rate={rateA}
        color="#60a5fa"
      />
      <VariantBar
        label={`B (${exp.variant_b_label})`}
        price={exp.variant_b_price}
        views={exp.variant_b_views}
        conversions={exp.variant_b_conversions}
        rate={rateB}
        color="#a78bfa"
      />

      {/* Winner result */}
      {(concluded && displayExp.winner) && (
        <div style={{
          padding: '10px 14px', borderRadius: '8px', marginBottom: '10px',
          background: displayExp.winner === 'tie' ? '#1e293b' : '#052e16',
          border: `1px solid ${displayExp.winner === 'tie' ? '#334155' : '#16a34a'}`,
        }}>
          <p style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: 700,
            color: displayExp.winner === 'tie' ? '#94a3b8' : '#4ade80' }}>
            {displayExp.winner === 'tie' ? '🤝 Tie' : `🏆 Winner: Variant ${displayExp.winner}`}
          </p>
          {(result?.recommendation || displayExp.recommendation) && (
            <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', lineHeight: 1.5 }}>
              {result?.recommendation || displayExp.recommendation}
            </p>
          )}
        </div>
      )}

      {error && (
        <p style={{ margin: '0 0 8px', fontSize: '11px', color: '#f87171' }}>⚠ {error}</p>
      )}

      {exp.status === 'running' && !result && (
        <button
          onClick={handleConclude}
          disabled={concluding}
          style={{
            width: '100%', padding: '8px', borderRadius: '7px', fontWeight: 700,
            fontSize: '12px', cursor: concluding ? 'wait' : 'pointer',
            background: '#1e1b4b', color: '#a5b4fc', border: '1px solid #4338ca',
            opacity: concluding ? 0.6 : 1,
          }}
        >
          {concluding ? '⏳ Computing…' : '🏁 Conclude Experiment'}
        </button>
      )}
    </div>
  );
});

// ── Strategy card ─────────────────────────────────────────────

const StrategyCard = memo(function StrategyCard({ strategy, onUpdated }) {
  const [stepsOpen,      setStepsOpen]      = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(strategy.status);
  const [notes,          setNotes]          = useState('');
  const [updating,       setUpdating]       = useState(false);
  const [updateError,    setUpdateError]    = useState(null);

  const rec = strategy.recommendation || {};
  const steps = Array.isArray(strategy.implementation_steps)
    ? strategy.implementation_steps
    : [];

  const handleUpdateStatus = async () => {
    if (selectedStatus === strategy.status) return;
    setUpdating(true);
    setUpdateError(null);
    try {
      await apiFetch(`/api/monetize/strategy/${strategy.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: selectedStatus, notes: notes || null }),
      });
      onUpdated?.();
    } catch (err) {
      setUpdateError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const nextStatuses = {
    suggested:   ['testing', 'rejected'],
    testing:     ['implemented', 'rejected'],
    implemented: [],
    rejected:    [],
  };
  const allowedNext = nextStatuses[strategy.status] || [];

  return (
    <div style={{ ...S.block, marginBottom: '12px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <Badge styleMap={STRATEGY_TYPE_STYLE} value={strategy.strategy_type} />
          <span style={{
            padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700,
            background: '#1e293b', color: '#94a3b8', border: '1px solid #334155',
          }}>
            {strategy.confidence_score}% confidence
          </span>
        </div>
        <Badge styleMap={STATUS_STYLE} value={strategy.status} />
      </div>

      {/* Current issue */}
      {rec.current_issue && (
        <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
          <span style={{ color: '#f87171', fontWeight: 600 }}>Issue: </span>{rec.current_issue || strategy.current_model}
        </p>
      )}

      {/* Key recommendation */}
      <div style={{
        padding: '10px 14px', borderRadius: '8px', marginBottom: '8px',
        background: '#0a0e1a', border: '1px solid #334155',
      }}>
        <p style={{ ...S.label, marginBottom: '6px' }}>Recommendation</p>
        {strategy.strategy_type === 'pricing' && rec.model && (
          <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#f1f5f9', fontWeight: 600 }}>
            {rec.model} — {fmt(rec.suggested_price)} {rec.currency || 'INR'}
          </p>
        )}
        {strategy.strategy_type === 'upsell' && rec.upsell_offer && (
          <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#f1f5f9', fontWeight: 600 }}>
            {rec.upsell_offer}
          </p>
        )}
        {strategy.strategy_type === 'trial' && rec.trial_days && (
          <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#f1f5f9', fontWeight: 600 }}>
            {rec.trial_days}-day trial · Conversion email on day {rec.conversion_email_day || 7}
          </p>
        )}
        {strategy.strategy_type === 'freemium' && rec.conversion_trigger && (
          <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#f1f5f9', fontWeight: 600 }}>
            Trigger: {rec.conversion_trigger}
          </p>
        )}
        {rec.rationale && (
          <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#64748b', lineHeight: 1.5 }}>
            {rec.rationale}
          </p>
        )}
      </div>

      {/* Impact */}
      {strategy.potential_impact && (
        <span style={{
          display: 'inline-block', padding: '3px 10px', borderRadius: '999px',
          fontSize: '11px', fontWeight: 700, marginBottom: '10px',
          background: '#052e16', color: '#4ade80', border: '1px solid #16a34a',
        }}>
          📈 {strategy.potential_impact}
        </span>
      )}

      {/* Implementation steps */}
      {steps.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <button
            onClick={() => setStepsOpen(o => !o)}
            style={{
              background: 'none', border: 'none', color: '#64748b', cursor: 'pointer',
              fontSize: '11px', fontWeight: 700, padding: 0, marginBottom: '6px',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}
          >
            {stepsOpen ? '▼' : '▶'} Steps ({steps.length})
          </button>
          {stepsOpen && (
            <ol style={{ margin: 0, padding: '0 0 0 18px' }}>
              {steps.map((step, i) => (
                <li key={i} style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px', lineHeight: 1.5 }}>
                  {step}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {/* Status update */}
      {allowedNext.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            style={{
              ...S.input, width: 'auto', flex: 1, minWidth: '120px',
              padding: '6px 10px', cursor: 'pointer',
            }}
          >
            <option value={strategy.status}>{strategy.status}</option>
            {allowedNext.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input
            type="text"
            placeholder="Notes (optional)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            style={{ ...S.input, flex: 2, padding: '6px 10px' }}
          />
          <button
            onClick={handleUpdateStatus}
            disabled={updating || selectedStatus === strategy.status}
            style={{
              padding: '7px 14px', borderRadius: '7px', fontWeight: 700,
              fontSize: '12px', cursor: updating ? 'wait' : 'pointer',
              background: '#0c1a3a', color: '#60a5fa', border: '1px solid #2563eb',
              opacity: updating || selectedStatus === strategy.status ? 0.5 : 1,
            }}
          >
            {updating ? '…' : 'Update'}
          </button>
        </div>
      )}
      {updateError && (
        <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#f87171' }}>⚠ {updateError}</p>
      )}
    </div>
  );
});

// ── Main Panel ────────────────────────────────────────────────

const FILTER_TABS = ['all', 'pricing', 'freemium', 'upsell', 'trial'];

const MonetizationPanel = memo(function MonetizationPanel({ tools = [] }) {
  const [selectedToolId,  setSelectedToolId]  = useState('');
  const [analyzing,       setAnalyzing]       = useState(false);
  const [analysisError,   setAnalysisError]   = useState(null);
  const [analysisResult,  setAnalysisResult]  = useState(null);

  const [strategies,      setStrategies]      = useState([]);
  const [stratLoading,    setStratLoading]    = useState(false);
  const [filterTab,       setFilterTab]       = useState('all');

  const [experiments,     setExperiments]     = useState([]);
  const [expLoading,      setExpLoading]      = useState(false);

  // New experiment form state
  const [expName,         setExpName]         = useState('');
  const [priceA,          setPriceA]          = useState('');
  const [priceB,          setPriceB]          = useState('');
  const [labelA,          setLabelA]          = useState('Control');
  const [labelB,          setLabelB]          = useState('Test');
  const [creatingExp,     setCreatingExp]     = useState(false);
  const [expError,        setExpError]        = useState(null);

  const liveTools = tools.filter(t => t.status === 'live' || t.status === 'scaling');

  // Auto-select first live tool
  useEffect(() => {
    if (liveTools.length > 0 && !selectedToolId) {
      setSelectedToolId(liveTools[0].id);
    }
  }, [liveTools.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchStrategies = useCallback(async (toolId) => {
    if (!toolId) return;
    setStratLoading(true);
    try {
      const res = await apiFetch(`/api/monetize/strategies/${toolId}`);
      setStrategies(res.data || []);
    } catch { setStrategies([]); }
    finally   { setStratLoading(false); }
  }, []);

  const fetchExperiments = useCallback(async (toolId) => {
    if (!toolId) return;
    setExpLoading(true);
    try {
      const res = await apiFetch(`/api/monetize/experiments/${toolId}`);
      setExperiments(res.data || []);
    } catch { setExperiments([]); }
    finally   { setExpLoading(false); }
  }, []);

  useEffect(() => {
    if (selectedToolId) {
      fetchStrategies(selectedToolId);
      fetchExperiments(selectedToolId);
      setAnalysisResult(null);
    }
  }, [selectedToolId, fetchStrategies, fetchExperiments]);

  const handleAnalyze = useCallback(async () => {
    if (!selectedToolId) return;
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const res = await apiFetch(`/api/monetize/analyze/${selectedToolId}`, { method: 'POST' });
      setAnalysisResult(res.data);
      await fetchStrategies(selectedToolId);
    } catch (err) {
      setAnalysisError(err.message || 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  }, [selectedToolId, fetchStrategies]);

  const handleCreateExperiment = useCallback(async () => {
    if (!selectedToolId || !expName || !priceA || !priceB) return;
    setCreatingExp(true);
    setExpError(null);
    try {
      await apiFetch('/api/monetize/experiment', {
        method: 'POST',
        body: JSON.stringify({
          tool_id:         selectedToolId,
          experiment_name: expName,
          variant_a_price: parseFloat(priceA),
          variant_b_price: parseFloat(priceB),
          variant_a_label: labelA || 'Control',
          variant_b_label: labelB || 'Test',
        }),
      });
      setExpName(''); setPriceA(''); setPriceB('');
      setLabelA('Control'); setLabelB('Test');
      await fetchExperiments(selectedToolId);
    } catch (err) {
      setExpError(err.message || 'Failed to create experiment');
    } finally {
      setCreatingExp(false);
    }
  }, [selectedToolId, expName, priceA, priceB, labelA, labelB, fetchExperiments]);

  const filteredStrategies = filterTab === 'all'
    ? strategies
    : strategies.filter(s => s.strategy_type === filterTab);

  const selectedTool = liveTools.find(t => t.id === selectedToolId);

  return (
    <section style={S.card}>
      {/* ── Header ────────────────────────────────────────── */}
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid #334155',
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', flexWrap: 'wrap', gap: '12px',
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#f1f5f9' }}>
            💰 Monetization Intelligence
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
            AI pricing strategies and A/B experiments
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Tool selector */}
          <select
            value={selectedToolId}
            onChange={e => setSelectedToolId(e.target.value)}
            style={{ ...S.input, width: 'auto', padding: '7px 12px', cursor: 'pointer' }}
          >
            {liveTools.length === 0
              ? <option value="">No live tools</option>
              : liveTools.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))
            }
          </select>

          {/* Analyze button */}
          <button
            onClick={handleAnalyze}
            disabled={analyzing || !selectedToolId}
            style={{
              padding: '8px 18px', borderRadius: '8px', fontWeight: 700,
              fontSize: '13px', cursor: analyzing || !selectedToolId ? 'not-allowed' : 'pointer',
              background: '#4338ca', color: '#e0e7ff', border: '1px solid #6366f1',
              opacity: analyzing || !selectedToolId ? 0.6 : 1,
              display: 'inline-flex', alignItems: 'center', gap: '6px',
            }}
          >
            {analyzing ? '⏳ Analyzing…' : '🤖 Analyze Monetization'}
          </button>
        </div>
      </div>

      {/* ── Empty state ────────────────────────────────────── */}
      {liveTools.length === 0 && (
        <div style={{ padding: '48px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>💰</div>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px', fontWeight: 600 }}>
            No live tools found
          </p>
          <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '12px' }}>
            No monetization data — launch a tool first, then run analysis.
          </p>
        </div>
      )}

      {liveTools.length > 0 && (
        <div style={{ padding: '20px' }}>
          {/* ── Analysis error ─────────────────────────────── */}
          {analysisError && (
            <div style={{
              padding: '12px 16px', borderRadius: '8px', marginBottom: '16px',
              background: '#2d0808', border: '1px solid #7f1d1d',
            }}>
              <p style={{ margin: 0, fontSize: '12px', color: '#f87171' }}>⚠ {analysisError}</p>
            </div>
          )}

          {/* ── Revenue score card ─────────────────────────── */}
          {analysisResult && (
            <div style={{
              ...S.block,
              display: 'flex', gap: '20px', alignItems: 'center',
              flexWrap: 'wrap', marginBottom: '20px',
              border: '1px solid #334155',
            }}>
              <div style={{ textAlign: 'center', minWidth: '80px' }}>
                <p style={{ margin: 0, fontSize: '48px', fontWeight: 800,
                  color: scoreColor(analysisResult.revenue_score), lineHeight: 1 }}>
                  {analysisResult.revenue_score}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#64748b',
                  textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Revenue Score
                </p>
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                {analysisResult.quick_revenue_win && (
                  <div style={{ marginBottom: '8px' }}>
                    <p style={S.label}>Quick Win</p>
                    <p style={{ margin: 0, fontSize: '13px', color: '#4ade80', lineHeight: 1.5, fontWeight: 600 }}>
                      ⚡ {analysisResult.quick_revenue_win}
                    </p>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <div>
                    <p style={S.label}>Total Revenue</p>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#f1f5f9' }}>
                      {fmt(analysisResult.current_revenue)}
                    </p>
                  </div>
                  <div>
                    <p style={S.label}>Avg Order</p>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#f1f5f9' }}>
                      {fmt(analysisResult.avg_order_value)}
                    </p>
                  </div>
                  {analysisResult.top_priority && (
                    <div>
                      <p style={S.label}>Top Priority</p>
                      <Badge styleMap={STRATEGY_TYPE_STYLE} value={analysisResult.top_priority} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Two column layout ──────────────────────────── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '20px',
            alignItems: 'start',
          }}>
            {/* ── LEFT: Strategy cards ──────────────────────── */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#94a3b8',
                  textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Strategies
                </h3>
                {strategies.length > 0 && (
                  <span style={{
                    padding: '2px 8px', borderRadius: '999px', fontSize: '11px',
                    background: '#0f172a', color: '#64748b', border: '1px solid #334155',
                  }}>
                    {strategies.length}
                  </span>
                )}
              </div>

              {/* Filter tabs */}
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '14px' }}>
                {FILTER_TABS.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setFilterTab(tab)}
                    style={{
                      padding: '4px 10px', borderRadius: '6px', fontSize: '11px',
                      fontWeight: 600, cursor: 'pointer', border: 'none',
                      background: filterTab === tab ? '#4338ca' : '#1e293b',
                      color: filterTab === tab ? '#e0e7ff' : '#64748b',
                      textTransform: 'capitalize',
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {stratLoading ? (
                <>
                  <Skeleton w={100} h={90} mb={10} />
                  <Skeleton w={100} h={90} mb={10} />
                </>
              ) : filteredStrategies.length === 0 ? (
                <div style={{ ...S.block, textAlign: 'center', padding: '28px 16px' }}>
                  <p style={{ margin: 0, color: '#475569', fontSize: '13px' }}>
                    {strategies.length === 0
                      ? 'No strategies yet — run analysis to generate recommendations.'
                      : `No ${filterTab} strategies found.`}
                  </p>
                </div>
              ) : (
                filteredStrategies.map(s => (
                  <StrategyCard
                    key={s.id}
                    strategy={s}
                    onUpdated={() => fetchStrategies(selectedToolId)}
                  />
                ))
              )}
            </div>

            {/* ── RIGHT: A/B Experiments ─────────────────────── */}
            <div>
              <h3 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700, color: '#94a3b8',
                textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                ⚗️ Pricing Experiments
              </h3>

              {/* New experiment form */}
              <div style={{ ...S.block, marginBottom: '14px' }}>
                <p style={{ ...S.label, marginBottom: '12px' }}>New A/B Experiment</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Experiment name"
                    value={expName}
                    onChange={e => setExpName(e.target.value)}
                    style={S.input}
                  />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <p style={{ ...S.label, marginBottom: '4px' }}>Variant A (₹)</p>
                      <input
                        type="number"
                        placeholder="Control price"
                        value={priceA}
                        onChange={e => setPriceA(e.target.value)}
                        min="1"
                        style={S.input}
                      />
                    </div>
                    <div>
                      <p style={{ ...S.label, marginBottom: '4px' }}>Variant B (₹)</p>
                      <input
                        type="number"
                        placeholder="Test price"
                        value={priceB}
                        onChange={e => setPriceB(e.target.value)}
                        min="1"
                        style={S.input}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="Label A (e.g. Control)"
                      value={labelA}
                      onChange={e => setLabelA(e.target.value)}
                      style={S.input}
                    />
                    <input
                      type="text"
                      placeholder="Label B (e.g. Test)"
                      value={labelB}
                      onChange={e => setLabelB(e.target.value)}
                      style={S.input}
                    />
                  </div>

                  {expError && (
                    <p style={{ margin: 0, fontSize: '11px', color: '#f87171' }}>⚠ {expError}</p>
                  )}

                  <button
                    onClick={handleCreateExperiment}
                    disabled={creatingExp || !expName || !priceA || !priceB}
                    style={{
                      padding: '8px', borderRadius: '7px', fontWeight: 700,
                      fontSize: '12px',
                      cursor: creatingExp || !expName || !priceA || !priceB ? 'not-allowed' : 'pointer',
                      background: '#052e16', color: '#4ade80', border: '1px solid #16a34a',
                      opacity: creatingExp || !expName || !priceA || !priceB ? 0.5 : 1,
                    }}
                  >
                    {creatingExp ? '⏳ Creating…' : '+ Start Experiment'}
                  </button>
                </div>
              </div>

              {/* Experiment list */}
              {expLoading ? (
                <>
                  <Skeleton w={100} h={100} mb={10} />
                  <Skeleton w={100} h={100} mb={10} />
                </>
              ) : experiments.length === 0 ? (
                <div style={{ ...S.block, textAlign: 'center', padding: '20px 16px' }}>
                  <p style={{ margin: 0, color: '#475569', fontSize: '12px' }}>
                    No experiments yet. Create one above.
                  </p>
                </div>
              ) : (
                experiments.map(exp => (
                  <ExperimentCard
                    key={exp.id}
                    exp={exp}
                    onConclude={() => fetchExperiments(selectedToolId)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
});

export default MonetizationPanel;
