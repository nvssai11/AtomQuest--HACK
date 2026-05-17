import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext.jsx';
import { Navigate } from 'react-router-dom';
import { Input, Button } from '../components/primitives';

const PROFILES = [
  {
    name: 'Sarah Mehta',
    title: 'Product Engineer',
    dept: 'Delivery',
    role: 'employee',
    email: 'sarah.mehta@atomquest.com',
    password: 'Employee@123',
    avatar: 'SM',
    badge: 'Employee Access',
    themeColor: '#0066cc',
    themeColorGlow: 'rgba(0, 102, 204, 0.1)',
    avatarGradient: 'linear-gradient(135deg, #0066cc 0%, #004c99 100%)',
  },
  {
    name: "John D'Souza",
    title: 'Engineering Manager',
    dept: 'Operations',
    role: 'manager',
    email: 'john.dsouza@atomquest.com',
    password: 'Manager@123',
    avatar: 'JD',
    badge: 'Manager Reviewer',
    themeColor: '#8b5cf6',
    themeColorGlow: 'rgba(139, 92, 246, 0.1)',
    avatarGradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
  },
  {
    name: 'Maya Iyer',
    title: 'Director of HR',
    dept: 'Administration',
    role: 'admin',
    email: 'maya.iyer@atomquest.com',
    password: 'Admin@123',
    avatar: 'MI',
    badge: 'Directory Admin',
    themeColor: '#10b981',
    themeColorGlow: 'rgba(16, 185, 129, 0.1)',
    avatarGradient: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
  }
];

