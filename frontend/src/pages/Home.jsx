/**
 * Home.jsx — with Persona Dropdown
 * - ALL stats from gamification/stats (single source of truth)
 * - active_days from checkin/streak (total_active_days)
 * - Mini-chat shows VADER emotion tag per bot message
 * - Week chart from /history (visual only)
 * - Persona selector replaced with styled dropdown
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";

var API = "https://manifesting-motivation-backend.onrender.com/api";
var IST = 330;

var EMOTION_COLORS = {
  positive: "#4ade80", excited: "#fb923c", focused: "#a78bfa", hopeful: "#60a5fa",
  neutral: "#94a3b8", stressed: "#fbbf24", anxious: "#fbbf24", sad: "#f87171",
  negative: "#f87171", frustrated: "#fb923c", crisis: "#ef4444",
};
var EMOTION_EMOJI = {
  positive: "😊", excited: "🔥", focused: "🎯", hopeful: "🌟",
  neutral: "😐", stressed: "😤", anxious: "😰", sad: "😢",
  negative: "😞", frustrated: "😤", crisis: "💙",
};

var PERSONAS = [
  {
    id: "mentor",
    emoji: "🎓",
    label: "Mentor",
    desc: "Wise guidance & long-term thinking",
    color: "#a78bfa",
    bg: "rgba(167,139,250,0.12)",
  },
  {
    id: "coach",
    emoji: "💼",
    label: "Coach",
    desc: "Goal-focused & accountability",
    color: "#60a5fa",
    bg: "rgba(96,165,250,0.12)",
  },
  {
    id: "friend",
    emoji: "🤝",
    label: "Friend",
    desc: "Warm, casual & supportive",
    color: "#4ade80",
    bg: "rgba(74,222,128,0.12)",
  },
  {
    id: "motivational",
    emoji: "🔥",
    label: "Hype Mode",
    desc: "High-energy encouragement",
    color: "#fb923c",
    bg: "rgba(251,146,60,0.12)",
  },
];

function ButterflyMini({ size }) {
  var s = size || 32;
  return (
    <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
      <path d="M20 20 C16 14,6 10,4 16 C2 22,10 26,20 20Z" fill="url(#hbl1)" opacity="0.92" />
      <path d="M20 20 C24 14,34 10,36 16 C38 22,30 26,20 20Z" fill="url(#hbl2)" opacity="0.92" />
      <path d="M20 20 C15 24,6 26,5 32 C4 36,12 36,20 20Z" fill="url(#hbl3)" opacity="0.82" />
      <path d="M20 20 C25 24,34 26,35 32 C36 36,28 36,20 20Z" fill="url(#hbl4)" opacity="0.82" />
      <ellipse cx="20" cy="20" rx="1.3" ry="6" fill="white" opacity="0.9" />
      <line x1="20" y1="15" x2="16" y2="9" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
      <line x1="20" y1="15" x2="24" y2="9" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
      <circle cx="16" cy="9" r="1.2" fill="white" opacity="0.9" />
      <circle cx="24" cy="9" r="1.2" fill="white" opacity="0.9" />
      <defs>
        <linearGradient id="hbl1" x1="4" y1="10" x2="20" y2="26" gradientUnits="userSpaceOnUse"><stop stopColor="#c4b5fd" /><stop offset="1" stopColor="#e9d5ff" /></linearGradient>
        <linearGradient id="hbl2" x1="36" y1="10" x2="20" y2="26" gradientUnits="userSpaceOnUse"><stop stopColor="#fce7f3" /><stop offset="1" stopColor="#c4b5fd" /></linearGradient>
        <linearGradient id="hbl3" x1="5" y1="26" x2="20" y2="36" gradientUnits="userSpaceOnUse"><stop stopColor="#ddd6fe" /><stop offset="1" stopColor="#c4b5fd" /></linearGradient>
        <linearGradient id="hbl4" x1="35" y1="26" x2="20" y2="36" gradientUnits="userSpaceOnUse"><stop stopColor="#fce7f3" /><stop offset="1" stopColor="#ddd6fe" /></linearGradient>
      </defs>
    </svg>
  );
}

/* ── Persona Dropdown Component ─────────────────────────────────────────── */
function PersonaDropdown({ persona, setPersona }) {
  var [open, setOpen] = useState(false);
  var dropRef = useRef(null);
  var active = PERSONAS.find(function (p) { return p.id === persona; }) || PERSONAS[0];

  useEffect(function () {
    function handleClick(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return function () { document.removeEventListener("mousedown", handleClick); };
  }, []);

  return (
    <div ref={dropRef} style={{ position: "relative", zIndex: 50 }}>
      {/* Trigger button */}
      <button
        onClick={function () { setOpen(function (v) { return !v; }); }}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "7px 12px", borderRadius: 12,
          border: "1px solid " + active.color + "55",
          background: active.bg,
          cursor: "pointer", transition: "all 0.18s",
          fontFamily: "'Syne', sans-serif",
        }}
      >
        <span style={{ fontSize: 16 }}>{active.emoji}</span>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: active.color, lineHeight: 1 }}>
            {active.label}
          </div>
          <div style={{ fontSize: 9, color: "var(--muted)", lineHeight: 1.3, marginTop: 1 }}>
            AI Persona
          </div>
        </div>
        {/* Chevron */}
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          style={{ marginLeft: 2, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <path d="M2 4l4 4 4-4" stroke={active.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0,
          width: 240, background: "var(--card)",
          border: "1px solid var(--border)", borderRadius: 16,
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          overflow: "hidden", animation: "dropIn 0.15s ease",
        }}>
          {/* Panel header */}
          <div style={{
            padding: "10px 14px 8px", borderBottom: "1px solid var(--border)",
            fontSize: 10, fontWeight: 800, color: "var(--muted)",
            letterSpacing: "0.1em", fontFamily: "'Syne', sans-serif",
          }}>
            CHOOSE YOUR AI PERSONA
          </div>

          {/* Options */}
          {PERSONAS.map(function (p) {
            var isActive = p.id === persona;
            return (
              <button
                key={p.id}
                onClick={function () {
                  setPersona(p.id);
                  localStorage.setItem("coaching_persona", p.id);
                  setOpen(false);
                }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 12,
                  padding: "11px 14px", border: "none", cursor: "pointer",
                  background: isActive ? p.bg : "transparent",
                  borderLeft: isActive ? "3px solid " + p.color : "3px solid transparent",
                  transition: "all 0.15s", textAlign: "left",
                }}
                onMouseEnter={function (e) {
                  if (!isActive) e.currentTarget.style.background = "rgba(124,92,252,0.06)";
                }}
                onMouseLeave={function (e) {
                  if (!isActive) e.currentTarget.style.background = "transparent";
                }}
              >
                {/* Emoji circle */}
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: isActive ? p.bg : "var(--bg)",
                  border: "1px solid " + (isActive ? p.color + "55" : "var(--border)"),
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, transition: "all 0.15s",
                }}>
                  {p.emoji}
                </div>

                {/* Text */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 800, fontFamily: "'Syne', sans-serif",
                    color: isActive ? p.color : "var(--text)", lineHeight: 1.2,
                  }}>
                    {p.label}
                    {isActive && (
                      <span style={{
                        marginLeft: 6, fontSize: 9, padding: "1px 6px",
                        borderRadius: 6, background: p.color + "22", color: p.color,
                        verticalAlign: "middle", fontWeight: 700,
                      }}>
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2, lineHeight: 1.3 }}>
                    {p.desc}
                  </div>
                </div>

                {/* Checkmark */}
                {isActive && (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                    <circle cx="8" cy="8" r="7" fill={p.color + "22"} stroke={p.color} strokeWidth="1.2" />
                    <path d="M5 8l2.2 2.2L11 5.5" stroke={p.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            );
          })}

          {/* Footer tip */}
          <div style={{
            padding: "8px 14px", borderTop: "1px solid var(--border)",
            fontSize: 10, color: "var(--muted)", lineHeight: 1.4,
          }}>
            💡 Persona shapes how your AI Coach responds to you
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Stats Config ────────────────────────────────────────────────────────── */
var STATS_CFG = [
  { id: "sessions",    label: "SESSIONS",    emoji: "💬", color: "#7c5cfc", nav: "history" },
  { id: "positive",    label: "POSITIVE",    emoji: "😊", color: "#4ade80", nav: "history" },
  { id: "active_days", label: "ACTIVE DAYS", emoji: "📅", color: "#fb923c", nav: "checkin" },
  { id: "tough_days",  label: "TOUGH DAYS",  emoji: "💪", color: "#f87171", nav: "history" },
  { id: "goals",       label: "GOALS",       emoji: "🎯", color: "#fbbf24", nav: "goals"   },
  { id: "done",        label: "DONE",        emoji: "✅", color: "#4ade80", nav: "goals"   },
  { id: "journals",    label: "JOURNALS",    emoji: "📓", color: "#60a5fa", nav: "journal" },
  { id: "xp",          label: "XP",          emoji: "⚡", color: "#a78bfa", nav: "badges"  },
];

