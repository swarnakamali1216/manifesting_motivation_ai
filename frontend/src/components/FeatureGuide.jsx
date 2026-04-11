import React, { useState, useEffect } from "react";

/**
 * FeatureGuide — a spotlight tooltip system that walks new users through
 * key features after onboarding. Shows once, dismissible at any time.
 *
 * Usage in App.jsx:
 *   import FeatureGuide from "./components/FeatureGuide";
 *   <FeatureGuide show={showGuide} onDone={() => setShowGuide(false)} onNavigate={onNavigate} />
 *
 * Trigger it after onboarding completes:
 *   After onComplete() → setShowGuide(true)
 */

var STEPS = [
  {
    id:      "home",
    icon:    "🏠",
    title:   "Your Dashboard",
    body:    "This is mission control. See your streak, mood trends, daily nudge and active goals — all in one place.",
    tip:     "Check in here every day to keep your streak alive 🔥",
    color:   "#7c5cfc",
    nav:     "home",
    navLabel:"Go to Dashboard",
  },
  {
    id:      "goals",
    icon:    "🎯",
    title:   "My Goals",
    body:    "Add any goal and the AI builds a personalised step-by-step roadmap. Complete steps to earn XP.",
    tip:     "Tap '+' on the Goals page to add your first goal!",
    color:   "#60a5fa",
    nav:     "goals",
    navLabel:"Go to My Goals",
  },
  {
    id:      "voice",
    icon:    "🔊",
    title:   "AI Voice Assistant",
    body:    "Your AI coach can speak every reply aloud. Go to Settings → Voice tab to turn it on and pick a voice.",
    tip:     "Works best with headphones 🎧",
    color:   "#fc5cf0",
    nav:     "settings",
    navLabel:"Open Settings → Voice",
    highlight: "voice",
  },
  {
    id:      "notif",
    icon:    "🔔",
    title:   "Daily Reminders",
    body:    "Never lose your streak. Enable browser notifications in Settings → Notifications to get a daily nudge.",
    tip:     "You can set your preferred reminder time too!",
    color:   "#4ade80",
    nav:     "settings",
    navLabel:"Open Settings → Notifications",
    highlight: "notifications",
  },
  {
    id:      "journal",
    icon:    "📔",
    title:   "Your Journal",
    body:    "Write freely — it's AES-256 encrypted. The AI reads your mood from your words and tracks it over time.",
    tip:     "Even one sentence a day makes a difference.",
    color:   "#fbbf24",
    nav:     "journal",
    navLabel:"Go to Journal",
  },
  {
    id:      "badges",
    icon:    "⚡",
    title:   "XP & Badges",
    body:    "Every action earns XP. Unlock 50 badges across 15 levels. See your progress in Badges & XP.",
    tip:     "Onboarding gave you +50 XP already 🎉",
    color:   "#fb923c",
    nav:     "badges",
    navLabel:"See my Badges",
  },
];