const Login = () => {
  const { login, isAuthenticated } = useAuth();
  const { notify } = useNotification();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // States: 'select-profile', 'confirm-password', 'custom-login'
  const [step, setStep] = useState('select-profile');
  const [selectedProfile, setSelectedProfile] = useState(null);
  
  const passwordInputRef = useRef(null);

  useEffect(() => {
    if (step === 'confirm-password' && passwordInputRef.current) {
      setTimeout(() => passwordInputRef.current?.focus(), 80);
    }
  }, [step]);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleProfileClick = (profile) => {
    setSelectedProfile(profile);
    setEmail(profile.email);
    setPassword(profile.password);
    setStep('confirm-password');
  };

  const handleBackToProfiles = () => {
    setSelectedProfile(null);
    setEmail('');
    setPassword('');
    setError('');
    setStep('select-profile');
  };

  const handleCustomLoginToggle = () => {
    setSelectedProfile(null);
    setEmail('');
    setPassword('');
    setError('');
    setStep('custom-login');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    if (!result.success) {
      const message = result.error || 'Failed to login';
      setError(message);
      notify.error(message);
      setLoading(false);
    }
  };

  return (
    <div className="corporate-login-wrapper">
      {/* Corporate Canvas & Grid Matrix */}
      <div className="corporate-bg-canvas" />
      <div className="corporate-grid-lines" />
      
      {/* Ambient Glow Orb Elements */}
      <div className="ambient-glow-orb-1" />
      <div className="ambient-glow-orb-2" />

      {/* Corporate Portal Box - Wider for Profile Directory, Sleek/Narrow for Password verification */}
      <div className={`corporate-login-card ${step === 'select-profile' ? '' : 'narrow'}`}>
        
        {/* Step 1: SELECT PROFILE DIRECTORY */}
        {step === 'select-profile' && (
          <div className="animate-fade-in">
            {/* Header */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center gap-3 mb-3">
                <div 
                  className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center font-bold text-lg shadow-lg shadow-brand-500/10"
                  style={{ color: '#ffffff' }}
                >
                  A
                </div>
                <span className="font-extrabold text-2xl tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  AtomQuest
                </span>
              </div>
              <h2 className="text-xl font-extrabold tracking-tight mt-2 mb-1" style={{ color: 'var(--text-primary)' }}>
                Sign in to your account
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Select a profile from corporate directory
              </p>
            </div>

            {/* Account Chooser Directory */}
            <div className="account-chooser-list">
              {PROFILES.map((profile) => (
                <button
                  key={profile.email}
                  type="button"
                  className="account-chooser-row"
                  style={{
                    '--profile-avatar-gradient': profile.avatarGradient,
                    '--profile-theme-color': profile.themeColor,
                  }}
                  onClick={() => handleProfileClick(profile)}
                >
                  <div className="account-row-avatar">
                    {profile.avatar}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)', margin: 0 }}>
                      {profile.name}
                    </h3>
                    <p className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                      {profile.email} • {profile.title}
                    </p>
                  </div>
                  <svg className="account-row-chevron-svg" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
              ))}
            </div>

            {/* SSO & Custom Toggle */}
            <div className="pt-4 border-t border-slate-200 text-center flex flex-col items-center gap-4">
              <button
                type="button"
                className="text-xs transition-colors underline font-semibold"
                style={{
                  background: 'transparent',
                  border: 'none',
                  boxShadow: 'none',
                  outline: 'none',
                  cursor: 'pointer',
                  color: 'var(--brand-500)'
                }}
                onClick={handleCustomLoginToggle}
              >
                Use custom corporate account
              </button>
              
              <div className="w-full">
                <button
                  type="button"
                  className="w-full rounded-xl py-3 flex items-center justify-center gap-2 text-xs font-semibold transition-all shadow-sm"
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: 'var(--text-primary)',
                    cursor: 'pointer'
                  }}
                >
                  <svg viewBox="0 0 21 21" width="16" height="16" style={{ marginRight: '8px', flexShrink: 0 }}><path fill="#f25022" d="M1 1h9v9H1z"></path><path fill="#00a4ef" d="M1 11h9v9H1z"></path><path fill="#7fba00" d="M11 1h9v9h-9z"></path><path fill="#ffb900" d="M11 11h9v9h-9z"></path></svg>
                  Microsoft Entra Single Sign-On
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: CONFIRM PASSWORD (PROFILE SELECTED) */}
        {step === 'confirm-password' && selectedProfile && (
          <div className="animate-fade-in">
            {/* Header / Profile Identity Block */}
            <div className="text-center mb-6">
              <button
                type="button"
                className="text-xs transition-colors mb-6 inline-flex items-center gap-1.5 font-semibold"
                style={{
                  background: 'transparent',
                  border: 'none',
                  boxShadow: 'none',
                  outline: 'none',
                  cursor: 'pointer',
                  color: 'var(--brand-500)'
                }}
                onClick={handleBackToProfiles}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }}><polyline points="15 18 9 12 15 6"></polyline></svg>
                Back to corporate directory
              </button>
              
              <div
                className="profile-avatar-circle mx-auto"
                style={{
                  '--profile-avatar-gradient': selectedProfile.avatarGradient,
                  width: '5rem',
                  height: '5rem',
                  fontSize: '1.5rem',
                  boxShadow: `0 8px 20px -4px ${selectedProfile.themeColorGlow}`,
                  color: '#ffffff'
                }}
              >
                {selectedProfile.avatar}
              </div>
              <h2 className="font-extrabold text-2xl mt-3" style={{ color: 'var(--text-primary)' }}>
                {selectedProfile.name}
              </h2>
              <p className="text-xs font-medium mt-1" style={{ color: 'var(--text-secondary)' }}>
                {selectedProfile.title} • {selectedProfile.dept}
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl mb-4 text-xs">
                ⚠️ {error}
              </div>
            )}

            {/* Quick Authentication Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Password
                </label>
                <input
                  ref={passwordInputRef}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input-field w-full"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                style={{
                  background: `linear-gradient(135deg, ${selectedProfile.themeColor} 0%, ${selectedProfile.themeColor}dd 100%)`,
                  boxShadow: `0 8px 20px -4px ${selectedProfile.themeColorGlow}`,
                  color: '#ffffff'
                }}
                disabled={loading}
              >
                {loading ? 'Authorizing Session...' : 'Launch Workspace'}
              </Button>
            </form>
          </div>
        )}

        {/* Step 3: CUSTOM ENTERPRISE LOGIN FORM */}
        {step === 'custom-login' && (
          <div className="animate-fade-in">
            {/* Header */}
            <div className="text-center mb-6">
              <button
                type="button"
                className="text-xs transition-colors mb-6 inline-flex items-center gap-1.5 font-semibold"
                style={{
                  background: 'transparent',
                  border: 'none',
                  boxShadow: 'none',
                  outline: 'none',
                  cursor: 'pointer',
                  color: 'var(--brand-500)'
                }}
                onClick={handleBackToProfiles}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }}><polyline points="15 18 9 12 15 6"></polyline></svg>
                Back to corporate directory
              </button>
              
              <h2 className="text-2xl font-extrabold tracking-tight mb-1" style={{ color: 'var(--text-primary)' }}>
                Enterprise Login
              </h2>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Authenticate using custom corporate network credentials.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl mb-4 text-xs">
                ⚠️ {error}
              </div>
            )}

            {/* Standard Credentials Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sarah.mehta@atomquest.com"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full mt-6"
                disabled={loading}
              >
                {loading ? 'Authenticating...' : 'Authenticate Credentials'}
              </Button>
            </form>
          </div>
        )}

        {/* Corporate Footer */}
        <div className="mt-8 pt-4 border-t border-slate-100 text-center">
          <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: 'var(--text-secondary)' }}>
            Protected by AtomQuest Identity Services
          </p>
        </div>

      </div>
    </div>
  );
};

export default Login;
