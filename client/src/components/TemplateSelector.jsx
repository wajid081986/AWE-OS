import { useState } from 'react';

const TEMPLATES = [
  {
    id: 'corporate',
    name: 'Professional',
    desc: 'ATS-Friendly, Navy header',
    premium: false,
    categories: ['ats', 'professional'],
    badge: 'ATS-Friendly',
  },
  {
    id: 'creative',
    name: 'Creative',
    desc: 'Bold sidebar, teal accents',
    premium: true,
    categories: ['creative', 'modern'],
    badge: 'Creative',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    desc: 'Clean whitespace, serif type',
    premium: true,
    categories: ['minimal', 'executive'],
    badge: 'Executive',
  },
];

const CATEGORIES = [
  { id: 'all',          label: 'All' },
  { id: 'ats',          label: 'ATS-Friendly' },
  { id: 'creative',     label: 'Creative' },
  { id: 'minimal',      label: 'Minimal' },
  { id: 'executive',    label: 'Executive' },
  { id: 'modern',       label: 'Modern' },
];

function CorporatePreview() {
  return (
    <svg viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg" className="template-svg">
      <rect x="0" y="0" width="120" height="34" fill="#1B3A6B" />
      <rect x="0" y="32" width="120" height="2" fill="#2563EB" />
      <rect x="8" y="8"  width="60" height="5"   rx="1" fill="#FFFFFF" opacity="0.92" />
      <rect x="8" y="17" width="42" height="3"   rx="1" fill="#93C5FD" opacity="0.75" />
      <rect x="8" y="24" width="30" height="2"   rx="1" fill="#BFDBFE" opacity="0.5" />
      {/* Summary section */}
      <rect x="8" y="40" width="22" height="2"   rx="0.5" fill="#2563EB" />
      <rect x="8" y="44" width="104" height="0.5" fill="#D1D5DB" />
      <rect x="8" y="48" width="90"  height="2"  rx="0.5" fill="#374151" />
      <rect x="8" y="53" width="75"  height="2"  rx="0.5" fill="#6B7280" opacity="0.6" />
      {/* Experience */}
      <rect x="8" y="62" width="26" height="2"   rx="0.5" fill="#2563EB" />
      <rect x="8" y="66" width="104" height="0.5" fill="#D1D5DB" />
      <rect x="8" y="70" width="70"  height="3"  rx="0.5" fill="#111827" />
      <rect x="8" y="76" width="48"  height="2"  rx="0.5" fill="#6B7280" opacity="0.7" />
      <rect x="8" y="81" width="95"  height="2"  rx="0.5" fill="#374151" opacity="0.7" />
      <rect x="8" y="86" width="80"  height="2"  rx="0.5" fill="#374151" opacity="0.7" />
      {/* Education */}
      <rect x="8" y="95" width="22"  height="2"  rx="0.5" fill="#2563EB" />
      <rect x="8" y="99" width="104" height="0.5" fill="#D1D5DB" />
      <rect x="8" y="103" width="68" height="3"  rx="0.5" fill="#111827" />
      <rect x="8" y="109" width="40" height="2"  rx="0.5" fill="#6B7280" opacity="0.7" />
      {/* Skills */}
      <rect x="8" y="118" width="18" height="2"  rx="0.5" fill="#2563EB" />
      <rect x="8" y="122" width="104" height="0.5" fill="#D1D5DB" />
      <rect x="8" y="126" width="24" height="9"  rx="2" fill="#EFF6FF" />
      <rect x="12" y="129" width="16" height="2" rx="0.5" fill="#2563EB" />
      <rect x="36" y="126" width="20" height="9" rx="2" fill="#EFF6FF" />
      <rect x="40" y="129" width="12" height="2" rx="0.5" fill="#2563EB" />
      <rect x="60" y="126" width="28" height="9" rx="2" fill="#EFF6FF" />
      <rect x="64" y="129" width="20" height="2" rx="0.5" fill="#2563EB" />
    </svg>
  );
}

