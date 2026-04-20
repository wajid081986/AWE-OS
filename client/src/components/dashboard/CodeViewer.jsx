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
    err.code   = data.code  || 'API_ERROR';
    err.status = res.status;
    throw err;
  }
  return data;
}

// ── Syntax highlighter (no external libs) ─────────────────────
// Escapes HTML then applies token coloring via span injection.

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function highlightCode(raw, language) {
  const escaped = escapeHtml(raw);

  if (language === 'sql') {
    return escaped
      .replace(
        /\b(SELECT|FROM|WHERE|INSERT|INTO|UPDATE|DELETE|CREATE|TABLE|INDEX|ON|SET|VALUES|DEFAULT|NOT\s+NULL|PRIMARY\s+KEY|REFERENCES|CASCADE|IF\s+NOT\s+EXISTS|ALTER|ADD\s+COLUMN|DROP|UNIQUE|CONSTRAINT|BEGIN|COMMIT|ROLLBACK|TRIGGER|FUNCTION|RETURNS|LANGUAGE)\b/gi,
        '<span style="color:#60a5fa;font-weight:700">$1</span>'
      )
      .replace(/'([^']*)'/g, '<span style="color:#4ade80">\'$1\'</span>')
      .replace(/--([^\n]*)/g, '<span style="color:#475569">--$1</span>');
  }

  // JavaScript / JSX / TypeScript
  return escaped
    .replace(
      /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|class|extends|import|export|default|from|as|async|await|try|catch|finally|throw|new|typeof|instanceof|null|undefined|true|false|void|this|super|static|get|set|of|in)\b/g,
      '<span style="color:#c084fc">$1</span>'
    )
    .replace(
      /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/gs,
      '<span style="color:#4ade80">$1</span>'
    )
    .replace(
      /(\/\/[^\n]*)/g,
      '<span style="color:#475569;font-style:italic">$1</span>'
    )
    .replace(
      /(\/\*[\s\S]*?\*\/)/g,
      '<span style="color:#475569;font-style:italic">$1</span>'
    )
    .replace(
      /\b(\d+(?:\.\d+)?)\b/g,
      '<span style="color:#fb923c">$1</span>'
    );
}

// ── File helpers ──────────────────────────────────────────────

function fileIcon(language) {
  const icons = {
    jsx: '⚛', tsx: '⚛', js: '📄', ts: '📘',
    css: '🎨', sql: '🗃', json: '{}', md: '📝',
  };
  return icons[language] || '📄';
}

function shortPath(path) {
  const parts = path.split('/');
  return parts.slice(-2).join('/');
}

