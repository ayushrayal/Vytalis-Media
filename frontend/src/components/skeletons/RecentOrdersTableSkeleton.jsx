import React from 'react';

const RecentOrdersTableSkeleton = () => {
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
            <div style={{ width: '80px', height: '14px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px' }} />
            <div style={{ width: '120px', height: '14px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px' }} />
            <div style={{ width: '70px', height: '14px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px' }} />
            <div style={{ width: '90px', height: '20px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '999px' }} />
            <div style={{ width: '90px', height: '20px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '999px' }} />
            <div style={{ width: '80px', height: '14px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px' }} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentOrdersTableSkeleton;
