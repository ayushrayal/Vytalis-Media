import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  X, Info, Calendar, TrendingUp, Sparkles, Award, BarChart2,
  Users, Layers, Clock, AlertTriangle, Play, Pause, AlertCircle
} from 'lucide-react';
import { Shimmer, TableSkeleton } from './LoadingSkeleton';
import CreativeImage from './CreativeImage';
import { formatCurrency } from '../utils/formatter';
import {
  ResponsiveContainer, ComposedChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, Line, Bar
} from 'recharts';

const CampaignDetailsDrawer = ({ isOpen, onClose, campaignId, datePreset, customRange }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [breakdownTab, setBreakdownTab] = useState('age');
  const [chartMetric, setChartMetric] = useState('spend'); // 'spend', 'purchases', 'revenue', 'ctr'

  useEffect(() => {
    if (!isOpen || !campaignId) return;

    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
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

  if (!isOpen) return null;

  // Format Helper
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Ongoing';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const getStatusBadgeClass = (status) => {
    return status === 'ACTIVE' ? 'badge badge-active' : 'badge badge-paused';
  };

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
      {/* Semi-transparent Backdrop overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(15, 22, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)'
        }}
      />

      {/* Slide-over Drawer Panel */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '650px',
          height: '100vh',
          backgroundColor: 'var(--bg-secondary)',
          boxShadow: 'var(--shadow-lg)',
          borderLeft: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1001,
          animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}
      >
        {/* Header section */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            {loading ? (
              <div style={{ width: '180px', height: '22px', borderRadius: '4px', overflow: 'hidden' }}><Shimmer /></div>
            ) : (
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                {data?.campaign?.name}
              </h3>
            )}
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
              Campaign ID: {campaignId}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              transition: 'color var(--transition-fast)'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-primary)',
          borderBottom: '1px solid var(--border-color)',
          overflowX: 'auto',
          whiteSpace: 'nowrap'
        }}>
          {['overview', 'performance', 'creatives', 'breakdowns', 'timeline', 'recommendations'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '1rem 1.25rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                color: activeTab === tab ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Scrollable Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {error && (
            <div style={{
              background: 'var(--danger-light)',
              border: '1px solid var(--danger)',
              color: 'var(--danger)',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertTriangle size={18} />
              <span>{error}</span>
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
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1.25rem',
                    background: 'var(--bg-primary)',
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)'
                  }}>
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
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Created Time</span>
                      <span style={{ fontSize: '0.9rem' }}>{formatDate(data.campaign.createdTime)}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Last Updated</span>
                      <span style={{ fontSize: '0.9rem' }}>{formatDate(data.campaign.updatedTime)}</span>
                    </div>
                  </div>

                  {data.errors.campaign && (
                    <div style={{ background: 'var(--warning-light)', color: 'var(--warning)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertCircle size={14} />
                      <span>{data.errors.campaign}</span>
                    </div>
                  )}
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
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                      gap: '1rem'
                    }}>
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
                        <div key={idx} style={{
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          padding: '1rem',
                          borderRadius: 'var(--radius-sm)',
                          textAlign: 'center'
                        }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                            {kpi.label}
                          </span>
                          <strong style={{ fontSize: '1.1rem', fontWeight: 700, display: 'block', marginTop: '0.25rem' }}>
                            {kpi.value}
                          </strong>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Daily Trend Chart inside Drawer */}
                  {data.errors.trends ? (
                    <div style={{ background: 'var(--warning-light)', color: 'var(--warning)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertCircle size={14} />
                      <span>{data.errors.trends}</span>
                    </div>
                  ) : data.trends?.length > 0 ? (
                    <div className="card" style={{ height: '300px', display: 'flex', flexDirection: 'column', padding: '1.25rem', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 600 }}>Daily Trend Chart</h4>
                        <select
                          value={chartMetric}
                          onChange={(e) => setChartMetric(e.target.value)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-secondary)'
                          }}
                        >
                          <option value="spend">Spend</option>
                          <option value="purchases">Purchases</option>
                          <option value="revenue">Revenue</option>
                          <option value="ctr">CTR</option>
                        </select>
                      </div>
                      <div style={{ flex: 1, minHeight: 0 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={data.trends} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
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
                  ) : (
                    <div className="card flex-center" style={{ height: '200px' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>No trend details available.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: CREATIVES */}
              {activeTab === 'creatives' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {data.errors.creatives ? (
                    <div style={{ background: 'var(--warning-light)', color: 'var(--warning)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertCircle size={14} />
                      <span>{data.errors.creatives}</span>
                    </div>
                  ) : data.creatives?.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      {data.creatives.map((creative) => (
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

              {/* Tab 4: BREAKDOWNS */}
              {activeTab === 'breakdowns' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Breakdown Subtabs */}
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
                          textTransform: 'capitalize'
                        }}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>

                  {/* Rendering standard table for selected breakdown */}
                  {data.errors.demographics && ['age', 'gender'].includes(breakdownTab) ? (
                    <div style={{ background: 'var(--warning-light)', color: 'var(--warning)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertCircle size={14} />
                      <span>{data.errors.demographics}</span>
                    </div>
                  ) : data.errors.placementsDevices && ['placement', 'device'].includes(breakdownTab) ? (
                    <div style={{ background: 'var(--warning-light)', color: 'var(--warning)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertCircle size={14} />
                      <span>{data.errors.placementsDevices}</span>
                    </div>
                  ) : data.errors.region && breakdownTab === 'region' ? (
                    <div style={{ background: 'var(--warning-light)', color: 'var(--warning)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertCircle size={14} />
                      <span>{data.errors.region}</span>
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
                          {(data.breakdowns[breakdownTab] || []).length > 0 ? (
                            data.breakdowns[breakdownTab].map((row, idx) => (
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

              {/* Tab 5: TIMELINE */}
              {activeTab === 'timeline' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {data.trends?.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {data.trends.slice().reverse().map((day, idx) => (
                        <div key={idx} style={{
                          padding: '0.75rem 1rem',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.8rem'
                        }}>
                          <strong>{day.date}</strong>
                          <span style={{ color: 'var(--text-secondary)' }}>
                            Spend: <strong>{formatCurrency(day.spend)}</strong>
                          </span>
                          <span style={{ color: 'var(--text-secondary)' }}>
                            Conversions: <strong style={{ color: 'var(--success)' }}>{day.purchases}</strong>
                          </span>
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

              {/* Tab 6: RECOMMENDATIONS */}
              {activeTab === 'recommendations' && (
                <div className="card flex-center" style={{ height: '250px', flexDirection: 'column', gap: '0.75rem', border: '1px dashed var(--border-color)' }}>
                  <Sparkles size={36} color="var(--primary)" />
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>AI Recommendations</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '300px' }}>
                    AI insights will automatically generate optimization recommendations for bidding strategies, budget splits, placement exclusions, and creative ad fatigue.
                  </p>
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
