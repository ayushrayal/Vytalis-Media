import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useShopifyStatus, useDisconnectShopify, fetchShopifyInstallUrl } from '../utils/shopifyApi';
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
    const statusParam = searchParams.get('status');
    const legacyError = searchParams.get('shopify_error');
    const legacyConnected = searchParams.get('shopify_connected');

    if (statusParam) {
      switch (statusParam) {
        case 'success':
          setSuccessMsg('Shopify store connected successfully.');
          break;
        case 'cancelled':
          setFormError('Shopify authorization was cancelled.');
          break;
        case 'invalid_hmac':
          setFormError('Security validation failed.');
          break;
        case 'invalid_state':
          setFormError('Session expired. Please try again.');
          break;
        case 'invalid_domain':
          setFormError('Invalid store domain.');
          break;
        case 'error':
        default:
          setFormError('Unable to connect Shopify store.');
          break;
      }
      searchParams.delete('status');
      setSearchParams(searchParams);
    } else if (legacyError) {
      setFormError(decodeURIComponent(legacyError));
      searchParams.delete('shopify_error');
      setSearchParams(searchParams);
    } else if (legacyConnected) {
      setSuccessMsg('Shopify store connected via OAuth successfully!');
      searchParams.delete('shopify_connected');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams]);

  /**
   * Normalize domain string consistently across UI inputs.
   * e.g. "https://your-store.myshopify.com/" -> "your-store.myshopify.com"
   * e.g. "your-store" -> "your-store.myshopify.com"
   */
  const normalizeDomainInput = (rawInput) => {
    if (!rawInput || typeof rawInput !== 'string') return '';
    let cleaned = rawInput.trim().toLowerCase();
    cleaned = cleaned.replace(/^https?:\/\//i, '');
    cleaned = cleaned.split('/')[0].trim();
    if (cleaned && !cleaned.endsWith('.myshopify.com')) {
      cleaned = `${cleaned.replace(/\.+$/, '')}.myshopify.com`;
    }
    return cleaned;
  };

  const handleConnect = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);

    if (!storeDomain.trim()) {
      setFormError('Please enter your Shopify Store Domain.');
      return;
    }

    const cleanDomain = normalizeDomainInput(storeDomain);
    if (!cleanDomain) {
      setFormError('Invalid Shopify Store Domain format.');
      return;
    }

    setIsRedirecting(true);

    try {
      const redirectUrl = await fetchShopifyInstallUrl(cleanDomain);

      if (!redirectUrl || typeof redirectUrl !== 'string') {
        throw new Error('Missing Shopify OAuth authorization redirect URL.');
      }

      window.location.href = redirectUrl;
    } catch (err) {
      setIsRedirecting(false);
      const msg = err.response?.data?.message || err.message || 'Failed to initiate Shopify OAuth connection.';
      setFormError(msg);
    }
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
              Connect your store securely via Shopify Partner App OAuth 2.0
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
              <span>Reconnect</span>
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
              Enter your store handle (e.g. <code>your-store.myshopify.com</code> or <code>your-store</code>). No access token required.
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
            <span>You will be securely redirected to Shopify to approve permissions for orders, products, customers, and analytics.</span>
          </div>

          {/* Form Actions - Continue with Shopify CTA */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isRedirecting}
              style={{
                opacity: isRedirecting ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                backgroundColor: '#95BF47', // Shopify Brand Color
                borderColor: '#95BF47',
                color: '#ffffff',
                fontWeight: 600,
                padding: '0.65rem 1.25rem'
              }}
            >
              {isRedirecting ? <Loader2 size={18} className="spin" /> : <ShoppingBag size={18} />}
              <span>{isRedirecting ? 'Connecting...' : 'Continue with Shopify'}</span>
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