var DAYS = ["M", "T", "W", "T", "F", "S", "S"];

/* ── Home Component ──────────────────────────────────────────────────────── */
function Home({ user, onNavigate }) {
  var uid       = user?.id;
  var firstName = (user?.name || "there").split(" ")[0];

  var [stats,     setStats]     = useState({ sessions: 0, positive: 0, active_days: 0, tough_days: 0, goals: 0, done: 0, journals: 0, xp: 0 });
  var [msgs,      setMsgs]      = useState([]);
  var [input,     setInput]     = useState("");
  var [busy,      setBusy]      = useState(false);
  var [nudge,     setNudge]     = useState("One small step today sets the tone for everything.");
  var [persona,   setPersona]   = useState(localStorage.getItem("coaching_persona") || "mentor");
  var [weekData,  setWeekData]  = useState([0, 0, 0, 0, 0, 0, 0]);
  var [weekTotal, setWeekTotal] = useState(0);
  var [speaking,  setSpeaking]  = useState(false);
  var [exporting, setExporting] = useState(false);
  var [exportMsg, setExportMsg] = useState("");
  var chatRef = useRef(null);

  var activePersona = PERSONAS.find(function (p) { return p.id === persona; }) || PERSONAS[0];

  /* ── Load Stats ─────────────────────────────────────────────────────── */
  var loadStats = useCallback(function () {
    if (!uid) return;
    Promise.all([
      axios.get(API + "/gamification/stats/" + uid),
      axios.get(API + "/checkin/streak/" + uid),
      axios.get(API + "/history?user_id=" + uid),
    ]).then(function (res) {
      var gam     = res[0].data || {};
      var streak  = res[1].data || {};
      var raw     = res[2].data;
      var history = Array.isArray(raw) ? raw : (raw?.sessions || raw?.history || []);

      var IST_MS2  = IST * 60000;
      var nowMs    = Date.now() + IST_MS2;
      var nowDate  = new Date(nowMs);
      var todayDow = nowDate.getUTCDay();
      var monOffset = (todayDow === 0) ? 6 : (todayDow - 1);
      var monStart  = nowMs - monOffset * 86400000;
      var sunEnd    = monStart + 7 * 86400000;

      var weekArr = [0, 0, 0, 0, 0, 0, 0];
      var wTotal  = 0;
      history.forEach(function (s) {
        var dt = s.created_at || s.date;
        if (!dt) return;
        var iso = String(dt).replace(" ", "T");
        if (!iso.includes("Z") && !iso.includes("+")) iso += "Z";
        var rawMs = new Date(iso).getTime();
        if (isNaN(rawMs)) return;
        var dIST = rawMs + IST_MS2;
        if (dIST < monStart || dIST >= sunEnd) return;
        wTotal++;
        var dow = (new Date(dIST).getUTCDay() + 6) % 7;
        weekArr[dow]++;
      });
      setWeekData(weekArr);
      setWeekTotal(wTotal);

      var newStats = {
        sessions:    gam.total_sessions    || 0,
        positive:    gam.positive_sessions || 0,
        active_days: streak.total_active_days ?? gam.streak ?? 0,
        tough_days:  gam.tough_sessions    || 0,
        goals:       gam.total_goals       || 0,
        done:        gam.goals_done        || 0,
        journals:    gam.journals          || 0,
        xp:          gam.xp               || 0,
        streak:      streak.streak         || 0,
        goals_done:  gam.goals_done        || 0,
      };
      setStats(newStats);
      try { localStorage.setItem("mm_stats_" + uid, JSON.stringify(newStats)); } catch (e) { }
    }).catch(function (e) { console.error("Home stats error:", e); });
  }, [uid]);

  useEffect(function () {
    if (!uid) return;
    loadStats();
    axios.get(API + "/checkin/daily-nudge/" + uid)
      .then(function (r) { if (r.data?.nudge) setNudge(r.data.nudge); })
      .catch(function () { });
    var t = setInterval(loadStats, 60000);
    return function () { clearInterval(t); };
  }, [uid, loadStats]);

  useEffect(function () {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [msgs, busy]);

  /* ── TTS ────────────────────────────────────────────────────────────── */
  function speakChunked(text) {
    window.speechSynthesis.cancel();
    var savedVoiceId = localStorage.getItem("voice_persona") || "EXAVITQu4vr4xnSDxMaL";
    var preferredVoice = (function () {
      var voices = window.speechSynthesis.getVoices();
      if (!voices || !voices.length) return null;
      var femaleIds = ["EXAVITQu4vr4xnSDxMaL", "21m00Tcm4TlvDq8ikWAM", "AZnzlk1XvdvUeBnXmlld", "MF3mGyEYCl7XYWbV9V6O"];
      var gender = femaleIds.includes(savedVoiceId) ? "female" : "male";
      var pool = voices.filter(function (v) { return v.lang && v.lang.startsWith("en"); });
      var match = pool.filter(function (v) {
        var n = v.name.toLowerCase();
        return gender === "female"
          ? /\b(sara|rachel|elli|aria|zira|susan|karen|victoria|samantha|moira|female|woman)\b/.test(n)
          : /\b(josh|james|daniel|david|alex|mark|lee|male|man)\b/.test(n);
      });
      return (match.length ? match[0] : pool[0]) || null;
    })();
    var sentences = text.match(/[^.!?\n]+[.!?\n]*/g) || [text];
    var chunks = [];
    var current = "";
    sentences.forEach(function (s) {
      if ((current + s).length < 160) { current += s; }
      else { if (current) chunks.push(current.trim()); current = s; }
    });
    if (current.trim()) chunks.push(current.trim());
    if (!chunks.length) { setSpeaking(false); return; }
    var chunkIdx = 0;
    function speakNext() {
      if (chunkIdx >= chunks.length) { setSpeaking(false); return; }
      var u = new SpeechSynthesisUtterance(chunks[chunkIdx++]);
      u.rate = 0.92; u.lang = "en-IN";
      if (preferredVoice) u.voice = preferredVoice;
      u.onend = speakNext;
      u.onerror = function () { setSpeaking(false); };
      window.speechSynthesis.speak(u);
    }
    speakNext();
  }

  function speak(text) {
    if (!text || speaking) return;
    if (localStorage.getItem("voice_auto") !== "true") return;
    setSpeaking(true);
    if (localStorage.getItem("el_unavailable") === "1") { speakChunked(text); return; }
    var voiceId = localStorage.getItem("voice_persona") || "";
    axios.post(API + "/speak", { text: text.slice(0, 300), voice_name: voiceId }, { responseType: "blob" })
      .then(function (r) {
        var url = URL.createObjectURL(r.data);
        var a = new Audio(url);
        a.onended = function () { setSpeaking(false); URL.revokeObjectURL(url); };
        a.onerror = function () { URL.revokeObjectURL(url); speakChunked(text); };
        a.play().catch(function () { speakChunked(text); });
      })
      .catch(function (e) {
        if (e?.response?.status === 401 || e?.response?.status === 403) {
          localStorage.setItem("el_unavailable", "1");
        }
        speakChunked(text);
      });
  }

  /* ── Send message ───────────────────────────────────────────────────── */
  function sendMsg() {
    var msg = input.trim();
    if (!msg || busy) return;
    setInput(""); setBusy(true);
    var userMsg = { role: "user", text: msg };
    setMsgs(function (p) { return p.concat(userMsg); });
    var hist = msgs.slice(-6).map(function (m) { return m.role + ": " + m.text; }).join("\n");
    var now = new Date();
    var ctx = "[Today: " + now.toLocaleDateString("en-IN") + " " + now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) + " IST]";
    axios.post(API + "/motivate", {
      message: msg, conversation_history: hist,
      persona: persona, user_id: uid, real_date_context: ctx,
    }).then(function (r) {
      var reply = r.data.response || "I'm here for you.";
      setMsgs(function (p) {
        return p.concat({
          role: "bot", text: reply,
          emotion: r.data.emotion || "neutral",
          vader: r.data.vader_score,
          xp: r.data.xp_awarded || 0,
        });
      });
      loadStats();
      speak(reply);
    }).catch(function () {
      setMsgs(function (p) { return p.concat({ role: "bot", text: "Something went wrong. Is Flask running on port 5000?" }); });
    }).finally(function () { setBusy(false); });
  }

  function handleExport() {
    setExporting(true); setExportMsg("");
    axios.get(API + "/privacy/export?user_id=" + uid, { responseType: "blob" })
      .then(function (r) {
        var url = URL.createObjectURL(new Blob([r.data]));
        var a = document.createElement("a");
        a.href = url; a.download = "my_data.json"; a.click();
        URL.revokeObjectURL(url);
        setExportMsg("✅ Downloaded!");
        setTimeout(function () { setExportMsg(""); }, 3000);
      })
      .catch(function () { setExportMsg("❌ Export failed"); })
      .finally(function () { setExporting(false); });
  }

  var maxW = Math.max(...weekData, 1);

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <div style={{ animation: "fadeIn 0.3s ease", paddingBottom: 32 }}>
      <style>{`
        @keyframes fadeIn   { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
        @keyframes bounce   { 0%,80%,100% { transform:translateY(0) } 40% { transform:translateY(-5px) } }
        @keyframes dropIn   { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:translateY(0) } }
        .topbtn { padding:7px 13px; border-radius:9px; border:1px solid var(--border); background:transparent; color:var(--muted); font-size:11px; font-family:'Syne',sans-serif; font-weight:700; cursor:pointer; transition:all 0.15s; }
        .topbtn:hover { background:rgba(124,92,252,0.08); border-color:rgba(124,92,252,0.3); color:var(--accent); }
        .hchat-input:focus { border-color:rgba(124,92,252,0.4)!important; outline:none!important; }
        .hchat-input::placeholder { color:var(--muted)!important; }
        .stat-pill { cursor:pointer; transition:all 0.18s; }
        .stat-pill:hover { transform:translateY(-2px); border-color:rgba(124,92,252,0.35)!important; }
      `}</style>

      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: "clamp(18px,5vw,24px)", background: "linear-gradient(135deg,#7c5cfc,#fc5cf0)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 2 }}>
            Hey, {firstName} 👋
          </h1>
          <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>{nudge}</p>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["checkin", "journal", "goals"].map(function (pg) {
            var labels = { checkin: "Check In", journal: "Journal", goals: "Goals" };
            return <button key={pg} className="topbtn" onClick={function () { onNavigate(pg); }}>{labels[pg]}</button>;
          })}
          <button className="topbtn" onClick={handleExport} disabled={exporting}>
            {exporting ? "..." : "Export"}
          </button>
          {exportMsg && <span style={{ fontSize: 11, color: "#4ade80", alignSelf: "center" }}>{exportMsg}</span>}
        </div>
      </div>

      {/* ── Stats grid ───────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 20 }}>
        {STATS_CFG.map(function (s) {
          return (
            <div key={s.id} className="stat-pill"
              onClick={function () { onNavigate(s.nav); }}
              style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "12px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{s.emoji}</div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: "clamp(16px,3vw,20px)", color: s.color }}>{stats[s.id]}</div>
              <div style={{ fontSize: 9, color: "var(--muted)", fontWeight: 700, letterSpacing: "0.06em", marginTop: 2 }}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* ── Week bar chart ───────────────────────────────────────────── */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: "16px 18px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontFamily: "'Syne',sans-serif", fontWeight: 800, color: "var(--muted)", letterSpacing: "0.1em" }}>THIS WEEK</div>
          <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700 }}>{weekTotal} sessions</div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 48 }}>
          {weekData.map(function (v, i) {
            var h = maxW > 0 ? Math.max(4, Math.round((v / maxW) * 44)) : 4;
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <div style={{ width: "100%", height: h, borderRadius: 4, background: v > 0 ? "linear-gradient(to top,#7c5cfc,#a78bfa)" : "var(--border)", transition: "height 0.4s ease" }} />
                <div style={{ fontSize: 9, color: "var(--muted)", fontWeight: 700 }}>{DAYS[i]}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Mini AI chat ─────────────────────────────────────────────── */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 18, overflow: "visible", marginBottom: 16, position: "relative" }}>

        {/* Chat header */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
          {/* Avatar */}
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#7c5cfc,#fc5cf8)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ButterflyMini size={20} />
          </div>

          {/* Title */}
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 13, color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
              AI Coach
              {/* Active persona badge next to title */}
              <span style={{
                fontSize: 10, padding: "2px 8px", borderRadius: 8,
                background: activePersona.bg, color: activePersona.color,
                border: "1px solid " + activePersona.color + "33",
                fontWeight: 700, letterSpacing: "0.02em",
              }}>
                {activePersona.emoji} {activePersona.label}
              </span>
            </div>
            <div style={{ fontSize: 10, color: "#4ade80" }}>● Live · VADER sentiment active</div>
          </div>

          {/* ── Persona Dropdown (replaces emoji buttons) ── */}
          <PersonaDropdown persona={persona} setPersona={setPersona} />
        </div>

        {/* Active persona description strip */}
        <div style={{
          padding: "7px 16px",
          borderBottom: "1px solid var(--border)",
          background: activePersona.bg,
          display: "flex", alignItems: "center", gap: 8,
          fontSize: 11, color: activePersona.color,
          transition: "background 0.3s",
        }}>
          <span style={{ fontSize: 13 }}>{activePersona.emoji}</span>
          <span style={{ fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>{activePersona.label}:</span>
          <span style={{ color: "var(--muted)", fontWeight: 400 }}>{activePersona.desc}</span>
        </div>

        {/* Messages */}
        <div ref={chatRef} style={{ maxHeight: 240, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          {msgs.length === 0 && (
            <div style={{ textAlign: "center", padding: "20px 10px" }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>🌟</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>What's on your mind? I'm here.</div>
            </div>
          )}
          {msgs.map(function (m, i) {
            var isUser = m.role === "user";
            var emoColor = EMOTION_COLORS[m.emotion] || "#94a3b8";
            var emoEmoji = EMOTION_EMOJI[m.emotion] || "";
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start", gap: 3 }}>
                <div style={{
                  maxWidth: "85%", padding: "9px 13px",
                  borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  background: isUser ? "linear-gradient(135deg,#7c5cfc,#9c7cfc)" : "var(--bg)",
                  color: isUser ? "#fff" : "var(--text)",
                  border: isUser ? "none" : "1px solid var(--border)",
                  fontSize: 13, lineHeight: 1.65, wordBreak: "break-word",
                }}>
                  {m.text}
                  {m.xp > 0 && <span style={{ display: "block", fontSize: 10, color: "#4ade80", fontWeight: 800, marginTop: 4 }}>+{m.xp} XP</span>}
                </div>
                {!isUser && m.emotion && m.emotion !== "neutral" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, paddingLeft: 6 }}>
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: emoColor,
                      background: emoColor + "18", padding: "2px 7px", borderRadius: 8,
                      fontFamily: "'Syne',sans-serif", border: "1px solid " + emoColor + "30",
                    }}>
                      {emoEmoji} {m.emotion.charAt(0).toUpperCase() + m.emotion.slice(1)}
                      {m.vader !== undefined && m.vader !== null
                        ? " · " + (m.vader > 0 ? "+" : "") + Number(m.vader).toFixed(2) : ""}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
          {busy && (
            <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "6px 0" }}>
              {[0, 1, 2].map(function (d) {
                return <div key={d} style={{ width: 6, height: 6, borderRadius: "50%", background: "#7c5cfc", animation: "bounce 1.1s infinite", animationDelay: d * 0.18 + "s" }} />;
              })}
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
          <input
            className="hchat-input"
            value={input}
            onChange={function (e) { setInput(e.target.value); }}
            onKeyDown={function (e) { if (e.key === "Enter") sendMsg(); }}
            placeholder="Ask for advice, motivation, or a roadmap…"
            style={{ flex: 1, padding: "9px 13px", borderRadius: 11, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}
          />
          <button
            onClick={sendMsg}
            disabled={busy || !input.trim()}
            style={{ padding: "9px 16px", borderRadius: 11, border: "none", background: input.trim() ? "linear-gradient(135deg,#7c5cfc,#9c7cfc)" : "var(--border)", color: "white", fontWeight: 800, fontSize: 13, cursor: input.trim() ? "pointer" : "not-allowed", fontFamily: "'Syne',sans-serif" }}
          >
            {busy ? "..." : "→"}
          </button>
        </div>
      </div>

      {/* ── Quick nav ────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
        {[
          { pg: "goals",   e: "🎯", t: "My Goals",      d: stats.goals + " total · " + stats.done + " done",  c: "#fbbf24" },
          { pg: "journal", e: "📔", t: "Journal",        d: stats.journals + " entries written",                c: "#60a5fa" },
          { pg: "checkin", e: "📅", t: "Daily Check-in", d: stats.active_days + " active days",                c: "#fb923c" },
          { pg: "badges",  e: "🏅", t: "Badges & XP",    d: stats.xp + " XP earned",                          c: "#a78bfa" },
        ].map(function (item) {
          return (
            <div
              key={item.pg}
              onClick={function () { onNavigate(item.pg); }}
              style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: "16px 14px", cursor: "pointer", transition: "all 0.18s" }}
              onMouseEnter={function (e) { e.currentTarget.style.borderColor = "rgba(124,92,252,0.35)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={function (e) { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <div style={{ fontSize: 22, marginBottom: 6 }}>{item.e}</div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 13, color: "var(--text)", marginBottom: 3 }}>{item.t}</div>
              <div style={{ fontSize: 11, color: item.c, fontWeight: 700 }}>{item.d}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Home;