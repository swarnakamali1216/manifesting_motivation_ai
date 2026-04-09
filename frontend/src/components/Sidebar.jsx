import React from "react";

// ── Butterfly logo SVG ────────────────────────────────────────────────────
function ButterflyLogo({ size }) {
  var s = size || 28;
  return (
    <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 20 C16 14,6 10,4 16 C2 22,10 26,20 20Z"   fill="url(#bl1)" opacity="0.92"/>
      <path d="M20 20 C24 14,34 10,36 16 C38 22,30 26,20 20Z" fill="url(#bl2)" opacity="0.92"/>
      <path d="M20 20 C15 24,6 26,5 32 C4 36,12 36,20 20Z"   fill="url(#bl3)" opacity="0.82"/>
      <path d="M20 20 C25 24,34 26,35 32 C36 36,28 36,20 20Z" fill="url(#bl4)" opacity="0.82"/>
      <ellipse cx="20" cy="20" rx="1.4" ry="6.5" fill="#7c5cfc"/>
      <line x1="20" y1="14" x2="15" y2="8" stroke="#7c5cfc" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="20" y1="14" x2="25" y2="8" stroke="#7c5cfc" strokeWidth="1.2" strokeLinecap="round"/>
      <circle cx="15" cy="8" r="1.3" fill="#fc5cf0"/>
      <circle cx="25" cy="8" r="1.3" fill="#fc5cf0"/>
      <defs>
        <linearGradient id="bl1" x1="4"  y1="10" x2="20" y2="26" gradientUnits="userSpaceOnUse"><stop stopColor="#7c5cfc"/><stop offset="1" stopColor="#c4b5fd"/></linearGradient>
        <linearGradient id="bl2" x1="36" y1="10" x2="20" y2="26" gradientUnits="userSpaceOnUse"><stop stopColor="#fc5cf0"/><stop offset="1" stopColor="#7c5cfc"/></linearGradient>
        <linearGradient id="bl3" x1="5"  y1="26" x2="20" y2="36" gradientUnits="userSpaceOnUse"><stop stopColor="#a78bfa"/><stop offset="1" stopColor="#7c5cfc"/></linearGradient>
        <linearGradient id="bl4" x1="35" y1="26" x2="20" y2="36" gradientUnits="userSpaceOnUse"><stop stopColor="#fc5cf0"/><stop offset="1" stopColor="#a78bfa"/></linearGradient>
      </defs>
    </svg>
  );
}

// ── Nav icons ─────────────────────────────────────────────────────────────
var ICONS = {
  home:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  goals:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  journal:  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>,
  story:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
  history:  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  badges:   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>,
  settings: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  admin:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  logout:   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
};

var MENU = [
  { id:"home",       label:"Home",        icon:"home"    },
  { id:"goals",      label:"My Goals",    icon:"goals"   },
  { id:"journal",    label:"My Journal",  icon:"journal" },
  { id:"my-story",   label:"My Story",    icon:"story"   },
  { id:"ai-history", label:"AI History",  icon:"history" },
  { id:"badges",     label:"Badges & XP", icon:"badges"  },
];

function NavBtn({ label, icon, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      width:"100%", padding:"9px 13px", margin:"1px 0",
      borderRadius:8, border:"none",
      background: active ? "rgba(124,92,252,0.1)" : "transparent",
      color: active ? "#7c5cfc" : "var(--text2,#6b6b7e)",
      fontSize:13, fontFamily:"'DM Sans',sans-serif",
      fontWeight: active ? 600 : 500,
      cursor:"pointer", display:"flex", alignItems:"center", gap:10,
      transition:"all 0.15s", textAlign:"left",
      WebkitTapHighlightColor:"transparent",
    }}
    onMouseEnter={function(e){
      if(!active){e.currentTarget.style.background="rgba(124,92,252,0.06)";e.currentTarget.style.color="var(--text,#1a1a2e)";}
    }}
    onMouseLeave={function(e){
      if(!active){e.currentTarget.style.background="transparent";e.currentTarget.style.color="var(--text2,#6b6b7e)";}
    }}>
      <span style={{opacity:active?1:0.6,flexShrink:0,display:"flex"}}>{ICONS[icon]}</span>
      <span style={{flex:1}}>{label}</span>
      {active && <span style={{width:5,height:5,borderRadius:"50%",background:"#7c5cfc",flexShrink:0}}/>}
    </button>
  );
}

