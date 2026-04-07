

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
// Suppress non-critical browser warnings
const originalWarn = console.warn;
const originalError = console.error;

console.warn = (...args) => {
  const message = args[0]?.toString?.() || '';
  if (
    message.includes('React Router Future Flag') ||
    message.includes('[GSI_LOGGER]') ||
    message.includes('Cross-Origin-Opener-Policy') ||
    message.includes('Violation') ||
    message.includes('DeprecationWarning')
  ) {
    return;
  }
  originalWarn(...args);
};

console.error = (...args) => {
  const message = args[0]?.toString?.() || '';
  if (
    message.includes('Cross-Origin-Opener-Policy') ||
    message.includes('[GSI_LOGGER]') ||
    message.includes('Failed to load resource')
  ) {
    return;
  }
  originalError(...args);
};