function CreativePreview() {
  return (
    <svg viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg" className="template-svg">
      <rect x="0" y="0" width="38" height="160" fill="#1A1F36" />
      <rect x="0" y="0" width="38" height="40"  fill="#12172A" />
      <rect x="38" y="0" width="2" height="160" fill="#14B8A6" />
      <rect x="4" y="8"  width="26" height="4" rx="0.5" fill="#FFFFFF" opacity="0.9" />
      <rect x="4" y="16" width="18" height="2" rx="0.5" fill="#14B8A6" />
      <rect x="4" y="22" width="14" height="1.5" rx="0.5" fill="#14B8A6" opacity="0.6" />
      <rect x="4" y="27" width="24" height="1.5" rx="0.5" fill="#94A3B8" opacity="0.6" />
      <rect x="4" y="31" width="20" height="1.5" rx="0.5" fill="#94A3B8" opacity="0.5" />
      {/* Sidebar labels */}
      <rect x="4" y="46" width="20" height="1.5" rx="0.5" fill="#14B8A6" />
      <rect x="4" y="50" width="30" height="0.5" fill="#2D3748" />
      <circle cx="6.5" cy="55" r="1.5" fill="#14B8A6" />
      <rect x="10" y="53.5" width="20" height="2" rx="0.5" fill="#CBD5E1" opacity="0.7" />
      <circle cx="6.5" cy="61" r="1.5" fill="#14B8A6" />
      <rect x="10" y="59.5" width="15" height="2" rx="0.5" fill="#CBD5E1" opacity="0.6" />
      <circle cx="6.5" cy="67" r="1.5" fill="#14B8A6" />
      <rect x="10" y="65.5" width="22" height="2" rx="0.5" fill="#CBD5E1" opacity="0.6" />
      <circle cx="6.5" cy="73" r="1.5" fill="#14B8A6" />
      <rect x="10" y="71.5" width="18" height="2" rx="0.5" fill="#CBD5E1" opacity="0.5" />
      {/* Main content */}
      <rect x="46" y="10" width="62" height="8"  rx="1" fill="#1E293B" opacity="0.9" />
      <rect x="46" y="22" width="22" height="2.5" fill="#14B8A6" />
      <rect x="46" y="34" width="30" height="2.5" rx="0.5" fill="#0D9488" />
      <rect x="46" y="40" width="70" height="0.5" fill="#E2E8F0" />
      <rect x="46" y="44" width="55" height="2" rx="0.5" fill="#334155" />
      <rect x="46" y="49" width="65" height="2" rx="0.5" fill="#334155" opacity="0.7" />
      <rect x="46" y="60" width="32" height="2.5" rx="0.5" fill="#0D9488" />
      <rect x="46" y="66" width="70" height="0.5" fill="#E2E8F0" />
      <rect x="46" y="70" width="48" height="2.5" rx="0.5" fill="#1E293B" />
      <rect x="84" y="70" width="28" height="2" rx="0.5"  fill="#0D9488" opacity="0.6" />
      <rect x="46" y="76" width="38" height="2" rx="0.5" fill="#64748B" />
      <rect x="46" y="82" width="64" height="2" rx="0.5" fill="#334155" opacity="0.7" />
      <rect x="46" y="88" width="54" height="2" rx="0.5" fill="#334155" opacity="0.6" />
    </svg>
  );
}

