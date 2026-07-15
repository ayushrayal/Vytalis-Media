import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { useDashboard } from '../context/DashboardContext';
import { CreativeCardSkeleton } from '../components/LoadingSkeleton';
import { AlertCircle, Image as ImageIcon, Video, Search, Eye, Filter, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { formatCurrency } from '../utils/formatter';
import CreativeImage from '../components/CreativeImage';
import SectionError from '../components/SectionError';
import { getFriendlyErrorMessage } from '../utils/errorHandler';

const FilterDrawer = React.lazy(() => import('../components/FilterDrawer'));
const CreativeDetailsModal = React.lazy(() => import('../components/CreativeDetailsModal'));

const CreativeGallery = () => {
  const { datePreset, customRange, refreshTrigger, globalSearch } = useDashboard();

  // Filter Drawer State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    creativeType: '',
    badge: '',
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
  const [currentPage, setCurrentPage] = useState(1);

  const isCustomAndIncomplete = datePreset === 'custom' && (!customRange.since || !customRange.until);

  // Fetch creatives list from backend via React Query
  const { data: creativeResponse, isLoading: loading, error: queryError, refetch: fetchCreatives } = useQuery({
    queryKey: ['creatives', { datePreset, customRange, refreshTrigger, globalSearch, activeFilters, currentPage }],
    queryFn: async () => {
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

      // Add active filters to query parameters
      Object.keys(activeFilters).forEach(key => {
        if (activeFilters[key]) {
          params[key] = activeFilters[key];
        }
      });

      const response = await axios.get('http://localhost:5000/api/creatives', { params });
      return response.data;
    },
    enabled: !isCustomAndIncomplete
  });

  const creatives = creativeResponse?.data || [];
  const pagination = creativeResponse?.pagination || { page: 1, limit: 12, total: 0, totalPages: 1 };
  const error = queryError ? getFriendlyErrorMessage(queryError) : null;

  const handleFilterChange = (id, value) => {
    setActiveFilters(prev => ({
      ...prev,
      [id]: value
    }));
    setCurrentPage(1); // Reset page on filter change
  };

  const handleResetFilters = () => {
    setActiveFilters({
      creativeType: '',
      badge: '',
      category: '',
      platform: '',
      placement: '',
      hasPurchases: '',
      spendRange: '',
      roasRange: ''
    });
    setCurrentPage(1);
  };

  // Filter configuration schema
  const filtersConfig = [
    {
      id: 'creativeType',
      label: 'Format Type',
      type: 'select',
      options: ['static', 'video']
    },
    {
      id: 'badge',
      label: 'Performance Level',
      type: 'select',
      options: ['Excellent', 'Great', 'Good', 'Average', 'Poor', 'Critical']
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
            <ImageIcon size={28} color="var(--primary)" />
            <span>Creative Performance Gallery</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Browse unique creative combinations with mapped conversions and video performance metrics
          </p>
        </div>
        
        {/* Toggle Filters Drawer button */}
        <button
          onClick={() => setIsFilterOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1rem',
            background: 'var(--primary)',
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
              color: 'var(--primary)',
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
        <SectionError
          message={error}
          onRetry={fetchCreatives}
          isRetrying={loading}
        />
      )}

      {/* Creatives Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }}>
          {Array.from({ length: 8 }).map((_, idx) => <CreativeCardSkeleton key={idx} />)}
        </div>
      ) : creatives.length > 0 ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }}>
            {creatives.map((creative) => {
              const displayBadgeClass = `badge badge-${creative.performanceBadge.toLowerCase()}`;
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
                    height: '460px'
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
                      <span className={displayBadgeClass}>{creative.performanceBadge}</span>
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
                        <strong style={{ fontSize: '0.85rem' }}>
                          {formatCurrency(creative.metrics.spend)}
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>ROAS</span>
                        <strong style={{ fontSize: '0.85rem', color: creative.metrics.roas >= 1.5 ? 'var(--success)' : 'inherit' }}>
                          {creative.metrics.roas.toFixed(2)}x
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>CPA</span>
                        <strong style={{ fontSize: '0.85rem' }}>
                          {creative.metrics.cpa > 0 ? formatCurrency(creative.metrics.cpa) : '₹0'}
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>CTR</span>
                        <strong style={{ fontSize: '0.85rem' }}>
                          {creative.metrics.ctr.toFixed(2)}%
                        </strong>
                      </div>
                    </div>

                    {creative.isVideo && (
                      <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', background: 'var(--bg-primary)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                        <span>Hook: <strong>{creative.metrics.hookRate?.toFixed(1) || 0}%</strong></span>
                        <span>Hold: <strong>{creative.metrics.holdRate?.toFixed(1) || 0}%</strong></span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Simple Pagination controls */}
          {pagination.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '2.5rem' }}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage === 1 ? 0.5 : 1
                }}
              >
                Previous
              </button>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Page {currentPage} of {pagination.totalPages}
              </span>
              <button
                disabled={currentPage === pagination.totalPages}
                onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  cursor: currentPage === pagination.totalPages ? 'not-allowed' : 'pointer',
                  opacity: currentPage === pagination.totalPages ? 0.5 : 1
                }}
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="card flex-center" style={{ height: '300px', flexDirection: 'column', gap: '0.5rem' }}>
          <AlertCircle size={28} color="var(--text-tertiary)" />
          <p style={{ color: 'var(--text-secondary)' }}>No creatives matched the active filters.</p>
        </div>
      )}

      {/* Filter Drawer */}
      <React.Suspense fallback={null}>
        <FilterDrawer
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          filtersConfig={filtersConfig}
          activeFilters={activeFilters}
          onFilterChange={handleFilterChange}
          onReset={handleResetFilters}
        />
      </React.Suspense>

      {/* Progressive details modal */}
      <React.Suspense fallback={null}>
        <CreativeDetailsModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          creativeId={selectedCreativeId}
          datePreset={datePreset}
          customRange={customRange}
        />
      </React.Suspense>
    </div>
  );
};

export default CreativeGallery;
