import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

type State = { hasError: boolean; message?: string; error?: Error };

export class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: any): State {
    return { hasError: true, message: error?.message || 'Something went wrong.', error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: undefined, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: '#f8fafc' }}>
          <div style={{ maxWidth: 480, width: '100%', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 40, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, background: '#fef2f2', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <AlertTriangle size={32} color="#dc2626" />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>Dashboard Error</h2>
            <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
              {this.state.message || 'An unexpected error occurred. This may be a temporary Firebase connection issue.'}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={this.handleRetry}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
              >
                <RefreshCw size={16} />
                Retry
              </button>
              <a
                href="/"
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: '#fff', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 10, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}
              >
                <Home size={16} />
                Back to Home
              </a>
            </div>
            {this.state.error && process.env.NODE_ENV === 'development' && (
              <pre style={{ marginTop: 24, padding: 16, background: '#f1f5f9', borderRadius: 10, fontSize: 11, textAlign: 'left', overflow: 'auto', maxHeight: 200, color: '#64748b' }}>
                {this.state.error.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children as React.ReactElement;
  }
}

export default ErrorBoundary;
