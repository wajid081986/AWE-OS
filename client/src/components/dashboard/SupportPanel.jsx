import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

const priorityColor = (p) =>
  ({ critical: 'text-red-400', high: 'text-orange-400', medium: 'text-yellow-400', low: 'text-green-400' }[p] || 'text-gray-400');

const priorityBorder = (p) =>
  ({ critical: 'border-red-500', high: 'border-orange-500', medium: 'border-yellow-500', low: 'border-green-500' }[p] || 'border-gray-600');

const sentimentEmoji = (s) =>
  ({ positive: '😊', negative: '😞', neutral: '😐', frustrated: '😤' }[s] || '❓');

const categoryBadge = (cat) =>
  ({
    billing:     'bg-purple-900 text-purple-300',
    technical:   'bg-blue-900 text-blue-300',
    account:     'bg-cyan-900 text-cyan-300',
    feature_req: 'bg-green-900 text-green-300',
    bug:         'bg-red-900 text-red-300',
    general:     'bg-gray-700 text-gray-300',
  }[cat] || 'bg-gray-700 text-gray-300');

const statusBadge = (s) =>
  ({
    open:           'bg-blue-900 text-blue-300',
    in_progress:    'bg-yellow-900 text-yellow-300',
    waiting_user:   'bg-orange-900 text-orange-300',
    resolved:       'bg-green-900 text-green-300',
    closed:         'bg-gray-700 text-gray-400',
    spam:           'bg-red-900 text-red-300',
    testing:        'bg-cyan-900 text-cyan-300',
    wont_fix:       'bg-gray-700 text-gray-500',
    under_review:   'bg-indigo-900 text-indigo-300',
    planned:        'bg-teal-900 text-teal-300',
    completed:      'bg-green-900 text-green-300',
    rejected:       'bg-red-900 text-red-400',
  }[s] || 'bg-gray-700 text-gray-300');

