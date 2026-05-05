// AdBanner — AdSense-ready with fixed dimensions to prevent Cumulative Layout Shift (CLS).
// Replace the placeholder divs with real <ins class="adsbygoogle"> tags after approval.
// Fixed min-height ensures no layout shift when ads load asynchronously.

const AD_SIZES = {
  leaderboard: { w: 728, h: 90,  label: '728×90'  },
  rectangle:   { w: 300, h: 250, label: '300×250' },
  mobile:      { w: 320, h: 50,  label: '320×50'  },
}

export default function AdBanner({ size = 'leaderboard', className = '' }) {
  const cfg = AD_SIZES[size] || AD_SIZES.leaderboard

  return (
    <div className={`flex flex-col items-center my-6 w-full ${className}`}>
      {/* "Advertisement" label — required by AdSense policy */}
      <p className="text-xs text-gray-400 uppercase tracking-widest mb-1 select-none">
        Advertisement
      </p>

      {/* Desktop ad slot — fixed height prevents layout shift */}
      <div
        className="hidden sm:flex items-center justify-center bg-gray-100 border border-dashed border-gray-200 rounded text-gray-400 text-xs select-none overflow-hidden"
        style={{ width: `${cfg.w}px`, minHeight: `${cfg.h}px`, maxWidth: '100%' }}
        aria-label="Advertisement"
      >
        {/*
          REPLACE WITH ADSENSE CODE:
          <ins
            className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
            data-ad-slot="XXXXXXXXXX"
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        */}
        <span>{cfg.label}</span>
      </div>

      {/* Mobile ad slot — 320×50 banner, full width up to 320px */}
      <div
        className="flex sm:hidden items-center justify-center bg-gray-100 border border-dashed border-gray-200 rounded text-gray-400 text-xs select-none overflow-hidden w-full"
        style={{ minHeight: '50px', maxWidth: '320px' }}
        aria-label="Advertisement"
      >
        {/*
          REPLACE WITH ADSENSE MOBILE CODE:
          <ins
            className="adsbygoogle"
            style={{ display: 'block', width: '320px', height: '50px' }}
            data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
            data-ad-slot="XXXXXXXXXX"
          />
        */}
        <span>320×50</span>
      </div>
    </div>
  )
}
