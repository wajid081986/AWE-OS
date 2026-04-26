import { useState, useCallback, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ResumeForm   from './components/ResumeForm';
import AdBanner     from './components/AdBanner';
import AuthModal    from './components/AuthModal';
import UpgradeModal from './components/UpgradeModal';
import Dashboard    from './pages/Dashboard';

const BASE_URL = import.meta.env.VITE_API_URL  || 'https://awe-os.onrender.com';
const RZP_KEY  = import.meta.env.VITE_RAZORPAY_KEY_ID;

// ── Razorpay SDK loader ──────────────────────────────────────
let razorpayPromise = null;

function loadRazorpaySDK() {
  if (razorpayPromise) return razorpayPromise;
  razorpayPromise = new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script    = document.createElement('script');
    script.src      = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async    = true;
    script.onload   = () => resolve(true);
    script.onerror  = () => resolve(false);
    document.body.appendChild(script);
  });
  return razorpayPromise;
}

// ── API helper ───────────────────────────────────────────────
function apiFetch(url, options = {}) {
  const token = localStorage.getItem('awe_token');
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  }).then(async (res) => {
    if (res.status === 401) {
      localStorage.removeItem('awe_token');
      throw new Error('TOKEN_EXPIRED');
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  });
}

// ── App ──────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]                     = useState(null);
  const [showAuth, setShowAuth]             = useState(false);
  const [showUpgrade, setShowUpgrade]       = useState(false);
  const [pendingPayment, setPendingPayment] = useState(false);
  const [loading, setLoading]               = useState(false);
  const [toast, setToast]                   = useState(null);

  const isPremium = user?.isPremium || false;

  const notify = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('awe_token');
    if (!token) return;
    apiFetch(`${BASE_URL}/api/auth/me`)
      .then((data) => { if (data.success) setUser(data.user); })
      .catch((err) => {
        if (err.message === 'TOKEN_EXPIRED') notify('error', 'Session expired — please sign in again');
      });
  }, []);

  // Core payment logic
  const startPayment = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setShowUpgrade(false);
    try {
      const ok = await loadRazorpaySDK();
      if (!ok) throw new Error('SDK_FAIL');

      const orderData = await apiFetch(`${BASE_URL}/api/create-order`, { method: 'POST' });
      if (!orderData?.success) throw new Error('ORDER_FAIL');

      if (orderData.order.amount !== 4900 || orderData.order.currency !== 'INR') {
        throw new Error('ORDER_TAMPERED');
      }

      const options = {
        key:         RZP_KEY,
        amount:      orderData.order.amount,
        currency:    orderData.order.currency,
        name:        'AWE-OS Resume Builder',
        description: 'Premium Upgrade — one-time payment',
        order_id:    orderData.order.id,

        handler: async function (response) {
          try {
            const verify = await apiFetch(`${BASE_URL}/api/verify-payment`, {
              method: 'POST',
              body:   JSON.stringify(response),
            });
            if (!verify.success) throw new Error('VERIFY_FAIL');
            setUser((prev) => ({ ...prev, isPremium: true }));
            notify('success', '🎉 Premium unlocked! All templates now available.');
          } catch (err) {
            if (err.message === 'TOKEN_EXPIRED') {
              notify('error', 'Session expired — please sign in and try again');
              setUser(null);
              setShowAuth(true);
            } else {
              notify('error', 'Payment verification failed. Contact support.');
            }
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

        theme: { color: '#4f46e5' },
      };

      const rzp = new window.Razorpay(options);

      rzp.on('payment.failed', (response) => {
        setLoading(false);
        notify('error', `Payment failed: ${response.error?.description || 'Unknown error'}`);
      });

      rzp.open();
    } catch (err) {
      if (err.message === 'TOKEN_EXPIRED') {
        notify('error', 'Session expired — please sign in and try again');
        setUser(null);
        setShowAuth(true);
      } else {
        notify('error', 'Could not start payment — please try again');
      }
      setLoading(false);
    }
  }, [loading]);

  // Upgrade click — show modal for logged-in users, auth gate for guests
  const handleUpgradeClick = useCallback(() => {
    if (!user) {
      setPendingPayment(true);
      setShowAuth(true);
    } else {
      setShowUpgrade(true);
    }
  }, [user]);

  // After successful login / register
  const handleAuthSuccess = useCallback((authUser) => {
    setUser(authUser);
    setShowAuth(false);
    if (pendingPayment) {
      setPendingPayment(false);
      setTimeout(() => setShowUpgrade(true), 150);
    }
  }, [pendingPayment]);

  const handleLogout = () => {
    fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('awe_token')}` },
    }).catch(() => {});
    localStorage.removeItem('awe_token');
    setUser(null);
    notify('success', 'Logged out');
  };

  // ── UI ────────────────────────────────────────────────────
  return (
    <Routes>
      <Route
        path="/dashboard"
        element={localStorage.getItem('awe_token') ? <Dashboard /> : <Navigate to="/" replace />}
      />
      <Route path="*" element={
        <ResumeBuilderUI
          user={user} isPremium={isPremium} loading={loading} toast={toast}
          showAuth={showAuth} setShowAuth={setShowAuth}
          showUpgrade={showUpgrade} setShowUpgrade={setShowUpgrade}
          handleUpgradeClick={handleUpgradeClick}
          handleAuthSuccess={handleAuthSuccess}
          handleLogout={handleLogout}
          startPayment={startPayment}
          setPendingPayment={setPendingPayment}
        />
      } />
    </Routes>
  );
}

function ResumeBuilderUI({
  user, isPremium, loading, toast,
  showAuth, setShowAuth,
  showUpgrade, setShowUpgrade,
  handleUpgradeClick, handleAuthSuccess, handleLogout,
  startPayment, setPendingPayment,
}) {
  return (
    <div className="app">
      <AdBanner position="top" />

      <div className="layout">
        <aside className="sidebar-ad">
          <AdBanner position="sidebar" />
        </aside>

        <main className="main-content">
          {/* ── Dark Header ── */}
          <header className="site-header">
            <div className="site-header-top">
              <div>
                <h1>📄 Resume Builder</h1>
                <p>Create ATS-friendly resumes in minutes</p>
              </div>

              <div className="site-header-actions">
                {user ? (
                  <>
                    <span style={{ fontSize: '12px', color: '#475569' }}>{user.email}</span>
                    {isPremium && <span className="badge-premium">⭐ Pro</span>}
                    <button onClick={handleLogout} className="btn-maybe-later" style={{ padding: '6px 12px', border: '1px solid #1e1e2e', borderRadius: '7px' }}>
                      Logout
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setShowAuth(true)}
                    className="btn-maybe-later"
                    style={{ padding: '6px 12px', border: '1px solid #1e1e2e', borderRadius: '7px' }}
                  >
                    Sign In
                  </button>
                )}

                {!isPremium && (
                  <button
                    onClick={handleUpgradeClick}
                    disabled={loading}
                    className="btn-upgrade"
                  >
                    {loading ? 'Processing…' : '✨ Unlock Premium — ₹49'}
                  </button>
                )}
              </div>
            </div>

            {!isPremium && (
              <div className="free-banner">
                <span>Free Plan — watermark included in PDF</span>
                <button onClick={handleUpgradeClick}>Upgrade Now →</button>
              </div>
            )}
          </header>

          <ResumeForm isPremium={isPremium} onUpgradeClick={handleUpgradeClick} />
        </main>
      </div>

      <footer className="site-footer">
        <p>© {new Date().getFullYear()} AWE-OS — Resume Builder</p>
      </footer>

      {/* Toast */}
      {toast && (
        <div className={`notification ${toast.type}`}>{toast.message}</div>
      )}

      {/* Auth Modal */}
      {showAuth && (
        <AuthModal
          onSuccess={handleAuthSuccess}
          onClose={() => { setShowAuth(false); setPendingPayment(false); }}
        />
      )}

      {/* Upgrade Modal */}
      {showUpgrade && (
        <UpgradeModal
          onPay={startPayment}
          onClose={() => setShowUpgrade(false)}
          isLoading={loading}
        />
      )}
    </div>
  );
}
