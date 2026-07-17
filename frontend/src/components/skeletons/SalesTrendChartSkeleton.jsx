import React from 'react';

const SalesTrendChartSkeleton = () => {
  return (
    <div
      className="card"
      style={{
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        minHeight: '340px',
        animation: 'pulse 1.5s infinite ease-in-out'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ width: '180px', height: '20px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px' }} />
        <div style={{ width: '120px', height: '28px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '6px' }} />
      </div>
      <div style={{ width: '100%', height: '240px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px' }} />
    </div>
  );
};

export default SalesTrendChartSkeleton;
