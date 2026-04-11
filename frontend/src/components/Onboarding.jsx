import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

var API = "https://manifesting-motivation-backend.onrender.com/api";

// ── Mini floating butterfly ───────────────────────────────────────────────
function FloatingButterfly({ x, y, size, delay }) {
  var s = size || 20;
  return (
    <div style={{
      position: "absolute", left: x + "%", top: y + "%",
      opacity: 0.45, pointerEvents: "none",
      animation: "obfly " + (5 + delay) + "s ease-in-out " + delay + "s infinite",
    }}>
      <style>{`
        @keyframes obfly{0%,100%{transform:translate(0,0) rotate(-5deg)}50%{transform:translate(10px,-20px) rotate(5deg)}}
        @keyframes obwing{0%,100%{transform:scaleX(1)}50%{transform:scaleX(0.6)}}
      `}</style>
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none"
        style={{ animation: "obwing .7s ease-in-out " + delay + "s infinite" }}>
        <path d="M20 20 C16 14,6 10,4 16 C2 22,10 26,20 20Z"   fill="rgba(167,139,250,0.7)"/>
        <path d="M20 20 C24 14,34 10,36 16 C38 22,30 26,20 20Z" fill="rgba(252,92,240,0.6)"/>
        <path d="M20 20 C15 24,6 26,5 32 C4 36,12 36,20 20Z"   fill="rgba(167,139,250,0.55)"/>
        <path d="M20 20 C25 24,34 26,35 32 C36 36,28 36,20 20Z" fill="rgba(252,92,240,0.55)"/>
        <ellipse cx="20" cy="20" rx="1" ry="5" fill="rgba(255,255,255,0.5)"/>
      </svg>
    </div>
  );
}

function BigButterfly({ size }) {
  var s = size || 64;
  return (
    <svg width={s} height={s} viewBox="0 0 40 40" fill="none"
      style={{ filter: "drop-shadow(0 0 14px rgba(124,92,252,0.4))" }}>
      <path d="M20 20 C16 14,6 10,4 16 C2 22,10 26,20 20Z"   fill="url(#ob1)" opacity="0.95"/>
      <path d="M20 20 C24 14,34 10,36 16 C38 22,30 26,20 20Z" fill="url(#ob2)" opacity="0.95"/>
      <path d="M20 20 C15 24,6 26,5 32 C4 36,12 36,20 20Z"   fill="url(#ob3)" opacity="0.85"/>
      <path d="M20 20 C25 24,34 26,35 32 C36 36,28 36,20 20Z" fill="url(#ob4)" opacity="0.85"/>
      <ellipse cx="20" cy="20" rx="1.3" ry="7" fill="#7c5cfc"/>
      <line x1="20" y1="13" x2="15" y2="7" stroke="#7c5cfc" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="20" y1="13" x2="25" y2="7" stroke="#7c5cfc" strokeWidth="1.2" strokeLinecap="round"/>
      <circle cx="15" cy="7" r="1.4" fill="#fc5cf0"/>
      <circle cx="25" cy="7" r="1.4" fill="#fc5cf0"/>
      <defs>
        <linearGradient id="ob1" x1="4" y1="10" x2="20" y2="26" gradientUnits="userSpaceOnUse"><stop stopColor="#7c5cfc"/><stop offset="1" stopColor="#c4b5fd"/></linearGradient>
        <linearGradient id="ob2" x1="36" y1="10" x2="20" y2="26" gradientUnits="userSpaceOnUse"><stop stopColor="#fc5cf0"/><stop offset="1" stopColor="#7c5cfc"/></linearGradient>
        <linearGradient id="ob3" x1="5" y1="26" x2="20" y2="36" gradientUnits="userSpaceOnUse"><stop stopColor="#a78bfa"/><stop offset="1" stopColor="#7c5cfc"/></linearGradient>
        <linearGradient id="ob4" x1="35" y1="26" x2="20" y2="36" gradientUnits="userSpaceOnUse"><stop stopColor="#fc5cf0"/><stop offset="1" stopColor="#a78bfa"/></linearGradient>
      </defs>
    </svg>
  );
}

