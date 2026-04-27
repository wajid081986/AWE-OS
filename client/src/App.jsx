import { useState, useCallback, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ResumeForm  from './components/ResumeForm';
import AdBanner    from './components/AdBanner';
import AuthModal   from './components/AuthModal';
import Dashboard   from './pages/Dashboard';
import AdminPanel  from './pages/AdminPanel';

// ── Route guards ─────────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('awe_token');
  return token ? children : <Navigate to="/" replace />;
};

const AdminRoute = ({ children }) => {
  const token      = localStorage.getItem('awe_token');
  const user       = JSON.parse(localStorage.getItem('awe_user') || '{}');
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
  if (!token)                                   return <Navigate to="/" replace />;
  if (!adminEmail || user.email !== adminEmail)  return <Navigate to="/dashboard" replace />;
  return children;
};

const BASE_URL = import.meta.env.VITE_API_URL
              || 'https://awe-os.onrender.com';
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

// ── API helper (injects JWT, handles 401) ───────────────────
// ===== NEW CODE START =====
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
// ===== NEW CODE END =====

// ── App ──────────────────────────────────────────────────────
export default function App() {
  // ===== NEW CODE START =====
  const [user, setUser]                   = useState(null);      // { email, isPremium }
  const [showAuth, setShowAuth]           = useState(false);
  const [pendingPayment, setPendingPayment] = useState(false);
  // ===== NEW CODE END =====
  const [loading, setLoading]             = useState(false);
  const [toast, setToast]                 = useState(null);

  const isPremium = user?.isPremium || false;

  // ── Toast ──────────────────────────────────────────────────
  const notify = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // ===== NEW CODE START =====
  // ── Restore session on mount ───────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('awe_token');
    if (!token) return;

    apiFetch(`${BASE_URL}/api/auth/me`)
      .then((data) => {
        if (data.success) setUser(data.user);
      })
      .catch((err) => {
        if (err.message === 'TOKEN_EXPIRED') {
          notify('error', 'Session expired — please sign in again');
        }
      });
  }, []);
  // ===== NEW CODE END =====

  // ── Core payment logic (requires user to be logged in) ────
  const startPayment = useCallback(async () => {
    if (loading) return;
    setLoading(true);

    try {
      const ok = await loadRazorpaySDK();
      if (!ok) throw new Error('SDK_FAIL');

      const orderData = await apiFetch(`${BASE_URL}/api/create-order`, { method: 'POST' });
      if (!orderData?.success) throw new Error('ORDER_FAIL');

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

            // ===== NEW CODE START =====
            setUser((prev) => ({ ...prev, isPremium: true }));
            // ===== NEW CODE END =====
            notify('success', '🎉 Premium unlocked!');
          } catch (err) {
            console.error(err);
            // ===== NEW CODE START =====
            if (err.message === 'TOKEN_EXPIRED') {
              notify('error', 'Session expired — please sign in and try again');
              setUser(null);
              setShowAuth(true);
            } else {
              notify('error', 'Payment verification failed. Contact support.');
            }
            // ===== NEW CODE END =====
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

        // ===== NEW CODE START =====
        theme: { color: '#6366f1' },
        // ===== NEW CODE END =====
      };

      const rzp = new window.Razorpay(options);

      // ===== NEW CODE START =====
      rzp.on('payment.failed', (response) => {
        setLoading(false);
        notify('error', `Payment failed: ${response.error?.description || 'Unknown error'}`);
      });
      // ===== NEW CODE END =====

      rzp.open();
    } catch (err) {
      console.error('❌ Payment Error:', err);

      // ===== NEW CODE START =====
      if (err.message === 'TOKEN_EXPIRED') {
        notify('error', 'Session expired — please sign in and try again');
        setUser(null);
        setShowAuth(true);
      } else {
        notify('error', 'Could not start payment — please try again');
      }
      // ===== NEW CODE END =====

      setLoading(false);
    }
  }, [loading]);

  // ===== NEW CODE START =====
  // ── Upgrade click — gate behind auth ─────────────────────
  const handleUpgradeClick = useCallback(() => {
    if (!user) {
      setPendingPayment(true);
      setShowAuth(true);
    } else {
      startPayment();
    }
  }, [user, startPayment]);

  // ── After successful login / register ─────────────────────
  const handleAuthSuccess = useCallback((authUser) => {
    setUser(authUser);
    setShowAuth(false);
    if (pendingPayment) {
      setPendingPayment(false);
      setTimeout(() => startPayment(), 150); // let state settle
    }
  }, [pendingPayment, startPayment]);

  const handleLogout = () => {
    localStorage.removeItem('awe_token');
    setUser(null);
    notify('success', 'Logged out');
  };
  // ===== NEW CODE END =====

  // ── UI ────────────────────────────────────────────────────
  return (
    <Routes>
      <Route
        path="/dashboard"
        element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
      />
      <Route
        path="/admin"
        element={<AdminRoute><AdminPanel /></AdminRoute>}
      />
      <Route path="*" element={<ResumeBuilderUI
        user={user} isPremium={isPremium} loading={loading} toast={toast}
        showAuth={showAuth} setShowAuth={setShowAuth}
        handleUpgradeClick={handleUpgradeClick}
        handleAuthSuccess={handleAuthSuccess}
        handleLogout={handleLogout}
        setPendingPayment={setPendingPayment}
      />} />
    </Routes>
  );
}

// Extracted so the router wrapping above stays clean
function ResumeBuilderUI({ user, isPremium, loading, toast, showAuth, setShowAuth,
                           handleUpgradeClick, handleAuthSuccess, handleLogout, setPendingPayment }) {
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

              {/* ===== NEW CODE START ===== */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                {user ? (
                  <>
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>{user.email}</span>
                    <button
                      onClick={handleLogout}
                      className="btn-maybe-later"
                      style={{ padding: '6px 12px' }}
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setShowAuth(true)}
                    className="btn-maybe-later"
                    style={{ padding: '6px 12px' }}
                  >
                    Sign In
                  </button>
                )}

                {!isPremium && (
                  <button
                    onClick={handleUpgradeClick}
                    disabled={loading}
                    style={{ zIndex: 9999, position: 'relative', cursor: loading ? 'not-allowed' : 'pointer' }}
                    className="btn-upgrade"
                  >
                    {loading ? 'Processing…' : 'Unlock Premium — ₹49'}
                  </button>
                )}
              </div>
              {/* ===== NEW CODE END ===== */}
            </div>

            {!isPremium && (
              <div className="free-banner">
                <span>Free Plan — watermark included.</span>
                <button onClick={handleUpgradeClick} style={{ cursor: 'pointer' }}>
                  Upgrade Now →
                </button>
              </div>
            )}
          </header>

          <ResumeForm isPremium={isPremium} onUpgradeClick={handleUpgradeClick} />
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

      {/* ===== NEW CODE START ===== */}
      {showAuth && (
        <AuthModal
          onSuccess={handleAuthSuccess}
          onClose={() => { setShowAuth(false); setPendingPayment(false); }}
        />
      )}
      {/* ===== NEW CODE END ===== */}
    </div>
  );
}
