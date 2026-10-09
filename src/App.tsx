import React, { Component, ErrorInfo, ReactNode, useEffect } from 'react';
import { ClientIntakeWizard } from './components/ClientIntakeWizard.js';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class FormErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Client intake form runtime error:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.removeItem('raikan_intake_offline_v1');
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="rk-form" style={{ padding: '2rem 1rem', maxWidth: '640px', margin: '40px auto' }}>
          <div className="rk-panel" style={{ borderLeft: '4px solid #dc2626', background: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
            <h2 style={{ margin: '0 0 12px', color: '#172033', fontSize: '1.25rem' }}>Unable to load form</h2>
            <p style={{ margin: '0 0 16px', color: '#5b6b82', lineHeight: '1.5' }}>
              We encountered an issue loading your intake form session. Please try refreshing the page.
            </p>
            {this.state.error?.message && (
              <pre style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', fontSize: '12px', overflowX: 'auto', color: '#dc2626', marginBottom: '16px' }}>
                {this.state.error.message}
              </pre>
            )}
            <button
              type="button"
              className="rk-btn rk-btn-primary"
              style={{ background: '#1b2f63', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
              onClick={this.handleReset}
            >
              Reload form
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const App: React.FC = () => {
  // The form is designed for a single light theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
  }, []);

  return (
    <div className="rk-app">
      <a className="rk-skip-link" href="#rk-main">Skip to the form</a>
      <main className="rk-main" id="rk-main">
        <FormErrorBoundary>
          <ClientIntakeWizard />
        </FormErrorBoundary>
      </main>

      <footer className="rk-footer">
        <div className="rk-footer-inner">
          <p>Need help? Call <a href="tel:+61870769899">08 7076 9899</a> · Stored privately · ID checks by LiveSign</p>
          <p className="rk-footer-copy">&copy; {new Date().getFullYear()} Raikan Conveyancing</p>
        </div>
      </footer>
    </div>
  );
};
