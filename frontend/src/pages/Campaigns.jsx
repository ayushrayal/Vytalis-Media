import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useDashboard } from '../context/DashboardContext';
import { TableSkeleton } from '../components/LoadingSkeleton';
import {
  AlertCircle, Target, Download, ChevronLeft, ChevronRight,
  ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import DebouncedInput from '../components/debouncedInput';
import CampaignDetailsDrawer from '../components/CampaignDetailsDrawer';
import SectionError from '../components/SectionError';
import { getFriendlyErrorMessage } from '../utils/errorHandler';
import { formatCurrency } from '../utils/formatter';

const Campaigns = () => {
  const { datePreset, customRange, refreshTrigger } = useDashboard();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('spend');
  const [order, setOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Drawer state
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `http://localhost:5000/api/campaigns?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&status=${status}&sort=${sort}&order=${order}&datePreset=${datePreset}`;
      if (datePreset === 'custom' && customRange.since && customRange.until) {
        url += `&since=${customRange.since}&until=${customRange.until}`;
      }

      const response = await axios.get(url);
      setCampaigns(response.data.data || []);
      const pag = response.data.pagination || {};
      setTotal(pag.total || 0);
      setTotalPages(pag.totalPages || 1);
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, status, sort, order, datePreset, customRange, refreshTrigger]);

  useEffect(() => {
    if (datePreset === 'custom' && (!customRange.since || !customRange.until)) {
      return;
    }
    fetchCampaigns();
  }, [fetchCampaigns, datePreset, customRange]);

  // Reset page when search or status filters change
  useEffect(() => {
    setPage(1);
  }, [search, status]);

  const handleSort = (field) => {
    if (sort === field) {
      setOrder(prev => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSort(field);
      setOrder('desc');
    }
    setPage(1);
  };

  const handleExport = () => {
    let url = `http://localhost:5000/api/campaigns/export?search=${encodeURIComponent(search)}&status=${status}&sort=${sort}&order=${order}&datePreset=${datePreset}`;
    if (datePreset === 'custom' && customRange.since && customRange.until) {
      url += `&since=${customRange.since}&until=${customRange.until}`;
    }
    window.open(url, '_blank');
  };

  const getSortIcon = (field) => {
    if (sort !== field) return <ArrowUpDown size={12} style={{ marginLeft: '4px', opacity: 0.5 }} />;
    return order === 'desc' ? (
      <ArrowDown size={12} style={{ marginLeft: '4px', color: 'var(--primary)' }} />
    ) : (
      <ArrowUp size={12} style={{ marginLeft: '4px', color: 'var(--primary)' }} />
    );
  };

  const headers = [
    { label: 'Campaign Name', key: 'name', sortable: true },
    { label: 'Status', key: 'status', sortable: true },
    { label: 'Spend', key: 'spend', sortable: true, align: 'right' },
    { label: 'Reach', key: 'reach', sortable: true, align: 'right' },
    { label: 'Impressions', key: 'impressions', sortable: true, align: 'right' },
    { label: 'Frequency', key: 'frequency', sortable: true, align: 'right' },
    { label: 'CTR', key: 'ctr', sortable: true, align: 'right' },
    { label: 'CPM', key: 'cpm', sortable: true, align: 'right' },
    { label: 'CPC', key: 'cpc', sortable: true, align: 'right' },
    { label: 'Adds To Cart', key: 'addsToCart', sortable: true, align: 'right' },
    { label: 'Checkout Initiated', key: 'checkoutInitiated', sortable: true, align: 'right' },
    { label: 'Purchases', key: 'purchases', sortable: true, align: 'right' },
    { label: 'Revenue', key: 'purchaseConversionValue', sortable: true, align: 'right' },
    { label: 'ROAS', key: 'roas', sortable: true, align: 'right' },
    { label: 'AOV', key: 'aov', sortable: true, align: 'right' },
    { label: 'CPP', key: 'costPerPurchase', sortable: true, align: 'right' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Target size={28} color="var(--primary)" />
            <span>Campaign Analytics</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Professional table reporting conversion performance of Sales campaigns.
          </p>
        </div>
        <button
          onClick={handleExport}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Download size={16} />
          <span>Export CSV</span>
        </button>
      </div>

      {error && (
        <SectionError
          message={error}
          onRetry={fetchCampaigns}
          isRetrying={loading}
        />
      )}

      {/* Filters Toolbar */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        flexWrap: 'wrap',
        background: 'var(--bg-secondary)',
        padding: '1rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)'
      }}>
        {/* Search */}
        <div style={{ flex: 1, minWidth: '240px' }}>
          <DebouncedInput
            className="input-field"
            placeholder="Search campaigns by name or ID..."
            value={search}
            onChange={setSearch}
            style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
          />
        </div>

        {/* Status Filter */}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            fontSize: '0.85rem'
          }}
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PAUSED">Paused</option>
        </select>

        {/* Limit Select */}
        <select
          value={limit}
          onChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(1); }}
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            fontSize: '0.85rem'
          }}
        >
          <option value={10}>10 rows</option>
          <option value={25}>25 rows</option>
          <option value={50}>50 rows</option>
          <option value={100}>100 rows</option>
        </select>
      </div>

      {/* Table Container */}
      {loading ? (
        <TableSkeleton rows={8} />
      ) : campaigns.length > 0 ? (
        <div className="card fade-in" style={{ padding: 0, overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-tertiary)' }}>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  {headers.map((h) => (
                    <th
                      key={h.key}
                      onClick={() => h.sortable && handleSort(h.key)}
                      style={{
                        padding: '1rem',
                        cursor: h.sortable ? 'pointer' : 'default',
                        userSelect: 'none',
                        textAlign: h.align === 'right' ? 'right' : 'left',
                        whiteSpace: 'nowrap',
                        color: sort === h.key ? 'var(--primary)' : 'var(--text-secondary)',
                        fontWeight: 700
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: h.align === 'right' ? 'flex-end' : 'flex-start' }}>
                        <span>{h.label}</span>
                        {h.sortable && getSortIcon(h.key)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedCampaignId(row.id)}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      transition: 'background var(--transition-normal)'
                    }}
                    className="table-row-hover"
                  >
                    {/* Campaign Name & ID */}
                    <td style={{ padding: '1rem', minWidth: '180px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontFamily: 'monospace', marginTop: '2px' }}>{row.id}</div>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '1rem' }}>
                      <span className={`badge ${row.status === 'ACTIVE' ? 'badge-active' : 'badge-paused'}`} style={{ fontSize: '0.7rem' }}>
                        {row.status}
                      </span>
                    </td>

                    {/* Spend */}
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>
                      {formatCurrency(row.spend)}
                    </td>

                    {/* Reach */}
                    <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {(row.reach || 0).toLocaleString()}
                    </td>

                    {/* Impressions */}
                    <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {(row.impressions || 0).toLocaleString()}
                    </td>

                    {/* Frequency */}
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      {row.frequency.toFixed(2)}
                    </td>

                    {/* CTR */}
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>
                      {row.ctr.toFixed(2)}%
                    </td>

                    {/* CPM */}
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      {formatCurrency(row.cpm)}
                    </td>

                    {/* CPC */}
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      {formatCurrency(row.cpc)}
                    </td>

                    {/* Adds To Cart */}
                    <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {row.addsToCart}
                    </td>

                    {/* Checkout Initiated */}
                    <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {row.checkoutInitiated}
                    </td>

                    {/* Purchases */}
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>
                      {row.purchases}
                    </td>

                    {/* Revenue */}
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700 }}>
                      {formatCurrency(row.purchaseConversionValue)}
                    </td>

                    {/* ROAS */}
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>
                      {row.roas.toFixed(2)}x
                    </td>

                    {/* AOV */}
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      {formatCurrency(row.aov)}
                    </td>

                    {/* Cost Per Purchase (CPP) */}
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      {formatCurrency(row.costPerPurchase)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card flex-center" style={{ height: '250px', flexDirection: 'column', gap: '0.5rem' }}>
          <AlertCircle size={28} color="var(--text-tertiary)" />
          <p style={{ color: 'var(--text-secondary)' }}>No campaigns matching your search or filters.</p>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-secondary)',
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          fontSize: '0.8rem'
        }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            Showing <strong>{((page - 1) * limit) + 1}</strong> to <strong>{Math.min(page * limit, total)}</strong> of <strong>{total}</strong> campaigns
          </span>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.6rem', display: 'flex', alignItems: 'center' }}
            >
              <ChevronLeft size={16} />
            </button>

            <span style={{ margin: '0 0.5rem' }}>
              Page <strong>{page}</strong> of <strong>{totalPages}</strong>
            </span>

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.6rem', display: 'flex', alignItems: 'center' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Campaign Details slide-over drawer */}
      <CampaignDetailsDrawer
        isOpen={!!selectedCampaignId}
        onClose={() => setSelectedCampaignId(null)}
        campaignId={selectedCampaignId}
        datePreset={datePreset}
        customRange={customRange}
      />

      <style>{`
        .table-row-hover:hover {
          background-color: var(--bg-primary) !important;
        }
      `}</style>
    </div>
  );
};

export default Campaigns;
