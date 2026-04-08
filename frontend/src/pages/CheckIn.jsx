/**
 * CheckIn.jsx — FULLY FIXED
 *
 * FIXES:
 * 1. Week calendar: compares using backend's "date" field (IST date string)
 *    NOT c.created_at (which is IST datetime → toISOString() gives wrong UTC date)
 * 2. Top mood computed from real history
 * 3. Mood picker sends correct mood id to backend
 * 4. History shows real emoji + label for every mood
 */
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";

// ── Butterfly logo (replaces robot emoji) ────────────────────────────────
function ButterflyMini({ size }) {
  var s = size || 20;
  return (
    <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 20 C16 14,6 10,4 16 C2 22,10 26,20 20Z"   fill="url(#cbl1)" opacity="0.93"/>
      <path d="M20 20 C24 14,34 10,36 16 C38 22,30 26,20 20Z" fill="url(#cbl2)" opacity="0.93"/>
      <path d="M20 20 C15 24,6 26,5 32 C4 36,12 36,20 20Z"   fill="url(#cbl3)" opacity="0.85"/>
      <path d="M20 20 C25 24,34 26,35 32 C36 36,28 36,20 20Z" fill="url(#cbl4)" opacity="0.85"/>
      <ellipse cx="20" cy="20" rx="1.2" ry="5.5" fill="white" opacity="0.9"/>
      <line x1="20" y1="15" x2="16" y2="10" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.8"/>
      <line x1="20" y1="15" x2="24" y2="10" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.8"/>
      <circle cx="16" cy="10" r="1.1" fill="white" opacity="0.9"/>
      <circle cx="24" cy="10" r="1.1" fill="white" opacity="0.9"/>
      <defs>
        <linearGradient id="cbl1" x1="4"  y1="10" x2="20" y2="26" gradientUnits="userSpaceOnUse"><stop stopColor="#c4b5fd"/><stop offset="1" stopColor="#e9d5ff"/></linearGradient>
        <linearGradient id="cbl2" x1="36" y1="10" x2="20" y2="26" gradientUnits="userSpaceOnUse"><stop stopColor="#fce7f3"/><stop offset="1" stopColor="#c4b5fd"/></linearGradient>
        <linearGradient id="cbl3" x1="5"  y1="26" x2="20" y2="36" gradientUnits="userSpaceOnUse"><stop stopColor="#ddd6fe"/><stop offset="1" stopColor="#7c5cfc"/></linearGradient>
        <linearGradient id="cbl4" x1="35" y1="26" x2="20" y2="36" gradientUnits="userSpaceOnUse"><stop stopColor="#fce7f3"/><stop offset="1" stopColor="#a78bfa"/></linearGradient>
      </defs>
    </svg>
  );
}



var API = "https://manifesting-motivation-backend.onrender.com/api";

var MOODS = [
  { id:"amazing",   label:"Amazing",   emoji:"🤩", color:"#fbbf24", energy:5 },
  { id:"happy",     label:"Happy",     emoji:"😊", color:"#4ade80", energy:4 },
  { id:"okay",      label:"Okay",      emoji:"😐", color:"#94a3b8", energy:3 },
  { id:"tired",     label:"Tired",     emoji:"😴", color:"#a78bfa", energy:2 },
  { id:"stressed",  label:"Stressed",  emoji:"😰", color:"#fb923c", energy:2 },
  { id:"sad",       label:"Sad",       emoji:"😢", color:"#f87171", energy:1 },
  // aliases backend may return
  { id:"good",      label:"Good",      emoji:"😊", color:"#4ade80", energy:4 },
  { id:"meh",       label:"Meh",       emoji:"😑", color:"#60a5fa", energy:2 },
  { id:"bad",       label:"Bad",       emoji:"😔", color:"#f87171", energy:1 },
  { id:"awful",     label:"Awful",     emoji:"😢", color:"#ef4444", energy:0 },
  { id:"excited",   label:"Excited",   emoji:"🎉", color:"#fbbf24", energy:5 },
  { id:"calm",      label:"Calm",      emoji:"😌", color:"#60a5fa", energy:3 },
  { id:"anxious",   label:"Anxious",   emoji:"😟", color:"#f87171", energy:1 },
  { id:"angry",     label:"Angry",     emoji:"😠", color:"#ef4444", energy:1 },
  { id:"motivated", label:"Motivated", emoji:"💪", color:"#a78bfa", energy:4 },
  { id:"neutral",   label:"Neutral",   emoji:"😐", color:"#94a3b8", energy:3 },
  { id:"great",     label:"Great",     emoji:"😃", color:"#4ade80", energy:4 },
  { id:"positive",  label:"Positive",  emoji:"✨", color:"#4ade80", energy:4 },
  { id:"negative",  label:"Negative",  emoji:"😟", color:"#f87171", energy:1 },
];
var PICKER_MOODS = MOODS.slice(0, 6);

function getMood(id) {
  if (!id) return { emoji:"😐", color:"#94a3b8", label:"Unknown" };
  var m = MOODS.find(function(x){ return x.id === id.toLowerCase().trim(); });
  return m || { emoji:"😐", color:"#94a3b8", label: id.charAt(0).toUpperCase() + id.slice(1) };
}

// ── Day-of-week label array, Monday first ──
var DAY_LABELS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

// ── Build the 7-day window starting from Monday of current week ──
// Uses IST offset (+5:30) to get the correct local date — NOT UTC
function buildWeekDays() {
  // Apply IST offset so getDay() reflects the correct Indian weekday
  var IST_OFFSET = 330; // minutes
  var nowIST = new Date(Date.now() + IST_OFFSET * 60000);
  // YYYY-MM-DD string for today in IST
  var todayStr = nowIST.toISOString().slice(0, 10);
  // getDay() on the IST-adjusted date: 0=Sun,1=Mon,...,6=Sat
  var dow = nowIST.getUTCDay();
  var mondayOffset = (dow + 6) % 7; // days since Monday (Mon=0...Sun=6)
  var days = [];
  for (var i = 0; i < 7; i++) {
    var d = new Date(nowIST);
    d.setUTCDate(nowIST.getUTCDate() - mondayOffset + i);
    var ds = d.toISOString().slice(0, 10);
    days.push({ label: DAY_LABELS[i], dateStr: ds, isToday: ds === todayStr });
  }
  return days;
}

function HistoryCard({ c }) {
  var [open, setOpen] = useState(false);
  var m = getMood(c.mood);
  var dateLabel = c.date
    ? new Date(c.date + "T12:00:00").toLocaleDateString("en-US", { weekday:"short", day:"numeric", month:"short", year:"numeric" })
    : "—";

  return (
    <div style={{ background:"var(--card)", borderRadius:14, padding:"12px 14px", border:"1px solid var(--border)", marginBottom:8, borderLeft:"3px solid "+m.color, cursor:"pointer" }}
      onClick={function(){ setOpen(function(v){ return !v; }); }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ fontSize:22 }}>{m.emoji}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
            <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:13, color:m.color }}>{m.label}</span>
            <span style={{ fontSize:10, color:"var(--muted)" }}>{dateLabel}</span>
          </div>
          {c.note && <div style={{ fontSize:11, color:"var(--muted)", marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:open?"normal":"nowrap" }}>{c.note}</div>}
        </div>
        <div style={{ fontSize:12, color:"var(--muted)" }}>{open?"▲":"▼"}</div>
      </div>
      {open && c.ai_reply && (
        <div style={{ marginTop:10, padding:"10px 12px", borderRadius:10, background:m.color+"18", border:"1px solid "+m.color+"40", animation:"fadeIn 0.2s ease" }}>
          <div style={{ fontSize:9, color:m.color, fontWeight:800, fontFamily:"'Syne',sans-serif", marginBottom:4, display:"flex", alignItems:"center", gap:4 }}><ButterflyMini size={12}/> AI COACH REPLY</div>
          <div style={{ fontSize:12, color:"var(--text)", lineHeight:1.65 }}>{c.ai_reply}</div>
        </div>
      )}
    </div>
  );
}

