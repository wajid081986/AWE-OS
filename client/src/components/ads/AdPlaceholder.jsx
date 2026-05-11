/**
 * CLS-safe ad placeholder.
 * Reserves exactly the same dimensions as the real ad unit,
 * preventing Cumulative Layout Shift when ads load asynchronously.
 * Rendered by LazyAdSlot until the viewport threshold is crossed.
 */

const SIZES = {
  leaderboard: { desktop: { w: 728, h: 90  }, mobile: { h: 50  } },
  rectangle:   { desktop: { w: 300, h: 250 }, mobile: { h: 250 } },
  mobile:      { desktop: { w: 320, h: 50  }, mobile: { h: 50  } },
}

export default function AdPlaceholder({ size = 'leaderboard', className = '' }) {
  const cfg = SIZES[size] || SIZES.leaderboard

  return (
    <div className={`flex flex-col items-center my-6 w-full ${className}`} aria-hidden="true">
      <p className="text-xs text-gray-400 uppercase tracking-widest mb-1 select-none">
        Advertisement
      </p>
      {/* Desktop placeholder */}
      <div
        className="hidden sm:block bg-gray-100 rounded"
        style={{ width: `${cfg.desktop.w}px`, height: `${cfg.desktop.h}px`, maxWidth: '100%' }}
      />
      {/* Mobile placeholder */}
      <div
        className="block sm:hidden bg-gray-100 rounded w-full"
        style={{ height: `${cfg.mobile.h}px`, maxWidth: `${cfg.desktop.w}px` }}
      />
    </div>
  )
}
