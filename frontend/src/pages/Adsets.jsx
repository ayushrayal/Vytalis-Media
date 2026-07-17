import React, { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import { useQuery } from '@tanstack/react-query';
import { useDashboard } from '../context/DashboardContext';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { AlertCircle, Layers, Search } from 'lucide-react';
import SectionError from '../components/SectionError';
import { getFriendlyErrorMessage } from '../utils/errorHandler';
import { formatCurrency, formatCompact } from '../utils/formatter';

const Adsets = () => {
  const { datePreset, customRange, refreshTrigger } = useDashboard();
  const [searchQuery, setSearchQuery] = useState('');

  const isCustomAndIncomplete = datePreset === 'custom' && (!customRange.since || !customRange.until);

  // Fetch ad set metadata and period-specific metrics together.
  const { data: adsetResponse, isLoading: loading, error: queryError, refetch: fetchAdsets } = useQuery({
    queryKey: ['adsets', { datePreset, customRange, refreshTrigger, searchQuery }],
    queryFn: async () => {
      let url = `${API_URL}/api/adsets?preset=${datePreset}&search=${encodeURIComponent(searchQuery)}`;
      if (datePreset === 'custom' && customRange.since && customRange.until) {
        url += `&since=${customRange.since}&until=${customRange.until}`;
      }
      const response = await axios.get(url);
      return response.data;
    },
    enabled: !isCustomAndIncomplete
  });

  const error = queryError ? getFriendlyErrorMessage(queryError) : null;
  const adsets = adsetResponse?.data || [];

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers size={28} color="var(--primary)" />
          <span>Active Ad Sets Overview</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Detailed list of targeting configurations and ad sets linked to running creatives
        </p>
      </div>

      {error && (
        <SectionError
          message={error}
          onRetry={fetchAdsets}
          isRetrying={loading}
        />
      )}

      {/* Search Input bar */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', padding: '0.75rem 1rem' }}>
        <Search size={16} color="var(--text-tertiary)" />
        <input
          type="text"
          placeholder="Filter ad sets by name, ID, or campaign..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', fontSize: '0.85rem', color: 'var(--text-primary)' }}
        />
      </div>

      {loading ? (
        <TableSkeleton rows={8} />
      ) : adsets.length > 0 ? (
        <div className="card fade-in" style={{ overflowX: 'auto', padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '1rem' }}>Ad Set ID</th>
                <th style={{ padding: '1rem' }}>Ad Set Name</th>
                <th style={{ padding: '1rem' }}>Parent Campaign</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem' }}>Spend</th>
                <th style={{ padding: '1rem' }}>Reach</th>
                <th style={{ padding: '1rem' }}>Impressions</th>
                <th style={{ padding: '1rem' }}>Frequency</th>
                <th style={{ padding: '1rem' }}>CTR</th>
                <th style={{ padding: '1rem' }}>CPM</th>
                <th style={{ padding: '1rem' }}>CPC</th>
                <th style={{ padding: '1rem' }}>Adds to Cart</th>
                <th style={{ padding: '1rem' }}>Checkout</th>
                <th style={{ padding: '1rem' }}>Purchases</th>
                <th style={{ padding: '1rem' }}>ROAS</th>
              </tr>
            </thead>
            <tbody>
              {adsets.map((row) => (
                <tr key={row.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background var(--transition-fast)' }} className="table-row-hover">
                  <td style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{row.id}</td>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{row.name}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                    {row.campaignName} <br />
                    <span style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>({row.campaignId})</span>
                  </td>
                  <td style={{ padding: '1rem' }}><span className={`badge ${row.status === 'ACTIVE' ? 'badge-active' : 'badge-paused'}`} style={{ fontSize: '0.75rem' }}>{row.status}</span></td>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{formatCurrency(row.spend)}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{formatCompact(row.reach)}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{formatCompact(row.impressions)}</td>
                  <td style={{ padding: '1rem' }}>{row.frequency.toFixed(2)}</td>
                  <td style={{ padding: '1rem' }}>{row.ctr.toFixed(2)}%</td>
                  <td style={{ padding: '1rem' }}>{formatCurrency(row.cpm)}</td>
                  <td style={{ padding: '1rem' }}>{formatCurrency(row.cpc)}</td>
                  <td style={{ padding: '1rem' }}>{formatCompact(row.addsToCart)}</td>
                  <td style={{ padding: '1rem' }}>{formatCompact(row.checkoutInitiated)}</td>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{formatCompact(row.purchases)}</td>
                  <td style={{ padding: '1rem', fontWeight: 600, color: row.roas >= 1.5 ? 'var(--success)' : 'var(--text-primary)' }}>{row.roas.toFixed(2)}×</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card flex-center" style={{ height: '200px', flexDirection: 'column', gap: '0.5rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No targeting ad sets matching your filters.</p>
        </div>
      )}

      <style>{`
        .table-row-hover:hover {
          background-color: var(--bg-primary);
        }
      `}</style>
    </div>
  );
};

export default Adsets;
