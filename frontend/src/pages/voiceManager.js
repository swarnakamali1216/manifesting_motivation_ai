/**
 * voiceManager.js
 * ─────────────────────────────────────────────────────────────
 * Single source of truth for TTS across Home, Goals, Checkin.
 *
 * HOW IT WORKS:
 *  - Picks browser voice ONCE and caches it
 *  - Listens for "voicechange" custom event — fired by Settings
 *    when user switches voice → clears cache → next speak() re-picks
 *  - Exports: speak(text), stop(), isSpeaking()
 *  - Works with both ElevenLabs (backend) and browser TTS fallback
 *
 * PERSONA VOICE MAP:
 *  mentor      → calm female (default)
 *  coach       → energetic male
 *  friend      → warm female
 *  motivational→ energetic male
 */

var API = "https://manifesting-motivation-backend.onrender.com/api";

// ── Internal state ─────────────────────────────────────────────
var _cachedVoice  = null;   // SpeechSynthesisVoice object, cached after first pick
var _audioEl      = null;   // current ElevenLabs Audio element
var _speaking     = false;
var _listeners    = [];     // components listening for speaking state changes

// ── Persona → voice gender map ─────────────────────────────────
var PERSONA_VOICE_GENDER = {
  mentor:       "female",
  coach:        "male",
  friend:       "female",
  motivational: "male",
  general:      "female",
  zen:          "female",
  hype:         "male",
};

var FEMALE_KEYWORDS = ["sara","rachel","elli","aria","zira","susan","karen","victoria","samantha","moira","female","woman"];
var MALE_KEYWORDS   = ["josh","james","daniel","david","alex","mark","lee","male","man"];

// ElevenLabs voice IDs that are female
var FEMALE_EL_IDS = [
  "EXAVITQu4vr4xnSDxMaL",
  "21m00Tcm4TlvDq8ikWAM",
  "AZnzlk1XvdvUeBnXmlld",
  "MF3mGyEYCl7XYWbV9V6O",
  "rachel",
];

function _getGender() {
  // 1. Check if persona has a preference
  var persona  = localStorage.getItem("coaching_persona") || "mentor";
  var fromPersona = PERSONA_VOICE_GENDER[persona];

  // 2. Check saved ElevenLabs voice ID
  var savedId  = localStorage.getItem("voice_persona") || "";
  var fromEL   = FEMALE_EL_IDS.includes(savedId) ? "female" : (savedId ? "male" : null);

  // EL setting wins over persona (user explicitly chose it in Settings)
  return fromEL || fromPersona || "female";
}

function _pickBrowserVoice() {
  if (_cachedVoice) return _cachedVoice;

  var voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
  if (!voices.length) return null;

  var gender  = _getGender();
  var pool    = voices.filter(function(v) { return v.lang && v.lang.startsWith("en"); });
  var keywords = gender === "female" ? FEMALE_KEYWORDS : MALE_KEYWORDS;

  var match = pool.filter(function(v) {
    var n = v.name.toLowerCase();
    return keywords.some(function(k) { return n.includes(k); });
  });

  _cachedVoice = (match.length ? match[0] : pool[0]) || null;
  console.log("[voiceManager] picked voice:", _cachedVoice?.name, "gender:", gender);
  return _cachedVoice;
}

function _setSpeaking(val) {
  _speaking = val;
  _listeners.forEach(function(fn) { try { fn(val); } catch(e) {} });
}

