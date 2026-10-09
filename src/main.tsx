import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.js';
import './index.css';

const root = document.getElementById('root') as HTMLElement;
try {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (err: any) {
  console.error('Fatal: React failed to mount', err);
  root.innerHTML = `<div style="max-width:540px;margin:60px auto;padding:24px;background:#fff;border-radius:10px;font-family:system-ui;border-left:4px solid #dc2626">
    <h2 style="margin:0 0 12px;color:#172033">Unable to load form</h2>
    <p style="color:#5b6b82">A startup error occurred. Please clear your browser data for this site and try again.</p>
    <pre style="background:#f8fafc;padding:12px;border-radius:6px;font-size:12px;overflow-x:auto;color:#dc2626;white-space:pre-wrap">${err?.message || err}</pre>
  </div>`;
}
