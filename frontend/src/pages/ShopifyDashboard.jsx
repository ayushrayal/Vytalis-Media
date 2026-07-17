import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ShoppingBag, RefreshCw, AlertCircle, CheckCircle2, Clock, Link as LinkIcon, ExternalLink } from 'lucide-react';
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

  const [datePreset, setDatePreset] = useState('30d');
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

  // Independent widget queries (only enabled if store is connected)
  const overviewQuery = useShopifyOverview(datePreset, isConnected);
  const trendQuery = useShopifySalesTrend(datePreset, isConnected);
  const productsQuery = useShopifyTopProducts(datePreset, 10, isConnected);
  const ordersQuery = useShopifyRecentOrders(10, isConnected);

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
        getShopifyOverview({ preset: datePreset, refresh: true }),
        getShopifySalesTrend({ preset: datePreset, refresh: true }),
        getShopifyTopProducts({ preset: datePreset, limit: 10, refresh: true }),
        getShopifyRecentOrders({ limit: 10, refresh: true })
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
          justifyContent: 'space-between',
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
        preset={datePreset}
        onPresetChange={setDatePreset}
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
        />

        <RecentOrdersTable
          data={ordersQuery.data}
          isLoading={ordersQuery.isLoading}
          isError={ordersQuery.isError}
          error={ordersQuery.error}
        />
      </div>
    </div>
  );
};

export default ShopifyDashboard;
