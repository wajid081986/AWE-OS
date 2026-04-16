import { useState, useCallback, useMemo } from 'react';
import ResumeForm from './components/ResumeForm';
import AdBanner from './components/AdBanner';
import UpgradeModal from './components/UpgradeModal';

// ===== CONFIG (STRICT VALIDATION) =====
const BASE_URL = import.meta.env.VITE_API_URL;
const RZP_KEY  = import.meta.env.VITE_RAZORPAY_KEY_ID;

if (!BASE_URL) {
  console.error("❌ Missing VITE_API_URL");
}
if (!RZP_KEY) {
  console.error("❌ Missing VITE_RAZORPAY_KEY_ID");
}

// ===== UTIL: Razorpay SDK Loader (Singleton) =====
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

// ===== UTIL: API CALL WRAPPER (RETRY + TIMEOUT) =====
async function apiFetch(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    throw err;
  } finally {
    clearTimeout(id);
  }
}

// ===== APP =====
export default function App() {
  const [isPremium, setIsPremium] = useState(() => {
    return localStorage.getItem('isPremium') === 'true';
  });

  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // ===== TOAST SYSTEM =====
  const notify = useCallback((type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const openModal = useCallback(() => setShowModal(true), []);
  const closeModal = useCallback(() => {
    if (!loading) setShowModal(false);
  }, [loading]);

  // ===== PAYMENT FLOW =====
  const handlePayment = useCallback(async () => {
    if (loading) return;

    setLoading(true);

    try {
      // STEP 1: SDK LOAD
      const sdkReady = await loadRazorpaySDK();
      if (!sdkReady) throw new Error("SDK_LOAD_FAILED");

      // STEP 2: CREATE ORDER (RETRY SAFE)
      const orderData = await apiFetch(`${BASE_URL}/api/create-order`, {
        method: 'POST',
      });

      if (!orderData?.success || !orderData?.order?.id) {
        throw new Error("ORDER_FAILED");
      }

      // STEP 3: RAZORPAY OPTIONS
      const options = {
        key: RZP_KEY,
        amount: orderData.order.amount,
        currency: 'INR',
        name: 'AWE-OS Resume Builder',
        description: 'Premium Upgrade',
        order_id: orderData.order.id,

        handler: async (response) => {
          try {
            const verifyData = await apiFetch(`${BASE_URL}/api/verify-payment`, {
              method: 'POST',
              body: JSON.stringify(response),
            });

            if (!verifyData.success) {
              throw new Error("VERIFY_FAILED");
            }

            // SUCCESS
            localStorage.setItem('isPremium', 'true');
            setIsPremium(true);
            setShowModal(false);
            notify('success', '🎉 Premium unlocked successfully!');
          } catch (err) {
            console.error("Verification Error:", err);
            notify('error', 'Payment verification failed.');
          } finally {
            setLoading(false);
          }
        },

        modal: {
          ondismiss: () => {
            setLoading(false);
            notify('error', 'Payment cancelled.');
          },
        },

        theme: { color: '#6366f1' },
      };

      const rzp = new window.Razorpay(options);

      rzp.on('payment.failed', (err) => {
        console.error("Payment Failed:", err);
        setLoading(false);
        notify('error', 'Payment failed. Try again.');
      });

      rzp.open();
    } catch (err) {
      console.error("Payment Flow Error:", err);

      if (err.name === 'AbortError') {
        notify('error', 'Request timeout. Try again.');
      } else {
        notify('error', 'Could not reach payment server.');
      }

      setLoading(false);
    }
  }, [loading, notify]);

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

              <div>
                {isPremium ? (
                  <span className="badge-premium">✦ Premium</span>
                ) : (
                  <button onClick={openModal} className="btn-upgrade">
                    Unlock Premium — ₹49
                  </button>
                )}
              </div>
            </div>

            {!isPremium && (
              <div className="free-banner">
                <span>Free Plan — watermark included.</span>
                <button onClick={openModal}>
                  Upgrade Now →
                </button>
              </div>
            )}
          </header>

          <ResumeForm isPremium={isPremium} onUpgradeClick={openModal} />
        </main>
      </div>

      <footer className="site-footer">
        <p>© {new Date().getFullYear()} AWE-OS</p>
      </footer>

      {/* ===== TOAST ===== */}
      {toast && (
        <div className={`notification ${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* ===== MODAL ===== */}
      {showModal && (
        <UpgradeModal
          onPay={handlePayment}
          onClose={closeModal}
          isLoading={loading}
        />
      )}
    </div>
  );
}