import React, { useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { useDashboard } from '../context/DashboardContext';
import { KpiSkeleton, ChartSkeleton } from '../components/LoadingSkeleton';
import SectionError from '../components/SectionError';
import { getFriendlyErrorMessage } from '../utils/errorHandler';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  IndianRupee,
  ShoppingCart,
  Percent,
  Eye,
  MousePointer,
  RefreshCw,
  Download,
  AlertCircle
} from 'lucide-react';
import { formatCurrency, formatCompact } from '../utils/formatter';
import MetricCard from '../components/MetricCard';

const MetricDetailsModal = React.lazy(() => import('../components/MetricDetailsModal'));

const Dashboard = () => {
  const {
    globalSearch,
    refreshTrigger,
    refreshData,
    datePreset,
    setDatePreset,
    customRange,
    setCustomRange
  } = useDashboard();

  const [selectedMetric, setSelectedMetric] = useState(null);

  const isCustomAndIncomplete = datePreset === 'custom' && (!customRange.since || !customRange.until);

  // Fetch overview KPIs via React Query
  const { data, isLoading: loading, error: overviewError, refetch: fetchOverview } = useQuery({
    queryKey: ['dashboardOverview', datePreset, customRange, refreshTrigger],
    queryFn: async () => {
      let url = `http://localhost:5000/api/dashboard/overview?preset=${datePreset}`;
      if (datePreset === 'custom' && customRange.since && customRange.until) {
        url += `&since=${customRange.since}&until=${customRange.until}`;
      }
      const response = await axios.get(url);
      return response.data.data;
    },
    enabled: !isCustomAndIncomplete
  });

  const error = overviewError ? getFriendlyErrorMessage(overviewError) : null;

  // Fetch trend timelines via React Query
  const { data: trendsRaw, isLoading: loadingTrends, error: trendsQueryError, refetch: fetchTrends } = useQuery({
    queryKey: ['dashboardTrends', datePreset, customRange, refreshTrigger],
    queryFn: async () => {
      let url = `http://localhost:5000/api/dashboard/trends?preset=${datePreset}`;
      if (datePreset === 'custom' && customRange.since && customRange.until) {
        url += `&since=${customRange.since}&until=${customRange.until}`;
      }
      const response = await axios.get(url);
      return response.data.data || [];
    },
    enabled: !isCustomAndIncomplete
  });

  const trends = trendsRaw || [];
  const trendsError = trendsQueryError ? getFriendlyErrorMessage(trendsQueryError) : null;

  // Export data to CSV
  const exportToCSV = () => {
    if (!data?.kpis) return;
    
    const headers = ['Metric', 'Current Period', 'Previous Period', 'Difference', 'Percentage Change', 'Performance Status'];
    const rows = Object.entries(data.kpis).map(([key, item]) => {
      const label = key.toUpperCase();
      return [
        label,
        item.current.toFixed(2),
        item.previous.toFixed(2),
        item.diff.toFixed(2),
        `${item.pct.toFixed(2)}%`,
        item.status
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `dashboard_report_${datePreset}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Trigger browser print for PDF export
  const exportToPDF = () => {
    window.print();
  };

  // Render KPI Card
  const renderKpiCard = (title, key, icon, isCurrency = false, isPercent = false) => {
    if (!data?.kpis || !data.kpis[key]) return null;
    const kpi = data.kpis[key];

    let displayVal = kpi.current;
    if (isCurrency) displayVal = formatCurrency(kpi.current);
    else if (isPercent) displayVal = `${kpi.current.toFixed(2)}%`;
    else if (kpi.current % 1 !== 0) displayVal = kpi.current.toFixed(2);
    else displayVal = formatCompact(kpi.current);

    let displayPrev = kpi.previous;
    if (isCurrency) displayPrev = formatCurrency(kpi.previous);
    else if (isPercent) displayPrev = `${kpi.previous.toFixed(2)}%`;
    else if (kpi.previous % 1 !== 0) displayPrev = kpi.previous.toFixed(2);
    else displayPrev = formatCompact(kpi.previous);

    return (
      <MetricCard
        key={key}
        title={title}
        value={displayVal}
        previousValue={displayPrev}
        pct={kpi.pct}
        direction={kpi.direction}
        status={kpi.status}
        icon={icon}
        isCurrency={isCurrency}
        isPercent={isPercent}
        onClick={() => setSelectedMetric({
          key,
          title,
          currentValue: displayVal,
          previousValue: displayPrev,
          pct: kpi.pct,
          direction: kpi.direction,
          isCurrency,
          isPercent
        })}
      />
    );
  };

  return (
    <div>
      {/* Top Filter and Controls Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1.5rem',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '1.5rem'
      }} id="dashboard-header-bar">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Meta Performance Overview</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Live metrics from OUTCOME_SALES campaigns
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Preset Picker */}
          <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-tertiary)', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
            {['today', 'yesterday', 'last_7_days', 'last_30_days', 'custom'].map(preset => (
              <button
                key={preset}
                onClick={() => setDatePreset(preset)}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  background: datePreset === preset ? 'var(--bg-secondary)' : 'transparent',
                  color: datePreset === preset ? 'var(--primary)' : 'var(--text-secondary)',
                  boxShadow: datePreset === preset ? 'var(--shadow-sm)' : 'none',
                  cursor: 'pointer',
                  transition: 'background var(--transition-fast)'
                }}
              >
                {preset.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          {/* Custom Date inputs */}
          {datePreset === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', animation: 'fadeIn 0.2s ease-out' }}>
              <input
                type="date"
                value={customRange.since}
                onChange={(e) => setCustomRange(prev => ({ ...prev, since: e.target.value }))}
                style={{
                  padding: '0.4rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  fontSize: '0.85rem'
                }}
              />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>to</span>
              <input
                type="date"
                value={customRange.until}
                onChange={(e) => setCustomRange(prev => ({ ...prev, until: e.target.value }))}
                style={{
                  padding: '0.4rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  fontSize: '0.85rem'
                }}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={exportToCSV}
              className="btn btn-secondary"
              style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
              title="Export to CSV"
              disabled={loading || !data}
            >
              <Download size={14} />
              <span>CSV</span>
            </button>
            <button
              onClick={exportToPDF}
              className="btn btn-secondary"
              style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
              title="Print PDF Report"
              disabled={loading || !data}
            >
              <Download size={14} />
              <span>PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Grid Section */}
      {loading ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          {Array.from({ length: 11 }).map((_, idx) => <KpiSkeleton key={idx} />)}
        </div>
      ) : error ? (
        <div style={{ marginBottom: '2rem' }}>
          <SectionError
            message={error}
            onRetry={fetchOverview}
            isRetrying={loading}
          />
        </div>
      ) : data ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          {renderKpiCard('Total Spend', 'spend', IndianRupee, true)}
          {renderKpiCard('Purchases', 'purchases', ShoppingCart)}
          {renderKpiCard('Cost Per Acquisition (CPA)', 'cpa', IndianRupee, true)}
          {renderKpiCard('Return on Ad Spend (ROAS)', 'roas', Percent)}
          {renderKpiCard('Purchase Conv. Value', 'purchaseConversionValue', IndianRupee, true)}
          {renderKpiCard('Click-Through Rate (CTR)', 'ctr', Percent, false, true)}
          {renderKpiCard('Cost Per Mille (CPM)', 'cpm', IndianRupee, true)}
          {renderKpiCard('Cost Per Click (CPC)', 'cpc', IndianRupee, true)}
          {renderKpiCard('Reach', 'reach', Eye)}
          {renderKpiCard('Impressions', 'impressions', Eye)}
          {renderKpiCard('Link Clicks', 'linkClicks', MousePointer)}
          {renderKpiCard('Frequency', 'frequency', RefreshCw)}
        </div>
      ) : (
        <div className="card flex-center" style={{ height: '200px', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
          <AlertCircle size={24} color="var(--text-tertiary)" />
          <p style={{ color: 'var(--text-secondary)' }}>No overview statistics loaded. Choose another date range.</p>
        </div>
      )}

      {/* Interactive Charts Section */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '2rem',
        marginBottom: '2rem'
      }} id="dashboard-charts-grid">
        {/* Composed Chart: Spend & ROAS Trend */}
        {loadingTrends ? (
          <ChartSkeleton />
        ) : trendsError ? (
          <SectionError
            message={trendsError}
            onRetry={fetchTrends}
            isRetrying={loadingTrends}
          />
        ) : trends.length > 0 ? (
          <div className="card fade-in" style={{ height: '400px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Spend & Return on Ad Spend (ROAS) Trend</h3>
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
                  <YAxis yAxisId="left" stroke="var(--text-secondary)" fontSize={11} tickLine={false} tickFormatter={(val) => `₹${formatCompact(val)}`} />
                  <YAxis yAxisId="right" orientation="right" stroke="var(--text-secondary)" fontSize={11} tickLine={false} tickFormatter={(val) => `${val}x`} />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === 'Spend' || name === 'Purchase Value') return [formatCurrency(value), name];
                      if (name === 'ROAS') return [`${value.toFixed(2)}x`, name];
                      return [value, name];
                    }}
                    contentStyle={{
                      background: 'var(--bg-secondary)',
                      borderColor: 'var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Area yAxisId="left" type="monotone" name="Spend" dataKey="spend" stroke="var(--primary)" fillOpacity={1} fill="url(#colorSpend)" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" name="ROAS" dataKey="roas" stroke="var(--accent)" strokeWidth={2.5} activeDot={{ r: 6 }} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="card flex-center" style={{ height: '400px', flexDirection: 'column', gap: '0.5rem' }}>
            <AlertCircle size={24} color="var(--text-tertiary)" />
            <p style={{ color: 'var(--text-secondary)' }}>No trend timeline data available.</p>
          </div>
        )}

        {/* Bar Chart: Daily Purchases Volume */}
        {loadingTrends ? (
          <ChartSkeleton />
        ) : trendsError ? (
          <SectionError
            message={trendsError}
            onRetry={fetchTrends}
            isRetrying={loadingTrends}
          />
        ) : trends.length > 0 ? (
          <div className="card fade-in" style={{ height: '400px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Daily Purchases Trend</h3>
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
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
                  <Bar name="Purchases" dataKey="purchases" fill="var(--success)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="card flex-center" style={{ height: '400px', flexDirection: 'column', gap: '0.5rem' }}>
            <AlertCircle size={24} color="var(--text-tertiary)" />
            <p style={{ color: 'var(--text-secondary)' }}>No purchase volume trends available.</p>
          </div>
        )}
      </div>

      {selectedMetric && (
        <React.Suspense fallback={null}>
          <MetricDetailsModal
            isOpen={!!selectedMetric}
            onClose={() => setSelectedMetric(null)}
            metricKey={selectedMetric.key}
            metricTitle={selectedMetric.title}
            currentValue={selectedMetric.currentValue}
            previousValue={selectedMetric.previousValue}
            pct={selectedMetric.pct}
            direction={selectedMetric.direction}
            isCurrency={selectedMetric.isCurrency}
            isPercent={selectedMetric.isPercent}
            startDateStr={data?.dateRange?.since}
          />
        </React.Suspense>
      )}

      <style>{`
        @media (min-width: 1024px) {
          #dashboard-charts-grid {
            grid-template-columns: 2fr 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