function ProgressBar({ step, total }) {
  return (
    <div style={{ display: "flex", gap: 5, marginBottom: 28 }}>
      {Array.from({ length: total }).map(function(_, i) {
        return (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i < step
              ? "linear-gradient(90deg,#7c5cfc,#fc5cf0)"
              : i === step
                ? "rgba(124,92,252,0.3)"
                : "rgba(255,255,255,0.08)",
            transition: "all .4s",
          }}/>
        );
      })}
    </div>
  );
}

var GOAL_CATS = [
  { id: "career",   icon: "💼", label: "Career"   },
  { id: "health",   icon: "❤️", label: "Health"   },
  { id: "academic", icon: "📚", label: "Academic"  },
  { id: "personal", icon: "🌱", label: "Personal"  },
  { id: "finance",  icon: "💰", label: "Finance"   },
  { id: "fitness",  icon: "💪", label: "Fitness"   },
];

var COACHING_STYLES = [
  { id: "motivational", emoji: "🔥", label: "Motivational", desc: "High energy, push me hard"       },
  { id: "gentle",       emoji: "🌱", label: "Gentle",       desc: "Soft support, go at my pace"     },
  { id: "analytical",   emoji: "🎯", label: "Analytical",   desc: "Data-driven, logic first"        },
  { id: "spiritual",    emoji: "✨", label: "Spiritual",     desc: "Mindfulness and inner growth"    },
];