function MinimalPreview() {
  return (
    <svg viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg" className="template-svg">
      <rect x="0" y="0" width="120" height="160" fill="#FFFFFF" />
      <rect x="10" y="16" width="72" height="8" rx="1" fill="#111111" opacity="0.9" />
      <rect x="10" y="28" width="100" height="0.5" fill="#111111" />
      <rect x="10" y="32" width="64" height="2" rx="0.5" fill="#777777" opacity="0.5" />
      <rect x="10" y="37" width="100" height="0.3" fill="#CCCCCC" />
      {/* Summary */}
      <rect x="10" y="45" width="24" height="2" rx="0.5" fill="#111111" />
      <rect x="10" y="50" width="100" height="0.3" fill="#CCCCCC" />
      <rect x="10" y="54" width="90"  height="2.5" rx="0.5" fill="#333333" opacity="0.7" />
      <rect x="10" y="59" width="78"  height="2"   rx="0.5" fill="#333333" opacity="0.5" />
      {/* Experience */}
      <rect x="10" y="68" width="26" height="2" rx="0.5" fill="#111111" />
      <rect x="10" y="73" width="100" height="0.3" fill="#CCCCCC" />
      <rect x="10" y="77" width="58"  height="3"  rx="0.5" fill="#111111" opacity="0.85" />
      <rect x="84" y="77" width="26"  height="2"  rx="0.5" fill="#777777" opacity="0.5" />
      <rect x="10" y="83" width="42"  height="2"  rx="0.5" fill="#777777" opacity="0.5" />
      <rect x="10" y="89" width="88"  height="2"  rx="0.5" fill="#333333" opacity="0.6" />
      <rect x="10" y="95" width="72"  height="2"  rx="0.5" fill="#333333" opacity="0.5" />
      {/* Education */}
      <rect x="10" y="104" width="22" height="2" rx="0.5" fill="#111111" />
      <rect x="10" y="109" width="100" height="0.3" fill="#CCCCCC" />
      <rect x="10" y="113" width="60"  height="3" rx="0.5" fill="#111111" opacity="0.85" />
      <rect x="84" y="113" width="26"  height="2" rx="0.5" fill="#777777" opacity="0.5" />
      {/* Skills */}
      <rect x="10" y="125" width="18" height="2" rx="0.5" fill="#111111" />
      <rect x="10" y="130" width="100" height="0.3" fill="#CCCCCC" />
      <rect x="10" y="134" width="88"  height="2" rx="0.5" fill="#333333" opacity="0.6" />
    </svg>
  );
}

const PREVIEWS = { corporate: CorporatePreview, creative: CreativePreview, minimal: MinimalPreview };

export default function TemplateSelector({ value, onChange, isPremium, onUpgradeClick }) {
  const [activeCategory, setActiveCategory] = useState('all');

  const filtered = TEMPLATES.filter(
    tpl => activeCategory === 'all' || tpl.categories.includes(activeCategory)
  );

  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        🎨 Choose Template
      </h2>

      {/* Category pills */}
      <div className="template-categories">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            type="button"
            className={`cat-pill ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Template grid */}
      <div className="template-grid">
        {filtered.map((tpl) => {
          const Preview  = PREVIEWS[tpl.id];
          const locked   = tpl.premium && !isPremium;
          const selected = value === tpl.id;

          return (
            <button
              key={tpl.id}
              type="button"
              className={`template-card ${selected ? 'selected' : ''} ${locked ? 'locked' : ''}`}
              onClick={() => locked ? onUpgradeClick?.() : onChange(tpl.id)}
              title={locked ? 'Upgrade to Premium to unlock' : tpl.name}
            >
              <div className="template-preview">
                {Preview && <Preview />}
                {locked && (
                  <div className="template-lock-overlay">
                    <span className="lock-icon">🔒</span>
                    <span className="lock-label">Premium</span>
                  </div>
                )}
              </div>

              <div className="template-info">
                <span className="template-name">
                  {tpl.name}
                  {tpl.premium && (
                    isPremium
                      ? <span className="badge-gold-shimmer" style={{ marginLeft: '5px' }}>✦ PRO</span>
                      : <span className="tier-locked" style={{ marginLeft: '4px' }}>🔒</span>
                  )}
                </span>
                <span className="template-desc">{tpl.desc}</span>
                {!locked && tpl.id === 'corporate' && (
                  <span className="ats-friendly-badge">ATS-Safe</span>
                )}
              </div>

              {selected && !locked && <span className="template-check">✓</span>}
            </button>
          );
        })}
      </div>

      {!isPremium && (
        <p className="template-upgrade-hint">
          🔒 Creative &amp; Minimal require Premium.{' '}
          <button className="hint-upgrade-link" type="button" onClick={onUpgradeClick}>
            Unlock for ₹49 →
          </button>
        </p>
      )}
    </div>
  );
}
