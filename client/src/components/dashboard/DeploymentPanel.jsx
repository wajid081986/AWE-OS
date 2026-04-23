import { useState, useCallback, useEffect } from 'react';

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
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ── Helpers ───────────────────────────────────────────────────

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

function fmtDuration(ms) {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function StatusDot({ status }) {
  const color = status === 'healthy' ? '#22c55e' : status === 'degraded' ? '#eab308' : '#ef4444';
  const isPulse = status === 'down';
  return (
    <span style={{
      display: 'inline-block',
      width: 10, height: 10,
      borderRadius: '50%',
      backgroundColor: color,
      marginRight: 6,
      boxShadow: isPulse ? `0 0 0 3px ${color}40` : 'none',
      animation: isPulse ? 'pulse 1.5s infinite' : 'none',
    }} />
  );
}

function StatusBadge({ status }) {
  const cfg = {
    success:     { bg: '#052e16', color: '#4ade80', label: '✅ success' },
    failed:      { bg: '#450a0a', color: '#f87171', label: '❌ failed' },
    rolled_back: { bg: '#431407', color: '#fb923c', label: '↩ rolled back' },
    pending:     { bg: '#1c1c1c', color: '#9ca3af', label: '⏳ pending' },
    validating:  { bg: '#0c1a3a', color: '#60a5fa', label: '🔍 validating' },
    deploying:   { bg: '#1a1a3a', color: '#a78bfa', label: '🚀 deploying' },
    verifying:   { bg: '#1a2a1a', color: '#6ee7b7', label: '🔎 verifying' },
  };
  const c = cfg[status] || cfg.pending;
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px', borderRadius: 4,
      background: c.bg, color: c.color,
      fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      {c.label}
    </span>
  );
}

function CheckRow({ check }) {
  const icon = check.status === 'pass' ? '✅'
    : check.status === 'fail' ? '❌'
    : check.status === 'warning' ? '⚠️'
    : '⏭';
  return (
    <tr style={{ borderBottom: '1px solid #1f2937' }}>
      <td style={TD}>{icon} {check.name || check.check_name}</td>
      <td style={TD}>{check.message || '—'}</td>
      <td style={{ ...TD, color: '#6b7280', fontSize: 11 }}>{check.fix_suggestion || check.fix || '—'}</td>
    </tr>
  );
}

const DEPLOY_STEPS = {
  backend: [
    'git add .',
    'git commit -m "your message"',
    'git push origin main',
    'Wait for Render auto-deploy (2–3 min)',
    'Click ✅ Verify Deployment below',
  ],
  frontend: [
    'git add client/',
    'git commit -m "your message"',
    'git push origin main',
    'Wait for Vercel auto-deploy (1–2 min)',
    'Click ✅ Verify Deployment below',
  ],
  database: [
    'Open Supabase SQL Editor',
    'Paste and run your migration SQL',
    'Verify rows/columns in Table Editor',
    'Click ✅ Verify Deployment below',
  ],
  hotfix: [
    'git add -p  (stage only changed files)',
    'git commit -m "hotfix: description"',
    'git push origin main',
    'Wait for Render/Vercel auto-deploy',
    'Click ✅ Verify Deployment below',
  ],
  rollback: [
    'git log --oneline -10  (find last good commit)',
    'git revert HEAD  (or specific commit hash)',
    'git push origin main',
    'Wait for auto-deploy',
    'Click ✅ Verify Deployment below',
  ],
};

// ── Styles ────────────────────────────────────────────────────
const CARD  = { background: '#111827', border: '1px solid #1f2937', borderRadius: 8, padding: 20, marginBottom: 20 };
const TITLE = { fontSize: 16, fontWeight: 700, color: '#f9fafb', margin: '0 0 16px' };
const BTN   = (color = '#3b82f6') => ({
  padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
  background: color, color: '#fff', fontSize: 13, fontWeight: 600,
});
const TD    = { padding: '8px 10px', color: '#d1d5db', fontSize: 13, verticalAlign: 'top' };
const TH    = { padding: '8px 10px', color: '#6b7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', textAlign: 'left', borderBottom: '1px solid #1f2937' };
const SELECT_STYLE = {
  background: '#1f2937', border: '1px solid #374151', borderRadius: 6,
  color: '#f9fafb', padding: '8px 12px', fontSize: 13, cursor: 'pointer',
};

// ── Main Component ────────────────────────────────────────────

