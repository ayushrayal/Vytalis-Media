import React, { useState } from 'react';
import { useShopifyStatus, useConnectShopify, useDisconnectShopify } from '../utils/shopifyApi';
import { ShoppingBag, CheckCircle2, AlertCircle, RefreshCw, Unplug, Eye, EyeOff, Loader2, Calendar, Globe, Clock } from 'lucide-react';

const ShopifyIntegrationCard = () => {
  const { data: status, isLoading, isError, error } = useShopifyStatus();
  const connectMutation = useConnectShopify();
  const disconnectMutation = useDisconnectShopify();

  const [storeDomain, setStoreDomain] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleConnect = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);

    if (!storeDomain.trim()) {
      setFormError('Please enter your Shopify Store Domain.');
      return;
    }
    if (!accessToken.trim()) {
      setFormError('Please enter your Shopify Admin API Token.');
      return;
    }

    try {
      await connectMutation.mutateAsync({
        storeDomain: storeDomain.trim(),
        accessToken: accessToken.trim()
      });

      setSuccessMsg('Shopify store connected successfully!');
      setAccessToken('');
      setIsReconnecting(false);
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to connect Shopify store.');
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
      setAccessToken('');
      setIsReconnecting(false);
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to disconnect Shopify store.');
    }
  };

  const startReconnect = () => {
    setStoreDomain(status?.storeDomain || '');
    setAccessToken('');
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
              Connect your Shopify store to sync revenue & e-commerce metrics
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
              Updating connection credentials for <strong>{status?.storeDomain}</strong>
            </div>
          )}

          {/* Store Domain */}
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
                style={{ width: '100%', color: 'var(--text-primary)' }}
              />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
              Example: <code>my-brand.myshopify.com</code> or <code>my-brand</code>
            </span>
          </div>

          {/* Admin API Token */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Shopify Admin API Access Token
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
              <input
                type={showToken ? 'text' : 'password'}
                placeholder="shpat_xxxxxxxxxxxxxxxxxxxxxxxx"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                required
                style={{ width: '100%', color: 'var(--text-primary)' }}
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
              Created in Shopify Admin &gt; Settings &gt; Apps and sales channels &gt; Develop apps. Encrypted before storing.
            </span>
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={connectMutation.isPending}
              style={{ opacity: connectMutation.isPending ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {connectMutation.isPending ? <Loader2 size={16} className="spin" /> : <ShoppingBag size={16} />}
              <span>{connectMutation.isPending ? 'Verifying & Connecting...' : isReconnecting ? 'Save New Credentials' : 'Connect Shopify'}</span>
            </button>

            {isReconnecting && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsReconnecting(false)}
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