function FeatureGuide({ show, onDone, onNavigate }) {
  var [step,    setStep]    = useState(0);
  var [exiting, setExiting] = useState(false);

  // Reset when shown
  useEffect(function() {
    if (show) { setStep(0); setExiting(false); }
  }, [show]);

  if (!show) return null;

  var current = STEPS[step];
  var isLast  = step === STEPS.length - 1;

  function dismiss() {
    setExiting(true);
    setTimeout(function() {
      localStorage.setItem("feature_guide_done", "true");
      onDone();
    }, 280);
  }

  function goNext() {
    if (isLast) { dismiss(); return; }
    setStep(function(s) { return s + 1; });
  }

  function goPrev() {
    if (step === 0) return;
    setStep(function(s) { return s - 1; });
  }

  function goToFeature() {
    if (onNavigate) onNavigate(current.nav);
    dismiss();
  }

  return (
    <>
      <style>{`
        @keyframes guideIn  { from { opacity:0; transform:translateY(24px) scale(.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes guideOut { from { opacity:1; transform:translateY(0) scale(1); }     to { opacity:0; transform:translateY(12px) scale(.97); } }
        @keyframes iconPop  { 0%{transform:scale(.7);opacity:0} 60%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
        @keyframes progressFill { from{width:0} to{width:100%} }
        .guide-nav-btn:hover { opacity: .85 !important; transform: translateY(-1px) !important; }
        .guide-skip:hover    { color: rgba(238,238,255,.7) !important; }
      `}</style>

      {/* Dim backdrop */}
      <div onClick={dismiss} style={{
        position: "fixed", inset: 0,
        background: "rgba(5,5,15,0.75)",
        zIndex: 3000, backdropFilter: "blur(4px)",
        animation: exiting ? "guideOut .28s ease forwards" : "guideIn .32s ease",
      }}/>

      {/* Card */}
      <div style={{
        position: "fixed",
        bottom: 28, left: "50%",
        transform: "translateX(-50%)",
        zIndex: 3001,
        width: "100%", maxWidth: 420,
        padding: "0 16px",
        boxSizing: "border-box",
        animation: exiting ? "guideOut .28s ease forwards" : "guideIn .32s ease",
        pointerEvents: "all",
      }}>
        <div style={{
          background: "linear-gradient(160deg,#0f0f22,#0a0a1a)",
          border: "1px solid " + current.color + "44",
          borderRadius: 20,
          boxShadow: "0 32px 64px rgba(0,0,0,.6), 0 0 0 1px " + current.color + "22",
          overflow: "hidden",
        }}>
          {/* Progress bar */}
          <div style={{ height: 3, background: "rgba(255,255,255,0.06)" }}>
            <div style={{
              height: "100%",
              width: ((step + 1) / STEPS.length * 100) + "%",
              background: "linear-gradient(90deg," + current.color + ",#fc5cf0)",
              transition: "width .4s cubic-bezier(.4,0,.2,1)",
              borderRadius: 2,
            }}/>
          </div>

          <div style={{ padding: "22px 24px 24px" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {/* Icon */}
                <div key={step} style={{
                  width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                  background: current.color + "18",
                  border: "1px solid " + current.color + "40",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22,
                  animation: "iconPop .35s cubic-bezier(.4,0,.2,1)",
                }}>
                  {current.icon}
                </div>
                <div>
                  <div style={{
                    fontSize: 9, fontWeight: 800, letterSpacing: ".14em",
                    color: current.color, fontFamily: "'Syne',sans-serif",
                    marginBottom: 3, textTransform: "uppercase",
                  }}>
                    Feature {step + 1} of {STEPS.length}
                  </div>
                  <div style={{
                    fontFamily: "'Syne',sans-serif", fontWeight: 900,
                    fontSize: 16, color: "#eeeeff", letterSpacing: "-.3px",
                  }}>
                    {current.title}
                  </div>
                </div>
              </div>
              {/* Close */}
              <button onClick={dismiss} className="guide-skip" style={{
                background: "none", border: "none", cursor: "pointer",
                color: "rgba(238,238,255,.35)", fontSize: 20, lineHeight: 1,
                padding: 2, flexShrink: 0, transition: "color .18s",
              }}>×</button>
            </div>

            {/* Body */}
            <p style={{
              fontSize: 14, color: "rgba(238,238,255,.6)",
              lineHeight: 1.75, marginBottom: 12,
            }}>
              {current.body}
            </p>

            {/* Tip */}
            <div style={{
              padding: "9px 13px", borderRadius: 10, marginBottom: 20,
              background: current.color + "0f",
              border: "1px solid " + current.color + "25",
              fontSize: 12, color: current.color,
              fontWeight: 600, lineHeight: 1.5,
            }}>
              💡 {current.tip}
            </div>

            {/* Dot indicators */}
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 18 }}>
              {STEPS.map(function(_, i) {
                return (
                  <div key={i} onClick={function() { setStep(i); }}
                    style={{
                      width: i === step ? 18 : 6,
                      height: 6, borderRadius: 3,
                      background: i === step ? current.color : "rgba(255,255,255,.15)",
                      transition: "all .3s",
                      cursor: "pointer",
                    }}/>
                );
              })}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 8 }}>
              {step > 0 && (
                <button onClick={goPrev} style={{
                  padding: "10px 14px", borderRadius: 11,
                  background: "rgba(255,255,255,.06)",
                  border: "1px solid rgba(255,255,255,.1)",
                  color: "rgba(238,238,255,.6)",
                  fontFamily: "'DM Sans',sans-serif", fontWeight: 600,
                  fontSize: 13, cursor: "pointer",
                  transition: "all .18s", flexShrink: 0,
                }}>← Back</button>
              )}

              <button onClick={goToFeature} className="guide-nav-btn" style={{
                flex: 1, padding: "10px 14px", borderRadius: 11,
                background: current.color + "20",
                border: "1px solid " + current.color + "40",
                color: current.color,
                fontFamily: "'Syne',sans-serif", fontWeight: 700,
                fontSize: 13, cursor: "pointer",
                transition: "all .18s",
              }}>
                {current.navLabel} →
              </button>

              <button onClick={goNext} style={{
                flex: 1, padding: "10px 14px", borderRadius: 11,
                background: "linear-gradient(135deg,#7c5cfc,#fc5cf0)",
                border: "none", color: "#fff",
                fontFamily: "'Syne',sans-serif", fontWeight: 800,
                fontSize: 13, cursor: "pointer",
                boxShadow: "0 4px 16px rgba(124,92,252,.3)",
                transition: "all .18s",
              }}>
                {isLast ? "Let's go! 🚀" : "Next →"}
              </button>
            </div>

            {/* Skip all */}
            {!isLast && (
              <button onClick={dismiss} className="guide-skip" style={{
                width: "100%", marginTop: 10,
                background: "none", border: "none",
                color: "rgba(238,238,255,.2)", fontSize: 12,
                fontFamily: "'DM Sans',sans-serif",
                cursor: "pointer", transition: "color .18s",
              }}>
                Skip tour
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Hook to manage guide state — use in App.jsx
 *
 * const { showGuide, startGuide, dismissGuide } = useFeatureGuide();
 *
 * Call startGuide() after onboarding completes.
 * Pass showGuide, dismissGuide as props to <FeatureGuide>.
 */
export function useFeatureGuide() {
  var [showGuide, setShowGuide] = useState(false);

  function startGuide() {
    if (localStorage.getItem("feature_guide_done") !== "true") {
      setShowGuide(true);
    }
  }

  function dismissGuide() {
    setShowGuide(false);
    localStorage.setItem("feature_guide_done", "true");
  }

  return { showGuide, startGuide, dismissGuide };
}

export default FeatureGuide;