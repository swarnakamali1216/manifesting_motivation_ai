/**
 * InviteTab.jsx — Redesigned with butterfly logo + animated header
 * Place at: frontend/src/components/InviteTab.jsx  (or pages/Badges.jsx import)
 */
import React, { useState } from "react";

var API = "https://manifesting-motivation-backend.onrender.com/api";

// ── Butterfly SVG ────────────────────────────────────────────────────────────
function ButterflyLogo({ size }) {
  var s = size || 40;
  return (
    <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 20 C16 14,6 10,4 16 C2 22,10 26,20 20Z"   fill="url(#ibl1)" opacity="0.93"/>
      <path d="M20 20 C24 14,34 10,36 16 C38 22,30 26,20 20Z" fill="url(#ibl2)" opacity="0.93"/>
      <path d="M20 20 C15 24,6 26,5 32 C4 36,12 36,20 20Z"   fill="url(#ibl3)" opacity="0.85"/>
      <path d="M20 20 C25 24,34 26,35 32 C36 36,28 36,20 20Z" fill="url(#ibl4)" opacity="0.85"/>
      <ellipse cx="20" cy="20" rx="1.3" ry="6" fill="white" opacity="0.9"/>
      <line x1="20" y1="15" x2="16" y2="9" stroke="white" strokeWidth="1.1" strokeLinecap="round" opacity="0.85"/>
      <line x1="20" y1="15" x2="24" y2="9" stroke="white" strokeWidth="1.1" strokeLinecap="round" opacity="0.85"/>
      <circle cx="16" cy="9" r="1.2" fill="white" opacity="0.9"/>
      <circle cx="24" cy="9" r="1.2" fill="white" opacity="0.9"/>
      <defs>
        <linearGradient id="ibl1" x1="4"  y1="10" x2="20" y2="26" gradientUnits="userSpaceOnUse"><stop stopColor="#c4b5fd"/><stop offset="1" stopColor="#e9d5ff"/></linearGradient>
        <linearGradient id="ibl2" x1="36" y1="10" x2="20" y2="26" gradientUnits="userSpaceOnUse"><stop stopColor="#fce7f3"/><stop offset="1" stopColor="#c4b5fd"/></linearGradient>
        <linearGradient id="ibl3" x1="5"  y1="26" x2="20" y2="36" gradientUnits="userSpaceOnUse"><stop stopColor="#ddd6fe"/><stop offset="1" stopColor="#7c5cfc"/></linearGradient>
        <linearGradient id="ibl4" x1="35" y1="26" x2="20" y2="36" gradientUnits="userSpaceOnUse"><stop stopColor="#fc5cf0"/><stop offset="1" stopColor="#a78bfa"/></linearGradient>
      </defs>
    </svg>
  );
}

// ── Mini floating butterflies ────────────────────────────────────────────────
function FloatingButterflies() {
  var items = [
    { top:"8%",  left:"6%",  size:16, delay:"0s",    dur:"4.2s" },
    { top:"15%", right:"8%", size:12, delay:"0.8s",  dur:"5.1s" },
    { top:"55%", left:"3%",  size:10, delay:"1.6s",  dur:"3.8s" },
    { top:"70%", right:"5%", size:14, delay:"0.4s",  dur:"4.6s" },
  ];
  return (
    <>
      {items.map(function(it, i) {
        var style = {
          position:"absolute", top:it.top, left:it.left, right:it.right,
          opacity:0.18, animation:"floatUp "+it.dur+" ease-in-out infinite",
          animationDelay:it.delay, pointerEvents:"none",
        };
        return <div key={i} style={style}><ButterflyLogo size={it.size}/></div>;
      })}
    </>
  );
}

function InviteTab({ user }) {
  var [friendEmail, setFriendEmail] = useState("");
  var [sending,     setSending]     = useState(false);
  var [result,      setResult]      = useState(null);
  var [copied,      setCopied]      = useState(false);

  var inviteLink = window.location.origin + "?ref=" + (user?.id || "");

  function copyLink() {
    navigator.clipboard.writeText(inviteLink)
      .then(function() { setCopied(true); setTimeout(function(){ setCopied(false); }, 2200); })
      .catch(function() {
        var el = document.createElement("textarea");
        el.value = inviteLink;
        document.body.appendChild(el); el.select();
        document.execCommand("copy"); document.body.removeChild(el);
        setCopied(true); setTimeout(function(){ setCopied(false); }, 2200);
      });
  }

  function sendEmail() {
    var trimmed = friendEmail.trim();
    if (!trimmed || !trimmed.includes("@")) {
      setResult({ ok:false, msg:"Please enter a valid email address" });
      return;
    }
    setSending(true); setResult(null);
    fetch(API + "/invite/email", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ to_email:trimmed, user_id:user?.id }),
    })
      .then(function(r){ return r.json(); })
      .then(function(data) {
        if (data.success) {
          setResult({ ok:true, msg:"✅ Invite sent to "+trimmed+" — they'll see it in their inbox!" });
          setFriendEmail("");
        } else {
          setResult({ ok:false, msg:"❌ "+(data.error||"Failed to send") });
        }
      })
      .catch(function() {
        setResult({ ok:false, msg:"❌ Flask not running. Start with: python app.py" });
      })
      .finally(function(){ setSending(false); });
  }

  return (
    <div style={{ padding:"4px 0" }}>
      <style>{`
        @keyframes floatUp {
          0%,100% { transform:translateY(0) rotate(-8deg); }
          50%      { transform:translateY(-10px) rotate(8deg); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        .inv-input:focus { border-color:rgba(124,92,252,0.5)!important; outline:none!important; box-shadow:0 0 0 3px rgba(124,92,252,0.08)!important; }
        .inv-btn:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 6px 20px rgba(124,92,252,0.35)!important; }
        .social-btn:hover { transform:translateY(-2px); }
      `}</style>

      {/* ── HERO HEADER ── */}
      <div style={{
        position:"relative", overflow:"hidden",
        borderRadius:20, marginBottom:20,
        background:"linear-gradient(135deg,#7c5cfc 0%,#a855f7 50%,#ec4899 100%)",
        padding:"28px 24px 24px",
      }}>
        <FloatingButterflies/>

        {/* Butterfly + title */}
        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:12, position:"relative", zIndex:1 }}>
          <div style={{
            width:56, height:56, borderRadius:16,
            background:"rgba(255,255,255,0.15)",
            backdropFilter:"blur(8px)",
            display:"flex", alignItems:"center", justifyContent:"center",
            border:"1.5px solid rgba(255,255,255,0.25)",
            boxShadow:"0 4px 16px rgba(0,0,0,0.15)",
          }}>
            <ButterflyLogo size={34}/>
          </div>
          <div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:20, color:"white", lineHeight:1.15 }}>
              Invite Friends
            </div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.8)", marginTop:3 }}>
              Share the journey · Earn rewards together
            </div>
          </div>
        </div>

        {/* Reward pills */}
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", position:"relative", zIndex:1 }}>
          {[["🦋","You get +50 XP"],["🎁","Friend gets +25 XP"],["🏆","Climb ranks together"]].map(function(r,i){
            return (
              <div key={i} style={{
                padding:"5px 12px", borderRadius:20,
                background:"rgba(255,255,255,0.15)",
                backdropFilter:"blur(4px)",
                border:"1px solid rgba(255,255,255,0.2)",
                fontSize:11, color:"white", fontWeight:700,
                display:"flex", alignItems:"center", gap:5,
              }}>
                <span>{r[0]}</span><span>{r[1]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SENDER INFO ── */}
      <div style={{
        padding:"12px 16px", borderRadius:14,
        background:"rgba(124,92,252,0.06)",
        border:"1px solid rgba(124,92,252,0.18)",
        marginBottom:18,
        display:"flex", alignItems:"center", gap:12,
      }}>
        <div style={{
          width:38, height:38, borderRadius:"50%", flexShrink:0,
          background:"linear-gradient(135deg,#7c5cfc,#fc5cf0)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:16, fontWeight:900, color:"white",
        }}>
          {(user?.name||"U")[0].toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:"var(--text)" }}>
            Inviting as <span style={{ color:"#7c5cfc" }}>{user?.name||"you"}</span>
          </div>
          <div style={{ fontSize:11, color:"var(--muted)", marginTop:2 }}>
            FROM: {user?.email||"your email"} → TO: your friend's inbox
          </div>
        </div>
        <div style={{ marginLeft:"auto", flexShrink:0 }}>
          <ButterflyLogo size={22}/>
        </div>
      </div>

      {/* ── INVITE LINK ── */}
      <div style={{ fontSize:10, fontFamily:"'Syne',sans-serif", fontWeight:800, color:"var(--muted)", letterSpacing:"0.1em", marginBottom:8 }}>
        YOUR INVITE LINK
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:20 }}>
        <input readOnly value={inviteLink} className="inv-input"
          style={{
            flex:1, padding:"11px 14px", borderRadius:12,
            border:"1.5px solid var(--border)",
            background:"var(--bg)", color:"var(--muted)",
            fontSize:11, fontFamily:"'DM Sans',sans-serif",
            transition:"border-color 0.2s",
          }}/>
        <button onClick={copyLink} className="inv-btn"
          style={{
            padding:"11px 18px", borderRadius:12, cursor:"pointer",
            background: copied ? "rgba(74,222,128,0.15)" : "linear-gradient(135deg,#7c5cfc,#9c7cfc)",
            border: copied ? "1px solid rgba(74,222,128,0.4)" : "1px solid transparent",
            color: copied ? "#4ade80" : "white",
            fontSize:13, fontWeight:800,
            fontFamily:"'Syne',sans-serif",
            transition:"all 0.2s", whiteSpace:"nowrap",
          }}>
          {copied ? "Copied ✓" : "Copy 🔗"}
        </button>
      </div>

      {/* ── EMAIL INVITE ── */}
      <div style={{ fontSize:10, fontFamily:"'Syne',sans-serif", fontWeight:800, color:"var(--muted)", letterSpacing:"0.1em", marginBottom:8 }}>
        INVITE BY EMAIL
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:10 }}>
        <input
          type="email"
          placeholder="friend@gmail.com"
          value={friendEmail}
          onChange={function(e){ setFriendEmail(e.target.value); setResult(null); }}
          onKeyDown={function(e){ if(e.key==="Enter") sendEmail(); }}
          disabled={sending}
          className="inv-input"
          style={{
            flex:1, padding:"11px 14px", borderRadius:12,
            border:"1.5px solid var(--border)",
            background:"var(--card)", color:"var(--text)",
            fontSize:13, fontFamily:"'DM Sans',sans-serif",
            transition:"border-color 0.2s, box-shadow 0.2s",
          }}/>
        <button onClick={sendEmail} disabled={sending} className="inv-btn"
          style={{
            padding:"11px 22px", borderRadius:12, border:"none", cursor:sending?"not-allowed":"pointer",
            background: sending ? "rgba(124,92,252,0.35)" : "linear-gradient(135deg,#7c5cfc,#9c7cfc)",
            color:"white", fontSize:13, fontWeight:800,
            fontFamily:"'Syne',sans-serif",
            transition:"all 0.2s", whiteSpace:"nowrap",
          }}>
          {sending ? "Sending…" : "Send 🦋"}
        </button>
      </div>

      {/* Status message */}
      {result && (
        <div style={{
          padding:"10px 14px", borderRadius:10, marginBottom:16,
          fontSize:13, fontWeight:600, lineHeight:1.5,
          background: result.ok ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)",
          border: "1px solid "+(result.ok ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"),
          color: result.ok ? "#4ade80" : "#f87171",
        }}>
          {result.msg}
        </div>
      )}

      {/* ── SHARE ON ── */}
      <div style={{ fontSize:10, fontFamily:"'Syne',sans-serif", fontWeight:800, color:"var(--muted)", letterSpacing:"0.1em", marginBottom:10 }}>
        SHARE ON
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:18 }}>
        <button className="social-btn"
          onClick={function(){
            window.open("https://wa.me/?text="+encodeURIComponent("Hey! I'm growing with Manifesting Motivation AI 🦋 Join me: "+inviteLink),"_blank");
          }}
          style={{
            padding:"13px", borderRadius:12, cursor:"pointer", fontWeight:700, fontSize:13,
            background:"rgba(37,162,68,0.08)", border:"1.5px solid rgba(37,162,68,0.22)",
            color:"#25a244", transition:"all 0.18s",
          }}>
          💬 WhatsApp
        </button>
        <button className="social-btn"
          onClick={function(){
            window.open("https://www.linkedin.com/sharing/share-offsite/?url="+encodeURIComponent(inviteLink),"_blank");
          }}
          style={{
            padding:"13px", borderRadius:12, cursor:"pointer", fontWeight:700, fontSize:13,
            background:"rgba(10,102,194,0.08)", border:"1.5px solid rgba(10,102,194,0.22)",
            color:"#0a66c2", transition:"all 0.18s",
          }}>
          💼 LinkedIn
        </button>
      </div>

      {/* ── HOW IT WORKS ── */}
      <div style={{
        padding:"14px 16px", borderRadius:14,
        background:"var(--bg)", border:"1px solid var(--border)",
        fontSize:12, color:"var(--muted)", lineHeight:2,
      }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:11, color:"var(--text)", marginBottom:8, letterSpacing:"0.08em" }}>
          🦋 HOW IT WORKS
        </div>
        <div>📤 <strong style={{ color:"var(--text)" }}>You</strong> type their email above</div>
        <div>📬 <strong style={{ color:"#7c5cfc" }}>{user?.email||"your email"}</strong> appears as the sender</div>
        <div>🔗 Friend clicks <strong style={{ color:"var(--text)" }}>Join Free</strong> → signs up with your referral</div>
        <div>⚡ <strong style={{ color:"#fbbf24" }}>+50 XP</strong> lands in your account automatically</div>
      </div>
    </div>
  );
}

export default InviteTab;

