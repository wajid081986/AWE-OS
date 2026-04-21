import { useState, useEffect, useCallback, memo } from 'react';
import { updatePlanStatus } from '../../services/api.service';
import CodeViewer from './CodeViewer';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://awe-os.onrender.com';

async function triggerCodeGen(tool_id) {
  const token = localStorage.getItem('awe_token');
  const res = await fetch(`${BASE_URL}/api/codegen/generate/${tool_id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
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

async function fetchGeneratedCode(tool_id) {
  const token = localStorage.getItem('awe_token');
  const res = await fetch(`${BASE_URL}/api/codegen/${tool_id}`, {
    headers: { ...(token && { Authorization: `Bearer ${token}` }) },
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    throw err;
  }
  return data;
}

const TABS = ['UI Plan', 'API Plan', 'DB Schema', 'Tech Stack'];

const STATUS_ACTIONS = {
  pending_review: [
    { label: '✅ Approve Plan',   next: 'approved',     style: 'green' },
    { label: '❌ Reject Plan',    next: 'rejected',     style: 'red',  needsNote: true },
  ],
  approved: [
    { label: '🔄 Mark In Progress', next: 'in_progress', style: 'blue' },
  ],
  in_progress: [
    { label: '✔️ Mark Complete',  next: 'completed',    style: 'purple' },
  ],
  rejected:   [],
  completed:  [],
};

const BTN_COLORS = {
  green:  { bg: '#052e16', color: '#4ade80', border: '#16a34a' },
  red:    { bg: '#2d0808', color: '#f87171', border: '#dc2626' },
  blue:   { bg: '#0c1a3a', color: '#60a5fa', border: '#2563eb' },
  purple: { bg: '#1a0533', color: '#c084fc', border: '#7c3aed' },
  indigo: { bg: '#1e1b4b', color: '#a5b4fc', border: '#4338ca' },
};

const METHOD_COLOR = {
  GET:    '#4ade80',
  POST:   '#60a5fa',
  PUT:    '#fbbf24',
  PATCH:  '#fbbf24',
  DELETE: '#f87171',
};

// ── Tab content renderers ──────────────────────────────────────

function UITab({ ui_plan }) {
  if (!ui_plan) return <Empty />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {(ui_plan.pages || []).map((page, i) => (
        <div key={i} style={S.block}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline', marginBottom: '8px' }}>
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#f1f5f9' }}>{page.name}</span>
            <code style={S.code}>{page.route}</code>
          </div>
          <p style={S.mutedText}>{page.purpose}</p>
          {page.components?.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <p style={S.label}>Components</p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {page.components.map((c, j) => <Tag key={j} text={c} color="#6366f1" />)}
              </div>
            </div>
          )}
          {page.key_features?.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <p style={S.label}>Key Features</p>
              <ul style={{ margin: 0, padding: '0 0 0 16px' }}>
                {page.key_features.map((f, j) => (
                  <li key={j} style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '2px' }}>{f}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
      {ui_plan.design_notes && (
        <div style={S.block}>
          <p style={S.label}>Design Notes</p>
          <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', lineHeight: 1.6 }}>
            {ui_plan.design_notes}
          </p>
        </div>
      )}
    </div>
  );
}

function APITab({ api_plan }) {
  if (!api_plan) return <Empty />;
  const endpoints = api_plan.endpoints || [];
  if (endpoints.length === 0) return <Empty message="No endpoints defined." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {endpoints.map((ep, i) => (
        <div key={i} style={S.block}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
            <span style={{
              padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 800,
              color: METHOD_COLOR[ep.method] || '#94a3b8',
              background: '#0f172a', border: `1px solid ${METHOD_COLOR[ep.method] || '#334155'}`,
              letterSpacing: '0.05em',
            }}>{ep.method}</span>
            <code style={S.code}>{ep.path}</code>
            {ep.auth_required && (
              <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 700 }}>🔒 Auth</span>
            )}
          </div>
          <p style={S.mutedText}>{ep.purpose}</p>
          {ep.request_body && Object.keys(ep.request_body).length > 0 && (
            <details style={{ marginTop: '8px' }}>
              <summary style={{ fontSize: '11px', color: '#64748b', cursor: 'pointer' }}>Request body</summary>
              <pre style={S.pre}>{JSON.stringify(ep.request_body, null, 2)}</pre>
            </details>
          )}
          {ep.response && Object.keys(ep.response).length > 0 && (
            <details style={{ marginTop: '4px' }}>
              <summary style={{ fontSize: '11px', color: '#64748b', cursor: 'pointer' }}>Response</summary>
              <pre style={S.pre}>{JSON.stringify(ep.response, null, 2)}</pre>
            </details>
          )}
        </div>
      ))}
    </div>
  );
}

function DBTab({ db_schema }) {
  if (!db_schema) return <Empty />;
  const tables = db_schema.tables || [];
  if (tables.length === 0) return <Empty message="No tables defined." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {tables.map((table, i) => (
        <div key={i} style={S.block}>
          <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '14px', color: '#f1f5f9' }}>
            📋 {table.name}
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#0f172a' }}>
                  {['Column', 'Type', 'Nullable', 'Notes'].map(h => (
                    <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: '#64748b',
                                         fontWeight: 700, borderBottom: '1px solid #334155',
                                         textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '10px' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(table.columns || []).map((col, j) => (
                  <tr key={j} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '6px 10px', color: '#e2e8f0', fontWeight: col.primary ? 700 : 400 }}>
                      {col.name} {col.primary && <span style={{ color: '#fbbf24', fontSize: '10px' }}>PK</span>}
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <code style={{ ...S.code, fontSize: '11px' }}>{col.type}</code>
                    </td>
                    <td style={{ padding: '6px 10px', color: col.nullable === false ? '#f87171' : '#94a3b8' }}>
                      {col.nullable === false ? 'NOT NULL' : 'nullable'}
                    </td>
                    <td style={{ padding: '6px 10px', color: '#64748b', fontSize: '11px' }}>
                      {col.default ? `default: ${col.default}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function TechTab({ tech_stack, plan }) {
  if (!tech_stack) return <Empty />;
  const sections = [
    { label: 'Frontend',  items: tech_stack.frontend || [] },
    { label: 'Backend',   items: tech_stack.backend  || [] },
    { label: 'Database',  items: tech_stack.database || [] },
    { label: 'Packages',  items: tech_stack.packages || [] },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
        {sections.map(({ label, items }) => (
          <div key={label} style={S.block}>
            <p style={S.label}>{label}</p>
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              {items.length > 0
                ? items.map((item, i) => <Tag key={i} text={item} color="#6366f1" />)
                : <span style={{ fontSize: '12px', color: '#475569' }}>—</span>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <MetricBox label="Estimated Hours" value={`~${plan.estimated_hours}h`} color="#fbbf24" />
        <MetricBox
          label="Complexity"
          value={plan.complexity_level || '—'}
          color={plan.complexity_level === 'high' ? '#f87171' : plan.complexity_level === 'low' ? '#4ade80' : '#fbbf24'}
        />
      </div>

      {plan.implementation_notes && (
        <div style={S.block}>
          <p style={S.label}>Implementation Notes</p>
          <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', lineHeight: 1.7 }}>
            {plan.implementation_notes}
          </p>
        </div>
      )}

      {plan.reviewer_notes && (
        <div style={{ ...S.block, borderColor: '#d97706', background: '#1c1200' }}>
          <p style={{ ...S.label, color: '#f59e0b' }}>Reviewer Notes</p>
          <p style={{ margin: 0, fontSize: '13px', color: '#fbbf24', lineHeight: 1.6 }}>
            {plan.reviewer_notes}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────

const PlanModal = memo(function PlanModal({ plan, onClose, onUpdated }) {
  const [tab,           setTab]           = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError,   setActionError]   = useState(null);
  const [rejectNote,    setRejectNote]    = useState('');
  const [rejectOpen,    setRejectOpen]    = useState(false);

  // Code generation state — only relevant when plan.status === 'approved'
  const [codegenLoading, setCodegenLoading] = useState(false);
  const [codegenError,   setCodegenError]   = useState(null);
  const [codeData,       setCodeData]       = useState(null);
  const [showCodeViewer, setShowCodeViewer] = useState(false);

  // Flatten implementation_notes out of the stored plan JSONB
  const ui_plan  = plan.ui_plan;
  const api_plan = plan.api_plan;
  const db_schema = plan.db_schema;
  const tech_stack = plan.tech_stack;
  const impl_notes = plan.implementation_notes
    || plan.tech_stack?.implementation_notes
    || null;
  const fullPlan = { ...plan, implementation_notes: impl_notes };

  const actions = STATUS_ACTIONS[plan.status] || [];

  // Close on Escape
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);

  const handleGenerateCode = useCallback(async () => {
    if (!plan.tool_id) {
      setCodegenError('No tool_id on plan — cannot generate code.');
      return;
    }
    setCodegenLoading(true);
    setCodegenError(null);
    try {
      await triggerCodeGen(plan.tool_id);
      // Fetch full code record with file contents for CodeViewer
      const res = await fetchGeneratedCode(plan.tool_id);
      setCodeData(res.data);
      setShowCodeViewer(true);
    } catch (err) {
      setCodegenError(err.message || 'Code generation failed. Try again.');
    } finally {
      setCodegenLoading(false);
    }
  }, [plan.tool_id]);

  const handleAction = useCallback(async (next, notes = null) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await updatePlanStatus(plan.id, next, notes);
      onUpdated();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
      setRejectOpen(false);
    }
  }, [plan.id, onUpdated]);

  const tabContent = [
    <UITab  key="ui"   ui_plan={ui_plan} />,
    <APITab key="api"  api_plan={api_plan} />,
    <DBTab  key="db"   db_schema={db_schema} />,
    <TechTab key="tech" tech_stack={tech_stack} plan={fullPlan} />,
  ];

  return (
    <>
      <div
        onClick={onClose}
        style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '24px 16px', overflowY: 'auto',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '760px',
          background: '#1e293b', border: '1px solid #334155',
          borderRadius: '16px', overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #334155',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px',
        }}>
          <div>
            <p style={{ margin: '0 0 2px', fontSize: '11px', color: '#64748b',
                        textTransform: 'uppercase', letterSpacing: '0.08em' }}>Build Plan</p>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#f1f5f9' }}>
              {plan.tool_name}
            </h2>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
              <StatusBadge status={plan.status} />
              <ComplexityBadge level={plan.complexity_level} />
              <span style={{ fontSize: '11px', color: '#64748b', alignSelf: 'center' }}>
                ~{plan.estimated_hours}h · v{plan.version || 1}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: '#64748b', fontSize: '20px',
            cursor: 'pointer', padding: '4px 8px', borderRadius: '6px', flexShrink: 0,
          }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #334155', overflowX: 'auto' }}>
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)} style={{
              padding: '10px 18px', border: 'none', cursor: 'pointer',
              background: 'none', fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap',
              color: tab === i ? '#a5b4fc' : '#64748b',
              borderBottom: tab === i ? '2px solid #6366f1' : '2px solid transparent',
            }}>{t}</button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ padding: '20px 24px', maxHeight: '55vh', overflowY: 'auto' }}>
          {tabContent[tab]}
        </div>

        {/* Actions */}
        {actions.length > 0 && (
          <div style={{
            padding: '16px 24px', borderTop: '1px solid #334155',
            background: '#0f172a',
          }}>
            {actionError && (
              <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#f87171' }}>
                ⚠ {actionError}
              </p>
            )}

            {rejectOpen ? (
              <div>
                <textarea
                  value={rejectNote}
                  onChange={e => setRejectNote(e.target.value)}
                  placeholder="Reason for rejection (optional)…"
                  rows={3}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: '8px', resize: 'vertical',
                    background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155',
                    fontSize: '13px', marginBottom: '8px', boxSizing: 'border-box',
                  }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleAction('rejected', rejectNote)}
                    disabled={actionLoading}
                    style={{ ...btnStyle('red'), flex: 1 }}
                  >
                    {actionLoading ? 'Rejecting…' : '❌ Confirm Rejection'}
                  </button>
                  <button
                    onClick={() => setRejectOpen(false)}
                    style={{ ...btnStyle('ghost'), flex: 1 }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {actions.map(action => (
                    <button
                      key={action.next}
                      disabled={actionLoading}
                      onClick={() => {
                        if (action.needsNote) { setRejectOpen(true); return; }
                        handleAction(action.next);
                      }}
                      style={{
                        ...btnStyle(action.style),
                        opacity: actionLoading ? 0.5 : 1,
                        cursor: actionLoading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {actionLoading ? 'Updating…' : action.label}
                    </button>
                  ))}
                </div>

                {/* Generate Code button — only when plan is approved */}
                {plan.status === 'approved' && (
                  <div>
                    {codegenError && (
                      <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#f87171' }}>
                        ⚠ {codegenError}
                      </p>
                    )}
                    <button
                      onClick={handleGenerateCode}
                      disabled={codegenLoading || actionLoading}
                      style={{
                        ...btnStyle('indigo'),
                        opacity: codegenLoading || actionLoading ? 0.6 : 1,
                        cursor: codegenLoading ? 'wait' : 'pointer',
                      }}
                    >
                      {codegenLoading ? '⏳ AI generating code…' : '🤖 Generate Code'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    {/* CodeViewer renders as fixed overlay — position: fixed makes it stack correctly */}
    {showCodeViewer && codeData && (
      <CodeViewer
        code={codeData}
        onClose={() => setShowCodeViewer(false)}
        onApproved={() => { setShowCodeViewer(false); onUpdated(); }}
        onRejected={() => setShowCodeViewer(false)}
      />
    )}
    </>
  );
});

// ── Helper components ─────────────────────────────────────────

function Empty({ message = 'No data available.' }) {
  return <p style={{ color: '#475569', fontSize: '13px', textAlign: 'center', padding: '24px' }}>{message}</p>;
}

function Tag({ text, color = '#6366f1' }) {
  return (
    <span style={{
      padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
      background: `${color}18`, color, border: `1px solid ${color}44`,
    }}>{text}</span>
  );
}

function MetricBox({ label, value, color }) {
  return (
    <div style={{
      padding: '12px 16px', borderRadius: '10px',
      background: '#0f172a', border: '1px solid #334155',
    }}>
      <p style={{ margin: '0 0 2px', fontSize: '10px', color: '#64748b',
                  textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</p>
      <p style={{ margin: 0, fontSize: '18px', fontWeight: 700, color, textTransform: 'capitalize' }}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const s = {
    pending_review: { color: '#94a3b8', border: '#475569', bg: '#1a1a2e' },
    approved:       { color: '#4ade80', border: '#16a34a', bg: '#052e16' },
    rejected:       { color: '#f87171', border: '#dc2626', bg: '#2d0808' },
    in_progress:    { color: '#60a5fa', border: '#2563eb', bg: '#0c1a3a' },
    completed:      { color: '#c084fc', border: '#7c3aed', bg: '#1a0533' },
  }[status] || { color: '#94a3b8', border: '#334155', bg: '#1e293b' };
  return (
    <span style={{ padding: '2px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700,
                   background: s.bg, color: s.color, border: `1px solid ${s.border}`,
                   textTransform: 'capitalize' }}>
      {status?.replace('_', ' ')}
    </span>
  );
}

function ComplexityBadge({ level }) {
  const s = {
    low:    { color: '#4ade80', border: '#16a34a', bg: '#052e16' },
    medium: { color: '#fbbf24', border: '#d97706', bg: '#1c1200' },
    high:   { color: '#f87171', border: '#dc2626', bg: '#2d0808' },
  }[level] || { color: '#94a3b8', border: '#334155', bg: '#1e293b' };
  return (
    <span style={{ padding: '2px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700,
                   background: s.bg, color: s.color, border: `1px solid ${s.border}`,
                   textTransform: 'capitalize' }}>
      {level}
    </span>
  );
}

function btnStyle(variant) {
  const c = BTN_COLORS[variant] || { bg: '#1e293b', color: '#94a3b8', border: '#334155' };
  if (variant === 'ghost') return {
    padding: '9px 16px', borderRadius: '8px', fontWeight: 700, fontSize: '13px',
    background: '#1e293b', color: '#64748b', border: '1px solid #334155', cursor: 'pointer',
  };
  return {
    padding: '9px 16px', borderRadius: '8px', fontWeight: 700, fontSize: '13px',
    background: c.bg, color: c.color, border: `1px solid ${c.border}`, cursor: 'pointer',
  };
}

// ── Shared styles ─────────────────────────────────────────────
const S = {
  block: {
    background: '#0f172a', border: '1px solid #1e293b',
    borderRadius: '10px', padding: '14px 16px',
  },
  code: {
    background: '#0f172a', color: '#60a5fa', border: '1px solid #1e293b',
    borderRadius: '4px', padding: '1px 6px', fontSize: '12px', fontFamily: 'monospace',
  },
  pre: {
    margin: '6px 0 0', padding: '8px', borderRadius: '6px',
    background: '#0f172a', color: '#94a3b8', fontSize: '11px',
    fontFamily: 'monospace', overflowX: 'auto', lineHeight: 1.5,
    border: '1px solid #1e293b',
  },
  label: {
    margin: '0 0 4px', fontSize: '10px', color: '#64748b',
    textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700,
  },
  mutedText: {
    margin: '0 0 4px', fontSize: '13px', color: '#94a3b8', lineHeight: 1.5,
  },
};

export default PlanModal;
