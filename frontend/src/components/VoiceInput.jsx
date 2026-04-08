import React, { useState, useRef } from "react";

/**
 * VoiceInput — mic button for Dashboard
 * Uses Web Speech API (Chrome/Edge). Falls back gracefully on Firefox/Safari.
 * "No speech detected" = user pressed mic but didn't speak (or mic permission denied).
 */
function VoiceInput({ onResult, disabled }) {
  var [listening, setListening]   = useState(false);
  var [errMsg,    setErrMsg]      = useState(null);
  var recognitionRef              = useRef(null);

  var supported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  function startListening() {
    setErrMsg(null);
    var SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRec) {
      setErrMsg("Voice not supported in this browser. Use Chrome.");
      return;
    }

    var rec = new SpeechRec();
    rec.lang           = "en-US";  // en-US is more reliable than en-IN for Web Speech API
    rec.interimResults = false;
    rec.maxAlternatives = 3;      // Try 3 alternatives for better accuracy
    rec.continuous     = false;
    recognitionRef.current = rec;
    setListening(true);

    rec.onresult = function(e) {
      var transcript = e.results[0][0].transcript;
      setListening(false);
      setErrMsg(null);
      if (onResult) onResult(transcript);
    };

    rec.onerror = function(e) {
      setListening(false);
      if (e.error === "no-speech") {
        setErrMsg("No speech heard — speak louder or closer to mic, then tap again.");
      } else if (e.error === "not-allowed") {
        setErrMsg("Mic blocked — click the 🔒 in Chrome's address bar → Allow microphone.");
      } else if (e.error === "network") {
        setErrMsg("Speech needs internet. Check your connection and try again.");
      } else if (e.error === "audio-capture") {
        setErrMsg("No microphone detected. Check your device settings.");
      } else {
        setErrMsg("Could not hear you. Tap the mic and speak clearly within 3 seconds.");
      }
      // Auto-clear after 5 seconds
      setTimeout(function(){ setErrMsg(null); }, 5000);
    };

    rec.onend = function() {
      setListening(false);
    };

    try {
      rec.start();
    } catch(err) {
      setListening(false);
      setErrMsg("Could not start microphone.");
    }
  }

  function stopListening() {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    setListening(false);
  }

  if (!supported) return null; // Hide entirely on unsupported browsers

  return (
    <div style={{ position:"relative" }}>
      <button
        onClick={listening ? stopListening : startListening}
        disabled={disabled}
        title={listening ? "Tap to stop" : "Tap to speak"}
        style={{
          display:"flex", alignItems:"center", justifyContent:"center",
          width:"42px", height:"42px", borderRadius:"12px",
          border:"1px solid " + (listening ? "rgba(248,113,113,0.5)" : "var(--border)"),
          background: listening ? "rgba(248,113,113,0.1)" : "var(--card)",
          cursor: disabled ? "not-allowed" : "pointer",
          transition:"all 0.2s",
          WebkitTapHighlightColor:"transparent",
          position:"relative",
          overflow:"hidden",
        }}
      >
        {/* Pulse ring when listening */}
        {listening && (
          <span style={{
            position:"absolute", inset:"-4px", borderRadius:"16px",
            border:"2px solid rgba(248,113,113,0.4)",
            animation:"micPulse 1s ease infinite",
          }} />
        )}

        {/* Mic SVG icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke={listening ? "#f87171" : "var(--muted)"}
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
          <path d="M19 10v2a7 7 0 01-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>

        <style>{`
          @keyframes micPulse {
            0%   { transform:scale(1); opacity:0.8; }
            50%  { transform:scale(1.12); opacity:0.3; }
            100% { transform:scale(1); opacity:0.8; }
          }
        `}</style>
      </button>

      {/* Error tooltip */}
      {errMsg && (
        <div style={{
          position:"absolute", bottom:"calc(100% + 8px)", right:0,
          background:"var(--card)", border:"1px solid rgba(248,113,113,0.35)",
          borderRadius:"10px", padding:"8px 12px",
          fontSize:"11px", color:"#f87171",
          whiteSpace:"normal", fontFamily:"'DM Sans',sans-serif",
          fontWeight:"600", zIndex:50,
          boxShadow:"0 4px 16px rgba(0,0,0,0.15)",
          animation:"fadeIn 0.2s ease",
          maxWidth:"240px", lineHeight:"1.5",
        }}>
          {errMsg}
          <div style={{
            position:"absolute", bottom:"-5px", right:"14px",
            width:"8px", height:"8px", background:"var(--card)",
            border:"1px solid rgba(248,113,113,0.35)",
            borderTop:"none", borderLeft:"none",
            transform:"rotate(45deg)",
          }} />
        </div>
      )}

      {/* Listening indicator text */}
      {listening && (
        <div style={{
          position:"absolute", bottom:"calc(100% + 8px)", right:0,
          background:"rgba(248,113,113,0.1)", border:"1px solid rgba(248,113,113,0.3)",
          borderRadius:"10px", padding:"6px 12px",
          fontSize:"11px", color:"#f87171",
          whiteSpace:"nowrap", fontFamily:"'DM Sans',sans-serif",
          fontWeight:"700", zIndex:50,
        }}>
          🎙 Listening... speak now
        </div>
      )}
    </div>
  );
}

export default VoiceInput;

