import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
          color: '#f8fafc',
          fontFamily: "'Outfit', sans-serif",
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div style={{
            maxWidth: '500px',
            backgroundColor: 'rgba(30, 41, 59, 0.7)',
            backdropFilter: 'blur(16px)',
            borderRadius: '1.5rem',
            padding: '3rem 2rem',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              fontSize: '4rem',
              marginBottom: '1rem'
            }}>
              ⚠️
            </div>
            <h2 style={{
              fontSize: '2rem',
              fontWeight: 800,
              marginBottom: '1rem',
              background: 'linear-gradient(to right, #f43f5e, #ec4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Something went wrong
            </h2>
            <p style={{
              color: '#94a3b8',
              fontSize: '0.975rem',
              lineHeight: 1.6,
              marginBottom: '2rem'
            }}>
              {this.state.error?.message || 'An unexpected runtime error has occurred. Please reload the page or try again later.'}
            </p>
            <button 
              onClick={() => window.location.reload()}
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: 'white',
                border: 'none',
                padding: '0.75rem 2rem',
                borderRadius: '0.75rem',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
              }}
            >
              Reload Portal
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
