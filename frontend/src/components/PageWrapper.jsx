import React from "react";

// Wrap any page in this for the premium staggered reveal animation
// Usage: <PageWrapper>...your content...</PageWrapper>
function PageWrapper({ children, className }) {
  return (
    <div
      className={"page-fade " + (className || "")}
      style={{ animation: "pageFade 0.3s ease both" }}
    >
      {children}
    </div>
  );
}

// Individual staggered item — wraps cards/sections for cascade effect
// Usage: <StaggerItem delay={1}>...card...</StaggerItem>
export function StaggerItem({ children, delay, style }) {
  var delays = { 1: "0.05s", 2: "0.10s", 3: "0.15s", 4: "0.20s", 5: "0.25s", 6: "0.30s" };
  return (
    <div
      style={{
        animation: "revealUp 0.4s cubic-bezier(0.16,1,0.3,1) " + (delays[delay] || "0.05s") + " both",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// Glowing section label — replaces plain .section-title
export function SectionLabel({ children, style }) {
  return (
    <div style={{
      fontFamily: "'Syne',sans-serif",
      fontSize: "10px",
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: "0.14em",
      color: "var(--muted)",
      marginBottom: "12px",
      ...style,
    }}>
      {children}
    </div>
  );
}

// Premium stat pill — for use in any page
export function StatPill({ icon, value, label, color, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "14px 10px", borderRadius: "14px",
        background: "var(--grad-card)",
        border: "1px solid var(--glass-border)",
        boxShadow: "var(--glow-card)",
        flex: 1, minWidth: "72px", gap: "4px",
        transition: "all 0.22s ease",
        cursor: onClick ? "pointer" : "default",
        position: "relative", overflow: "hidden",
      }}
      onMouseEnter={function(e) {
        e.currentTarget.style.borderColor = color || "rgba(124,92,252,0.3)";
        e.currentTarget.style.transform = "translateY(-3px) scale(1.02)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.3), 0 0 20px " + (color || "rgba(124,92,252,0.15)");
      }}
      onMouseLeave={function(e) {
        e.currentTarget.style.borderColor = "var(--glass-border)";
        e.currentTarget.style.transform = "translateY(0) scale(1)";
        e.currentTarget.style.boxShadow = "var(--glow-card)";
      }}
    >
      <div style={{ fontSize: "18px" }}>{icon}</div>
      <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: "900", fontSize: "20px", color: color || "var(--accent)" }}>{value}</div>
      <div style={{ fontSize: "9px", color: "var(--muted)", textAlign: "center", lineHeight: "1.3", letterSpacing: "0.04em" }}>{label}</div>
    </div>
  );
}

// Glowing card wrapper — use for highlighted cards
export function GlowCard({ children, color, style, onClick }) {
  var c = color || "rgba(124,92,252,0.12)";
  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--grad-card)",
        border: "1px solid var(--glass-border)",
        borderRadius: "16px",
        padding: "18px 20px",
        boxShadow: "var(--glow-card)",
        transition: "all 0.22s ease",
        position: "relative",
        overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
      onMouseEnter={function(e) {
        if (!onClick) return;
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "var(--glow-card), 0 0 24px " + c;
        e.currentTarget.style.borderColor = c.replace("0.12", "0.35");
      }}
      onMouseLeave={function(e) {
        if (!onClick) return;
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "var(--glow-card)";
        e.currentTarget.style.borderColor = "var(--glass-border)";
      }}
    >
      {children}
    </div>
  );
}

export default PageWrapper;

