import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const BASE    = import.meta.env.VITE_API_URL || 'https://awe-os.onrender.com';
const TODAY   = new Date().toISOString().split('T')[0];
const DUE30   = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
const CURRENCIES = [
  { code: 'INR', symbol: '₹', label: '₹ INR' },
  { code: 'USD', symbol: '$', label: '$ USD' },
  { code: 'EUR', symbol: '€', label: '€ EUR' },
];

// ── Reusable UI primitives ────────────────────────────────────────────────────

const inp = 'w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-colors';
const ta  = `${inp} resize-none`;

function Field({ label, required, half, children }) {
  return (
    <div className={half ? 'flex-1 min-w-0' : 'mb-3'}>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function Row({ children }) {
  return <div className="flex gap-3 mb-3">{children}</div>;
}

function SecHead({ icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-700/60">
      <span>{icon}</span>
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{title}</h3>
    </div>
  );
}

function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium text-white animate-pulse-once
      ${type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
      {type === 'error' ? '✗' : '✓'} {msg}
    </div>
  );
}

// ── PDF builder ───────────────────────────────────────────────────────────────

function buildPrintHTML({ biz, client, items, invNum, invDate, dueDate, currency, subtotal, taxTotal, discount, total, notes, terms }) {
  const sym  = CURRENCIES.find(c => c.code === currency)?.symbol || '₹';
  const fmt  = n => `${sym}${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const rows = items.map(it => `
    <tr>
      <td>${it.description || ''}</td>
      <td style="text-align:right">${it.qty}</td>
      <td style="text-align:right">${fmt(it.rate)}</td>
      <td style="text-align:right">${it.tax}%</td>
      <td style="text-align:right">${fmt(Number(it.qty) * Number(it.rate))}</td>
    </tr>`).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ${invNum}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;color:#111827;padding:40px;line-height:1.5}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px}
.co{font-size:22px;font-weight:800;color:#1e3a5f}
.lbl{font-size:28px;font-weight:900;color:#2563eb;text-transform:uppercase;letter-spacing:3px}
.meta{color:#6b7280;font-size:12px;margin-top:2px}
.bill{padding:16px;background:#f9fafb;border-radius:8px;margin-bottom:28px;display:inline-block;min-width:220px}
.bill h4{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:8px}
table{width:100%;border-collapse:collapse;margin-bottom:24px}
th{background:#1e3a5f;color:#fff;padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px}
th:not(:first-child){text-align:right}
td{padding:10px 12px;border-bottom:1px solid #f3f4f6}
td:not(:first-child){text-align:right}
.tot{float:right;width:280px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden}
.tot td{padding:9px 16px;border:none;border-bottom:1px solid #f3f4f6;font-size:13px}
.tot tr:last-child td{font-weight:700;font-size:16px;color:#1e3a5f;border:none}
.notes{clear:both;padding-top:28px;margin-top:8px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280}
@media print{body{padding:20px}}
</style></head><body>
<div class="hdr">
  <div>
    ${biz.logo ? `<img src="${biz.logo}" alt="Business Logo" style="height:56px;object-fit:contain;margin-bottom:10px"><br>` : ''}
    <div class="co">${biz.name || 'Your Business'}</div>
    ${biz.email   ? `<div class="meta">${biz.email}</div>` : ''}
    ${biz.phone   ? `<div class="meta">${biz.phone}</div>` : ''}
    ${biz.address ? `<div class="meta">${biz.address}</div>` : ''}
    ${biz.gst     ? `<div class="meta">GST: ${biz.gst}</div>` : ''}
  </div>
  <div style="text-align:right">
    <div class="lbl">Invoice</div>
    <div style="font-size:14px;font-weight:600;color:#374151;margin-top:4px">${invNum}</div>
    <div class="meta">Date: ${new Date(invDate).toLocaleDateString('en-IN')}</div>
    <div class="meta">Due: ${new Date(dueDate).toLocaleDateString('en-IN')}</div>
  </div>
</div>
<div class="bill">
  <h4>Bill To</h4>
  <p style="font-weight:600;font-size:15px;color:#111827">${client.name}</p>
  ${client.email   ? `<p class="meta">${client.email}</p>` : ''}
  ${client.phone   ? `<p class="meta">${client.phone}</p>` : ''}
  ${client.address ? `<p class="meta">${client.address}</p>` : ''}
  ${client.gst     ? `<p class="meta">GST: ${client.gst}</p>` : ''}
</div>
<table>
  <thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Tax</th><th>Amount</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="tot"><table>
  <tr><td>Subtotal</td><td>${fmt(subtotal)}</td></tr>
  <tr><td>Tax (GST)</td><td>${fmt(taxTotal)}</td></tr>
  ${Number(discount) > 0 ? `<tr><td>Discount</td><td>-${fmt(discount)}</td></tr>` : ''}
  <tr style="background:#f9fafb"><td><strong>Total</strong></td><td><strong>${fmt(total)}</strong></td></tr>
</table></div>
${notes || terms ? `<div class="notes">
  ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
  ${terms ? `<p style="margin-top:8px"><strong>Terms:</strong> ${terms}</p>` : ''}
</div>` : ''}
</body></html>`;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function CreateInvoice() {
  const token   = localStorage.getItem('awe_token');
  const headers = { Authorization: `Bearer ${token}` };

  // Form state
  const [biz,      setBiz]      = useState({ name: '', email: '', phone: '', address: '', gst: '', logo: '' });
  const [client,   setClient]   = useState({ name: '', email: '', phone: '', address: '', gst: '' });
  const [invNum,   setInvNum]   = useState('INV-001');
  const [invDate,  setInvDate]  = useState(TODAY);
  const [dueDate,  setDueDate]  = useState(DUE30);
  const [currency, setCurrency] = useState('INR');
  const [items,    setItems]    = useState([{ description: '', qty: 1, rate: 0, tax: 18 }]);
  const [discount, setDiscount] = useState(0);
  const [notes,    setNotes]    = useState('');
  const [terms,    setTerms]    = useState('Payment is due within 30 days of the invoice date.');

  // UI state
  const [saving,   setSaving]   = useState(false);
  const [toast,    setToast]    = useState(null);

  const sym = CURRENCIES.find(c => c.code === currency)?.symbol || '₹';
  const fmt = n => `${sym}${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  // Auto-set next invoice number
  useEffect(() => {
    if (!token) return;
    axios.get(`${BASE}/api/invoices`, { headers })
      .then(r => {
        const count = (r.data.invoices || r.data.data || []).length;
        setInvNum(`INV-${String(count + 1).padStart(3, '0')}`);
      })
      .catch(() => {});
  }, []);

  const setItem = useCallback((idx, field, val) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it)), []);

  const addItem    = () => setItems(prev => [...prev, { description: '', qty: 1, rate: 0, tax: 18 }]);
  const removeItem = (idx) => setItems(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);

  // Computed totals
  const subtotal = items.reduce((s, it) => s + Number(it.qty) * Number(it.rate), 0);
  const taxTotal = items.reduce((s, it) => s + Number(it.qty) * Number(it.rate) * Number(it.tax) / 100, 0);
  const total    = subtotal + taxTotal - Number(discount);

  const buildPayload = (status = 'pending') => ({
    invoice_number: invNum,
    client_name:    client.name,
    client_info:    { ...client },
    business_info:  { ...biz },
    items: items.map(it => ({
      description: it.description,
      qty:         Number(it.qty),
      rate:        Number(it.rate),
      tax:         Number(it.tax),
      amount:      Number(it.qty) * Number(it.rate),
    })),
    total_amount:   total,
    tax_amount:     taxTotal,
    discount:       Number(discount),
    currency,
    notes,
    terms,
    due_date:       dueDate,
    status,
  });

  const handleSave = async (status = 'pending') => {
    if (!client.name.trim()) return setToast({ msg: 'Client name is required', type: 'error' });
    if (items.every(it => !it.description.trim())) return setToast({ msg: 'Add at least one item', type: 'error' });
    setSaving(true);
    try {
      await axios.post(`${BASE}/api/invoices`, buildPayload(status), { headers });
      setToast({ msg: `Invoice ${status === 'draft' ? 'saved as draft' : 'submitted!'}`, type: 'success' });
      setTimeout(() => { window.location.href = '/tools/invoice'; }, 1600);
    } catch (err) {
      setToast({ msg: err.response?.data?.message || 'Save failed', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handlePDF = () => {
    const w = window.open('', '_blank');
    w.document.write(buildPrintHTML({ biz, client, items, invNum, invDate, dueDate, currency, subtotal, taxTotal, discount, total, notes, terms }));
    w.document.close();
    w.print();
  };

  const handleLogo = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setBiz(b => ({ ...b, logo: ev.target.result }));
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-gray-950 text-white flex-1 flex flex-col">
      {toast && <Toast {...toast} onDone={() => setToast(null)} />}

      {/* ── Sticky Top Bar ── */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between sticky top-14 z-40 shadow-lg">
        <div className="flex items-center gap-3 text-sm">
          <a href="/tools/invoice" className="text-gray-400 hover:text-white transition-colors">← Invoices</a>
          <span className="text-gray-700">/</span>
          <span className="text-white font-medium">New Invoice</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleSave('draft')} disabled={saving}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-lg font-medium transition-colors disabled:opacity-50">
            💾 Save Draft
          </button>
          <button onClick={handlePDF}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-lg font-medium transition-colors">
            📥 Preview PDF
          </button>
          <button onClick={() => handleSave('pending')} disabled={saving}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5">
            {saving
              ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
              : '📤'}
            Submit Invoice
          </button>
        </div>
      </div>

      <div className="flex">
        {/* ── LEFT: Form ── */}
        <div className="w-full lg:w-[440px] xl:w-[480px] bg-gray-900 border-r border-gray-800 min-h-screen overflow-y-auto flex-shrink-0">
          <div className="p-6 space-y-7">

            {/* Section 1 — Business */}
            <section>
              <SecHead icon="🏢" title="Your Business" />
              <Field label="Business Name">
                <input className={inp} value={biz.name} onChange={e => setBiz(b => ({...b, name: e.target.value}))} placeholder="Acme Corp" />
              </Field>
              <Field label="Business Email">
                <input type="email" className={inp} value={biz.email} onChange={e => setBiz(b => ({...b, email: e.target.value}))} placeholder="you@company.com" />
              </Field>
              <Row>
                <Field label="Phone" half>
                  <input className={inp} value={biz.phone} onChange={e => setBiz(b => ({...b, phone: e.target.value}))} placeholder="+91 9999..." />
                </Field>
                <Field label="GST Number" half>
                  <input className={inp} value={biz.gst} onChange={e => setBiz(b => ({...b, gst: e.target.value}))} placeholder="29XXXXX" />
                </Field>
              </Row>
              <Field label="Address">
                <textarea rows={2} className={ta} value={biz.address} onChange={e => setBiz(b => ({...b, address: e.target.value}))} placeholder="123 Main St, City" />
              </Field>
              <Field label="Logo (optional)">
                <input type="file" accept="image/*" onChange={handleLogo}
                  className="w-full text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-gray-700 file:text-gray-300 file:cursor-pointer hover:file:bg-gray-600 transition-colors" />
                {biz.logo && <img src={biz.logo} alt="logo" className="mt-2 h-10 object-contain rounded" />}
              </Field>
            </section>

            {/* Section 2 — Client */}
            <section>
              <SecHead icon="👤" title="Client Information" />
              <Field label="Client Name" required>
                <input className={inp} value={client.name} onChange={e => setClient(c => ({...c, name: e.target.value}))} placeholder="Client / Company" />
              </Field>
              <Field label="Client Email">
                <input type="email" className={inp} value={client.email} onChange={e => setClient(c => ({...c, email: e.target.value}))} placeholder="client@example.com" />
              </Field>
              <Row>
                <Field label="Phone" half>
                  <input className={inp} value={client.phone} onChange={e => setClient(c => ({...c, phone: e.target.value}))} placeholder="+91 8888..." />
                </Field>
                <Field label="Client GST" half>
                  <input className={inp} value={client.gst} onChange={e => setClient(c => ({...c, gst: e.target.value}))} placeholder="GST number" />
                </Field>
              </Row>
              <Field label="Client Address">
                <textarea rows={2} className={ta} value={client.address} onChange={e => setClient(c => ({...c, address: e.target.value}))} placeholder="Client address" />
              </Field>
            </section>

            {/* Section 3 — Invoice Details */}
            <section>
              <SecHead icon="📋" title="Invoice Details" />
              <Row>
                <Field label="Invoice Number" half>
                  <input className={inp} value={invNum} onChange={e => setInvNum(e.target.value)} />
                </Field>
                <Field label="Currency" half>
                  <select className={inp} value={currency} onChange={e => setCurrency(e.target.value)}>
                    {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                  </select>
                </Field>
              </Row>
              <Row>
                <Field label="Invoice Date" half>
                  <input type="date" className={inp} value={invDate} onChange={e => setInvDate(e.target.value)} />
                </Field>
                <Field label="Due Date" half>
                  <input type="date" className={inp} value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </Field>
              </Row>
            </section>

            {/* Section 4 — Line Items */}
            <section>
              <SecHead icon="📦" title="Line Items" />
              <div className="grid grid-cols-[1fr_44px_72px_48px_20px] gap-1.5 text-xs text-gray-500 mb-1.5 px-0.5">
                <span>Description</span>
                <span className="text-center">Qty</span>
                <span className="text-right">Rate</span>
                <span className="text-right">Tax%</span>
                <span />
              </div>
              <div className="space-y-1.5">
                {items.map((it, i) => (
                  <div key={i} className="grid grid-cols-[1fr_44px_72px_48px_20px] gap-1.5 items-center">
                    <input className={inp + ' text-xs'} value={it.description}
                      onChange={e => setItem(i, 'description', e.target.value)} placeholder="Item..." />
                    <input type="number" min="1" className={inp + ' text-xs text-center px-1'} value={it.qty}
                      onChange={e => setItem(i, 'qty', e.target.value)} />
                    <input type="number" min="0" className={inp + ' text-xs text-right px-2'} value={it.rate}
                      onChange={e => setItem(i, 'rate', e.target.value)} />
                    <input type="number" min="0" max="100" className={inp + ' text-xs text-right px-2'} value={it.tax}
                      onChange={e => setItem(i, 'tax', e.target.value)} />
                    <button onClick={() => removeItem(i)}
                      className="text-gray-600 hover:text-red-400 transition-colors text-base leading-none">×</button>
                  </div>
                ))}
              </div>
              <button onClick={addItem}
                className="mt-3 w-full py-2 border border-dashed border-gray-700 rounded-lg text-xs text-gray-500 hover:border-blue-500 hover:text-blue-400 transition-colors">
                + Add Item
              </button>

              {/* Totals summary */}
              <div className="mt-4 bg-gray-800/60 rounded-xl p-4 space-y-2 text-sm border border-gray-700/40">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal</span><span>{fmt(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Tax (GST)</span><span>{fmt(taxTotal)}</span>
                </div>
                <div className="flex justify-between text-gray-400 items-center">
                  <span>Discount</span>
                  <div className="relative w-28">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">{sym}</span>
                    <input type="number" min="0" value={discount}
                      onChange={e => setDiscount(e.target.value)}
                      className="w-full pl-5 pr-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs text-right text-white focus:outline-none focus:border-blue-500" />
                  </div>
                </div>
                <div className="flex justify-between font-bold text-white text-base pt-2 border-t border-gray-700">
                  <span>Total</span><span className="text-blue-400">{fmt(total)}</span>
                </div>
              </div>
            </section>

            {/* Section 5 — Notes */}
            <section className="pb-8">
              <SecHead icon="📝" title="Notes & Terms" />
              <Field label="Payment Notes">
                <textarea rows={3} className={ta} value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Please pay via bank transfer to Acc# 1234..." />
              </Field>
              <Field label="Terms & Conditions">
                <textarea rows={3} className={ta} value={terms} onChange={e => setTerms(e.target.value)} />
              </Field>
            </section>
          </div>
        </div>

        {/* ── RIGHT: Live Preview ── */}
        <div className="hidden lg:flex flex-1 bg-gray-950 p-8 lg:p-10 items-start justify-center overflow-y-auto">
          <div className="w-full max-w-[620px]">
            <p className="text-xs text-gray-600 text-center mb-5 uppercase tracking-widest">Live Preview</p>

            {/* A4 White card */}
            <div className="bg-white text-gray-900 rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] p-10 text-sm leading-relaxed">

              {/* Invoice header */}
              <div className="flex justify-between items-start mb-8">
                <div>
                  {biz.logo && <img src={biz.logo} alt="logo" className="h-12 object-contain mb-2" />}
                  <div className="text-xl font-black text-gray-900">{biz.name || 'Your Business'}</div>
                  {biz.email   && <div className="text-gray-500 text-xs mt-0.5">{biz.email}</div>}
                  {biz.phone   && <div className="text-gray-500 text-xs">{biz.phone}</div>}
                  {biz.address && <div className="text-gray-500 text-xs">{biz.address}</div>}
                  {biz.gst     && <div className="text-gray-500 text-xs">GST: {biz.gst}</div>}
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-blue-600 uppercase tracking-widest">Invoice</div>
                  <div className="text-gray-700 font-mono text-sm mt-1 font-semibold">{invNum}</div>
                  <div className="text-gray-400 text-xs mt-1">
                    Date: {new Date(invDate).toLocaleDateString('en-IN')}
                  </div>
                  <div className="text-gray-400 text-xs">
                    Due: {new Date(dueDate).toLocaleDateString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Bill to */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Bill To</div>
                <div className="font-bold text-gray-900 text-base">{client.name || <span className="text-gray-300 italic font-normal">Client name</span>}</div>
                {client.email   && <div className="text-gray-500 text-xs">{client.email}</div>}
                {client.phone   && <div className="text-gray-500 text-xs">{client.phone}</div>}
                {client.address && <div className="text-gray-500 text-xs">{client.address}</div>}
                {client.gst     && <div className="text-gray-500 text-xs">GST: {client.gst}</div>}
              </div>

              {/* Items table */}
              <table className="w-full mb-6" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#1e3a5f' }}>
                    {['Item', 'Qty', 'Rate', 'Amount'].map((h, i) => (
                      <th key={h} style={{ padding: '10px 12px', color: '#fff', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.5px', textAlign: i === 0 ? 'left' : 'right' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '9px 12px', color: it.description ? '#374151' : '#d1d5db', fontStyle: it.description ? 'normal' : 'italic', fontSize: '12px' }}>
                        {it.description || 'Item description'}
                      </td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#6b7280', fontSize: '12px' }}>{it.qty}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#6b7280', fontSize: '12px' }}>{fmt(it.rate)}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#111827', fontWeight: '600', fontSize: '12px' }}>
                        {fmt(Number(it.qty) * Number(it.rate))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="flex justify-end mb-6">
                <div className="w-60 bg-gray-50 rounded-xl p-4 space-y-1.5 text-xs border border-gray-100">
                  <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
                  <div className="flex justify-between text-gray-500"><span>Tax (GST)</span><span>{fmt(taxTotal)}</span></div>
                  {Number(discount) > 0 && (
                    <div className="flex justify-between text-gray-500"><span>Discount</span><span>-{fmt(discount)}</span></div>
                  )}
                  <div className="flex justify-between font-bold text-gray-900 text-sm pt-2 border-t border-gray-200">
                    <span>Total</span><span className="text-blue-700">{fmt(total)}</span>
                  </div>
                </div>
              </div>

              {/* Notes + terms */}
              {(notes || terms) && (
                <div className="border-t border-gray-100 pt-4 space-y-1 text-xs text-gray-500">
                  {notes && <p><span className="font-semibold text-gray-600">Notes: </span>{notes}</p>}
                  {terms && <p><span className="font-semibold text-gray-600">Terms: </span>{terms}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
