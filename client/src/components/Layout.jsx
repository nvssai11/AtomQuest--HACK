import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SidebarItem = ({ to, icon, label, isActive }) => (
  <Link
    to={to}
    className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 font-medium transition-all ${
      isActive 
        ? 'bg-brand-50 text-brand-600' 
        : 'text-text-secondary hover:bg-bg-primary hover:text-text-primary'
    }`}
  >
    <span className="text-xl">{icon}</span>
    {label}
  </Link>
);

const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuth();
  const role = user?.role;

  return (
    <aside className="sidebar">
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center text-white font-bold shadow-lg shadow-brand-500/30">
          A
        </div>
        <span className="text-xl font-bold bg-clip-text text-transparent bg-brand-gradient">AtomQuest</span>
      </div>

      <nav className="flex-1">
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
    </aside>
  );
};

const Header = () => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 border-b border-border-color bg-bg-secondary flex items-center justify-between px-6 sticky top-0 z-10">
      <h1 className="font-semibold text-lg text-text-primary hidden sm:block">
        In-House Goal Setting & Tracking Portal
      </h1>
      
      <div className="flex items-center gap-4 ml-auto">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-text-primary">{user?.name}</p>
          <p className="text-xs text-text-secondary capitalize">{user?.role} • {user?.department || 'Org'}</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold border-2 border-white shadow-sm">
          {user?.name?.charAt(0) || 'U'}
        </div>
        <button 
          onClick={logout}
          className="ml-2 text-sm text-text-secondary hover:text-danger transition-colors font-medium"
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export const Layout = ({ children }) => {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <Header />
        <main className="main-content animate-fade-in bg-bg-primary">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
