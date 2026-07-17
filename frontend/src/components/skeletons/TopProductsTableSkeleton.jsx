import React from 'react';

const TopProductsTableSkeleton = () => {
  return (
    <div
      className="card"
      style={{
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        animation: 'pulse 1.5s infinite ease-in-out'
      }}
    >
      <div style={{ width: '160px', height: '20px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
              <div style={{ width: '36px', height: '36px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '6px' }} />
              <div style={{ width: '40%', height: '14px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px' }} />
            </div>
            <div style={{ width: '60px', height: '14px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px' }} />
            <div style={{ width: '80px', height: '14px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px' }} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopProductsTableSkeleton;
