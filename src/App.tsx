import React, { useEffect } from 'react';
import { ClientIntakeWizard } from './components/ClientIntakeWizard.js';

export const App: React.FC = () => {
  // The form is designed for a single light theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
  }, []);

  return (
    <div className="rk-app">
      <a className="rk-skip-link" href="#rk-main">Skip to the form</a>
      <main className="rk-main" id="rk-main">
        <ClientIntakeWizard />
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
