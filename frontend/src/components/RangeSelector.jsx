import React from 'react';
import { Calendar } from 'lucide-react';

const RangeSelector = ({ value, onChange, disabled = false }) => {
  const options = [
    { label: '7 Days', value: '7d' },
    { label: '30 Days', value: '30d' },
    { label: '90 Days', value: '90d' }
  ];

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: 'var(--bg-primary)',
        padding: '0.25rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)',
        gap: '0.25rem'
      }}
    >
      <div style={{ padding: '0 0.5rem', display: 'flex', alignItems: 'center', color: 'var(--text-tertiary)' }}>
        <Calendar size={14} />
      </div>
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              fontWeight: isActive ? 600 : 500,
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              backgroundColor: isActive ? 'var(--bg-secondary)' : 'transparent',
              border: isActive ? '1px solid var(--border-color)' : '1px solid transparent',
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};

export default React.memo(RangeSelector);
