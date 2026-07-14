import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useDashboard } from '../context/DashboardContext';
import { CreativeCardSkeleton } from '../components/LoadingSkeleton';
import { AlertCircle, AlertTriangle, Video } from 'lucide-react';
import { formatCurrency } from '../utils/formatter';
import CreativeImage from '../components/CreativeImage';

const PoorPerformers = () => {
  const { datePreset, customRange, refreshTrigger } = useDashboard();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creatives, setCreatives] = useState([]);

  const fetchPoorPerformers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `http://localhost:5000/api/creatives?preset=${datePreset}`;
      if (datePreset === 'custom' && customRange.since && customRange.until) {
        url += `&since=${customRange.since}&until=${customRange.until}`;
      }

      const response = await axios.get(url);
      const allCreatives = response.data.data || [];
      // Filter for underperformers (Average, Poor, Critical)
      const filtered = allCreatives.filter(c => 
        ['Average', 'Poor', 'Critical'].includes(c.performanceBadge)
      );
      setCreatives(filtered);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load poor performing creatives.');
    } finally {
      setLoading(false);
    }
  }, [datePreset, customRange, refreshTrigger]);

  useEffect(() => {
    if (datePreset === 'custom' && (!customRange.since || !customRange.until)) {
      return;
    }
    fetchPoorPerformers();
  }, [fetchPoorPerformers, datePreset, customRange]);

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={28} color="var(--danger)" />
          <span>⚠️ Underperforming Creatives (Poor Performers)</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Creatives currently performing below Target benchmarks (Average, Poor, and Critical) needing immediate attention
        </p>
      </div>

      {error && (
        <div style={{
          background: 'var(--danger-light)',
          border: '1px solid var(--danger)',
          color: 'var(--danger)',
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }}>
          {Array.from({ length: 4 }).map((_, idx) => <CreativeCardSkeleton key={idx} />)}
        </div>
      ) : creatives.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }}>
          {creatives.map((creative) => {
            const badgeClass = `badge badge-${creative.performanceBadge.toLowerCase()}`;
            return (
              <div
                key={creative.id}
                className="card fade-in"
                onClick={() => navigate(`/creatives/${creative.id}`)}
                style={{
                  padding: 0,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  height: '460px',
                  border: '1px dashed var(--danger)' // dashed highlight for poor performers
                }}
              >
                <div style={{ height: '220px', background: 'var(--bg-tertiary)', position: 'relative', overflow: 'hidden' }}>
                  <CreativeImage
                    src={creative.imageUrl || creative.thumbnailUrl}
                    alt={creative.name}
                    isVideo={creative.isVideo}
                    aspectRatio="auto"
                    style={{ width: '100%', height: '100%' }}
                  />
                  {creative.isVideo && (
                    <div style={{ position: 'absolute', top: '10px', left: '10px', width: '28px', height: '28px', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                      <Video size={14} />
                    </div>
                  )}
                  <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                    <span className={badgeClass}>{creative.performanceBadge}</span>
                  </div>
                  <div style={{ position: 'absolute', bottom: '10px', left: '10px' }}>
                    <span className="badge" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                      {creative.category}
                    </span>
                  </div>
                </div>

                <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {creative.name}
                  </h4>
                  <p style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    height: '38px',
                    lineHeight: '1.2'
                  }}>
                    {creative.copyText || 'No text content.'}
                  </p>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.5rem',
                    marginTop: 'auto',
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: '0.75rem',
                    fontSize: '0.8rem'
                  }}>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Spend</span>
                      <strong>
                        {formatCurrency(creative.metrics.spend)}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>ROAS</span>
                      <strong style={{ color: 'var(--danger)' }}>
                        {creative.metrics.roas.toFixed(2)}x
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>CPA</span>
                      <strong>
                        {creative.metrics.cpa > 0 ? formatCurrency(creative.metrics.cpa) : '₹0'}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>CTR</span>
                      <strong>{creative.metrics.ctr.toFixed(2)}%</strong>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card flex-center" style={{ height: '300px', flexDirection: 'column', gap: '0.5rem' }}>
          <AlertCircle size={28} color="var(--text-tertiary)" />
          <p style={{ color: 'var(--text-secondary)' }}>No underperforming creatives found for this period. Great job!</p>
        </div>
      )}
    </div>
  );
};

export default PoorPerformers;
