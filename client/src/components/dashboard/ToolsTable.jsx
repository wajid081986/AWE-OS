import { memo, useMemo, useState } from 'react';

const STATUS_BADGE = {
  live:     { bg: '#052e16', color: '#4ade80', border: '#16a34a', label: 'Live' },
  scaling:  { bg: '#0c1a3a', color: '#60a5fa', border: '#2563eb', label: 'Scaling' },
  killed:   { bg: '#2d0808', color: '#f87171', border: '#dc2626', label: 'Killed' },
  idea:     { bg: '#1a1a2e', color: '#94a3b8', border: '#475569', label: 'Idea' },
  building: { bg: '#1c1200', color: '#fbbf24', border: '#d97706', label: 'Building' },
};

const DECISION_BADGE = {
  scale:   { bg: '#0c1a3a', color: '#60a5fa', border: '#2563eb' },
  improve: { bg: '#1c1200', color: '#fbbf24', border: '#d97706' },
  kill:    { bg: '#2d0808', color: '#f87171', border: '#dc2626' },
  observe: { bg: '#1a1a2e', color: '#94a3b8', border: '#475569' },
};

const PAGE_SIZE = 8;

function Badge({ map, value }) {
  const style = map[value] || { bg: '#1e293b', color: '#94a3b8', border: '#334155' };
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: '999px',
      fontSize: '11px',
      fontWeight: 700,
      background: style.bg,
      color: style.color,
      border: `1px solid ${style.border}`,
      textTransform: 'capitalize',
    }}>
      {value ?? '—'}
    </span>
  );
}

function SkeletonRow() {
  const cell = {
    height: '14px', borderRadius: '4px',
    background: 'linear-gradient(90deg,#1e293b 25%,#334155 50%,#1e293b 75%)',
    backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
  };
  return (
    <tr>
      {[80, 60, 50, 60, 70, 60].map((w, i) => (
        <td key={i} style={{ padding: '14px 12px' }}>
          <div style={{ ...cell, width: `${w}%` }} />
        </td>
      ))}
      <td style={{ padding: '14px 12px' }}>
        <div style={{ ...cell, width: '90%', height: '28px', borderRadius: '6px' }} />
      </td>
    </tr>
  );
}

/**
 * Paginated tools table with status/decision badges and per-row actions.
 * @param {{ tools: object[], onRunDecision: (tool) => void,
 *            loadingId: string|null }} props
 */
const ToolsTable = memo(function ToolsTable({ tools = [], onRunDecision, loadingId, loading }) {
  const [page, setPage] = useState(1);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return tools.slice(start, start + PAGE_SIZE);
  }, [tools, page]);

  const totalPages = Math.ceil(tools.length / PAGE_SIZE);

  const fmt = {
    revenue: (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    usage:   (v) => Number(v || 0).toLocaleString('en-IN'),
    rate:    (v) => `${Number(v || 0).toFixed(2)}%`,
  };

  const thStyle = {
    padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700,
    color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em',
    borderBottom: '1px solid #334155', whiteSpace: 'nowrap',
  };
  const tdStyle = { padding: '12px 12px', fontSize: '13px', color: '#e2e8f0', verticalAlign: 'middle' };

  if (!loading && tools.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', color: '#475569' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
        <p style={{ margin: 0, fontSize: '15px' }}>No tools found.</p>
        <p style={{ margin: '4px 0 0', fontSize: '13px' }}>Add a tool to the database to get started.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#0f172a' }}>
              <th style={thStyle}>Tool Name</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Usage</th>
              <th style={thStyle}>Conv. Rate</th>
              <th style={thStyle}>Revenue</th>
              <th style={thStyle}>Last Decision</th>
              <th style={thStyle}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonRow key={i} />)
              : paginated.map((tool) => (
                <tr key={tool.id} style={{ borderBottom: '1px solid #1e293b' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#1e293b'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ ...tdStyle, fontWeight: 600, color: '#f1f5f9' }}>
                    {tool.name}
                  </td>
                  <td style={tdStyle}>
                    <Badge map={STATUS_BADGE} value={tool.status} />
                  </td>
                  <td style={tdStyle}>{fmt.usage(tool.usage_count)}</td>
                  <td style={tdStyle}>{fmt.rate(tool.conversion_rate)}</td>
                  <td style={{ ...tdStyle, color: '#4ade80', fontWeight: 600 }}>
                    {fmt.revenue(tool.revenue)}
                  </td>
                  <td style={tdStyle}>
                    {tool._decision
                      ? <Badge map={DECISION_BADGE} value={tool._decision} />
                      : <span style={{ color: '#475569' }}>—</span>}
                  </td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => onRunDecision(tool)}
                      disabled={loadingId === tool.id}
                      style={{
                        padding: '5px 12px', borderRadius: '6px', fontSize: '12px',
                        fontWeight: 600, cursor: loadingId === tool.id ? 'not-allowed' : 'pointer',
                        background: loadingId === tool.id ? '#1e293b' : '#312e81',
                        color: loadingId === tool.id ? '#475569' : '#a5b4fc',
                        border: '1px solid #4338ca', transition: 'all 0.15s',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {loadingId === tool.id ? '⏳ Running…' : '▶ Run Decision'}
                    </button>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '16px 12px 4px' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={paginBtn(page === 1)}
          >← Prev</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
            <button key={n} onClick={() => setPage(n)} style={paginBtn(false, n === page)}>
              {n}
            </button>
          ))}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={paginBtn(page === totalPages)}
          >Next →</button>
        </div>
      )}
    </div>
  );
});

function paginBtn(disabled, active = false) {
  return {
    padding: '4px 10px', borderRadius: '6px', fontSize: '12px', cursor: disabled ? 'not-allowed' : 'pointer',
    background: active ? '#4338ca' : '#1e293b',
    color:  active ? '#e0e7ff' : disabled ? '#334155' : '#94a3b8',
    border: `1px solid ${active ? '#6366f1' : '#334155'}`,
  };
}

export default ToolsTable;
