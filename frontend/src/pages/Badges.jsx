import React, { useState, useEffect } from "react";
import axios from "axios";
import emailjs from "@emailjs/browser";

var API = "https://manifesting-motivation-backend.onrender.com/api";

// ── Safe helpers ──────────────────────────────────────────────────────────────
function safeXP(xp) {
  if (!xp && xp !== 0) return 0;
  if (typeof xp === "number") return xp;
  if (typeof xp === "object") return 0;
  return parseInt(xp, 10) || 0;
}
function safeLevelNum(level) {
  if (!level && level !== 0) return 1;
  if (typeof level === "number") return Math.max(1, level);
  if (typeof level === "object" && level !== null) return level.level || 1;
  return parseInt(level, 10) || 1;
}
function safeLevelName(level) {
  if (typeof level === "object" && level !== null) return level.name || "Seedling";
  return `Level ${level || 1}`;
}
function safeLevelEmoji(level) {
  var defaults = ["🌱","🧭","🎯","⚡","🔥","🏆","⭐","💎","🌟","🚀","🔮","⚔️","👁️","🌀","✨"];
  if (typeof level === "object" && level !== null && level.emoji) return level.emoji;
  var n = safeLevelNum(level);
  return defaults[(n-1) % defaults.length] || "🌱";
}
function safeLevelColor(level) {
  if (typeof level === "object" && level !== null && level.color) return level.color;
  return "#7c5cfc";
}

// ── Category display names ────────────────────────────────────────────────────
var CAT_INFO = {
  all:     { label:"All",      icon:"✨" },
  journey: { label:"Journey",  icon:"💬" },
  streaks: { label:"Streaks",  icon:"🔥" },
  goals:   { label:"Goals",    icon:"🎯" },
  journal: { label:"Journal",  icon:"📓" },
  mood:    { label:"Mood",     icon:"😊" },
  levels:  { label:"XP",       icon:"⚡" },
  social:  { label:"Social",   icon:"🤝" },
  special: { label:"Special",  icon:"🎭" },
};

// ── XP Burst animation ────────────────────────────────────────────────────────
function XPBurst({ xp }) {
  var [show, setShow] = useState(true);
  useEffect(function(){ var t=setTimeout(function(){setShow(false);},2200); return function(){clearTimeout(t);}; },[]);
  if (!show || !xp) return null;
  return (
    <div style={{position:"fixed",top:"20%",left:"50%",transform:"translateX(-50%)",zIndex:9999,pointerEvents:"none",animation:"xpFloat 2.2s ease forwards"}}>
      <div style={{background:"linear-gradient(135deg,#7c5cfc,#fc5cf0)",borderRadius:"28px",padding:"14px 32px",boxShadow:"0 8px 40px rgba(124,92,252,0.5)",display:"flex",alignItems:"center",gap:"10px"}}>
        <span style={{fontSize:"28px"}}>⚡</span>
        <span style={{fontFamily:"'Syne',sans-serif",fontWeight:"900",fontSize:"26px",color:"white"}}>+{xp} XP</span>
      </div>
      <style>{"@keyframes xpFloat{0%{opacity:0;transform:translateX(-50%) translateY(20px) scale(0.7)}25%{opacity:1;transform:translateX(-50%) translateY(-10px) scale(1.05)}80%{opacity:1;transform:translateX(-50%) translateY(-24px) scale(1)}100%{opacity:0;transform:translateX(-50%) translateY(-50px) scale(0.9)}}"}</style>
    </div>
  );
}

