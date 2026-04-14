const TEMPLATES = [
  {
    id: 'corporate',
    name: 'Professional Corporate',
    desc: 'Clean, ATS-friendly, navy header',
    premium: false,
  },
  {
    id: 'creative',
    name: 'Creative Designer',
    desc: 'Bold sidebar, teal accents',
    premium: true,
  },
  {
    id: 'minimal',
    name: 'Minimal Elegant',
    desc: 'Premium whitespace, serif type',
    premium: true,
  },
];

function CorporatePreview() {
  return (
    <svg viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg" className="template-svg">
      <rect x="0" y="0" width="120" height="32" fill="#1B3A6B" />
      <rect x="0" y="30" width="120" height="2" fill="#2563EB" />
      <rect x="8" y="8" width="55" height="5" rx="1" fill="#FFFFFF" opacity="0.9" />
      <rect x="8" y="17" width="38" height="3" rx="1" fill="#93C5FD" opacity="0.7" />
      <rect x="8" y="38" width="22" height="2" rx="0.5" fill="#2563EB" />
      <rect x="8" y="43" width="104" height="0.5" fill="#D1D5DB" />
      <rect x="8" y="47" width="80" height="2.5" rx="0.5" fill="#374151" />
      <rect x="8" y="52" width="95" height="2" rx="0.5" fill="#6B7280" opacity="0.6" />
      <rect x="8" y="57" width="70" height="2" rx="0.5" fill="#6B7280" opacity="0.6" />
      <rect x="8" y="66" width="22" height="2" rx="0.5" fill="#2563EB" />
      <rect x="8" y="71" width="104" height="0.5" fill="#D1D5DB" />
      <rect x="8" y="75" width="65" height="3" rx="0.5" fill="#111827" />
      <rect x="8" y="80" width="45" height="2" rx="0.5" fill="#6B7280" opacity="0.7" />
      <rect x="8" y="86" width="90" height="2" rx="0.5" fill="#374151" opacity="0.7" />
      <rect x="8" y="91" width="75" height="2" rx="0.5" fill="#374151" opacity="0.7" />
      <rect x="8" y="100" width="22" height="2" rx="0.5" fill="#2563EB" />
      <rect x="8" y="105" width="104" height="0.5" fill="#D1D5DB" />
      <rect x="8" y="109" width="24" height="9" rx="2" fill="#EFF6FF" />
      <rect x="12" y="112" width="16" height="2" rx="0.5" fill="#2563EB" />
      <rect x="35" y="109" width="20" height="9" rx="2" fill="#EFF6FF" />
      <rect x="39" y="112" width="12" height="2" rx="0.5" fill="#2563EB" />
      <rect x="58" y="109" width="28" height="9" rx="2" fill="#EFF6FF" />
      <rect x="62" y="112" width="20" height="2" rx="0.5" fill="#2563EB" />
    </svg>
  );
}

function CreativePreview() {
  return (
    <svg viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg" className="template-svg">
      <rect x="0" y="0" width="36" height="160" fill="#1A1F36" />
      <rect x="0" y="0" width="36" height="38" fill="#12172A" />
      <rect x="36" y="0" width="2" height="160" fill="#14B8A6" />
      <rect x="4" y="8" width="24" height="4" rx="0.5" fill="#FFFFFF" opacity="0.9" />
      <rect x="4" y="16" width="16" height="2" rx="0.5" fill="#14B8A6" />
      <rect x="4" y="21" width="12" height="1.5" fill="#14B8A6" />
      <rect x="4" y="26" width="22" height="1.5" rx="0.5" fill="#94A3B8" opacity="0.7" />
      <rect x="4" y="30" width="18" height="1.5" rx="0.5" fill="#94A3B8" opacity="0.7" />
      <rect x="4" y="42" width="18" height="1.5" rx="0.5" fill="#14B8A6" />
      <rect x="4" y="46" width="28" height="0.5" fill="#2D3748" />
      <circle cx="6.5" cy="51" r="1.5" fill="#14B8A6" />
      <rect x="10" y="49.5" width="18" height="2" rx="0.5" fill="#CBD5E1" opacity="0.7" />
      <circle cx="6.5" cy="57" r="1.5" fill="#14B8A6" />
      <rect x="10" y="55.5" width="14" height="2" rx="0.5" fill="#CBD5E1" opacity="0.7" />
      <circle cx="6.5" cy="63" r="1.5" fill="#14B8A6" />
      <rect x="10" y="61.5" width="20" height="2" rx="0.5" fill="#CBD5E1" opacity="0.7" />
      <rect x="44" y="14" width="52" height="7" rx="1" fill="#1E293B" opacity="0.85" />
      <rect x="44" y="25" width="20" height="2.5" fill="#14B8A6" />
      <rect x="44" y="35" width="28" height="3" rx="0.5" fill="#0D9488" />
      <rect x="44" y="41" width="68" height="0.5" fill="#E2E8F0" />
      <rect x="44" y="45" width="52" height="2" rx="0.5" fill="#334155" />
      <rect x="44" y="50" width="60" height="2" rx="0.5" fill="#334155" opacity="0.7" />
      <rect x="44" y="64" width="30" height="3" rx="0.5" fill="#0D9488" />
      <rect x="44" y="70" width="68" height="0.5" fill="#E2E8F0" />
      <rect x="44" y="74" width="45" height="2.5" rx="0.5" fill="#1E293B" />
      <rect x="80" y="74" width="28" height="2" rx="0.5" fill="#0D9488" opacity="0.6" />
      <rect x="44" y="80" width="35" height="2" rx="0.5" fill="#64748B" />
      <rect x="44" y="86" width="62" height="2" rx="0.5" fill="#334155" opacity="0.7" />
    </svg>
  );
}

