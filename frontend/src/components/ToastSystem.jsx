import React, { createContext, useContext, useState, useCallback } from 'react';

var ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  var [toasts, setToasts] = useState([]);

  var removeToast = useCallback(function(id) {
    setToasts(function(prev) {
      return prev.filter(function(t) { return t.id !== id; });
    });
  }, []);

  var addToast = useCallback(function(message, type, duration) {
    var id = Date.now() + Math.random();
    var t  = type || 'info';
    var ms = duration || 3500;
    setToasts(function(prev) {
      return [...prev, { id: id, message: message, type: t }];
    });
    setTimeout(function() { removeToast(id); }, ms);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast: addToast, removeToast: removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, removeToast }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxWidth: '360px',
    }}>
      {toasts.map(function(toast) {
        return (
          <ToastItem
            key={toast.id}
            toast={toast}
            onRemove={function() { removeToast(toast.id); }}
          />
        );
      })}
    </div>
  );
}

function ToastItem({ toast, onRemove }) {
  var colors = {
    success: { bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.35)', text: '#4ade80', icon: '✅' },
    error:   { bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.35)', text: '#f87171', icon: '❌' },
    warning: { bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.35)', text: '#fbbf24', icon: '⚠️' },
    info:    { bg: 'rgba(124,92,252,0.12)', border: 'rgba(124,92,252,0.35)', text: '#a78bfa', icon: 'ℹ️' },
    xp:      { bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.35)', text: '#fbbf24', icon: '⚡' },
    badge:   { bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.35)', text: '#4ade80', icon: '🏅' },
  };

  var c = colors[toast.type] || colors.info;

  return (
    <div style={{
      background: 'var(--card, #1a1635)',
      border: '1px solid ' + c.border,
      borderRadius: '14px',
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
      animation: 'toastIn 0.25s ease',
      backdropFilter: 'blur(8px)',
    }}>
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}`}</style>
      <span style={{ fontSize: '18px', flexShrink: 0 }}>{c.icon}</span>
      <span style={{ flex: 1, fontSize: '13px', color: 'var(--text, #eeeeff)', lineHeight: '1.5' }}>
        {toast.message}
      </span>
      <button
        onClick={onRemove}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted, #8080a8)', fontSize: '16px', padding: '0', lineHeight: 1, flexShrink: 0 }}>
        ×
      </button>
    </div>
  );
}

export default ToastProvider;
