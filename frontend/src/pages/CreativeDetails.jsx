import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useDashboard } from '../context/DashboardContext';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { AlertCircle, ArrowLeft, Video, Sparkles, AlertTriangle, ShieldCheck, CheckCircle } from 'lucide-react';
import { formatCurrency } from '../utils/formatter';
import CreativeImage from '../components/CreativeImage';

const CreativeDetails = () => {
  const { id: creativeId } = useParams();
  const navigate = useNavigate();
  const { datePreset, customRange, refreshTrigger } = useDashboard();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creative, setCreative] = useState(null);

  // AI Audit State variables
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAudit, setAiAudit] = useState(null);
  const [aiError, setAiError] = useState(null);

  const fetchCreativeDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `http://localhost:5000/api/creatives/${creativeId}?preset=${datePreset}`;
      if (datePreset === 'custom' && customRange.since && customRange.until) {
        url += `&since=${customRange.since}&until=${customRange.until}`;
      }

      const response = await axios.get(url);
      setCreative(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load creative details.');
    } finally {
      setLoading(false);
    }
  }, [creativeId, datePreset, customRange, refreshTrigger]);

  useEffect(() => {
    if (datePreset === 'custom' && (!customRange.since || !customRange.until)) {
      return;
    }
    fetchCreativeDetails();
    setAiAudit(null); // Reset audit when creative context changes
  }, [fetchCreativeDetails, datePreset, customRange]);

  // Handle requesting OpenAI AI Audit analysis
  const handleAiAuditRequest = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const response = await axios.post(`http://localhost:5000/api/analysis/creative`, {
        creativeId: creative.id,
        name: creative.name,
        copyText: creative.copyText,
        isVideo: creative.isVideo,
        metrics: creative.metrics,
        category: creative.category,
        performanceBadge: creative.performanceBadge
      });
      setAiAudit(response.data.data);
    } catch (err) {
      setAiError(err.response?.data?.message || 'Failed to generate AI Audit. Please verify your OpenAI key configuration.');
    } finally {
      setAiLoading(false);
    }
  };

  // formatCurrency imported from formatter.js

  if (loading) {
    return (
      <div>
        <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{ marginBottom: '1.5rem' }}>
          <ArrowLeft size={16} /> Back to Gallery
        </button>
        <TableSkeleton rows={8} />
      </div>
    );
  }

  if (error || !creative) {
    return (
      <div>
        <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{ marginBottom: '1.5rem' }}>
          <ArrowLeft size={16} /> Back to Gallery
        </button>
        <div className="card flex-center" style={{ height: '300px', flexDirection: 'column', gap: '1rem', color: 'var(--danger)' }}>
          <AlertCircle size={32} />
          <p>{error || 'Creative details could not be found.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{ marginBottom: '1rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
            <ArrowLeft size={14} /> Back
          </button>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>{creative.name}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Creative ID: {creative.id}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <span className={`badge badge-${creative.performanceBadge.toLowerCase()}`} style={{ fontSize: '0.9rem', padding: '0.4rem 1rem' }}>
            {creative.performanceBadge} Rating
          </span>
          <span className="badge badge-active" style={{ fontSize: '0.9rem', padding: '0.4rem 1rem' }}>
            {creative.status}
          </span>
        </div>
      </div>

      {/* Grid: Media preview + text left, Metrics right */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '2.5rem',
        marginBottom: '2.5rem',
        '@media (min-width: 1024px)': {
          gridTemplateColumns: '1.2fr 1.8fr'
        }
      }} id="creative-details-grid">
        
        {/* Media Box & Ad Copy */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden', background: 'var(--bg-tertiary)', position: 'relative' }}>
            <CreativeImage
              src={creative.imageUrl || creative.thumbnailUrl}
              alt={creative.name}
              isVideo={creative.isVideo}
              aspectRatio="auto"
              style={{ width: '100%', height: '360px' }}
            />
            {creative.isVideo && (
              <div style={{ position: 'absolute', bottom: '15px', right: '15px', padding: '0.5rem 1rem', background: 'rgba(0,0,0,0.7)', borderRadius: 'var(--radius-sm)', color: '#fff', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Video size={14} /> Video Preview
              </div>
            )}
          </div>

          {/* Ad Copy Box */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Primary Text Copy</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
              {creative.copyText || 'No text content defined.'}
            </p>
          </div>
        </div>

        {/* Metrics Grid details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem' }}>Performance Breakdown</h3>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '1.25rem',
              marginBottom: '2rem'
            }}>
              <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Spend</span>
                <h4 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem' }}>{formatCurrency(creative.metrics.spend)}</h4>
              </div>
              <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ROAS</span>
                <h4 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem', color: creative.metrics.roas >= 1.5 ? 'var(--success)' : 'inherit' }}>
                  {creative.metrics.roas.toFixed(2)}x
                </h4>
              </div>
              <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Purchases</span>
                <h4 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem' }}>{creative.metrics.purchases}</h4>
              </div>
              <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>CPA</span>
                <h4 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem' }}>
                  {creative.metrics.cpa > 0 ? formatCurrency(creative.metrics.cpa) : '₹0'}
                </h4>
              </div>
              <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>CTR</span>
                <h4 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem' }}>{creative.metrics.ctr.toFixed(2)}%</h4>
              </div>
              <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>CPM</span>
                <h4 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem' }}>{formatCurrency(creative.metrics.cpm)}</h4>
              </div>
              <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Reach</span>
                <h4 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem' }}>{creative.metrics.reach.toLocaleString()}</h4>
              </div>
              <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Frequency</span>
                <h4 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem' }}>{creative.metrics.frequency.toFixed(2)}</h4>
              </div>
            </div>

            {/* Video-specific analysis metrics */}
            {creative.isVideo && (
              <div style={{
                background: 'var(--primary-light)',
                border: '1px solid var(--primary)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                marginTop: '1rem'
              }}>
                <h4 style={{ fontSize: '1rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Video size={18} /> Video Retention Analytics
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', textAlign: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Hook Rate (3s/Imp)</span>
                    <strong style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>{creative.metrics.hookRate?.toFixed(1) || 0}%</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Hold Rate (ThruPlay/3s)</span>
                    <strong style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>{creative.metrics.holdRate?.toFixed(1) || 0}%</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Complete Watch Rate</span>
                    <strong style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>{creative.metrics.retentionRate?.toFixed(1) || 0}%</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Ad Origins */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Associated Ads & Campaigns</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.50rem' }}>
              {creative.ads.map((ad, idx) => (
                <div key={idx} style={{ padding: '0.5rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                    <span>Ad Name: {ad.adName}</span>
                    <span style={{ color: ad.adStatus === 'ACTIVE' ? 'var(--success)' : 'var(--text-secondary)' }}>{ad.adStatus}</span>
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    Campaign: {ad.campaignName} ({ad.campaignId}) | Ad Set: {ad.adsetName}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* AI creative audit tool box (Phase 10 & 11) */}
      <div className="card" style={{ border: '1px solid var(--primary)', background: 'linear-gradient(to right, var(--bg-secondary), var(--primary-light))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={22} color="var(--primary)" />
              <span>AI Creative Performance Auditor</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Query OpenAI API to evaluate copywriting copy hooks, performance rate comparisons, and scaling recommendations.
            </p>
          </div>
          <button
            onClick={handleAiAuditRequest}
            disabled={aiLoading}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Sparkles size={16} />
            <span>{aiLoading ? 'Analyzing Creative...' : 'Run AI Audit'}</span>
          </button>
        </div>

        {/* AI response display block */}
        {aiLoading && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--primary)', fontWeight: 600, animation: 'pulse 1.5s infinite' }}>
            Sending metrics and copywriting text to OpenAI...
            <style>{`
              @keyframes pulse {
                0%, 100% { opacity: 0.6; }
                50% { opacity: 1; }
              }
            `}</style>
          </div>
        )}

        {aiError && (
          <div style={{ padding: '1rem', background: 'var(--danger-light)', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            <AlertTriangle size={18} />
            <span>{aiError}</span>
          </div>
        )}

        {aiAudit && (
          <div className="fade-in" style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '1.5rem',
            marginTop: '1rem',
            fontSize: '0.9rem',
            lineHeight: '1.6'
          }}>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={18} /> OpenAI Analysis Report
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <strong style={{ color: 'var(--primary)', display: 'block', marginBottom: '0.25rem' }}>Performance Review (Why it worked/failed):</strong>
                <p style={{ color: 'var(--text-primary)' }}>{aiAudit.performanceReview}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <strong style={{ color: 'var(--success)', display: 'block', marginBottom: '0.25rem' }}>Scaling & Budget Recommendations:</strong>
                  <p>{aiAudit.scalingSuggestions}</p>
                </div>
                <div>
                  <strong style={{ color: 'var(--warning)', display: 'block', marginBottom: '0.25rem' }}>Creative Optimization Improvements:</strong>
                  <p>{aiAudit.improvements}</p>
                </div>
              </div>

              <div>
                <strong style={{ color: 'var(--primary)', display: 'block', marginBottom: '0.5rem' }}>New Hooks & Video Concept Ideas:</strong>
                <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {aiAudit.hooks?.map((hook, i) => <li key={i}>{hook}</li>)}
                </ul>
              </div>

              <div>
                <strong style={{ color: 'var(--accent)', display: 'block', marginBottom: '0.25rem' }}>Suggested UGC Script Concepts:</strong>
                <pre style={{
                  background: 'var(--bg-primary)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap'
                }}>{aiAudit.script}</pre>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (min-width: 1024px) {
          #creative-details-grid {
            grid-template-columns: 1.2fr 1.8fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default CreativeDetails;
