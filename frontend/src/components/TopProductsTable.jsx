import React from 'react';
import { Package, AlertCircle, ShoppingBag } from 'lucide-react';
import TopProductsTableSkeleton from './skeletons/TopProductsTableSkeleton';
import { formatShopifyCurrency, formatCompact } from '../utils/formatter';

const TopProductsTable = ({ data, isLoading, isError, error }) => {
  if (isLoading) {
    return <TopProductsTableSkeleton />;
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
        <span>Failed to load Top Products: {error?.response?.data?.message || error?.message || 'Unknown error'}</span>
      </div>
    );
  }

  const products = data?.data?.products || [];
  const currency = data?.data?.currency || 'USD';

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
        <Package size={20} color="var(--primary)" />
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Top Selling Products</h3>
      </div>

      {products.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>
          No product sales recorded for this date period.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>
                <th style={{ padding: '0.75rem 1rem' }}>Product</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Units Sold</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {products.map((prod, idx) => (
                <tr
                  key={idx}
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    transition: 'background var(--transition-fast)'
                  }}
                  className="table-row-hover"
                >
                  <td style={{ padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    {prod.imageUrl ? (
                      <img
                        src={prod.imageUrl}
                        alt={prod.name}
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: 'var(--radius-sm)',
                          objectFit: 'cover',
                          border: '1px solid var(--border-color)'
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--bg-tertiary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-tertiary)'
                        }}
                      >
                        <ShoppingBag size={18} />
                      </div>
                    )}
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{prod.name}</span>
                  </td>

                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {formatCompact(prod.unitsSold)}
                  </td>

                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {formatShopifyCurrency(prod.revenue, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default React.memo(TopProductsTable);
