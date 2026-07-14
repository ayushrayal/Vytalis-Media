import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, AlertTriangle, Eye, EyeOff, Building, Key, ShieldAlert } from 'lucide-react';

const Signup = () => {
  const { signup, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm();

  // If already logged in, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (data) => {
    setError('');
    setSubmitting(true);

    const result = await signup({
      companyName: data.companyName,
      email: data.email,
      password: data.password,
      metaAccountId: data.metaAccountId,
      metaAccessToken: data.metaAccessToken,
      accessCode: data.accessCode
    });

    setSubmitting(false);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.message);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 10% 20%, var(--bg-primary) 0%, var(--bg-tertiary) 90%)',
      padding: '2rem 1.5rem'
    }}>
      <div className="glass fade-in" style={{
        width: '100%',
        maxWidth: '500px',
        borderRadius: 'var(--radius-lg)',
        padding: '2.5rem',
        boxShadow: 'var(--shadow-lg)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: '1.75rem',
            margin: '0 auto 1rem auto',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)'
          }}>
            M
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Create Account</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Register your Meta Ads AI Analytics Hub
          </p>
        </div>

        {error && (
          <div style={{
            background: 'var(--danger-light)',
            border: '1px solid var(--danger)',
            color: 'var(--danger)',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1.5rem',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <AlertTriangle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Company Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Company Name
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              border: errors.companyName ? '1px solid var(--danger)' : '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              background: 'var(--bg-secondary)',
              transition: 'border-color var(--transition-fast)'
            }}>
              <Building size={18} color="var(--text-tertiary)" style={{ marginRight: '0.75rem' }} />
              <input
                type="text"
                placeholder="Vytalis Media"
                {...register('companyName', { required: 'Company name is required' })}
                style={{
                  width: '100%',
                  fontSize: '0.95rem',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
            {errors.companyName && (
              <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.companyName.message}</span>
            )}
          </div>

          {/* Email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Work Email Address
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              border: errors.email ? '1px solid var(--danger)' : '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              background: 'var(--bg-secondary)',
              transition: 'border-color var(--transition-fast)'
            }}>
              <Mail size={18} color="var(--text-tertiary)" style={{ marginRight: '0.75rem' }} />
              <input
                type="email"
                placeholder="you@company.com"
                {...register('email', { 
                  required: 'Email address is required', 
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address format'
                  }
                })}
                style={{
                  width: '100%',
                  fontSize: '0.95rem',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
            {errors.email && (
              <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.email.message}</span>
            )}
          </div>

          {/* Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Password
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              border: errors.password ? '1px solid var(--danger)' : '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              background: 'var(--bg-secondary)',
              transition: 'border-color var(--transition-fast)'
            }}>
              <Lock size={18} color="var(--text-tertiary)" style={{ marginRight: '0.75rem' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Min 8 characters"
                {...register('password', { 
                  required: 'Password is required', 
                  minLength: {
                    value: 8,
                    message: 'Password must be at least 8 characters long'
                  }
                })}
                style={{
                  width: '100%',
                  fontSize: '0.95rem',
                  color: 'var(--text-primary)'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center' }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.password.message}</span>
            )}
          </div>

          {/* Meta Account ID */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Meta Ad Account ID
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              border: errors.metaAccountId ? '1px solid var(--danger)' : '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              background: 'var(--bg-secondary)',
              transition: 'border-color var(--transition-fast)'
            }}>
              <Building size={18} color="var(--text-tertiary)" style={{ marginRight: '0.75rem' }} />
              <input
                type="text"
                placeholder="e.g. 587440480534010"
                {...register('metaAccountId', { required: 'Meta Ad Account ID is required' })}
                style={{
                  width: '100%',
                  fontSize: '0.95rem',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
            {errors.metaAccountId && (
              <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.metaAccountId.message}</span>
            )}
          </div>

          {/* Meta Access Token */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Meta Access Token
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              border: errors.metaAccessToken ? '1px solid var(--danger)' : '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              background: 'var(--bg-secondary)',
              transition: 'border-color var(--transition-fast)'
            }}>
              <Key size={18} color="var(--text-tertiary)" style={{ marginRight: '0.75rem' }} />
              <input
                type="password"
                placeholder="EAA..."
                {...register('metaAccessToken', { required: 'Meta Access Token is required' })}
                style={{
                  width: '100%',
                  fontSize: '0.95rem',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
            {errors.metaAccessToken && (
              <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.metaAccessToken.message}</span>
            )}
          </div>

          {/* Access Code */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              System Access Code
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              border: errors.accessCode ? '1px solid var(--danger)' : '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              background: 'var(--bg-secondary)',
              transition: 'border-color var(--transition-fast)'
            }}>
              <ShieldAlert size={18} color="var(--text-tertiary)" style={{ marginRight: '0.75rem' }} />
              <input
                type="password"
                placeholder="Mandatory registration code"
                {...register('accessCode', { required: 'System Access Code is required' })}
                style={{
                  width: '100%',
                  fontSize: '0.95rem',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
            {errors.accessCode && (
              <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.accessCode.message}</span>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '0.85rem',
              marginTop: '0.5rem',
              opacity: submitting ? 0.7 : 1,
              cursor: submitting ? 'not-allowed' : 'pointer'
            }}
          >
            {submitting ? 'Registering...' : 'Sign Up'}
          </button>
        </form>

        <div style={{
          textAlign: 'center',
          marginTop: '1.5rem',
          fontSize: '0.9rem',
          color: 'var(--text-secondary)'
        }}>
          Already have an account? <span onClick={() => navigate('/login')} style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}>Sign In</span>
        </div>
      </div>
    </div>
  );
};

export default Signup;
