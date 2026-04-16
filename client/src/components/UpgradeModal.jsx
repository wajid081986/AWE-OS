import { useEffect } from 'react';

const FEATURES = [
  { icon: '🎨', text: 'Unlock all 3 resume templates' },
  { icon: '🚫', text: 'Remove watermark from PDF' },
  { icon: '⚡', text: 'Priority PDF generation' },
  { icon: '♾️', text: 'Unlimited downloads' },
];

export default function UpgradeModal({ onPay, onClose, isLoading }) {
  // Close on Escape — but not while payment is processing
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !isLoading) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, isLoading]);

  const handleBackdropClick = () => {
    if (!isLoading) onClose();
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >

        {/* Close button — hidden while processing */}
        {!isLoading && (
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        )}

        {/* Header */}
        <div className="modal-header">
          <div className="modal-icon">✦</div>
          <h2 className="modal-title" id="modal-title">Upgrade to Premium</h2>
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

          {/* ===== NEW CODE START ===== */}
          <button
            className="btn-pay"
            onClick={onPay}
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? (
              <>
                <span className="btn-spinner" aria-hidden="true" />
                Processing...
              </>
            ) : (
              'Pay ₹49 — Unlock Premium'
            )}
          </button>
          {/* ===== NEW CODE END ===== */}

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
