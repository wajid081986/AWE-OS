import { useState } from 'react';
import ResumeForm from './components/ResumeForm';
import AdBanner from './components/AdBanner';
import UpgradeModal from './components/UpgradeModal';

// Load Razorpay script
const loadRazorpay = () => {
  return new Promise((resolve) => {
    // Avoid injecting duplicate script
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

// ===== NEW CODE START =====
const BASE_URL = "https://awe-os.onrender.com";
// ===== NEW CODE END =====

export default function App() {
  // ===== NEW CODE START =====
  const [isPremium,      setIsPremium]      = useState(() => localStorage.getItem("isPremium") === "true");
  const [showModal,      setShowModal]      = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [notification,   setNotification]   = useState(null); // { type: 'success'|'error', message }

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const openModal  = () => setShowModal(true);
  const closeModal = () => { if (!paymentLoading) setShowModal(false); };

  const handlePayment = async () => {
    setPaymentLoading(true);

    // 1. Load SDK
    const sdkLoaded = await loadRazorpay();
    if (!sdkLoaded) {
      setPaymentLoading(false);
      showNotification("error", "Payment SDK failed to load. Please check your connection.");
      return;
    }

    // 2. Create order
    let orderData;
    try {
      const orderRes = await fetch(`${BASE_URL}/create-order`, { method: "POST" });
      orderData = await orderRes.json();
    } catch {
      setPaymentLoading(false);
      showNotification("error", "Could not reach payment server. Please try again.");
      return;
    }

    if (!orderData.success) {
      setPaymentLoading(false);
      showNotification("error", "Order creation failed. Please try again.");
      return;
    }

    // 3. Open Razorpay checkout
    const options = {
      key:         import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount:      orderData.order.amount,
      currency:    "INR",
      name:        "AWE-OS Resume Builder",
      description: "Unlock Premium",
      order_id:    orderData.order.id,
      theme:       { color: "#6366f1" },

      handler: async function (response) {
        // 4. Verify payment
        try {
          const verifyRes = await fetch(`${BASE_URL}/verify-payment`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(response),
          });
          const verifyData = await verifyRes.json();

          if (verifyData.success) {
            localStorage.setItem("isPremium", "true");
            setIsPremium(true);
            setShowModal(false);
            showNotification("success", "Payment successful! Premium unlocked.");
          } else {
            showNotification("error", "Payment verification failed. Contact support if charged.");
          }
        } catch {
          showNotification("error", "Verification error. Contact support if charged.");
        } finally {
          setPaymentLoading(false);
        }
      },

      modal: {
        ondismiss: () => {
          setPaymentLoading(false);
          showNotification("error", "Payment cancelled.");
        },
      },
    };

    const paymentObject = new window.Razorpay(options);

    paymentObject.on("payment.failed", () => {
      setPaymentLoading(false);
      showNotification("error", "Payment failed. Please try again.");
    });

    paymentObject.open();
  };
  // ===== NEW CODE END =====

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

      {/* ===== NEW CODE START ===== */}
      {notification && (
        <div className={`notification notification-${notification.type}`} role="alert">
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
      {/* ===== NEW CODE END ===== */}
    </div>
  );
}
