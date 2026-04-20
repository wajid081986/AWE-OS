import { memo, useEffect, useCallback } from 'react';

const DECISION_COLOR = {
  scale:   '#60a5fa',
  improve: '#fbbf24',
  kill:    '#f87171',
  observe: '#94a3b8',
};

const DECISION_ICON = {
  scale:   '🚀',
  improve: '🔧',
  kill:    '💀',
  observe: '👁',
};

/**
 * Modal overlay displaying a single-tool decision result.
 * Closes on backdrop click or Escape key.
 *
 * @param {{ result: object|null, onClose: () => void,
 *            onApprove?: (id) => void, onReject?: (id) => void }} props
 */
const DecisionModal = memo(function DecisionModal({ result, onClose, onApprove, onReject }) {
  // Close on Escape
  const handleKey = useCallback((e) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  if (!result) return null;

  const color  = DECISION_COLOR[result.decision] || '#94a3b8';
  const icon   = DECISION_ICON[result.decision]  || '?';
  const m      = result.metrics || {};

  const metricFmt = {
    revenue: `₹${Number(m.revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    usage:   Number(m.usage_count || 0).toLocaleString('en-IN'),
    rate:    `${Number(m.conversion_rate || 0).toFixed(2)}%`,
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#1e293b', border: '1px solid #334155',
          borderRadius: '16px', padding: '32px',
          width: '100%', maxWidth: '520px',
          position: 'relative',
          boxShadow: `0 0 40px ${color}22`,
        }}
      >
        {/* Top accent line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
          background: color, borderRadius: '16px 16px 0 0',
        }} />

        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '16px', right: '16px',
            background: 'none', border: 'none', color: '#64748b',
            fontSize: '20px', cursor: 'pointer', lineHeight: 1,
            padding: '4px 8px', borderRadius: '6px',
          }}
          aria-label="Close"
        >✕</button>

        {/* Tool name */}
        <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#64748b',
                    textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Decision Result
        </p>
        <h2 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 700, color: '#f1f5f9' }}>
          {result.tool_name}
        </h2>

        {/* Decision badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '8px 18px', borderRadius: '999px',
          background: `${color}18`, border: `1px solid ${color}55`,
          marginBottom: '20px',
        }}>
          <span style={{ fontSize: '18px' }}>{icon}</span>
          <span style={{ fontSize: '16px', fontWeight: 700, color, textTransform: 'uppercase' }}>
            {result.decision}
          </span>
          {result.dry_run && (
            <span style={{ fontSize: '10px', color: '#64748b', marginLeft: '4px' }}>[DRY RUN]</span>
          )}
        </div>

        {/* Metrics row */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {[
            { label: 'Revenue',     value: metricFmt.revenue, color: '#4ade80' },
            { label: 'Usage',       value: metricFmt.usage,   color: '#60a5fa' },
            { label: 'Conv. Rate',  value: metricFmt.rate,    color: '#fbbf24' },
          ].map(({ label, value, color: c }) => (
            <div key={label} style={{
              flex: '1 1 120px', background: '#0f172a',
              border: '1px solid #334155', borderRadius: '10px', padding: '12px 14px',
            }}>
              <p style={{ margin: 0, fontSize: '10px', color: '#64748b',
                          textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</p>
              <p style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: 700, color: c }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Reason */}
        <div style={{ marginBottom: '14px' }}>
          <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#64748b',
                      textTransform: 'uppercase', letterSpacing: '0.07em' }}>Reason</p>
          <p style={{ margin: 0, fontSize: '14px', color: '#cbd5e1', lineHeight: 1.5 }}>
            {result.reason}
          </p>
        </div>

        {/* Recommended action */}
        <div style={{
          background: '#0f172a', border: '1px solid #334155',
          borderRadius: '10px', padding: '14px 16px', marginBottom: '24px',
        }}>
          <p style={{ margin: '0 0 6px', fontSize: '11px', color: '#64748b',
                      textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Recommended Action
          </p>
          <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', lineHeight: 1.6 }}>
            {result.recommended_action}
          </p>
        </div>

        {/* Approve / Reject actions */}
        {(onApprove || onReject) && !result.dry_run && (
          <div style={{ display: 'flex', gap: '10px' }}>
            {onApprove && (
              <button
                onClick={() => onApprove(result.tool_id)}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px', fontWeight: 700,
                  fontSize: '13px', cursor: 'pointer',
                  background: '#052e16', color: '#4ade80', border: '1px solid #16a34a',
                }}
              >
                ✓ Approve
              </button>
            )}
            {onReject && (
              <button
                onClick={() => onReject(result.tool_id)}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px', fontWeight: 700,
                  fontSize: '13px', cursor: 'pointer',
                  background: '#2d0808', color: '#f87171', border: '1px solid #dc2626',
                }}
              >
                ✕ Reject
              </button>
            )}
          </div>
        )}

        <p style={{ margin: '16px 0 0', fontSize: '11px', color: '#475569', textAlign: 'right' }}>
          Evaluated: {new Date(result.evaluated_at).toLocaleString()}
        </p>
      </div>
    </div>
  );
});

export default DecisionModal;
