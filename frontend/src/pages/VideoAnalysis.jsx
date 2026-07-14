import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useDashboard } from '../context/DashboardContext';
import { TableSkeleton, ChartSkeleton } from '../components/LoadingSkeleton';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { AlertCircle, Video, Play, SlidersHorizontal } from 'lucide-react';
import { formatCurrency } from '../utils/formatter';
import CreativeImage from '../components/CreativeImage';
import FilterDrawer from '../components/FilterDrawer';
import CreativeDetailsModal from '../components/CreativeDetailsModal';

const VideoAnalysis = () => {
  const { datePreset, customRange, refreshTrigger, globalSearch } = useDashboard();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [videos, setVideos] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });

  // Filter Drawer State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
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

  const fetchVideoCreatives = useCallback(async () => {
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

      const response = await axios.get('http://localhost:5000/api/creatives/videos', { params });
      setVideos(response.data.data || []);
      setPagination(response.data.pagination || { page: 1, limit: 12, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load video creatives.');
    } finally {
      setLoading(false);
    }
  }, [datePreset, customRange, refreshTrigger, globalSearch, activeFilters, currentPage]);

  useEffect(() => {
    if (datePreset === 'custom' && (!customRange.since || !customRange.until)) {
      return;
    }
    fetchVideoCreatives();
  }, [fetchVideoCreatives, datePreset, customRange]);

  const handleFilterChange = (id, value) => {
    setActiveFilters(prev => ({
      ...prev,
      [id]: value
    }));
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setActiveFilters({
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

  const filtersConfig = [
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

  // Prepare chart dataset (creative name capped + retention rates)
  const chartData = videos.map(v => ({
    name: v.name.length > 15 ? v.name.slice(0, 15) + '...' : v.name,
    'Hook Rate %': parseFloat((v.metrics.hookRate || 0).toFixed(1)),
    'Hold Rate %': parseFloat((v.metrics.holdRate || 0).toFixed(1))
  })).slice(0, 10);

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Video size={28} color="var(--primary)" />
            <span>Video Creative Retention Analytics</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Detailed hook rates, hold rates, and performance deltas across all running video formats
          </p>
        </div>

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
        <div style={{ background: 'var(--danger-light)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <ChartSkeleton />
          <TableSkeleton />
        </div>
      ) : videos.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Hook vs Hold Chart */}
          <div className="card fade-in" style={{ height: '400px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Hook Rate vs Hold Rate Comparison (Top 10 Videos)</h3>
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} tickFormatter={(val) => `${val}%`} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-secondary)',
                      borderColor: 'var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Bar name="Hook Rate (3s/Imp)" dataKey="Hook Rate %" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  <Bar name="Hold Rate (ThruPlay/3s)" dataKey="Hold Rate %" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table list */}
          <div className="card fade-in" style={{ overflowX: 'auto', padding: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '1rem' }}>Thumbnail & Video Name</th>
                  <th style={{ padding: '1rem' }}>Rating</th>
                  <th style={{ padding: '1rem' }}>Category</th>
                  <th style={{ padding: '1rem' }}>Spend</th>
                  <th style={{ padding: '1rem' }}>ROAS</th>
                  <th style={{ padding: '1rem' }}>Hook Rate</th>
                  <th style={{ padding: '1rem' }}>Hold Rate</th>
                  <th style={{ padding: '1rem' }}>CPA</th>
                  <th style={{ padding: '1rem' }}>Purchases</th>
                </tr>
              </thead>
              <tbody>
                {videos.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => {
                      setSelectedCreativeId(row.id);
                      setIsModalOpen(true);
                    }}
                    style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background var(--transition-fast)' }}
                    className="table-row-hover"
                  >
                    <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '4px', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                        <CreativeImage
                          src={row.thumbnailUrl || row.imageUrl}
                          alt={row.name}
                          isVideo={true}
                          aspectRatio="1/1"
                        />
                      </div>
                      <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>{row.name}</span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span className={`badge badge-${row.performanceBadge.toLowerCase()}`} style={{ fontSize: '0.75rem' }}>
                        {row.performanceBadge}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textTransform: 'capitalize' }}>{row.category}</td>
                    <td style={{ padding: '1rem' }}>{formatCurrency(row.metrics.spend)}</td>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{row.metrics.roas.toFixed(2)}x</td>
                    <td style={{ padding: '1rem', color: row.metrics.hookRate >= 30 ? 'var(--success)' : 'inherit' }}>
                      {(row.metrics.hookRate || 0).toFixed(1)}%
                    </td>
                    <td style={{ padding: '1rem', color: row.metrics.holdRate >= 15 ? 'var(--success)' : 'inherit' }}>
                      {(row.metrics.holdRate || 0).toFixed(1)}%
                    </td>
                    <td style={{ padding: '1rem' }}>{formatCurrency(row.metrics.cpa)}</td>
                    <td style={{ padding: '1rem' }}>{row.metrics.purchases}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      ) : (
        <div className="card flex-center" style={{ height: '300px', flexDirection: 'column', gap: '0.5rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No video creatives matched the active filters.</p>
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

      <style>{`
        .table-row-hover:hover {
          background-color: var(--bg-primary);
        }
      `}</style>
    </div>
  );
};

export default VideoAnalysis;