// ── Notification Bell ─────────────────────────────────────────────────────
export function NotificationBell({ userId, onNavigate }) {
  var [notes, setNotes] = React.useState([]);
  var [open,  setOpen]  = React.useState(false);

  React.useEffect(function() {
    if (!userId) return;
    try {
      var stats = JSON.parse(localStorage.getItem("mm_stats_" + userId) || "{}");
      var built = [];
      if (stats.streak >= 7)     built.push({ id:"s7",  icon:"🔥", msg:"7-day streak! You're on fire.",      page:"badges"  });
      if (stats.streak >= 3)     built.push({ id:"s3",  icon:"🔥", msg:"3-day streak — keep it going!",       page:"checkin" });
      if (stats.xp   >= 100)     built.push({ id:"x1",  icon:"⚡", msg:"100 XP earned — check your badges!",  page:"badges"  });
      if (stats.xp   >= 500)     built.push({ id:"x5",  icon:"⚡", msg:"500 XP! You've reached Explorer.",    page:"badges"  });
      if (stats.journals >= 1)   built.push({ id:"j1",  icon:"📔", msg:"Journal entry saved. +15 XP earned!", page:"journal" });
      if (stats.goals_done >= 1) built.push({ id:"g1",  icon:"✅", msg:"Goal completed! Amazing work.",       page:"goals"   });
      var dismissed = JSON.parse(localStorage.getItem("mm_dismissed_" + userId) || "[]");
      setNotes(built.filter(function(n){ return !dismissed.includes(n.id); }).slice(0,5));
    } catch(e) {}
  }, [userId]);

  function dismiss(id) {
    try {
      var dismissed = JSON.parse(localStorage.getItem("mm_dismissed_" + userId) || "[]");
      dismissed.push(id);
      localStorage.setItem("mm_dismissed_" + userId, JSON.stringify(dismissed));
      setNotes(function(prev){ return prev.filter(function(n){ return n.id !== id; }); });
    } catch(e) {}
  }

  function clearAll() {
    try {
      var ids = notes.map(function(n){ return n.id; });
      var dismissed = JSON.parse(localStorage.getItem("mm_dismissed_" + userId) || "[]");
      localStorage.setItem("mm_dismissed_" + userId, JSON.stringify(dismissed.concat(ids)));
      setNotes([]);
      setOpen(false);
    } catch(e) {}
  }

  return (
    <div style={{ position:"relative" }}>
      <button onClick={function(){ setOpen(function(v){ return !v; }); }}
        aria-label="Notifications"
        style={{
          position:"fixed", top:14, right:14, zIndex:500,
          width:40, height:40, borderRadius:10,
          background:"var(--card,#fff)",
          border:"1px solid var(--border,#e5e3f0)",
          boxShadow:"0 2px 10px rgba(0,0,0,0.1)",
          cursor:"pointer", display:"flex",
          alignItems:"center", justifyContent:"center",
          color:"var(--text,#1a1a2e)",
          WebkitTapHighlightColor:"transparent",
        }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {notes.length > 0 && (
          <div style={{
            position:"absolute", top:6, right:6,
            width:16, height:16, borderRadius:"50%",
            background:"#ef4444", color:"#fff",
            fontSize:9, fontWeight:800,
            display:"flex", alignItems:"center", justifyContent:"center",
            border:"2px solid var(--card,#fff)",
          }}>{notes.length}</div>
        )}
      </button>

      {open && notes.length > 0 && (
        <>
          <div onClick={function(){ setOpen(false); }}
            style={{ position:"fixed", inset:0, zIndex:498 }}/>
          <div style={{
            position:"fixed", top:60, right:14, zIndex:499,
            width:280, background:"var(--card,#fff)",
            border:"1px solid var(--border,#e5e3f0)",
            borderRadius:16, boxShadow:"0 8px 32px rgba(0,0,0,0.15)",
            overflow:"hidden",
          }}>
            <div style={{ padding:"12px 16px 8px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid var(--border,#e5e3f0)" }}>
              <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:12, color:"var(--text)" }}>NOTIFICATIONS</span>
              <button onClick={clearAll} style={{ fontSize:10, color:"var(--muted)", background:"none", border:"none", cursor:"pointer", fontWeight:700 }}>Clear all</button>
            </div>
            {notes.map(function(n) {
              return (
                <div key={n.id} style={{ padding:"10px 16px", borderBottom:"1px solid var(--border,#e5e3f0)", display:"flex", alignItems:"flex-start", gap:10 }}>
                  <span style={{ fontSize:18, flexShrink:0, marginTop:1 }}>{n.icon}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, color:"var(--text)", lineHeight:1.5 }}>{n.msg}</div>
                    <button onClick={function(){ if(onNavigate) onNavigate(n.page); dismiss(n.id); setOpen(false); }}
                      style={{ fontSize:10, color:"#7c5cfc", background:"none", border:"none", cursor:"pointer", fontWeight:700, padding:"2px 0" }}>
                      View →
                    </button>
                  </div>
                  <button onClick={function(){ dismiss(n.id); }} style={{ fontSize:14, color:"var(--muted)", background:"none", border:"none", cursor:"pointer", flexShrink:0, lineHeight:1 }}>×</button>
                </div>
              );
            })}
          </div>
        </>
      )}
      {open && notes.length === 0 && (
        <>
          <div onClick={function(){ setOpen(false); }} style={{ position:"fixed", inset:0, zIndex:498 }}/>
          <div style={{
            position:"fixed", top:60, right:14, zIndex:499,
            width:240, background:"var(--card,#fff)",
            border:"1px solid var(--border,#e5e3f0)",
            borderRadius:16, boxShadow:"0 8px 32px rgba(0,0,0,0.15)",
            padding:"20px 16px", textAlign:"center",
          }}>
            <div style={{ fontSize:28, marginBottom:6 }}>🔔</div>
            <div style={{ fontSize:12, color:"var(--muted)" }}>No new notifications</div>
          </div>
        </>
      )}
    </div>
  );
}

