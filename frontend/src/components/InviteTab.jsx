import React, { useState } from "react";



function InviteTab({ user }) {
  var [copied, setCopied] = useState(false);

  var refId      = user && user.id ? String(user.id) : "";
  var inviteLink = "https://manifesting-motivation-ai.vercel.app/?ref=" + refId + "&mode=signup";

  function copyLink() {
    navigator.clipboard.writeText(inviteLink)
      .then(function() {
        setCopied(true);
        setTimeout(function() { setCopied(false); }, 2200);
      })
      .catch(function() {
        var el = document.createElement("textarea");
        el.value = inviteLink;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
        setCopied(true);
        setTimeout(function() { setCopied(false); }, 2200);
      });
  }

  return (
    <div style={{ padding: "4px 0" }}>

      {/* HERO */}
      <div style={{
        position: "relative", overflow: "hidden", borderRadius: 20,
        marginBottom: 20,
        background: "linear-gradient(135deg,#7c5cfc 0%,#a855f7 50%,#ec4899 100%)",
        padding: "28px 24px 24px",
      }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontFamily: "sans-serif", fontWeight: 900, fontSize: 20, color: "white" }}>
            Invite Friends
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 3 }}>
            Share the journey — Earn rewards together
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["You get +50 XP", "Friend gets +25 XP", "Climb ranks together"].map(function(r, i) {
            return (
              <div key={i} style={{
                padding: "5px 12px", borderRadius: 20,
                background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.2)",
                fontSize: 11, color: "white", fontWeight: 700,
              }}>
                {r}
              </div>
            );
          })}
        </div>
      </div>

      {/* SENDER INFO */}
      <div style={{
        padding: "12px 16px", borderRadius: 14,
        background: "rgba(124,92,252,0.06)",
        border: "1px solid rgba(124,92,252,0.18)",
        marginBottom: 18, display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: "50%",
          background: "linear-gradient(135deg,#7c5cfc,#fc5cf0)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, fontWeight: 900, color: "white", flexShrink: 0,
        }}>
          {(user && user.name ? user.name : "U")[0].toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>
            Inviting as{" "}
            <span style={{ color: "#7c5cfc" }}>{user && user.name ? user.name : "you"}</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
            Share your link to invite friends
          </div>
        </div>
      </div>

      {/* INVITE LINK */}
      <div style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)", letterSpacing: "0.1em", marginBottom: 8 }}>
        YOUR INVITE LINK
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <input
          readOnly
          value={inviteLink}
          style={{
            flex: 1, padding: "11px 14px", borderRadius: 12,
            border: "1.5px solid var(--border)",
            background: "var(--bg)", color: "var(--muted)", fontSize: 11,
          }}
        />
        <button
          onClick={copyLink}
          style={{
            padding: "11px 18px", borderRadius: 12, cursor: "pointer",
            background: copied ? "rgba(74,222,128,0.15)" : "linear-gradient(135deg,#7c5cfc,#9c7cfc)",
            border: copied ? "1px solid rgba(74,222,128,0.4)" : "1px solid transparent",
            color: copied ? "#4ade80" : "white",
            fontSize: 13, fontWeight: 800, whiteSpace: "nowrap",
          }}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {/* SHARE ON */}
      <div style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)", letterSpacing: "0.1em", marginBottom: 10 }}>
        SHARE ON
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
        <button
          onClick={function() {
            window.open(
              "https://wa.me/?text=" + encodeURIComponent("Join me on Manifesting Motivation AI: " + inviteLink),
              "_blank"
            );
          }}
          style={{
            padding: "13px", borderRadius: 12, cursor: "pointer",
            fontWeight: 700, fontSize: 13,
            background: "rgba(37,162,68,0.08)",
            border: "1.5px solid rgba(37,162,68,0.22)",
            color: "#25a244",
          }}
        >
          WhatsApp
        </button>
        <button
          onClick={function() {
            window.open(
              "https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(inviteLink),
              "_blank"
            );
          }}
          style={{
            padding: "13px", borderRadius: 12, cursor: "pointer",
            fontWeight: 700, fontSize: 13,
            background: "rgba(10,102,194,0.08)",
            border: "1.5px solid rgba(10,102,194,0.22)",
            color: "#0a66c2",
          }}
        >
          LinkedIn
        </button>
      </div>

      {/* HOW IT WORKS */}
      <div style={{
        padding: "14px 16px", borderRadius: 14,
        background: "var(--bg)", border: "1px solid var(--border)",
        fontSize: 12, color: "var(--muted)", lineHeight: 2,
      }}>
        <div style={{ fontWeight: 800, fontSize: 11, color: "var(--text)", marginBottom: 8, letterSpacing: "0.08em" }}>
          HOW IT WORKS
        </div>
        <div>1. Copy your invite link or share via WhatsApp / LinkedIn</div>
        <div>2. Your friend clicks the link and signs up</div>
        <div>3. They join with your referral automatically</div>
        <div>4. You get <span style={{ color: "#4ade80", fontWeight: 700 }}>+50 XP</span> · They get <span style={{ color: "#60a5fa", fontWeight: 700 }}>+25 XP</span> welcome bonus</div>
      </div>

    </div>
  );
}

export default InviteTab;