import { useEffect } from 'react';

const FEATURES = [
  { icon: '🎨', text: 'Unlock all 3 resume templates' },
  { icon: '🚫', text: 'Remove watermark from PDF' },
  { icon: '⚡', text: 'Priority PDF generation' },
  { icon: '♾️', text: 'Unlimited downloads' },
];

export default function UpgradeModal({ onConfirm, onClose }) {
  // Close on Escape key
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">

        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>

        {/* Header */}
        <div className="modal-header">
          <div className="modal-icon">✦</div>
          <h2 className="modal-title">Upgrade to Premium</h2>
          <p className="modal-subtitle">One-time payment — yours forever</p>
        </div>

        {/* Features */}
        <ul className="modal-features">
          {FEATURES.map((f) => (
            <li key={f.text} className="modal-feature-item">
              <span className="feature-icon">{f.icon}</span>
              <span>{f.text}</span>
            </li>
          ))}
        </ul>

        {/* Price + CTA */}
        <div className="modal-footer">
          <div className="modal-price">
            <span className="price-amount">₹49</span>
            <span className="price-note">one-time · no subscription</span>
          </div>
          <button className="btn-pay" onClick={onConfirm}>
            Pay ₹49 — Unlock Premium
          </button>
          <button className="btn-maybe-later" onClick={onClose}>
            Maybe later
          </button>
        </div>

      </div>
    </div>
  );
}