function MinimalPreview() {
  return (
    <svg viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg" className="template-svg">
      <rect x="0" y="0" width="120" height="160" fill="#FFFFFF" />
      <rect x="12" y="18" width="68" height="8" rx="1" fill="#111111" opacity="0.9" />
      <rect x="12" y="30" width="96" height="0.4" fill="#111111" />
      <rect x="12" y="34" width="60" height="2" rx="0.5" fill="#777777" opacity="0.6" />
      <rect x="12" y="38" width="96" height="0.3" fill="#CCCCCC" />
      <rect x="12" y="48" width="22" height="2" rx="0.5" fill="#111111" />
      <rect x="12" y="53" width="96" height="0.3" fill="#CCCCCC" />
      <rect x="12" y="58" width="90" height="2.5" rx="0.5" fill="#333333" opacity="0.7" />
      <rect x="12" y="63" width="75" height="2" rx="0.5" fill="#333333" opacity="0.6" />
      <rect x="12" y="74" width="25" height="2" rx="0.5" fill="#111111" />
      <rect x="12" y="79" width="96" height="0.3" fill="#CCCCCC" />
      <rect x="12" y="84" width="55" height="3" rx="0.5" fill="#111111" opacity="0.85" />
      <rect x="82" y="84" width="26" height="2" rx="0.5" fill="#777777" opacity="0.5" />
      <rect x="12" y="90" width="40" height="2" rx="0.5" fill="#777777" opacity="0.5" />
      <rect x="12" y="96" width="82" height="2" rx="0.5" fill="#333333" opacity="0.6" />
      <circle cx="60" cy="108" r="1.5" fill="#CCCCCC" />
      <rect x="12" y="116" width="20" height="2" rx="0.5" fill="#111111" />
      <rect x="12" y="121" width="96" height="0.3" fill="#CCCCCC" />
      <rect x="12" y="126" width="55" height="3" rx="0.5" fill="#111111" opacity="0.85" />
      <rect x="82" y="126" width="26" height="2" rx="0.5" fill="#777777" opacity="0.5" />
      <rect x="12" y="142" width="22" height="2" rx="0.5" fill="#111111" />
      <rect x="12" y="147" width="96" height="0.3" fill="#CCCCCC" />
      <rect x="12" y="151" width="85" height="2" rx="0.5" fill="#333333" opacity="0.6" />
    </svg>
  );
}

const PREVIEWS = { corporate: CorporatePreview, creative: CreativePreview, minimal: MinimalPreview };

export default function TemplateSelector({ value, onChange, isPremium, onUpgradeClick }) {
  return (
    <div className="card">
      <h2>Choose Template</h2>
      <div className="template-grid">
        {TEMPLATES.map((tpl) => {
          const Preview   = PREVIEWS[tpl.id];
          const locked    = tpl.premium && !isPremium;
          const selected  = value === tpl.id;

          return (
            <button
              key={tpl.id}
              type="button"
              className={`template-card ${selected ? 'selected' : ''} ${locked ? 'locked' : ''}`}
              onClick={() => locked ? onUpgradeClick?.() : onChange(tpl.id)}
              title={locked ? 'Upgrade to Premium to unlock this template' : tpl.name}
            >
              <div className="template-preview">
                <Preview />
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
                    <span className={`template-tier ${isPremium ? 'tier-premium' : 'tier-locked'}`}>
                      {isPremium ? '✦' : '🔒'}
                    </span>
                  )}
                </span>
                <span className="template-desc">{tpl.desc}</span>
              </div>
              {selected && !locked && <span className="template-check">✓</span>}
            </button>
          );
        })}
      </div>

      {!isPremium && (
        <p className="template-upgrade-hint">
          🔒 Creative and Minimal require Premium.{' '}
          <button className="hint-upgrade-link" onClick={onUpgradeClick}>
            Unlock for ₹49 →
          </button>
        </p>
      )}
    </div>
  );
}
