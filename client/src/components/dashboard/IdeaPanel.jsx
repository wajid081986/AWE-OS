import { useState, useEffect, useCallback, memo } from 'react';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://awe-os.onrender.com';

function getToken() {
  return localStorage.getItem('awe_token');
}

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
    err.code   = data.code || 'API_ERROR';
    err.status = res.status;
    throw err;
  }
  return data;
}

// ── Helpers ───────────────────────────────────────────────────

function nextCronHours() {
  const now  = new Date();
  const h    = now.getHours();
  const m    = now.getMinutes();
  // cron fires at 0 and 12
  if (h < 12) return `~${12 - h}h`;
  const remaining = 24 - h;
  if (remaining === 0 && m > 0) return '~12h';
  return `~${remaining}h`;
}

function scoreBadgeStyle(score) {
  if (score >= 80) return { bg: '#052e16', color: '#4ade80', border: '#16a34a' };
  if (score >= 60) return { bg: '#1c1200', color: '#fbbf24', border: '#d97706' };
  return { bg: '#1e293b', color: '#94a3b8', border: '#334155' };
}

function scorePrefix(score) {
  return score >= 80 ? '⭐ ' : '';
}

const MONETIZATION_STYLE = {
  freemium:     { bg: '#0c1a3a', color: '#60a5fa', border: '#2563eb' },
  paid:         { bg: '#052e16', color: '#4ade80', border: '#16a34a' },
  subscription: { bg: '#1a0533', color: '#c084fc', border: '#7c3aed' },
};

const COMPLEXITY_STYLE = {
  low:    { bg: '#052e16', color: '#4ade80', border: '#16a34a' },
  medium: { bg: '#1c1200', color: '#fbbf24', border: '#d97706' },
  high:   { bg: '#2d0808', color: '#f87171', border: '#dc2626' },
};

function SmallBadge({ text, styleMap, value }) {
  const s = (styleMap && styleMap[value]) || { bg: '#1e293b', color: '#94a3b8', border: '#334155' };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: '999px',
      fontSize: '10px', fontWeight: 700,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      textTransform: 'capitalize',
    }}>
      {text || value}
    </span>
  );
}

// ── Skeleton card ─────────────────────────────────────────────

function SkeletonCard() {
  const bar = (w, mb = 8) => ({
    height: '11px', width: `${w}%`, borderRadius: '4px', marginBottom: `${mb}px`,
    background: 'linear-gradient(90deg,#1e293b 25%,#334155 50%,#1e293b 75%)',
    backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
  });
  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px' }}>
      <div style={bar(55, 10)} />
      <div style={bar(85, 6)} />
      <div style={bar(70, 6)} />
      <div style={bar(40, 14)} />
      <div style={{ display: 'flex', gap: '8px' }}>
        <div style={{ ...bar(30, 0), height: '28px', borderRadius: '6px' }} />
        <div style={{ ...bar(20, 0), height: '28px', borderRadius: '6px' }} />
      </div>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────

function Toast({ message, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
      background: '#052e16', border: '1px solid #16a34a', borderRadius: '8px',
      padding: '12px 20px', color: '#4ade80', fontSize: '13px', fontWeight: 600,
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    }}>
      {message}
    </div>
  );
}

// ── Idea Card ─────────────────────────────────────────────────

