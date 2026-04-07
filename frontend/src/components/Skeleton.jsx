import React from "react";

// Base skeleton shimmer block
export function Skeleton({ width = "100%", height = "16px", borderRadius = "6px", style = {} }) {
  return (
    <div style={{
      width, height, borderRadius,
      background: "var(--skeleton-base)",
      backgroundImage: "linear-gradient(90deg, var(--skeleton-base) 0%, var(--skeleton-shine) 50%, var(--skeleton-base) 100%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s infinite",
      ...style
    }} />
  );
}

// Card skeleton
export function CardSkeleton({ lines = 3 }) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: "12px", padding: "20px", marginBottom: "16px"
    }}>
      <Skeleton height="18px" width="40%" style={{ marginBottom: "16px" }} />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height="13px"
          width={i === lines - 1 ? "60%" : "100%"}
          style={{ marginBottom: "10px" }} />
      ))}
    </div>
  );
}

// Stat row skeleton
export function StatsSkeleton({ count = 4 }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(${Math.min(count, 4)}, 1fr)`,
      gap: "12px", marginBottom: "20px"
    }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "12px", padding: "20px", textAlign: "center"
        }}>
          <Skeleton height="32px" width="60%" style={{ margin: "0 auto 10px" }} />
          <Skeleton height="12px" width="80%" style={{ margin: "0 auto" }} />
        </div>
      ))}
    </div>
  );
}

// List item skeleton
export function ListSkeleton({ count = 4 }) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: "12px", overflow: "hidden"
    }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          padding: "16px 20px",
          borderBottom: i < count - 1 ? "1px solid var(--border)" : "none",
          display: "flex", alignItems: "center", gap: "12px"
        }}>
          <Skeleton width="36px" height="36px" borderRadius="8px" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <Skeleton height="14px" width="50%" style={{ marginBottom: "8px" }} />
            <Skeleton height="12px" width="30%" />
          </div>
          <Skeleton height="28px" width="70px" borderRadius="100px" />
        </div>
      ))}
    </div>
  );
}

// Dashboard skeleton
export function DashboardSkeleton() {
  return (
    <div>
      <Skeleton height="28px" width="200px" style={{ marginBottom: "8px" }} />
      <Skeleton height="14px" width="300px" style={{ marginBottom: "28px" }} />
      <StatsSkeleton count={4} />
      <CardSkeleton lines={4} />
      <CardSkeleton lines={2} />
    </div>
  );
}
