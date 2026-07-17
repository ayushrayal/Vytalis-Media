import React from 'react';
import { ShoppingCart, AlertCircle } from 'lucide-react';
import RecentOrdersTableSkeleton from './skeletons/RecentOrdersTableSkeleton';
import { formatShopifyCurrency } from '../utils/formatter';

const RecentOrdersTable = ({ data, isLoading, isError, error }) => {
  if (isLoading) {
    return <RecentOrdersTableSkeleton />;
  }

  if (isError) {
    return (
      <div
        className="card"
        style={{
          padding: '1.25rem',
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid var(--danger)',
          color: 'var(--danger)',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}
      >
        <AlertCircle size={18} />
        <span>Failed to load Recent Orders: {error?.response?.data?.message || error?.message || 'Unknown error'}</span>
      </div>
    );
  }

  const orders = data?.data?.orders || [];
  const currency = data?.data?.currency || 'USD';

  const getFinancialBadgeStyle = (status) => {
    const s = (status || '').toUpperCase();
    if (s === 'PAID') {
      return { bg: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)', border: 'var(--success)' };
    }
    if (s === 'PENDING' || s === 'AUTHORIZED') {
      return { bg: 'rgba(234, 179, 8, 0.1)', color: '#eab308', border: '#eab308' };
    }
    return { bg: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: 'var(--danger)' };
  };

  const getFulfillmentBadgeStyle = (status) => {
    const s = (status || '').toUpperCase();
    if (s === 'FULFILLED') {
      return { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '#3b82f6' };
    }
    if (s === 'IN_PROGRESS' || s === 'PARTIALLY_FULFILLED') {
      return { bg: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', border: '#a855f7' };
    }
    return { bg: 'var(--bg-tertiary)', color: 'var(--text-tertiary)', border: 'var(--border-color)' };
  };

  return (
    <div
      className="card"
      style={{
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <ShoppingCart size={20} color="var(--primary)" />
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Recent Orders</h3>
      </div>

      {orders.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>
          No recent orders found for your store.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>
                <th style={{ padding: '0.75rem 1rem' }}>Order</th>
                <th style={{ padding: '0.75rem 1rem' }}>Customer</th>
                <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                <th style={{ padding: '0.75rem 1rem' }}>Payment</th>
                <th style={{ padding: '0.75rem 1rem' }}>Fulfillment</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((ord) => {
                const finStyle = getFinancialBadgeStyle(ord.financialStatus);
                const fulStyle = getFulfillmentBadgeStyle(ord.fulfillmentStatus);
                return (
                  <tr
                    key={ord.id}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background var(--transition-fast)'
                    }}
                    className="table-row-hover"
                  >
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {ord.orderNumber}
                    </td>

                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                      {ord.customerName}
                    </td>

                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
                      {ord.createdAt ? new Date(ord.createdAt).toLocaleDateString() : 'N/A'}
                    </td>

                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '0.25rem 0.6rem',
                          borderRadius: '999px',
                          backgroundColor: finStyle.bg,
                          color: finStyle.color,
                          border: `1px solid ${finStyle.border}`
                        }}
                      >
                        {ord.financialStatus}
                      </span>
                    </td>

                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '0.25rem 0.6rem',
                          borderRadius: '999px',
                          backgroundColor: fulStyle.bg,
                          color: fulStyle.color,
                          border: `1px solid ${fulStyle.border}`
                        }}
                      >
                        {ord.fulfillmentStatus}
                      </span>
                    </td>

                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {formatShopifyCurrency(ord.totalPrice, currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default React.memo(RecentOrdersTable);
