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
        &copy; {new Date().getFullYear()} Raikan Corporation · Shop 3, 160 Hampstead Road, Broadview SA 5083 · info@rcorpo.com
      </footer>
    </div>
  );
};
