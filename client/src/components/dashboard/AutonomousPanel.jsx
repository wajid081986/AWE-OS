import { useState, useEffect, useCallback, memo } from 'react';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://awe-os.onrender.com';
const DAILY_LIMIT = 10;
const REFRESH_INTERVAL = 30_000;

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
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) throw new Error('Unexpected server response');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ── Time helpers ──────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function nextRunIn(runsToday) {
  const h = new Date().getHours();
  const nextHour = [0, 6, 12, 18].find(x => x > h) ?? 24;
  const diffH = nextHour - h;
  return `~${diffH}h`;
}

// ── Badge config ──────────────────────────────────────────────
const ACTION_BADGE = {
  plan_generated:       { bg: '#0c1a3a', color: '#60a5fa', border: '#2563eb', label: 'Plan Generated' },
  status_updated:       { bg: '#052e16', color: '#4ade80', border: '#16a34a', label: 'Status Updated' },
  kill_flagged:         { bg: '#2d0808', color: '#f87171', border: '#dc2626', label: 'Kill Flagged' },
  improvement_suggested:{ bg: '#1c1200', color: '#fbbf24', border: '#d97706', label: 'Improve' },
  observation_logged:   { bg: '#1a1a2e', color: '#94a3b8', border: '#475569', label: 'Observed' },
  already_planned:      { bg: '#1a1a2e', color: '#94a3b8', border: '#475569', label: 'Already Planned' },
  error:                { bg: '#2d0808', color: '#f87171', border: '#dc2626', label: 'Error' },
  skipped:              { bg: '#1e293b', color: '#64748b', border: '#334155', label: 'Skipped' },
};

function ActionBadge({ action }) {
  const s = ACTION_BADGE[action] || { bg: '#1e293b', color: '#94a3b8', border: '#334155', label: action };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: '999px',
      fontSize: '11px', fontWeight: 700, background: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
    }}>
      {s.label}
    </span>
  );
}

function SkeletonRow() {
  const bar = (w) => ({
    height: '10px', width: `${w}%`, borderRadius: '4px',
    background: 'linear-gradient(90deg,#1e293b 25%,#334155 50%,#1e293b 75%)',
    backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
  });
  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center',
                  padding: '10px 0', borderBottom: '1px solid #0f172a' }}>
      <div style={bar(12)} />
      <div style={bar(18)} />
      <div style={bar(14)} />
      <div style={bar(30)} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
