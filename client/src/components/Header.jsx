import React from 'react';
import { useAuth } from '../context/AuthContext';

const Header = () => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 border-b border-border-color bg-bg-secondary flex items-center justify-between px-6 sticky top-0 z-10" style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-glass)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)' }}>
      <h1 className="font-extrabold text-base tracking-tight" style={{ color: 'var(--text-primary)', margin: 0 }}>
        AtomQuest Portal
      </h1>
      
      <div className="flex items-center gap-4 ml-auto">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)', margin: 0 }}>{user?.name}</p>
          <p className="text-xs capitalize" style={{ color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
            {user?.role} • {user?.department || 'Operations'}
          </p>
        </div>
        
        <div 
          className="w-9 h-9 rounded-full bg-brand-gradient flex items-center justify-center font-bold border border-white/10 shadow-sm"
          style={{ color: '#ffffff' }}
        >
          {user?.name?.charAt(0) || 'U'}
        </div>
        
        <button
          onClick={logout}
          className="ml-2 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
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
