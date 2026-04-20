import { memo } from 'react';

const COLOR_MAP = {
  green:  { bg: '#052e16', border: '#16a34a', text: '#4ade80', icon: '#22c55e' },
  blue:   { bg: '#0c1a3a', border: '#2563eb', text: '#60a5fa', icon: '#3b82f6' },
  purple: { bg: '#1a0533', border: '#7c3aed', text: '#c084fc', icon: '#a855f7' },
  orange: { bg: '#1c0f00', border: '#d97706', text: '#fbbf24', icon: '#f59e0b' },
};

const SKELETON_STYLE = {
  display: 'block',
  height: '28px',
  width: '70%',
  borderRadius: '6px',
  background: 'linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s infinite',
};

/**
 * Stat card for the top summary bar.
 * @param {{ title: string, value: string, icon: string, color: string, loading?: boolean }} props
 */
const StatsCard = memo(function StatsCard({ title, value, icon, color = 'blue', loading = false }) {
  const c = COLOR_MAP[color] || COLOR_MAP.blue;

  return (
    <div style={{
      background:    '#1e293b',
      border:        `1px solid ${c.border}`,
      borderRadius:  '12px',
      padding:       '20px 24px',
      flex:          '1 1 200px',
      minWidth:      '160px',
      position:      'relative',
      overflow:      'hidden',
    }}>
      {/* accent glow strip */}
      <div style={{
        position:   'absolute', top: 0, left: 0, right: 0,
        height:     '3px',
        background: c.border,
        borderRadius: '12px 12px 0 0',
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#94a3b8',
                      textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {title}
          </p>
          {loading
            ? <span style={SKELETON_STYLE} />
            : <p style={{ margin: '8px 0 0', fontSize: '28px', fontWeight: 700, color: c.text }}>
                {value}
              </p>
          }
        </div>
        <span style={{
          fontSize: '24px',
          background: c.bg,
          border: `1px solid ${c.border}`,
          borderRadius: '10px',
          padding: '8px',
          lineHeight: 1,
        }}>
          {icon}
        </span>
      </div>
    </div>
  );
});

export default StatsCard;
