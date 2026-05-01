import { useEffect, useRef } from 'react';

const PUBLISHER_ID = import.meta.env.VITE_ADSENSE_PUBLISHER_ID;

const AdUnit = ({ slotId, style = {} }) => {
  const adRef = useRef(null);

  useEffect(() => {
    if (!slotId || !PUBLISHER_ID) return;
    try {
      if (adRef.current && adRef.current.getAttribute('data-adsbygoogle-status')) return;
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error('AdSense error:', err);
    }
  }, [slotId]);

  if (!slotId || !PUBLISHER_ID) return null;

  return (
    <div className="ad-container my-6 text-center">
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block', ...style }}
        data-ad-client={PUBLISHER_ID}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
};

export default AdUnit;
