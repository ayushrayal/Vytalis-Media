import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import { useDashboard } from '../context/DashboardContext';
import { TableSkeleton, ChartSkeleton } from '../components/LoadingSkeleton';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  Legend
} from 'recharts';
import { AlertCircle, MapPin } from 'lucide-react';
import { formatCurrency } from '../utils/formatter';
import SectionError from '../components/SectionError';
import { getFriendlyErrorMessage } from '../utils/errorHandler';

const PlacementReports = () => {
  const { datePreset, customRange, refreshTrigger } = useDashboard();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [placementData, setPlacementData] = useState([]);

  const fetchBreakdowns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `${API_URL}/api/dashboard/breakdowns?preset=${datePreset}`;
      if (datePreset === 'custom' && customRange.since && customRange.until) {
        url += `&since=${customRange.since}&until=${customRange.until}`;
      }

      const response = await axios.get(url);
      setPlacementData(response.data.data.placement || []);
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
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

  // Color palette for the Pie Cells
  const COLORS = [
    'var(--primary)',
    'var(--accent)',
    'var(--success)',
    'var(--warning)',
    '#F43F5E', // Rose
    '#8B5CF6', // Purple
    '#3B82F6'  // Blue
  ];

  // Format Radar data (requires normalized score for visual clarity, but raw ROAS is fine)
  const radarData = placementData.map(item => ({
    subject: item.placement.replace(/_/g, ' '),
    ROAS: parseFloat(item.roas.toFixed(2)),
    CTR: parseFloat(item.ctr.toFixed(2))
  })).slice(0, 7); // Cap to avoid clutter

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MapPin size={28} color="var(--primary)" />
          <span>Placement & Positioning Reports</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Detailed performance breakdown by Meta advertising network position (Feeds, Reels, Stories, etc.)
        </p>
      </div>

      {error && (
        <SectionError
          message={error}
          onRetry={fetchBreakdowns}
          isRetrying={loading}
        />
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
          <TableSkeleton />
        </div>
      ) : placementData.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Charts Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '2rem'
          }} id="placement-charts-grid">
            
            {/* Pie Chart: Spend share */}
            <div className="card fade-in" style={{ height: '400px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem' }}>Placement Spend Distribution Share</h3>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={placementData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="spend"
                      nameKey="placement"
                    >
                      {placementData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [formatCurrency(value), name.replace(/_/g, ' ')]}
                      contentStyle={{
                        background: 'var(--bg-secondary)',
                        borderColor: 'var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-primary)'
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={40}
                      iconType="circle"
                      formatter={(val) => val.replace(/_/g, ' ').slice(0, 18)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Radar Chart: ROAS by placement */}
            <div className="card fade-in" style={{ height: '400px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem' }}>ROAS Radar Comparison Matrix</h3>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                    <PolarGrid stroke="var(--border-color)" />
                    <PolarAngleAxis dataKey="subject" stroke="var(--text-secondary)" fontSize={9} />
                    <PolarRadiusAxis stroke="var(--text-tertiary)" fontSize={9} />
                    <Radar name="ROAS (Multiplier)" dataKey="ROAS" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.2} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--bg-secondary)',
                        borderColor: 'var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-primary)'
                      }}
                    />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Table Details */}
          <div className="card fade-in" style={{ overflowX: 'auto', padding: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '1rem' }}>Placement</th>
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
                {placementData.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background var(--transition-fast)' }} className="table-row-hover">
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{row.placement.replace(/_/g, ' ')}</td>
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
          <p style={{ color: 'var(--text-secondary)' }}>No placement demographic data found for this period.</p>
        </div>
      )}

      <style>{`
        .table-row-hover:hover {
          background-color: var(--bg-primary);
        }
        @media (min-width: 1024px) {
          #placement-charts-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default PlacementReports;
