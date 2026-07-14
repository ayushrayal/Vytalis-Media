import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { User, Mail, Shield, Key, Eye, EyeOff, Save, CheckCircle, AlertTriangle } from 'lucide-react';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  
  const [companyName, setCompanyName] = useState(user?.companyName || '');
  const [email] = useState(user?.email || ''); // read-only
  const [metaAccountId, setMetaAccountId] = useState(user?.metaAccountId || '');
  const [metaAccessToken, setMetaAccessToken] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showToken, setShowToken] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    // Basic password validation
    if (password && !currentPassword) {
      setError('Current password is required to set a new password.');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        companyName,
        metaAccountId
      };

      if (metaAccessToken) {
        payload.metaAccessToken = metaAccessToken;
      }
      
      if (password) {
        payload.currentPassword = currentPassword;
        payload.password = password;
      }

      const response = await axios.put('http://localhost:5000/api/auth/profile', payload);
      
      updateProfile(response.data.data.user);
      setMessage('Profile settings saved successfully!');
      setMetaAccessToken(''); // clear sensitive field
      setPassword(''); // clear sensitive field
      setCurrentPassword(''); // clear sensitive field
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem 0' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 700 }}>Profile & Settings</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Configure your login and Meta Developer Account details</p>
      </div>

      {message && (
        <div style={{
          background: 'var(--success-light)',
          border: '1px solid var(--success)',
          color: 'var(--success)',
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1.5rem',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <CheckCircle size={18} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div style={{
          background: 'var(--danger-light)',
          border: '1px solid var(--danger)',
          color: 'var(--danger)',
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1.5rem',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', fontWeight: 600 }}>
          Account Details
        </h3>

        {/* Company Name */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Company Name</label>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem',
            background: 'var(--bg-primary)'
          }}>
            <User size={18} color="var(--text-tertiary)" style={{ marginRight: '0.75rem' }} />
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              placeholder="Vytalis Media"
              style={{ width: '100%', color: 'var(--text-primary)' }}
            />
          </div>
        </div>

        {/* Email - Read Only */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Email Address</label>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Read-only (cannot be changed)</span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem',
            background: 'var(--bg-secondary)',
            opacity: 0.7,
            cursor: 'not-allowed'
          }}>
            <Mail size={18} color="var(--text-tertiary)" style={{ marginRight: '0.75rem' }} />
            <input
              type="email"
              value={email}
              readOnly
              disabled
              style={{ width: '100%', color: 'var(--text-secondary)', cursor: 'not-allowed' }}
            />
          </div>
        </div>

        {/* Role - Read Only */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Role / Permissions</label>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Read-only</span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem',
            background: 'var(--bg-secondary)',
            opacity: 0.7,
            cursor: 'not-allowed'
          }}>
            <Shield size={18} color="var(--text-tertiary)" style={{ marginRight: '0.75rem' }} />
            <input
              type="text"
              value={user?.role || 'Client'}
              readOnly
              disabled
              style={{ width: '100%', color: 'var(--text-secondary)', cursor: 'not-allowed' }}
            />
          </div>
        </div>

        <h3 style={{ fontSize: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginTop: '1rem', fontWeight: 600 }}>
          Security & Password
        </h3>

        {/* Current Password (Mandatory for password updates) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Current Password
          </label>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem',
            background: 'var(--bg-primary)'
          }}>
            <Key size={18} color="var(--text-tertiary)" style={{ marginRight: '0.75rem' }} />
            <input
              type={showCurrentPassword ? 'text' : 'password'}
              placeholder="Enter current password to make password changes"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              style={{ width: '100%', color: 'var(--text-primary)' }}
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              style={{ color: 'var(--text-tertiary)' }}
            >
              {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            New Password (Leave blank to keep current)
          </label>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem',
            background: 'var(--bg-primary)'
          }}>
            <Key size={18} color="var(--text-tertiary)" style={{ marginRight: '0.75rem' }} />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter new password (min 8 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', color: 'var(--text-primary)' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ color: 'var(--text-tertiary)' }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <h3 style={{ fontSize: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginTop: '1rem', fontWeight: 600 }}>
          Meta Developer Credentials
        </h3>

        {/* Meta Account ID */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Meta Ad Account ID (e.g. 587440480534010)
          </label>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem',
            background: 'var(--bg-primary)'
          }}>
            <Shield size={18} color="var(--text-tertiary)" style={{ marginRight: '0.75rem' }} />
            <input
              type="text"
              value={metaAccountId}
              onChange={(e) => setMetaAccountId(e.target.value)}
              required
              placeholder="e.g. 587440480534010"
              style={{ width: '100%', color: 'var(--text-primary)' }}
            />
          </div>
        </div>

        {/* Meta Access Token */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Meta Access Token (Leave blank to keep current)
          </label>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem',
            background: 'var(--bg-primary)'
          }}>
            <Key size={18} color="var(--text-tertiary)" style={{ marginRight: '0.75rem' }} />
            <input
              type={showToken ? 'text' : 'password'}
              placeholder="Enter new Meta Access Token (EAAB...)"
              value={metaAccessToken}
              onChange={(e) => setMetaAccessToken(e.target.value)}
              style={{ width: '100%', color: 'var(--text-primary)' }}
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              style={{ color: 'var(--text-tertiary)' }}
            >
              {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
            Note: For security reasons, the current token is never sent to the browser.
          </p>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{ alignSelf: 'flex-start', marginTop: '1rem', opacity: loading ? 0.7 : 1 }}
        >
          <Save size={18} />
          <span>{loading ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </form>
    </div>
  );
};

export default Profile;