// ── STEP 4: Voice + Notifications setup ──────────────────────────────────
function FeatureSetupStep({ name, onDone }) {
  var [voiceEnabled,  setVoiceEnabled]  = useState(localStorage.getItem("voice_auto") === "true");
  var [notifPerm,     setNotifPerm]     = useState(typeof Notification !== "undefined" ? Notification.permission : "default");
  var [notifDone,     setNotifDone]     = useState(false);
  var [testingVoice,  setTestingVoice]  = useState(false);

  function handleVoice(val) {
    setVoiceEnabled(val);
    localStorage.setItem("voice_auto", String(val));
  }

  function handleNotif() {
    if (typeof Notification === "undefined") return;
    Notification.requestPermission().then(function(perm) {
      setNotifPerm(perm);
      if (perm === "granted") {
        setNotifDone(true);
        localStorage.setItem("notif_enabled", "true");
        new Notification("Manifesting Motivation ✨", {
          body: "Daily reminders are on! We'll keep you on track.",
          icon: "/favicon.ico",
        });
      }
    });
  }

  function testVoice() {
    if (testingVoice) return;
    setTestingVoice(true);
    axios.post(API + "/speak", {
      text: "Hello " + name + "! I'm your AI coach. Let's make today count!",
      voice_name: localStorage.getItem("voice_persona") || "EXAVITQu4vr4xnSDxMaL",
    }, { responseType: "blob" })
      .then(function(r) {
        var url   = URL.createObjectURL(r.data);
        var audio = new Audio(url);
        audio.onended = function() { URL.revokeObjectURL(url); setTestingVoice(false); };
        audio.onerror = function() { setTestingVoice(false); };
        audio.play().catch(function() { setTestingVoice(false); });
      })
      .catch(function() {
        try {
          var u = new SpeechSynthesisUtterance("Hello " + name + "! I'm your AI coach. Let's make today count!");
          u.rate = 0.92;
          window.speechSynthesis.speak(u);
          u.onend = function() { setTestingVoice(false); };
        } catch(e) { setTestingVoice(false); }
      });
  }

  return (
    <div style={{ animation: "fadeIn .3s ease" }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(124,92,252,0.8)", letterSpacing: ".14em", marginBottom: 9, fontFamily: "'Syne',sans-serif" }}>STEP 4 OF 5</div>
      <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: 21, color: "#eeeeff", marginBottom: 7 }}>
        Set up your experience ✨
      </h2>
      <p style={{ fontSize: 13, color: "rgba(238,238,255,0.45)", marginBottom: 20, lineHeight: 1.7 }}>
        These two features make the app 10x better. Both optional — change anytime in Settings.
      </p>

      {/* VOICE CARD */}
      <div style={{
        borderRadius: 14, marginBottom: 11,
        background: voiceEnabled ? "rgba(124,92,252,0.1)" : "rgba(255,255,255,0.03)",
        border: "1px solid " + (voiceEnabled ? "rgba(124,92,252,0.4)" : "rgba(255,255,255,0.1)"),
        padding: "15px 16px",
        transition: "all .2s",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 13, marginBottom: voiceEnabled ? 12 : 0 }}>
          <div style={{ fontSize: 26, flexShrink: 0, marginTop: 2 }}>🔊</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 14, color: "#eeeeff", marginBottom: 3 }}>
              AI Voice Assistant
            </div>
            <div style={{ fontSize: 12, color: "rgba(238,238,255,0.45)", lineHeight: 1.6 }}>
              AI replies spoken aloud in a warm voice. Makes the coaching feel real.
            </div>
          </div>
          {/* Toggle */}
          <div onClick={function() { handleVoice(!voiceEnabled); }}
            style={{
              width: 44, height: 24, borderRadius: 12, flexShrink: 0, marginTop: 2,
              background: voiceEnabled ? "#7c5cfc" : "rgba(255,255,255,0.12)",
              cursor: "pointer", position: "relative", transition: "background .25s",
              WebkitTapHighlightColor: "transparent",
            }}>
            <div style={{
              width: 18, height: 18, borderRadius: "50%", background: "white",
              position: "absolute", top: 3, left: voiceEnabled ? 23 : 3,
              transition: "left .25s", boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
            }}/>
          </div>
        </div>
        {voiceEnabled && (
          <button onClick={testVoice} disabled={testingVoice} style={{
            width: "100%", padding: "9px", borderRadius: 10,
            border: "1px solid rgba(124,92,252,0.35)",
            background: testingVoice ? "rgba(124,92,252,0.15)" : "rgba(124,92,252,0.08)",
            color: testingVoice ? "#a78bfa" : "#eeeeff",
            fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13,
            cursor: testingVoice ? "not-allowed" : "pointer",
            transition: "all .18s",
          }}>
            {testingVoice ? "🔊 Speaking…" : "▶ Test voice now"}
          </button>
        )}
      </div>

      {/* NOTIFICATIONS CARD */}
      <div style={{
        borderRadius: 14, marginBottom: 20,
        background: notifDone || notifPerm === "granted" ? "rgba(74,222,128,0.08)" : "rgba(255,255,255,0.03)",
        border: "1px solid " + (notifDone || notifPerm === "granted" ? "rgba(74,222,128,0.3)" : "rgba(255,255,255,0.1)"),
        padding: "15px 16px",
        transition: "all .2s",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 13, marginBottom: notifPerm !== "granted" ? 12 : 0 }}>
          <div style={{ fontSize: 26, flexShrink: 0, marginTop: 2 }}>🔔</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 14, color: "#eeeeff", marginBottom: 3 }}>
              Daily Reminders
              {(notifDone || notifPerm === "granted") && (
                <span style={{ marginLeft: 8, fontSize: 11, color: "#4ade80", fontWeight: 700 }}>✓ Enabled</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: "rgba(238,238,255,0.45)", lineHeight: 1.6 }}>
              Get a daily nudge to check in, stay on streak, and hit your goals.
            </div>
          </div>
        </div>
        {notifPerm !== "granted" && (
          <button onClick={handleNotif} style={{
            width: "100%", padding: "9px", borderRadius: 10,
            border: "1px solid rgba(74,222,128,0.3)",
            background: "rgba(74,222,128,0.08)",
            color: "#4ade80",
            fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13,
            cursor: "pointer", transition: "all .18s",
          }}>
            🔔 Enable daily reminders
          </button>
        )}
      </div>

      <button onClick={onDone} style={{
        width: "100%", padding: 14, borderRadius: 12,
        background: "linear-gradient(135deg,#7c5cfc,#fc5cf0)",
        border: "none", color: "#fff",
        fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 14,
        cursor: "pointer", boxShadow: "0 6px 22px rgba(124,92,252,.35)",
        transition: "all .18s",
      }}>
        Almost there! →
      </button>
    </div>
  );
}

