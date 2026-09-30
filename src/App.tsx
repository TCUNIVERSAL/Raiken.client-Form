import React, { useEffect } from 'react';
import { ClientIntakeWizard } from './components/ClientIntakeWizard.js';

export const App: React.FC = () => {
  // The form is designed for a single light theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
  }, []);

  return (
    <div className="rk-app">
      <header className="rk-header">
        <div className="rk-header-inner">
          <div className="rk-brand">
            <span className="rk-brand-logo" aria-hidden="true">R</span>
            <div className="rk-brand-text">
              <span className="rk-brand-name">Raikan Corporation</span>
              <span className="rk-brand-sub">Client Intake Portal</span>
            </div>
          </div>
          <div className="rk-header-badges">
            <span className="rk-header-badge">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>256-Bit SSL Encrypted</span>
            </span>
          </div>
        </div>
      </header>

      <main className="rk-main">
        <ClientIntakeWizard />
      </main>

      <footer className="rk-footer">
        <div className="rk-footer-inner">
          <p>&copy; {new Date().getFullYear()} Raikan Corporation · Shop 3, 160 Hampstead Road, Broadview SA 5083 · info@rcorpo.com</p>
          <p className="rk-footer-secure">Encrypted client intake & LiveSign verification system</p>
        </div>
      </footer>
    </div>
  );
};
