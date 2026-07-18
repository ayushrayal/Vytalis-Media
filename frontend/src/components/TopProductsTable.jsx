import React, { useState } from 'react';
import { Package, AlertCircle, ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react';
import TopProductsTableSkeleton from './skeletons/TopProductsTableSkeleton';
import { formatShopifyCurrency, formatCompact } from '../utils/formatter';

const ProductImage = ({ src, alt }) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        style={{
          width: '36px',
          height: '36px',
          minWidth: '36px',
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
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      style={{
        width: '36px',
        height: '36px',
        minWidth: '36px',
        borderRadius: 'var(--radius-sm)',
        objectFit: 'cover',
        border: '1px solid var(--border-color)'
      }}
    />
  );
};

const TopProductsTable = ({ data, isLoading, isError, error, page = 1, onPageChange }) => {
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

  const products = data?.data || data?.products || [];
  const total = data?.total ?? products.length;
  const totalPages = data?.totalPages ?? 1;
  const limit = data?.limit ?? 10;
  const currency = data?.currency || 'USD';

  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Package size={20} color="var(--primary)" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Top Selling Products</h3>
        </div>
        {total > 0 && (
          <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
            Showing {startItem}-{endItem} of {total}
          </span>
        )}
      </div>

      {products.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>
          No product sales recorded for this date period.
        </div>
      ) : (
        <>
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
                      <ProductImage src={prod.imageUrl} alt={prod.name} />
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

          {/* Server-Side Pagination Footer */}
          <div
            style={{
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--border-color)',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}
          >
            <div>
              Page <strong>{page}</strong> of <strong>{totalPages}</strong>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                disabled={page <= 1}
                onClick={() => onPageChange && onPageChange(page - 1)}
                className="btn btn-secondary"
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  opacity: page <= 1 ? 0.5 : 1,
                  cursor: page <= 1 ? 'not-allowed' : 'pointer'
                }}
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </button>

              <button
                disabled={page >= totalPages}
                onClick={() => onPageChange && onPageChange(page + 1)}
                className="btn btn-secondary"
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  opacity: page >= totalPages ? 0.5 : 1,
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default React.memo(TopProductsTable);
