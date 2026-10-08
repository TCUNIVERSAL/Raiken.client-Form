import React, { useEffect } from 'react';
import { ClientIntakeWizard } from './components/ClientIntakeWizard.js';

export const App: React.FC = () => {
  // The form is designed for a single light theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
  }, []);

  return (
    <div className="rk-app">
      <main className="rk-main">
        <ClientIntakeWizard />
      </main>

      <footer className="rk-footer">
        <div className="rk-footer-inner">
          <p>&copy; {new Date().getFullYear()} Client Intake Portal · All rights reserved</p>
          <p className="rk-footer-secure">Encrypted client intake & identity verification system</p>
        </div>
      </footer>
    </div>
  );
};