// ── Main Onboarding component ─────────────────────────────────────────────
function Onboarding({ user, onComplete }) {
  var [step,      setStep]      = useState(0);
  var [name,      setName]      = useState(user?.name || "");
  var [goalTitle, setGoalTitle] = useState("");
  var [goalCat,   setGoalCat]   = useState("personal");
  var [style,     setStyle]     = useState("motivational");
  var [saving,    setSaving]    = useState(false);
  var uid = user ? user.id : null;

  function next() { setStep(function(s) { return s + 1; }); }
  function back() { setStep(function(s) { return s - 1; }); }

  async function saveAndFinish() {
    setSaving(true);
    try {
      localStorage.setItem("coaching_persona", style);
      localStorage.setItem("onboarding_done",  "true");
      if (name.trim() && name !== user?.name) {
        await axios.patch(API + "/auth/update-profile", { user_id: uid, name: name.trim() }).catch(function() {});
      }
      if (goalTitle.trim()) {
        await axios.post(API + "/goals", { user_id: uid, title: goalTitle.trim(), category: goalCat }).catch(function() {});
      }
      await axios.post(API + "/gamification/award", { user_id: uid, reason: "onboarding_complete", xp: 50 }).catch(function() {});
    } catch(e) {}
    setSaving(false);
    onComplete();
  }

  var firstName = (name || user?.name || "there").split(" ")[0];

  var btnStyle = {
    padding: "13px 22px", borderRadius: 12, border: "none",
    background: "linear-gradient(135deg,#7c5cfc,#fc5cf0)",
    color: "#fff", fontFamily: "'Syne',sans-serif", fontWeight: 800,
    fontSize: 14, cursor: "pointer",
    boxShadow: "0 6px 22px rgba(124,92,252,.35)",
    transition: "all .18s", WebkitTapHighlightColor: "transparent",
  };
  var backStyle = {
    padding: "13px 16px", borderRadius: 12,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "rgba(238,238,255,0.6)", fontFamily: "'DM Sans',sans-serif",
    fontWeight: 600, fontSize: 14, cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 2000,
      background: "rgba(5,5,15,0.95)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20, backdropFilter: "blur(12px)",
    }}>
      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pop{0%{transform:scale(0.85);opacity:0}60%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        .ob-input:focus{border-color:#7c5cfc!important;outline:none;box-shadow:0 0 0 3px rgba(124,92,252,.15)!important;}
      `}</style>

      {/* Background butterflies */}
      {[
        {x:5, y:10, s:16, d:0  },
        {x:85,y:5,  s:20, d:1.5},
        {x:10,y:80, s:14, d:2.5},
        {x:88,y:75, s:18, d:1  },
        {x:50,y:3,  s:13, d:3  },
      ].map(function(b, i) {
        return <FloatingButterfly key={i} x={b.x} y={b.y} size={b.s} delay={b.d}/>;
      })}

      <div style={{
        background: "linear-gradient(160deg,#0f0f22 0%,#0a0a1a 100%)",
        border: "1px solid rgba(124,92,252,0.25)",
        borderRadius: 22, padding: "34px 30px",
        width: "100%", maxWidth: 460,
        boxShadow: "0 40px 80px rgba(0,0,0,.6)",
        animation: "fadeIn .35s ease",
        position: "relative", zIndex: 1,
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <ProgressBar step={step} total={6}/>

        {/* ── STEP 0: WELCOME ── */}
        {step === 0 && (
          <div style={{ textAlign: "center", animation: "fadeIn .3s ease" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16, animation: "float 2.5s ease infinite" }}>
              <BigButterfly size={68}/>
            </div>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: 24, color: "#eeeeff", marginBottom: 11, letterSpacing: "-.4px" }}>
              Welcome to Manifesting Motivation
            </h2>
            <p style={{ fontSize: 14, color: "rgba(238,238,255,0.5)", lineHeight: 1.75, marginBottom: 28 }}>
              Your personal AI coach is ready. Setup takes 2 minutes. Let's build your journey together. 🚀
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 28 }}>
              {[
                { icon: "🎯", text: "AI goal roadmaps"    },
                { icon: "🔥", text: "50 badges to earn"   },
                { icon: "🔊", text: "Voice AI coaching"   },
                { icon: "🔔", text: "Daily reminders"     },
              ].map(function(f) {
                return (
                  <div key={f.text} style={{
                    padding: "11px 13px", borderRadius: 11,
                    background: "rgba(124,92,252,0.08)",
                    border: "1px solid rgba(124,92,252,0.15)",
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <span style={{ fontSize: 16 }}>{f.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(238,238,255,0.7)" }}>{f.text}</span>
                  </div>
                );
              })}
            </div>
            <button onClick={next} style={{ ...btnStyle, width: "100%" }}>Let's begin! →</button>
          </div>
        )}

        {/* ── STEP 1: NAME ── */}
        {step === 1 && (
          <div style={{ animation: "fadeIn .3s ease" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(124,92,252,0.8)", letterSpacing: ".14em", marginBottom: 9, fontFamily: "'Syne',sans-serif" }}>STEP 1 OF 5</div>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: 21, color: "#eeeeff", marginBottom: 7 }}>What should I call you?</h2>
            <p style={{ fontSize: 13, color: "rgba(238,238,255,0.4)", marginBottom: 20, lineHeight: 1.6 }}>The AI uses your name to personalise every session.</p>
            <input className="ob-input"
              placeholder="Your first name…"
              value={name}
              onChange={function(e) { setName(e.target.value); }}
              onKeyDown={function(e) { if (e.key === "Enter" && name.trim()) next(); }}
              autoFocus
              style={{
                width: "100%", padding: "13px 15px", borderRadius: 12,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#eeeeff", fontSize: 15,
                fontFamily: "'DM Sans',sans-serif",
                marginBottom: 20, boxSizing: "border-box",
              }}/>
            <div style={{ display: "flex", gap: 9 }}>
              <button onClick={back} style={backStyle}>← Back</button>
              <button onClick={next} disabled={!name.trim()} style={{ ...btnStyle, flex: 1, opacity: name.trim() ? 1 : 0.4 }}>
                {name.trim() ? "Hi " + name.split(" ")[0] + "! Continue →" : "Enter your name"}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: GOAL ── */}
        {step === 2 && (
          <div style={{ animation: "fadeIn .3s ease" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(124,92,252,0.8)", letterSpacing: ".14em", marginBottom: 9, fontFamily: "'Syne',sans-serif" }}>STEP 2 OF 5</div>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: 21, color: "#eeeeff", marginBottom: 7 }}>
              What's your first goal, {firstName}?
            </h2>
            <p style={{ fontSize: 13, color: "rgba(238,238,255,0.4)", marginBottom: 17, lineHeight: 1.6 }}>Don't overthink — you can add more later.</p>
            <input className="ob-input"
              placeholder="e.g. Learn Python, get fit, crack UPSC…"
              value={goalTitle}
              onChange={function(e) { setGoalTitle(e.target.value); }}
              onKeyDown={function(e) { if (e.key === "Enter") next(); }}
              autoFocus
              style={{
                width: "100%", padding: "13px 15px", borderRadius: 12,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#eeeeff", fontSize: 15,
                fontFamily: "'DM Sans',sans-serif",
                marginBottom: 13, boxSizing: "border-box",
              }}/>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginBottom: 20 }}>
              {GOAL_CATS.map(function(c) {
                var sel = goalCat === c.id;
                return (
                  <button key={c.id} onClick={function() { setGoalCat(c.id); }} style={{
                    padding: "9px 6px", borderRadius: 10, cursor: "pointer",
                    textAlign: "center",
                    border: sel ? "1px solid rgba(124,92,252,0.6)" : "1px solid rgba(255,255,255,0.08)",
                    background: sel ? "rgba(124,92,252,0.15)" : "rgba(255,255,255,0.03)",
                    transition: "all .15s", WebkitTapHighlightColor: "transparent",
                  }}>
                    <div style={{ fontSize: 16, marginBottom: 2 }}>{c.icon}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: sel ? "#a78bfa" : "rgba(238,238,255,0.5)", fontFamily: "'Syne',sans-serif" }}>{c.label}</div>
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 9 }}>
              <button onClick={back} style={backStyle}>← Back</button>
              <button onClick={next} style={{ ...btnStyle, flex: 1 }}>
                {goalTitle.trim() ? "Save & continue →" : "Skip for now →"}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: COACHING STYLE ── */}
        {step === 3 && (
          <div style={{ animation: "fadeIn .3s ease" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(124,92,252,0.8)", letterSpacing: ".14em", marginBottom: 9, fontFamily: "'Syne',sans-serif" }}>STEP 3 OF 5</div>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: 21, color: "#eeeeff", marginBottom: 7 }}>How do you like to be coached?</h2>
            <p style={{ fontSize: 13, color: "rgba(238,238,255,0.4)", marginBottom: 18, lineHeight: 1.6 }}>The AI adjusts its tone. Change anytime in Settings.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 20 }}>
              {COACHING_STYLES.map(function(s) {
                var sel = style === s.id;
                return (
                  <button key={s.id} onClick={function() { setStyle(s.id); }} style={{
                    display: "flex", alignItems: "center", gap: 13,
                    padding: "13px 15px", borderRadius: 13, cursor: "pointer",
                    border: sel ? "1px solid rgba(124,92,252,0.5)" : "1px solid rgba(255,255,255,0.08)",
                    background: sel ? "rgba(124,92,252,0.1)" : "rgba(255,255,255,0.02)",
                    transition: "all .18s", textAlign: "left",
                    WebkitTapHighlightColor: "transparent",
                  }}>
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{s.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: sel ? "#a78bfa" : "#eeeeff", fontFamily: "'Syne',sans-serif" }}>{s.label}</div>
                      <div style={{ fontSize: 11, color: "rgba(238,238,255,0.4)", marginTop: 1 }}>{s.desc}</div>
                    </div>
                    {sel && <div style={{ fontSize: 13, color: "#7c5cfc", fontWeight: 800, flexShrink: 0 }}>✓</div>}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 9 }}>
              <button onClick={back} style={backStyle}>← Back</button>
              <button onClick={next} style={{ ...btnStyle, flex: 1 }}>Almost done →</button>
            </div>
          </div>
        )}

        {/* ── STEP 4: VOICE + NOTIFICATIONS ── */}
        {step === 4 && (
          <FeatureSetupStep name={firstName} onDone={next}/>
        )}

        {/* ── STEP 5: DONE ── */}
        {step === 5 && (
          <div style={{ textAlign: "center", animation: "fadeIn .3s ease" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 14, animation: "pop .4s ease" }}>
              <BigButterfly size={60}/>
            </div>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: 22, color: "#eeeeff", marginBottom: 9 }}>
              You're all set, {firstName}! 🎉
            </h2>
            <p style={{ fontSize: 14, color: "rgba(238,238,255,0.5)", marginBottom: 22, lineHeight: 1.7 }}>
              Your AI coach is ready. You've earned <strong style={{ color: "#fbbf24" }}>+50 XP</strong> just for setting up!
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 24 }}>
              {[
                { done: true,                   text: "Profile personalised ✓"                                  },
                { done: !!goalTitle.trim(),      text: goalTitle.trim() ? "Goal: " + goalTitle.slice(0, 28) : "No goal yet — add one in My Goals" },
                { done: true,                   text: "Coaching style: " + (COACHING_STYLES.find(function(s) { return s.id === style; })?.label || "") },
                { done: localStorage.getItem("voice_auto") === "true", text: "AI Voice: " + (localStorage.getItem("voice_auto") === "true" ? "ON 🔊" : "OFF (enable in Settings → Voice)") },
                { done: typeof Notification !== "undefined" && Notification.permission === "granted", text: "Notifications: " + (typeof Notification !== "undefined" && Notification.permission === "granted" ? "ON 🔔" : "OFF (enable in Settings → Notifications)") },
                { done: true, text: "+50 XP earned 🏆" },
              ].map(function(item) {
                return (
                  <div key={item.text} style={{
                    display: "flex", alignItems: "center", gap: 9,
                    padding: "9px 13px", borderRadius: 11,
                    background: item.done ? "rgba(74,222,128,0.07)" : "rgba(255,255,255,0.03)",
                    border: "1px solid " + (item.done ? "rgba(74,222,128,0.2)" : "rgba(255,255,255,0.07)"),
                  }}>
                    <span style={{ fontSize: 13 }}>{item.done ? "✅" : "⏳"}</span>
                    <span style={{ fontSize: 12, color: item.done ? "rgba(238,238,255,0.8)" : "rgba(238,238,255,0.4)", textAlign: "left" }}>{item.text}</span>
                  </div>
                );
              })}
            </div>
            <button onClick={saveAndFinish} disabled={saving} style={{ ...btnStyle, width: "100%", fontSize: 15, padding: 15, opacity: saving ? 0.7 : 1 }}>
              {saving ? "Setting up…" : "🚀 Launch my dashboard"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Onboarding;