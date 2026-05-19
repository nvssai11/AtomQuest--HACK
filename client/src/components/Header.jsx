import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

const Header = () => {
  const { user, logout } = useAuth();
  const [isDark, setIsDark] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Initialize theme from document element
  useEffect(() => {
    const activeTheme = document.documentElement.getAttribute('data-theme');
    setIsDark(activeTheme === 'dark');
  }, []);

  const toggleTheme = () => {
    const nextTheme = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    setIsDark(!isDark);
  };

  const [notifications, setNotifications] = useState([]);

  // Fetch notifications dynamically on mount and short-poll every 6 seconds
  useEffect(() => {
    if (!user) return;

    const fetchNotifications = () => {
      api.get('/notifications')
        .then(data => setNotifications(data || []))
        .catch(err => console.error('Error fetching notifications:', err));
    };

    fetchNotifications();

    const interval = setInterval(fetchNotifications, 6000);
    return () => clearInterval(interval);
  }, [user]);

  const handleMarkAllRead = () => {
    api.post('/notifications/clear')
      .then(() => {
        setNotifications([]);
        setShowNotifications(false);
      })
      .catch(err => console.error('Error clearing notifications:', err));
  };

  return (
    <header 
      className="h-16 border-b border-border-color flex items-center justify-between px-6 sticky top-0" 
      style={{ 
        borderBottom: '1px solid var(--border-color)', 
        background: 'var(--bg-glass)', 
        backdropFilter: 'var(--glass-blur)', 
        WebkitBackdropFilter: 'var(--glass-blur)',
        zIndex: 9999
      }}
    >
      <div className="flex items-center gap-6">
        <h1 className="font-extrabold text-lg tracking-tight m-0" style={{ color: 'var(--text-primary)' }}>
          AtomQuest Portal
        </h1>
        
        {/* Polished Corporate Search Bar */}
        <div className="hidden md:flex items-center relative">
          <span className="absolute left-3 text-text-secondary text-sm">🔍</span>
          <input 
            type="text" 
            placeholder="Search goals, KPIs, actions, team members..." 
            className="input-field mb-0 pl-9 pr-4 text-xs"
            style={{ 
              width: '280px', 
              height: '2.1rem', 
              borderRadius: '9999px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)'
            }}
            disabled
          />
        </div>
      </div>
      
      <div className="flex items-center gap-4 ml-auto relative">
        {/* Theme Switcher Button */}
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-lg flex items-center justify-center border border-border-color transition-all duration-200"
          style={{
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label="Toggle Theme"
        >
          {isDark ? '☀️' : '🌙'}
        </button>

        {/* Notifications Icon with Glow Badge */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-8 h-8 rounded-lg flex items-center justify-center border border-border-color transition-all duration-200 relative"
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '1.05rem'
            }}
            title="Notifications"
            aria-label="View Notifications"
          >
            <span>🔔</span>
            <span 
              className={`absolute -top-1 -right-1 w-4 h-4 rounded-full bg-danger text-white text-[9px] font-bold flex items-center justify-center ${notifications?.length > 0 ? 'animate-pulse' : 'hidden'}`}
              style={{
                boxShadow: '0 0 8px var(--danger)'
              }}
            >
              {notifications?.length}
            </span>
          </button>

          {/* Interactive Glassmorphism Notification Tray */}
          {showNotifications && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowNotifications(false)}
              ></div>
              <div 
                className="animate-fade-in"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 12px)',
                  width: '320px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  padding: '1rem',
                  zIndex: 50,
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                  background: 'var(--bg-glass)',
                  backdropFilter: 'var(--glass-blur)',
                  WebkitBackdropFilter: 'var(--glass-blur)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>System Notifications</h4>
                  {notifications?.length > 0 && (
                    <button 
                      style={{ fontSize: '10px', color: 'var(--brand-600)', fontWeight: 700, background: 'transparent', border: 'none', cursor: 'pointer' }}
                      onClick={handleMarkAllRead}
                      onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                      onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {notifications?.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      All caught up! 🎉
                    </div>
                  ) : (
                    notifications?.map((n) => (
                      <div 
                        key={n.id} 
                        style={{
                          padding: '0.75rem',
                          borderRadius: '0.5rem',
                          fontSize: '0.75rem',
                          lineHeight: 1.5,
                          border: '1px solid',
                          background: 'var(--bg-primary)',
                          color: 'var(--text-primary)',
                          borderColor: n.type === 'alert' ? 'var(--warning-bg)' : n.type === 'success' ? 'var(--success-bg)' : 'var(--border-color)',
                          borderLeftWidth: '4px',
                          borderLeftColor: n.type === 'alert' ? 'var(--warning)' : n.type === 'success' ? 'var(--success)' : 'var(--brand-500)',
                          transition: 'box-shadow 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'}
                        onMouseLeave={(e) => e.target.style.boxShadow = 'none'}
                      >
                        {n.text}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Info Capsule */}
        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold m-0" style={{ color: 'var(--text-primary)' }}>{user?.name}</p>
          <p className="text-xs capitalize m-0 mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {user?.role} • {user?.department || 'Sales'}
          </p>
        </div>
        
        {/* Glowing Initials Avatar */}
        <div 
          className="w-9 h-9 rounded-full flex items-center justify-center font-bold border border-white/10 shadow-sm transition-transform duration-200 hover:scale-105"
          style={{ background: 'var(--brand-500)', color: '#ffffff' }}
        >
          {user?.name?.charAt(0) || 'U'}
        </div>
        
        <button
          onClick={logout}
          className="ml-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-all duration-200 hover:brightness-105 active:scale-95"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#ef4444',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default Header;
