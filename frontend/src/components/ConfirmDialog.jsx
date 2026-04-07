import React from "react";

function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel, confirmLabel = "Delete", danger = true }) {
  if (!isOpen) return null;
  return (
    <>
      {/* Backdrop */}
      <div onClick={onCancel} style={{
        position:"fixed", inset:0,
        background:"rgba(0,0,0,0.6)",
        zIndex:998, backdropFilter:"blur(2px)"
      }} />

      {/* Dialog */}
      <div style={{
        position:"fixed", top:"50%", left:"50%",
        transform:"translate(-50%,-50%)",
        zIndex:999, width:"100%", maxWidth:"380px",
        padding:"0 16px", boxSizing:"border-box"
      }}>
        <div style={{
          background:"var(--surface)",
          border:"1px solid var(--border)",
          borderRadius:"16px", padding:"28px",
          boxShadow:"0 16px 48px rgba(0,0,0,0.3)"
        }}>
          {/* Icon */}
          <div style={{
            width:"44px", height:"44px", borderRadius:"12px", marginBottom:"16px",
            background: danger ? "rgba(248,113,113,0.12)" : "rgba(124,92,252,0.12)",
            border: `1px solid ${danger ? "rgba(248,113,113,0.3)" : "rgba(124,92,252,0.3)"}`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:"20px"
          }}>
            {danger ? "⚠" : "?"}
          </div>

          <div style={{
            fontFamily:"'Syne',sans-serif", fontWeight:"700",
            fontSize:"17px", color:"var(--text)", marginBottom:"8px"
          }}>{title}</div>

          <p style={{
            color:"var(--muted)", fontSize:"14px",
            lineHeight:"1.6", marginBottom:"24px"
          }}>{message}</p>

          <div style={{display:"flex", gap:"10px"}}>
            <button onClick={onCancel} style={{
              flex:1, padding:"11px", border:"1px solid var(--border)",
              borderRadius:"10px", background:"transparent",
              color:"var(--text)", cursor:"pointer",
              fontFamily:"'DM Sans',sans-serif", fontSize:"14px",
              fontWeight:"600"
            }}>Cancel</button>
            <button onClick={onConfirm} style={{
              flex:1, padding:"11px", border:"none",
              borderRadius:"10px", cursor:"pointer",
              fontFamily:"'DM Sans',sans-serif", fontSize:"14px",
              fontWeight:"600", color:"white",
              background: danger
                ? "linear-gradient(135deg,#f87171,#ef4444)"
                : "linear-gradient(135deg,#7c5cfc,#fc5cf0)"
            }}>{confirmLabel}</button>
          </div>
        </div>
      </div>
    </>
  );
}

export default ConfirmDialog;