// ── HamburgerButton — the ONLY toggle button, shown on mobile ────────────
// FIX: removed the duplicate X button that was inside the sidebar header.
// The hamburger itself switches between ☰ and ✕ icons — no second button needed.
export function HamburgerButton({ isOpen, onClick }) {
  return (
    <button onClick={onClick}
      aria-label={isOpen ? "Close menu" : "Open menu"}
      className="hamburger-btn"
      style={{
        position:"fixed", top:14, left:14, zIndex:500,
        width:40, height:40, borderRadius:10,
        background:"var(--card,#fff)",
        border:"1px solid var(--border,#e5e3f0)",
        boxShadow:"0 2px 10px rgba(0,0,0,0.1)",
        cursor:"pointer", display:"flex",
        alignItems:"center", justifyContent:"center",
        color:"var(--text,#1a1a2e)",
        WebkitTapHighlightColor:"transparent",
        transition:"background 0.15s",
      }}>
      {isOpen ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="3" y1="6"  x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      )}
    </button>
  );
}

// ── Main Sidebar ──────────────────────────────────────────────────────────
// FIX: Removed the duplicate X close button from inside the sidebar header.
// On mobile: only HamburgerButton (above) + overlay tap closes the sidebar.
// On desktop: sidebar is always visible, no close button needed.
function Sidebar({ isOpen, onClose, onNavigate, user, activePage, onLogout }) {

  function nav(id) {
    if (onNavigate) onNavigate(id);
    if (window.innerWidth <= 768 && onClose) onClose();
  }

  var isAdmin = user && (user.role === "admin" || user.is_admin);

  function isActive(id) {
    return activePage === id
      || (id === "home"       && (activePage === "dashboard" || activePage === "home"))
      || (id === "ai-history" && activePage === "history")
      || (id === "my-story"   && (activePage === "mystory" || activePage === "story"));
  }

  return (
    <>
      <style>{`
        .sbwrap {
          position:fixed; left:0; top:0; bottom:0;
          width:230px; height:100vh;
          background:var(--card,#fff);
          border-right:1px solid var(--border,#f0eeff);
          overflow-y:auto; z-index:300;
          display:flex; flex-direction:column;
          transition:transform 0.26s cubic-bezier(.4,0,.2,1);
          will-change:transform;
        }
        @media(min-width:769px){
          .sbwrap { transform:translateX(0) !important; }
          .sb-overlay { display:none !important; }
          .hamburger-btn { display:none !important; }
        }
        @media(max-width:768px){
          .hamburger-btn { display:flex !important; }
          .sbwrap { transform:translateX(-100%); }
          .sbwrap.open { transform:translateX(0); box-shadow:6px 0 24px rgba(0,0,0,.14); }
        }
      `}</style>

      <div className={"sbwrap" + (isOpen ? " open" : "")}>

        {/* LOGO ONLY — no close button inside sidebar */}
        <div style={{ padding:"14px 14px 12px", flexShrink:0 }}>
          <div style={{ cursor:"pointer", display:"flex", alignItems:"center", gap:9 }}
            onClick={function(){ nav("home"); }}>
            <ButterflyLogo size={30}/>
            <div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, lineHeight:1.15 }}>
                <div style={{ fontSize:14, background:"linear-gradient(135deg,#7c5cfc,#9b6ffc)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Manifesting</div>
                <div style={{ fontSize:14, background:"linear-gradient(135deg,#9b6ffc,#fc5cf0)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Motivation</div>
              </div>
              <div style={{ fontSize:9, color:"var(--muted,#9b9bad)", marginTop:1, fontWeight:500, letterSpacing:".03em" }}>AI Coaching Platform</div>
            </div>
          </div>
        </div>

        {/* USER CARD */}
        {user && (
          <div style={{ padding:"0 12px 12px", flexShrink:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 11px", borderRadius:10, background:"rgba(124,92,252,0.05)", border:"1px solid rgba(124,92,252,0.1)" }}>
              <div style={{ width:32, height:32, borderRadius:"50%", background:"linear-gradient(135deg,#7c5cfc,#fc5cf0)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, color:"white", fontWeight:700, flexShrink:0 }}>
                {(user.name||"U").charAt(0).toUpperCase()}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:600, fontSize:13, color:"var(--text,#1a1a2e)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.name||"User"}</div>
                <div style={{ fontSize:10, color:"var(--muted,#9b9bad)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {isAdmin ? "⚡ Admin" : (user.email||"")}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MAIN NAV */}
        <nav style={{ padding:"4px 10px", flex:1 }}>
          {MENU.map(function(item){
            return <NavBtn key={item.id} label={item.label} icon={item.icon}
              active={isActive(item.id)} onClick={function(){ nav(item.id); }}/>;
          })}
        </nav>

        {/* BOTTOM */}
        <div style={{ padding:"4px 10px 14px", flexShrink:0 }}>
          <NavBtn label="Settings" icon="settings"
            active={activePage==="settings"}
            onClick={function(){ nav("settings"); }}/>
          {isAdmin && (
            <NavBtn label="Admin Panel" icon="admin"
              active={activePage==="admin"}
              onClick={function(){ nav("admin"); }}/>
          )}
          {onLogout && (
            <button onClick={onLogout} style={{
              width:"100%", padding:"9px 13px", margin:"3px 0 0", borderRadius:8, border:"none",
              background:"transparent", color:"#f87171", fontSize:13,
              fontFamily:"'DM Sans',sans-serif", fontWeight:500, cursor:"pointer",
              display:"flex", alignItems:"center", gap:10, transition:"all .15s",
              WebkitTapHighlightColor:"transparent",
            }}
            onMouseEnter={function(e){ e.currentTarget.style.background="rgba(248,113,113,0.08)"; }}
            onMouseLeave={function(e){ e.currentTarget.style.background="transparent"; }}>
              <span style={{ opacity:.8, display:"flex" }}>{ICONS.logout}</span>
              <span>Log out</span>
            </button>
          )}
          <div style={{ padding:"10px 4px 0", fontSize:10, color:"var(--muted)", textAlign:"center", lineHeight:1.6 }}>
            v1.0.0 · AI-powered goals &amp; journaling
          </div>
        </div>
      </div>

      {/* OVERLAY — tap outside to close on mobile */}
      {isOpen && (
        <div className="sb-overlay" onClick={onClose}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:299, WebkitTapHighlightColor:"transparent" }}/>
      )}
    </>
  );
}

export default Sidebar;