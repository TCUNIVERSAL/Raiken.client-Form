import React, { Component, ErrorInfo, ReactNode, useEffect, useState } from 'react';
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
              className="rk-primary"
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

const SITE_LINKS: Array<[string, string]> = [
  ['Home', 'https://rcorpo.com/'],
  ['Services', 'https://rcorpo.com/'],
  ['Our Team', 'https://rcorpo.com/team/'],
  ['Forms', 'https://rcorpo.com/nc/'],
  ['Software', 'https://accounts.rcorpo.com/login'],
  ['Virtual Meeting', 'https://rcorpo.com/appointment/'],
  ['Information', 'https://rcorpo.com/'],
  ['Contact Us', 'https://rcorpo.com/#contact']
];

/** The rcorpo.com header, kept slim so each form screen fits the window: logo, contacts, and the site menu. */
const SiteHeader: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="rk-site-header">
      <div className="rk-site-top">
        <a href="https://rcorpo.com/" aria-label="Raikan Corporation home">
          <img className="rk-brand-logo" src="/brand/raikan-logo.webp" alt="Raikan Corporation" width={177} height={80} />
        </a>
        <div className="rk-contacts">
          <div className="rk-contact">
            <img src="/brand/icon-phone.webp" alt="" />
            <span><b>Call us</b><a href="tel:0870769899">08 7076 9899</a></span>
          </div>
          <div className="rk-contact rk-contact-mail">
            <img src="/brand/icon-mail.webp" alt="" />
            <span><b>Mail us</b><a href="mailto:info@rcorpo.com">info@rcorpo.com</a></span>
          </div>
          <div className="rk-contact rk-contact-location">
            <img src="/brand/icon-location.webp" alt="" />
            <span><b>Location</b><small>Adelaide | Brisbane | Perth</small></span>
          </div>
          <button className="rk-menu-button" type="button" aria-expanded={menuOpen} aria-controls="rk-site-links" onClick={() => setMenuOpen(o => !o)}>
            Menu
          </button>
        </div>
      </div>
      <div className="rk-site-strip" aria-hidden="true" />
      <nav id="rk-site-links" className={`rk-site-nav${menuOpen ? ' rk-open' : ''}`} aria-label="Raikan website">
        {SITE_LINKS.map(([label, href]) => <a key={label} href={href}>{label}</a>)}
        <a href="https://rcorpo.com/appointment/">Book an appointment</a>
      </nav>
    </header>
  );
};

export const App: React.FC = () => {
  // The form is designed for a single light theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
  }, []);

  return (
    <div className="rk-app">
      <a className="rk-skip-link" href="#rk-main">Skip to the form</a>
      <SiteHeader />
      <main className="rk-main" id="rk-main">
        <FormErrorBoundary>
          <ClientIntakeWizard />
        </FormErrorBoundary>
      </main>
    </div>
  );
};
