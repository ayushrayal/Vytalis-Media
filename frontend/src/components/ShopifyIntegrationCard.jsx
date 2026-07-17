import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useShopifyStatus, useDisconnectShopify } from '../utils/shopifyApi';
import { ShoppingBag, CheckCircle2, AlertCircle, RefreshCw, Unplug, Loader2, Calendar, Globe, Clock, ArrowRight } from 'lucide-react';

const ShopifyIntegrationCard = () => {
  const { data: status, isLoading } = useShopifyStatus();
  const disconnectMutation = useDisconnectShopify();
  const [searchParams, setSearchParams] = useSearchParams();

  const [storeDomain, setStoreDomain] = useState('');
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    const errorParam = searchParams.get('shopify_error');
    const connectedParam = searchParams.get('shopify_connected');

    if (errorParam) {
      setFormError(decodeURIComponent(errorParam));
      searchParams.delete('shopify_error');
      setSearchParams(searchParams);
    } else if (connectedParam) {
      setSuccessMsg('Shopify store connected via OAuth successfully!');
      searchParams.delete('shopify_connected');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams]);

  const handleConnect = (e) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);

    if (!storeDomain.trim()) {
      setFormError('Please enter your Shopify Store Domain.');
      return;
    }

    setIsRedirecting(true);
    const cleanDomain = storeDomain.trim().toLowerCase().replace(/^https?:\/\//i, '').split('/')[0];
    const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    
    // Redirect browser to backend install route to initiate Shopify OAuth
    window.location.href = `${backendUrl}/shopify/install?shop=${encodeURIComponent(cleanDomain)}`;
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect your Shopify store?')) {
      return;
    }

    setFormError(null);
    setSuccessMsg(null);

    try {
      await disconnectMutation.mutateAsync();
      setSuccessMsg('Shopify store disconnected successfully.');
      setStoreDomain('');
      setIsReconnecting(false);
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to disconnect Shopify store.');
    }
  };

  const startReconnect = () => {
    setStoreDomain(status?.storeDomain || '');
    setIsReconnecting(true);
    setFormError(null);
    setSuccessMsg(null);
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Card Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(150, 191, 72, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#95BF47' // Shopify Brand Color
            }}
          >
            <ShoppingBag size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Shopify Integration</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Connect your Shopify store using Partner App OAuth 2.0
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          {isLoading ? (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Loader2 size={14} className="spin" /> Checking...
            </span>
          ) : status?.connected && !isReconnecting ? (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--success)',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                padding: '0.35rem 0.75rem',
                borderRadius: '999px',
                border: '1px solid var(--success)'
              }}
            >
              <CheckCircle2 size={14} /> Connected
            </span>
          ) : (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--text-tertiary)',
                backgroundColor: 'var(--bg-tertiary)',
                padding: '0.35rem 0.75rem',
                borderRadius: '999px',
                border: '1px solid var(--border-color)'
              }}
            >
              Not Connected
            </span>
          )}
        </div>
      </div>

      {/* Alert Messages */}
      {successMsg && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid var(--success)',
            color: 'var(--success)',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {formError && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--danger)',
            color: 'var(--danger)',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <AlertCircle size={16} />
          <span>{formError}</span>
        </div>
      )}

      {/* Connected View */}
      {status?.connected && !isReconnecting ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-primary)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Store Name</label>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                {status.shopName || 'Shopify Store'}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Store Domain</label>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Globe size={14} color="var(--text-tertiary)" />
                {status.storeDomain}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Currency & Timezone</label>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                {status.currency || 'USD'} • {status.timezone || 'UTC'}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Connected Date</label>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Calendar size={14} color="var(--text-tertiary)" />
                {status.connectedAt ? new Date(status.connectedAt).toLocaleDateString() : 'N/A'}
              </div>
            </div>
          </div>

          {status.lastVerifiedAt && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '0.35rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
              <Clock size={12} />
              Last verified: {new Date(status.lastVerifiedAt).toLocaleString()}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={startReconnect}
              className="btn btn-secondary"
              style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <RefreshCw size={14} />
              <span>Reconnect Store</span>
            </button>

            <button
              onClick={handleDisconnect}
              className="btn btn-danger"
              disabled={disconnectMutation.isPending}
              style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid var(--danger)' }}
            >
              {disconnectMutation.isPending ? <Loader2 size={14} className="spin" /> : <Unplug size={14} />}
              <span>Disconnect</span>
            </button>
          </div>
        </div>
      ) : (
        /* Connect / Reconnect Form */
        <form onSubmit={handleConnect} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {isReconnecting && (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              Updating OAuth authorization for <strong>{status?.storeDomain}</strong>
            </div>
          )}

          {/* Store Domain Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Shopify Store Domain
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 1rem',
                background: 'var(--bg-primary)'
              }}
            >
              <Globe size={18} color="var(--text-tertiary)" style={{ marginRight: '0.75rem' }} />
              <input
                type="text"
                placeholder="your-store.myshopify.com"
                value={storeDomain}
                onChange={(e) => setStoreDomain(e.target.value)}
                required
                disabled={isRedirecting}
                style={{ width: '100%', color: 'var(--text-primary)' }}
              />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
              Enter your store handle (e.g. <code>my-brand.myshopify.com</code> or <code>my-brand</code>). No access token required.
            </span>
          </div>

          {/* OAuth Info Notice */}
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              color: 'var(--text-secondary)',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <ShoppingBag size={16} color="#3b82f6" />
            <span>You will be securely redirected to Shopify to authorize read permissions for orders, products, and customers.</span>
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isRedirecting}
              style={{ opacity: isRedirecting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {isRedirecting ? <Loader2 size={16} className="spin" /> : <ArrowRight size={16} />}
              <span>{isRedirecting ? 'Redirecting to Shopify...' : 'Connect Shopify'}</span>
            </button>

            {isReconnecting && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsReconnecting(false)}
                disabled={isRedirecting}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
};

export default ShopifyIntegrationCard;