function CheckIn({ user }) {
  var [selectedMood, setSelectedMood] = useState(null);
  var [note,         setNote]         = useState("");
  var [aiReply,      setAiReply]      = useState(null);
  var [submittedMood,setSubmittedMood]= useState(null);
  var [loading,      setLoading]      = useState(false);
  var [checkedToday, setCheckedToday] = useState(false);
  var [history,      setHistory]      = useState([]);
  var [streak,       setStreak]       = useState(0);
  var [tab,          setTab]          = useState("checkin");
  var [weekDays,     setWeekDays]     = useState([]);

  var loadAll = useCallback(function() {
    if (!user?.id) return;
    // Fetch both history and streak
    Promise.all([
      axios.get(API + "/checkin/history/" + user.id),
      axios.get(API + "/checkin/streak/"  + user.id),
    ]).then(function(res) {
      var hist  = Array.isArray(res[0].data) ? res[0].data : [];
      var strk  = res[1].data || {};
      setHistory(hist);
      setStreak(typeof strk.streak === "number" ? strk.streak : 0);

      // ── WEEK CALENDAR FIX ──────────────────────────────────────────────
      // Backend returns each checkin with a "date" field = IST date (YYYY-MM-DD)
      // We compare that "date" field directly — no UTC conversion needed
      var checkinDateSet = new Set(
        hist.map(function(c) { return c.date || ""; }).filter(Boolean)
      );

      var days = buildWeekDays();
      days.forEach(function(d) {
        d.active = checkinDateSet.has(d.dateStr);
        // Also find the mood for that day if checked in
        var entry = hist.find(function(c){ return c.date === d.dateStr; });
        d.moodId  = entry ? entry.mood : null;
      });
      setWeekDays(days);

      // Check if today has a checkin
      var todayStr = new Date().toLocaleDateString("en-CA");
      setCheckedToday(checkinDateSet.has(todayStr));
    }).catch(function(e){ console.error("CheckIn load error:", e); });
  }, [user]);

  useEffect(function() { loadAll(); }, [loadAll]);

  function submitCheckIn() {
    if (!selectedMood) { alert("Please select how you're feeling!"); return; }
    setLoading(true);
    axios.post(API + "/checkin", { user_id:user.id, mood:selectedMood, note:note })
      .then(function(r) {
        setAiReply(r.data.ai_reply);
        setSubmittedMood(selectedMood);
        setCheckedToday(true);
        loadAll();
        axios.post(API + "/gamification/award", { user_id:user.id, action:"daily_checkin" }).catch(function(){});
        try {
          if (r.data.ai_reply) {
            var u = new SpeechSynthesisUtterance(r.data.ai_reply);
            u.rate = 0.92; window.speechSynthesis.speak(u);
          }
        } catch(e){}
      })
      .catch(function(err) {
        var msg = err.response ? JSON.stringify(err.response.data) : "Network error — is Flask running?";
        alert("Check-in failed: " + msg);
      })
      .finally(function(){ setLoading(false); });
  }

  // Compute top mood from history
  var topMoodId = null;
  if (history.length > 0) {
    var counts = {};
    history.forEach(function(c){ counts[c.mood] = (counts[c.mood]||0)+1; });
    topMoodId = Object.entries(counts).sort(function(a,b){ return b[1]-a[1]; })[0]?.[0] || null;
  }
  var topMood = topMoodId ? getMood(topMoodId) : null;
  var moodCfg = submittedMood ? getMood(submittedMood) : null;

  return (
    <div style={{ animation:"fadeIn 0.3s ease", paddingBottom:24 }}>
      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes popIn{0%{transform:scale(0.7);opacity:0}60%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        .mood-btn{transition:all 0.18s;cursor:pointer;}
        .mood-btn:hover{transform:translateY(-3px) scale(1.04);}
        .ci-textarea{background:var(--card)!important;color:var(--text)!important;border:1px solid var(--border)!important;}
        .ci-textarea:focus{border-color:rgba(124,92,252,0.4)!important;outline:none!important;}
        .ci-textarea::placeholder{color:var(--muted)!important;}
      `}</style>

      {/* Header */}
      <div style={{ marginBottom:18 }}>
        <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:"clamp(20px,5vw,26px)", background:"linear-gradient(135deg,#7c5cfc,#fc5cf0)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", marginBottom:4 }}>
          Daily Check-in
        </h1>
        <p style={{ fontSize:12, color:"var(--muted)" }}>A 30-second daily ritual that builds self-awareness 🌱</p>
        <div style={{ display:"flex", gap:8, marginTop:10, flexWrap:"wrap" }}>
          {streak > 0 && (
            <div style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 12px", borderRadius:20, background:"rgba(251,146,60,0.1)", border:"1px solid rgba(251,146,60,0.25)" }}>
              <span style={{ fontSize:14 }}>🔥</span>
              <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:12, color:"#fb923c" }}>{streak} day streak</span>
            </div>
          )}
          {history.length > 0 && (
            <div style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 12px", borderRadius:20, background:"rgba(96,165,250,0.1)", border:"1px solid rgba(96,165,250,0.25)" }}>
              <span style={{ fontSize:12 }}>📅</span>
              <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:12, color:"#60a5fa" }}>{history.length} check-ins</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", borderBottom:"1px solid var(--border)", marginBottom:20 }}>
        {[{id:"checkin",label:"✅ Check In"},{id:"history",label:"📅 History"}].map(function(t){
          return (
            <button key={t.id} onClick={function(){ setTab(t.id); }}
              style={{ padding:"9px 18px", border:"none", background:"transparent", cursor:"pointer", fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:13, color:tab===t.id?"var(--accent)":"var(--muted)", borderBottom:tab===t.id?"2px solid var(--accent)":"2px solid transparent", marginBottom:-1, transition:"all 0.15s", minHeight:42 }}>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── CHECK IN TAB ── */}
      {tab === "checkin" && (
        <div>
          {aiReply ? (
            <div style={{ animation:"popIn 0.4s ease" }}>
              <div style={{ textAlign:"center", marginBottom:20 }}>
                <div style={{ fontSize:64, animation:"float 2s ease infinite", marginBottom:8 }}>{moodCfg ? moodCfg.emoji : "✅"}</div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:18, color:"var(--text)", marginBottom:4 }}>Checked in!</div>
                <div style={{ fontSize:12, color:"var(--muted)" }}>+20 XP earned · {streak} day streak 🔥</div>
              </div>
              <div style={{ background:"var(--card)", borderRadius:20, padding:18, border:"1px solid rgba(124,92,252,0.2)", marginBottom:16 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                  <div style={{ width:32, height:32, borderRadius:"50%", background:"linear-gradient(135deg,#7c5cfc,#fc5cf8)", display:"flex", alignItems:"center", justifyContent:"center" }}><ButterflyMini size={20}/></div>
                  <div>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:12, color:"var(--text)" }}>Your AI Coach</div>
                    <div style={{ fontSize:10, color:"#4ade80" }}>● just now</div>
                  </div>
                </div>
                <div style={{ fontSize:14, lineHeight:1.75, color:"var(--text)", background:"var(--bg)", border:"1px solid var(--border)", borderRadius:"12px 12px 12px 4px", padding:"12px 16px" }}>
                  {aiReply}
                </div>
              </div>
              <button onClick={function(){ setAiReply(null); setSelectedMood(null); setNote(""); }}
                style={{ width:"100%", padding:12, borderRadius:12, border:"1px solid var(--border)", background:"transparent", color:"var(--muted)", fontSize:12, cursor:"pointer", fontFamily:"'Syne',sans-serif", fontWeight:700 }}>
                ← Back
              </button>
            </div>

          ) : checkedToday ? (
            <div style={{ background:"var(--card)", borderRadius:20, padding:"40px 20px", textAlign:"center", border:"1px solid rgba(74,222,128,0.2)" }}>
              <div style={{ fontSize:56, marginBottom:12, animation:"float 2s ease infinite" }}>✅</div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:18, color:"var(--text)", marginBottom:6 }}>You've checked in today!</div>
              <div style={{ fontSize:13, color:"var(--muted)", lineHeight:1.6 }}>
                Come back tomorrow to keep your streak alive.
                {streak > 0 && <><br/><span style={{ color:"#fb923c", fontWeight:700 }}>🔥 {streak} day streak — don't break it!</span></>}
              </div>
            </div>

          ) : (
            <div>
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:14, fontFamily:"'Syne',sans-serif", fontWeight:800, color:"var(--text)", marginBottom:14 }}>How are you feeling right now?</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
                  {PICKER_MOODS.map(function(m){
                    var sel = selectedMood === m.id;
                    return (
                      <button key={m.id} className="mood-btn" onClick={function(){ setSelectedMood(m.id); }}
                        style={{ padding:"16px 10px", borderRadius:16, border:sel?"2px solid "+m.color:"1px solid var(--border)", background:sel?m.color+"18":"var(--card)", textAlign:"center", transform:sel?"translateY(-3px)":"none", boxShadow:sel?"0 6px 20px "+m.color+"33":"none" }}>
                        <div style={{ fontSize:32, marginBottom:6 }}>{m.emoji}</div>
                        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:12, color:sel?m.color:"var(--text)" }}>{m.label}</div>
                        {sel && <div style={{ fontSize:9, color:m.color, fontWeight:800, marginTop:3 }}>✓ Selected</div>}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:12, fontFamily:"'Syne',sans-serif", fontWeight:700, color:"var(--text)", marginBottom:8 }}>Anything on your mind? <span style={{ color:"var(--muted)", fontWeight:400 }}>(optional)</span></div>
                <textarea className="ci-textarea" placeholder={"What's going on today?"} value={note}
                  onChange={function(e){ setNote(e.target.value); }} rows={3}
                  style={{ width:"100%", boxSizing:"border-box", borderRadius:12, padding:"12px 14px", fontSize:13, fontFamily:"'DM Sans',sans-serif", lineHeight:1.6, resize:"none" }}/>
              </div>
              <button onClick={submitCheckIn} disabled={loading || !selectedMood}
                style={{ width:"100%", padding:14, borderRadius:14, border:"none", background:selectedMood?"linear-gradient(135deg,#7c5cfc,#fc5cf0)":"var(--border)", color:"white", fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:15, cursor:selectedMood?"pointer":"not-allowed", opacity:(loading||!selectedMood)?0.6:1, boxShadow:selectedMood?"0 6px 22px rgba(124,92,252,0.35)":"none", transition:"all 0.2s" }}>
                {loading ? "⏳ Getting your coaching message..." : "✨ Submit Check-in (+20 XP)"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {tab === "history" && (
        <div>
          {history.length === 0 ? (
            <div style={{ textAlign:"center", padding:"40px 20px", background:"var(--card)", borderRadius:20, border:"1px solid var(--border)" }}>
              <div style={{ fontSize:40, marginBottom:10 }}>📅</div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:15, color:"var(--text)", marginBottom:6 }}>No check-ins yet</div>
              <div style={{ fontSize:12, color:"var(--muted)" }}>Complete your first check-in to start tracking your mood journey.</div>
            </div>
          ) : (
            <div>
              {/* ── WEEK CALENDAR — fixed ── */}
              <div style={{ background:"var(--card)", borderRadius:16, padding:16, marginBottom:16, border:"1px solid var(--border)" }}>
                <div style={{ fontSize:9, color:"var(--muted)", fontFamily:"'Syne',sans-serif", fontWeight:800, letterSpacing:"0.1em", marginBottom:12 }}>THIS WEEK</div>
                <div style={{ display:"flex", gap:4, justifyContent:"space-between" }}>
                  {weekDays.map(function(d, i) {
                    var m = d.moodId ? getMood(d.moodId) : null;
                    return (
                      <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
                        <div style={{ fontSize:9, fontFamily:"'Syne',sans-serif", fontWeight:d.isToday?800:500, color:d.isToday?"var(--accent)":"var(--muted)" }}>
                          {d.label.slice(0,1)}
                        </div>
                        <div style={{ width:36, height:36, borderRadius:"50%", background:d.active?(m?m.color+"22":"rgba(124,92,252,0.15)"):"var(--bg)", border:"2px solid "+(d.active?(m?m.color:"var(--accent)"):(d.isToday?"rgba(124,92,252,0.3)":"var(--border)")), display:"flex", alignItems:"center", justifyContent:"center", fontSize:d.active?18:12, outline:d.isToday?"2px solid var(--accent)":"none", outlineOffset:2, transition:"all 0.3s" }}>
                          {d.active ? (m ? m.emoji : "✓") : (d.isToday ? "●" : "○")}
                        </div>
                        {d.active && m && (
                          <div style={{ fontSize:8, color:m.color, fontWeight:700, textAlign:"center" }}>{m.label}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Stats summary */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:16 }}>
                {[
                  { label:"Total",    v:history.length, c:"#7c5cfc", e:"📅" },
                  { label:"Streak",   v:streak+"d",     c:"#fb923c", e:"🔥" },
                  { label:"Top Mood", v:topMood ? topMood.emoji : "😐", c:"#4ade80", e:"" },
                ].map(function(s){
                  return (
                    <div key={s.label} style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:14, padding:"12px 8px", textAlign:"center" }}>
                      <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:20, color:s.c }}>{s.e}{s.v}</div>
                      <div style={{ fontSize:9, color:"var(--muted)", fontWeight:600, marginTop:3 }}>{s.label.toUpperCase()}</div>
                    </div>
                  );
                })}
              </div>

              <div style={{ fontSize:10, color:"var(--muted)", fontFamily:"'Syne',sans-serif", fontWeight:800, letterSpacing:"0.1em", marginBottom:10 }}>PAST CHECK-INS</div>
              {history.map(function(c){ return <HistoryCard key={c.id} c={c}/>; })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CheckIn;

