import { useState } from 'react';
import ResumeForm from './components/ResumeForm';
import AdBanner from './components/AdBanner';
import UpgradeModal from './components/UpgradeModal';

export default function App() {
  const [isPremium,  setIsPremium]  = useState(false);
  const [showModal,  setShowModal]  = useState(false);

  const openModal  = () => setShowModal(true);
  const closeModal = () => setShowModal(false);

  const handleUpgrade = () => {
    // TODO: replace with real payment (Stripe / Razorpay)
    setIsPremium(true);
    setShowModal(false);
  };

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

      {showModal && (
        <UpgradeModal onConfirm={handleUpgrade} onClose={closeModal} />
      )}
    </div>
  );
}
