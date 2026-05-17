import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const Login = () => {
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    if (!result.success) {
      setError(result.error || 'Failed to login');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500/20 blur-[100px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/20 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="card w-full max-w-md relative z-10 animate-fade-in border-t-4 border-t-brand-500">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-gradient text-white text-3xl font-bold shadow-lg shadow-brand-500/30 mb-4">
            A
          </div>
          <h1 className="text-2xl font-bold text-text-primary">AtomQuest Portal</h1>
          <p className="text-text-secondary mt-2">Sign in to manage your goals</p>
        </div>

        {error && (
          <div className="bg-danger-bg border border-danger/30 text-danger px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="input-group">
            <label className="input-label" htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. employee@atomquest.com"
              required
            />
          </div>
          
          <div className="input-group">
            <label className="input-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-full py-3 mt-2"
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-border-color">
          <p className="text-sm text-text-secondary text-center mb-4">Or sign in with SSO</p>
          <button className="btn btn-secondary w-full py-2.5 flex items-center justify-center gap-2">
            <svg viewBox="0 0 21 21" className="w-5 h-5"><path fill="#f25022" d="M1 1h9v9H1z"></path><path fill="#00a4ef" d="M1 11h9v9H1z"></path><path fill="#7fba00" d="M11 1h9v9h-9z"></path><path fill="#ffb900" d="M11 11h9v9h-9z"></path></svg>
            Microsoft Entra ID
          </button>
        </div>
        
        <div className="mt-6 text-xs text-text-secondary text-center">
          <p>Demo Accounts:</p>
          <p>sarah.mehta@atomquest.com (Employee)</p>
          <p>john.dsouza@atomquest.com (Manager)</p>
          <p>Password: Employee@123 / Manager@123</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