function downloadFile(filePath, content) {
  const filename = filePath.split('/').pop() || 'file.txt';
  const blob     = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url      = URL.createObjectURL(blob);
  const a        = document.createElement('a');
  a.href         = url;
  a.download     = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Status badge ──────────────────────────────────────────────

const STATUS_STYLE = {
  ready_for_review: { bg: '#1c1200', color: '#fbbf24', border: '#d97706' },
  approved:         { bg: '#052e16', color: '#4ade80', border: '#16a34a' },
  rejected:         { bg: '#2d0808', color: '#f87171', border: '#dc2626' },
  failed:           { bg: '#2d0808', color: '#f87171', border: '#dc2626' },
  generating:       { bg: '#0c1a3a', color: '#60a5fa', border: '#2563eb' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || { bg: '#1e293b', color: '#94a3b8', border: '#334155' };
  return (
    <span style={{
      padding: '2px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      textTransform: 'capitalize',
    }}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

// ── File list item ────────────────────────────────────────────

function FileItem({ file, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left', padding: '8px 10px',
        background: active ? '#1e3a5f' : 'transparent',
        border: active ? '1px solid #2563eb' : '1px solid transparent',
        borderRadius: '6px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: '7px',
        transition: 'background 0.1s',
      }}
    >
      <span style={{ fontSize: '13px', flexShrink: 0 }}>{fileIcon(file.language)}</span>
      <div style={{ minWidth: 0 }}>
        <p style={{
          margin: 0, fontSize: '11px', fontWeight: 600,
          color: active ? '#93c5fd' : '#cbd5e1',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {file.path.split('/').pop()}
        </p>
        <p style={{
          margin: 0, fontSize: '10px', color: '#475569',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {shortPath(file.path)}
        </p>
      </div>
    </button>
  );
}

// ── Code panel ────────────────────────────────────────────────

const CodePanel = memo(function CodePanel({ file }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(file.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select and copy
      const ta = document.createElement('textarea');
      ta.value = file.content;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [file.content]);

  const highlighted = highlightCode(file.content, file.language);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}>
      {/* Code toolbar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 12px', background: '#0f172a', borderBottom: '1px solid #1e293b',
        flexShrink: 0, gap: '8px', flexWrap: 'wrap',
      }}>
        <code style={{
          fontSize: '11px', color: '#64748b',
          fontFamily: 'Consolas, Monaco, monospace',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {file.path}
        </code>
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          <button
            onClick={handleCopy}
            style={{
              padding: '4px 10px', borderRadius: '5px', fontSize: '11px',
              fontWeight: 600, cursor: 'pointer',
              background: copied ? '#052e16' : '#1e293b',
              color: copied ? '#4ade80' : '#94a3b8',
              border: `1px solid ${copied ? '#16a34a' : '#334155'}`,
              transition: 'all 0.15s',
            }}
          >
            {copied ? '✓ Copied' : '📋 Copy File'}
          </button>
          <button
            onClick={() => downloadFile(file.path, file.content)}
            style={{
              padding: '4px 10px', borderRadius: '5px', fontSize: '11px',
              fontWeight: 600, cursor: 'pointer',
              background: '#1e293b', color: '#94a3b8', border: '1px solid #334155',
            }}
          >
            ⬇️ Download
          </button>
        </div>
      </div>

      {/* Code content */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
        <pre style={{
          margin: 0, padding: '16px',
          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          fontSize: '12px', lineHeight: 1.65,
          background: '#080e1a', color: '#e2e8f0',
          minHeight: '100%', tabSize: 2,
        }}>
          <code dangerouslySetInnerHTML={{ __html: highlighted }} />
        </pre>
      </div>
    </div>
  );
});

// ── SQL Panel ─────────────────────────────────────────────────

function SqlPanel({ sql }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* silent */ }
  }, [sql]);

  const highlighted = highlightCode(sql || '-- No SQL generated', 'sql');

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 12px', background: '#0f172a', borderBottom: '1px solid #1e293b',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: '12px', color: '#64748b' }}>Database SQL</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleCopy}
            style={{
              padding: '4px 10px', borderRadius: '5px', fontSize: '11px',
              fontWeight: 600, cursor: 'pointer',
              background: copied ? '#052e16' : '#1e293b',
              color: copied ? '#4ade80' : '#94a3b8',
              border: `1px solid ${copied ? '#16a34a' : '#334155'}`,
            }}
          >
            {copied ? '✓ Copied' : '📋 Copy SQL'}
          </button>
        </div>
      </div>

      {/* Note */}
      <div style={{
        padding: '8px 12px', background: '#1a0533',
        border: '1px solid #7c3aed', borderRadius: '0',
        fontSize: '11px', color: '#c084fc',
      }}>
        🗃 Run this SQL in your <strong>Supabase SQL editor</strong> to create the required tables.
      </div>

      {/* SQL content */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
        <pre style={{
          margin: 0, padding: '16px',
          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          fontSize: '12px', lineHeight: 1.65,
          background: '#080e1a', color: '#e2e8f0',
          minHeight: '100%',
        }}>
          <code dangerouslySetInnerHTML={{ __html: highlighted }} />
        </pre>
      </div>
    </div>
  );
}

// ── Main CodeViewer ───────────────────────────────────────────

const CodeViewer = memo(function CodeViewer({ code, onClose, onApproved, onRejected }) {
  const [activeTab,     setActiveTab]     = useState(0); // 0=frontend, 1=backend, 2=sql
  const [selectedFile,  setSelectedFile]  = useState(null);
  const [reviewNote,    setReviewNote]    = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError,   setActionError]   = useState(null);
  const [successMsg,    setSuccessMsg]    = useState(null);

  const frontendFiles = Array.isArray(code.frontend_files) ? code.frontend_files : [];
  const backendFiles  = Array.isArray(code.backend_files)  ? code.backend_files  : [];

  // Initialise selected file when tab changes
  useEffect(() => {
    const files = activeTab === 0 ? frontendFiles : backendFiles;
    setSelectedFile(files[0] || null);
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on Escape
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);

  const currentFiles = activeTab === 0 ? frontendFiles : backendFiles;

  const handleApprove = useCallback(async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      await apiFetch(`/api/codegen/${code.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ reviewer_notes: reviewNote || null }),
      });
      setSuccessMsg('✅ Tool marked as LIVE! Copy the files to your local project, then deploy to see it in action.');
      onApproved?.();
    } catch (err) {
      setActionError(err.message || 'Approval failed');
    } finally {
      setActionLoading(false);
    }
  }, [code.id, reviewNote, onApproved]);

  const handleReject = useCallback(async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      await apiFetch(`/api/codegen/${code.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reviewer_notes: reviewNote || null }),
      });
      setSuccessMsg('❌ Rejected. You can generate new code after updating the plan.');
      onRejected?.();
    } catch (err) {
      setActionError(err.message || 'Rejection failed');
    } finally {
      setActionLoading(false);
    }
  }, [code.id, reviewNote, onRejected]);

  const tabs = [
    { label: `Frontend (${frontendFiles.length})`, id: 0 },
    { label: `Backend (${backendFiles.length})`,   id: 1 },
    { label: 'Database SQL',                       id: 2 },
  ];

  const genMs = code.generation_ms
    ? code.generation_ms > 1000
      ? `${(code.generation_ms / 1000).toFixed(1)}s`
      : `${code.generation_ms}ms`
    : null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1200,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '16px', overflowY: 'auto',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '1100px',
          background: '#1e293b', border: '1px solid #334155',
          borderRadius: '16px', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          height: 'min(90vh, 800px)',
          position: 'relative',
        }}
      >
        {/* ── Warning banner ─────────────────────────────── */}
        <div style={{
          padding: '8px 20px', background: '#1c1200',
          borderBottom: '1px solid #d97706',
          display: 'flex', alignItems: 'center', gap: '8px',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: '14px' }}>⚠️</span>
          <p style={{ margin: 0, fontSize: '12px', color: '#fbbf24', lineHeight: 1.5 }}>
            <strong>Review all generated code before approving.</strong>{' '}
            Copy files to your local project manually and test locally first.
            Do not approve without testing — tool goes LIVE immediately after approval.
          </p>
        </div>

        {/* ── Header ────────────────────────────────────── */}
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid #334155',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '10px', flexShrink: 0,
          background: '#0f172a',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#f1f5f9' }}>
                Generated Code — {code.tool_name}
              </h2>
              <StatusBadge status={code.status} />
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#475569' }}>
              {code.total_files} files
              {genMs && ` · ${genMs}`}
              {code.ai_model && ` · ${code.ai_model}`}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: '#64748b',
              fontSize: '20px', cursor: 'pointer', padding: '4px 8px',
              borderRadius: '6px', flexShrink: 0,
            }}
          >✕</button>
        </div>

        {/* ── Tab bar ───────────────────────────────────── */}
        <div style={{
          display: 'flex', borderBottom: '1px solid #334155',
          background: '#0f172a', flexShrink: 0, overflowX: 'auto',
        }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: '9px 18px', border: 'none', cursor: 'pointer',
                background: 'none', fontWeight: 600, fontSize: '12px',
                whiteSpace: 'nowrap', color: activeTab === t.id ? '#a5b4fc' : '#64748b',
                borderBottom: activeTab === t.id ? '2px solid #6366f1' : '2px solid transparent',
                transition: 'color 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Main content ──────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {activeTab === 2 ? (
            /* SQL tab — full width */
            <SqlPanel sql={code.db_sql} />
          ) : (
            <>
              {/* Left: file list */}
              <div style={{
                width: '220px', flexShrink: 0,
                background: '#0f172a', borderRight: '1px solid #1e293b',
                overflowY: 'auto', padding: '8px',
                display: 'flex', flexDirection: 'column', gap: '2px',
              }}>
                {currentFiles.length === 0 ? (
                  <p style={{ fontSize: '12px', color: '#475569', padding: '8px', textAlign: 'center' }}>
                    No {activeTab === 0 ? 'frontend' : 'backend'} files
                  </p>
                ) : (
                  currentFiles.map((f, i) => (
                    <FileItem
                      key={i}
                      file={f}
                      active={selectedFile?.path === f.path}
                      onClick={() => setSelectedFile(f)}
                    />
                  ))
                )}
              </div>

              {/* Right: code display */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {selectedFile ? (
                  <CodePanel file={selectedFile} />
                ) : (
                  <div style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#475569', fontSize: '13px',
                  }}>
                    Select a file from the list
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Review actions ─────────────────────────────── */}
        {code.status === 'ready_for_review' && (
          <div style={{
            padding: '14px 20px', borderTop: '1px solid #334155',
            background: '#0f172a', flexShrink: 0,
          }}>
            {successMsg ? (
              <div style={{
                padding: '12px 16px', background: '#052e16',
                border: '1px solid #16a34a', borderRadius: '8px',
              }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#4ade80', lineHeight: 1.5 }}>
                  {successMsg}
                </p>
              </div>
            ) : (
              <>
                {actionError && (
                  <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#f87171' }}>
                    ⚠ {actionError}
                  </p>
                )}
                <textarea
                  value={reviewNote}
                  onChange={e => setReviewNote(e.target.value)}
                  placeholder="Reviewer notes (optional)…"
                  rows={2}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: '8px',
                    background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155',
                    fontSize: '12px', resize: 'vertical', marginBottom: '10px',
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    style={{
                      flex: 1, padding: '9px 16px', borderRadius: '8px', fontWeight: 700,
                      fontSize: '13px', cursor: actionLoading ? 'wait' : 'pointer',
                      background: '#052e16', color: '#4ade80', border: '1px solid #16a34a',
                      opacity: actionLoading ? 0.6 : 1,
                    }}
                  >
                    {actionLoading ? '⏳ Processing…' : '✅ Approve & Mark Live'}
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={actionLoading}
                    style={{
                      flex: 1, padding: '9px 16px', borderRadius: '8px', fontWeight: 700,
                      fontSize: '13px', cursor: actionLoading ? 'wait' : 'pointer',
                      background: '#2d0808', color: '#f87171', border: '1px solid #dc2626',
                      opacity: actionLoading ? 0.6 : 1,
                    }}
                  >
                    ❌ Reject — Regenerate
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default CodeViewer;
