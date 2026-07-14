import React from 'react';

export const Shimmer = () => (
  <div style={{
    width: '100%',
    height: '100%',
    background: 'linear-gradient(90deg, var(--bg-tertiary) 25%, var(--border-color) 50%, var(--bg-tertiary) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite linear',
    borderRadius: 'inherit'
  }}>
    <style>{`
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
    `}</style>
  </div>
);

export const KpiSkeleton = () => (
  <div className="card" style={{ height: '140px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
    <div style={{ width: '40%', height: '16px', borderRadius: '4px', overflow: 'hidden' }}><Shimmer /></div>
    <div style={{ width: '70%', height: '32px', borderRadius: '6px', overflow: 'hidden' }}><Shimmer /></div>
    <div style={{ width: '50%', height: '14px', borderRadius: '4px', overflow: 'hidden' }}><Shimmer /></div>
  </div>
);

export const ChartSkeleton = () => (
  <div className="card" style={{ height: '350px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ width: '25%', height: '20px', borderRadius: '4px', overflow: 'hidden' }}><Shimmer /></div>
      <div style={{ width: '15%', height: '24px', borderRadius: '4px', overflow: 'hidden' }}><Shimmer /></div>
    </div>
    <div style={{ flex: 1, borderRadius: '8px', overflow: 'hidden' }}><Shimmer /></div>
  </div>
);

export const TableSkeleton = ({ rows = 5 }) => (
  <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
    <div style={{ width: '30%', height: '22px', borderRadius: '4px', overflow: 'hidden' }}><Shimmer /></div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} style={{ display: 'flex', gap: '1rem', height: '40px', alignItems: 'center' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '4px', overflow: 'hidden' }}><Shimmer /></div>
          <div style={{ flex: 1, height: '16px', borderRadius: '4px', overflow: 'hidden' }}><Shimmer /></div>
          <div style={{ width: '80px', height: '16px', borderRadius: '4px', overflow: 'hidden' }}><Shimmer /></div>
          <div style={{ width: '100px', height: '16px', borderRadius: '4px', overflow: 'hidden' }}><Shimmer /></div>
        </div>
      ))}
    </div>
  </div>
);

export const CreativeCardSkeleton = () => (
  <div className="card" style={{ padding: 0, overflow: 'hidden', height: '420px', display: 'flex', flexDirection: 'column' }}>
    <div style={{ height: '220px', overflow: 'hidden' }}><Shimmer /></div>
    <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ width: '30%', height: '14px', borderRadius: '4px', overflow: 'hidden' }}><Shimmer /></div>
      <div style={{ width: '80%', height: '20px', borderRadius: '4px', overflow: 'hidden' }}><Shimmer /></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto' }}>
        <div style={{ width: '25%', height: '16px', borderRadius: '4px', overflow: 'hidden' }}><Shimmer /></div>
        <div style={{ width: '25%', height: '16px', borderRadius: '4px', overflow: 'hidden' }}><Shimmer /></div>
      </div>
    </div>
  </div>
);
export default KpiSkeleton;
