import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { X, Award, BarChart2, Calendar, Sparkles, TrendingUp, AlertTriangle, CheckCircle, Lightbulb } from 'lucide-react';
import CreativeImage from './CreativeImage';
import { Shimmer } from './LoadingSkeleton';
import SectionError from './SectionError';
import { getFriendlyErrorMessage } from '../utils/errorHandler';
import { formatCurrency } from '../utils/formatter';
import { ResponsiveContainer, ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line } from 'recharts';

const CreativeDetailsModal = ({ isOpen, onClose, creativeId, datePreset, customRange }) => {
  const [activeTab, setActiveTab] = useState('info');

  // Reset tab selection when modal opens/closes or creative changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab('info');
    }
  }, [isOpen, creativeId]);

  // 1. Basic details query
  const { data: basicData, isLoading: loadingBasic, error: basicQueryError, refetch: fetchBasic } = useQuery({
    queryKey: ['creativeBasic', creativeId],
    queryFn: async () => {
      const response = await axios.get(`http://localhost:5000/api/creatives/${creativeId}`);
      return response.data.data;
    },
    enabled: !!isOpen && !!creativeId && activeTab === 'info',
    staleTime: 5 * 60 * 1000
  });
  const basicError = basicQueryError ? getFriendlyErrorMessage(basicQueryError) : null;

  // 2. Performance metrics query
  const { data: perfData, isLoading: loadingPerf, error: perfQueryError, refetch: fetchPerf } = useQuery({
    queryKey: ['creativePerf', creativeId, datePreset, customRange],
    queryFn: async () => {
      let url = `http://localhost:5000/api/creatives/${creativeId}/performance?datePreset=${datePreset}`;
      if (datePreset === 'custom' && customRange?.since && customRange?.until) {
        url += `&since=${customRange.since}&until=${customRange.until}`;
      }
      const response = await axios.get(url);
      return response.data.data;
    },
    enabled: !!isOpen && !!creativeId && activeTab === 'performance',
    staleTime: 5 * 60 * 1000
  });
  const perfError = perfQueryError ? getFriendlyErrorMessage(perfQueryError) : null;

  // 3. Timeline daily metrics query
  const { data: timelineData, isLoading: loadingTimeline, error: timelineQueryError, refetch: fetchTimeline } = useQuery({
    queryKey: ['creativeTimeline', creativeId, datePreset, customRange],
    queryFn: async () => {
      let url = `http://localhost:5000/api/creatives/${creativeId}/timeline?datePreset=${datePreset}`;
      if (datePreset === 'custom' && customRange?.since && customRange?.until) {
        url += `&since=${customRange.since}&until=${customRange.until}`;
      }
      const response = await axios.get(url);
      return response.data.data;
    },
    enabled: !!isOpen && !!creativeId && activeTab === 'timeline',
    staleTime: 5 * 60 * 1000
  });
  const timelineError = timelineQueryError ? getFriendlyErrorMessage(timelineQueryError) : null;

  // 4. AI insights query
  const { data: insightsData, isLoading: loadingInsights, error: insightsQueryError, refetch: fetchInsights } = useQuery({
    queryKey: ['creativeInsights', creativeId, datePreset, customRange],
    queryFn: async () => {
      let url = `http://localhost:5000/api/creatives/${creativeId}/insights?datePreset=${datePreset}`;
      if (datePreset === 'custom' && customRange?.since && customRange?.until) {
        url += `&since=${customRange.since}&until=${customRange.until}`;
      }
      const response = await axios.get(url);
      return response.data.data;
    },
    enabled: !!isOpen && !!creativeId && activeTab === 'insights',
    staleTime: 5 * 60 * 1000
  });
  const insightsError = insightsQueryError ? getFriendlyErrorMessage(insightsQueryError) : null;

  if (!isOpen) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const getSeverityStyle = (severity) => {
    switch (severity) {
      case 'high': return { borderLeft: '4px solid var(--danger)', background: 'rgba(239, 68, 68, 0.05)' };
      case 'medium': return { borderLeft: '4px solid var(--warning)', background: 'rgba(245, 158, 11, 0.05)' };
      default: return { borderLeft: '4px solid var(--primary)', background: 'rgba(59, 130, 246, 0.05)' };
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 22, 42, 0.5)',
        backdropFilter: 'blur(5px)',
        zIndex: 1050,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '900px',
          maxHeight: '90vh',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}
      >
        {/* Header */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
              {basicData?.productName || 'Creative Details'}
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>ID: {creativeId}</span>
          </div>
          <button onClick={onClose} style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Main Content splits into left image preview and right tabs */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', flexWrap: 'wrap' }}>
          {/* Left Visual Preview */}
          <div style={{ width: '100%', maxWidth: '350px', padding: '1.5rem', borderRight: '1px solid var(--border-color)', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', justifyContent: 'center' }}>
            {loadingBasic ? (
              <div style={{ width: '100%', aspectRatio: '1/1', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}><Shimmer /></div>
            ) : basicData ? (
              <>
                <div style={{ width: '100%', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-color)', background: '#000' }}>
                  <CreativeImage src={basicData.imageUrl || basicData.thumbnailUrl} isVideo={basicData.isVideo} aspectRatio="1/1" />
                </div>
                <div style={{ width: '100%', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <span className="badge badge-active">{basicData.isVideo ? 'Video' : 'Static Image'}</span>
                  {basicData.cta && <span className="badge badge-paused">{basicData.cta}</span>}
                </div>
              </>
            ) : (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>Preview unavailable.</div>
            )}
          </div>

          {/* Right Info Panels */}
          <div style={{ flex: 1, minWidth: '320px', display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)' }}>
              {[
                { id: 'info', label: 'Basic Info', icon: <Calendar size={14} /> },
                { id: 'performance', label: 'Performance', icon: <BarChart2 size={14} /> },
                { id: 'timeline', label: 'Timeline History', icon: <TrendingUp size={14} /> },
                { id: 'insights', label: 'AI Recommendations', icon: <Sparkles size={14} /> }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  style={{
                    flex: 1,
                    padding: '0.75rem 0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    borderBottom: activeTab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
                    color: activeTab === t.id ? 'var(--primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.25rem',
                    background: 'none',
                    border: 'none',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>

            {/* Scrollable tab body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
              {/* Basic Info Tab */}
              {activeTab === 'info' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {loadingBasic ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <Shimmer style={{ height: '20px', width: '60%' }} />
                      <Shimmer style={{ height: '60px', width: '100%' }} />
                    </div>
                  ) : basicError ? (
                    <SectionError
                      message={basicError}
                      onRetry={fetchBasic}
                      isRetrying={loadingBasic}
                    />
                  ) : basicData ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block' }}>Headline</span>
                        <strong style={{ fontSize: '0.95rem' }}>{basicData.headline || 'No Headline Spec.'}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block' }}>Primary Copy Text</span>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                          {basicData.copyText || 'No text content available.'}
                        </p>
                      </div>
                      {basicData.landingPage && (
                        <div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block' }}>Landing Page URL</span>
                          <a href={basicData.landingPage} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none' }}>
                            {basicData.landingPage}
                          </a>
                        </div>
                      )}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>Created Date</span>
                          <span style={{ fontSize: '0.85rem' }}>{formatDate(basicData.createdDate)}</span>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>Last Updated</span>
                          <span style={{ fontSize: '0.85rem' }}>{formatDate(basicData.lastUpdated)}</span>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Performance Tab */}
              {activeTab === 'performance' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {loadingPerf ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <Shimmer style={{ height: '60px' }} />
                      <Shimmer style={{ height: '60px' }} />
                    </div>
                  ) : perfError ? (
                    <SectionError
                      message={perfError}
                      onRetry={fetchPerf}
                      isRetrying={loadingPerf}
                    />
                  ) : perfData ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
                      {[
                        { label: 'Spend', value: formatCurrency(perfData.spend || 0) },
                        { label: 'Purchases', value: perfData.purchases || 0 },
                        { label: 'Revenue', value: formatCurrency(perfData.purchaseConversionValue || 0) },
                        { label: 'ROAS', value: `${(perfData.roas || 0).toFixed(2)}x` },
                        { label: 'CTR', value: `${(perfData.ctr || 0).toFixed(2)}%` },
                        { label: 'CPA', value: formatCurrency(perfData.cpa || 0) },
                        { label: 'CPC', value: formatCurrency(perfData.cpc || 0) },
                        { label: 'CPM', value: formatCurrency(perfData.cpm || 0) }
                      ].map((item, idx) => (
                        <div key={idx} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>{item.label}</span>
                          <strong style={{ fontSize: '1.05rem', marginTop: '0.2rem', display: 'block' }}>{item.value}</strong>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}

              {/* Timeline History Tab */}
              {activeTab === 'timeline' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '280px' }}>
                  {loadingTimeline ? (
                    <Shimmer style={{ height: '100%', width: '100%' }} />
                  ) : timelineError ? (
                    <SectionError
                      message={timelineError}
                      onRetry={fetchTimeline}
                      isRetrying={loadingTimeline}
                    />
                  ) : timelineData && timelineData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={timelineData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                        <XAxis dataKey="date" fontSize={9} stroke="var(--text-secondary)" />
                        <YAxis fontSize={9} stroke="var(--text-secondary)" />
                        <Tooltip contentStyle={{ fontSize: '0.75rem' }} />
                        <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                        <Area type="monotone" name="Spend" dataKey="spend" fill="var(--primary-light)" stroke="var(--primary)" strokeWidth={1.5} />
                        <Line type="monotone" name="ROAS" dataKey="roas" stroke="var(--success)" strokeWidth={1.5} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex-center" style={{ height: '100%' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>No historical logs.</span>
                    </div>
                  )}
                </div>
              )}

              {/* AI Insights / Recommendations Tab */}
              {activeTab === 'insights' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {loadingInsights ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <Shimmer style={{ height: '40px' }} />
                      <Shimmer style={{ height: '40px' }} />
                    </div>
                  ) : insightsError ? (
                    <SectionError
                      message={insightsError}
                      onRetry={fetchInsights}
                      isRetrying={loadingInsights}
                    />
                  ) : insightsData && insightsData.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {insightsData.map((item, idx) => {
                        const style = getSeverityStyle(item.severity);
                        return (
                          <div key={idx} style={{ ...style, padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                            <div style={{ marginTop: '0.15rem' }}>
                              {item.type === 'strength' && <CheckCircle size={16} color="var(--success)" />}
                              {item.type === 'warning' && <AlertTriangle size={16} color="var(--danger)" />}
                              {item.type === 'recommendation' && <Lightbulb size={16} color="var(--primary)" />}
                            </div>
                            <div>
                              <strong style={{ fontSize: '0.85rem', display: 'block', textTransform: 'capitalize' }}>
                                {item.title}
                              </strong>
                              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: '1.3' }}>
                                {item.message}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex-center" style={{ height: '150px' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>No recommendation insights computed.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default CreativeDetailsModal;
