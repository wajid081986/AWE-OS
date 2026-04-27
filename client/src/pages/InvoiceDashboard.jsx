import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'https://awe-os.onrender.com';

const STATUS_CFG = {
  paid:      { label: 'Paid',      dot: '#4ade80', badge: 'bg-green-900/60 text-green-300 border border-green-800'  },
  pending:   { label: 'Pending',   dot: '#facc15', badge: 'bg-yellow-900/60 text-yellow-300 border border-yellow-800' },
  cancelled: { label: 'Cancelled', dot: '#f87171', badge: 'bg-red-900/60 text-red-300 border border-red-800'       },
  draft:     { label: 'Draft',     dot: '#94a3b8', badge: 'bg-gray-700 text-gray-400 border border-gray-600'        },
};

function buildPrintHTML(inv) {
  const sym  = { USD: '$', EUR: '€', INR: '₹' }[inv.currency] || '₹';
  const fmt  = n => `${sym}${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const rows = (Array.isArray(inv.items) ? inv.items : []).map(it => `
    <tr>
      <td>${it.description || ''}</td>
      <td style="text-align:right">${it.qty || 1}</td>
      <td style="text-align:right">${fmt(it.rate || it.amount || 0)}</td>
      <td style="text-align:right">${fmt((it.qty || 1) * (it.rate || it.amount || 0))}</td>
    </tr>`).join('');
  const bi = inv.business_info || {};
  const ci = inv.client_info   || {};
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ${inv.invoice_number || ''}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;color:#111827;padding:40px}
.hdr{display:flex;justify-content:space-between;margin-bottom:40px}
.co{font-size:22px;font-weight:800;color:#1e3a5f}
.lbl{font-size:30px;font-weight:900;color:#2563eb;text-transform:uppercase;letter-spacing:3px}
.meta{color:#6b7280;font-size:12px;margin-top:2px}
.bill{margin-bottom:28px;padding:16px;background:#f9fafb;border-radius:8px}
.bill h4{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:6px}
table{width:100%;border-collapse:collapse;margin-bottom:20px}
th{background:#1e3a5f;color:#fff;padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px}
th:not(:first-child){text-align:right}
td{padding:10px 12px;border-bottom:1px solid #f3f4f6}
td:not(:first-child){text-align:right}
.totals{float:right;width:280px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:30px}
.totals td{padding:8px 16px;border:none;border-bottom:1px solid #f3f4f6;font-size:13px}
.totals tr:last-child td{font-weight:700;font-size:16px;color:#1e3a5f;border:none;padding-top:12px}
.notes{clear:both;padding-top:24px;margin-top:20px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280}
@media print{body{padding:20px}}
</style></head><body>
<div class="hdr">
  <div>
    ${bi.logo ? `<img src="${bi.logo}" style="height:56px;object-fit:contain;margin-bottom:8px"><br>` : ''}
    <div class="co">${bi.name || 'Your Business'}</div>
    ${bi.email   ? `<div class="meta">${bi.email}</div>` : ''}
    ${bi.phone   ? `<div class="meta">${bi.phone}</div>` : ''}
    ${bi.address ? `<div class="meta">${bi.address}</div>` : ''}
    ${bi.gst     ? `<div class="meta">GST: ${bi.gst}</div>` : ''}
  </div>
  <div style="text-align:right">
    <div class="lbl">Invoice</div>
    <div class="meta" style="font-size:14px;font-weight:600;margin-top:4px">${inv.invoice_number || ''}</div>
    <div class="meta">Date: ${new Date(inv.created_at).toLocaleDateString('en-IN')}</div>
    ${inv.due_date ? `<div class="meta">Due: ${new Date(inv.due_date).toLocaleDateString('en-IN')}</div>` : ''}
  </div>
</div>
<div class="bill">
  <h4>Bill To</h4>
  <p style="font-weight:600;font-size:15px">${inv.client_name}</p>
  ${ci.email   ? `<p class="meta">${ci.email}</p>` : ''}
  ${ci.phone   ? `<p class="meta">${ci.phone}</p>` : ''}
  ${ci.address ? `<p class="meta">${ci.address}</p>` : ''}
  ${ci.gst     ? `<p class="meta">GST: ${ci.gst}</p>` : ''}
</div>
<table>
  <thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="totals"><table>
  <tr><td>Subtotal</td><td>${fmt(Number(inv.total_amount) - Number(inv.tax_amount || 0) + Number(inv.discount || 0))}</td></tr>
  ${inv.tax_amount  ? `<tr><td>Tax</td><td>${fmt(inv.tax_amount)}</td></tr>` : ''}
  ${inv.discount    ? `<tr><td>Discount</td><td>-${fmt(inv.discount)}</td></tr>` : ''}
  <tr><td><strong>Total</strong></td><td><strong>${fmt(inv.total_amount)}</strong></td></tr>
</table></div>
${inv.notes || inv.terms ? `<div class="notes">
  ${inv.notes ? `<p><strong>Notes:</strong> ${inv.notes}</p>` : ''}
  ${inv.terms ? `<p style="margin-top:6px"><strong>Terms:</strong> ${inv.terms}</p>` : ''}
</div>` : ''}
</body></html>`;
}

