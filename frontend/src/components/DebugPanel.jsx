import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Terminal, X, RefreshCw, Activity, Database, AlertCircle, ShieldAlert, Cpu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DebugPanel = () => {
  // Vite checks DEV mode via import.meta.env.DEV
  if (!import.meta.env.DEV) {
    return null;
  }

  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/debug/meta');
      setMetrics(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 3000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const hitRate = metrics?.cacheStatistics
    ? (metrics.cacheStatistics.hits + metrics.cacheStatistics.misses > 0
        ? ((metrics.cacheStatistics.hits / (metrics.cacheStatistics.hits + metrics.cacheStatistics.misses)) * 100).toFixed(1)
        : '0.0')
    : '0.0';

  return (
    <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 99999, fontFamily: 'sans-serif' }}>
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            backgroundColor: '#0f172a',
            color: '#38bdf8',
            border: '1px solid #334155',
            borderRadius: '20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600,
            transition: 'all 0.2s'
          }}
        >
          <Terminal size={14} />
          Debug Metrics
        </button>
      ) : (
        <div
          style={{
            width: '380px',
            maxHeight: '520px',
            backgroundColor: '#0f172a',
            color: '#f8fafc',
            border: '1px solid #334155',
            borderRadius: '12px',
            boxShadow: '0 12px 24px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            fontSize: '12px'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#1e293b'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
              <Cpu size={14} color="#38bdf8" />
              <span>Meta API Telemetry & Diagnostics</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={fetchMetrics}
                disabled={loading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Refresh Metrics"
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div style={{ padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {error && (
              <div style={{ padding: '8px 12px', backgroundColor: '#450a0a', border: '1px solid #991b1b', borderRadius: '6px', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}

            {/* Context Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>User:</span>
                <span style={{ fontWeight: 500 }}>{user?.email || 'Guest'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Ad Account ID:</span>
                <span style={{ fontFamily: 'monospace' }}>{user?.metaAccountId || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Graph API Version:</span>
                <span>{metrics?.graphApiVersion || 'N/A'}</span>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #334155', margin: 0 }} />

            {/* Cache and Queue Status */}
            <div>
              <h4 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8', fontWeight: 600 }}>
                <Database size={12} />
                <span>Cache & Concurrency Queue</span>
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ padding: '8px', backgroundColor: '#1e293b', borderRadius: '6px' }}>
                  <div style={{ color: '#94a3b8', fontSize: '10px' }}>Cache Hits/Misses</div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '2px', color: '#10b981' }}>
                    {metrics?.cacheStatistics?.hits || 0} <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'normal' }}>/ {metrics?.cacheStatistics?.misses || 0}</span>
                  </div>
                  <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>Hit Rate: {hitRate}%</div>
                </div>

                <div style={{ padding: '8px', backgroundColor: '#1e293b', borderRadius: '6px' }}>
                  <div style={{ color: '#94a3b8', fontSize: '10px' }}>Queue Queue/Active</div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '2px', color: '#38bdf8' }}>
                    {metrics?.queueStatistics?.waiting || 0} <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'normal' }}>/ {metrics?.queueStatistics?.running || 0}</span>
                  </div>
                  <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>Limit: 5 concurrent</div>
                </div>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #334155', margin: 0 }} />

            {/* Telemetry Logs */}
            <div>
              <h4 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8', fontWeight: 600 }}>
                <Activity size={12} />
                <span>Live Meta Request History</span>
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                {metrics?.requestMetrics && metrics.requestMetrics.length > 0 ? (
                  metrics.requestMetrics.slice(0, 5).map((log, idx) => (
                    <div key={idx} style={{ padding: '6px 8px', backgroundColor: '#1e293b', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '2px', borderLeft: log.cacheStatus === 'hit' ? '3px solid #10b981' : '3px solid #64748b' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '10px' }}>
                        <span style={{ color: '#38bdf8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>{log.apiEndpoint}</span>
                        <span style={{ color: '#94a3b8' }}>{log.requestDurationMs}ms</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#94a3b8' }}>
                        <span>Cache: {log.cacheStatus.toUpperCase()}</span>
                        <span>Size: {(log.payloadSize / 1024).toFixed(1)} KB</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: '12px 0' }}>No Meta requests sent yet.</div>
                )}
              </div>
            </div>

            {/* Error Diagnostics block */}
            {metrics?.lastMetaError && (
              <>
                <hr style={{ border: 'none', borderTop: '1px solid #334155', margin: 0 }} />
                <div>
                  <h4 style={{ margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontWeight: 600 }}>
                    <ShieldAlert size={12} />
                    <span>Last Meta API Error</span>
                  </h4>
                  <div style={{ padding: '8px', backgroundColor: '#1e293b', border: '1px solid #991b1b', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#fca5a5' }}>
                      Error Code: {metrics.lastMetaError.code}
                    </div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', lineHeight: '1.4', overflow: 'hidden', textOverflow: 'ellipsis', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', display: '-webkit-box' }}>
                      {metrics.lastMetaError.message}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugPanel;