export default function DeploymentPanel() {
  const [open, setOpen] = useState(true);

  // Section A — Health
  const [health, setHealth]             = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError]   = useState(null);

  // Section B — Pre-check
  const [deployType, setDeployType]     = useState('backend');
  const [preCheck, setPreCheck]         = useState(null);
  const [preLoading, setPreLoading]     = useState(false);

  // Section C — Active deploy tracking
  const [deployId, setDeployId]         = useState(null);
  const [gitCommit, setGitCommit]       = useState('');
  const [postResult, setPostResult]     = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  // Section D — History
  const [history, setHistory]           = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedRow, setExpandedRow]   = useState(null);

  // ── SECTION A: Check Health ──────────────────────────────────

  const checkHealth = useCallback(async () => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      const res = await apiFetch('/api/deploy/health');
      setHealth(res.data);
    } catch (err) {
      setHealthError(err.message);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  // Auto-check on mount
  useEffect(() => { checkHealth(); }, [checkHealth]);

  // ── SECTION B: Pre-deploy ────────────────────────────────────

  const runPreCheck = useCallback(async () => {
    setPreLoading(true);
    setPreCheck(null);
    setPostResult(null);
    setDeployId(null);
    try {
      const res = await apiFetch('/api/deploy/pre-check', {
        method: 'POST',
        body: JSON.stringify({ deploy_type: deployType }),
      });
      setPreCheck(res.data);

      // If pre-check passes, auto-start deployment record
      if (res.data.can_deploy) {
        const startRes = await apiFetch('/api/deploy/start', {
          method: 'POST',
          body: JSON.stringify({ deploy_type: deployType, git_commit: gitCommit, notes: '' }),
        });
        if (!startRes.data.blocked) {
          setDeployId(startRes.data.deploy_id);
        }
      }
    } catch (err) {
      setPreCheck({ can_deploy: false, checks: [], blockers: [{ name: 'Request failed', message: err.message }], warnings: [] });
    } finally {
      setPreLoading(false);
    }
  }, [deployType, gitCommit]);

  // ── SECTION C: Verify deployment ────────────────────────────

  const verifyDeployment = useCallback(async () => {
    if (!deployId) return;
    setVerifyLoading(true);
    setPostResult(null);
    try {
      const res = await apiFetch('/api/deploy/complete', {
        method: 'POST',
        body: JSON.stringify({ deploy_id: deployId, success: true }),
      });
      setPostResult(res.data);
      // Reload history
      loadHistory();
    } catch (err) {
      setPostResult({ overall: 'failed', checks: [{ name: 'Verification request failed', status: 'fail', message: err.message }] });
    } finally {
      setVerifyLoading(false);
    }
  }, [deployId]);

  // ── SECTION D: History ───────────────────────────────────────

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await apiFetch('/api/deploy/history?limit=20');
      setHistory(res.data || []);
    } catch (_) {
      // silent
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // ── Render ───────────────────────────────────────────────────

  const serviceColor = (status) =>
    status === 'healthy' ? '#22c55e' : status === 'degraded' ? '#eab308' : '#ef4444';

  return (
    <section style={{ marginBottom: 24, fontFamily: 'inherit' }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .deploy-tr:hover { background: #1f2937 !important; cursor: pointer; }
      `}</style>

      {/* ── Header ──────────────────────────────────────────── */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: open ? 0 : 4 }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f9fafb', margin: 0 }}>
          🚀 Deployment Agent
        </h2>
        <span style={{ color: '#6b7280', fontSize: 13 }}>{open ? '▲ collapse' : '▼ expand'}</span>
      </div>

      {!open && <div style={{ height: 8 }} />}

      {open && (
        <div style={{ marginTop: 16 }}>

          {/* ── SECTION A: System Status ─────────────────────── */}
          <div style={CARD}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ ...TITLE, margin: 0 }}>System Status</h3>
              <button
                onClick={checkHealth}
                disabled={healthLoading}
                style={BTN('#374151')}
              >
                {healthLoading ? '⟳ Checking…' : '🔍 Check Now'}
              </button>
            </div>

            {healthError && (
              <div style={{ background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 6, padding: '8px 12px', color: '#fca5a5', fontSize: 13, marginBottom: 12 }}>
                ⚠ {healthError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {['backend', 'frontend', 'database'].map(svc => {
                const s = health?.[svc];
                const status = s?.status || (health ? 'unknown' : '—');
                const lat = s?.latency_ms;
                return (
                  <div key={svc} style={{
                    flex: 1, minWidth: 160,
                    background: '#1f2937', border: `1px solid ${s ? serviceColor(s.status) + '40' : '#374151'}`,
                    borderRadius: 8, padding: '12px 14px',
                  }}>
                    {s && <StatusDot status={s.status} />}
                    <span style={{ color: '#f9fafb', fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>{svc}</span>
                    <div style={{ color: serviceColor(s?.status || 'down'), fontSize: 12, marginTop: 4 }}>
                      {status}
                      {lat != null && <span style={{ color: '#6b7280', marginLeft: 6 }}>{lat}ms</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {health?.issues?.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ color: '#fbbf24', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>⚠ Issues Detected</div>
                {health.issues.map((issue, i) => (
                  <div key={i} style={{ background: '#1c1c1c', borderRadius: 6, padding: '8px 12px', marginBottom: 6, fontSize: 12 }}>
                    <span style={{ color: issue.severity === 'critical' ? '#f87171' : '#fbbf24', fontWeight: 600 }}>
                      [{issue.severity?.toUpperCase()}]
                    </span>
                    <span style={{ color: '#d1d5db', marginLeft: 6 }}>{issue.message}</span>
                    {issue.fix && <div style={{ color: '#6b7280', marginTop: 3 }}>Fix: {issue.fix}</div>}
                  </div>
                ))}
              </div>
            )}

            {health && health.issues?.length === 0 && (
              <div style={{ marginTop: 12, color: '#4ade80', fontSize: 12 }}>
                ✅ All systems healthy — checked {timeAgo(health.checked_at)}
              </div>
            )}
          </div>

          {/* ── SECTION B: Pre-Deploy Checklist ─────────────── */}
          <div style={CARD}>
            <h3 style={TITLE}>🚀 Deploy Checklist</h3>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
              <div>
                <label style={{ color: '#6b7280', fontSize: 12, display: 'block', marginBottom: 4 }}>Deploy Type</label>
                <select
                  value={deployType}
                  onChange={e => { setDeployType(e.target.value); setPreCheck(null); setPostResult(null); setDeployId(null); }}
                  style={SELECT_STYLE}
                >
                  {['backend', 'frontend', 'database', 'hotfix', 'rollback'].map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div style={{ flex: 1, minWidth: 180 }}>
                <label style={{ color: '#6b7280', fontSize: 12, display: 'block', marginBottom: 4 }}>Git Commit (optional)</label>
                <input
                  value={gitCommit}
                  onChange={e => setGitCommit(e.target.value)}
                  placeholder="e.g. abc1234"
                  style={{ ...SELECT_STYLE, width: '100%' }}
                />
              </div>

              <div style={{ alignSelf: 'flex-end' }}>
                <button
                  onClick={runPreCheck}
                  disabled={preLoading}
                  style={BTN('#6d28d9')}
                >
                  {preLoading ? '⟳ Validating…' : '▶ Run Pre-Deploy Checks'}
                </button>
              </div>
            </div>

            {preCheck && (
              <>
                <div style={{ overflowX: 'auto', marginBottom: 14 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={TH}>Check</th>
                        <th style={TH}>Message</th>
                        <th style={TH}>Fix Suggestion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preCheck.checks.map((c, i) => <CheckRow key={i} check={c} />)}
                    </tbody>
                  </table>
                </div>

                <div style={{
                  padding: '10px 16px', borderRadius: 6,
                  background: preCheck.can_deploy ? '#052e16' : '#450a0a',
                  border: `1px solid ${preCheck.can_deploy ? '#16a34a' : '#7f1d1d'}`,
                  color: preCheck.can_deploy ? '#4ade80' : '#f87171',
                  fontWeight: 600, fontSize: 14,
                }}>
                  {preCheck.can_deploy
                    ? '✅ Safe to Deploy — proceed with the steps below'
                    : `🚫 Cannot Deploy — fix ${preCheck.blockers.length} blocker(s) first`}
                </div>
              </>
            )}
          </div>

          {/* ── SECTION C: Deploy Guide ──────────────────────── */}
          {preCheck?.can_deploy && (
            <div style={CARD}>
              <h3 style={TITLE}>📋 How to Deploy — {deployType}</h3>

              <ol style={{ margin: '0 0 16px', paddingLeft: 20 }}>
                {(DEPLOY_STEPS[deployType] || []).map((step, i) => (
                  <li key={i} style={{ color: '#d1d5db', fontSize: 13, marginBottom: 8 }}>
                    {i < (DEPLOY_STEPS[deployType].length - 1)
                      ? <code style={{ background: '#1f2937', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace' }}>{step}</code>
                      : <span style={{ color: '#a78bfa' }}>{step}</span>}
                  </li>
                ))}
              </ol>

              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={verifyDeployment}
                  disabled={verifyLoading || !deployId}
                  style={BTN(deployId ? '#16a34a' : '#374151')}
                >
                  {verifyLoading ? '⟳ Verifying…' : '✅ Verify Deployment'}
                </button>
                {!deployId && (
                  <span style={{ color: '#6b7280', fontSize: 12 }}>Run pre-check first to enable verification</span>
                )}
              </div>

              {/* Post-deploy results */}
              {postResult && (
                <div style={{ marginTop: 16 }}>
                  <div style={{
                    padding: '10px 16px', borderRadius: 6, marginBottom: 12,
                    background: postResult.overall === 'success' ? '#052e16' : '#450a0a',
                    border: `1px solid ${postResult.overall === 'success' ? '#16a34a' : '#7f1d1d'}`,
                    color: postResult.overall === 'success' ? '#4ade80' : '#f87171',
                    fontWeight: 600, fontSize: 14,
                  }}>
                    {postResult.overall === 'success'
                      ? `✅ Deployment Verified — ${postResult.recommendation}`
                      : `❌ Post-deploy checks FAILED — Recommendation: ${postResult.recommendation?.toUpperCase()}`}
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={TH}>Check</th>
                        <th style={TH}>Result</th>
                        <th style={TH}>Fix</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(postResult.checks || []).map((c, i) => <CheckRow key={i} check={c} />)}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── SECTION D: History ───────────────────────────── */}
          <div style={CARD}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ ...TITLE, margin: 0 }}>📜 Deploy History</h3>
              <button onClick={loadHistory} disabled={historyLoading} style={BTN('#374151')}>
                {historyLoading ? '⟳' : '↻ Refresh'}
              </button>
            </div>

            {history.length === 0 && !historyLoading && (
              <div style={{ color: '#4b5563', textAlign: 'center', padding: '24px 0', fontSize: 13 }}>
                No deployments recorded yet
              </div>
            )}

            {history.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={TH}>Time</th>
                      <th style={TH}>Type</th>
                      <th style={TH}>Status</th>
                      <th style={TH}>Duration</th>
                      <th style={TH}>Commit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((row) => (
                      <>
                        <tr
                          key={row.id}
                          className="deploy-tr"
                          onClick={() => setExpandedRow(expandedRow === row.id ? null : row.id)}
                          style={{ borderBottom: '1px solid #1f2937' }}
                        >
                          <td style={TD}>{timeAgo(row.created_at)}</td>
                          <td style={{ ...TD, textTransform: 'capitalize' }}>{row.deploy_type}</td>
                          <td style={TD}><StatusBadge status={row.status} /></td>
                          <td style={TD}>{fmtDuration(row.duration_ms)}</td>
                          <td style={{ ...TD, fontFamily: 'monospace', fontSize: 12, color: '#60a5fa' }}>
                            {row.git_commit ? row.git_commit.slice(0, 7) : '—'}
                          </td>
                        </tr>

                        {expandedRow === row.id && (
                          <tr key={`${row.id}-expand`} style={{ background: '#0f172a' }}>
                            <td colSpan={5} style={{ padding: '12px 16px' }}>
                              {row.notes && (
                                <div style={{ color: '#9ca3af', fontSize: 12, marginBottom: 10 }}>📝 {row.notes}</div>
                              )}

                              {row.pre_checks?.checks?.length > 0 && (
                                <div style={{ marginBottom: 12 }}>
                                  <div style={{ color: '#6b7280', fontSize: 11, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase' }}>Pre-deploy Checks</div>
                                  {row.pre_checks.checks.map((c, i) => (
                                    <div key={i} style={{ fontSize: 12, color: '#d1d5db', marginBottom: 3 }}>
                                      {c.status === 'pass' ? '✅' : c.status === 'fail' ? '❌' : '⚠️'} {c.name} — {c.message}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {row.post_checks?.checks?.length > 0 && (
                                <div>
                                  <div style={{ color: '#6b7280', fontSize: 11, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase' }}>Post-deploy Checks</div>
                                  {row.post_checks.checks.map((c, i) => (
                                    <div key={i} style={{ fontSize: 12, color: '#d1d5db', marginBottom: 3 }}>
                                      {c.status === 'pass' ? '✅' : c.status === 'fail' ? '❌' : '⚠️'} {c.name} — {c.message}
                                      {c.fix_suggestion && <span style={{ color: '#6b7280' }}> (Fix: {c.fix_suggestion})</span>}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {row.issues?.length > 0 && (
                                <div style={{ marginTop: 10 }}>
                                  <div style={{ color: '#fbbf24', fontSize: 11, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase' }}>Issues</div>
                                  {row.issues.map((issue, i) => (
                                    <div key={i} style={{ fontSize: 12, color: '#f87171', marginBottom: 3 }}>
                                      [{issue.severity?.toUpperCase()}] {issue.message}
                                      {issue.fix_suggestion && <span style={{ color: '#6b7280' }}> — {issue.fix_suggestion}</span>}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}
    </section>
  );
}