function Spinner() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-950">
      <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );
}

function Toast({ msg, type }) {
  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium text-white
      ${type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
      {type === 'error' ? '✗' : '✓'} {msg}
    </div>
  );
}

function StatCard({ label, value, color, icon, sub }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
      <div className="flex justify-between items-start mb-3">
        <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">{label}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

function ActionBtn({ title, icon, onClick, danger, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      className={`p-1.5 rounded-md text-sm transition-all disabled:opacity-40 ${
        danger ? 'hover:bg-red-900/40 hover:text-red-400 text-gray-500'
               : 'hover:bg-gray-700 hover:text-white text-gray-500'}`}>
      {icon}
    </button>
  );
}

function EmptyState({ tab }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-20 text-center">
      <div className="text-6xl mb-5">🧾</div>
      <h3 className="text-xl font-semibold text-white mb-2">
        {tab === 'all' ? 'No invoices yet' : `No ${tab} invoices`}
      </h3>
      <p className="text-gray-400 mb-6 text-sm">
        {tab === 'all' ? 'Create your first professional invoice' : `You have no ${tab} invoices`}
      </p>
      {tab === 'all' && (
        <a href="/tools/invoice/create"
          className="inline-block bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors text-sm">
          + Create Invoice
        </a>
      )}
    </div>
  );
}

