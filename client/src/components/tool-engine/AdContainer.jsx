import LazyAdSlot from '../ads/LazyAdSlot'

/**
 * Named slot system — maps semantic positions to physical ad sizes.
 * Swap LazyAdSlot internals for real AdSense units after approval
 * without touching any caller.
 *
 * Slot behaviour:
 *   top-banner  → eager (above fold, must load immediately)
 *   sidebar     → lazy (below fold on mobile, viewport-triggered)
 *   inline      → lazy (mid-content, viewport-triggered)
 *   mobile-banner → lazy (only shown on small screens)
 */
const SLOT_CONFIG = {
  'top-banner':    { size: 'leaderboard', eager: true  },
  'sidebar':       { size: 'rectangle',   eager: false },
  'inline':        { size: 'leaderboard', eager: false },
  'mobile-banner': { size: 'mobile',      eager: false },
}

export default function AdContainer({ slot = 'top-banner', className = '' }) {
  const cfg = SLOT_CONFIG[slot] || SLOT_CONFIG['top-banner']
  return <LazyAdSlot size={cfg.size} eager={cfg.eager} className={className} />
}
