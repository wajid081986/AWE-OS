import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const BASE = import.meta.env.VITE_API_URL || 'https://awe-os.onrender.com';

export default function UserDashboard() {
  const navigate   = useNavigate();
  const token      = localStorage.getItem('awe_token');
  const user       = JSON.parse(localStorage.getItem('awe_user') || '{}');
  const isPremium  = user.isPremium || false;
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
  const isAdmin    = user.email && adminEmail && user.email === adminEmail;
  const headers    = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };

  const [upgrading,   setUpgrading]   = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error,       setError]       = useState(null);

  const handleUpgrade = async () => {
    try {
      setUpgrading(true);
      setError(null);

      const res  = await fetch(BASE + '/api/payment/create-order', { method: 'POST', headers });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Order creation failed');
      const { order } = data;

      if (!window.Razorpay) {
        await new Promise((resolve, reject) => {
          const script    = document.createElement('script');
          script.src      = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload   = resolve;
          script.onerror  = reject;
          document.body.appendChild(script);
        });
      }

      const options = {
        key:         import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount:      order.amount,
        currency:    order.currency,
        name:        'AWE-OS',
        description: 'Premium Upgrade — Lifetime Access',
        order_id:    order.id,
        handler: async (response) => {
          try {
            const vRes  = await fetch(BASE + '/api/payment/verify', {
              method: 'POST',
              headers,
              body: JSON.stringify({
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
              }),
            });
            const vData = await vRes.json();
            if (!vData.success) throw new Error('Verification failed');

            const updatedUser = { ...user, isPremium: true };
            localStorage.setItem('awe_user', JSON.stringify(updatedUser));
            setShowSuccess(true);
            setTimeout(() => window.location.reload(), 2000);
          } catch {
            setError('Payment verification failed. Contact support.');
            setUpgrading(false);
          }
        },
        prefill: { name: user.name || '', email: user.email || '' },
        theme:   { color: '#4f46e5' },
        modal:   { ondismiss: () => setUpgrading(false) },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => {
        setError('Payment failed. Please try again.');
        setUpgrading(false);
      });
      rzp.open();
    } catch (err) {
      setError(err.message || 'Payment failed. Try again.');
      setUpgrading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('awe_token');
    localStorage.removeItem('awe_user');
    navigate('/', { replace: true });
  };

  return (
    <div style={S.page}>
      <style>{`
        @keyframes spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes slideIn { from{transform:translateX(110%);opacity:0} to{transform:translateX(0);opacity:1} }
        * { box-sizing: border-box; }
        body { margin: 0; }
      `}</style>

      {showSuccess && (
        <div style={S.successToast}>
          ✅ Premium Activated! Welcome to AWE-OS Pro!
        </div>
      )}

      <header style={S.header}>
        <div>
          <h1 style={S.h1}>AWE-OS Dashboard</h1>
          <p style={S.subtitle}>Welcome back, {user.email || 'User'}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {isAdmin && (
            <button onClick={() => navigate('/admin')} style={S.btnAdmin}>
              ⚙ Admin Panel →
            </button>
          )}
          <button onClick={() => navigate('/')} style={S.btnSecondary}>
            ← Resume Builder
          </button>
          <button onClick={handleLogout} style={S.btnGhost}>
            Logout
          </button>
        </div>
      </header>

      <div style={S.body}>
        {/* Plan card */}
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={S.cardTitle}>Your Plan</h2>
            <span style={isPremium ? S.badgePremium : S.badgeFree}>
              {isPremium ? '⭐ Premium' : 'Free'}
            </span>
          </div>

          {isPremium ? (
            <div>
              <p style={{ color: '#4ade80', fontSize: '15px', fontWeight: 600, margin: '0 0 16px' }}>
                ✅ You have full Premium access
              </p>
              <ul style={{ ...S.featureList, color: '#4ade80' }}>
                <li>✓ No watermark on PDF exports</li>
                <li>✓ All premium resume templates</li>
                <li>✓ Unlimited downloads</li>
                <li>✓ Priority support</li>
              </ul>
            </div>
          ) : (
            <div>
              <p style={{ color: '#94a3b8', fontSize: '14px', margin: '0 0 14px', lineHeight: 1.6 }}>
                Upgrade to remove watermarks and unlock all premium templates.
              </p>
              <ul style={{ ...S.featureList, color: '#94a3b8', marginBottom: '20px' }}>
                <li style={{ color: '#f87171' }}>✗ Watermark on PDF (free plan)</li>
                <li>🔒 Premium resume templates</li>
                <li>🔒 Unlimited downloads</li>
                <li>🔒 Priority support</li>
              </ul>

              {error && <div style={S.errorBox}>{error}</div>}

              {upgrading ? (
                <button disabled style={{ ...S.btnUpgrade, opacity: 0.6, cursor: 'not-allowed' }}>
                  <span style={S.spinner} /> Processing…
                </button>
              ) : (
                <button onClick={handleUpgrade} style={S.btnUpgrade}>
                  🚀 Upgrade to Premium — ₹49
                </button>
              )}

              <p style={{ marginTop: '10px', fontSize: '11px', color: '#475569', textAlign: 'center' }}>
                One-time payment · Lifetime access · Secure Razorpay checkout
              </p>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div style={{ ...S.card, alignSelf: 'start' }}>
          <h2 style={{ ...S.cardTitle, marginBottom: '16px' }}>Quick Actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button onClick={() => navigate('/')} style={S.actionBtn}>
              📄 Build / Edit Resume →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const S = {
  page: {
    minHeight: '100vh',
    background: '#0f172a',
    color: '#f1f5f9',
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    fontSize: '14px',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    flexWrap: 'wrap', gap: '12px',
    padding: '20px 24px', borderBottom: '1px solid #1e293b',
    background: '#0f172a', position: 'sticky', top: 0, zIndex: 100,
  },
  h1:       { margin: 0, fontSize: '20px', fontWeight: 800, color: '#f1f5f9' },
  subtitle: { margin: '2px 0 0', fontSize: '12px', color: '#64748b' },
  body: {
    padding: '24px',
    display: 'grid',
    gap: '20px',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    maxWidth: '900px',
  },
  card: {
    background: '#1e293b', border: '1px solid #334155',
    borderRadius: '12px', padding: '24px',
  },
  cardTitle: { margin: 0, fontSize: '16px', fontWeight: 700, color: '#f1f5f9' },
  badgePremium: {
    padding: '4px 12px', borderRadius: '999px',
    background: '#052e16', color: '#4ade80',
    border: '1px solid #16a34a', fontSize: '12px', fontWeight: 700,
  },
  badgeFree: {
    padding: '4px 12px', borderRadius: '999px',
    background: '#1e293b', color: '#94a3b8',
    border: '1px solid #334155', fontSize: '12px', fontWeight: 700,
  },
  featureList: {
    listStyle: 'none', padding: 0, margin: 0,
    display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px',
  },
  btnUpgrade: {
    width: '100%',
    background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
    color: '#fff', border: 'none', borderRadius: '10px',
    padding: '14px 20px', fontSize: '15px', fontWeight: 700,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
  },
  btnAdmin: {
    padding: '7px 14px', borderRadius: '8px', fontWeight: 600,
    fontSize: '12px', cursor: 'pointer',
    background: '#1e1a3a', color: '#a5b4fc', border: '1px solid #4338ca',
  },
  btnSecondary: {
    padding: '7px 14px', borderRadius: '8px', fontWeight: 600,
    fontSize: '12px', cursor: 'pointer',
    background: '#1e293b', color: '#94a3b8', border: '1px solid #334155',
  },
  btnGhost: {
    padding: '7px 14px', borderRadius: '8px', fontWeight: 600,
    fontSize: '12px', cursor: 'pointer',
    background: 'transparent', color: '#64748b', border: '1px solid #1e293b',
  },
  actionBtn: {
    padding: '12px 16px', borderRadius: '8px',
    background: '#0f172a', border: '1px solid #334155',
    color: '#e2e8f0', fontSize: '13px', fontWeight: 600,
    cursor: 'pointer', textAlign: 'left',
  },
  errorBox: {
    marginBottom: '12px', padding: '10px 14px',
    background: '#2d0808', border: '1px solid #7f1d1d',
    borderRadius: '8px', color: '#f87171', fontSize: '12px',
  },
  spinner: {
    display: 'inline-block', width: '12px', height: '12px',
    border: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid #fff',
    borderRadius: '50%', animation: 'spin 0.8s linear infinite',
  },
  successToast: {
    position: 'fixed', top: '16px', right: '16px', zIndex: 9999,
    background: '#052e16', border: '1px solid #16a34a',
    borderRadius: '12px', padding: '16px 20px',
    color: '#4ade80', fontWeight: 700, fontSize: '14px',
    animation: 'slideIn 0.3s ease-out',
    boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
  },
};