export default function InvoiceDashboard() {
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats]       = useState({ total_revenue: 0, paid_count: 0, pending_count: 0, overdue_count: 0 });
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [tab, setTab]           = useState('all');
  const [search, setSearch]     = useState('');
  const [sortBy, setSortBy]     = useState('date');
  const [toast, setToast]       = useState(null);
  const [deleting, setDeleting] = useState(null);

  const token   = localStorage.getItem('awe_token');
  const headers = { Authorization: `Bearer ${token}` };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchInvoices = async () => {
    setLoading(true); setError(null);
    try {
      const res  = await axios.get(`${BASE}/api/invoices`, { headers });
      const list = res.data.invoices || res.data.data || [];
      setInvoices(list);
      if (res.data.stats) {
        setStats(res.data.stats);
      } else {
        const paid    = list.filter(i => i.status === 'paid');
        const pending = list.filter(i => i.status === 'pending');
        const ago30   = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        setStats({
          total_revenue:  paid.reduce((s, i) => s + Number(i.total_amount || 0), 0),
          paid_count:     paid.length,
          pending_count:  pending.length,
          overdue_count:  pending.filter(i => new Date(i.created_at) < ago30).length,
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this invoice?')) return;
    setDeleting(id);
    try {
      await axios.delete(`${BASE}/api/invoices/${id}`, { headers });
      setInvoices(prev => prev.filter(i => i.id !== id));
      showToast('Invoice deleted');
    } catch (err) {
      showToast(err.response?.data?.message || 'Delete failed', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const handlePDF = (inv) => {
    const w = window.open('', '_blank');
    w.document.write(buildPrintHTML(inv));
    w.document.close();
    w.print();
  };

  const fmtAmount = (inv) => {
    const s = { USD: '$', EUR: '€', INR: '₹' }[inv.currency] || '₹';
    return `${s}${Number(inv.total_amount || 0).toLocaleString('en-IN')}`;
  };

  const filtered = useMemo(() => {
    let list = tab === 'all' ? invoices : invoices.filter(i => i.status === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        i.client_name?.toLowerCase().includes(q) ||
        i.invoice_number?.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'amount') return Number(b.total_amount) - Number(a.total_amount);
      if (sortBy === 'status') return (a.status || '').localeCompare(b.status || '');
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [invoices, tab, search, sortBy]);

  if (loading) return <Spinner />;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {toast && <Toast {...toast} />}

      {/* ── Header ── */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">🧾 Invoice Generator Pro</h1>
            <p className="text-gray-400 text-sm">Manage your professional invoices</p>
          </div>
          <a href="/tools/invoice/create"
            className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2">
            + New Invoice
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Error */}
        {error && (
          <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-red-300 mb-6 flex justify-between items-center">
            <span>⚠ {error}</span>
            <button onClick={fetchInvoices} className="text-sm text-red-400 hover:text-red-200 underline ml-4">Retry</button>
          </div>
        )}

        {/* ── Stats Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Total Revenue" icon="💰" color="text-green-400"
            value={`₹${Number(stats.total_revenue).toLocaleString('en-IN')}`}
            sub="From paid invoices"
          />
          <StatCard
            label="Paid Invoices" icon="✅" color="text-blue-400"
            value={stats.paid_count}
            sub="Successfully collected"
          />
          <StatCard
            label="Pending" icon="⏳" color="text-yellow-400"
            value={stats.pending_count}
            sub="Awaiting payment"
          />
          <StatCard
            label="Overdue" icon="🚨" color="text-red-400"
            value={stats.overdue_count}
            sub="> 30 days pending"
          />
        </div>

        {/* ── Filter Bar ── */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            {/* Status tabs */}
            <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
              {['all', 'pending', 'paid', 'cancelled'].map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-all
                    ${tab === t ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>
                  {t}
                  {t !== 'all' && (
                    <span className="ml-1.5 text-xs opacity-60">
                      {invoices.filter(i => i.status === t).length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex gap-3 items-center flex-wrap">
              {/* Search */}
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">🔍</span>
                <input type="text" placeholder="Search client or #..." value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 w-48 transition-colors" />
              </div>
              {/* Sort */}
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 px-3 py-1.5 focus:outline-none focus:border-blue-500">
                <option value="date">Sort: Date</option>
                <option value="amount">Sort: Amount</option>
                <option value="status">Sort: Status</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Table or Empty ── */}
        {filtered.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-900/80">
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">#</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Client</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium hidden md:table-cell">Date</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium hidden lg:table-cell">Due Date</th>
                    <th className="text-right px-4 py-3 text-gray-400 font-medium">Amount</th>
                    <th className="text-center px-4 py-3 text-gray-400 font-medium">Status</th>
                    <th className="text-right px-4 py-3 text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv, idx) => {
                    const sc = STATUS_CFG[inv.status] || STATUS_CFG.pending;
                    return (
                      <tr key={inv.id}
                        className="border-b border-gray-800/50 hover:bg-gray-800/40 transition-colors group">
                        <td className="px-4 py-3.5 font-mono text-xs text-gray-400">
                          {inv.invoice_number || `#${String(idx + 1).padStart(3, '0')}`}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-medium text-white">{inv.client_name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {inv.client_info?.email || ''}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-gray-400 text-xs hidden md:table-cell">
                          {new Date(inv.created_at).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-4 py-3.5 text-gray-400 text-xs hidden lg:table-cell">
                          {inv.due_date
                            ? new Date(inv.due_date).toLocaleDateString('en-IN')
                            : <span className="text-gray-600">—</span>}
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold text-white">
                          {fmtAmount(inv)}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${sc.badge}`}>
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: sc.dot }} />
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex gap-0.5 justify-end opacity-50 group-hover:opacity-100 transition-opacity">
                            <ActionBtn title="View" icon="👁"
                              onClick={() => window.location.href = `/tools/invoice/${inv.id}`} />
                            <ActionBtn title="Edit" icon="✏️"
                              onClick={() => window.location.href = `/tools/invoice/${inv.id}/edit`} />
                            <ActionBtn title="Download PDF" icon="📥"
                              onClick={() => handlePDF(inv)} />
                            <ActionBtn title="Delete" icon="🗑" danger
                              onClick={() => handleDelete(inv.id)}
                              disabled={deleting === inv.id} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-gray-800 text-xs text-gray-500 flex justify-between items-center">
              <span>{filtered.length} invoice{filtered.length !== 1 ? 's' : ''}{tab !== 'all' ? ` · ${tab}` : ''}</span>
              {search && <span className="text-blue-400">Filtered: "{search}"</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
