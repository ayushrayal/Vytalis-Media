import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { formatCurrency, formatCompact } from '../utils/formatter';

const MetricTrendChart = ({
  data = [],
  metricKey,
  metricLabel,
  isCurrency = false,
  isPercent = false
}) => {
  const [chartType, setChartType] = useState('area'); // 'area' or 'bar'

  // Compute 7-day moving average on the fly
  const windowSize = 7;
  const processedData = data.map((item, idx) => {
    const startIdx = Math.max(0, idx - windowSize + 1);
    const windowItems = data.slice(startIdx, idx + 1);
    const sum = windowItems.reduce((acc, curr) => acc + (curr[metricKey] || 0), 0);
    const ma = sum / windowItems.length;
    return {
      ...item,
      value: item[metricKey] || 0,
      movingAverage: parseFloat(ma.toFixed(2))
    };
  });

  const valueFormatter = (val) => {
    if (isCurrency) return formatCurrency(val);
    if (isPercent) return `${val.toFixed(2)}%`;
    return val % 1 === 0 ? val : val.toFixed(2);
  };

  const axisFormatter = (val) => {
    if (isCurrency) return `₹${formatCompact(val)}`;
    if (isPercent) return `${val}%`;
    return formatCompact(val);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', height: '100%' }}>
      {/* Chart controls */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
        <button
          onClick={() => setChartType('area')}
          className={`btn btn-secondary`}
          style={{
            padding: '0.25rem 0.75rem',
            fontSize: '0.75rem',
            borderRadius: 'var(--radius-sm)',
            background: chartType === 'area' ? 'var(--primary)' : 'var(--bg-tertiary)',
            color: chartType === 'area' ? '#fff' : 'var(--text-primary)',
            borderColor: chartType === 'area' ? 'var(--primary)' : 'var(--border-color)'
          }}
        >
          Area Chart
        </button>
        <button
          onClick={() => setChartType('bar')}
          className={`btn btn-secondary`}
          style={{
            padding: '0.25rem 0.75rem',
            fontSize: '0.75rem',
            borderRadius: 'var(--radius-sm)',
            background: chartType === 'bar' ? 'var(--primary)' : 'var(--bg-tertiary)',
            color: chartType === 'bar' ? '#fff' : 'var(--text-primary)',
            borderColor: chartType === 'bar' ? 'var(--primary)' : 'var(--border-color)'
          }}
        >
          Bar Chart
        </button>
      </div>

      <div style={{ flex: 1, minHeight: 0, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={processedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
            <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={10} tickLine={false} />
            <YAxis
              stroke="var(--text-secondary)"
              fontSize={10}
              tickLine={false}
              tickFormatter={axisFormatter}
            />
            <Tooltip
              formatter={(value, name) => [valueFormatter(value), name]}
              contentStyle={{
                background: 'var(--bg-secondary)',
                borderColor: 'var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontSize: '0.8rem'
              }}
            />
            <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '0.8rem' }} />
            
            {chartType === 'area' ? (
              <Area
                type="monotone"
                name={metricLabel}
                dataKey="value"
                stroke="var(--primary)"
                fillOpacity={1}
                fill="url(#chartGrad)"
                strokeWidth={2}
              />
            ) : (
              <Bar
                name={metricLabel}
                dataKey="value"
                fill="var(--primary)"
                radius={[4, 4, 0, 0]}
              />
            )}

            <Line
              type="monotone"
              name={`${windowSize}-Day Moving Avg`}
              dataKey="movingAverage"
              stroke="var(--accent)"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MetricTrendChart;
