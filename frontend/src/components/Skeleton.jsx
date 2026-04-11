import React from "react";

// ── Shimmer keyframe injected once ────────────────────────────────────────
var shimmerStyle = `
  @keyframes shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position:  200% 0; }
  }
`;

function injectShimmer() {
  if (typeof document !== "undefined" && !document.getElementById("mm-shimmer")) {
    var s = document.createElement("style");
    s.id = "mm-shimmer";
    s.textContent = shimmerStyle;
    document.head.appendChild(s);
  }
}
injectShimmer();

// ── Base shimmer block ────────────────────────────────────────────────────
export function Skeleton({ width, height, borderRadius, style }) {
  return (
    <div style={{
      width: width || "100%",
      height: height || "16px",
      borderRadius: borderRadius || "6px",
      background: "var(--skeleton-base, rgba(124,92,252,0.06))",
      backgroundImage: "linear-gradient(90deg, var(--skeleton-base, rgba(124,92,252,0.06)) 0%, var(--skeleton-shine, rgba(124,92,252,0.13)) 50%, var(--skeleton-base, rgba(124,92,252,0.06)) 100%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s infinite linear",
      flexShrink: 0,
      ...style,
    }} />
  );
}

// ── Card skeleton ─────────────────────────────────────────────────────────
export function CardSkeleton({ lines }) {
  var n = lines || 3;
  return (
    <div style={{
      background: "var(--card,#fff)",
      border: "1px solid var(--border,#e5e3f0)",
      borderRadius: 16, padding: 20, marginBottom: 14,
    }}>
      <Skeleton height="18px" width="45%" style={{ marginBottom: 16 }} />
      {Array.from({ length: n }).map(function(_, i) {
        return (
          <Skeleton key={i} height="13px"
            width={i === n - 1 ? "55%" : "100%"}
            style={{ marginBottom: i < n - 1 ? 10 : 0 }} />
        );
      })}
    </div>
  );
}

// ── Stats row skeleton ────────────────────────────────────────────────────
export function StatsSkeleton({ count }) {
  var n = count || 4;
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(" + Math.min(n, 4) + ", 1fr)",
      gap: 12, marginBottom: 20,
    }}>
      {Array.from({ length: n }).map(function(_, i) {
        return (
          <div key={i} style={{
            background: "var(--card,#fff)",
            border: "1px solid var(--border,#e5e3f0)",
            borderRadius: 14, padding: "18px 12px", textAlign: "center",
          }}>
            <Skeleton height="28px" width="50%" style={{ margin: "0 auto 10px" }} />
            <Skeleton height="11px" width="70%" style={{ margin: "0 auto" }} />
          </div>
        );
      })}
    </div>
  );
}

// ── List skeleton ─────────────────────────────────────────────────────────
export function ListSkeleton({ count }) {
  var n = count || 4;
  return (
    <div style={{
      background: "var(--card,#fff)",
      border: "1px solid var(--border,#e5e3f0)",
      borderRadius: 14, overflow: "hidden",
    }}>
      {Array.from({ length: n }).map(function(_, i) {
        return (
          <div key={i} style={{
            padding: "14px 18px",
            borderBottom: i < n - 1 ? "1px solid var(--border,#e5e3f0)" : "none",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <Skeleton width="36px" height="36px" borderRadius="10px" />
            <div style={{ flex: 1 }}>
              <Skeleton height="13px" width="55%" style={{ marginBottom: 7 }} />
              <Skeleton height="11px" width="35%" />
            </div>
            <Skeleton height="26px" width="64px" borderRadius="100px" />
          </div>
        );
      })}
    </div>
  );
}

// ── Full dashboard skeleton ───────────────────────────────────────────────
export function DashboardSkeleton() {
  return (
    <div style={{ padding: "28px 32px", maxWidth: 900 }}>
      {/* Header */}
      <Skeleton height="32px" width="220px" style={{ marginBottom: 8 }} />
      <Skeleton height="14px" width="320px" style={{ marginBottom: 28 }} />
      {/* Stats */}
      <StatsSkeleton count={4} />
      {/* Cards */}
      <CardSkeleton lines={4} />
      <CardSkeleton lines={2} />
      <ListSkeleton count={3} />
    </div>
  );
}

// ── Warm-up banner (shown on first load while Render wakes) ──────────────
export function WarmingBanner({ visible }) {
  if (!visible) return null;
  return (
    <div style={{
      position: "fixed", bottom: 20, left: "50%",
      transform: "translateX(-50%)",
      zIndex: 9000,
      background: "var(--card,#fff)",
      border: "1px solid rgba(124,92,252,0.25)",
      borderRadius: 14,
      padding: "12px 20px",
      display: "flex", alignItems: "center", gap: 11,
      boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
      animation: "fadeUp .4s ease",
      whiteSpace: "nowrap",
    }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translate(-50%,12px)}to{opacity:1;transform:translate(-50%,0)}}`}</style>
      <div style={{
        width: 8, height: 8, borderRadius: "50%",
        background: "#fbbf24",
        animation: "pulse 1.2s ease infinite",
      }} />
      <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.3)}}`}</style>
      <span style={{
        fontSize: 13, fontWeight: 600,
        fontFamily: "'DM Sans',sans-serif",
        color: "var(--text,#1a1a2e)",
      }}>
        ✨ Waking up your AI coach… usually takes ~15s
      </span>
    </div>
  );
}

export default Skeleton;