const timeAgo = (iso) => {
  if (!iso) return '—';
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const hoursUntilSLA = (deadline) => {
  if (!deadline) return null;
  return (new Date(deadline).getTime() - Date.now()) / 3600000;
};

const maskEmail = (email = '') => {
  const [user, domain] = email.split('@');
  if (!domain) return email;
  return `${user.slice(0, 3)}***@${domain}`;
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function SupportPanel() {
  const [activeTab,          setActiveTab]          = useState('tickets');
  const [dashboard,          setDashboard]          = useState(null);
  const [loading,            setLoading]            = useState(true);
  const [error,              setError]              = useState('');

  // Tickets
  const [tickets,            setTickets]            = useState([]);
  const [selectedTicket,     setSelectedTicket]     = useState(null);
  const [ticketMessages,     setTicketMessages]     = useState([]);
  const [ticketFilter,       setTicketFilter]       = useState({ status: '', priority: '', category: '' });
  const [ticketPage,         setTicketPage]         = useState(0);
  const [ticketTotal,        setTicketTotal]        = useState(0);
  const [replyText,          setReplyText]          = useState('');
  const [replyInternal,      setReplyInternal]      = useState(false);
  const [savingReply,        setSavingReply]        = useState(false);

  // Bugs
  const [bugs,               setBugs]               = useState([]);
  const [selectedBug,        setSelectedBug]        = useState(null);

  // Features
  const [features,           setFeatures]           = useState([]);

  // KB
  const [kbArticles,         setKbArticles]         = useState([]);
  const [selectedArticle,    setSelectedArticle]    = useState(null);
  const [editingArticle,     setEditingArticle]     = useState(false);
  const [showGenerateModal,  setShowGenerateModal]  = useState(false);
  const [generateCategory,   setGenerateCategory]   = useState('technical');
  const [kbGenerating,       setKbGenerating]       = useState(false);

  // Settings (display-only; backed by server constants)
  const [slaConfig,          setSlaConfig]          = useState({ critical: 2, high: 8, medium: 24, low: 72 });
  const [autoCloseDays,      setAutoCloseDays]      = useState(7);
  const [aiRules,            setAiRules]            = useState({ skipBilling: true, skipAngry: true, skipRefund: true });
  const [savingSettings,     setSavingSettings]     = useState(false);

  const LIMIT = 20;

  // ── Data fetchers ─────────────────────────────────────────────────────────

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.get('/support/dashboard');
      setDashboard(res.data.data ?? res.data);
    } catch (e) {
      console.error('[SupportPanel] dashboard', e);
    }
  }, []);

  const fetchTickets = useCallback(async (page = 0, filter = ticketFilter) => {
    try {
      const p = new URLSearchParams({ limit: LIMIT, offset: page * LIMIT });
      if (filter.status)   p.set('status',   filter.status);
      if (filter.priority) p.set('priority', filter.priority);
      if (filter.category) p.set('category', filter.category);
      const res = await api.get(`/support/tickets?${p}`);
      setTickets(res.data.data ?? []);
      setTicketTotal(res.data.total ?? 0);
    } catch (e) {
      setError('Failed to load tickets');
    }
  }, [ticketFilter]);

  const fetchTicket = async (id) => {
    try {
      const res = await api.get(`/support/ticket/${id}`);
      const d = res.data.data ?? res.data;
      setSelectedTicket(d.ticket ?? d);
      setTicketMessages(d.messages ?? []);
    } catch (e) {
      setError('Failed to load ticket');
    }
  };

  const fetchBugs = useCallback(async () => {
    try {
      const res = await api.get('/support/bugs');
      setBugs(res.data.data ?? []);
    } catch (e) {
      setError('Failed to load bugs');
    }
  }, []);

  const fetchFeatures = useCallback(async () => {
    try {
      const res = await api.get('/support/features');
      setFeatures(res.data.data ?? []);
    } catch (e) {
      setError('Failed to load features');
    }
  }, []);

  const fetchKB = useCallback(async () => {
    try {
      const res = await api.get('/support/kb');
      setKbArticles(res.data.data ?? []);
    } catch (e) {
      setError('Failed to load knowledge base');
    }
  }, []);

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchDashboard(), fetchTickets(0)]);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (activeTab === 'bugs')     fetchBugs();
    if (activeTab === 'features') fetchFeatures();
    if (activeTab === 'kb')       fetchKB();
  }, [activeTab]);

  // Global Escape to close any modal
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setSelectedTicket(null);
      setSelectedBug(null);
      setSelectedArticle(null);
      setEditingArticle(false);
      setShowGenerateModal(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleFilterChange = (key, val) => {
    const next = { ...ticketFilter, [key]: val };
    setTicketFilter(next);
    setTicketPage(0);
    fetchTickets(0, next);
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;
    setSavingReply(true);
    try {
      await api.post(`/support/ticket/${selectedTicket.id}/reply`, {
        message:     replyText,
        is_internal: replyInternal,
      });
      setReplyText('');
      await fetchTicket(selectedTicket.id);
      await fetchDashboard();
    } catch (e) {
      setError('Failed to send reply');
    } finally {
      setSavingReply(false);
    }
  };

  const handleApproveAI = async (msgId) => {
    if (!selectedTicket) return;
    setSavingReply(true);
    try {
      await api.post(`/support/ticket/${selectedTicket.id}/reply`, {
        approve_ai: true,
        message_id: msgId,
      });
      await fetchTicket(selectedTicket.id);
    } catch (e) {
      setError('Failed to approve AI response');
    } finally {
      setSavingReply(false);
    }
  };

  const handleResolve = async (id) => {
    try {
      await api.patch(`/support/ticket/${id}/resolve`, {
        resolution_notes: 'Resolved via dashboard',
      });
      setSelectedTicket(null);
      await fetchTickets(ticketPage);
      await fetchDashboard();
    } catch (e) {
      setError('Failed to resolve ticket');
    }
  };

  const handleBugUpdate = async (id, payload) => {
    try {
      await api.patch(`/support/bug/${id}`, payload);
      await fetchBugs();
      if (selectedBug?.id === id) setSelectedBug((b) => ({ ...b, ...payload }));
    } catch (e) {
      setError('Failed to update bug');
    }
  };

  const handleFeatureUpdate = async (id, payload) => {
    try {
      await api.patch(`/support/feature/${id}`, payload);
      await fetchFeatures();
    } catch (e) {
      setError('Failed to update feature');
    }
  };

  const handleGenerateKB = async () => {
    setKbGenerating(true);
    try {
      await api.post('/support/kb/generate', { category: generateCategory });
      setShowGenerateModal(false);
      await fetchKB();
    } catch (e) {
      setError('Failed to generate KB article');
    } finally {
      setKbGenerating(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const metrics = [
    { label: 'Open Tickets',     value: dashboard?.open_tickets    ?? '—', color: 'text-blue-400' },
    { label: 'Avg Resolution',   value: dashboard?.avg_resolution_hours != null ? `${dashboard.avg_resolution_hours.toFixed(1)}h` : '—', color: 'text-green-400' },
    { label: 'SLA Breached',     value: dashboard?.sla_breached    ?? '—', color: 'text-red-400' },
    { label: 'CSAT Score',       value: dashboard?.avg_csat        != null ? `${dashboard.avg_csat.toFixed(1)}/5` : '—', color: 'text-yellow-400' },
    { label: 'Open Bugs',        value: dashboard?.open_bugs       ?? '—', color: 'text-orange-400' },
    { label: 'Feature Requests', value: dashboard?.open_features   ?? '—', color: 'text-purple-400' },
  ];

  const TABS = [
    { id: 'tickets',   label: 'Tickets' },
    { id: 'bugs',      label: 'Bugs' },
    { id: 'features',  label: 'Features' },
    { id: 'kb',        label: 'Knowledge Base' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'settings',  label: 'Settings' },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 md:p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Support Agent</h1>
          <p className="text-gray-400 text-sm mt-1">Tickets · Bugs · Features · Knowledge Base</p>
        </div>
        <button
          onClick={() => { fetchDashboard(); fetchTickets(ticketPage); }}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-sm rounded-lg transition"
        >
          Refresh
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg flex justify-between items-center">
          <span className="text-red-300 text-sm">{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-200 text-xl leading-none">&times;</button>
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {metrics.map((m, i) => (
          <div key={i} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <p className="text-gray-400 text-xs mb-1">{m.label}</p>
            <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-gray-800 p-1 rounded-xl overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === t.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1 — Tickets ──────────────────────────────────────────────────── */}
      {activeTab === 'tickets' && (
        <div>
          {/* Filter bar */}
          <div className="flex flex-wrap gap-3 mb-4 items-center">
            {[
              { key: 'status',   opts: ['', 'open', 'in_progress', 'waiting_user', 'resolved', 'closed', 'spam'] },
              { key: 'priority', opts: ['', 'critical', 'high', 'medium', 'low'] },
              { key: 'category', opts: ['', 'billing', 'technical', 'account', 'feature_req', 'bug', 'general'] },
            ].map(({ key, opts }) => (
              <select
                key={key}
                value={ticketFilter[key]}
                onChange={(e) => handleFilterChange(key, e.target.value)}
                className="bg-gray-800 border border-gray-600 text-sm rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:border-blue-500"
              >
                {opts.map((o) => (
                  <option key={o} value={o}>{o ? o.replace(/_/g, ' ') : `All ${key}s`}</option>
                ))}
              </select>
            ))}
            <span className="ml-auto text-gray-400 text-sm">{ticketTotal} tickets</span>
          </div>

          {/* Tickets table */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-700 text-gray-300 text-left">
                    <th className="px-4 py-3 font-medium">Ticket</th>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Subject</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Priority</th>
                    <th className="px-4 py-3 font-medium">SLA</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">No tickets found</td>
                    </tr>
                  )}
                  {tickets.map((t) => {
                    const slaH = hoursUntilSLA(t.sla_deadline);
                    const slaEl =
                      slaH === null     ? <span className="text-gray-500">—</span>
                      : slaH < 0        ? <span className="text-red-400 font-medium">BREACHED</span>
                      : slaH < 2        ? <span className="text-orange-400">{slaH.toFixed(1)}h</span>
                      :                   <span className="text-gray-400">{slaH.toFixed(0)}h</span>;
                    return (
                      <tr
                        key={t.id}
                        onClick={() => fetchTicket(t.id)}
                        className={`border-t border-gray-700 hover:bg-gray-700/50 cursor-pointer border-l-2 ${priorityBorder(t.priority)}`}
                      >
                        <td className="px-4 py-3 font-mono text-blue-400 text-xs">{t.ticket_number}</td>
                        <td className="px-4 py-3 text-gray-300 text-xs">{maskEmail(t.user_email)}</td>
                        <td className="px-4 py-3 text-gray-100 max-w-xs truncate">{t.subject}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${statusBadge(t.status)}`}>
                            {t.status}
                          </span>
                        </td>
                        <td className={`px-4 py-3 font-medium text-sm ${priorityColor(t.priority)}`}>{t.priority}</td>
                        <td className="px-4 py-3 text-sm">{slaEl}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{timeAgo(t.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {ticketTotal > LIMIT && (
              <div className="flex justify-between items-center px-4 py-3 border-t border-gray-700 bg-gray-800">
                <button
                  disabled={ticketPage === 0}
                  onClick={() => { setTicketPage((p) => p - 1); fetchTickets(ticketPage - 1); }}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm disabled:opacity-40"
                >
                  ← Prev
                </button>
                <span className="text-gray-400 text-sm">
                  {ticketPage * LIMIT + 1}–{Math.min((ticketPage + 1) * LIMIT, ticketTotal)} of {ticketTotal}
                </span>
                <button
                  disabled={(ticketPage + 1) * LIMIT >= ticketTotal}
                  onClick={() => { setTicketPage((p) => p + 1); fetchTickets(ticketPage + 1); }}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            )}
          </div>

          {/* Ticket detail modal */}
          {selectedTicket && (
            <div
              className="fixed inset-0 bg-black/70 flex items-start justify-center z-50 overflow-y-auto p-4"
              onClick={(e) => { if (e.target === e.currentTarget) setSelectedTicket(null); }}
            >
              <div className="bg-gray-800 rounded-2xl w-full max-w-3xl my-8 border border-gray-600 shadow-2xl">

                {/* Modal header */}
                <div className={`p-5 border-b border-gray-700 rounded-t-2xl border-l-4 ${priorityBorder(selectedTicket.priority)}`}>
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-mono text-blue-400 text-xs">{selectedTicket.ticket_number}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${statusBadge(selectedTicket.status)}`}>
                          {selectedTicket.status}
                        </span>
                        <span className={`text-xs font-medium ${priorityColor(selectedTicket.priority)}`}>
                          {selectedTicket.priority}
                        </span>
                        {selectedTicket.category && (
                          <span className={`px-2 py-0.5 rounded-full text-xs ${categoryBadge(selectedTicket.category)}`}>
                            {selectedTicket.category}
                          </span>
                        )}
                      </div>
                      <h2 className="text-lg font-semibold text-white truncate">{selectedTicket.subject}</h2>
                      <p className="text-gray-400 text-xs mt-1">
                        {maskEmail(selectedTicket.user_email)} · {timeAgo(selectedTicket.created_at)}
                        {selectedTicket.tool_name && ` · ${selectedTicket.tool_name}`}
                        {selectedTicket.sentiment && ` · ${sentimentEmoji(selectedTicket.sentiment)} ${selectedTicket.sentiment}`}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {!['resolved', 'closed'].includes(selectedTicket.status) && (
                        <button
                          onClick={() => handleResolve(selectedTicket.id)}
                          className="px-3 py-1.5 bg-green-700 hover:bg-green-600 text-xs rounded-lg transition"
                        >
                          Resolve
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedTicket(null)}
                        className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-xs rounded-lg transition"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>

                {/* Original description */}
                <div className="p-5 border-b border-gray-700 bg-gray-900/30">
                  <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{selectedTicket.description}</p>
                </div>

                {/* Message thread */}
                <div className="p-5 space-y-3 max-h-72 overflow-y-auto">
                  {ticketMessages.length === 0 && (
                    <p className="text-gray-500 text-sm text-center">No replies yet</p>
                  )}
                  {ticketMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`rounded-xl p-3 text-sm ${
                        msg.sender_type === 'user'
                          ? 'bg-gray-700 mr-8'
                          : msg.is_internal
                          ? 'bg-yellow-900/30 border border-yellow-800 ml-8'
                          : 'bg-blue-900/30 border border-blue-800 ml-8'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs text-gray-400 font-medium">
                          {msg.sender_type === 'agent' ? '🤖 AI Draft'
                           : msg.sender_type === 'admin' ? '👨‍💼 Admin'
                           : '👤 User'}
                          {msg.is_internal && ' · Internal Note'}
                          {msg.needs_human_review && (
                            <span className="ml-2 text-yellow-400">⚠ Needs Review</span>
                          )}
                        </span>
                        <span className="text-xs text-gray-500">{timeAgo(msg.created_at)}</span>
                      </div>
                      <p className="text-gray-200 whitespace-pre-wrap">{msg.message}</p>

                      {/* AI draft approval */}
                      {msg.needs_human_review && msg.status === 'draft' && (
                        <div className="mt-2 pt-2 border-t border-yellow-800/50 flex items-center gap-3">
                          <button
                            onClick={() => handleApproveAI(msg.id)}
                            disabled={savingReply}
                            className="px-3 py-1 bg-green-700 hover:bg-green-600 text-xs rounded-lg disabled:opacity-50 transition"
                          >
                            {savingReply ? 'Sending…' : 'Approve & Send'}
                          </button>
                          <span className="text-xs text-yellow-400">
                            AI confidence: {((msg.ai_confidence || 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Reply composer */}
                <div className="p-5 border-t border-gray-700">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a reply…"
                    rows={3}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-sm text-gray-100 focus:outline-none focus:border-blue-500 resize-none"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={replyInternal}
                        onChange={(e) => setReplyInternal(e.target.checked)}
                        className="rounded w-4 h-4 accent-blue-500"
                      />
                      Internal note
                    </label>
                    <button
                      onClick={handleReply}
                      disabled={!replyText.trim() || savingReply}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-sm rounded-lg disabled:opacity-50 transition"
                    >
                      {savingReply ? 'Sending…' : 'Send Reply'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2 — Bugs ─────────────────────────────────────────────────────── */}
      {activeTab === 'bugs' && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-700 text-gray-300 text-left">
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Severity</th>
                  <th className="px-4 py-3 font-medium">Reported</th>
                  <th className="px-4 py-3 font-medium w-8" />
                </tr>
              </thead>
              <tbody>
                {bugs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No bugs reported</td>
                  </tr>
                )}
                {bugs.map((bug) => (
                  <tbody key={bug.id}>
                    <tr
                      onClick={() => setSelectedBug(selectedBug?.id === bug.id ? null : bug)}
                      className="border-t border-gray-700 hover:bg-gray-700/50 cursor-pointer"
                    >
                      <td className="px-4 py-3 text-gray-100">{bug.title}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${statusBadge(bug.status)}`}>
                          {bug.status}
                        </span>
                      </td>
                      <td className={`px-4 py-3 font-medium ${priorityColor(bug.severity)}`}>{bug.severity}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{timeAgo(bug.created_at)}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs text-center">
                        {selectedBug?.id === bug.id ? '▲' : '▼'}
                      </td>
                    </tr>

                    {selectedBug?.id === bug.id && (
                      <tr>
                        <td colSpan={5} className="bg-gray-700/30 px-6 py-4 border-t border-gray-700">
                          <p className="text-gray-300 text-sm mb-3 whitespace-pre-wrap">{bug.description}</p>

                          {/* Status pipeline */}
                          <div className="flex flex-wrap gap-2 mb-3">
                            {['open', 'in_progress', 'testing', 'resolved', 'wont_fix'].map((s) => (
                              <button
                                key={s}
                                onClick={() => handleBugUpdate(bug.id, { status: s })}
                                className={`px-3 py-1 text-xs rounded-full border transition ${
                                  bug.status === s
                                    ? 'bg-blue-600 border-blue-500 text-white'
                                    : 'border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200'
                                }`}
                              >
                                {s.replace(/_/g, ' ')}
                              </button>
                            ))}
                          </div>

                          {bug.fix_notes && (
                            <p className="text-gray-400 text-xs mb-1">
                              <strong className="text-gray-300">Fix notes:</strong> {bug.fix_notes}
                            </p>
                          )}
                          {bug.ai_reproduction_steps && (
                            <p className="text-gray-400 text-xs">
                              <strong className="text-gray-300">AI repro steps:</strong> {bug.ai_reproduction_steps}
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3 — Features ─────────────────────────────────────────────────── */}
      {activeTab === 'features' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.length === 0 && (
            <p className="col-span-3 text-center text-gray-500 py-8">No feature requests yet</p>
          )}
          {features.map((feat) => {
            const total = (feat.upvotes || 0) + (feat.downvotes || 0);
            const pct   = total > 0 ? (feat.upvotes / total * 100).toFixed(0) : 0;
            return (
              <div key={feat.id} className="bg-gray-800 rounded-xl border border-gray-700 p-4 hover:border-gray-500 transition flex flex-col gap-3">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-semibold text-gray-100 flex-1">{feat.title}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs flex-shrink-0 ${statusBadge(feat.status)}`}>
                    {feat.status}
                  </span>
                </div>

                <p className="text-gray-400 text-sm line-clamp-2">{feat.description}</p>

                {/* Vote bar */}
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>👍 {feat.upvotes || 0}</span>
                    <span>{pct}% approval</span>
                    <span>👎 {feat.downvotes || 0}</span>
                  </div>
                  <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                {/* AI scores */}
                {(feat.ai_impact_score != null || feat.ai_effort_score != null) && (
                  <div className="flex gap-4 text-xs">
                    {feat.ai_impact_score   != null && <span><span className="text-gray-500">Impact </span><span className="text-green-400 font-medium">{feat.ai_impact_score}/10</span></span>}
                    {feat.ai_effort_score   != null && <span><span className="text-gray-500">Effort </span><span className="text-yellow-400 font-medium">{feat.ai_effort_score}/10</span></span>}
                    {feat.ai_priority_score != null && <span><span className="text-gray-500">Priority </span><span className="text-blue-400 font-medium">{feat.ai_priority_score}/10</span></span>}
                  </div>
                )}

                {/* Status pipeline */}
                <div className="flex flex-wrap gap-1 mt-auto">
                  {['open', 'under_review', 'planned', 'in_progress', 'completed', 'rejected'].map((s) => (
                    <button
                      key={s}
                      onClick={() => handleFeatureUpdate(feat.id, { status: s })}
                      className={`px-2 py-0.5 text-xs rounded-full border transition ${
                        feat.status === s
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'border-gray-600 text-gray-500 hover:border-gray-400 hover:text-gray-300'
                      }`}
                    >
                      {s.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TAB 4 — Knowledge Base ───────────────────────────────────────────── */}
      {activeTab === 'kb' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-white">{kbArticles.length} Articles</h2>
            <button
              onClick={() => setShowGenerateModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-sm rounded-lg transition"
            >
              + Generate Article
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {kbArticles.length === 0 && (
              <p className="col-span-2 text-center text-gray-500 py-8">No KB articles yet</p>
            )}
            {kbArticles.map((art) => (
              <div
                key={art.id}
                onClick={() => setSelectedArticle(art)}
                className="bg-gray-800 border border-gray-700 rounded-xl p-4 cursor-pointer hover:border-gray-500 transition"
              >
                <div className="flex justify-between items-start mb-2 gap-2">
                  <h3 className="font-semibold text-gray-100">{art.title}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs flex-shrink-0 ${categoryBadge(art.category)}`}>
                    {art.category}
                  </span>
                </div>
                <p className="text-gray-400 text-sm line-clamp-2 mb-3">
                  {art.summary || (art.content ? art.content.slice(0, 120) + '…' : '')}
                </p>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>👁 {art.view_count || 0}</span>
                  <span>👍 {art.helpful_count || 0}</span>
                  <span>👎 {art.not_helpful_count || 0}</span>
                  <span className="ml-auto">{(art.helpfulness_rate || 0).toFixed(0)}% helpful</span>
                </div>
              </div>
            ))}
          </div>

          {/* KB Article modal */}
          {selectedArticle && (
            <div
              className="fixed inset-0 bg-black/70 flex items-start justify-center z-50 overflow-y-auto p-4"
              onClick={(e) => { if (e.target === e.currentTarget) { setSelectedArticle(null); setEditingArticle(false); } }}
            >
              <div className="bg-gray-800 rounded-2xl w-full max-w-3xl my-8 border border-gray-600 shadow-2xl">
                <div className="p-5 border-b border-gray-700 flex justify-between items-start gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white">{selectedArticle.title}</h2>
                    <span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-xs ${categoryBadge(selectedArticle.category)}`}>
                      {selectedArticle.category}
                    </span>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => setEditingArticle((v) => !v)}
                      className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-sm rounded-lg transition"
                    >
                      {editingArticle ? 'Preview' : 'Edit'}
                    </button>
                    <button
                      onClick={() => { setSelectedArticle(null); setEditingArticle(false); }}
                      className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-sm rounded-lg transition"
                    >
                      Close
                    </button>
                  </div>
                </div>

                <div className="p-5">
                  {editingArticle ? (
                    <textarea
                      value={selectedArticle.content}
                      onChange={(e) => setSelectedArticle((a) => ({ ...a, content: e.target.value }))}
                      rows={22}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-sm text-gray-100 focus:outline-none focus:border-blue-500 resize-none font-mono"
                    />
                  ) : (
                    <div className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                      {selectedArticle.content}
                    </div>
                  )}
                </div>

                <div className="p-5 border-t border-gray-700 flex gap-4 text-sm text-gray-400">
                  <span>👁 {selectedArticle.view_count || 0} views</span>
                  <span>👍 {selectedArticle.helpful_count || 0}</span>
                  <span>👎 {selectedArticle.not_helpful_count || 0}</span>
                  <span className="ml-auto">{(selectedArticle.helpfulness_rate || 0).toFixed(0)}% helpful</span>
                </div>
              </div>
            </div>
          )}

          {/* Generate KB modal */}
          {showGenerateModal && (
            <div
              className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
              onClick={(e) => { if (e.target === e.currentTarget) setShowGenerateModal(false); }}
            >
              <div className="bg-gray-800 rounded-2xl w-full max-w-md border border-gray-600 shadow-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Generate KB Article</h2>
                <label className="block text-sm text-gray-400 mb-2">Category</label>
                <select
                  value={generateCategory}
                  onChange={(e) => setGenerateCategory(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-200 mb-4 focus:outline-none focus:border-blue-500"
                >
                  {['technical', 'billing', 'account', 'feature_req', 'bug', 'general'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <p className="text-gray-500 text-xs mb-5">
                  AI analyses recent resolved tickets in this category to write a help article.
                  Requires at least 3 resolved tickets.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowGenerateModal(false)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-sm rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerateKB}
                    disabled={kbGenerating}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-sm rounded-lg disabled:opacity-50 transition flex items-center gap-2"
                  >
                    {kbGenerating && (
                      <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                    )}
                    {kbGenerating ? 'Generating…' : 'Generate'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 5 — Analytics ───────────────────────────────────────────────── */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {!dashboard?.analytics ? (
            <p className="text-gray-500 text-center py-8">No analytics data yet — runs weekly via cron.</p>
          ) : (
            <>
              {/* Analytics table */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-700 text-gray-300 text-left">
                        <th className="px-4 py-3 font-medium">Period</th>
                        <th className="px-4 py-3 font-medium">Total</th>
                        <th className="px-4 py-3 font-medium">Resolved</th>
                        <th className="px-4 py-3 font-medium">Avg Res. (h)</th>
                        <th className="px-4 py-3 font-medium">SLA Breached</th>
                        <th className="px-4 py-3 font-medium">CSAT</th>
                        <th className="px-4 py-3 font-medium">Sentiment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(Array.isArray(dashboard.analytics) ? dashboard.analytics : [dashboard.analytics]).map((row, i) => (
                        <tr key={i} className="border-t border-gray-700">
                          <td className="px-4 py-3 text-gray-300">{row.period_date || '—'}</td>
                          <td className="px-4 py-3 text-gray-100">{row.total_tickets ?? '—'}</td>
                          <td className="px-4 py-3 text-green-400">{row.resolved_tickets ?? '—'}</td>
                          <td className="px-4 py-3 text-blue-400">
                            {row.avg_resolution_hours != null ? row.avg_resolution_hours.toFixed(1) : '—'}
                          </td>
                          <td className="px-4 py-3 text-red-400">{row.sla_breached_count ?? '—'}</td>
                          <td className="px-4 py-3 text-yellow-400">
                            {row.avg_csat_score != null ? `${row.avg_csat_score.toFixed(1)}/5` : '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-400">
                            {row.positive_sentiment_pct != null ? `${row.positive_sentiment_pct.toFixed(0)}% 😊` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Category bar chart */}
              {dashboard.category_breakdown && Object.keys(dashboard.category_breakdown).length > 0 && (
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                  <h3 className="text-gray-300 font-medium mb-4">Tickets by Category</h3>
                  <div className="space-y-2">
                    {(() => {
                      const vals = Object.values(dashboard.category_breakdown);
                      const max  = Math.max(...vals, 1);
                      return Object.entries(dashboard.category_breakdown).map(([cat, count]) => (
                        <div key={cat} className="flex items-center gap-3">
                          <span className="text-gray-400 text-sm w-28 flex-shrink-0">{cat}</span>
                          <div className="flex-1 h-5 bg-gray-700 rounded overflow-hidden">
                            <div
                              className="h-full bg-blue-600 rounded"
                              style={{ width: `${(count / max * 100).toFixed(1)}%` }}
                            />
                          </div>
                          <span className="text-gray-400 text-sm w-8 text-right">{count}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}

              {/* Priority bar chart */}
              {dashboard.priority_breakdown && Object.keys(dashboard.priority_breakdown).length > 0 && (
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                  <h3 className="text-gray-300 font-medium mb-4">Tickets by Priority</h3>
                  <div className="space-y-2">
                    {(() => {
                      const vals   = Object.values(dashboard.priority_breakdown);
                      const max    = Math.max(...vals, 1);
                      const colors = { critical: 'bg-red-600', high: 'bg-orange-500', medium: 'bg-yellow-500', low: 'bg-green-500' };
                      return Object.entries(dashboard.priority_breakdown).map(([pri, count]) => (
                        <div key={pri} className="flex items-center gap-3">
                          <span className={`text-sm w-20 flex-shrink-0 ${priorityColor(pri)}`}>{pri}</span>
                          <div className="flex-1 h-5 bg-gray-700 rounded overflow-hidden">
                            <div
                              className={`h-full rounded ${colors[pri] || 'bg-blue-600'}`}
                              style={{ width: `${(count / max * 100).toFixed(1)}%` }}
                            />
                          </div>
                          <span className="text-gray-400 text-sm w-8 text-right">{count}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── TAB 6 — Settings ─────────────────────────────────────────────────── */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl space-y-6">

          {/* SLA config */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
            <h3 className="text-gray-200 font-semibold mb-4">SLA Hours (response deadline)</h3>
            <div className="grid grid-cols-2 gap-4">
              {['critical', 'high', 'medium', 'low'].map((lvl) => (
                <div key={lvl}>
                  <label className={`block text-sm mb-1 font-medium ${priorityColor(lvl)}`}>
                    {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={slaConfig[lvl]}
                    onChange={(e) => setSlaConfig((c) => ({ ...c, [lvl]: Number(e.target.value) }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              ))}
            </div>
            <p className="text-gray-500 text-xs mt-3">
              Visual only — persist changes in <code className="text-gray-400">support-agent.js</code> SLA constants.
            </p>
          </div>

          {/* Auto-close */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
            <h3 className="text-gray-200 font-semibold mb-4">Auto-close Settings</h3>
            <label className="block text-sm text-gray-400 mb-2">
              Close <code className="text-gray-300">waiting_user</code> tickets after (days)
            </label>
            <input
              type="number"
              min={1}
              value={autoCloseDays}
              onChange={(e) => setAutoCloseDays(Number(e.target.value))}
              className="w-32 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-blue-500"
            />
            <p className="text-gray-500 text-xs mt-3">
              Controlled by <code className="text-gray-400">support.cron.js autoCloseJob</code> — update <code className="text-gray-400">sevenDaysAgo</code> to persist.
            </p>
          </div>

          {/* AI rules */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
            <h3 className="text-gray-200 font-semibold mb-4">AI Auto-Reply Rules</h3>
            <div className="space-y-3">
              {[
                { key: 'skipBilling', label: 'Skip AI auto-reply for billing tickets' },
                { key: 'skipAngry',   label: 'Skip AI auto-reply when sentiment is frustrated / negative' },
                { key: 'skipRefund',  label: 'Skip AI auto-reply for refund / fraud keywords' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={aiRules[key]}
                    onChange={(e) => setAiRules((r) => ({ ...r, [key]: e.target.checked }))}
                    className="rounded w-4 h-4 accent-blue-500"
                  />
                  <span className="text-sm text-gray-300">{label}</span>
                </label>
              ))}
            </div>
            <p className="text-gray-500 text-xs mt-3">
              Governed by <code className="text-gray-400">needs_human_review</code> logic in <code className="text-gray-400">support-agent.js</code>.
            </p>
          </div>

          <button
            disabled={savingSettings}
            onClick={() => {
              setSavingSettings(true);
              setTimeout(() => setSavingSettings(false), 1200);
            }}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-sm rounded-lg disabled:opacity-60 font-medium transition"
          >
            {savingSettings ? 'Saved ✓' : 'Save Settings'}
          </button>
        </div>
      )}

    </div>
  );
}
