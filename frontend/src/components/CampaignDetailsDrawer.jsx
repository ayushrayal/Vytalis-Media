import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  X, Info, Calendar, TrendingUp, Sparkles, Award, BarChart2,
  Users, Layers, Clock, AlertTriangle, Play, Pause, AlertCircle, ChevronDown, ChevronUp, CheckCircle, Lightbulb
} from 'lucide-react';
import { Shimmer, TableSkeleton } from './LoadingSkeleton';
import CreativeImage from './CreativeImage';
import { formatCurrency } from '../utils/formatter';
import {
  ResponsiveContainer, ComposedChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, Line
} from 'recharts';

const CampaignDetailsDrawer = ({ isOpen, onClose, campaignId, datePreset, customRange }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [breakdownTab, setBreakdownTab] = useState('age');
  const [chartMetric, setChartMetric] = useState('spend');
  const [expandedAdSet, setExpandedAdSet] = useState(null); // ID of expanded adset

  // Lazy tab data cache
  const [tabData, setTabData] = useState({
    trends: null,
    creatives: null,
    breakdowns: null,
    adsets: null,
    recommendations: null
  });

  const [tabLoading, setTabLoading] = useState({
    trends: false,
    creatives: false,
    breakdowns: false,
    adsets: false,
    recommendations: false
  });

  const [tabError, setTabError] = useState({
    trends: null,
    creatives: null,
    breakdowns: null,
    adsets: null,
    recommendations: null
  });

  // 1. Initial overview data fetch
  useEffect(() => {
    if (!isOpen || !campaignId) return;

    // Reset tab cache
    setTabData({
      trends: null,
      creatives: null,
      breakdowns: null,
      adsets: null,
      recommendations: null
    });
    setTabLoading({
      trends: false,
      creatives: false,
      breakdowns: false,
      adsets: false,
      recommendations: false
    });
    setTabError({
      trends: null,
      creatives: null,
      breakdowns: null,
      adsets: null,
      recommendations: null
    });
    setLoading(true);
    setError(null);
    setActiveTab('overview');

    const fetchDetails = async () => {
      try {
        let url = `http://localhost:5000/api/campaigns/${campaignId}?datePreset=${datePreset}`;
        if (datePreset === 'custom' && customRange?.since && customRange?.until) {
          url += `&since=${customRange.since}&until=${customRange.until}`;
        }
        const response = await axios.get(url);
        setData(response.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load campaign detailed reports.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [isOpen, campaignId, datePreset, customRange]);

  // 2. Lazy load specific tab data on-demand
  useEffect(() => {
    if (!isOpen || !campaignId || !data) return;

    const fetchTab = async (tabName, endpoint) => {
      if (tabData[tabName] || tabLoading[tabName]) return;

      setTabLoading(prev => ({ ...prev, [tabName]: true }));
      setTabError(prev => ({ ...prev, [tabName]: null }));

      try {
        let url = `http://localhost:5000/api/campaigns/${campaignId}/${endpoint}?datePreset=${datePreset}`;
        if (datePreset === 'custom' && customRange?.since && customRange?.until) {
          url += `&since=${customRange.since}&until=${customRange.until}`;
        }
        const response = await axios.get(url);
        setTabData(prev => ({ ...prev, [tabName]: response.data.data }));
      } catch (err) {
        setTabError(prev => ({
          ...prev,
          [tabName]: err.response?.data?.message || `Failed to load ${tabName} data.`
        }));
      } finally {
        setTabLoading(prev => ({ ...prev, [tabName]: false }));
      }
    };

    if (activeTab === 'performance' || activeTab === 'timeline') {
      fetchTab('trends', 'trends');
    } else if (activeTab === 'adsets') {
      fetchTab('adsets', 'adsets');
    } else if (activeTab === 'creatives') {
      fetchTab('creatives', 'creatives');
    } else if (activeTab === 'breakdowns') {
      fetchTab('breakdowns', 'breakdowns');
    } else if (activeTab === 'recommendations') {
      fetchTab('recommendations', 'recommendations');
    }
  }, [isOpen, campaignId, datePreset, customRange, activeTab, data]);

  if (!isOpen) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Ongoing';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const getStatusBadgeClass = (status) => {
    return status === 'ACTIVE' ? 'badge badge-active' : 'badge badge-paused';
  };

  const getSeverityStyle = (severity) => {
    switch (severity) {
      case 'high': return { borderLeft: '4px solid var(--danger)', background: 'rgba(239, 68, 68, 0.05)' };
      case 'medium': return { borderLeft: '4px solid var(--warning)', background: 'rgba(245, 158, 11, 0.05)' };
      default: return { borderLeft: '4px solid var(--primary)', background: 'rgba(59, 130, 246, 0.05)' };
    }
  };

  // Dynamic summary / segments calculations based on lazy loaded data
  const summary = {
    bestPlacement: 'Click "Breakdowns" Tab',
    bestDevice: 'Click "Breakdowns" Tab',
    bestAudience: 'Click "Breakdowns" Tab',
    averageDailySpend: data?.summary?.averageDailySpend || 0,
    bestCreative: { name: 'Click "Creatives" Tab', id: '' },
    worstCreative: { name: 'Click "Creatives" Tab', id: '' }
  };

  if (tabData.breakdowns) {
    const placements = tabData.breakdowns.placement || [];
    if (placements.length > 0) {
      const top = [...placements].sort((a, b) => (b.roas - a.roas) || (b.purchases - a.purchases))[0];
      summary.bestPlacement = top ? top.placement : 'N/A';
    } else {
      summary.bestPlacement = 'N/A';
    }

    const devices = tabData.breakdowns.device || [];
    if (devices.length > 0) {
      const top = [...devices].sort((a, b) => (b.roas - a.roas) || (b.purchases - a.purchases))[0];
      summary.bestDevice = top ? top.device : 'N/A';
    } else {
      summary.bestDevice = 'N/A';
    }

    const ageGroup = tabData.breakdowns.age || [];
    const genderGroup = tabData.breakdowns.gender || [];
    if (ageGroup.length > 0 || genderGroup.length > 0) {
      const topAge = [...ageGroup].sort((a, b) => (b.roas - a.roas) || (b.purchases - a.purchases))[0];
      const topGender = [...genderGroup].sort((a, b) => (b.roas - a.roas) || (b.purchases - a.purchases))[0];
      summary.bestAudience = `${topGender?.gender || 'N/A'} (${topAge?.age || 'N/A'})`;
    } else {
      summary.bestAudience = 'N/A';
    }
  }

  if (tabData.creatives) {
    const creatives = tabData.creatives || [];
    if (creatives.length > 0) {
      const sorted = [...creatives].sort((a, b) => (b.metrics?.roas - a.metrics?.roas) || (b.metrics?.purchases - a.metrics?.purchases));
      summary.bestCreative = sorted[0] ? { name: sorted[0].name, id: sorted[0].id } : { name: 'N/A', id: '' };
      summary.worstCreative = sorted[sorted.length - 1] ? { name: sorted[sorted.length - 1].name, id: sorted[sorted.length - 1].id } : { name: 'N/A', id: '' };
    } else {
      summary.bestCreative = { name: 'N/A', id: '' };
      summary.worstCreative = { name: 'N/A', id: '' };
    }
  }

  // Budget calculations
  let budgetLabel = 'No Budget';
  let budgetVal = 0;
  let spendVal = 0;
  let budgetPercent = 0;

  if (data) {
    if (data.campaign.lifetimeBudget > 0) {
      budgetLabel = 'Lifetime Budget';
      budgetVal = data.campaign.lifetimeBudget;
      spendVal = data.overview.spend || 0;
      budgetPercent = Math.min(100, Math.max(0, (spendVal / budgetVal) * 100));
    } else if (data.campaign.dailyBudget > 0) {
      budgetLabel = 'Daily Budget';
      budgetVal = data.campaign.dailyBudget;
      spendVal = tabData.trends?.[tabData.trends.length - 1]?.spend || data.overview.spend || 0;
      budgetPercent = Math.min(100, Math.max(0, (spendVal / budgetVal) * 100));
    }
  }

  const warnings = data?.warnings || [];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-end',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)'
        }}
      />

      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '650px',
          height: '100%',
          background: 'var(--bg-secondary)',
          borderLeft: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.15)',
          animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Drawer Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {loading ? (
              <Shimmer width="150px" height="24px" />
            ) : (
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                {data?.campaign?.name}
              </h3>
            )}
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
              Campaign ID: {campaignId}
            </span>
          </div>
          <button onClick={onClose} style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', overflowX: 'auto', whiteSpace: 'nowrap' }}>
          {[
            { id: 'overview', label: 'overview' },
            { id: 'performance', label: 'performance' },
            { id: 'adsets', label: 'ad sets' },
            { id: 'creatives', label: 'creatives' },
            { id: 'breakdowns', label: 'breakdowns' },
            { id: 'timeline', label: 'timeline' },
            { id: 'recommendations', label: 'AI insights' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '1rem 1.25rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
                color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                transition: 'all var(--transition-fast)'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {error && (
            <div style={{ background: 'var(--danger-light)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Render warnings inline */}
          {warnings.length > 0 && (
            <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid var(--warning)', color: 'var(--warning)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.8rem' }}>
                <AlertTriangle size={16} />
                <span>Meta API Warnings</span>
              </div>
              {warnings.map((warn, idx) => (
                <span key={idx} style={{ fontSize: '0.7rem', paddingLeft: '1.3rem' }}>
                  • {warn.resource} field "{warn.field}": {warn.message}
                </span>
              ))}
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <TableSkeleton rows={4} />
            </div>
          ) : data ? (
            <>
              {/* Tab 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Budget Progress Bar */}
                  {budgetVal > 0 && (
                    <div style={{ background: 'var(--bg-primary)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{budgetLabel} Progress</span>
                        <span>{formatCurrency(spendVal)} / {formatCurrency(budgetVal)} ({budgetPercent.toFixed(1)}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${budgetPercent}%`, height: '100%', background: 'var(--primary)', borderRadius: '4px', transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  )}

                  {/* Segment Summary Blocks */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ background: 'var(--bg-primary)', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Best Placement</span>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--primary)' }}>{summary.bestPlacement}</strong>
                    </div>
                    <div style={{ background: 'var(--bg-primary)', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Best Device</span>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--accent)' }}>{summary.bestDevice}</strong>
                    </div>
                    <div style={{ background: 'var(--bg-primary)', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Best Audience Segment</span>
                      <strong style={{ fontSize: '0.9rem' }}>{summary.bestAudience}</strong>
                    </div>
                    <div style={{ background: 'var(--bg-primary)', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Avg Daily Spend</span>
                      <strong style={{ fontSize: '0.9rem' }}>{formatCurrency(summary.averageDailySpend)}</strong>
                    </div>
                    <div style={{ background: 'var(--bg-primary)', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Top Ad Creative</span>
                      <strong style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{summary.bestCreative.name}</strong>
                    </div>
                    <div style={{ background: 'var(--bg-primary)', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Poor Ad Creative</span>
                      <strong style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', color: 'var(--danger)' }}>{summary.worstCreative.name}</strong>
                    </div>
                  </div>

                  {/* Standard Metadata Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', background: 'var(--bg-primary)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Status</span>
                      <span className={getStatusBadgeClass(data.campaign.status)}>
                        {data.campaign.status}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Objective</span>
                      <strong style={{ fontSize: '0.9rem' }}>{data.campaign.objective}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Start Date</span>
                      <span style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Calendar size={14} color="var(--text-tertiary)" />
                        {formatDate(data.campaign.startTime)}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>End Date</span>
                      <span style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Calendar size={14} color="var(--text-tertiary)" />
                        {formatDate(data.campaign.stopTime)}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Buying Type</span>
                      <span style={{ fontSize: '0.9rem' }}>{data.campaign.buyingType || 'AUCTION'}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Last Updated</span>
                      <span style={{ fontSize: '0.9rem' }}>{formatDate(data.campaign.updatedTime)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: PERFORMANCE */}
              {activeTab === 'performance' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {data.errors.overview ? (
                    <div style={{ background: 'var(--warning-light)', color: 'var(--warning)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertCircle size={14} />
                      <span>{data.errors.overview}</span>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
                      {[
                        { label: 'Spend', value: formatCurrency(data.overview.spend || 0) },
                        { label: 'Purchases', value: data.overview.purchases || 0 },
                        { label: 'Revenue', value: formatCurrency(data.overview.revenue || 0) },
                        { label: 'ROAS', value: `${(data.overview.roas || 0).toFixed(2)}x` },
                        { label: 'CTR', value: `${(data.overview.ctr || 0).toFixed(2)}%` },
                        { label: 'CPA', value: formatCurrency(data.overview.cpa || 0) },
                        { label: 'Reach', value: (data.overview.reach || 0).toLocaleString() },
                        { label: 'Impressions', value: (data.overview.impressions || 0).toLocaleString() }
                      ].map((kpi, idx) => (
                        <div key={idx} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>{kpi.label}</span>
                          <strong style={{ fontSize: '1.1rem', fontWeight: 700, display: 'block', marginTop: '0.25rem' }}>{kpi.value}</strong>
                        </div>
                      ))}
                    </div>
                  )}

                  {tabLoading.trends ? (
                    <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <TableSkeleton rows={3} />
                    </div>
                  ) : tabError.trends ? (
                    <div style={{ background: 'var(--warning-light)', color: 'var(--warning)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertCircle size={14} />
                      <span>{tabError.trends}</span>
                    </div>
                  ) : tabData.trends?.length > 0 ? (
                    <div className="card" style={{ height: '300px', display: 'flex', flexDirection: 'column', padding: '1.25rem', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 600 }}>Daily Trend Chart</h4>
                        <select
                          value={chartMetric}
                          onChange={(e) => setChartMetric(e.target.value)}
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}
                        >
                          <option value="spend">Spend</option>
                          <option value="purchases">Purchases</option>
                          <option value="revenue">Revenue</option>
                          <option value="ctr">CTR</option>
                        </select>
                      </div>
                      <div style={{ flex: 1, minHeight: 0 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={tabData.trends} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                            <XAxis dataKey="date" fontSize={9} stroke="var(--text-secondary)" tickLine={false} />
                            <YAxis fontSize={9} stroke="var(--text-secondary)" tickLine={false} />
                            <Tooltip contentStyle={{ fontSize: '0.75rem' }} />
                            <Legend verticalAlign="top" height={28} iconSize={8} wrapperStyle={{ fontSize: '0.75rem' }} />
                            <Area type="monotone" name={chartMetric.toUpperCase()} dataKey={chartMetric} fill="var(--primary-light)" stroke="var(--primary)" strokeWidth={1.5} />
                            <Line type="monotone" name="7-Day Moving Avg" dataKey={`${chartMetric}MA`} stroke="var(--accent)" strokeWidth={1.5} dot={false} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Tab 3: AD SETS */}
              {activeTab === 'adsets' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {tabLoading.adsets ? (
                    <TableSkeleton rows={4} />
                  ) : tabError.adsets ? (
                    <div style={{ background: 'var(--warning-light)', color: 'var(--warning)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertCircle size={14} />
                      <span>{tabError.adsets}</span>
                    </div>
                  ) : tabData.adsets?.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {tabData.adsets.map((adSet) => {
                        const isExpanded = expandedAdSet === adSet.id;
                        return (
                          <div key={adSet.id} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                            {/* AdSet Header Toggle */}
                            <div
                              onClick={() => setExpandedAdSet(isExpanded ? null : adSet.id)}
                              style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none' }}
                            >
                              <div>
                                <strong style={{ fontSize: '0.85rem', display: 'block' }}>{adSet.name}</strong>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Targeting: {adSet.audience}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ textAlign: 'right', fontSize: '0.75rem' }}>
                                  <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Spend</span>
                                  <strong>{formatCurrency(adSet.spend)}</strong>
                                </div>
                                <div style={{ textAlign: 'right', fontSize: '0.75rem' }}>
                                  <span style={{ color: 'var(--text-secondary)', display: 'block' }}>ROAS</span>
                                  <strong style={{ color: 'var(--success)' }}>{adSet.roas.toFixed(2)}x</strong>
                                </div>
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </div>
                            </div>

                            {/* Collapsible Breakdown Section */}
                            {isExpanded && (
                              <div style={{ padding: '1rem', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.75rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.5rem', paddingBottom: '0.75rem', borderBottom: '1px dashed var(--border-color)' }}>
                                  <div>
                                    <span style={{ color: 'var(--text-secondary)' }}>Purchases</span>
                                    <strong style={{ display: 'block' }}>{adSet.purchases}</strong>
                                  </div>
                                  <div>
                                    <span style={{ color: 'var(--text-secondary)' }}>Revenue</span>
                                    <strong style={{ display: 'block' }}>{formatCurrency(adSet.revenue)}</strong>
                                  </div>
                                  <div>
                                    <span style={{ color: 'var(--text-secondary)' }}>CPA</span>
                                    <strong style={{ display: 'block' }}>{formatCurrency(adSet.cpa)}</strong>
                                  </div>
                                  <div>
                                    <span style={{ color: 'var(--text-secondary)' }}>CTR</span>
                                    <strong style={{ display: 'block' }}>{adSet.ctr.toFixed(2)}%</strong>
                                  </div>
                                </div>

                                {/* Per-adset Breakdown Lists */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                  {/* Demographics */}
                                  <div>
                                    <h5 style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Demographics Stack</h5>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                      {adSet.ageBreakdown?.map((age, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                                          <span>Age {age.age}</span>
                                          <strong>{formatCurrency(age.spend)} ({age.purchases} sales)</strong>
                                        </div>
                                      ))}
                                      {adSet.genderBreakdown?.map((gen, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                                          <span style={{ textTransform: 'capitalize' }}>{gen.gender}</span>
                                          <strong>{formatCurrency(gen.spend)} ({gen.purchases} sales)</strong>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Placements */}
                                  <div>
                                    <h5 style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Placements Stack</h5>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                      {adSet.placementBreakdown?.slice(0, 4).map((pl, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                                          <span style={{ textTransform: 'capitalize' }}>{pl.placement}</span>
                                          <strong>{formatCurrency(pl.spend)}</strong>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="card flex-center" style={{ height: '150px' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>No ad sets linked to this campaign.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: CREATIVES */}
              {activeTab === 'creatives' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {tabLoading.creatives ? (
                    <TableSkeleton rows={3} />
                  ) : tabError.creatives ? (
                    <div style={{ background: 'var(--warning-light)', color: 'var(--warning)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertCircle size={14} />
                      <span>{tabError.creatives}</span>
                    </div>
                  ) : tabData.creatives?.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      {tabData.creatives.map((creative) => (
                        <div key={creative.id} className="card" style={{ display: 'flex', padding: 0, overflow: 'hidden', height: '140px' }}>
                          <div style={{ width: '140px', height: '100%', flexShrink: 0 }}>
                            <CreativeImage src={creative.imageUrl || creative.thumbnailUrl} isVideo={creative.isVideo} aspectRatio="1/1" />
                          </div>
                          <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem', overflow: 'hidden' }}>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {creative.name}
                            </h4>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '34px', lineHeight: '1.2' }}>
                              {creative.copyText || 'No text content.'}
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.25rem', marginTop: 'auto', fontSize: '0.7rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.4rem' }}>
                              <div>
                                <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Spend</span>
                                <strong>{formatCurrency(creative.metrics.spend)}</strong>
                              </div>
                              <div>
                                <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Purchases</span>
                                <strong>{creative.metrics.purchases}</strong>
                              </div>
                              <div>
                                <span style={{ color: 'var(--text-secondary)', display: 'block' }}>ROAS</span>
                                <strong style={{ color: 'var(--success)' }}>{creative.metrics.roas.toFixed(2)}x</strong>
                              </div>
                              <div>
                                <span style={{ color: 'var(--text-secondary)', display: 'block' }}>CTR</span>
                                <strong>{creative.metrics.ctr.toFixed(2)}%</strong>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="card flex-center" style={{ height: '200px' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>No creatives identified in this campaign.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 5: BREAKDOWNS */}
              {activeTab === 'breakdowns' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid var(--border-color)', overflowX: 'auto', paddingBottom: '2px' }}>
                    {['age', 'gender', 'placement', 'device', 'region'].map((sub) => (
                      <button
                        key={sub}
                        onClick={() => setBreakdownTab(sub)}
                        style={{
                          padding: '0.4rem 0.8rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                          background: breakdownTab === sub ? 'var(--primary-light)' : 'transparent',
                          color: breakdownTab === sub ? 'var(--primary)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          textTransform: 'capitalize',
                          border: 'none'
                        }}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>

                  {tabLoading.breakdowns ? (
                    <TableSkeleton rows={4} />
                  ) : tabError.breakdowns ? (
                    <div style={{ background: 'var(--warning-light)', color: 'var(--warning)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertCircle size={14} />
                      <span>{tabError.breakdowns}</span>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                            <th style={{ padding: '0.5rem' }}>Dimension</th>
                            <th style={{ padding: '0.5rem' }}>Spend</th>
                            <th style={{ padding: '0.5rem' }}>Purchases</th>
                            <th style={{ padding: '0.5rem' }}>ROAS</th>
                            <th style={{ padding: '0.5rem' }}>CTR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(tabData.breakdowns?.[breakdownTab] || []).length > 0 ? (
                            tabData.breakdowns[breakdownTab].map((row, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '0.5rem', fontWeight: 600 }}>
                                  {row[breakdownTab] || row.age || row.gender || row.placement || row.device || row.region}
                                </td>
                                <td style={{ padding: '0.5rem' }}>{formatCurrency(row.spend)}</td>
                                <td style={{ padding: '0.5rem' }}>{row.purchases}</td>
                                <td style={{ padding: '0.5rem', color: 'var(--success)', fontWeight: 600 }}>{row.roas.toFixed(2)}x</td>
                                <td style={{ padding: '0.5rem' }}>{row.ctr.toFixed(2)}%</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="5" style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                                No breakdown logs for this range.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 6: TIMELINE */}
              {activeTab === 'timeline' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {tabLoading.trends ? (
                    <TableSkeleton rows={4} />
                  ) : tabError.trends ? (
                    <div style={{ background: 'var(--warning-light)', color: 'var(--warning)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertCircle size={14} />
                      <span>{tabError.trends}</span>
                    </div>
                  ) : tabData.trends?.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {tabData.trends.slice().reverse().map((day, idx) => (
                        <div key={idx} style={{ padding: '0.75rem 1rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                          <strong>{day.date}</strong>
                          <span style={{ color: 'var(--text-secondary)' }}>Spend: <strong>{formatCurrency(day.spend)}</strong></span>
                          <span style={{ color: 'var(--text-secondary)' }}>Conversions: <strong style={{ color: 'var(--success)' }}>{day.purchases}</strong></span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="card flex-center" style={{ height: '200px' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>No historical logs available.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 7: RECOMMENDATIONS / AI INSIGHTS */}
              {activeTab === 'recommendations' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {tabLoading.recommendations ? (
                    <TableSkeleton rows={3} />
                  ) : tabError.recommendations ? (
                    <div style={{ background: 'var(--warning-light)', color: 'var(--warning)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertCircle size={14} />
                      <span>{tabError.recommendations}</span>
                    </div>
                  ) : tabData.recommendations?.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {tabData.recommendations.map((item, idx) => {
                        const style = getSeverityStyle(item.severity);
                        return (
                          <div key={idx} style={{ ...style, padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                            <div style={{ marginTop: '0.15rem' }}>
                              {item.type === 'strength' && <CheckCircle size={16} color="var(--success)" />}
                              {item.type === 'warning' && <AlertTriangle size={16} color="var(--danger)" />}
                              {item.type === 'recommendation' && <Lightbulb size={16} color="var(--primary)" />}
                            </div>
                            <div>
                              <strong style={{ fontSize: '0.85rem', display: 'block', textTransform: 'capitalize' }}>{item.title}</strong>
                              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: '1.3' }}>{item.message}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="card flex-center" style={{ height: '200px', flexDirection: 'column', gap: '0.5rem' }}>
                      <Sparkles size={24} color="var(--text-tertiary)" />
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>All checks passed! No warnings or recommendations.</span>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="card flex-center" style={{ height: '200px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>Empty state.</span>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default CampaignDetailsDrawer;
