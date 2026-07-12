// AdBanner — shows real AdSense ads when VITE_ADSENSE_PUBLISHER_ID is set,
// otherwise renders nothing.
import { useEffect } from 'react'
import { ADSENSE_CONFIG, ADS_ACTIVE } from '../adsense.config'

const AD_SIZES = {
  leaderboard: { w: 728, h: 90  },
  rectangle:   { w: 300, h: 250 },
  mobile:      { w: 320, h: 50  },
}

const PUB_ID = ADSENSE_CONFIG?.publisherId

function AdSlot({ className, style, dataAdSlot }) {
  useEffect(() => {
    if (!PUB_ID) return
    try {
      // eslint-disable-next-line no-undef
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {}
  }, [])

  if (!PUB_ID) return null

  return (
    <ins
      className={`adsbygoogle ${className}`}
      style={{ display: 'block', ...style }}
      data-ad-client={PUB_ID}
      data-ad-slot={dataAdSlot || ''}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  )
}

export default function AdBanner({ size = 'leaderboard', className = '' }) {
  if (!ADS_ACTIVE) return null

  const cfg = AD_SIZES[size] || AD_SIZES.leaderboard

  return (
    <div className={`flex flex-col items-center my-6 w-full ${className}`} aria-label="Advertisement">
      <p className="text-xs text-gray-400 uppercase tracking-widest mb-1 select-none" aria-hidden="true">
        Advertisement
      </p>

      {/* Desktop responsive ad */}
      <div className="hidden sm:block w-full" style={{ maxWidth: `${cfg.w}px`, minHeight: `${cfg.h}px` }}>
        <AdSlot
          className=""
          style={{ minHeight: `${cfg.h}px` }}
          dataAdSlot=""
        />
      </div>

      {/* Mobile banner ad */}
      <div className="block sm:hidden w-full" style={{ maxWidth: '320px', minHeight: '50px' }}>
        <AdSlot
          className=""
          style={{ width: '320px', height: '50px' }}
          dataAdSlot=""
        />
      </div>
    </div>
  )
}
