import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ShoppingBag, RefreshCw, AlertCircle, Clock, Link as LinkIcon, ExternalLink } from 'lucide-react';
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

  const [datePreset, setDatePreset] = useState('30d');
  const [isRefreshing, setIsRefreshing] = useState(false);

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
      // Execute background force-refreshes with refresh=true query param
      await Promise.all([
        getShopifyOverview({ preset: datePreset, refresh: true }),
        getShopifySalesTrend({ preset: datePreset, refresh: true }),
        getShopifyTopProducts({ preset: datePreset, limit: 10, refresh: true }),
        getShopifyRecentOrders({ limit: 10, refresh: true })
      ]);

      // Invalidate React Query cache to reflect fresh data
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
              marginTop: '0.5rem'
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
