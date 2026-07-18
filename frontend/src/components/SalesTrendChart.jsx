import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { AlertCircle, TrendingUp } from 'lucide-react';
import SalesTrendChartSkeleton from './skeletons/SalesTrendChartSkeleton';
import { formatShopifyCurrency } from '../utils/formatter';

const SalesTrendChart = ({ data, isLoading, isError, error }) => {
  if (isLoading) {
    return <SalesTrendChartSkeleton />;
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
        <span>Failed to load Sales Trend Chart: {error?.response?.data?.message || error?.message || 'Unknown error'}</span>
      </div>
    );
  }

  const trendData = data?.data?.trend || [];
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
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <TrendingUp size={20} color="var(--primary)" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Sales & Orders Trend</h3>
        </div>
      </div>

      {/* Recharts Line Chart */}
      <div style={{ width: '100%', height: '300px' }}>
        {trendData.length === 0 ? (
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-tertiary)',
              fontSize: '0.9rem'
            }}
          >
            No sales trend data available for this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.5} />
              <XAxis
                dataKey="date"
                stroke="var(--text-tertiary)"
                fontSize={12}
                tickFormatter={(str) => {
                  if (!str) return '';
                  const parts = str.split('-');
                  return `${parts[1]}/${parts[2]}`;
                }}
              />
              <YAxis
                yAxisId="left"
                stroke="var(--primary)"
                fontSize={12}
                tickFormatter={(val) => formatShopifyCurrency(val, currency)}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#8884d8"
                fontSize={12}
                tickFormatter={(val) => Math.round(val)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem'
                }}
                formatter={(value, name) => {
                  if (name === 'Revenue') {
                    return [formatShopifyCurrency(value, currency), 'Revenue'];
                  }
                  return [value, 'Orders'];
                }}
              />
              <Legend wrapperStyle={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke="var(--primary)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="orders"
                name="Orders"
                stroke="#8884d8"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default React.memo(SalesTrendChart);
