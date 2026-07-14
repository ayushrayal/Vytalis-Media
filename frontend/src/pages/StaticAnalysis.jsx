import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useDashboard } from '../context/DashboardContext';
import { TableSkeleton, ChartSkeleton } from '../components/LoadingSkeleton';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { AlertCircle, Monitor } from 'lucide-react';
import { formatCurrency } from '../utils/formatter';
import CreativeImage from '../components/CreativeImage';

const StaticAnalysis = () => {
  const { datePreset, customRange, refreshTrigger } = useDashboard();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statics, setStatics] = useState([]);

  const fetchStaticCreatives = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `http://localhost:5000/api/creatives/statics?preset=${datePreset}`;
      if (datePreset === 'custom' && customRange.since && customRange.until) {
        url += `&since=${customRange.since}&until=${customRange.until}`;
      }

      const response = await axios.get(url);
      setStatics(response.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load static creatives.');
    } finally {
      setLoading(false);
    }
  }, [datePreset, customRange, refreshTrigger]);

  useEffect(() => {
    if (datePreset === 'custom' && (!customRange.since || !customRange.until)) {
      return;
    }
    fetchStaticCreatives();
  }, [fetchStaticCreatives, datePreset, customRange]);

  // formatCurrency imported from formatter.js

  // Prepare chart dataset (creative name capped + rates)
  const chartData = statics.map(s => ({
    name: s.name.slice(0, 15) + '...',
    'CTR %': parseFloat((s.metrics.ctr || 0).toFixed(2)),
    'ROAS': parseFloat((s.metrics.roas || 0).toFixed(2))
  })).slice(0, 10); // show top 10

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Monitor size={28} color="var(--primary)" />
          <span>Static Creative Performance Analytics</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Detailed click-through-rates, CPM, and conversion values across all static images and carousels
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
      ) : statics.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* CTR vs ROAS Chart */}
          <div className="card fade-in" style={{ height: '400px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem' }}>CTR % vs ROAS Comparison (Top 10 Statics)</h3>
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-secondary)',
                      borderColor: 'var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Bar name="CTR %" dataKey="CTR %" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  <Line name="ROAS (Multiplier)" type="monotone" dataKey="ROAS" stroke="var(--accent)" strokeWidth={2.5} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table list */}
          <div className="card fade-in" style={{ overflowX: 'auto', padding: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '1rem' }}>Preview & Creative Name</th>
                  <th style={{ padding: '1rem' }}>Rating</th>
                  <th style={{ padding: '1rem' }}>Category</th>
                  <th style={{ padding: '1rem' }}>Spend</th>
                  <th style={{ padding: '1rem' }}>ROAS</th>
                  <th style={{ padding: '1rem' }}>CTR</th>
                  <th style={{ padding: '1rem' }}>CPM</th>
                  <th style={{ padding: '1rem' }}>CPA</th>
                  <th style={{ padding: '1rem' }}>Purchases</th>
                </tr>
              </thead>
              <tbody>
                {statics.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => navigate(`/creatives/${row.id}`)}
                    style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background var(--transition-fast)' }}
                    className="table-row-hover"
                  >
                    <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '4px', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                        <CreativeImage
                          src={row.imageUrl}
                          alt={row.name}
                          isVideo={false}
                          aspectRatio="1/1"
                        />
                      </div>
                      <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>{row.name}</span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span className={`badge badge-${row.performanceBadge.toLowerCase()}`} style={{ fontSize: '0.75rem' }}>
                        {row.performanceBadge}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textTransform: 'capitalize' }}>{row.category}</td>
                    <td style={{ padding: '1rem' }}>{formatCurrency(row.metrics.spend)}</td>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{row.metrics.roas.toFixed(2)}x</td>
                    <td style={{ padding: '1rem', color: row.metrics.ctr >= 1.5 ? 'var(--success)' : 'inherit' }}>
                      {row.metrics.ctr.toFixed(2)}%
                    </td>
                    <td style={{ padding: '1rem' }}>{formatCurrency(row.metrics.cpm)}</td>
                    <td style={{ padding: '1rem' }}>{formatCurrency(row.metrics.cpa)}</td>
                    <td style={{ padding: '1rem' }}>{row.metrics.purchases}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      ) : (
        <div className="card flex-center" style={{ height: '300px', flexDirection: 'column', gap: '0.5rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No static creatives running in this period.</p>
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

export default StaticAnalysis;
