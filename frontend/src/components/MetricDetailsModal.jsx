import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, TrendingUp, TrendingDown, Info, Calculator } from 'lucide-react';
import { Shimmer } from './LoadingSkeleton';
import MetricTrendChart from './MetricTrendChart';
import { formatCurrency } from '../utils/formatter';

const MetricDetailsModal = ({
  isOpen,
  onClose,
  metricKey,
  metricTitle,
  currentValue,
  previousValue,
  pct,
  direction,
  isCurrency = false,
  isPercent = false,
  startDateStr // Pass since date of the current range to find the selected month
}) => {
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState([]);
  const [error, setError] = useState(null);

  // Compute date range: 1st day of the selected month until today
  useEffect(() => {
    if (!isOpen) return;

    const fetchTrendData = async () => {
      setLoading(true);
      setError(null);
      try {
        let firstDay = '';
        try {
          const d = new Date(startDateStr || Date.now());
          firstDay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
        } catch (e) {
          const d = new Date();
          firstDay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
        }

        const todayStr = new Date().toISOString().split('T')[0];
        const url = `http://localhost:5000/api/dashboard/trends?preset=custom&since=${firstDay}&until=${todayStr}`;
        const response = await axios.get(url);
        setTrendData(response.data.data || []);
      } catch (err) {
        setError('Failed to fetch trend timelines for the selected month.');
      } finally {
        setLoading(false);
      }
    };

    fetchTrendData();
  }, [isOpen, metricKey, startDateStr]);

  if (!isOpen) return null;

  // Calculate statistics from the trend series
  const values = trendData.map(d => d[metricKey] || 0).sort((a, b) => a - b);
  const total = values.reduce((sum, val) => sum + val, 0);
  const average = values.length > 0 ? total / values.length : 0;
  
  // Median
  let median = 0;
  if (values.length > 0) {
    const mid = Math.floor(values.length / 2);
    median = values.length % 2 !== 0 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
  }
  
  const highest = values.length > 0 ? values[values.length - 1] : 0;
  const lowest = values.length > 0 ? values[0] : 0;

  const isPositive = direction === 'up';
  const changeColor = isPositive ? 'var(--success)' : 'var(--danger)';
  const ChangeIcon = isPositive ? TrendingUp : TrendingDown;

  const formatValue = (val) => {
    if (isCurrency) return formatCurrency(val);
    if (isPercent) return `${val.toFixed(2)}%`;
    return val % 1 === 0 ? val : val.toFixed(2);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.25s ease-out'
      }}
    >
      {/* Blur Backdrop overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(15, 22, 42, 0.4)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)'
        }}
      />

      {/* Modal Dialog */}
      <div
        className="card"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '850px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          padding: '2rem',
          zIndex: 1001,
          overflowY: 'auto',
          border: '1px solid var(--border-color)'
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.5rem',
            right: '1.5rem',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            transition: 'color var(--transition-fast)'
          }}
          onMouseEnter={(e) => e.target.style.color = 'var(--text-primary)'}
          onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div style={{ marginBottom: '1.5rem', paddingRight: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
            {metricTitle} Analysis
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Monthly drill-down trend and statistics
          </p>
        </div>

        {/* Primary Stats Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
          padding: '1.25rem',
          background: 'var(--bg-primary)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)'
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
              Current Value
            </span>
            <strong style={{ fontSize: '1.35rem', fontWeight: 700 }}>
              {currentValue}
            </strong>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
              Previous Value
            </span>
            <strong style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              {previousValue || 'N/A'}
            </strong>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
              Growth Rate
            </span>
            {pct !== undefined ? (
              <span style={{
                fontSize: '1.35rem',
                fontWeight: 700,
                color: changeColor,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <ChangeIcon size={18} />
                {pct.toFixed(2)}%
              </span>
            ) : (
              <span style={{ fontSize: '1.35rem', color: 'var(--text-secondary)' }}>N/A</span>
            )}
          </div>
        </div>

        {/* Trend & Calculations Split Layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '2rem',
          flex: 1,
          minHeight: 0,
          '@media (min-width: 768px)': {
            gridTemplateColumns: '3fr 1.5fr'
          }
        }} id="modal-drilldown-split">
          {/* Daily Trend Chart */}
          <div style={{ height: '320px', display: 'flex', flexDirection: 'column' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <TrendingUp size={16} color="var(--primary)" />
              <span>Daily Trend Timeline</span>
            </h4>
            <div style={{ flex: 1, minHeight: 0, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
              {loading ? (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Shimmer /></div>
              ) : error ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</div>
              ) : trendData.length > 0 ? (
                <MetricTrendChart
                  data={trendData}
                  metricKey={metricKey}
                  metricLabel={metricTitle}
                  isCurrency={isCurrency}
                  isPercent={isPercent}
                />
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>No trend data found.</div>
              )}
            </div>
          </div>

          {/* Statistical Breakdown Panel */}
          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Calculator size={16} color="var(--accent)" />
              <span>Statistical Summary</span>
            </h4>
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              height: 'calc(100% - 2.2rem)',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total Sum</span>
                <strong>{loading ? '...' : formatValue(total)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Average (Mean)</span>
                <strong>{loading ? '...' : formatValue(average)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Median Value</span>
                <strong>{loading ? '...' : formatValue(median)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Highest Record</span>
                <strong style={{ color: 'var(--success)' }}>{loading ? '...' : formatValue(highest)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.25rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Lowest Record</span>
                <strong style={{ color: 'var(--danger)' }}>{loading ? '...' : formatValue(lowest)}</strong>
              </div>
              
              <div style={{
                marginTop: '1rem',
                padding: '0.75rem',
                backgroundColor: 'var(--bg-primary)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                gap: '0.5rem',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                lineHeight: '1.3'
              }}>
                <Info size={14} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--primary)' }} />
                <span>Computed from daily records from the first day of the active month until today.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        @media (min-width: 768px) {
          #modal-drilldown-split {
            grid-template-columns: 3fr 1.5fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default MetricDetailsModal;
