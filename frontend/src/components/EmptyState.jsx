import React from "react";

function EmptyState({ icon, title, description, actionLabel, onAction }) {
  return (
    <div style={{
      textAlign: "center",
      padding: "56px 24px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 0,
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 20,
        background: "rgba(124,92,252,0.08)",
        border: "1px solid rgba(124,92,252,0.18)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 32, marginBottom: 18,
        boxShadow: "0 4px 24px rgba(124,92,252,0.08)",
      }}>
        {icon || "✨"}
      </div>
      <h3 style={{
        fontFamily: "'Syne',sans-serif", fontWeight: 800,
        fontSize: 18, color: "var(--text,#1a1a2e)",
        marginBottom: 8, letterSpacing: "-.3px",
      }}>{title}</h3>
      <p style={{
        color: "var(--muted,#9b9bad)", fontSize: 13,
        lineHeight: 1.7, marginBottom: 22, maxWidth: 280,
      }}>{description}</p>
      {actionLabel && onAction && (
        <button onClick={onAction} style={{
          padding: "11px 26px", borderRadius: 12,
          background: "linear-gradient(135deg,#7c5cfc,#fc5cf0)",
          border: "none", color: "white",
          fontFamily: "'Syne',sans-serif", fontWeight: 700,
          fontSize: 13, cursor: "pointer",
          boxShadow: "0 4px 16px rgba(124,92,252,0.3)",
          transition: "all .18s",
          WebkitTapHighlightColor: "transparent",
        }}
        onMouseEnter={function(e){ e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 8px 24px rgba(124,92,252,0.4)"; }}
        onMouseLeave={function(e){ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 4px 16px rgba(124,92,252,0.3)"; }}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default EmptyState;