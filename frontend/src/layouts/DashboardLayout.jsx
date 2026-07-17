import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard,
  Megaphone,
  Layers,
  Image,
  Award,
  AlertTriangle,
  Video,
  Monitor,
  Users,
  MapPin,
  Calendar,
  Sparkles,
  Settings,
  User,
  LogOut,
  Sun,
  Moon,
  Search,
  RefreshCw,
  Menu,
  X,
  AlertCircle,
  ShoppingBag
} from 'lucide-react';
import DateRangeSelector from '../components/DateRangeSelector';

const DashboardLayout = ({ children, globalSearch, setGlobalSearch, refreshData, autoRefresh, setAutoRefresh }) => {
  const { user, logout, metaTokenError } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const isReportingPage = !['/profile', '/ai-insights'].includes(location.pathname);
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [refreshCountdown, setRefreshCountdown] = useState(autoRefresh === 'off' ? null : parseInt(autoRefresh) * 60);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Auto Refresh Countdown timer
  useEffect(() => {
    if (autoRefresh === 'off') {
      setRefreshCountdown(null);
      return;
    }
    
    setRefreshCountdown(parseInt(autoRefresh) * 60);
    
    const interval = setInterval(() => {
      setRefreshCountdown(prev => {
        if (prev <= 1) {
          refreshData(); // trigger refresh
          return parseInt(autoRefresh) * 60; // reset
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshData]);

  const handleRefreshClick = () => {
    refreshData();
    if (autoRefresh !== 'off') {
      setRefreshCountdown(parseInt(autoRefresh) * 60);
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Shopify Analytics', path: '/dashboard/shopify', icon: ShoppingBag },
    { name: 'Combined Analytics', path: '/dashboard/combined', icon: Layers, badge: 'Soon' },
    { name: 'Campaigns', path: '/campaigns', icon: Megaphone },
    { name: 'Ad Sets', path: '/adsets', icon: Layers },
    { name: 'Creative Gallery', path: '/creatives', icon: Image },
    { name: 'Winning Creatives', path: '/winners', icon: Award },
    { name: 'Poor Performers', path: '/poor-performers', icon: AlertTriangle },
    { name: 'Video Analytics', path: '/video-analysis', icon: Video },
    { name: 'Static Analytics', path: '/static-analysis', icon: Monitor },
    { name: 'Audience Reports', path: '/audience', icon: Users },
    { name: 'Placement Reports', path: '/placements', icon: MapPin },
    { name: 'Age Breakdowns', path: '/age-breakdown', icon: Calendar },
    { name: 'AI Insights', path: '/ai-insights', icon: Sparkles },
    { name: 'Profile Settings', path: '/profile', icon: User },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Sidebar Navigation */}
      <aside className={`glass`} style={{
        width: '280px',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--border-color)',
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        zIndex: 50,
        transition: 'transform var(--transition-normal)',
        transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)'
      }} id="sidebar-nav">
        {/* Brand Header */}
        <div style={{
          padding: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '1rem',
              letterSpacing: '-0.5px'
            }}>
              VM
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, whiteSpace: 'nowrap' }}>Vytalis Media Reporting</h3>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Scaling brands since 2022</p>
            </div>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(false)} 
            style={{ display: 'none' }} /* visible on mobile only */
            id="mobile-close-btn"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav style={{ flex: 1, padding: '1rem 0.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 500,
                  fontSize: '0.9rem',
                  color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                  background: isActive ? 'var(--primary-light)' : 'transparent',
                  transition: 'background var(--transition-fast), color var(--transition-fast)'
                }}
              >

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Icon size={18} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '0.15rem 0.45rem', borderRadius: '999px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid #3b82f6' }}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer controls (Theme & Logout) */}
        <div style={{
          padding: '1rem',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          {/* User profile brief */}
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--bg-tertiary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                color: 'var(--primary)'
              }}>
                {user?.companyName?.charAt(0) || 'U'}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.companyName || 'User'}</p>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email || ''}</p>
              </div>
            </div>
          )}

          {/* Theme Toggle & Logout Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button
              onClick={toggleTheme}
              className="btn btn-secondary"
              style={{
                width: '100%',
                padding: '0.6rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontSize: '0.85rem'
              }}
              title="Toggle Theme"
            >
              {theme === 'light' ? (
                <>
                  <Moon size={16} />
                  <span>Dark Mode</span>
                </>
              ) : (
                <>
                  <Sun size={16} />
                  <span>Light Mode</span>
                </>
              )}
            </button>
            
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="sidebar-logout-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 500,
                fontSize: '0.9rem',
                color: 'var(--text-secondary)',
                width: '100%',
                cursor: 'pointer',
                transition: 'background var(--transition-fast), color var(--transition-fast)'
              }}
              title="Sign Out"
            >
              <LogOut size={18} />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main View Wrapper */}
      <div style={{ flex: 1, marginLeft: '280px', display: 'flex', flexDirection: 'column', minWidth: 0 }} id="main-content-wrapper">
        {/* Header Component */}
        <header className="glass" style={{
          height: '70px',
          padding: '0 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-color)',
          position: 'sticky',
          top: 0,
          zIndex: 40
        }}>
          {/* Global Search Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, maxWidth: '400px' }}>
            <Search size={18} color="var(--text-tertiary)" />
            <input
              type="text"
              placeholder="Search campaigns, adsets, creatives..."
              value={globalSearch || ''}
              onChange={(e) => setGlobalSearch(e.target.value)}
              style={{
                width: '100%',
                fontSize: '0.9rem',
                color: 'var(--text-primary)'
              }}
            />
            {globalSearch && (
              <button onClick={() => setGlobalSearch('')} style={{ color: 'var(--text-tertiary)' }}>
                <X size={16} />
              </button>
            )}
          </div>

          {/* Right Header Options */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Auto refresh rate select */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Auto-Refresh:</span>
              <select
                value={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.value)}
                style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                <option value="off">Off</option>
                <option value="5">5m</option>
                <option value="10">10m</option>
                <option value="15">15m</option>
              </select>
            </div>

            {/* Manual Refresh Button */}
            <button
              onClick={handleRefreshClick}
              className="btn btn-secondary"
              style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <RefreshCw size={14} className={refreshCountdown !== null && refreshCountdown % 10 === 0 ? 'spin' : ''} />
              <span>Refresh</span>
              {refreshCountdown !== null && (
                <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>({refreshCountdown}s)</span>
              )}
            </button>
          </div>
        </header>

        {/* Global Warning Banner for Meta Token Expiration */}
        {metaTokenError && (
          <div style={{
            background: 'var(--danger-light)',
            borderBottom: '1px solid var(--danger)',
            color: 'var(--danger)',
            padding: '1rem 2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            animation: 'fadeIn 0.3s ease-out'
          }}>
            <AlertCircle size={20} />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>Meta Ads Integration Alert</p>
              <p style={{ fontSize: '0.8rem' }}>{metaTokenError.message}</p>
            </div>
            <Link
              to="/profile"
              className="btn"
              style={{
                background: 'var(--danger)',
                color: '#fff',
                padding: '0.25rem 0.75rem',
                fontSize: '0.8rem'
              }}
            >
              Update Credentials
            </Link>
          </div>
        )}

        {/* Main Content Pane */}
        <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
          {isReportingPage && <DateRangeSelector />}
          {children}
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="glass" style={{
            width: '90%',
            maxWidth: '400px',
            borderRadius: 'var(--radius-md)',
            padding: '2rem',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border-color)',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <LogOut size={20} color="var(--primary)" />
              Logout
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              Are you sure you want to logout?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowLogoutConfirm(false);
                  await logout(true);
                  navigate('/login', { replace: true });
                }}
                className="btn"
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.9rem',
                  background: 'var(--danger)',
                  color: '#fff'
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embedded Mobile CSS Overrides */}
      <style>{`
        #sidebar-nav {
          display: flex !important;
        }
        @media (min-width: 1024px) {
          #sidebar-nav {
            transform: translateX(0) !important;
          }
        }
        @media (max-width: 1023px) {
          #sidebar-nav {
            transform: ${mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)'} !important;
          }
          #main-content-wrapper {
            margin-left: 0 !important;
          }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        .sidebar-logout-btn {
          background: transparent;
          color: var(--text-secondary);
        }
        .sidebar-logout-btn:hover {
          background: var(--primary-light) !important;
          color: var(--primary) !important;
        }
        .sidebar-logout-btn:active {
          background: var(--primary) !important;
          color: #fff !important;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default DashboardLayout;
