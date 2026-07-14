import React from 'react';
import { AlertTriangle, RefreshCw, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SectionError = ({
  message,
  onRetry,
  isRetrying = false,
  style = {}
}) => {
  const navigate = useNavigate();
  
  const isAuthError = message && (
    /expired/i.test(message) || 
    /auth/i.test(message) || 
    /token/i.test(message) || 
    /unauthorized/i.test(message) || 
    /login/i.test(message) || 
    /access denied/i.test(message) ||
    /session invalid/i.test(message)
  );

  const title = isAuthError ? 'Session Expired' : 'Section Loading Failed';

  const handleLoginRedirect = () => {
    navigate('/login', { replace: true });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: isAuthError ? 'rgba(245, 158, 11, 0.03)' : 'rgba(239, 68, 68, 0.03)',
        border: isAuthError ? '1px dashed rgba(245, 158, 11, 0.2)' : '1px dashed rgba(239, 68, 68, 0.2)',
        borderRadius: 'var(--radius-md)',
        color: 'var(--text-primary)',
        textAlign: 'center',
        gap: '1rem',
        width: '100%',
        boxSizing: 'border-box',
        backdropFilter: 'blur(8px)',
        minHeight: '200px',
        ...style
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: isAuthError ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: isAuthError ? 'var(--warning)' : 'var(--danger)',
          marginBottom: '0.25rem'
        }}
      >
        <AlertTriangle size={24} />
      </div>
      
      <div style={{ maxWidth: '400px' }}>
        <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 600, fontSize: '0.95rem' }}>
          {title}
        </h4>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
          {message || 'Something went wrong while loading this section.'}
        </p>
      </div>

      {isAuthError ? (
        <button
          onClick={handleLoginRedirect}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1.25rem',
            background: 'var(--primary)',
            color: '#ffffff',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all var(--transition-normal)',
            outline: 'none',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <LogIn size={14} />
          Go to Login
        </button>
      ) : (
        onRetry && (
          <button
            onClick={onRetry}
            disabled={isRetrying}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1.25rem',
              background: 'var(--primary)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: isRetrying ? 'not-allowed' : 'pointer',
              opacity: isRetrying ? 0.7 : 1,
              transition: 'all var(--transition-normal)',
              outline: 'none',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <RefreshCw
              size={14}
              className={isRetrying ? 'animate-spin' : ''}
              style={{
                animation: isRetrying ? 'spin 1s linear infinite' : 'none'
              }}
            />
            {isRetrying ? 'Retrying...' : 'Retry Section'}
          </button>
        )
      )}

      {/* Add inline spin animation style keyframes if not defined */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SectionError;
