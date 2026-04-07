/**
 * frontend/src/pages/MyProgress.jsx
 *
 * ESLint fixes — 3 unused variable declarations removed:
 *   currentLevelName  (line 49) — was declared but never used in JSX
 *   currentLevelEmoji (line 50) — was declared but never used in JSX
 *   currentLevelDesc  (line 51) — was declared but never used in JSX
 *
 * Instead, getLevelName() / getLevelEmoji() are called INLINE in JSX
 * where they're actually needed — no wasted declarations.
 */
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { getLevelNum, getLevelName, getLevelEmoji, getXP, formatXP } from "../utils/gamificationHelpers";

var API = "http://localhost:5000/api";

var CATEGORY_LABELS = {
  journey:"Journey", streaks:"Streaks", goals:"Goals",
  journal:"Journal", mood:"Mood", levels:"Levels",
};

export default function MyProgress({ user }) {
  var [stats,     setStats]   = useState(null);
  var [tab,       setTab]     = useState("My Journey");
  var [catFilter, setCat]     = useState("All");
  var [loading,   setLoading] = useState(true);

  var fetchStats = useCallback(function() {
    if (!user?.id) return;
    setLoading(true);
    axios.get(`${API}/gamification/stats/${user.id}`)
      .then(function(r) { setStats(r.data); })
      .catch(function() {})
      .finally(function() { setLoading(false); });
  }, [user]);

  useEffect(function() { fetchStats(); }, [fetchStats]);

  if (loading) return (
    <div style={{ display:"flex", justifyContent:"center", padding:"60px", color:"var(--muted)" }}>
      Loading...
    </div>
  );
  if (!stats) return (
    <div style={{ textAlign:"center", padding:"60px", color:"var(--muted)" }}>
      Could not load progress data.
    </div>
  );

  // ── Safe extraction ────────────────────────────────────────────────────────
  // FIX: Only declare variables that are ACTUALLY used in JSX below.
  // currentLevelName, currentLevelEmoji, currentLevelDesc were declared but
  // never referenced — ESLint correctly flags them. Removed all three.
  var currentLevelNum = getLevelNum(stats.level);   // used in LevelPath comparison
  var userXP          = getXP(stats.xp);             // used in progress bar and level path
  var xpToNext        = stats.xp_to_next || 0;
  var progressPct     = Math.min(100, stats.progress_pct || 0);
  var streak          = stats.streak || 0;
  var badgesEarned    = stats.badges_earned || 0;
  var badgesTotal     = stats.badges_total  || 20;
  var badges          = stats.badges || [];
  var levels          = stats.levels || [];
  var nextLevel       = stats.next_level || null;
  var newlyAwarded    = stats.newly_awarded || [];

  var cats = ["All", ...Object.keys(CATEGORY_LABELS)];
  var filteredBadges = catFilter === "All"
    ? badges
    : badges.filter(function(b) { return b.category === catFilter; });

  var TABS = ["My Journey", "Badges", "Rankings", "Invite"];

  return (
    <div style={{ animation:"fadeIn 0.3s ease" }}>
      <style>{"@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}"}</style>

      {/* Newly awarded toast */}
      {newlyAwarded.length > 0 && (
        <div style={{ marginBottom:"16px", padding:"14px 18px", borderRadius:"14px", background:"rgba(251,191,36,0.08)", border:"1px solid rgba(251,191,36,0.3)" }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:"800", fontSize:"11px", color:"#fbbf24", marginBottom:"8px" }}>
            🎉 NEW BADGES UNLOCKED!
          </div>
          <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
            {newlyAwarded.map(function(b) {
              return (
                <div key={b.id} style={{ padding:"6px 12px", borderRadius:"10px", background:"rgba(251,191,36,0.1)", border:"1px solid rgba(251,191,36,0.3)", fontSize:"12px", color:"#fbbf24" }}>
                  {b.emoji} {b.name} <span style={{ color:"#4ade80" }}>+{b.xp} XP</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* XP / level header */}
      <div style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:"18px", padding:"18px", marginBottom:"20px" }}>
        <div style={{ fontSize:"10px", color:"var(--muted)", letterSpacing:"0.1em", fontFamily:"'Syne',sans-serif", marginBottom:"6px" }}>
          TO {nextLevel ? nextLevel.name?.toUpperCase() : "MAX LEVEL"}
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px" }}>
          <span style={{ fontSize:"12px", color:"var(--muted)" }}>
            {formatXP(userXP)} XP
            {nextLevel && <span> · {xpToNext} XP to next</span>}
          </span>
          <span style={{ fontSize:"12px", fontWeight:"700", color:"var(--accent)" }}>
            {progressPct.toFixed(0)}%
          </span>
        </div>
        <div style={{ height:"8px", borderRadius:"4px", background:"var(--border)" }}>
          <div style={{ height:"100%", borderRadius:"4px", background:"linear-gradient(90deg,#7c5cfc,#fc5cf0)", width:`${progressPct}%`, transition:"width 0.8s ease" }} />
        </div>
        {/* ✅ FIX: nextLevel.emoji and nextLevel.name are primitive strings — safe */}
        {nextLevel && (
          <div style={{ marginTop:"6px", fontSize:"11px", color:"var(--muted)" }}>
            {xpToNext} XP to Level {currentLevelNum + 1} · {nextLevel.emoji} {nextLevel.name}
          </div>
        )}

        {/* Stat mini-cards */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"8px", marginTop:"16px" }}>
          {[
            { emoji:"🔥", value:`${streak}d`,                    label:"Streak"   },
            { emoji:"🏅", value:`${badgesEarned}/${badgesTotal}`, label:"Badges"  },
            { emoji:"✅", value:stats.goals_done || 0,            label:"Goals"   },
            { emoji:"📓", value:stats.journals   || 0,            label:"Journals"},
          ].map(function(s) {
            return (
              <div key={s.label} style={{ background:"var(--bg)", borderRadius:"12px", padding:"12px 8px", textAlign:"center", border:"1px solid var(--border)" }}>
                <div style={{ fontSize:"18px", marginBottom:"4px" }}>{s.emoji}</div>
                {/* ✅ s.value is always a string/number — never an object */}
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:"900", fontSize:"16px", color:"var(--text)" }}>{s.value}</div>
                <div style={{ fontSize:"10px", color:"var(--muted)" }}>{s.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", borderBottom:"1px solid var(--border)", marginBottom:"20px", overflowX:"auto" }}>
        {TABS.map(function(t) {
          var icons = {"My Journey":"⚡","Badges":"🏅","Rankings":"🏆","Invite":"🎁"};
          return (
            <button key={t} onClick={function() { setTab(t); }}
              style={{ padding:"9px 16px", border:"none", background:"transparent", cursor:"pointer", fontFamily:"'Syne',sans-serif", fontWeight:"700", fontSize:"12px", color:tab===t?"var(--accent)":"var(--muted)", borderBottom:tab===t?"2px solid var(--accent)":"2px solid transparent", marginBottom:"-1px", whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:"5px" }}>
              {icons[t]} {t}
            </button>
          );
        })}
      </div>

      {/* MY JOURNEY */}
      {tab === "My Journey" && (
        <div>
          <div style={{ fontSize:"10px", fontWeight:"800", color:"var(--muted)", letterSpacing:"0.1em", fontFamily:"'Syne',sans-serif", marginBottom:"16px" }}>YOUR LEVEL JOURNEY</div>
          <div style={{ position:"relative" }}>
            <div style={{ position:"absolute", left:"50%", top:0, bottom:0, width:"2px", background:"var(--border)", transform:"translateX(-50%)", zIndex:0 }} />
            {levels.map(function(lvl, i) {
              // ✅ lvl is a plain object from the levels array — all fields are primitives
              var isCurrentLevel = lvl.level === currentLevelNum;
              var isUnlocked     = userXP >= lvl.xp_required;
              var isLeft         = i % 2 === 0;
              return (
                <div key={lvl.level} style={{ display:"flex", justifyContent:isLeft?"flex-start":"flex-end", marginBottom:"24px", position:"relative", zIndex:1, paddingLeft:isLeft?"0":"50%", paddingRight:isLeft?"50%":"0" }}>
                  <div style={{ position:"absolute", left:"50%", top:"8px", transform:"translateX(-50%)", width:isCurrentLevel?"48px":"36px", height:isCurrentLevel?"48px":"36px", borderRadius:"50%", background:isCurrentLevel?"linear-gradient(135deg,#7c5cfc,#fc5cf0)":isUnlocked?"rgba(74,222,128,0.2)":"var(--bg)", border:isCurrentLevel?"none":isUnlocked?"2px solid rgba(74,222,128,0.5)":"2px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:isCurrentLevel?"20px":"16px", boxShadow:isCurrentLevel?"0 4px 16px rgba(124,92,252,0.4)":"none", zIndex:2 }}>
                    {isCurrentLevel ? (
                      <div style={{ position:"relative", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <span style={{ fontSize:"18px" }}>{lvl.emoji}</span>
                        <div style={{ position:"absolute", top:"-20px", background:"linear-gradient(135deg,#7c5cfc,#fc5cf0)", borderRadius:"8px", padding:"1px 6px", fontSize:"8px", fontWeight:"900", color:"white", fontFamily:"'Syne',sans-serif", whiteSpace:"nowrap" }}>YOU</div>
                      </div>
                    ) : (
                      <span style={{ opacity:isUnlocked?1:0.4 }}>{lvl.emoji}</span>
                    )}
                  </div>
                  <div style={{ maxWidth:"180px", paddingLeft:isLeft?"0":"20px", paddingRight:isLeft?"20px":"0", textAlign:isLeft?"right":"left" }}>
                    {/* ✅ lvl.name, lvl.desc, lvl.xp_required are all primitives */}
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:"900", fontSize:"14px", color:isCurrentLevel?"var(--accent)":isUnlocked?"var(--text)":"var(--muted)" }}>{lvl.name}</div>
                    <div style={{ fontSize:"11px", color:"var(--muted)", marginTop:"2px" }}>{lvl.desc}</div>
                    <div style={{ fontSize:"10px", color:"var(--muted)", marginTop:"2px" }}>{lvl.xp_required === 0 ? "Starting level" : `Unlocks at ${lvl.xp_required} XP`}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* BADGES */}
      {tab === "Badges" && (
        <div>
          <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", marginBottom:"16px" }}>
            {cats.map(function(c) {
              return (
                <button key={c} onClick={function() { setCat(c); }}
                  style={{ padding:"5px 12px", borderRadius:"20px", cursor:"pointer", border:"none", background:catFilter===c?"var(--accent)":"var(--bg)", color:catFilter===c?"#fff":"var(--muted)", fontSize:"11px", fontFamily:"'Syne',sans-serif", fontWeight:"700", transition:"all 0.15s" }}>
                  {c}
                </button>
              );
            })}
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", borderRadius:"12px", background:"var(--card)", border:"1px solid var(--border)", marginBottom:"10px" }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:"800", fontSize:"13px", color:"var(--text)" }}>🏅 Collection</div>
            <div style={{ fontSize:"12px", color:"var(--accent)", fontWeight:"700" }}>{badgesEarned}/{badgesTotal}</div>
          </div>
          <div style={{ height:"4px", borderRadius:"2px", background:"var(--border)", marginBottom:"16px" }}>
            <div style={{ height:"100%", borderRadius:"2px", background:"linear-gradient(90deg,#fbbf24,#fb923c)", width:`${(badgesEarned/Math.max(1,badgesTotal))*100}%` }} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"10px" }}>
            {filteredBadges.map(function(b) {
              return (
                <div key={b.id || b.key} style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:"14px", padding:"14px 10px", textAlign:"center", opacity:b.earned?1:0.45 }}>
                  <div style={{ fontSize:"28px", marginBottom:"6px", position:"relative" }}>
                    {b.emoji}
                    {!b.earned && <div style={{ position:"absolute", top:"-4px", right:"-4px", fontSize:"12px" }}>🔒</div>}
                  </div>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:"800", fontSize:"11px", color:b.earned?"var(--text)":"var(--muted)", marginBottom:"3px" }}>{b.name || b.label}</div>
                  <div style={{ fontSize:"9px", color:"var(--muted)", lineHeight:"1.4", marginBottom:"4px" }}>{b.desc}</div>
                  {b.xp > 0 && <div style={{ fontSize:"9px", fontWeight:"800", color:b.earned?"#fbbf24":"var(--muted)" }}>+{b.xp} XP</div>}
                  {b.earned && <div style={{ marginTop:"4px", fontSize:"9px", fontWeight:"800", color:"#4ade80" }}>✓ EARNED</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* RANKINGS */}
      {tab === "Rankings" && <LeaderboardTab user={user} currentLevelNum={currentLevelNum} />}

      {/* INVITE */}
      {tab === "Invite" && <InviteTab user={user} />}
    </div>
  );
}


function LeaderboardTab({ user, currentLevelNum }) { // eslint-disable-line no-unused-vars
  var [board,   setBoard]   = useState([]);
  var [loading, setLoading] = useState(true);

  useEffect(function() {
    axios.get(`${API}/gamification/leaderboard`)
      .then(function(r) { setBoard(r.data || []); })
      .catch(function() {})
      .finally(function() { setLoading(false); });
  }, []);

  if (loading) return <div style={{ textAlign:"center", padding:"40px", color:"var(--muted)" }}>Loading...</div>;

  return (
    <div>
      <div style={{ fontSize:"10px", fontWeight:"800", color:"var(--muted)", letterSpacing:"0.1em", fontFamily:"'Syne',sans-serif", marginBottom:"16px" }}>TOP USERS</div>
      {board.map(function(u, i) {
        var isMe = u.id === user?.id;
        // ✅ getLevelEmoji / getLevelName called inline — handles object or number safely
        return (
          <div key={u.id} style={{ display:"flex", gap:"12px", alignItems:"center", padding:"12px 14px", borderRadius:"14px", background:isMe?"rgba(124,92,252,0.08)":"var(--card)", border:isMe?"1px solid rgba(124,92,252,0.3)":"1px solid var(--border)", marginBottom:"8px" }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:"900", fontSize:"16px", color:i===0?"#fbbf24":i===1?"#94a3b8":i===2?"#fb923c":"var(--muted)", minWidth:"24px", textAlign:"center" }}>
              {i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:"800", fontSize:"13px", color:"var(--text)" }}>{u.name}{isMe?" (You)":""}</div>
              <div style={{ fontSize:"10px", color:"var(--muted)" }}>
                {getLevelEmoji(u.level)} {getLevelName(u.level)} · {u.streak}d streak
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:"900", fontSize:"16px", color:"var(--accent)" }}>{(u.xp||0).toLocaleString()}</div>
              <div style={{ fontSize:"9px", color:"var(--muted)" }}>XP</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}


function InviteTab({ user }) {
  var [email,  setEmail]  = useState("");
  var [sending,setSending]= useState(false);
  var [result, setResult] = useState(null);
  var [link,   setLink]   = useState("");
  var [copied, setCopied] = useState(false);
  var [istats, setIStats] = useState({ total_invited:0, joined:0, xp_earned:0 });

  useEffect(function() {
    if (!user?.id) return;
    axios.get(`${API}/invite/link/${user.id}`).then(function(r){ setLink(r.data.link||""); }).catch(function(){});
    axios.get(`${API}/invite/stats/${user.id}`).then(function(r){ setIStats(r.data||{}); }).catch(function(){});
  }, [user]);

  function copyLink() {
    if (!link) return;
    navigator.clipboard.writeText(link).then(function(){ setCopied(true); setTimeout(function(){ setCopied(false); },2000); });
  }

  async function sendInvite(e) {
    e.preventDefault();
    if (!email.includes("@")){ setResult({success:false,message:"Please enter a valid email."}); return; }
    setSending(true); setResult(null);
    try {
      var res = await axios.post(`${API}/invite/send`,{user_id:user.id,email});
      setResult(res.data);
      if (res.data.success) setEmail("");
    } catch(err){
      setResult({success:false,message:err?.response?.data?.error||"Failed to send."});
    } finally { setSending(false); }
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"18px" }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"8px" }}>
        {[
          {label:"Invited",   value:istats.total_invited||0,         icon:"✉️",color:"#7c5cfc"},
          {label:"Joined",    value:istats.joined||0,                 icon:"👥",color:"#4ade80"},
          {label:"XP Earned", value:(istats.xp_earned||0)+" XP",     icon:"⚡",color:"#fbbf24"},
        ].map(function(s){ return (
          <div key={s.label} style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:"12px", padding:"12px", textAlign:"center" }}>
            <div style={{ fontSize:"18px", marginBottom:"4px" }}>{s.icon}</div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:"900", fontSize:"18px", color:s.color }}>{s.value}</div>
            <div style={{ fontSize:"9px", color:"var(--muted)" }}>{s.label}</div>
          </div>
        ); })}
      </div>

      <div style={{ background:"rgba(74,222,128,0.06)", border:"1px solid rgba(74,222,128,0.2)", borderRadius:"14px", padding:"16px" }}>
        <div style={{ fontSize:"10px", fontWeight:"800", color:"#4ade80", letterSpacing:"0.1em", marginBottom:"10px", fontFamily:"'Syne',sans-serif" }}>🎁 INVITE REWARDS</div>
        {["You earn +50 XP when a friend signs up","Your friend gets +25 XP welcome bonus","Compete on the leaderboard together","Track each other's streaks"].map(function(item){ return (
          <div key={item} style={{ display:"flex", gap:"8px", marginBottom:"6px" }}>
            <span style={{ color:"#4ade80" }}>✓</span>
            <span style={{ fontSize:"12px", color:"var(--text)" }}>{item}</span>
          </div>
        ); })}
      </div>

      <div>
        <div style={{ fontSize:"10px", fontWeight:"800", color:"var(--muted)", letterSpacing:"0.1em", marginBottom:"8px", fontFamily:"'Syne',sans-serif" }}>YOUR INVITE LINK</div>
        <div style={{ display:"flex", gap:"8px" }}>
          <div style={{ flex:1, padding:"10px 14px", borderRadius:"10px", border:"1px solid var(--border)", background:"var(--bg)", color:"var(--muted)", fontSize:"12px", fontFamily:"monospace", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{link||"Loading..."}</div>
          <button onClick={copyLink} style={{ padding:"10px 16px", borderRadius:"10px", border:"none", background:copied?"rgba(74,222,128,0.15)":"linear-gradient(135deg,#7c5cfc,#9c7cfc)", color:copied?"#4ade80":"#fff", fontSize:"12px", fontWeight:"800", cursor:"pointer", fontFamily:"'Syne',sans-serif", flexShrink:0 }}>
            {copied?"✓ Copied!":"Copy"}
          </button>
        </div>
      </div>

      <div>
        <div style={{ fontSize:"10px", fontWeight:"800", color:"var(--muted)", letterSpacing:"0.1em", marginBottom:"8px", fontFamily:"'Syne',sans-serif" }}>INVITE BY EMAIL</div>
        <form onSubmit={sendInvite} style={{ display:"flex", gap:"8px" }}>
          <input type="email" value={email} onChange={function(e){ setEmail(e.target.value); setResult(null); }} placeholder="friend@email.com" disabled={sending}
            style={{ flex:1, padding:"10px 14px", borderRadius:"10px", border:"1px solid var(--border)", background:"var(--bg)", color:"var(--text)", fontSize:"14px", fontFamily:"'DM Sans',sans-serif", outline:"none" }} />
          <button type="submit" disabled={sending||!email.trim()} style={{ padding:"10px 18px", borderRadius:"10px", border:"none", background:(!sending&&email.trim())?"linear-gradient(135deg,#7c5cfc,#9c7cfc)":"rgba(124,92,252,0.25)", color:"#fff", fontSize:"13px", fontWeight:"800", cursor:"pointer", fontFamily:"'Syne',sans-serif", flexShrink:0 }}>
            {sending?"Sending...":"Send →"}
          </button>
        </form>
        {result && (
          <div style={{ marginTop:"10px", padding:"10px 14px", borderRadius:"10px", background:result.success?"rgba(74,222,128,0.08)":"rgba(248,113,113,0.08)", border:`1px solid ${result.success?"rgba(74,222,128,0.3)":"rgba(248,113,113,0.3)"}`, fontSize:"12px", color:result.success?"#16a34a":"#dc2626" }}>
            {result.success?"✅ ":"❌ "}{result.message}
          </div>
        )}
      </div>

      <div>
        <div style={{ fontSize:"10px", fontWeight:"800", color:"var(--muted)", letterSpacing:"0.1em", marginBottom:"8px", fontFamily:"'Syne',sans-serif" }}>SHARE ON</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
          <button onClick={function(){ window.open(`https://wa.me/?text=${encodeURIComponent("Join me on Manifesting Motivation! "+link)}`,"_blank"); }}
            style={{ padding:"10px", borderRadius:"10px", border:"1px solid rgba(37,211,102,0.3)", background:"rgba(37,211,102,0.07)", color:"#128c7e", fontSize:"13px", fontWeight:"700", cursor:"pointer" }}>
            💬 WhatsApp
          </button>
          <button onClick={function(){ window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`,"_blank"); }}
            style={{ padding:"10px", borderRadius:"10px", border:"1px solid rgba(10,102,194,0.3)", background:"rgba(10,102,194,0.07)", color:"#0a66c2", fontSize:"13px", fontWeight:"700", cursor:"pointer" }}>
            💼 LinkedIn
          </button>
        </div>
      </div>
    </div>
  );
}