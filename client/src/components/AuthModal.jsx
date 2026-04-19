// ===== NEW CODE START =====
import { useState } from 'react';

const BASE_URL = import.meta.env.VITE_API_URL;

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '8px',
  border: '1px solid #e5e7eb',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
};

export default function AuthModal({ onSuccess, onClose }) {
  const [mode, setMode]         = useState('login'); // 'login' | 'register'
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const switchMode = (next) => {
    setMode(next);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res  = await fetch(`${BASE_URL}/api/auth/${mode}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Server error — please try again later');
      }

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Something went wrong');
      }

      localStorage.setItem('awe_token', data.token);
      onSuccess(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={() => { if (!loading) onClose(); }}
    >
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        {!loading && (
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        )}

        <div className="modal-header">
          <div className="modal-icon">{mode === 'login' ? '🔐' : '✨'}</div>
          <h2 className="modal-title" id="auth-modal-title">
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </h2>
          <p className="modal-subtitle">
            {mode === 'login'
              ? 'Access your premium features across all devices'
              : 'Join AWE-OS — free to start'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '0 24px 24px' }}>
          <div style={{ marginBottom: '12px' }}>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <input
              type="password"
              placeholder="Password (min 8 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              disabled={loading}
              style={inputStyle}
            />
          </div>

          {error && (
            <p style={{ color: '#ef4444', fontSize: '14px', marginBottom: '12px', margin: '0 0 12px' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn-pay"
            disabled={loading}
            aria-busy={loading}
            style={{ width: '100%' }}
          >
            {loading
              ? 'Please wait...'
              : mode === 'login'
                ? 'Sign In'
                : 'Create Account'}
          </button>

          <button
            type="button"
            className="btn-maybe-later"
            onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
            disabled={loading}
            style={{ width: '100%', marginTop: '8px' }}
          >
            {mode === 'login'
              ? "Don't have an account? Register"
              : 'Already have an account? Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
// ===== NEW CODE END =====
