import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ShoppingBag, RefreshCw, AlertCircle, CheckCircle2, Clock, Link as LinkIcon, Calendar, Filter } from 'lucide-react';
import {
  useShopifyStatus,
  useShopifyOverview,
  useShopifySalesTrend,
  useShopifyTopProducts,
  useShopifyRecentOrders,
  getShopifyOverview,
  getShopifySalesTrend,
  getShopifyTopProducts,
  getShopifyRecentOrders
} from '../utils/shopifyApi';

import ShopifyOverviewCards from '../components/ShopifyOverviewCards';
import SalesTrendChart from '../components/SalesTrendChart';
import TopProductsTable from '../components/TopProductsTable';
import RecentOrdersTable from '../components/RecentOrdersTable';

const ShopifyDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Global Filter State
  const [datePreset, setDatePreset] = useState('30d');
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [appliedStartDate, setAppliedStartDate] = useState(null);
  const [appliedEndDate, setAppliedEndDate] = useState(null);
  const [dateError, setDateError] = useState(null);

  // Server-Side Pagination States
  const [topProductsPage, setTopProductsPage] = useState(1);
  const [recentOrdersPage, setRecentOrdersPage] = useState(1);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusBanner, setStatusBanner] = useState(null);

  useEffect(() => {
    const statusParam = searchParams.get('status');
    const legacyConnected = searchParams.get('shopify_connected');

    if (statusParam) {
      switch (statusParam) {
        case 'success':
          setStatusBanner({ type: 'success', message: 'Shopify store connected successfully.' });
          break;
        case 'cancelled':
          setStatusBanner({ type: 'error', message: 'Shopify authorization was cancelled.' });
          break;
        case 'invalid_hmac':
          setStatusBanner({ type: 'error', message: 'Security validation failed.' });
          break;
        case 'invalid_state':
          setStatusBanner({ type: 'error', message: 'Session expired. Please try again.' });
          break;
        case 'invalid_domain':
          setStatusBanner({ type: 'error', message: 'Invalid store domain.' });
          break;
        case 'error':
        default:
          setStatusBanner({ type: 'error', message: 'Unable to connect Shopify store.' });
          break;
      }
      searchParams.delete('status');
      setSearchParams(searchParams);
    } else if (legacyConnected) {
      setStatusBanner({ type: 'success', message: 'Shopify store connected successfully.' });
      searchParams.delete('shopify_connected');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams]);

  // Check connection status first
  const { data: status, isLoading: isStatusLoading } = useShopifyStatus();
  const isConnected = !!status?.connected;

  // Active Global Filter Params
  const filterParams = {
    preset: datePreset,
    startDate: datePreset === 'custom' ? appliedStartDate : null,
    endDate: datePreset === 'custom' ? appliedEndDate : null
  };

  // Independent widget queries (only enabled if store is connected)
  const overviewQuery = useShopifyOverview(filterParams, isConnected);
  const trendQuery = useShopifySalesTrend(filterParams, isConnected);
  const productsQuery = useShopifyTopProducts({ ...filterParams, page: topProductsPage, limit: 10 }, isConnected);
  const ordersQuery = useShopifyRecentOrders({ ...filterParams, page: recentOrdersPage, limit: 10 }, isConnected);

  // Handle Preset Changes
  const handlePresetSelect = (preset) => {
    setDateError(null);
    setDatePreset(preset);
    setTopProductsPage(1);
    setRecentOrdersPage(1);
  };

  // Handle Custom Date Apply
  const handleApplyCustomDates = (e) => {
    e.preventDefault();
    setDateError(null);

    if (!startDateInput || !endDateInput) {
      setDateError('Please select both Start Date and End Date.');
      return;
    }

    const start = new Date(startDateInput);
    const end = new Date(endDateInput);

    if (start > end) {
      setDateError('Start Date cannot be after End Date.');
      return;
    }

    const diffMs = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays > 365) {
      setDateError('Maximum custom date range is 365 days.');
      return;
    }

    setAppliedStartDate(startDateInput);
    setAppliedEndDate(endDateInput);
    setTopProductsPage(1);
    setRecentOrdersPage(1);
  };

  // Derive last updated timestamp from available query metadata
  const lastUpdated =
    overviewQuery.data?.meta?.lastUpdated ||
    trendQuery.data?.meta?.lastUpdated ||
    productsQuery.data?.meta?.lastUpdated ||
    ordersQuery.data?.meta?.lastUpdated;

  // Interactive Manual Refresh
  const handleManualRefresh = async () => {
    if (isRefreshing || !isConnected) return;
    setIsRefreshing(true);

    try {
      await Promise.all([
        getShopifyOverview({ ...filterParams, refresh: true }),
        getShopifySalesTrend({ ...filterParams, refresh: true }),
        getShopifyTopProducts({ ...filterParams, page: topProductsPage, limit: 10, refresh: true }),
        getShopifyRecentOrders({ ...filterParams, page: recentOrdersPage, limit: 10, refresh: true })
      ]);

      queryClient.invalidateQueries({ queryKey: ['shopify'] });
    } catch (err) {
      console.error('Failed to manually refresh Shopify analytics:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Render Disconnected Empty State Card
  if (!isStatusLoading && !isConnected) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px', margin: '2rem auto' }}>
        {statusBanner && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: statusBanner.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${statusBanner.type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
              color: statusBanner.type === 'success' ? 'var(--success)' : 'var(--danger)',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {statusBanner.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{statusBanner.message}</span>
          </div>
        )}

        <div
          className="card fade-in"
          style={{
            padding: '2.5rem 2rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.25rem'
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(150, 191, 72, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#95BF47'
            }}
          >
            <ShoppingBag size={32} />
          </div>

          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Shopify Store Not Connected
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '500px', margin: '0 auto' }}>
              Connect your Shopify store to view real-time sales revenue, order analytics, top selling products, and customer trends.
            </p>
          </div>

          <button
            onClick={() => navigate('/profile')}
            className="btn btn-primary"
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginTop: '0.5rem',
              backgroundColor: '#95BF47',
              borderColor: '#95BF47'
            }}
          >
            <LinkIcon size={18} />
            <span>Go to Integrations</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {statusBanner && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: statusBanner.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${statusBanner.type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
            color: statusBanner.type === 'success' ? 'var(--success)' : 'var(--danger)',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          {statusBanner.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{statusBanner.message}</span>
        </div>
      )}

      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '1rem'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(150, 191, 72, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#95BF47'
              }}
            >
              <ShoppingBag size={18} />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Shopify Analytics</h1>
          </div>
          {status?.storeDomain && (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginTop: '0.2rem' }}>
              Store: <strong>{status.shopName || status.storeDomain}</strong> ({status.currency || 'USD'})
            </p>
          )}
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {lastUpdated && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Clock size={14} />
              <span>Last Updated: {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}

          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing || isStatusLoading}
            className="btn btn-secondary"
            style={{
              padding: '0.5rem 0.85rem',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              opacity: isRefreshing ? 0.7 : 1
            }}
          >
            <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Global Reporting Period Bar */}
      <div
        className="card"
        style={{
          padding: '1rem 1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={18} color="var(--primary)" />
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>Reporting Period:</span>
          </div>

          {/* Preset Pill Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: '7d', label: 'Last 7 Days' },
              { id: '30d', label: 'Last 30 Days' },
              { id: 'custom', label: 'Custom Date Range' }
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => handlePresetSelect(p.id)}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8rem',
                  fontWeight: datePreset === p.id ? 700 : 500,
                  backgroundColor: datePreset === p.id ? 'var(--primary)' : 'var(--bg-tertiary)',
                  color: datePreset === p.id ? '#ffffff' : 'var(--text-secondary)',
                  border: '1px solid',
                  borderColor: datePreset === p.id ? 'var(--primary)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Inputs */}
        {datePreset === 'custom' && (
          <form
            onSubmit={handleApplyCustomDates}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap',
              paddingTop: '0.5rem',
              borderTop: '1px solid var(--border-color)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Calendar size={16} color="var(--text-tertiary)" />
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Start:</label>
              <input
                type="date"
                value={startDateInput}
                onChange={(e) => setStartDateInput(e.target.value)}
                style={{
                  padding: '0.35rem 0.6rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.8rem'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>End:</label>
              <input
                type="date"
                value={endDateInput}
                onChange={(e) => setEndDateInput(e.target.value)}
                style={{
                  padding: '0.35rem 0.6rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.8rem'
                }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{
                padding: '0.35rem 0.85rem',
                fontSize: '0.8rem',
                backgroundColor: 'var(--primary)'
              }}
            >
              Apply Filter
            </button>
          </form>
        )}

        {/* Custom Date Validation Error */}
        {dateError && (
          <div
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--danger)',
              color: 'var(--danger)',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <AlertCircle size={15} />
            <span>{dateError}</span>
          </div>
        )}
      </div>

      {/* 1. Overview KPI Cards */}
      <ShopifyOverviewCards
        data={overviewQuery.data}
        isLoading={overviewQuery.isLoading}
        isError={overviewQuery.isError}
        error={overviewQuery.error}
      />

      {/* 2. Sales & Orders Trend Line Chart */}
      <SalesTrendChart
        data={trendQuery.data}
        isLoading={trendQuery.isLoading}
        isError={trendQuery.isError}
        error={trendQuery.error}
      />

      {/* 3. Tables Grid: Top Products & Recent Orders */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
          gap: '1.5rem',
          alignItems: 'start'
        }}
      >
        <TopProductsTable
          data={productsQuery.data}
          isLoading={productsQuery.isLoading}
          isError={productsQuery.isError}
          error={productsQuery.error}
          page={topProductsPage}
          onPageChange={setTopProductsPage}
        />

        <RecentOrdersTable
          data={ordersQuery.data}
          isLoading={ordersQuery.isLoading}
          isError={ordersQuery.isError}
          error={ordersQuery.error}
          page={recentOrdersPage}
          onPageChange={setRecentOrdersPage}
        />
      </div>
    </div>
  );
};

export default ShopifyDashboard;
