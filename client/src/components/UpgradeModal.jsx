import { useEffect } from 'react';

const FEATURES = [
  { icon: '✅', text: 'All 3 premium resume templates' },
  { icon: '🚫', text: 'No watermark on PDF download' },
  { icon: '✨', text: 'AI Summary writer (unlimited use)' },
  { icon: '📊', text: 'ATS Score checker & tips' },
  { icon: '♾️', text: 'Unlimited PDF downloads' },
  { icon: '📋', text: 'Multiple resume versions' },
];

export default function UpgradeModal({ onPay, onClose, isLoading }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !isLoading) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, isLoading]);

  const handleBackdropClick = () => { if (!isLoading) onClose(); };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-modal-title"
      >
        {/* Close */}
        {!isLoading && (
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        )}

        {/* Header */}
        <div className="modal-header">
          <span className="modal-icon">✨</span>
          <h2 className="modal-title" id="upgrade-modal-title">Unlock Premium Resume Builder</h2>
          <p className="modal-subtitle">One-time payment — yours forever, no subscription</p>
        </div>

        {/* Features list */}
        <ul className="modal-features">
          {FEATURES.map((f) => (
            <li key={f.text} className="modal-feature-item">
              <span className="feature-icon">{f.icon}</span>
              <span>{f.text}</span>
            </li>
          ))}
        </ul>

        {/* Pricing + CTA */}
        <div className="modal-footer">
          <div className="modal-price">
            <span className="price-amount">₹49</span>
            <span className="price-note">one-time · no subscription</span>
          </div>

          <button
            className="btn-pay"
            onClick={onPay}
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? (
              <>
                <span className="btn-spinner" aria-hidden="true" />
                Processing…
              </>
            ) : (
              '🔓 Unlock for ₹49 — One Time'
            )}
          </button>

          <div className="modal-trust">
            <span className="modal-stars">★★★★★</span>
            <span style={{ marginLeft: '6px' }}>4.8/5 from 2,400+ job seekers</span>
          </div>

          <button
            className="btn-maybe-later"
            onClick={onClose}
            disabled={isLoading}
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
