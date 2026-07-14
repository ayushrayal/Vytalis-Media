import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useDashboard } from '../context/DashboardContext';
import { TableSkeleton, ChartSkeleton } from '../components/LoadingSkeleton';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { AlertCircle, Calendar } from 'lucide-react';
import { formatCurrency } from '../utils/formatter';

const AgeBreakdown = () => {
  const { datePreset, customRange, refreshTrigger } = useDashboard();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ageData, setAgeData] = useState([]);

  const fetchBreakdowns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `http://localhost:5000/api/dashboard/breakdowns?preset=${datePreset}`;
      if (datePreset === 'custom' && customRange.since && customRange.until) {
        url += `&since=${customRange.since}&until=${customRange.until}`;
      }

      const response = await axios.get(url);
      setAgeData(response.data.data.age || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch age demographics.');
    } finally {
      setLoading(false);
    }
  }, [datePreset, customRange, refreshTrigger]);

  useEffect(() => {
    if (datePreset === 'custom' && (!customRange.since || !customRange.until)) {
      return;
    }
    fetchBreakdowns();
  }, [fetchBreakdowns, datePreset, customRange]);

  // formatCurrency imported from formatter.js

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={28} color="var(--primary)" />
          <span>Age Demographic Breakdowns</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Demographic performance across different customer age brackets (OUTCOME_SALES)
        </p>
      </div>

      {error && (
        <div style={{
          background: 'var(--danger-light)',
          border: '1px solid var(--danger)',
          color: 'var(--danger)',
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <ChartSkeleton />
          <TableSkeleton />
        </div>
      ) : ageData.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Stacked Bar Chart */}
          <div className="card fade-in" style={{ height: '400px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Spend & Conversion Value Stacked by Age Bracket</h3>
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="age_range" stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} tickFormatter={(val) => `₹${val}`} />
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{
                      background: 'var(--bg-secondary)',
                      borderColor: 'var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  {/* Stacked Bars */}
                  <Bar name="Total Spend" dataKey="spend" stackId="a" fill="var(--primary)" />
                  <Bar name="Conv. Value" dataKey="purchaseConversionValue" stackId="a" fill="var(--accent)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table Details */}
          <div className="card fade-in" style={{ overflowX: 'auto', padding: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '1rem' }}>Age Group</th>
                  <th style={{ padding: '1rem' }}>Spend</th>
                  <th style={{ padding: '1rem' }}>Purchases</th>
                  <th style={{ padding: '1rem' }}>CPA</th>
                  <th style={{ padding: '1rem' }}>ROAS</th>
                  <th style={{ padding: '1rem' }}>Conv. Value</th>
                  <th style={{ padding: '1rem' }}>CTR</th>
                  <th style={{ padding: '1rem' }}>CPM</th>
                </tr>
              </thead>
              <tbody>
                {ageData.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background var(--transition-fast)' }} className="table-row-hover">
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{row.age_range}</td>
                    <td style={{ padding: '1rem' }}>{formatCurrency(row.spend)}</td>
                    <td style={{ padding: '1rem' }}>{row.purchases}</td>
                    <td style={{ padding: '1rem' }}>{formatCurrency(row.cpa)}</td>
                    <td style={{ padding: '1rem' }}>{row.roas.toFixed(2)}x</td>
                    <td style={{ padding: '1rem' }}>{formatCurrency(row.purchaseConversionValue)}</td>
                    <td style={{ padding: '1rem' }}>{row.ctr.toFixed(2)}%</td>
                    <td style={{ padding: '1rem' }}>{formatCurrency(row.cpm)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card flex-center" style={{ height: '300px', flexDirection: 'column', gap: '0.5rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No age demographic data found for this period.</p>
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

export default AgeBreakdown;