const AutonomousPanel = memo(function AutonomousPanel() {
  const [lastRun,    setLastRun]    = useState(null);
  const [logs,       setLogs]       = useState([]);
  const [running,    setRunning]    = useState(false);
  const [isActive,   setIsActive]   = useState(false);
  const [runsToday,  setRunsToday]  = useState(0);
  const [runResult,  setRunResult]  = useState(null);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [error,      setError]      = useState(null);

  const fetchLastRun = useCallback(async () => {
    try {
      const res = await apiFetch('/api/autonomous/last-run');
      const d = res.data;
      setLastRun(d.last_run);
      setIsActive(d.is_running);
      setRunsToday(d.runs_today ?? 0);
    } catch (err) {
      // non-critical: panel still shows even without last-run data
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const res = await apiFetch('/api/autonomous/logs?limit=20');
      setLogs(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  // Initial load + auto-refresh every 30s
  useEffect(() => {
    fetchLastRun();
    fetchLogs();
    const interval = setInterval(() => {
      fetchLastRun();
      fetchLogs();
    }, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchLastRun, fetchLogs]);

  const handleRunNow = useCallback(async () => {
    if (running || isActive) return;
    setRunning(true);
    setError(null);
    setRunResult(null);
    try {
      const res = await apiFetch('/api/autonomous/run', { method: 'POST' });
      setRunResult(res.data);
      await fetchLastRun();
      await fetchLogs();
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  }, [running, isActive, fetchLastRun, fetchLogs]);

  const S = STYLES;
  const limitReached = runsToday >= DAILY_LIMIT;

  return (
    <div>
      {/* ── SECTION A — Control Panel ─────────────────────────── */}
      <section style={S.card}>
        <div style={S.cardHeader}>
          <div>
            <h2 style={S.cardTitle}>🤖 Autonomous Agent</h2>
            <p style={S.cardSub}>
              Automatically evaluates live tools and generates plans for ideas every 6 hours.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: isActive ? '#22c55e' : '#64748b',
                boxShadow: isActive ? '0 0 6px #22c55e' : 'none',
                display: 'inline-block',
              }} />
              <span style={{ fontSize: '12px', color: isActive ? '#4ade80' : '#64748b', fontWeight: 600 }}>
                {isActive ? 'Running…' : 'System Active'}
              </span>
            </div>
            {!isActive && !limitReached && (
              <span style={{ fontSize: '11px', color: '#475569' }}>
                Next run in {nextRunIn(runsToday)}
              </span>
            )}
            {limitReached && (
              <span style={{ fontSize: '11px', color: '#f87171' }}>
                Daily limit reached ({runsToday}/{DAILY_LIMIT})
              </span>
            )}
          </div>
        </div>

        {/* Run button */}
        <div style={{ padding: '14px 20px', display: 'flex', gap: '12px',
                      alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handleRunNow}
            disabled={running || isActive || limitReached}
            style={{
              ...S.btnPrimary,
              opacity: (running || isActive || limitReached) ? 0.5 : 1,
              cursor:  (running || isActive || limitReached) ? 'not-allowed' : 'pointer',
            }}
          >
            {running
              ? <><span style={S.spinner} />Autonomous loop running…</>
              : '▶ Run Now'}
          </button>
          <span style={{ fontSize: '12px', color: '#475569' }}>
            Runs today: {runsToday} / {DAILY_LIMIT}
          </span>
        </div>

        {/* Error */}
        {error && (
          <div style={{ margin: '0 20px 14px', padding: '10px 14px',
            background: '#2d0808', border: '1px solid #7f1d1d',
            borderRadius: '8px', color: '#f87171', fontSize: '13px' }}>
            ⚠ {error}
          </div>
        )}

        {/* Run result summary */}
        {runResult && (
          <div style={{ margin: '0 20px 16px' }}>
            <div style={{ padding: '12px 16px', background: '#052e16',
              border: '1px solid #14532d', borderRadius: '8px', marginBottom: '12px' }}>
              <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#4ade80', fontWeight: 700 }}>
                ✓ Run complete in {runResult.duration_ms}ms
              </p>
              <p style={{ margin: 0, fontSize: '12px', color: '#86efac' }}>
                {runResult.tools_processed} processed · {runResult.tools_skipped} skipped
              </p>
            </div>

            {/* SECTION C — Summary Cards */}
            <div style={{ display: 'grid', gap: '10px',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
              {[
                { label: 'Plans Generated', value: runResult.actions_taken?.plans_generated ?? 0, color: '#60a5fa' },
                { label: 'Scaled',          value: runResult.actions_taken?.scaled            ?? 0, color: '#4ade80' },
                { label: 'Kill Flagged',    value: runResult.actions_taken?.kill_flagged       ?? 0, color: '#f87171' },
                { label: 'Observed',        value: runResult.actions_taken?.observed           ?? 0, color: '#94a3b8' },
              ].map(c => (
                <div key={c.label} style={{
                  background: '#0f172a', border: '1px solid #1e293b',
                  borderRadius: '8px', padding: '12px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                }}>
                  <span style={{ fontSize: '22px', fontWeight: 800, color: c.color }}>{c.value}</span>
                  <span style={{ fontSize: '10px', color: '#64748b', textAlign: 'center',
                                 fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {c.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── SECTION B — Activity Feed ─────────────────────────── */}
      <section style={S.card}>
        <div style={S.cardHeader}>
          <h2 style={S.cardTitle}>Activity Feed</h2>
          <span style={S.badgeCount}>{logs.length} entries</span>
        </div>

        <div style={{ padding: '0 20px 16px' }}>
          {loadingLogs ? (
            <>
              {[1,2,3,4,5].map(i => <SkeletonRow key={i} />)}
            </>
          ) : logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#475569' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🤖</div>
              <p style={{ margin: 0, fontSize: '14px' }}>No activity yet. Run the autonomous loop to start.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155' }}>
                    {['When', 'Tool', 'Action', 'Decision', 'Auto Executed'].map(h => (
                      <th key={h} style={{
                        padding: '8px 10px', textAlign: 'left', color: '#64748b',
                        fontWeight: 700, fontSize: '11px', textTransform: 'uppercase',
                        letterSpacing: '0.06em', whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #0f172a' }}>
                      <td style={{ padding: '9px 10px', color: '#475569', whiteSpace: 'nowrap' }}>
                        {timeAgo(log.created_at)}
                      </td>
                      <td style={{ padding: '9px 10px', color: '#cbd5e1',
                                   maxWidth: '140px', overflow: 'hidden',
                                   textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.tool_name || '—'}
                      </td>
                      <td style={{ padding: '9px 10px' }}>
                        <ActionBadge action={log.action} />
                      </td>
                      <td style={{ padding: '9px 10px', color: '#94a3b8',
                                   textTransform: 'capitalize' }}>
                        {log.decision || '—'}
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                        {log.is_auto_executed
                          ? <span title="Auto-executed by system">✅</span>
                          : <span title="Requires human review">👤</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
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
    flexWrap: 'wrap', gap: '10px',
    padding: '16px 20px', borderBottom: '1px solid #334155',
  },
  cardTitle: { margin: 0, fontSize: '15px', fontWeight: 700, color: '#f1f5f9' },
  cardSub:   { margin: '2px 0 0', fontSize: '12px', color: '#64748b' },
  badgeCount: {
    padding: '2px 10px', borderRadius: '999px', fontSize: '11px',
    fontWeight: 700, background: '#0f172a', color: '#94a3b8', border: '1px solid #334155',
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

export default AutonomousPanel;
