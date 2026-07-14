import React from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';

const MetricCard = ({
  title,
  value,
  previousValue,
  pct,
  direction,
  status,
  icon: Icon,
  onClick,
  isCurrency = false,
  isPercent = false
}) => {
  const isPositive = direction === 'up';
  const changeColor = isPositive ? 'var(--success)' : 'var(--danger)';
  const ChangeIcon = isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <div
      className="card fade-in"
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        cursor: 'pointer',
        height: '140px',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform var(--transition-normal), box-shadow var(--transition-normal), border-color var(--transition-normal)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {title}
        </span>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'var(--bg-tertiary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--primary)'
        }}>
          {Icon ? <Icon size={16} /> : <TrendingUp size={16} />}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
          {value}
        </h2>
        {pct !== undefined && (
          <span style={{
            fontSize: '0.8rem',
            fontWeight: 700,
            color: changeColor,
            display: 'flex',
            alignItems: 'center',
            gap: '2px'
          }}>
            <ChangeIcon size={14} />
            {pct.toFixed(1)}%
          </span>
        )}
      </div>

      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 'auto' }}>
        vs. previous {previousValue || 'N/A'}
      </div>

      {/* Interactive indicator bar */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '3px',
        backgroundColor: 'var(--primary)',
        transform: 'scaleX(0)',
        transformOrigin: 'left',
        transition: 'transform var(--transition-fast)'
      }}
      className="metric-card-hover-bar"
      />
      <style>{`
        .card:hover .metric-card-hover-bar {
          transform: scaleX(1);
        }
      `}</style>
    </div>
  );
};

export default MetricCard;
