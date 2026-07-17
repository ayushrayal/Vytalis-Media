import React from 'react';
import { Layers, Sparkles, ShoppingBag, TrendingUp, BarChart3, Clock } from 'lucide-react';

const CombinedAnalytics = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '900px', margin: '1rem auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(59, 130, 246, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#3b82f6'
          }}
        >
          <Layers size={20} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Combined Analytics</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Unified multi-channel performance intelligence
          </p>
        </div>
      </div>

      {/* Main Banner Card */}
      <div
        className="card fade-in"
        style={{
          padding: '2.5rem 2rem',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.25rem',
          background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)'
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.35rem 0.85rem',
            borderRadius: '999px',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid #3b82f6',
            color: '#3b82f6',
            fontSize: '0.8rem',
            fontWeight: 600
          }}
        >
          <Clock size={14} />
          <span>Coming Soon in Phase 3</span>
        </div>

        <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>
          Cross-Channel Revenue & Attribution
        </h2>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '600px', lineHeight: 1.6 }}>
          Combined Analytics will automatically aggregate data across Meta Ads, Shopify, Google Ads, TikTok Ads, and Stripe into a single, unified ROAS and revenue dashboard.
        </p>

        {/* Channel Badges Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '1rem',
            width: '100%',
            marginTop: '1rem'
          }}
        >
          <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-primary)' }}>
            <TrendingUp size={20} color="#1877F2" />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Meta Ads</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>Connected</div>
            </div>
          </div>

          <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-primary)' }}>
            <ShoppingBag size={20} color="#95BF47" />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Shopify</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>Connected</div>
            </div>
          </div>

          <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-primary)', opacity: 0.6 }}>
            <BarChart3 size={20} color="#EA4335" />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Google Ads</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Planned</div>
            </div>
          </div>

          <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-primary)', opacity: 0.6 }}>
            <Sparkles size={20} color="#FE2C55" />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>TikTok Ads</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Planned</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CombinedAnalytics;
