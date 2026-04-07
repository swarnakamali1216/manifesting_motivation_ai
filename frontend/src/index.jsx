import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// ═══════════════════════════════════════════════════════════════════════════════
// SUPPRESS NON-CRITICAL WARNINGS
// ═══════════════════════════════════════════════════════════════════════════════

const originalError = console.error;
const originalWarn = console.warn;

window.console.error = function(...args) {
  const message = String(args[0] || '');
  
  if (
    message.includes('Failed to load resource') ||
    message.includes('403') ||
    message.includes('[GSI_LOGGER]') ||
    message.includes('Cross-Origin-Opener-Policy') ||
    message.includes('accounts.google.com') ||
    message.includes('postMessage')
  ) {
    return;
  }
  
  originalError.apply(console, args);
};

window.console.warn = function(...args) {
  const message = String(args[0] || '');
  
  if (
    message.includes('React Router Future Flag') ||
    message.includes('[GSI_LOGGER]') ||
    message.includes('Cross-Origin-Opener-Policy') ||
    message.includes('Violation') ||
    message.includes('google.accounts.id.initialize()')
  ) {
    return;
  }
  
  originalWarn.apply(console, args);
};

// ═══════════════════════════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════════════════════════

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);