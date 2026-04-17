import { useState, useCallback } from 'react';
import ResumeForm from './components/ResumeForm';
import AdBanner from './components/AdBanner';

// ===== 🔥 HARD FIX (NO ENV BUGS) =====
const BASE_URL = "https://awe-os.onrender.com"; // ✅ direct fix
const RZP_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID;

// ===== Razorpay Loader =====
let razorpayPromise = null;

function loadRazorpaySDK() {
  if (razorpayPromise) return razorpayPromise;

  razorpayPromise = new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;

    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });

  return razorpayPromise;
}

// ===== API CALL =====
async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return res.json();
}

// ===== APP =====
export default function App() {
  const [isPremium, setIsPremium] = useState(() => {
    return localStorage.getItem('isPremium') === 'true';
  });

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // ===== TOAST =====
  const notify = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // ===== 🔥 PAYMENT HANDLER (FINAL CLEAN) =====
  const handlePayment = useCallback(async () => {
    if (loading) return;

    console.log("🚀 Payment Clicked");

    setLoading(true);

    try {
      // 1. Load SDK
      const ok = await loadRazorpaySDK();
      if (!ok) throw new Error("SDK_FAIL");

      console.log("✅ SDK Loaded");

      // 2. Create Order
      console.log("📡 Calling API:", `${BASE_URL}/api/create-order`);

      const orderData = await apiFetch(`${BASE_URL}/api/create-order`, {
        method: 'POST',
      });

      console.log("✅ Order:", orderData);

      if (!orderData?.success) throw new Error("ORDER_FAIL");

      // 3. Razorpay Options
      const options = {
        key: RZP_KEY,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: "AWE-OS Resume Builder",
        description: "Premium Upgrade",
        order_id: orderData.order.id,

        handler: async function (response) {
          try {
            console.log("💳 Payment Success:", response);

            const verify = await apiFetch(`${BASE_URL}/api/verify-payment`, {
              method: 'POST',
              body: JSON.stringify(response),
            });

            if (!verify.success) throw new Error("VERIFY_FAIL");

            // SUCCESS
            localStorage.setItem('isPremium', 'true');
            setIsPremium(true);

            notify('success', '🎉 Premium unlocked!');
          } catch (err) {
            console.error(err);
            notify('error', 'Verification failed');
          } finally {
            setLoading(false);
          }
        },

        modal: {
          ondismiss: () => {
            setLoading(false);
            notify('error', 'Payment cancelled');
          },
        },

        theme: { color: "#6366f1" },
      };

      const rzp = new window.Razorpay(options);

      rzp.on('payment.failed', () => {
        setLoading(false);
        notify('error', 'Payment failed');
      });

      rzp.open();
    } catch (err) {
      console.error("❌ Payment Error:", err);

      notify('error', 'Server connection failed');

      setLoading(false);
    }
  }, [loading]);

  // ===== UI =====
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
                <p>Create professional resumes instantly.</p>
              </div>

              {!isPremium && (
                <button
                  onClick={handlePayment}
                  style={{ zIndex: 9999, position: 'relative', cursor: 'pointer' }}
                  className="btn-upgrade"
                >
                  {loading ? "Processing..." : "Unlock Premium — ₹49"}
                </button>
              )}
            </div>

            {!isPremium && (
              <div className="free-banner">
                <span>Free Plan — watermark included.</span>
                <button
                  onClick={handlePayment}
                  style={{ cursor: 'pointer' }}
                >
                  Upgrade Now →
                </button>
              </div>
            )}
          </header>

          <ResumeForm isPremium={isPremium} onUpgradeClick={handlePayment} />
        </main>
      </div>

      <footer className="site-footer">
        <p>© {new Date().getFullYear()} AWE-OS</p>
      </footer>

      {/* TOAST */}
      {toast && (
        <div className={`notification ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}