// ── Browser TTS chunked fallback ───────────────────────────────
function _speakChunked(text, onDone) {
  window.speechSynthesis.cancel();
  var voice     = _pickBrowserVoice();
  var sentences = (text || "").match(/[^.!?\n]+[.!?\n]*/g) || [text];
  var chunks    = [];
  var cur       = "";

  sentences.forEach(function(s) {
    if ((cur + s).length < 160) { cur += s; }
    else { if (cur.trim()) chunks.push(cur.trim()); cur = s; }
  });
  if (cur.trim()) chunks.push(cur.trim());
  if (!chunks.length) { if (onDone) onDone(); return; }

  var ci = 0;
  var wd = null;

  function startWd() {
    clearInterval(wd);
    wd = setInterval(function() {
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    }, 8000);
  }
  function stopWd() { clearInterval(wd); wd = null; }

  function next() {
    if (ci >= chunks.length) { stopWd(); if (onDone) onDone(); return; }
    var u   = new SpeechSynthesisUtterance(chunks[ci++]);
    u.rate  = 0.92;
    u.lang  = "en-IN";
    if (voice) u.voice = voice;
    u.onstart = startWd;
    u.onend   = function() { stopWd(); next(); };
    u.onerror = function() { stopWd(); if (onDone) onDone(); };
    window.speechSynthesis.speak(u);
  }
  next();
}

// ── Public API ─────────────────────────────────────────────────

/**
 * speak(text)
 * Speaks text using ElevenLabs if available, falls back to browser TTS.
 * Always stops previous audio first.
 */
export function speak(text) {
  if (!text) return;
  if (localStorage.getItem("voice_auto") !== "true") return;

  // Stop current audio
  stop();
  _setSpeaking(true);

  if (localStorage.getItem("el_unavailable") === "1") {
    _speakChunked(text, function() { _setSpeaking(false); });
    return;
  }

  var voiceId = localStorage.getItem("voice_persona") || "";
  fetch(API + "/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: text.slice(0, 400), voice_name: voiceId }),
  })
    .then(function(res) {
      if (!res.ok) throw new Error("EL " + res.status);
      return res.blob();
    })
    .then(function(blob) {
      var url   = URL.createObjectURL(blob);
      var audio = new Audio(url);
      _audioEl  = audio;
      audio.onended = function() {
        _setSpeaking(false);
        URL.revokeObjectURL(url);
        _audioEl = null;
      };
      audio.onerror = function() {
        URL.revokeObjectURL(url);
        _audioEl = null;
        _speakChunked(text, function() { _setSpeaking(false); });
      };
      audio.play().catch(function() {
        _speakChunked(text, function() { _setSpeaking(false); });
      });
    })
    .catch(function(err) {
      if (err.message && (err.message.includes("401") || err.message.includes("403"))) {
        localStorage.setItem("el_unavailable", "1");
      }
      _speakChunked(text, function() { _setSpeaking(false); });
    });
}

/**
 * stop()
 * Immediately stops any current speech.
 */
export function stop() {
  if (_audioEl) {
    _audioEl.pause();
    _audioEl.src = "";
    _audioEl = null;
  }
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  _setSpeaking(false);
}

/**
 * isSpeaking()
 * Returns current speaking state.
 */
export function isSpeaking() {
  return _speaking;
}

/**
 * onSpeakingChange(fn)
 * Subscribe to speaking state changes.
 * Returns unsubscribe function.
 */
export function onSpeakingChange(fn) {
  _listeners.push(fn);
  return function() {
    _listeners = _listeners.filter(function(l) { return l !== fn; });
  };
}

/**
 * notifyVoiceChanged()
 * Call this from Settings.jsx when user picks a new voice.
 * Clears cache so next speak() picks the correct new voice.
 */
export function notifyVoiceChanged() {
  _cachedVoice = null;
  console.log("[voiceManager] voice cache cleared — will re-pick on next speak");
}

/**
 * notifyPersonaChanged()
 * Call this from persona selector when user switches persona.
 * Clears voice cache so gender preference is re-evaluated.
 */
export function notifyPersonaChanged() {
  _cachedVoice = null;
  console.log("[voiceManager] persona changed — voice cache cleared");
}

// ── Auto-reload voices when browser loads them async ──────────
if (typeof window !== "undefined" && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = function() {
    // Only clear if not yet cached — don't interrupt a session
    if (!_cachedVoice) {
      console.log("[voiceManager] voices loaded by browser");
    }
  };
}

// ── Listen for voice change events from Settings ───────────────
if (typeof window !== "undefined") {
  window.addEventListener("voicechange", function() {
    notifyVoiceChanged();
  });
  window.addEventListener("personachange", function() {
    notifyPersonaChanged();
  });
}