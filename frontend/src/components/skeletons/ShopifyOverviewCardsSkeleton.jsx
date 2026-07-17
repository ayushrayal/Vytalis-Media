import React from 'react';

const ShopifyOverviewCardsSkeleton = () => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem',
        width: '100%'
      }}
    >
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="card"
          style={{
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            animation: 'pulse 1.5s infinite ease-in-out'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ width: '40%', height: '14px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px' }} />
            <div style={{ width: '32px', height: '32px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '6px' }} />
          </div>
          <div style={{ width: '65%', height: '28px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '6px' }} />
          <div style={{ width: '50%', height: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px' }} />
        </div>
      ))}
    </div>
  );
};

export default ShopifyOverviewCardsSkeleton;