const IdeaCard = memo(function IdeaCard({ idea, onApprove, onIgnore }) {
  const [approving, setApproving] = useState(false);
  const [ignoring,  setIgnoring]  = useState(false);
  const [cardError, setCardError] = useState(null);

  const meta        = idea.idea_metadata || {};
  const scoreStyle  = scoreBadgeStyle(idea.idea_score || 0);

  async function handleApprove() {
    setApproving(true);
    setCardError(null);
    try {
      await onApprove(idea.id);
    } catch (err) {
      setCardError(err.message || 'Approval failed');
      setApproving(false);
    }
  }

  async function handleIgnore() {
    setIgnoring(true);
    setCardError(null);
    try {
      await onIgnore(idea.id);
    } catch (err) {
      setCardError(err.message || 'Failed to ignore');
      setIgnoring(false);
    }
  }

  return (
    <div style={{
      background: '#0f172a', border: '1px solid #1e293b',
      borderRadius: '10px', padding: '16px',
      display: 'flex', flexDirection: 'column', gap: '10px',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <span style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', lineHeight: 1.3 }}>
          {idea.name}
        </span>
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span style={{
            padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700,
            background: scoreStyle.bg, color: scoreStyle.color, border: `1px solid ${scoreStyle.border}`,
            whiteSpace: 'nowrap',
          }}>
            {scorePrefix(idea.idea_score || 0)}{idea.idea_score || 0}
          </span>
          <span style={{
            padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 700,
            background: '#1e1b4b', color: '#a5b4fc', border: '1px solid #4338ca',
          }}>
            🤖 AI
          </span>
        </div>
      </div>

      {/* Description */}
      <p style={{
        margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: 1.5,
        overflow: 'hidden', display: '-webkit-box',
        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
      }}>
        {idea.description}
      </p>

      {/* Problem */}
      {meta.problem_solved && (
        <p style={{ margin: 0, fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>
          <span style={{ color: '#475569' }}>Problem: </span>{meta.problem_solved}
        </p>
      )}

      {/* Badges */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {meta.monetization && (
          <SmallBadge
            text={meta.monetization}
            styleMap={MONETIZATION_STYLE}
            value={meta.monetization}
          />
        )}
        {meta.complexity && (
          <SmallBadge
            text={meta.complexity}
            styleMap={COMPLEXITY_STYLE}
            value={meta.complexity}
          />
        )}
      </div>

      {/* Card error */}
      {cardError && (
        <p style={{ margin: 0, fontSize: '11px', color: '#f87171' }}>{cardError}</p>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
        <button
          onClick={handleApprove}
          disabled={approving || ignoring}
          style={{
            flex: 1, padding: '7px 12px', borderRadius: '7px', fontWeight: 700,
            fontSize: '12px', cursor: approving ? 'wait' : 'pointer',
            background: approving ? '#14532d' : '#15803d',
            color: '#dcfce7', border: '1px solid #16a34a',
            opacity: approving || ignoring ? 0.7 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {approving ? '⏳ Approving…' : '✅ Approve & Build'}
        </button>
        <button
          onClick={handleIgnore}
          disabled={approving || ignoring}
          style={{
            padding: '7px 12px', borderRadius: '7px', fontWeight: 600,
            fontSize: '12px', cursor: ignoring ? 'wait' : 'pointer',
            background: '#1e293b', color: '#64748b', border: '1px solid #334155',
            opacity: approving || ignoring ? 0.5 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {ignoring ? '…' : '❌ Ignore'}
        </button>
      </div>
    </div>
  );
});

// ── Main Panel ────────────────────────────────────────────────

const IdeaPanel = memo(function IdeaPanel() {
  const [ideas,      setIdeas]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [generating, setGenerating] = useState(false);
  const [toast,      setToast]      = useState(null);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/ideas/pending');
      setIdeas(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load ideas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const handleGenerateNow = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      await apiFetch('/api/ideas/generate', { method: 'POST', body: JSON.stringify({}) });
      await fetchPending();
      setToast('Ideas generated!');
    } catch (err) {
      setError(err.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }, [fetchPending]);

  const handleApprove = useCallback(async (tool_id) => {
    await apiFetch('/api/ideas/approve', {
      method: 'POST',
      body: JSON.stringify({ tool_id }),
    });
    setIdeas(prev => prev.filter(i => i.id !== tool_id));
    setToast('Moving to build queue!');
  }, []);

  const handleIgnore = useCallback(async (tool_id) => {
    await apiFetch('/api/ideas/ignore', {
      method: 'POST',
      body: JSON.stringify({ tool_id }),
    });
    setIdeas(prev => prev.filter(i => i.id !== tool_id));
  }, []);

  return (
    <section style={{
      background: '#1e293b', border: '1px solid #334155',
      borderRadius: '12px', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '10px',
        padding: '16px 20px', borderBottom: '1px solid #334155',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#f1f5f9' }}>
              🤖 AI Generated Ideas
            </h2>
            {!loading && (
              <span style={{
                padding: '2px 10px', borderRadius: '999px', fontSize: '11px',
                fontWeight: 700, background: '#0f172a', color: '#94a3b8', border: '1px solid #334155',
              }}>
                {ideas.length}
              </span>
            )}
          </div>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
            Review and approve tools to build
          </p>
        </div>
        <button
          onClick={fetchPending}
          disabled={loading}
          style={{
            padding: '7px 14px', borderRadius: '8px', fontWeight: 600,
            fontSize: '12px', cursor: loading ? 'wait' : 'pointer',
            background: '#1e293b', color: '#94a3b8', border: '1px solid #334155',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? '⟳ Loading…' : '🔄 Refresh'}
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '20px' }}>
        {/* Error state */}
        {error && !loading && (
          <div style={{
            padding: '14px 16px', background: '#2d0808', border: '1px solid #7f1d1d',
            borderRadius: '8px', marginBottom: '16px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: '12px', color: '#f87171' }}>⚠ {error}</span>
            <button
              onClick={fetchPending}
              style={{
                padding: '4px 10px', borderRadius: '6px', fontSize: '11px',
                background: '#7f1d1d', color: '#fca5a5', border: '1px solid #991b1b',
                cursor: 'pointer', fontWeight: 600,
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div style={{
            display: 'grid', gap: '14px',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          }}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && ideas.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🤖</div>
            <p style={{ margin: '0 0 4px', color: '#94a3b8', fontSize: '14px', fontWeight: 600 }}>
              No pending ideas
            </p>
            <p style={{ margin: '0 0 20px', color: '#475569', fontSize: '12px' }}>
              Next AI run in {nextCronHours()}
            </p>
            <button
              onClick={handleGenerateNow}
              disabled={generating}
              style={{
                padding: '9px 20px', borderRadius: '8px', fontWeight: 700,
                fontSize: '13px', cursor: generating ? 'wait' : 'pointer',
                background: '#4338ca', color: '#e0e7ff', border: '1px solid #6366f1',
                opacity: generating ? 0.7 : 1,
              }}
            >
              {generating ? '⏳ Generating…' : '▶ Generate Now'}
            </button>
          </div>
        )}

        {/* Idea cards grid */}
        {!loading && ideas.length > 0 && (
          <div style={{
            display: 'grid', gap: '14px',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          }}>
            {ideas.map(idea => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                onApprove={handleApprove}
                onIgnore={handleIgnore}
              />
            ))}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </section>
  );
});

export default IdeaPanel;
