import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useDashboard } from '../context/DashboardContext';
import { CreativeCardSkeleton } from '../components/LoadingSkeleton';
import { AlertCircle, Award, Video, SlidersHorizontal } from 'lucide-react';
import { formatCurrency } from '../utils/formatter';
import CreativeImage from '../components/CreativeImage';
import FilterDrawer from '../components/FilterDrawer';
import CreativeDetailsModal from '../components/CreativeDetailsModal';

const Winners = () => {
  const { datePreset, customRange, refreshTrigger, globalSearch } = useDashboard();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creatives, setCreatives] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [currentPage, setCurrentPage] = useState(1);

  // Filter Drawer State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    creativeType: '',
    category: '',
    platform: '',
    placement: '',
    hasPurchases: '',
    spendRange: '',
    roasRange: ''
  });

  // Modal State
  const [selectedCreativeId, setSelectedCreativeId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchWinners = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let params = {
        preset: datePreset,
        page: currentPage,
        limit: 12,
        search: globalSearch || ''
      };

      if (datePreset === 'custom' && customRange.since && customRange.until) {
        params.since = customRange.since;
        params.until = customRange.until;
      }

      // Add active filters
      Object.keys(activeFilters).forEach(key => {
        if (activeFilters[key]) {
          params[key] = activeFilters[key];
        }
      });

      const response = await axios.get('http://localhost:5000/api/creatives', { params });
      const allCreatives = response.data.data || [];
      // Filter for top performers (Excellent, Great, Good)
      const filtered = allCreatives.filter(c => 
        ['Excellent', 'Great', 'Good'].includes(c.performanceBadge)
      );
      setCreatives(filtered);
      setPagination(response.data.pagination || { page: 1, limit: 12, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load winning creatives.');
    } finally {
      setLoading(false);
    }
  }, [datePreset, customRange, refreshTrigger, globalSearch, activeFilters, currentPage]);

  useEffect(() => {
    if (datePreset === 'custom' && (!customRange.since || !customRange.until)) {
      return;
    }
    fetchWinners();
  }, [fetchWinners, datePreset, customRange]);

  const handleFilterChange = (id, value) => {
    setActiveFilters(prev => ({
      ...prev,
      [id]: value
    }));
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setActiveFilters({
      creativeType: '',
      category: '',
      platform: '',
      placement: '',
      hasPurchases: '',
      spendRange: '',
      roasRange: ''
    });
    setCurrentPage(1);
  };

  const filtersConfig = [
    {
      id: 'creativeType',
      label: 'Format Type',
      type: 'select',
      options: ['static', 'video']
    },
    {
      id: 'platform',
      label: 'Platform',
      type: 'select',
      options: ['facebook', 'instagram', 'messenger', 'audience_network']
    },
    {
      id: 'placement',
      label: 'Placement Position',
      type: 'select',
      options: ['Facebook Feed', 'Facebook Stories', 'Facebook Reels', 'Instagram Feed', 'Instagram Stories', 'Instagram Reels']
    },
    {
      id: 'hasPurchases',
      label: 'Has Purchases',
      type: 'select',
      options: ['Yes', 'No']
    },
    {
      id: 'spendRange',
      label: 'Spend Bracket',
      type: 'select',
      options: ['₹0–₹500', '₹500–₹2,000', '₹2,000–₹5,000', '₹5,000+']
    },
    {
      id: 'roasRange',
      label: 'ROAS Bracket',
      type: 'select',
      options: ['0.0-1.0x', '1.0-2.0x', '2.0-4.0x', '4.0x+']
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Award size={28} color="var(--success)" />
            <span>🏆 Winning Creatives Gallery</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            High-performing creatives with positive ROAS and CPA performance (Good, Great, and Excellent)
          </p>
        </div>

        <button
          onClick={() => setIsFilterOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1rem',
            background: 'var(--success)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.85rem'
          }}
        >
          <SlidersHorizontal size={16} />
          Filters
          {Object.values(activeFilters).filter(Boolean).length > 0 && (
            <span style={{
              background: '#fff',
              color: 'var(--success)',
              padding: '0.1rem 0.4rem',
              borderRadius: '50%',
              fontSize: '0.7rem',
              marginLeft: '0.2rem',
              fontWeight: 700
            }}>
              {Object.values(activeFilters).filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {error && (
        <div style={{ background: 'var(--danger-light)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }}>
          {Array.from({ length: 4 }).map((_, idx) => <CreativeCardSkeleton key={idx} />)}
        </div>
      ) : creatives.length > 0 ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }}>
            {creatives.map((creative) => {
              const badgeClass = `badge badge-${creative.performanceBadge.toLowerCase()}`;
              return (
                <div
                  key={creative.id}
                  className="card fade-in"
                  onClick={() => {
                    setSelectedCreativeId(creative.id);
                    setIsModalOpen(true);
                  }}
                  style={{
                    padding: 0,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    height: '460px',
                    border: '1px solid var(--success)'
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
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '38px', lineHeight: '1.2' }}>
                      {creative.copyText || 'No text content.'}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', fontSize: '0.8rem' }}>
                      <div>
                        <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Spend</span>
                        <strong>{formatCurrency(creative.metrics.spend)}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>ROAS</span>
                        <strong style={{ color: 'var(--success)' }}>{creative.metrics.roas.toFixed(2)}x</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>CPA</span>
                        <strong>{creative.metrics.cpa > 0 ? formatCurrency(creative.metrics.cpa) : '₹0'}</strong>
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
        </>
      ) : (
        <div className="card flex-center" style={{ height: '300px', flexDirection: 'column', gap: '0.5rem' }}>
          <AlertCircle size={28} color="var(--text-tertiary)" />
          <p style={{ color: 'var(--text-secondary)' }}>No winning creatives currently active in this period.</p>
        </div>
      )}

      {/* Filter Drawer */}
      <FilterDrawer
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filtersConfig={filtersConfig}
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* Details Modal */}
      <CreativeDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        creativeId={selectedCreativeId}
        datePreset={datePreset}
        customRange={customRange}
      />
    </div>
  );
};

export default Winners;
