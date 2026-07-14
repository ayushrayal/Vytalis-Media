import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useDashboard } from '../context/DashboardContext';
import { CreativeCardSkeleton } from '../components/LoadingSkeleton';
import { AlertCircle, Image as ImageIcon, Video, Layers, Search, Eye, Filter, RefreshCw } from 'lucide-react';
import { formatCurrency } from '../utils/formatter';
import CreativeImage from '../components/CreativeImage';

const CreativeGallery = () => {
  const { datePreset, customRange, refreshTrigger, globalSearch, setGlobalSearch } = useDashboard();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creatives, setCreatives] = useState([]);

  // Filter states
  const [selectedType, setSelectedType] = useState('all');
  const [selectedBadge, setSelectedBadge] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [localSearch, setLocalSearch] = useState('');

  // Fetch creatives list
  const fetchCreatives = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `http://localhost:5000/api/creatives?preset=${datePreset}`;
      if (datePreset === 'custom' && customRange.since && customRange.until) {
        url += `&since=${customRange.since}&until=${customRange.until}`;
      }

      const response = await axios.get(url);
      setCreatives(response.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load creatives.');
    } finally {
      setLoading(false);
    }
  }, [datePreset, customRange, refreshTrigger]);

  useEffect(() => {
    if (datePreset === 'custom' && (!customRange.since || !customRange.until)) {
      return;
    }
    fetchCreatives();
  }, [fetchCreatives, datePreset, customRange]);

  // Synchronize global search bar
  useEffect(() => {
    setLocalSearch(globalSearch || '');
  }, [globalSearch]);

  const handleLocalSearchChange = (e) => {
    setLocalSearch(e.target.value);
    setGlobalSearch(e.target.value); // Sync to header bar search
  };

  // Perform client-side filter
  const filteredCreatives = creatives.filter(item => {
    // 1. Search Query filter (matches creative name, ad name, campaign name, or primary copy text)
    const query = localSearch.toLowerCase();
    const matchesSearch = !query || 
      item.name.toLowerCase().includes(query) || 
      (item.copyText && item.copyText.toLowerCase().includes(query)) ||
      item.ads.some(ad => 
        ad.adName.toLowerCase().includes(query) ||
        ad.campaignName.toLowerCase().includes(query) ||
        ad.adsetName.toLowerCase().includes(query)
      );

    // 2. Creative Type filter
    const matchesType = selectedType === 'all' || 
      (selectedType === 'video' && item.isVideo) ||
      (selectedType === 'static' && !item.isVideo);

    // 3. Performance Badge filter
    const matchesBadge = selectedBadge === 'all' || item.performanceBadge === selectedBadge;

    // 4. Category filter
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;

    return matchesSearch && matchesType && matchesBadge && matchesCategory;
  });

  // Extract unique category tags for the filter dropdown
  const categoriesList = ['all', ...new Set(creatives.map(c => c.category).filter(Boolean))];

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ImageIcon size={28} color="var(--primary)" />
          <span>Creative Performance Gallery</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Browse unique creative combinations with mapped conversions and video performance metrics
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

      {/* Filters Strip */}
      <div className="card" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '2rem',
        padding: '1rem',
        flexWrap: 'wrap'
      }}>
        {/* Local Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '240px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.75rem', background: 'var(--bg-primary)' }}>
          <Search size={16} color="var(--text-tertiary)" />
          <input
            type="text"
            placeholder="Search creatives & copy..."
            value={localSearch}
            onChange={handleLocalSearchChange}
            style={{ width: '100%', fontSize: '0.85rem', color: 'var(--text-primary)' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Format Type */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}>
            <Filter size={14} color="var(--text-secondary)" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              style={{ padding: '0.4rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', fontSize: '0.85rem', cursor: 'pointer' }}
            >
              <option value="all">All Formats</option>
              <option value="static">Static Images</option>
              <option value="video">Videos Only</option>
            </select>
          </div>

          {/* Performance Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}>
            <Filter size={14} color="var(--text-secondary)" />
            <select
              value={selectedBadge}
              onChange={(e) => setSelectedBadge(e.target.value)}
              style={{ padding: '0.4rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', fontSize: '0.85rem', cursor: 'pointer' }}
            >
              <option value="all">All Performance Levels</option>
              <option value="Excellent">Excellent (4.0+ ROAS)</option>
              <option value="Great">Great (2.5+ ROAS)</option>
              <option value="Good">Good (1.5+ ROAS)</option>
              <option value="Average">Average (1.0+ ROAS)</option>
              <option value="Poor">Poor (0.5+ ROAS)</option>
              <option value="Critical">Critical (&lt; 0.5 ROAS)</option>
            </select>
          </div>

          {/* Categories */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}>
            <Filter size={14} color="var(--text-secondary)" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ padding: '0.4rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', fontSize: '0.85rem', cursor: 'pointer', textTransform: 'capitalize' }}
            >
              {categoriesList.map(cat => (
                <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Creatives Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }}>
          {Array.from({ length: 8 }).map((_, idx) => <CreativeCardSkeleton key={idx} />)}
        </div>
      ) : filteredCreatives.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }}>
          {filteredCreatives.map((creative) => {
            const displayBadgeClass = `badge badge-${creative.performanceBadge.toLowerCase()}`;
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
                  height: '460px'
                }}
              >
                {/* Media Preview container */}
                <div style={{ height: '220px', background: 'var(--bg-tertiary)', position: 'relative', overflow: 'hidden' }}>
                  <CreativeImage
                    src={creative.imageUrl || creative.thumbnailUrl}
                    alt={creative.name}
                    isVideo={creative.isVideo}
                    aspectRatio="auto"
                    style={{ width: '100%', height: '100%' }}
                  />
                  {creative.isVideo && (
                    <div style={{
                      position: 'absolute',
                      top: '10px',
                      left: '10px',
                      width: '28px',
                      height: '28px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(0,0,0,0.6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff'
                    }}>
                      <Video size={14} />
                    </div>
                  )}

                  {/* Absolute Badge elements */}
                  <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                    <span className={displayBadgeClass}>{creative.performanceBadge}</span>
                  </div>

                  <div style={{ position: 'absolute', bottom: '10px', left: '10px' }}>
                    <span className="badge" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                      {creative.category}
                    </span>
                  </div>
                </div>

                {/* Content Block */}
                <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <h4 style={{
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
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

                  {/* Metrics grid summary */}
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

                  {/* Hook / Hold video specific display */}
                  {creative.isVideo && (
                    <div style={{
                      display: 'flex',
                      gap: '0.75rem',
                      fontSize: '0.75rem',
                      background: 'var(--bg-primary)',
                      padding: '0.25rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      marginTop: '0.5rem',
                      color: 'var(--text-secondary)'
                    }}>
                      <span>Hook: <strong>{creative.metrics.hookRate?.toFixed(1) || 0}%</strong></span>
                      <span>Hold: <strong>{creative.metrics.holdRate?.toFixed(1) || 0}%</strong></span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card flex-center" style={{ height: '300px', flexDirection: 'column', gap: '0.5rem' }}>
          <AlertCircle size={28} color="var(--text-tertiary)" />
          <p style={{ color: 'var(--text-secondary)' }}>No creatives matched the current filters.</p>
        </div>
      )}
    </div>
  );
};

export default CreativeGallery;
