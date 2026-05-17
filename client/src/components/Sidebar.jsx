import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SidebarItem = ({ to, icon, label, isActive }) => (
  <Link
    to={to}
    className={`sidebar-item ${isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'}`}
  >
    <span className="sidebar-item-icon">{icon}</span>
    <span>{label}</span>
  </Link>
);

const Sidebar = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const role = user?.role;

  return (
    <aside className="sidebar" style={{ background: 'var(--bg-glass)', backdropFilter: 'var(--glass-blur)', borderRight: '1px solid var(--border-color)' }}>
      <div>
        <div className="sidebar-logo-container">
          <div className="sidebar-logo-badge">
            A
          </div>
          <span className="sidebar-logo-text" style={{ background: 'linear-gradient(135deg, #0b1a30 0%, #0066cc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AtomQuest</span>
        </div>

        <nav className="sidebar-nav">
          <SidebarItem to="/" icon="📊" label="Dashboard" isActive={location.pathname === '/'} />
          {role === 'employee' && (
            <>
              <SidebarItem to="/goals" icon="🎯" label="My Goal Sheet" isActive={location.pathname === '/goals'} />
              <SidebarItem to="/checkin" icon="📝" label="Quarterly Check-In" isActive={location.pathname === '/checkin'} />
            </>
          )}
          {role === 'manager' && (
            <>
              <SidebarItem to="/goals" icon="🎯" label="My Goal Sheet" isActive={location.pathname === '/goals'} />
              <SidebarItem to="/approvals" icon="✓" label="Approval Queue" isActive={location.pathname === '/approvals'} />
              <SidebarItem to="/team-checkin" icon="👥" label="Team Check-Ins" isActive={location.pathname === '/team-checkin'} />
            </>
          )}
          {role === 'admin' && (
            <>
              <SidebarItem to="/admin" icon="⚙️" label="Admin Panel" isActive={location.pathname === '/admin'} />
              <SidebarItem to="/goals" icon="🎯" label="Shared Goals" isActive={location.pathname === '/goals'} />
              <SidebarItem to="/reports" icon="📋" label="Reports" isActive={location.pathname === '/reports'} />
              <SidebarItem to="/analytics" icon="📈" label="Analytics" isActive={location.pathname === '/analytics'} />
            </>
          )}
        </nav>
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-user-card" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <div className="sidebar-avatar">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="sidebar-user-info">
            <h4 className="sidebar-user-name" title={user?.name} style={{ color: 'var(--text-primary)' }}>{user?.name}</h4>
            <p className="sidebar-user-role" style={{ color: 'var(--text-secondary)' }}>
              <span style={{ fontSize: '10px' }}>👤</span> {user?.role}
            </p>
          </div>
          <button 
            type="button" 
            className="sidebar-logout-btn" 
            onClick={logout} 
            title="Logout"
            aria-label="Logout"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: 'none',
              borderRadius: '0.5rem',
              color: '#ef4444',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.4rem',
              transition: 'all 0.2s'
            }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
