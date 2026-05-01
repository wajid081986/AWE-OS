import { useState, useEffect } from 'react';
import api from '../../../services/api.service';

const slugify = (s) => s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

const CATEGORIES  = ['finance', 'investment', 'math', 'business', 'tax', 'other'];
const FIELD_TYPES = ['number', 'text', 'select'];
const BLANK_FIELD = { name: '', label: '', type: 'number', placeholder: '', required: true, options: '' };

const BLANK_FORM = {
  name: '', slug: '', description: '', category: 'finance',
  formula: '', output_label: 'Result', output_prefix: '', output_suffix: '',
  adsense_slot_id: '', meta_title: '', meta_description: '', is_published: false,
};

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-gray-600'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
      <span className="text-sm text-gray-300">{label}</span>
    </label>
  );
}

function Toast({ message, type }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {message}
    </div>
  );
}

export default function CalculatorBuilder() {
  const [view, setView]         = useState('list'); // 'list' | 'form'
  const [editId, setEditId]     = useState(null);
  const [calcs, setCalcs]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState(null);
  const [slugLocked, setSlugLocked] = useState(false);

  const [form, setForm]   = useState({ ...BLANK_FORM });
  const [fields, setFields] = useState([{ ...BLANK_FIELD }]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadList = () => {
    setLoading(true);
    api.get('/api/calculators/admin/all')
      .then(r => { setCalcs(r.data); setLoading(false); })
      .catch(() => { showToast('Failed to load calculators', 'error'); setLoading(false); });
  };

  useEffect(() => { loadList(); }, []);

  const openCreate = () => {
    setForm({ ...BLANK_FORM });
    setFields([{ ...BLANK_FIELD }]);
    setSlugLocked(false);
    setEditId(null);
    setView('form');
  };

  const openEdit = (calc) => {
    setForm({
      name:             calc.name,
      slug:             calc.slug,
      description:      calc.description || '',
      category:         calc.category || 'finance',
      formula:          calc.formula || '',
      output_label:     calc.output_label || 'Result',
      output_prefix:    calc.output_prefix || '',
      output_suffix:    calc.output_suffix || '',
      adsense_slot_id:  calc.adsense_slot_id || '',
      meta_title:       calc.meta_title || '',
      meta_description: calc.meta_description || '',
      is_published:     calc.is_published || false,
    });
    const rawFields = calc.inputs || [];
    setFields(
      rawFields.length
        ? rawFields.map(f => ({ ...f, options: Array.isArray(f.options) ? f.options.join(', ') : (f.options || '') }))
        : [{ ...BLANK_FIELD }]
    );
    setSlugLocked(true);
    setEditId(calc.id);
    setView('form');
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this calculator?')) return;
    try {
      await api.delete(`/api/calculators/${id}`);
      showToast('Deleted');
      loadList();
    } catch {
      showToast('Delete failed', 'error');
    }
  };

  const togglePublish = async (calc) => {
    try {
      await api.put(`/api/calculators/${calc.id}`, { is_published: !calc.is_published });
      showToast(calc.is_published ? 'Unpublished' : 'Published');
      loadList();
    } catch {
      showToast('Update failed', 'error');
    }
  };

  const setName = (name) =>
    setForm(f => ({ ...f, name, ...(!slugLocked ? { slug: slugify(name) } : {}) }));

  const updateField = (i, key, value) => {
    setFields(prev => {
      const next = [...prev];
      next[i] = { ...next[i], [key]: value };
      if (key === 'label') {
        next[i].name = value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      }
      return next;
    });
  };

  const buildPayload = () => ({
    ...form,
    inputs: fields
      .filter(f => f.name?.trim() && f.label?.trim())
      .map(f => ({
        name:        f.name.trim(),
        label:       f.label.trim(),
        type:        f.type,
        placeholder: f.placeholder || '',
        required:    Boolean(f.required),
        options:     f.type === 'select'
          ? f.options.split(',').map(o => o.trim()).filter(Boolean)
          : [],
      })),
  });

  const save = async () => {
    if (!form.name.trim() || !form.slug.trim() || !form.formula.trim()) {
      showToast('Name, slug and formula are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      if (editId) {
        await api.put(`/api/calculators/${editId}`, payload);
      } else {
        await api.post('/api/calculators', payload);
      }
      showToast(form.is_published ? 'Published!' : 'Draft saved');
      loadList();
      setView('list');
    } catch (err) {
      showToast(err.response?.data?.error || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── List View ──────────────────────────────────────────────────
  if (view === 'list') return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Calculators</h1>
          <button
            onClick={openCreate}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + Create Calculator
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-gray-800 rounded-xl h-14 animate-pulse" />
            ))}
          </div>
        ) : calcs.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 mb-4">No calculators yet</p>
            <button onClick={openCreate} className="text-indigo-400 hover:text-indigo-300 text-sm">
              Create your first calculator →
            </button>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Category</th>
                  <th className="text-left px-4 py-3">Published</th>
                  <th className="text-left px-4 py-3">AdSense</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {calcs.map(calc => (
                  <tr key={calc.id} className="hover:bg-gray-700/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{calc.name}</p>
                      <p className="text-gray-500 text-xs font-mono">{calc.slug}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-indigo-900 text-indigo-300 px-2 py-0.5 rounded-full capitalize">
                        {calc.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => togglePublish(calc)}
                        className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
                          calc.is_published
                            ? 'bg-green-900 text-green-300 hover:bg-green-800'
                            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                        }`}
                      >
                        {calc.is_published ? 'Live' : 'Draft'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs ${calc.adsense_slot_id ? 'text-green-400' : 'text-gray-500'}`}>
                        {calc.adsense_slot_id ? 'Configured' : 'None'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <a
                          href={`/calculators/${calc.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-gray-400 hover:text-white text-xs transition-colors"
                        >
                          Preview
                        </a>
                        <button
                          onClick={() => openEdit(calc)}
                          className="text-indigo-400 hover:text-indigo-300 text-xs transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(calc.id)}
                          className="text-red-400 hover:text-red-300 text-xs transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );

  // ── Form View ──────────────────────────────────────────────────
  const fieldNames = fields.filter(f => f.name?.trim()).map(f => f.name);

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-3">
          <button onClick={() => setView('list')} className="text-gray-400 hover:text-white text-sm transition-colors">
            ← Calculators
          </button>
          <span className="text-gray-600">/</span>
          <span className="text-white text-sm">{editId ? 'Edit Calculator' : 'New Calculator'}</span>
        </div>

        {/* Section 1 — Basic Info */}
        <section className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Basic Info</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Name <span className="text-red-400">*</span></label>
              <input
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. EMI Calculator"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Slug <span className="text-red-400">*</span></label>
              <input
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.slug}
                onChange={e => { setSlugLocked(true); setForm(f => ({ ...f, slug: slugify(e.target.value) })); }}
                placeholder="emi-calculator"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm text-gray-300 mb-1">Description</label>
              <textarea
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={2}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What does this calculator do?"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Category</label>
              <select
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* Section 2 — Input Fields */}
        <section className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Input Fields</h2>
            <button
              type="button"
              onClick={() => setFields(p => [...p, { ...BLANK_FIELD }])}
              className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              + Add Field
            </button>
          </div>
          <div className="space-y-3">
            {fields.map((field, i) => (
              <div key={i} className="bg-gray-700 border border-gray-600 rounded-lg p-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Label</label>
                    <input
                      className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      value={field.label}
                      onChange={e => updateField(i, 'label', e.target.value)}
                      placeholder="Loan Amount (₹)"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Variable name</label>
                    <input
                      className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1.5 text-white text-sm font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      value={field.name}
                      onChange={e => updateField(i, 'name', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                      placeholder="principal"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Type</label>
                    <select
                      className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      value={field.type}
                      onChange={e => updateField(i, 'type', e.target.value)}
                    >
                      {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="flex items-end justify-between gap-2 pb-0.5">
                    <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={e => updateField(i, 'required', e.target.checked)}
                        className="accent-indigo-500"
                      />
                      Required
                    </label>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setFields(p => p.filter((_, idx) => idx !== i))}
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Placeholder</label>
                    <input
                      className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      value={field.placeholder}
                      onChange={e => updateField(i, 'placeholder', e.target.value)}
                      placeholder="500000"
                    />
                  </div>
                  {field.type === 'select' && (
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Options (comma-separated)</label>
                      <input
                        className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        value={field.options}
                        onChange={e => updateField(i, 'options', e.target.value)}
                        placeholder="5, 12, 18, 28"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3 — Formula */}
        <section className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-1">Formula <span className="text-red-400">*</span></h2>
          <p className="text-xs text-gray-400 mb-3">
            Write a JS expression using your input variable names.
          </p>
          {fieldNames.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="text-xs text-gray-500 self-center">Variables:</span>
              {fieldNames.map(name => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, formula: f.formula + name }))}
                  className="text-xs bg-indigo-900 hover:bg-indigo-800 text-indigo-300 px-2 py-1 rounded font-mono transition-colors"
                >
                  {name}
                </button>
              ))}
            </div>
          )}
          <textarea
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y font-mono text-sm"
            rows={4}
            value={form.formula}
            onChange={e => setForm(f => ({ ...f, formula: e.target.value }))}
            placeholder="(principal * (rate/1200) * Math.pow(1 + rate/1200, tenure)) / (Math.pow(1 + rate/1200, tenure) - 1)"
          />
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Output Label</label>
              <input
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={form.output_label}
                onChange={e => setForm(f => ({ ...f, output_label: e.target.value }))}
                placeholder="Monthly EMI"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Prefix (e.g. ₹)</label>
              <input
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={form.output_prefix}
                onChange={e => setForm(f => ({ ...f, output_prefix: e.target.value }))}
                placeholder="₹"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Suffix (e.g. /month)</label>
              <input
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={form.output_suffix}
                onChange={e => setForm(f => ({ ...f, output_suffix: e.target.value }))}
                placeholder="/month"
              />
            </div>
          </div>
        </section>

        {/* Section 4 — SEO */}
        <section className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">SEO</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Meta Title</label>
              <input
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.meta_title}
                onChange={e => setForm(f => ({ ...f, meta_title: e.target.value }))}
                placeholder="EMI Calculator - Calculate Loan EMI Online Free"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Meta Description</label>
              <textarea
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={2}
                value={form.meta_description}
                onChange={e => setForm(f => ({ ...f, meta_description: e.target.value }))}
                placeholder="Free EMI calculator for home loan, car loan, personal loan..."
              />
            </div>
          </div>
        </section>

        {/* Section 5 — AdSense */}
        <section className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-1">AdSense</h2>
          <p className="text-xs text-gray-400 mb-4">
            Ad units appear above and below the calculator when a slot ID is set.
          </p>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Ad Slot ID</label>
            <input
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.adsense_slot_id}
              onChange={e => setForm(f => ({ ...f, adsense_slot_id: e.target.value }))}
              placeholder="1234567890"
            />
          </div>
        </section>

        {/* Section 6 — Publish */}
        <section className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <Toggle
            checked={form.is_published}
            onChange={v => setForm(f => ({ ...f, is_published: v }))}
            label="Publish (make visible to public)"
          />
        </section>

        {/* Save Buttons */}
        <div className="flex gap-3 justify-end pb-8">
          <button
            type="button"
            onClick={() => setView('list')}
            className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : (form.is_published ? 'Save & Publish' : 'Save Draft')}
          </button>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
