import { useState } from 'react';
import ResumeForm from './components/ResumeForm';
import AdBanner from './components/AdBanner';
import UpgradeModal from './components/UpgradeModal';

// ===== RAZORPAY START =====

const BASE_URL = import.meta.env.VITE_API_URL;
const RZP_KEY  = import.meta.env.VITE_RAZORPAY_KEY_ID;

/**
 * Injects the Razorpay checkout script once.
 * Resolves true on success, false on network/script failure.
 */
function loadRazorpaySDK() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }

    const script    = document.createElement('script');
    script.src      = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async    = true;
    script.onload   = () => resolve(true);
    script.onerror  = () => resolve(false);
    document.body.appendChild(script);
  });
}

// ===== RAZORPAY END =====

export default function App() {
  // ===== RAZORPAY START =====
  const [isPremium,      setIsPremium]      = useState(() => localStorage.getItem('isPremium') === 'true');
  const [showModal,      setShowModal]      = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [notification,   setNotification]   = useState(null); // { type: 'success'|'error', message }

  /** Show a self-dismissing toast notification */
  const notify = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  const openModal  = () => setShowModal(true);
  const closeModal = () => { if (!paymentLoading) setShowModal(false); };

  /**
   * Full Razorpay payment flow:
   *  1. Load SDK
   *  2. Create order  (POST /create-order)
   *  3. Open checkout
   *  4. On success → verify (POST /verify-payment)
   *  5. On verified → unlock premium locally
   */
  const handlePayment = async () => {
    setPaymentLoading(true);

    // ── Step 1: Load SDK ──────────────────────────────────────
    const sdkReady = await loadRazorpaySDK();
    if (!sdkReady) {
      setPaymentLoading(false);
      notify('error', 'Payment SDK failed to load. Check your internet connection.');
      return;
    }

    // ── Step 2: Create order ──────────────────────────────────
    let orderData;
    try {
      const res = await fetch(`${BASE_URL}/create-order`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      orderData = await res.json();
    } catch {
      setPaymentLoading(false);
      notify('error', 'Could not reach payment server. Please try again.');
      return;
    }

    if (!orderData?.success || !orderData?.order?.id) {
      setPaymentLoading(false);
      notify('error', 'Order creation failed. Please try again.');
      return;
    }

    // ── Step 3: Open Razorpay checkout ────────────────────────
    const options = {
      key:         RZP_KEY,
      amount:      orderData.order.amount,   // paise from server
      currency:    'INR',
      name:        'AWE-OS Resume Builder',
      description: 'Unlock Premium — one-time',
      order_id:    orderData.order.id,
      theme:       { color: '#6366f1' },

      // ── Step 4: Payment success handler ──────────────────────
      handler: async (razorpayResponse) => {
        try {
          const verifyRes = await fetch(`${BASE_URL}/verify-payment`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(razorpayResponse),
          });

          if (!verifyRes.ok) throw new Error(`HTTP ${verifyRes.status}`);
          const verifyData = await verifyRes.json();

          // ── Step 5: Unlock premium ────────────────────────────
          if (verifyData.success) {
            localStorage.setItem('isPremium', 'true');
            setIsPremium(true);
            setShowModal(false);
            notify('success', 'Payment successful! Premium features unlocked.');
          } else {
            notify('error', 'Payment verification failed. Contact support if you were charged.');
          }
        } catch {
          notify('error', 'Verification error. Contact support if you were charged.');
        } finally {
          setPaymentLoading(false);
        }
      },

      // User closed the Razorpay modal without paying
      modal: {
        ondismiss: () => {
          setPaymentLoading(false);
          notify('error', 'Payment cancelled.');
        },
      },
    };

    const rzp = new window.Razorpay(options);

    // Hard payment failure (card declined, bank error, etc.)
    rzp.on('payment.failed', () => {
      setPaymentLoading(false);
      notify('error', 'Payment failed. Please try a different payment method.');
    });

    rzp.open();
  };
  // ===== RAZORPAY END =====

  return (
    <div className="app">
      <AdBanner position="top" />

      <div className="layout">
        <aside className="sidebar-ad">
          <AdBanner position="sidebar" />
        </aside>

        <main className="main-content">
          <header className="site-header">
            <div className="site-header-top">
              <div>
                <h1>Resume Builder</h1>
                <p>Fill in your details and download a professional PDF resume — free, no sign-up.</p>
              </div>

              <div className="tier-badge-area">
                {isPremium ? (
                  <span className="badge-premium">✦ Premium Activated</span>
                ) : (
                  <button className="btn-upgrade" onClick={openModal}>
                    Unlock Premium — ₹49
                  </button>
                )}
              </div>
            </div>

            {!isPremium && (
              <div className="free-banner">
                <span><strong>Free Plan</strong> — 1 template, watermark on PDF.</span>
                <button className="free-banner-link" onClick={openModal}>
                  Upgrade for all templates + no watermark →
                </button>
              </div>
            )}
          </header>

          <ResumeForm isPremium={isPremium} onUpgradeClick={openModal} />
        </main>
      </div>

      <footer className="site-footer">
        <p>© {new Date().getFullYear()} AWE-OS · Free Resume Builder</p>
      </footer>

      {/* ===== RAZORPAY START ===== */}
      {notification && (
        <div
          className={`notification notification-${notification.type}`}
          role="alert"
          aria-live="polite"
        >
          {notification.type === 'success' ? '✓ ' : '✕ '}
          {notification.message}
        </div>
      )}

      {showModal && (
        <UpgradeModal
          onPay={handlePayment}
          onClose={closeModal}
          isLoading={paymentLoading}
        />
      )}
      {/* ===== RAZORPAY END ===== */}
    </div>
  );
}