// ── Level Path — 15 levels ────────────────────────────────────────────────────
function LevelPath({ levels, currentLevelNum, userXP }) {
  return (
    <div style={{position:"relative",padding:"8px 0 16px"}}>
      <div style={{position:"absolute",left:"50%",top:0,bottom:0,width:"3px",background:"var(--border)",transform:"translateX(-50%)",zIndex:0}}/>
      {(levels||[]).map(function(lv,i){
        var isPast    = currentLevelNum > lv.level;
        var isCurrent = currentLevelNum === lv.level;
        var isFuture  = currentLevelNum < lv.level;
        var side      = i%2===0 ? "left" : "right";
        var col       = lv.color || "#7c5cfc";
        return (
          <div key={lv.level} style={{display:"flex",justifyContent:"center",position:"relative",zIndex:1,marginBottom:"20px"}}>
            {/* Side label */}
            <div style={{position:"absolute",[side==="left"?"right":"left"]:"calc(50% + 42px)",top:"50%",transform:"translateY(-50%)",maxWidth:"110px",textAlign:side==="left"?"right":"left",pointerEvents:"none"}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:"800",fontSize:"12px",color:isFuture?"var(--muted)":col,whiteSpace:"nowrap"}}>{lv.name}</div>
              <div style={{fontSize:"9px",color:"var(--muted)",marginTop:"2px",lineHeight:"1.3"}}>{lv.desc}</div>
              <div style={{fontSize:"9px",color:"var(--muted)",marginTop:"1px"}}>
                {lv.xp_required===0?"Starting":"≥"+lv.xp_required.toLocaleString()+" XP"}
              </div>
            </div>
            {/* Node */}
            <div style={{
              width:isCurrent?"58px":"42px",height:isCurrent?"58px":"42px",
              borderRadius:"50%",
              background:isPast?"linear-gradient(135deg,"+col+","+col+"99)":
                         isCurrent?"linear-gradient(135deg,"+col+","+col+"77)":
                         "var(--bg)",
              border:isCurrent?"3px solid "+col:
                     isPast?"2px solid "+col+"55":
                     "2px dashed var(--border)",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:isCurrent?"26px":"18px",
              boxShadow:isCurrent?"0 0 28px "+col+"55":"none",
              transition:"all 0.3s",
              opacity:isFuture?0.4:1,
              position:"relative",zIndex:2,
            }}>
              {isPast ? "✓" : lv.emoji}
              {isCurrent && (
                <div style={{position:"absolute",top:"-10px",left:"50%",transform:"translateX(-50%)",background:"linear-gradient(90deg,#7c5cfc,#fc5cf0)",borderRadius:"8px",padding:"1px 8px",fontSize:"8px",fontWeight:"800",color:"white",whiteSpace:"nowrap"}}>YOU</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Badge card ────────────────────────────────────────────────────────────────
function BadgeCard({ badge, isNew }) {
  var isEarned = badge.earned;
  return (
    <div style={{
      background:isEarned?"var(--card)":"var(--bg)",
      borderRadius:"18px",
      padding:"18px 12px",
      textAlign:"center",
      border:isNew?"2px solid #fbbf24":
             isEarned?"1px solid rgba(124,92,252,0.4)":
             "1px dashed rgba(148,163,184,0.25)",
      opacity:isEarned?1:0.45,
      boxShadow:isNew?"0 0 24px rgba(251,191,36,0.3)":
                isEarned?"0 4px 16px rgba(124,92,252,0.12)":
                "none",
      transition:"all 0.25s",
      position:"relative",
      overflow:"hidden",
      cursor:isEarned?"pointer":"default",
    }}
      onMouseEnter={function(e){ if(isEarned) e.currentTarget.style.transform="translateY(-4px) scale(1.02)"; }}
      onMouseLeave={function(e){ e.currentTarget.style.transform="translateY(0) scale(1)"; }}
    >
      {/* Glow layer for earned badges */}
      {isEarned && (
        <div style={{position:"absolute",inset:0,borderRadius:"18px",background:"linear-gradient(135deg,rgba(124,92,252,0.06),rgba(252,92,240,0.04))",pointerEvents:"none"}}/>
      )}

      {isNew && (
        <div style={{position:"absolute",top:"8px",right:"8px",background:"#fbbf24",borderRadius:"6px",padding:"2px 6px",fontSize:"8px",fontWeight:"900",color:"#000",letterSpacing:"0.05em"}}>NEW!</div>
      )}
      {!isEarned && (
        <div style={{position:"absolute",top:"8px",right:"8px",fontSize:"13px"}}>🔒</div>
      )}

      <div style={{fontSize:isEarned?"34px":"26px",marginBottom:"8px",filter:isEarned?"none":"grayscale(1)",transition:"font-size 0.2s"}}>{badge.emoji}</div>
      <div style={{fontFamily:"'Syne',sans-serif",fontWeight:"800",fontSize:"11px",color:isEarned?"var(--text)":"var(--muted)",marginBottom:"4px",lineHeight:"1.3"}}>{badge.name}</div>
      <div style={{fontSize:"9px",color:"var(--muted)",lineHeight:"1.4",marginBottom:"6px"}}>{badge.desc}</div>

      {/* Requirement pill */}
      {badge.req && (
        <div style={{fontSize:"8px",color:isEarned?"var(--accent)":"var(--muted)",background:isEarned?"rgba(124,92,252,0.1)":"transparent",border:isEarned?"1px solid rgba(124,92,252,0.25)":"none",borderRadius:"8px",padding:isEarned?"2px 6px":"0",marginBottom:"4px",display:"inline-block"}}>{badge.req}</div>
      )}

      {badge.xp > 0 && (
        <div style={{fontSize:"10px",fontWeight:"800",color:isEarned?"#a78bfa":"var(--muted)"}}>{isEarned?"+":""}+{badge.xp} XP</div>
      )}
      {isEarned && (
        <div style={{marginTop:"6px",fontSize:"9px",fontWeight:"800",color:"#4ade80",letterSpacing:"0.05em"}}>✓ EARNED</div>
      )}
    </div>
  );
}

// ── Invite panel — REAL email sending ─────────────────────────────────────────
function InvitePanel({ user }) {
  var [email,   setEmail]   = useState("");
  var [sending, setSending] = useState(false);
  var [result,  setResult]  = useState(null);
  var [link,    setLink]    = useState("");
  var [copied,  setCopied]  = useState(false);
  var [istats,  setIStats]  = useState({ total_invited:0, joined:0, xp_earned:0 });

  var inviteLink = link || (window.location.origin + "?ref=" + (user?.id || ""));

  useEffect(function() {
    if (!user?.id) return;
    // Get real invite link from backend
    axios.get(API+"/invite/link/"+user.id)
      .then(function(r){ setLink(r.data.link||""); })
      .catch(function(){});
    // Get invite stats
    axios.get(API+"/invite/stats/"+user.id)
      .then(function(r){ setIStats(r.data||{}); })
      .catch(function(){});
  }, [user]);

  function copyLink() {
    navigator.clipboard.writeText(inviteLink).then(function(){
      setCopied(true);
      setTimeout(function(){ setCopied(false); }, 2500);
    }).catch(function(){});
  }

  // ── Email sending via EmailJS (no backend needed) ──────────────────────────
  function sendInviteEmail(e) {
    if (e && e.preventDefault) e.preventDefault();
    var trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setResult({ success:false, message:"Please enter a valid email address." });
      return;
    }
    setSending(true);
    setResult(null);

    var serviceId  = process.env.REACT_APP_EMAILJS_SERVICE_ID;
    var templateId = process.env.REACT_APP_EMAILJS_TEMPLATE_ID;
    var publicKey  = process.env.REACT_APP_EMAILJS_PUBLIC_KEY;

    emailjs.send(
      serviceId,
      templateId,
      {
        sender_name: user && user.name ? user.name : "A friend",
        invite_url:  inviteLink,
        to_email:    trimmed,
      },
      publicKey
    )
    .then(function() {
      setResult({
        success: true,
        message: "Invite sent to " + trimmed + "! You will earn +50 XP when they join.",
        email_sent: true,
      });
      setEmail("");
      // Refresh invite stats
      axios.get(API+"/invite/stats/"+user.id).then(function(r){ setIStats(r.data||{}); }).catch(function(){});
    })
    .catch(function(err) {
      console.error("[EmailJS] Error:", err);
      setResult({
        success: false,
        message: "Failed to send: " + (err && err.text ? err.text : "Check EmailJS dashboard"),
      });
    })
    .finally(function(){ setSending(false); });
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>

      {/* Stats row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:"8px"}}>
        {[
          {label:"Invited",   value:istats.total_invited||0, icon:"✉️",color:"#7c5cfc"},
          {label:"Joined",    value:istats.joined||0,         icon:"👥",color:"#4ade80"},
          {label:"XP Earned", value:(istats.xp_earned||0)+" XP",icon:"⚡",color:"#fbbf24"},
        ].map(function(s){ return (
          <div key={s.label} style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:"14px",padding:"14px 10px",textAlign:"center"}}>
            <div style={{fontSize:"20px",marginBottom:"4px"}}>{s.icon}</div>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:"900",fontSize:"clamp(16px,4vw,22px)",color:s.color}}>{s.value}</div>
            <div style={{fontSize:"9px",color:"var(--muted)",marginTop:"2px"}}>{s.label}</div>
          </div>
        ); })}
      </div>

      {/* Rewards */}
      <div style={{background:"rgba(74,222,128,0.07)",border:"1px solid rgba(74,222,128,0.2)",borderRadius:"14px",padding:"16px 18px"}}>
        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:"800",fontSize:"11px",color:"#4ade80",letterSpacing:"0.12em",marginBottom:"10px"}}>🎁 INVITE REWARDS</div>
        {["You earn +50 XP when a friend signs up","Your friend gets +25 XP welcome bonus","Compete on the leaderboard together","Track each other's streaks"].map(function(txt,i){
          return <div key={i} style={{display:"flex",gap:"8px",marginBottom:"7px"}}><span style={{color:"#4ade80",fontWeight:"700",flexShrink:0}}>✓</span><span style={{fontSize:"12px",color:"var(--text)"}}>{txt}</span></div>;
        })}
      </div>

      {/* Copy link */}
      <div>
        <div style={{fontSize:"10px",fontWeight:"800",color:"var(--muted)",letterSpacing:"0.12em",marginBottom:"8px",fontFamily:"'Syne',sans-serif"}}>YOUR INVITE LINK</div>
        <div style={{display:"flex",gap:"8px"}}>
          <div style={{flex:1,padding:"10px 14px",borderRadius:"12px",background:"var(--bg)",border:"1px solid var(--border)",fontSize:"11px",color:"var(--muted)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"monospace"}}>{inviteLink}</div>
          <button onClick={copyLink} style={{padding:"10px 18px",borderRadius:"12px",background:copied?"rgba(74,222,128,0.15)":"rgba(124,92,252,0.12)",border:copied?"1px solid rgba(74,222,128,0.4)":"1px solid rgba(124,92,252,0.3)",color:copied?"#4ade80":"var(--accent)",fontSize:"12px",fontWeight:"800",cursor:"pointer",fontFamily:"'Syne',sans-serif",whiteSpace:"nowrap",transition:"all 0.2s",flexShrink:0}}>
            {copied?"✓ Copied!":"Copy"}
          </button>
        </div>
      </div>

      {/* Email invite — REAL sending */}
      <div>
        <div style={{fontSize:"10px",fontWeight:"800",color:"var(--muted)",letterSpacing:"0.12em",marginBottom:"8px",fontFamily:"'Syne',sans-serif"}}>INVITE BY EMAIL</div>

        <form onSubmit={sendInviteEmail} style={{display:"flex",gap:"8px"}}>
          <input
            type="email"
            value={email}
            onChange={function(e){ setEmail(e.target.value); setResult(null); }}
            placeholder="friend@email.com"
            disabled={sending}
            style={{flex:1,padding:"11px 14px",borderRadius:"12px",border:"1px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:"14px",fontFamily:"'DM Sans',sans-serif",outline:"none"}}
          />
          <button type="submit" disabled={sending||!email.trim()} style={{padding:"11px 20px",borderRadius:"12px",border:"none",background:(!sending&&email.trim())?"linear-gradient(135deg,#7c5cfc,#fc5cf0)":"rgba(124,92,252,0.25)",color:"#fff",fontSize:"13px",fontWeight:"800",cursor:(!sending&&email.trim())?"pointer":"not-allowed",fontFamily:"'Syne',sans-serif",flexShrink:0,transition:"all 0.2s",opacity:(!sending&&email.trim())?1:0.6}}>
            {sending?"Sending...":"Send →"}
          </button>
        </form>

        {/* Result message */}
        {result && (
          <div style={{marginTop:"10px",padding:"12px 16px",borderRadius:"12px",background:result.success?"rgba(74,222,128,0.08)":"rgba(248,113,113,0.08)",border:"1px solid "+(result.success?"rgba(74,222,128,0.3)":"rgba(248,113,113,0.3)"),fontSize:"12px",color:result.success?"#16a34a":"#dc2626",lineHeight:"1.6"}}>
            {result.success?"✅ ":"❌ "}{result.message}
            {result.link && !result.email_sent && (
              <div style={{marginTop:"6px"}}>
                <span style={{color:"var(--muted)"}}>Share: </span>
                <a href={result.link} style={{color:"#7c5cfc",fontSize:"11px",wordBreak:"break-all"}}>{result.link}</a>
              </div>
            )}
            {result.success && !result.email_sent && (
              <div style={{marginTop:"8px",padding:"8px 12px",borderRadius:"8px",background:"rgba(251,191,36,0.1)",border:"1px solid rgba(251,191,36,0.3)",color:"#b45309",fontSize:"11px"}}>
                💡 Email not sending? Open <code style={{fontSize:"10px"}}>localhost:5000/api/invite/test-smtp</code> to diagnose
              </div>
            )}
          </div>
        )}
      </div>

      {/* Share buttons */}
      <div>
        <div style={{fontSize:"10px",fontWeight:"800",color:"var(--muted)",letterSpacing:"0.12em",marginBottom:"8px",fontFamily:"'Syne',sans-serif"}}>SHARE ON</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
          <a href={"https://wa.me/?text="+encodeURIComponent("Hey! I'm using Manifesting Motivation — AI coaching with real goals and gamification. Join me! "+inviteLink)} target="_blank" rel="noreferrer"
            style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"7px",padding:"12px",borderRadius:"12px",background:"rgba(37,211,102,0.1)",border:"1px solid rgba(37,211,102,0.3)",color:"#128c7e",fontSize:"13px",fontWeight:"700",textDecoration:"none",transition:"transform 0.2s"}}
            onMouseEnter={function(e){e.currentTarget.style.transform="translateY(-2px)";}} onMouseLeave={function(e){e.currentTarget.style.transform="translateY(0)";}}>
            💬 WhatsApp
          </a>
          <a href={"https://www.linkedin.com/sharing/share-offsite/?url="+encodeURIComponent(inviteLink)} target="_blank" rel="noreferrer"
            style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"7px",padding:"12px",borderRadius:"12px",background:"rgba(10,102,194,0.1)",border:"1px solid rgba(10,102,194,0.3)",color:"#0a66c2",fontSize:"13px",fontWeight:"700",textDecoration:"none",transition:"transform 0.2s"}}
            onMouseEnter={function(e){e.currentTarget.style.transform="translateY(-2px)";}} onMouseLeave={function(e){e.currentTarget.style.transform="translateY(0)";}}>
            💼 LinkedIn
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Main Badges component ─────────────────────────────────────────────────────
function Badges({ user }) {
  var userId = user?.id;
  var [stats,     setStats]     = useState(null);
  var [loading,   setLoading]   = useState(true);
  var [tab,       setTab]       = useState("progress");
  var [catFilter, setCatFilter] = useState("all");
  var [xpBurst,   setXpBurst]   = useState(null);

  useEffect(function(){
    if (!userId) return;
    setLoading(true);
    axios.get(API+"/gamification/stats/"+userId)
      .then(function(r){
        setStats(r.data);
        var n = r.data?.newly_awarded || [];
        if (n.length > 0 && n[0].xp > 0) setXpBurst(n[0].xp);
      })
      .catch(function(){ setStats(null); })
      .finally(function(){ setLoading(false); });
  }, [userId]);

  if (loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"60vh",flexDirection:"column",gap:"16px"}}>
      <div style={{width:"40px",height:"40px",borderRadius:"50%",border:"3px solid var(--border)",borderTopColor:"var(--accent)",animation:"spin 0.8s linear infinite"}}/>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
      <div style={{color:"var(--muted)",fontSize:"13px"}}>Loading achievements...</div>
    </div>
  );

  // ── Safe extraction ───────────────────────────────────────────────────────
  var xp          = safeXP(stats?.xp);
  var levelNum    = safeLevelNum(stats?.level);
  var levelName   = safeLevelName(stats?.level);
  var levelEmoji  = safeLevelEmoji(stats?.level);
  var levelColor  = safeLevelColor(stats?.level);
  var streak      = stats?.streak || 0;
  var nextXP      = stats?.xp_to_next || 0;
  var progressPct = stats?.progress_pct || 0;
  var nextLevel   = stats?.next_level || null;
  var levels      = stats?.levels || [];
  var allBadges   = stats?.badges || [];
  var badgesTotal = stats?.badges_total || 50;
  var newlyAwarded= stats?.newly_awarded || [];
  var newIds      = newlyAwarded.map(function(b){ return b.id; });
  var badgesEarned= allBadges.filter(function(b){ return b.earned; }).length;

  var filteredBadges = catFilter==="all"
    ? allBadges
    : allBadges.filter(function(b){ return b.category===catFilter; });

  var TABS = [
    {id:"progress",    label:"My Journey", icon:"⚡"},
    {id:"badges",      label:"Badges ("+badgesTotal+")", icon:"🏅"},
    {id:"leaderboard", label:"Rankings",   icon:"🏆"},
    {id:"invite",      label:"Invite",     icon:"🎁"},
  ];

  return (
    <div style={{animation:"fadeIn 0.3s ease",paddingBottom:"32px"}}>
      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
      `}</style>
      {xpBurst && <XPBurst xp={xpBurst}/>}

      {/* Page header */}
      <div style={{marginBottom:"22px"}}>
        <h1 style={{fontFamily:"'Syne',sans-serif",fontWeight:"900",fontSize:"28px",background:"linear-gradient(135deg,#e8e0ff 30%,#9b8aff)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:"4px",letterSpacing:"-0.5px"}}>Achievements</h1>
        <p style={{color:"var(--muted)",fontSize:"13px"}}>Your XP, {badgesTotal} badges, {levels.length} levels — earn them all</p>
      </div>

      {/* ── LEVEL BANNER ── */}
      <div style={{borderRadius:"24px",padding:"22px 24px",marginBottom:"16px",background:"linear-gradient(135deg,"+levelColor+"18,"+levelColor+"06)",border:"1px solid "+levelColor+"30",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:"-50px",right:"-50px",width:"160px",height:"160px",borderRadius:"50%",background:levelColor+"20",filter:"blur(40px)",pointerEvents:"none"}}/>

        <div style={{display:"flex",alignItems:"center",gap:"18px"}}>
          <div style={{width:"68px",height:"68px",borderRadius:"50%",background:"linear-gradient(135deg,"+levelColor+","+levelColor+"99)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"30px",boxShadow:"0 0 30px "+levelColor+"50",flexShrink:0}}>
            {levelEmoji}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:"10px",fontWeight:"800",color:"var(--muted)",letterSpacing:"0.12em",marginBottom:"3px",fontFamily:"'Syne',sans-serif"}}>LEVEL {levelNum}</div>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:"900",fontSize:"22px",color:levelColor,marginBottom:"2px",lineHeight:1}}>{levelName}</div>
            <div style={{fontSize:"11px",color:"var(--muted)"}}>
              {nextLevel ? `${nextXP.toLocaleString()} XP to ${nextLevel.name}` : "Max level reached!"}
            </div>
          </div>
          <div style={{textAlign:"center",flexShrink:0}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:"900",fontSize:"clamp(20px,4vw,30px)",background:"linear-gradient(135deg,#7c5cfc,#fc5cf0)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1}}>{xp.toLocaleString()}</div>
            <div style={{fontSize:"9px",color:"var(--muted)",marginTop:"2px"}}>XP TOTAL</div>
          </div>
        </div>

        {/* XP progress bar */}
        <div style={{marginTop:"16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
            <span style={{fontSize:"10px",color:"var(--muted)",fontFamily:"'Syne',sans-serif",fontWeight:"700"}}>
              TO {nextLevel?nextLevel.name.toUpperCase():"MAX LEVEL"}
            </span>
            <span style={{fontSize:"10px",fontWeight:"800",color:levelColor}}>{progressPct.toFixed(0)}%</span>
          </div>
          <div style={{height:"10px",borderRadius:"5px",background:"var(--border)",overflow:"hidden"}}>
            <div style={{height:"100%",width:Math.min(100,progressPct)+"%",background:"linear-gradient(90deg,"+levelColor+","+levelColor+"aa)",borderRadius:"5px",transition:"width 1.2s ease"}}/>
          </div>
        </div>

        {/* Mini stats */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:"8px",marginTop:"16px"}}>
          {[
            {e:"🔥",v:streak+"d",            l:"Streak"},
            {e:"🏅",v:badgesEarned+"/"+badgesTotal,l:"Badges"},
            {e:"✅",v:stats?.goals_done||0,  l:"Goals"},
            {e:"📓",v:stats?.journals||0,    l:"Journals"},
          ].map(function(s){ return (
            <div key={s.l} style={{background:"rgba(0,0,0,0.12)",borderRadius:"12px",padding:"10px 6px",textAlign:"center"}}>
              <div style={{fontSize:"15px"}}>{s.e}</div>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:"900",fontSize:"clamp(12px,3vw,16px)",color:"var(--text)",marginTop:"4px"}}>{s.v}</div>
              <div style={{fontSize:"9px",color:"var(--muted)",marginTop:"2px"}}>{s.l}</div>
            </div>
          ); })}
        </div>
      </div>

      {/* Newly earned notification */}
      {newlyAwarded.length > 0 && (
        <div style={{padding:"14px 18px",borderRadius:"14px",marginBottom:"16px",background:"rgba(251,191,36,0.08)",border:"1px solid rgba(251,191,36,0.3)",display:"flex",alignItems:"flex-start",gap:"12px"}}>
          <span style={{fontSize:"22px",flexShrink:0}}>🎉</span>
          <div>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:"800",fontSize:"13px",color:"#fbbf24",marginBottom:"4px"}}>
              {newlyAwarded.length} new badge{newlyAwarded.length>1?"s":""} unlocked!
            </div>
            <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
              {newlyAwarded.map(function(b){ return (
                <span key={b.id} style={{fontSize:"12px",color:"var(--text)"}}>{b.emoji} {b.name}</span>
              ); })}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{display:"flex",gap:"2px",borderBottom:"1px solid var(--border)",marginBottom:"22px",overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
        {TABS.map(function(t){
          return (
            <button key={t.id} onClick={function(){setTab(t.id);}} style={{padding:"9px 13px",border:"none",background:"transparent",cursor:"pointer",fontFamily:"'Syne',sans-serif",fontWeight:"700",fontSize:"12px",color:tab===t.id?"var(--accent)":"var(--muted)",borderBottom:tab===t.id?"2px solid var(--accent)":"2px solid transparent",marginBottom:"-1px",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:"5px",transition:"all 0.15s"}}>
              {t.icon} {t.label}
            </button>
          );
        })}
      </div>

      {/* ── JOURNEY TAB ── */}
      {tab==="progress" && (
        <div>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:"11px",fontWeight:"800",color:"var(--muted)",letterSpacing:"0.12em",marginBottom:"16px"}}>YOUR LEVEL JOURNEY — {levels.length} LEVELS TOTAL</div>

          <LevelPath levels={levels} currentLevelNum={levelNum} userXP={xp} />

          {/* How to earn XP */}
          <div style={{background:"var(--card)",borderRadius:"20px",padding:"18px 20px",border:"1px solid var(--border)",marginTop:"16px"}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:"11px",fontWeight:"800",color:"var(--muted)",letterSpacing:"0.12em",marginBottom:"14px"}}>HOW TO EARN XP</div>
            {[
              {a:"Daily AI coaching session", r:"+10 XP",  i:"💬"},
              {a:"Complete a goal step",       r:"+15 XP",  i:"✅"},
              {a:"Write a journal entry",      r:"+15 XP",  i:"📓"},
              {a:"Daily check-in",             r:"+5 XP",   i:"☀️"},
              {a:"Complete a full goal",       r:"+50 XP",  i:"🎯"},
              {a:"7-day streak bonus",         r:"+70 XP",  i:"🔥"},
              {a:"30-day streak bonus",        r:"+300 XP", i:"🏆"},
              {a:"Earn a badge",               r:"+10–1000",i:"🏅"},
              {a:"Invite a friend who joins",  r:"+50 XP",  i:"🎁"},
            ].map(function(r,i){
              return (
                <div key={i} style={{display:"flex",alignItems:"center",gap:"12px",padding:"10px 0",borderBottom:i<8?"1px solid var(--border)":"none"}}>
                  <span style={{fontSize:"18px",width:"24px",textAlign:"center",flexShrink:0}}>{r.i}</span>
                  <span style={{flex:1,fontSize:"12px",color:"var(--text)"}}>{r.a}</span>
                  <span style={{fontSize:"11px",color:"#a78bfa",fontWeight:"800",flexShrink:0}}>{r.r}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── BADGES TAB ── */}
      {tab==="badges" && (
        <div>
          {/* Category filter pills */}
          <div style={{display:"flex",gap:"6px",flexWrap:"wrap",marginBottom:"16px"}}>
            {Object.entries(CAT_INFO).map(function(entry){
              var k = entry[0]; var v = entry[1];
              var count = k==="all"
                ? allBadges.length
                : allBadges.filter(function(b){ return b.category===k; }).length;
              var earnedInCat = k==="all"
                ? badgesEarned
                : allBadges.filter(function(b){ return b.category===k && b.earned; }).length;
              return (
                <button key={k} onClick={function(){setCatFilter(k);}} style={{
                  padding:"6px 12px",borderRadius:"20px",cursor:"pointer",
                  border:catFilter===k?"2px solid var(--accent)":"1px solid var(--border)",
                  background:catFilter===k?"rgba(124,92,252,0.1)":"transparent",
                  color:catFilter===k?"var(--accent)":"var(--muted)",
                  fontSize:"11px",fontFamily:"'Syne',sans-serif",fontWeight:"700",
                  transition:"all 0.15s",display:"flex",alignItems:"center",gap:"4px",
                }}>
                  {v.icon} {v.label}
                  <span style={{fontSize:"9px",opacity:0.7}}>({earnedInCat}/{count})</span>
                </button>
              );
            })}
          </div>

          {/* Overall progress */}
          <div style={{background:"var(--card)",borderRadius:"14px",padding:"14px 18px",border:"1px solid var(--border)",marginBottom:"16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}>
              <span style={{fontSize:"12px",fontWeight:"700",color:"var(--text)"}}>🏅 Total collection</span>
              <span style={{fontSize:"12px",color:"#fbbf24",fontWeight:"800"}}>{badgesEarned}/{badgesTotal}</span>
            </div>
            <div style={{height:"8px",borderRadius:"4px",background:"var(--border)",overflow:"hidden"}}>
              <div style={{height:"100%",width:Math.round((badgesEarned/Math.max(1,badgesTotal))*100)+"%",background:"linear-gradient(90deg,#fbbf24,#f97316)",borderRadius:"4px",transition:"width 1s ease"}}/>
            </div>
            <div style={{fontSize:"10px",color:"var(--muted)",marginTop:"5px"}}>{badgesTotal-badgesEarned} badges remaining — keep going!</div>
          </div>

          {/* Badge grid — 3 columns */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:"10px"}}>
            {filteredBadges.map(function(badge){
              return <BadgeCard key={badge.id||badge.key} badge={badge} isNew={newIds.includes(badge.id)} />;
            })}
          </div>
        </div>
      )}

      {/* ── RANKINGS TAB ── */}
      {tab==="leaderboard" && <LeaderboardSection userId={userId} />}

      {/* ── INVITE TAB ── */}
      {tab==="invite" && (
        <div>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:"11px",fontWeight:"800",color:"var(--muted)",letterSpacing:"0.12em",marginBottom:"16px"}}>INVITE FRIENDS</div>
          <InvitePanel user={user} />
        </div>
      )}
    </div>
  );
}

// ── Leaderboard section ───────────────────────────────────────────────────────
function LeaderboardSection({ userId }) {
  var [board,   setBoard]   = useState([]);
  var [loading, setLoading] = useState(true);

  useEffect(function(){
    axios.get(API+"/gamification/leaderboard")
      .then(function(r){ setBoard(r.data||[]); })
      .catch(function(){})
      .finally(function(){ setLoading(false); });
  }, []);

  if (loading) return <div style={{textAlign:"center",padding:"40px",color:"var(--muted)"}}>Loading rankings...</div>;

  if (board.length===0) return (
    <div style={{textAlign:"center",padding:"40px 20px",background:"var(--card)",borderRadius:"20px",border:"1px solid var(--border)"}}>
      <div style={{fontSize:"40px",marginBottom:"12px"}}>🏆</div>
      <div style={{fontFamily:"'Syne',sans-serif",fontWeight:"800",fontSize:"16px",color:"var(--text)",marginBottom:"6px"}}>Be the first on the board!</div>
      <div style={{color:"var(--muted)",fontSize:"12px"}}>Invite friends to compete.</div>
    </div>
  );

  var MEDALS = ["🥇","🥈","🥉"];

  return (
    <div>
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:"11px",fontWeight:"800",color:"var(--muted)",letterSpacing:"0.12em",marginBottom:"16px"}}>TOP MEMBERS</div>
      <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
        {board.map(function(u,i){
          var isMe = String(u.id)===String(userId);
          var col  = safeLevelColor(u.level);
          return (
            <div key={u.id} style={{display:"flex",alignItems:"center",gap:"12px",padding:"14px 16px",borderRadius:"16px",background:isMe?"linear-gradient(135deg,rgba(124,92,252,0.12),rgba(252,92,240,0.06))":i===0?"linear-gradient(135deg,rgba(251,191,36,0.08),rgba(251,191,36,0.02))":"var(--card)",border:isMe?"1px solid rgba(124,92,252,0.3)":i===0?"1px solid rgba(251,191,36,0.3)":"1px solid var(--border)"}}>
              <div style={{width:"28px",textAlign:"center",flexShrink:0}}>
                {MEDALS[i]?<span style={{fontSize:"20px"}}>{MEDALS[i]}</span>:<span style={{fontFamily:"'Syne',sans-serif",fontWeight:"800",fontSize:"13px",color:"var(--muted)"}}>#{i+1}</span>}
              </div>
              <div style={{width:"38px",height:"38px",borderRadius:"50%",background:"linear-gradient(135deg,"+col+","+col+"88)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Syne',sans-serif",fontWeight:"800",color:"white",fontSize:"16px",flexShrink:0}}>
                {(u.name||"U").charAt(0).toUpperCase()}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                  <span style={{fontFamily:"'Syne',sans-serif",fontWeight:"700",fontSize:"13px",color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.name}</span>
                  {isMe&&<span style={{fontSize:"9px",padding:"1px 7px",borderRadius:"8px",background:"rgba(124,92,252,0.15)",color:"var(--accent)",fontWeight:"800",flexShrink:0}}>YOU</span>}
                </div>
                <div style={{display:"flex",gap:"8px",marginTop:"3px"}}>
                  <span style={{fontSize:"10px",color:col}}>{safeLevelEmoji(u.level)} {safeLevelName(u.level)}</span>
                  {u.streak>0&&<span style={{fontSize:"10px",color:"#fbbf24"}}>🔥 {u.streak}d</span>}
                  {u.badge_count>0&&<span style={{fontSize:"10px",color:"#a78bfa"}}>🏅 {u.badge_count}</span>}
                </div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:"900",fontSize:"16px",color:i===0?"#fbbf24":isMe?"var(--accent)":"var(--text)"}}>{(u.xp||0).toLocaleString()}</div>
                <div style={{fontSize:"9px",color:"var(--muted)"}}>XP</div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{marginTop:"14px",padding:"12px 16px",borderRadius:"12px",background:"rgba(124,92,252,0.05)",border:"1px solid rgba(124,92,252,0.15)",fontSize:"11px",color:"var(--muted)",textAlign:"center"}}>
        Invite friends to grow the leaderboard 🎯
      </div>
    </div>
  );
}

export default Badges;

