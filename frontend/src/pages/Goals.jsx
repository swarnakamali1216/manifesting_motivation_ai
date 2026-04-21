/**
 * Goals.jsx — Fixed:
 * 1. 🤖 robot replaced with ButterflyMini SVG logo in IntakeInterview loader
 * 2. Resource URLs open in new tab correctly (no login redirect)
 * 3. ESLint: no-control-regex fixed (no \b in string regexes)
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
var API = "https://manifesting-motivation-backend.onrender.com/api";

// ── Butterfly logo (used in AI loading state) ─────────────────────────────────
function ButterflyMini({ size }) {
  var s = size || 28;
  return (
    <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 20 C16 14,6 10,4 16 C2 22,10 26,20 20Z"   fill="url(#gbl1)" opacity="0.93"/>
      <path d="M20 20 C24 14,34 10,36 16 C38 22,30 26,20 20Z" fill="url(#gbl2)" opacity="0.93"/>
      <path d="M20 20 C15 24,6 26,5 32 C4 36,12 36,20 20Z"   fill="url(#gbl3)" opacity="0.85"/>
      <path d="M20 20 C25 24,34 26,35 32 C36 36,28 36,20 20Z" fill="url(#gbl4)" opacity="0.85"/>
      <ellipse cx="20" cy="20" rx="1.2" ry="5.5" fill="white" opacity="0.9"/>
      <line x1="20" y1="15" x2="16" y2="9" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.85"/>
      <line x1="20" y1="15" x2="24" y2="9" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.85"/>
      <circle cx="16" cy="9" r="1.1" fill="white" opacity="0.9"/>
      <circle cx="24" cy="9" r="1.1" fill="white" opacity="0.9"/>
      <defs>
        <linearGradient id="gbl1" x1="4"  y1="10" x2="20" y2="26" gradientUnits="userSpaceOnUse"><stop stopColor="#c4b5fd"/><stop offset="1" stopColor="#e9d5ff"/></linearGradient>
        <linearGradient id="gbl2" x1="36" y1="10" x2="20" y2="26" gradientUnits="userSpaceOnUse"><stop stopColor="#fce7f3"/><stop offset="1" stopColor="#c4b5fd"/></linearGradient>
        <linearGradient id="gbl3" x1="5"  y1="26" x2="20" y2="36" gradientUnits="userSpaceOnUse"><stop stopColor="#ddd6fe"/><stop offset="1" stopColor="#7c5cfc"/></linearGradient>
        <linearGradient id="gbl4" x1="35" y1="26" x2="20" y2="36" gradientUnits="userSpaceOnUse"><stop stopColor="#fce7f3"/><stop offset="1" stopColor="#a78bfa"/></linearGradient>
      </defs>
    </svg>
  );
}

// ── Voice hook ────────────────────────────────────────────────────────────────
// ── Voice names for browser TTS fallback ──
var FEMALE_VOICE_IDS = ["EXAVITQu4vr4xnSDxMaL","21m00Tcm4TlvDq8ikWAM","AZnzlk1XvdvUeBnXmlld","MF3mGyEYCl7XYWbV9V6O"];
function getBestBrowserVoice(vName) {
  var voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
  if (!voices.length) return null;
  var isFemale = FEMALE_VOICE_IDS.includes(vName) || vName === "rachel";
  var pool = voices.filter(function(v){ return v.lang && v.lang.startsWith("en"); });
  var nameList = isFemale
    ? ["sara","rachel","elli","aria","zira","susan","karen","samantha","female","woman"]
    : ["josh","james","daniel","david","alex","mark","male","man"];
  var match = pool.filter(function(v){
    var n = v.name.toLowerCase();
    return nameList.some(function(w){ return n.includes(w); });
  });
  return (match.length ? match[0] : pool[0]) || null;
}
function speakChunkedBrowser(text, vName, onDone) {
  window.speechSynthesis.cancel();
  var sentences = (text||"").split(/\. |! |\? /).filter(Boolean);
  var chunks = [], cur = "";
  sentences.forEach(function(s){ if((cur+s).length<150){cur+=s;}else{if(cur.trim())chunks.push(cur.trim());cur=s;} });
  if(cur.trim()) chunks.push(cur.trim());
  if(!chunks.length){ if(onDone) onDone(); return; }
  var voice = getBestBrowserVoice(vName);
  var ci = 0;
  var wd = null;
  function startWd(){ clearInterval(wd); wd=setInterval(function(){ if(window.speechSynthesis.paused) window.speechSynthesis.resume(); },8000); }
  function stopWd(){ clearInterval(wd); wd=null; }
  function next(){
    if(ci>=chunks.length){ stopWd(); if(onDone) onDone(); return; }
    var u = new SpeechSynthesisUtterance(chunks[ci++]);
    u.rate=0.92; u.lang="en-IN";
    if(voice) u.voice=voice;
    u.onstart=startWd;
    u.onend=function(){ stopWd(); next(); };
    u.onerror=function(){ stopWd(); if(onDone) onDone(); };
    window.speechSynthesis.speak(u);
  }
  next();
}

function useVoice() {
  var audioRef = useRef(null);
  var [speaking, setSpeaking] = useState(false);
  function speak(text) {
    if (!text) return;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeaking(true);
    var vName = localStorage.getItem("voice_persona") || "rachel";
    // Skip ElevenLabs immediately if already known bad
    if (localStorage.getItem("el_unavailable") === "1") {
      speakChunkedBrowser(text, vName, function(){ setSpeaking(false); });
      return;
    }
    axios.post(API + "/speak", { text: text.slice(0, 400), voice_name: vName }, { responseType:"blob", timeout:18000 })
      .then(function(res) {
        var url = URL.createObjectURL(res.data);
        var audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = function() { setSpeaking(false); URL.revokeObjectURL(url); };
        audio.onerror = function() { setSpeaking(false); };
        audio.play().catch(function() { setSpeaking(false); });
      })
      .catch(function(err) {
        // Mark ElevenLabs unavailable permanently
        localStorage.setItem("el_unavailable","1");
        speakChunkedBrowser(text, vName, function(){ setSpeaking(false); });
      });
  }
  function stop() {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeaking(false);
  }
  return { speak, stop, speaking };
}

var CAT = {
  general:     { icon:"🎯", color:"#a78bfa", glow:"rgba(167,139,250,0.35)", bg:"rgba(167,139,250,0.1)",  label:"General"      },
  academic:    { icon:"📚", color:"#7c5cfc", glow:"rgba(124,92,252,0.35)",  bg:"rgba(124,92,252,0.1)",   label:"Academic"     },
  career:      { icon:"💼", color:"#fbbf24", glow:"rgba(251,191,36,0.35)",  bg:"rgba(251,191,36,0.1)",   label:"Career"       },
  fitness:     { icon:"💪", color:"#4ade80", glow:"rgba(74,222,128,0.35)",  bg:"rgba(74,222,128,0.1)",   label:"Fitness"      },
  personal:    { icon:"🌱", color:"#60a5fa", glow:"rgba(96,165,250,0.35)",  bg:"rgba(96,165,250,0.1)",   label:"Personal"     },
  study:       { icon:"✏️", color:"#fb923c", glow:"rgba(251,146,60,0.35)",  bg:"rgba(251,146,60,0.1)",   label:"Study"        },
  health:      { icon:"❤️", color:"#f87171", glow:"rgba(248,113,113,0.35)", bg:"rgba(248,113,113,0.1)",  label:"Health"       },
  finance:     { icon:"💰", color:"#fbbf24", glow:"rgba(251,191,36,0.35)",  bg:"rgba(251,191,36,0.1)",   label:"Finance"      },
  creative:    { icon:"🎨", color:"#fb923c", glow:"rgba(251,146,60,0.35)",  bg:"rgba(251,146,60,0.1)",   label:"Creative"     },
  language:    { icon:"🌍", color:"#60a5fa", glow:"rgba(96,165,250,0.35)",  bg:"rgba(96,165,250,0.1)",   label:"Language"     },
  productivity:{ icon:"⚡", color:"#a78bfa", glow:"rgba(167,139,250,0.35)", bg:"rgba(167,139,250,0.1)",  label:"Productivity" },
};

var XP = { step_done:15, step_skipped:10, goal_complete:100 };

var QUESTIONS = [
  { key:"daily_time",     q:"How much time per day?",        sub:"Be honest — even 15 mins builds real progress",
    opts:[{v:"15 mins",icon:"⚡",d:"Quick habit"},{v:"30 mins",icon:"🕐",d:"Focused"},{v:"1 hour",icon:"🎯",d:"Deep work"},{v:"2+ hours",icon:"🔥",d:"All in"}] },
  { key:"learning_style", q:"How do you learn best?",        sub:"AI matches resources to your style",
    opts:[{v:"videos",icon:"🎥",d:"Watch & learn"},{v:"reading",icon:"📖",d:"Read deeply"},{v:"practice",icon:"💻",d:"Hands-on"},{v:"mix",icon:"🌈",d:"Variety"}] },
  { key:"current_level",  q:"Your current level?",           sub:"AI adapts to exactly where you are",
    opts:[{v:"complete_beginner",icon:"🌱",d:"Starting fresh"},{v:"some_knowledge",icon:"📚",d:"Know basics"},{v:"intermediate",icon:"⚡",d:"Have experience"},{v:"advanced",icon:"🚀",d:"Master it"}] },
  { key:"timeline",       q:"How long to achieve this goal?",sub:"This determines how many steps your roadmap will have",
    opts:[{v:"1 week",icon:"📅",d:"Quick sprint"},{v:"1 month",icon:"🗓",d:"Steady pace"},{v:"3 months",icon:"📆",d:"Real depth"},{v:"6 months",icon:"🏔",d:"Full mastery"}] },
  { key:"depth",          q:"How deeply do you want to go?", sub:"Basics = fewer steps. Mastery = many more steps",
    opts:[{v:"basics",icon:"🌱",d:"Fundamentals only"},{v:"core",icon:"⚡",d:"Working knowledge"},{v:"mastery",icon:"🏆",d:"Deep expertise"}] },
];

function previewStepCount(timeline, daily_time, depth) {
  var days = {"1 week":7,"2 weeks":14,"1 month":30,"3 months":90,"6 months":180}[timeline]||30;
  var mins = {"15 mins":15,"30 mins":30,"1 hour":60,"2+ hours":120}[daily_time]||30;
  var mult = {"basics":0.5,"core":1.0,"mastery":1.6}[depth]||1.0;
  return Math.max(3, Math.min(50, Math.ceil((days * mins * mult) / 60)));
}

// ── Safe URL helper — ensures links open correctly without redirecting ─────────
function safeUrl(url) {
  if (!url) return null;
  var u = String(url).trim();
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  if (u.startsWith("//")) return "https:" + u;
  if (u.startsWith("www.")) return "https://" + u;
  // Relative or malformed URLs would trigger login — return null to hide link
  if (!u.includes(".")) return null;
  return "https://" + u;
}

function XPPop({ xp, onDone }) {
  useEffect(function(){ var t=setTimeout(onDone,1400); return function(){ clearTimeout(t); }; }, []); // eslint-disable-line
  return (
    <div style={{ position:"fixed", bottom:"90px", right:"16px", zIndex:9999, animation:"xpPop 1.4s ease forwards", pointerEvents:"none" }}>
      <div style={{ background:"linear-gradient(135deg,#7c5cfc,#fc5cf0)", borderRadius:"50px", padding:"10px 18px", boxShadow:"0 8px 28px rgba(124,92,252,0.5)", display:"flex", alignItems:"center", gap:"8px" }}>
        <span style={{ fontSize:"20px" }}>⚡</span>
        <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:"900", fontSize:"20px", color:"white" }}>+{xp} XP</span>
      </div>
      <style>{`@keyframes xpPop{0%{opacity:0;transform:translateY(0) scale(0.7)}20%{opacity:1;transform:translateY(-20px) scale(1.15)}80%{opacity:1;transform:translateY(-40px) scale(1)}100%{opacity:0;transform:translateY(-60px) scale(0.9)}}`}</style>
    </div>
  );
}

function Confetti() {
  var colors=["#7c5cfc","#fc5cf0","#4ade80","#fbbf24","#60a5fa","#fb923c"];
  return (
    <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:9998, overflow:"hidden" }}>
      {Array.from({length:30}).map(function(_,i){
        var c=colors[i%colors.length];
        return <div key={i} style={{ position:"absolute", left:(Math.random()*100)+"%", top:"-10px", width:(6+Math.random()*7)+"px", height:(6+Math.random()*7)+"px", background:c, borderRadius:Math.random()>0.5?"50%":"2px", animation:"cFall 1.8s "+(Math.random()*0.5)+"s ease forwards" }}/>;
      })}
      <style>{`@keyframes cFall{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(110vh) rotate(720deg);opacity:0}}`}</style>
    </div>
  );
}

function IntakeInterview({ goalId, goalTitle, userId, onDone }) {
  var [step,    setStep]    = useState(0);
  var [answers, setAnswers] = useState({ daily_time:"", learning_style:"", current_level:"", timeline:"", depth:"" });
  var [loading, setLoading] = useState(false);
  var q = QUESTIONS[step];

  var stepPreview = (answers.timeline && answers.daily_time && answers.depth)
    ? previewStepCount(answers.timeline, answers.daily_time, answers.depth)
    : null;

  function next() {
    if (!answers[q.key]) return;
    if (step < QUESTIONS.length - 1) { setStep(step + 1); return; }
    setLoading(true);
    axios.post(API + "/adaptive/interview", { goal_id:goalId, user_id:userId, ...answers })
      .then(function(r){ onDone(r.data.roadmap, answers, r.data.num_steps); })
      .catch(function(){ onDone(null, answers, null); })
      .finally(function(){ setLoading(false); });
  }

  if (loading) return (
    <div style={{ textAlign:"center", padding:"40px 24px" }}>
      {/* ── Butterfly replaces robot emoji ── */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"14px" }}>
        <div style={{ width:64, height:64, borderRadius:18, background:"linear-gradient(135deg,#7c5cfc,#fc5cf8)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 8px 28px rgba(124,92,252,0.4)", animation:"pulse 1.4s ease infinite" }}>
          <ButterflyMini size={38}/>
        </div>
      </div>
      <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:"800", fontSize:"17px", color:"var(--accent)", marginBottom:"6px" }}>
        Building your {stepPreview||"personalised"}-step quest map...
      </div>
      <div style={{ fontSize:"12px", color:"var(--muted)" }}>Calibrating every step to your timeline and pace</div>
      <style>{`@keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.08);opacity:0.85}}`}</style>
    </div>
  );

  return (
    <div style={{ animation:"fadeIn 0.25s ease" }}>
      <div style={{ display:"flex", justifyContent:"center", gap:"5px", marginBottom:"18px" }}>
        {QUESTIONS.map(function(_,i){
          return <div key={i} style={{ height:"6px", borderRadius:"3px", background:i<=step?"linear-gradient(90deg,#7c5cfc,#fc5cf0)":"var(--border)", width:i===step?"28px":"10px", transition:"all 0.3s" }}/>;
        })}
      </div>
      <div style={{ marginBottom:"18px", textAlign:"center" }}>
        <div style={{ fontSize:"10px", color:"var(--accent)", fontWeight:"800", letterSpacing:"0.12em", fontFamily:"'Syne',sans-serif", marginBottom:"5px" }}>STEP {step+1} OF {QUESTIONS.length}</div>
        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:"900", fontSize:"16px", color:"var(--text)", marginBottom:"4px", lineHeight:1.3 }}>{q.q}</div>
        <div style={{ fontSize:"11px", color:"var(--muted)" }}>{q.sub}</div>
        {goalTitle && <div style={{ marginTop:"6px", fontSize:"10px", color:"var(--muted)" }}>For: <strong style={{ color:"var(--accent)" }}>{goalTitle}</strong></div>}
      </div>
      {step >= 3 && stepPreview && (
        <div style={{ marginBottom:"14px", padding:"10px 14px", borderRadius:"12px", background:"rgba(124,92,252,0.07)", border:"1px solid rgba(124,92,252,0.2)", display:"flex", alignItems:"center", gap:"10px" }}>
          <span style={{ fontSize:"18px" }}>🗺️</span>
          <div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:"800", fontSize:"13px", color:"var(--accent)" }}>Your roadmap: ~{stepPreview} steps</div>
            <div style={{ fontSize:"10px", color:"var(--muted)" }}>Changes as you adjust timeline and depth</div>
          </div>
        </div>
      )}
      <div style={{ display:"grid", gridTemplateColumns:q.opts.length===3?"1fr 1fr 1fr":"1fr 1fr", gap:"8px", marginBottom:"16px" }}>
        {q.opts.map(function(opt){
          var sel = answers[q.key] === opt.v;
          return (
            <button key={opt.v} onClick={function(){ setAnswers(function(p){ return {...p,[q.key]:opt.v}; }); }}
              style={{ padding:"16px 10px", borderRadius:"14px", cursor:"pointer", textAlign:"center", border:sel?"2px solid #7c5cfc":"1px solid var(--border)", background:sel?"rgba(124,92,252,0.12)":"var(--bg)", transition:"all 0.18s", transform:sel?"translateY(-2px)":"none", boxShadow:sel?"0 6px 18px rgba(124,92,252,0.22)":"none", WebkitTapHighlightColor:"transparent" }}>
              <div style={{ fontSize:"24px", marginBottom:"6px" }}>{opt.icon}</div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:"800", fontSize:"11px", color:sel?"#a78bfa":"var(--text)", marginBottom:"2px", lineHeight:1.3 }}>{opt.v}</div>
              <div style={{ fontSize:"9px", color:"var(--muted)" }}>{opt.d}</div>
              {sel && <div style={{ marginTop:"4px", fontSize:"9px", color:"#7c5cfc", fontWeight:"800" }}>✓ SELECTED</div>}
            </button>
          );
        })}
      </div>
      <button onClick={next} disabled={!answers[q.key]} style={{ width:"100%", padding:"14px", borderRadius:"14px", cursor:answers[q.key]?"pointer":"not-allowed", background:answers[q.key]?"linear-gradient(135deg,#7c5cfc,#fc5cf0)":"var(--border)", border:"none", color:"white", fontFamily:"'Syne',sans-serif", fontWeight:"900", fontSize:"14px", transition:"all 0.2s", opacity:answers[q.key]?1:0.45, boxShadow:answers[q.key]?"0 8px 24px rgba(124,92,252,0.38)":"none", WebkitTapHighlightColor:"transparent", minHeight:"48px" }}>
        {step < QUESTIONS.length - 1 ? "Next →" : stepPreview ? "Build My "+stepPreview+"-Step Roadmap" : "Build My Roadmap"}
      </button>
    </div>
  );
}

function QuestStep({ step:s, index:i, isDone, isActive, isLocked, isFailed, onStart, onSubmit, steps, goalId, userId, totalDone }) {
  var [answer,     setAnswer]     = useState("");
  var [submitting, setSubmitting] = useState(false);
  var [struggling, setStruggling] = useState(false);
  var [microTasks, setMicroTasks] = useState(null);
  var isCurrent = !isLocked && !isDone;

  function handleSubmit(skipped) {
    setSubmitting(true);
    axios.post(API + "/adaptive/prove/" + goalId + "/" + i, { user_id:userId, answer:skipped?"skipped":answer, skipped })
      .then(function(r){ onSubmit(i, r.data, skipped); setAnswer(""); })
      .catch(function(){})
      .finally(function(){ setSubmitting(false); });
  }

  function handleStruggle() {
    setStruggling(true);
    axios.post(API + "/adaptive/struggle/" + goalId + "/" + i, { user_id:userId, message:"I am struggling" })
      .then(function(r){ setMicroTasks(r.data.micro_tasks||[]); })
      .catch(function(){})
      .finally(function(){ setStruggling(false); });
  }

  // ── safe URL — prevents relative URLs from redirecting to login ──────────
  var resourceUrl = safeUrl(s.resource);

  return (
    <div style={{ position:"relative", marginBottom:"8px", opacity:isLocked?0.35:1, transition:"opacity 0.3s" }}>
      {i < steps.length - 1 && (
        <div style={{ position:"absolute", left:"20px", top:"48px", width:"2px", height:"calc(100% + 0px)", background:isDone?"linear-gradient(180deg,#4ade80,rgba(74,222,128,0.08))":"var(--border)", zIndex:0, transition:"background 0.5s" }}/>
      )}
      <div style={{ position:"relative", zIndex:1, background:isDone?"rgba(74,222,128,0.05)":isActive?"rgba(124,92,252,0.07)":isCurrent&&i===totalDone?"rgba(124,92,252,0.03)":"var(--card)", borderRadius:"16px", padding:"14px 16px", border:isDone?"1px solid rgba(74,222,128,0.28)":isFailed?"1px solid rgba(251,191,36,0.35)":isActive?"1px solid rgba(124,92,252,0.3)":isCurrent&&i===totalDone?"1px solid rgba(124,92,252,0.2)":"1px solid var(--border)", transition:"all 0.3s", boxShadow:isActive?"0 4px 20px rgba(124,92,252,0.1)":isDone?"0 2px 8px rgba(74,222,128,0.08)":"none" }}>
        {isCurrent && i === totalDone && !isActive && (
          <div style={{ position:"absolute", top:"-10px", left:"14px", background:"linear-gradient(90deg,#7c5cfc,#fc5cf0)", borderRadius:"8px", padding:"2px 10px", fontSize:"9px", fontWeight:"800", color:"white", fontFamily:"'Syne',sans-serif", letterSpacing:"0.06em" }}>▶ YOUR TURN</div>
        )}
        <div style={{ display:"flex", gap:"10px", alignItems:"flex-start" }}>
          <div style={{ width:"36px", height:"36px", minWidth:"36px", borderRadius:"50%", background:isDone?"linear-gradient(135deg,#4ade80,#22c55e)":isActive?"linear-gradient(135deg,#7c5cfc,#fc5cf0)":"var(--bg)", border:isDone||isActive?"none":"2px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Syne',sans-serif", fontWeight:"900", fontSize:"13px", color:isDone||isActive?"white":isLocked?"var(--muted)":"var(--text)", boxShadow:isDone?"0 4px 12px rgba(74,222,128,0.4)":isActive?"0 4px 12px rgba(124,92,252,0.4)":"none", transition:"all 0.3s" }}>
            {isDone?"✓":isLocked?"🔒":i+1}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"6px", marginBottom:"3px", flexWrap:"wrap" }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:"800", fontSize:"13px", color:isDone?"#4ade80":"var(--text)", textDecoration:isDone?"line-through":"none", opacity:isDone?0.7:1, flex:1, minWidth:0, lineHeight:1.3 }}>{s.title}</div>
              <div style={{ display:"flex", gap:"4px", flexShrink:0 }}>
                <span style={{ fontSize:"9px", padding:"2px 7px", borderRadius:"6px", background:"rgba(124,92,252,0.1)", color:"var(--accent)", fontWeight:"700", border:"1px solid rgba(124,92,252,0.2)", whiteSpace:"nowrap" }}>+{XP.step_done}XP</span>
                <span style={{ fontSize:"9px", padding:"2px 7px", borderRadius:"6px", background:"var(--bg)", color:"var(--muted)", border:"1px solid var(--border)", whiteSpace:"nowrap" }}>{s.duration}</span>
              </div>
            </div>
            <div style={{ fontSize:"12px", color:"var(--muted)", lineHeight:"1.55", marginBottom:(!isDone&&!isLocked)?8:0 }}>{s.guidance}</div>
            {s.proof_question && !isDone && !isLocked && (
              <div style={{ fontSize:"11px", color:"#a78bfa", padding:"6px 10px", borderRadius:"8px", background:"rgba(124,92,252,0.06)", border:"1px solid rgba(124,92,252,0.15)", marginBottom:"10px", lineHeight:"1.5" }}>💬 {s.proof_question}</div>
            )}
            {!isDone && !isLocked && !isActive && (
              <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
                {resourceUrl && (
                  <div style={{ width:"100%", marginBottom:"6px" }}>
                    {/* Resource label — tells user what they'll find before clicking */}
                    <div style={{ fontSize:"10px", color:"var(--muted)", marginBottom:"4px", display:"flex", alignItems:"center", gap:"4px" }}>
                      <span style={{ fontWeight:"700", color:"#60a5fa" }}>📎 Resource:</span>
                      <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"240px", opacity:0.7 }}>
                        {resourceUrl.replace(/^https?:\/\/(www\.)?/,"").split("?")[0].slice(0,50)}
                      </span>
                    </div>
                    <a href={resourceUrl} target="_blank" rel="noreferrer noopener"
                      style={{ display:"inline-flex", alignItems:"center", gap:"6px", padding:"7px 12px", borderRadius:"10px", background:"rgba(96,165,250,0.08)", border:"1px solid rgba(96,165,250,0.3)", color:"#60a5fa", fontSize:"11px", textDecoration:"none", fontWeight:"700", WebkitTapHighlightColor:"transparent", marginBottom:"6px" }}>
                      🔗 Open Resource →
                    </a>
                    {s.resource_how_to && (
                      <div style={{ padding:"9px 12px", borderRadius:"10px", background:"rgba(96,165,250,0.05)", border:"1px solid rgba(96,165,250,0.15)", fontSize:"11px", color:"var(--muted)", lineHeight:"1.6" }}>
                        <span style={{ fontWeight:"800", color:"#60a5fa", fontSize:"10px" }}>HOW TO USE: </span>{s.resource_how_to}
                      </div>
                    )}
                  </div>
                )}
                <button onClick={onStart} style={{ padding:"6px 14px", minHeight:"34px", borderRadius:"8px", border:"1px solid rgba(124,92,252,0.3)", background:"rgba(124,92,252,0.08)", color:"var(--accent)", fontSize:"11px", cursor:"pointer", fontFamily:"'Syne',sans-serif", fontWeight:"800", WebkitTapHighlightColor:"transparent" }}>✅ I Did This</button>
                <button onClick={handleStruggle} disabled={struggling} style={{ padding:"6px 12px", minHeight:"34px", borderRadius:"8px", border:"1px solid rgba(248,113,113,0.2)", background:"rgba(248,113,113,0.05)", color:"#f87171", fontSize:"11px", cursor:"pointer", fontFamily:"'Syne',sans-serif", fontWeight:"700", WebkitTapHighlightColor:"transparent" }}>{struggling?"...":"🆘 Help"}</button>
              </div>
            )}
          </div>
        </div>
        {microTasks && microTasks.length > 0 && (
          <div style={{ marginTop:"12px", padding:"12px 14px", borderRadius:"12px", background:"rgba(96,165,250,0.06)", border:"1px solid rgba(96,165,250,0.2)" }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:"9px", fontWeight:"800", color:"#60a5fa", marginBottom:"8px", letterSpacing:"0.1em" }}>🔧 MINI-QUESTS</div>
            {microTasks.map(function(t,mi){
              return (
                <div key={mi} style={{ display:"flex", gap:"8px", marginBottom:"7px", padding:"8px 10px", borderRadius:"10px", background:"var(--bg)", border:"1px solid var(--border)" }}>
                  <div style={{ width:"18px", height:"18px", minWidth:"18px", borderRadius:"50%", background:"#60a5fa", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"9px", color:"white", fontWeight:"900" }}>{mi+1}</div>
                  <div>
                    <div style={{ fontSize:"11px", fontWeight:"700", color:"var(--text)", marginBottom:"2px" }}>{t.title}</div>
                    <div style={{ fontSize:"10px", color:"var(--muted)" }}>{t.guidance} · {t.duration}</div>
                  </div>
                </div>
              );
            })}
            <button onClick={function(){ setMicroTasks(null); }} style={{ fontSize:"10px", color:"var(--muted)", background:"none", border:"none", cursor:"pointer", marginTop:"4px" }}>Dismiss ✕</button>
          </div>
        )}
        {isActive && !isDone && (
          <div style={{ marginTop:"12px", padding:"14px", borderRadius:"12px", background:"rgba(124,92,252,0.05)", border:"1px solid rgba(124,92,252,0.18)", animation:"fadeIn 0.2s ease" }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:"800", fontSize:"12px", color:"var(--accent)", marginBottom:"3px" }}>What did you do? (optional)</div>
            <div style={{ fontSize:"11px", color:"var(--muted)", marginBottom:"8px" }}>Write anything or skip for +{XP.step_skipped} XP.</div>
            <textarea value={answer} onChange={function(e){ setAnswer(e.target.value); }}
              placeholder='e.g. "I completed the exercise and it worked on first try!"'
              style={{ width:"100%", boxSizing:"border-box", padding:"10px 12px", borderRadius:"10px", border:"1px solid var(--border)", background:"var(--bg)", color:"var(--text)", fontSize:"12px", resize:"vertical", minHeight:"60px", outline:"none", lineHeight:"1.6", fontFamily:"'DM Sans',sans-serif" }}
              onFocus={function(e){ e.target.style.borderColor="rgba(124,92,252,0.4)"; }}
              onBlur={function(e){ e.target.style.borderColor="var(--border)"; }}
            />
            <div style={{ display:"flex", gap:"8px", marginTop:"8px" }}>
              <button onClick={function(){ handleSubmit(false); }} disabled={submitting} style={{ flex:1, padding:"11px", minHeight:"44px", borderRadius:"10px", background:"linear-gradient(135deg,#7c5cfc,#fc5cf0)", border:"none", color:"white", fontFamily:"'Syne',sans-serif", fontWeight:"900", fontSize:"12px", cursor:"pointer", opacity:submitting?0.6:1, boxShadow:"0 4px 14px rgba(124,92,252,0.35)" }}>
                {submitting?"Saving...":"⚡ Complete +"+XP.step_done+" XP"}
              </button>
              <button onClick={function(){ handleSubmit(true); }} disabled={submitting} style={{ padding:"11px 14px", minHeight:"44px", borderRadius:"10px", background:"transparent", border:"1px solid var(--border)", color:"var(--muted)", fontSize:"12px", cursor:"pointer" }}>Skip +{XP.step_skipped}</button>
            </div>
          </div>
        )}
        {isFailed && !isActive && (
          <div style={{ marginTop:"8px", padding:"9px 14px", borderRadius:"10px", background:"rgba(251,191,36,0.07)", border:"1px solid rgba(251,191,36,0.3)", fontSize:"12px", color:"#fbbf24" }}>⚠️ Almost there — try again or tap Help</div>
        )}
      </div>
    </div>
  );
}

function GamifiedRoadmap({ steps, goalId, goalTitle, userId, onDone, category, userPrefs }) {
  var cfg = CAT[category] || CAT.general;
  var [stepStatus,   setStepStatus]   = useState({});
  var [activeStep,   setActiveStep]   = useState(null);
  var [failedStep,   setFailedStep]   = useState(null);
  var [feedback,     setFeedback]     = useState(null);
  var [sessionXP,    setSessionXP]    = useState(0);
  var [xpPop,        setXPPop]        = useState(null);
  var [showConfetti, setShowConfetti] = useState(false);
  var [collapsed,    setCollapsed]    = useState(false);
  var prevPct = useRef(0);
  var { speak, speaking } = useVoice();

  var loadSteps = useCallback(function() {
    axios.get(API + "/goals/" + goalId + "/steps")
      .then(function(r){ setStepStatus(r.data||{}); })
      .catch(function(){});
  }, [goalId]);

  useEffect(function(){ loadSteps(); }, [loadSteps]);

  var completedCount = Object.values(stepStatus).filter(function(s){ return s.completed; }).length;
  var total = steps.length;
  var pct   = total > 0 ? Math.round((completedCount / total) * 100) : 0;
  var barColor  = pct === 100 ? "#4ade80" : cfg.color;
  var milestones = [25, 50, 75, 100];

  function handleSubmit(idx, result, skipped) {
    setFeedback({ idx, text:result.feedback, passed:result.passed });
    setActiveStep(null);
    if (result.passed) {
      var earned = skipped ? XP.step_skipped : XP.step_done;
      setStepStatus(function(p){ var u={...p}; u[idx]={completed:true}; return u; });
      setSessionXP(function(x){ return x + earned; });
      setXPPop(earned);
      setFailedStep(null);
      if (result.feedback) speak(result.feedback);
      if (result.goal_completed) {
        setShowConfetti(true);
        setSessionXP(function(x){ return x + XP.goal_complete; });
        speak("Incredible! You completed every step of this goal. You should be so proud!");
        setTimeout(function(){ setShowConfetti(false); }, 2500);
        if (onDone) onDone();
      }
      prevPct.current = pct;
    } else {
      setFailedStep(idx);
      if (result.feedback) speak(result.feedback);
    }
  }

  if (!steps || steps.length === 0) return null;

  return (
    <div>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}} @keyframes ring{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
      {userPrefs && (
        <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", marginBottom:"12px" }}>
          {[{icon:"⏱",label:userPrefs.daily_time+"/day"},{icon:"📅",label:userPrefs.timeline||""},{icon:"🎯",label:userPrefs.depth||""},{icon:"📚",label:userPrefs.learning_style||""}].filter(function(x){ return x.label; }).map(function(b){
            return <span key={b.label} style={{ fontSize:"10px", padding:"3px 9px", borderRadius:"8px", background:"var(--bg)", color:"var(--muted)", border:"1px solid var(--border)", display:"inline-flex", alignItems:"center", gap:"4px" }}>{b.icon} {b.label}</span>;
          })}
        </div>
      )}
      {sessionXP > 0 && (
        <div style={{ display:"inline-flex", alignItems:"center", gap:"6px", marginBottom:"12px", padding:"6px 14px", borderRadius:"50px", background:"rgba(124,92,252,0.1)", border:"1px solid rgba(124,92,252,0.25)" }}>
          <span style={{ fontSize:"14px" }}>⚡</span>
          <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:"800", fontSize:"13px", color:"var(--accent)" }}>+{sessionXP} XP this session</span>
          {speaking && <span style={{ fontSize:"14px", animation:"ring 1s ease infinite" }}>🔊</span>}
        </div>
      )}
      <div style={{ marginBottom:"16px", padding:"14px 16px", borderRadius:"16px", background:"var(--card)", border:"1px solid var(--border)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px" }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:"800", fontSize:"12px", color:"var(--text)", display:"flex", alignItems:"center", gap:"5px" }}>
            <span>{cfg.icon}</span>
            <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"160px" }}>{goalTitle}</span>
          </div>
          <div style={{ display:"flex", alignItems:"baseline", gap:"4px" }}>
            <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:"900", fontSize:"18px", color:barColor }}>{completedCount}</span>
            <span style={{ fontSize:"11px", color:"var(--muted)" }}>/ {total}</span>
            <span style={{ fontSize:"11px", fontWeight:"700", color:barColor }}>{pct}%</span>
          </div>
        </div>
        <div style={{ display:"flex", gap:"2px", height:"10px" }}>
          {steps.map(function(_,i){
            var done = !!(stepStatus[i] && stepStatus[i].completed);
            var cur  = i === completedCount;
            return <div key={i} style={{ flex:1, height:"100%", borderRadius:"4px", background:done?"linear-gradient(90deg,#4ade80,#22c55e)":cur?"rgba(124,92,252,0.4)":"var(--border)", transition:"background 0.5s ease", boxShadow:done?"0 0 5px rgba(74,222,128,0.4)":"none" }}/>;
          })}
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:"8px" }}>
          <span style={{ fontSize:"10px", color:"var(--muted)" }}>{pct===0?"Start your first step →":completedCount+" steps done"}</span>
          <span style={{ fontSize:"10px", color:pct===100?"#4ade80":"var(--muted)", fontWeight:pct===100?"800":"400" }}>{pct===100?"🏆 Goal Complete!":pct>=75?"Almost there! 🔥":pct>=50?"Halfway! Keep going ⚡":""}</span>
        </div>
        <div style={{ display:"flex", gap:"6px", marginTop:"10px", flexWrap:"wrap" }}>
          {milestones.map(function(m){
            var reached = pct >= m;
            return <div key={m} style={{ display:"flex", alignItems:"center", gap:"4px", padding:"3px 9px", borderRadius:"8px", background:reached?"rgba(251,191,36,0.1)":"var(--bg)", border:"1px solid "+(reached?"rgba(251,191,36,0.3)":"var(--border)"), transition:"all 0.4s" }}><span style={{ fontSize:"11px" }}>{reached?"⭐":"○"}</span><span style={{ fontSize:"9px", color:reached?"#fbbf24":"var(--muted)", fontWeight:reached?"800":"400", fontFamily:"'Syne',sans-serif" }}>{m}%</span></div>;
          })}
        </div>
      </div>
      {feedback && (
        feedback.passed ? (
          <div style={{ marginBottom:"14px", padding:"16px 18px", borderRadius:"16px", background:"linear-gradient(135deg,rgba(74,222,128,0.1),rgba(74,222,128,0.03))", border:"2px solid rgba(74,222,128,0.35)", animation:"fadeIn 0.3s ease" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"10px" }}><div style={{ fontSize:"28px" }}>🎉</div><div><div style={{ fontFamily:"'Syne',sans-serif", fontWeight:"900", fontSize:"14px", color:"#4ade80" }}>Step Complete!</div><div style={{ fontSize:"10px", color:"var(--muted)", marginTop:"2px" }}>You proved you understand this — well done.</div></div></div>
            <div style={{ padding:"10px 12px", borderRadius:"10px", background:"rgba(74,222,128,0.06)", border:"1px solid rgba(74,222,128,0.15)", marginBottom:"8px" }}>
              <div style={{ fontSize:"10px", fontWeight:"800", color:"#4ade80", fontFamily:"'Syne',sans-serif", marginBottom:"4px" }}>📚 WHAT YOU JUST LEARNED</div>
              <div style={{ fontSize:"12px", color:"var(--text)", lineHeight:"1.6" }}>{feedback.text}</div>
            </div>
            {steps[feedback.idx+1] && <div style={{ fontSize:"11px", color:"var(--muted)", fontStyle:"italic" }}>➡️ Next up: <strong style={{ color:"var(--text)" }}>{steps[feedback.idx+1].title}</strong></div>}
            <button onClick={function(){ setFeedback(null); }} style={{ fontSize:"10px", color:"var(--muted)", background:"none", border:"none", cursor:"pointer", marginTop:"8px" }}>Dismiss ✕</button>
          </div>
        ) : (
          <div style={{ marginBottom:"12px", padding:"12px 14px", borderRadius:"12px", background:"rgba(251,191,36,0.07)", border:"1px solid rgba(251,191,36,0.3)", animation:"fadeIn 0.25s ease" }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:"800", fontSize:"10px", color:"#fbbf24", marginBottom:"4px" }}>⚠️ NOT QUITE — TRY AGAIN</div>
            <div style={{ fontSize:"12px", color:"var(--text)", lineHeight:"1.6" }}>{feedback.text}</div>
            <button onClick={function(){ setFeedback(null); }} style={{ fontSize:"10px", color:"var(--muted)", background:"none", border:"none", cursor:"pointer", marginTop:"5px" }}>Dismiss ✕</button>
          </div>
        )
      )}
      {total > 8 && (
        <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:"8px" }}>
          <button onClick={function(){ setCollapsed(function(v){ return !v; }); }} style={{ fontSize:"11px", color:"var(--accent)", background:"none", border:"1px solid rgba(124,92,252,0.25)", borderRadius:"8px", padding:"4px 12px", cursor:"pointer", fontFamily:"'Syne',sans-serif", fontWeight:"700" }}>
            {collapsed?"Show all "+total+" steps":"Compact view"}
          </button>
        </div>
      )}
      <div style={{ position:"relative" }}>
        {steps.map(function(s,i){
          var done   = !!(stepStatus[i] && stepStatus[i].completed);
          var active = activeStep === i;
          var prevOk = i===0 || (stepStatus[i-1] && stepStatus[i-1].completed);
          var locked = !prevOk && !done;
          var failed = failedStep === i;
          if (collapsed && !done && i > completedCount + 2) return null;
          return (
            <QuestStep key={i} step={s} index={i} isDone={done} isActive={active} isLocked={locked} isFailed={failed} steps={steps} goalId={goalId} userId={userId} totalDone={completedCount}
              onStart={function(){ setActiveStep(active?null:i); setFeedback(null); setFailedStep(null); }}
              onSubmit={handleSubmit}
            />
          );
        })}
        {collapsed && <div style={{ textAlign:"center", padding:"10px", color:"var(--muted)", fontSize:"11px" }}>{total - completedCount - 3} more steps hidden · tap "Show all" above</div>}
      </div>
      {completedCount === total && total > 0 && (
        <div style={{ marginTop:"16px", padding:"28px 20px", borderRadius:"20px", textAlign:"center", background:"linear-gradient(135deg,rgba(74,222,128,0.1),rgba(74,222,128,0.04))", border:"2px solid rgba(74,222,128,0.35)", animation:"fadeIn 0.4s ease" }}>
          <div style={{ fontSize:"52px", marginBottom:"10px" }}>🏆</div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:"900", fontSize:"22px", color:"#4ade80", marginBottom:"6px" }}>Goal Complete!</div>
          <div style={{ fontSize:"13px", color:"var(--muted)", lineHeight:"1.6" }}>+{XP.goal_complete} bonus XP earned<br/>You genuinely mastered this in {userPrefs&&userPrefs.timeline?userPrefs.timeline:"your timeline"}.</div>
        </div>
      )}
      {xpPop && <XPPop xp={xpPop} onDone={function(){ setXPPop(null); }} />}
      {showConfetti && <Confetti />}
    </div>
  );
}

function PredictorTab({ user }) {
  var [preds,   setPreds]   = useState([]);
  var [loading, setLoading] = useState(true);
  var userId = user ? user.id : null;
  useEffect(function(){
    setLoading(true);
    axios.get(API + "/predict/" + userId)
      .then(function(r){ setPreds(r.data.predictions||[]); })
      .catch(function(){ setPreds([]); })
      .finally(function(){ setLoading(false); });
  }, [userId]); // eslint-disable-line

  function getColor(p){ return p>=75?"#4ade80":p>=50?"#fbbf24":"#f87171"; }
  if (loading) return <div style={{ textAlign:"center", padding:"48px 20px", color:"var(--muted)" }}><div style={{ fontSize:"36px", marginBottom:"10px" }}>🔮</div>Analysing patterns...</div>;
  if (!preds.length) return <div style={{ textAlign:"center", padding:"48px 20px", background:"var(--card)", borderRadius:"18px", border:"1px solid var(--border)" }}><div style={{ fontSize:"48px", marginBottom:"12px" }}>🎯</div><div style={{ fontFamily:"'Syne',sans-serif", fontWeight:"800", fontSize:"18px", color:"var(--text)", marginBottom:"8px" }}>No Goals Yet</div><div style={{ color:"var(--muted)", fontSize:"13px" }}>Add a goal — AI will predict your success likelihood.</div></div>;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
      <div style={{ padding:"12px 14px", borderRadius:"12px", background:"rgba(124,92,252,0.06)", border:"1px solid rgba(124,92,252,0.18)" }}>
        <div style={{ fontSize:"10px", fontWeight:"800", color:"var(--accent)", letterSpacing:"0.1em", marginBottom:"3px", fontFamily:"'Syne',sans-serif" }}>🦋 AI PREDICTION ENGINE</div>
        <div style={{ fontSize:"12px", color:"var(--muted)", lineHeight:"1.6" }}>Analyses mood history, session frequency and roadmap progress to predict success + give a personalised tip.</div>
      </div>
      {preds.map(function(p,i){
        if (!p) return null;
        var c = getColor(p.likelihood||0);
        return (
          <div key={i} style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:"16px", padding:"16px 18px", borderLeft:"4px solid "+c }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"10px", flexWrap:"wrap", gap:"8px" }}>
              <div style={{ flex:1, minWidth:0 }}><div style={{ fontFamily:"'Syne',sans-serif", fontWeight:"800", fontSize:"13px", color:"var(--text)", marginBottom:"2px", lineHeight:1.3 }}>{p.title||"Goal"}</div><div style={{ fontSize:"10px", color:"var(--muted)" }}>{p.category}</div></div>
              <div style={{ padding:"4px 12px", borderRadius:"20px", background:c+"18", border:"1px solid "+c+"40", color:c, fontFamily:"'Syne',sans-serif", fontWeight:"900", fontSize:"18px", flexShrink:0 }}>{p.likelihood||0}%</div>
            </div>
            <div style={{ height:"6px", borderRadius:"3px", background:"var(--border)", overflow:"hidden", marginBottom:"8px" }}><div style={{ height:"100%", width:(p.likelihood||0)+"%", background:"linear-gradient(90deg,"+c+","+c+"88)", borderRadius:"3px", transition:"width 1s ease" }}/></div>
            {p.reason && <div style={{ fontSize:"12px", color:"var(--muted)", lineHeight:"1.5", marginBottom:"7px", padding:"8px 12px", borderRadius:"10px", background:"var(--bg)", border:"1px solid var(--border)" }}>{p.reason}</div>}
            {p.tip && <div style={{ fontSize:"12px", color:"var(--text)", lineHeight:"1.5", padding:"8px 12px", borderRadius:"10px", background:c+"0d", border:"1px solid "+c+"30" }}>💡 {p.tip}</div>}
          </div>
        );
      })}
    </div>
  );
}

function GoalCard({ g, userId, fetchGoals, expandedId, setExpandedId, onComplete, onDelete }) {
  var cfg      = CAT[g.category] || CAT.general;
  var expanded = expandedId === g.id;
  var [interview, setInterview] = useState(false);
  var [roadmap,   setRoadmap]   = useState(g.roadmap||[]);
  var [userPrefs, setUserPrefs] = useState(null);
  var [numSteps,  setNumSteps]  = useState(null);

  useEffect(function(){
    if (g.interview_data) {
      try { var d = typeof g.interview_data==="string" ? JSON.parse(g.interview_data) : g.interview_data; setUserPrefs(d); if (d.num_steps) setNumSteps(d.num_steps); } catch(e){}
    }
    if (g.roadmap && g.roadmap.length > 0) setRoadmap(g.roadmap);
  }, [g.interview_data, g.roadmap]);

  return (
    <div style={{ borderRadius:"18px", marginBottom:"10px", overflow:"hidden", background:"var(--card)", border:"1px solid var(--border)", boxShadow:"0 2px 10px rgba(0,0,0,0.05)", transition:"box-shadow 0.2s" }}>
      <div style={{ height:"4px", background:"linear-gradient(90deg,"+cfg.color+","+cfg.color+"66)" }}/>
      <div style={{ padding:"14px 16px" }}>
        <div style={{ display:"flex", gap:"10px", alignItems:"flex-start" }}>
          <div style={{ width:"42px", height:"42px", minWidth:"42px", borderRadius:"12px", background:cfg.bg, border:"1px solid "+cfg.color+"40", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"20px", boxShadow:"0 4px 10px "+cfg.glow }}>{cfg.icon}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:"800", fontSize:"14px", color:g.completed?"var(--muted)":"var(--text)", textDecoration:g.completed?"line-through":"none", marginBottom:"4px", lineHeight:1.3 }}>{g.title}</div>
            <div style={{ display:"flex", gap:"4px", flexWrap:"wrap" }}>
              <span style={{ fontSize:"9px", padding:"2px 7px", borderRadius:"6px", background:cfg.bg, color:cfg.color, fontWeight:"800", border:"1px solid "+cfg.color+"30" }}>{cfg.label.toUpperCase()}</span>
              {g.deadline && <span style={{ fontSize:"9px", padding:"2px 7px", borderRadius:"6px", background:"var(--bg)", color:"var(--muted)", border:"1px solid var(--border)" }}>📅 {g.deadline}</span>}
              {numSteps && <span style={{ fontSize:"9px", padding:"2px 7px", borderRadius:"6px", background:"rgba(124,92,252,0.08)", color:"var(--accent)", border:"1px solid rgba(124,92,252,0.2)" }}>{numSteps} steps</span>}
              {userPrefs && userPrefs.timeline && <span style={{ fontSize:"9px", padding:"2px 7px", borderRadius:"6px", background:"var(--bg)", color:"var(--muted)", border:"1px solid var(--border)" }}>📅 {userPrefs.timeline}</span>}
              {g.completed && <span style={{ fontSize:"9px", padding:"2px 7px", borderRadius:"6px", background:"rgba(74,222,128,0.1)", color:"#4ade80", fontWeight:"800", border:"1px solid rgba(74,222,128,0.3)" }}>✓ DONE</span>}
            </div>
          </div>
          <div style={{ display:"flex", gap:"5px", flexShrink:0 }}>
            <button onClick={function(){ setExpandedId(expanded?null:g.id); }} style={{ padding:"7px 11px", minHeight:"36px", minWidth:"44px", borderRadius:"10px", cursor:"pointer", border:"1px solid rgba(124,92,252,0.3)", background:expanded?"rgba(124,92,252,0.15)":"rgba(124,92,252,0.07)", color:"var(--accent)", fontSize:"12px", fontFamily:"'Syne',sans-serif", fontWeight:"800" }}>{expanded?"↑":"↓"}</button>
            {!g.completed && <button onClick={onComplete} style={{ padding:"7px 10px", minHeight:"36px", minWidth:"36px", borderRadius:"10px", cursor:"pointer", border:"1px solid rgba(74,222,128,0.3)", background:"rgba(74,222,128,0.06)", color:"#4ade80", fontSize:"12px", fontWeight:"800" }}>✓</button>}
            <button onClick={onDelete} style={{ padding:"7px 10px", minHeight:"36px", minWidth:"36px", borderRadius:"10px", cursor:"pointer", border:"1px solid rgba(248,113,113,0.2)", background:"rgba(248,113,113,0.04)", color:"#f87171", fontSize:"12px", fontWeight:"800" }}>✕</button>
          </div>
        </div>
        {expanded && (
          <div style={{ marginTop:"16px", paddingTop:"16px", borderTop:"1px solid var(--border)", animation:"fadeIn 0.25s ease" }}>
            {interview && <IntakeInterview goalId={g.id} goalTitle={g.title} userId={userId} onDone={function(rm, prefs, ns){ if (rm) setRoadmap(rm); setUserPrefs(prefs); setNumSteps(ns); setInterview(false); fetchGoals(); }}/>}
            {!interview && roadmap.length === 0 && (
              <div style={{ textAlign:"center", padding:"28px 20px", borderRadius:"18px", background:"rgba(124,92,252,0.04)", border:"1px solid rgba(124,92,252,0.18)" }}>
                <div style={{ fontSize:"44px", marginBottom:"12px" }}>🗺️</div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:"900", fontSize:"16px", color:"var(--text)", marginBottom:"6px" }}>Your goal is saved!</div>
                <div style={{ fontSize:"12px", color:"var(--muted)", marginBottom:"8px", lineHeight:"1.7" }}>When you're ready, click below.<br/>AI will ask <strong style={{color:"var(--accent)"}}>5 quick questions</strong> about your timeline,<br/>learning style and depth — then build your exact roadmap.</div>
                <div style={{ fontSize:"11px", color:"var(--muted)", marginBottom:"20px", padding:"8px 12px", borderRadius:"10px", background:"rgba(124,92,252,0.06)", border:"1px solid rgba(124,92,252,0.15)" }}>⏱ Takes about 30 seconds · Roadmap generated after your answers</div>
                <button onClick={function(){ setInterview(true); }} style={{ padding:"14px 32px", borderRadius:"14px", background:"linear-gradient(135deg,#7c5cfc,#fc5cf0)", border:"none", color:"white", fontFamily:"'Syne',sans-serif", fontWeight:"900", fontSize:"15px", cursor:"pointer", boxShadow:"0 8px 28px rgba(124,92,252,0.4)" }}>🚀 Set Preferences & Build Roadmap</button>
              </div>
            )}
            {!interview && roadmap.length > 0 && (
              <div>
                <GamifiedRoadmap steps={roadmap} goalId={g.id} goalTitle={g.title} userId={userId} category={g.category} onDone={fetchGoals} userPrefs={userPrefs}/>
                <button onClick={function(){ setInterview(true); }} style={{ marginTop:"12px", fontSize:"11px", color:"var(--muted)", background:"rgba(124,92,252,0.06)", border:"1px solid rgba(124,92,252,0.15)", borderRadius:"8px", padding:"7px 14px", cursor:"pointer", fontFamily:"'Syne',sans-serif", fontWeight:"700" }}>↺ Rebuild with new preferences</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Goals({ user }) {
  var userId = user ? user.id : null;
  var [tab,        setTab]        = useState("goals");
  var [goals,      setGoals]      = useState([]);
  var [loading,    setLoading]    = useState(true);
  var [saving,     setSaving]     = useState(false);
  var [showForm,   setShowForm]   = useState(false);
  var [expandedId, setExpandedId] = useState(null);
  var [form,       setForm]       = useState({ title:"", category:"general", deadline:"" });
  var [error,      setError]      = useState(null);
  var [interviewGoalId,    setInterviewGoalId]    = useState(null);
  var [interviewGoalTitle, setInterviewGoalTitle] = useState("");
  var inputRef = useRef(null);

  function fetchGoals() {
    if (!userId) return;
    setLoading(true);
    axios.get(API + "/goals?user_id=" + userId)
      .then(function(r){ setGoals(r.data||[]); })
      .catch(function(){})
      .finally(function(){ setLoading(false); });
  }
  useEffect(function(){ fetchGoals(); }, [userId]); // eslint-disable-line

  function saveGoal() {
    if (!form.title.trim()) return;
    setSaving(true); setError(null);
    axios.post(API + "/goals", { user_id:userId, title:form.title, category:form.category, deadline:form.deadline })
      .then(function(r){
        setForm({ title:"", category:"general", deadline:"" });
        setShowForm(false);
        fetchGoals();
        if (r.data && r.data.id) { setInterviewGoalId(r.data.id); setInterviewGoalTitle(r.data.title || form.title); }
      })
      .catch(function(){ setError("Could not save. Is Flask running?"); })
      .finally(function(){ setSaving(false); });
  }

  function completeGoal(id) {
    axios.patch(API + "/goals/" + id + "/complete")
      .then(function(){ setGoals(function(p){ return p.map(function(g){ return g.id===id?{...g,completed:true}:g; }); }); })
      .catch(function(){});
  }
  function deleteGoal(id) {
    if (!window.confirm("Delete this goal?")) return;
    axios.delete(API + "/goals/" + id)
      .then(function(){ setGoals(function(p){ return p.filter(function(g){ return g.id!==id; }); }); if(expandedId===id) setExpandedId(null); })
      .catch(function(){});
  }

  var active    = goals.filter(function(g){ return !g.completed; });
  var completed = goals.filter(function(g){ return  g.completed; });

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"55vh", flexDirection:"column", gap:"14px" }}>
      <div style={{ width:"36px", height:"36px", borderRadius:"50%", border:"3px solid var(--border)", borderTopColor:"var(--accent)", animation:"spin 0.8s linear infinite" }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );

  return (
    <div style={{ animation:"fadeIn 0.3s ease", paddingBottom:"8px" }}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}} @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}} @keyframes dropIn{from{opacity:0;transform:scale(0.96) translateY(-10px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>

      {/* Interview modal — appears right after saving a new goal */}
      {interviewGoalId && (
        <div style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,0.65)", display:"flex", alignItems:"center", justifyContent:"center", padding:"16px", backdropFilter:"blur(6px)" }}>
          <div style={{ background:"var(--card)", borderRadius:"24px", padding:"28px 24px", width:"100%", maxWidth:"480px", border:"1px solid rgba(124,92,252,0.3)", boxShadow:"0 32px 80px rgba(0,0,0,0.5)", animation:"dropIn 0.25s ease", maxHeight:"90vh", overflowY:"auto" }}>
            <div style={{ marginBottom:"20px" }}>
              <div style={{ fontSize:"10px", fontWeight:"800", color:"var(--accent)", letterSpacing:"0.14em", marginBottom:"6px", fontFamily:"'Syne',sans-serif" }}>NEW GOAL — SET PREFERENCES</div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:"900", fontSize:"16px", color:"var(--text)", lineHeight:1.3, marginBottom:"4px" }}>"{interviewGoalTitle}"</div>
              <div style={{ fontSize:"12px", color:"var(--muted)" }}>Answer 5 quick questions so AI builds the perfect roadmap for you</div>
            </div>
            <IntakeInterview goalId={interviewGoalId} goalTitle={interviewGoalTitle} userId={userId}
              onDone={function(roadmap, prefs, numSteps){
                var doneId = interviewGoalId;
                setInterviewGoalId(null); setInterviewGoalTitle("");
                setExpandedId(doneId); fetchGoals();
              }}
            />
            <button onClick={function(){ setInterviewGoalId(null); setInterviewGoalTitle(""); fetchGoals(); }}
              style={{ marginTop:"12px", width:"100%", padding:"10px", background:"none", border:"none", color:"var(--muted)", cursor:"pointer", fontSize:"12px" }}>
              Skip for now — I'll set preferences later
            </button>
          </div>
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"18px", flexWrap:"wrap", gap:"10px" }}>
        <div>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:"900", fontSize:"clamp(22px,5vw,28px)", background:"linear-gradient(135deg,#e8e0ff 30%,#9b8aff)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", marginBottom:"3px", letterSpacing:"-0.5px", lineHeight:1.2 }}>My Goals</h1>
          <p style={{ color:"var(--muted)", fontSize:"13px" }}>Set goal → AI calculates steps → earn XP every step</p>
        </div>
        {tab === "goals" && (
          <button onClick={function(){ setShowForm(function(v){ return !v; }); setError(null); setTimeout(function(){ if(inputRef.current) inputRef.current.focus(); }, 120); }}
            style={{ padding:"10px 18px", minHeight:"40px", borderRadius:"12px", cursor:"pointer", background:"linear-gradient(135deg,#7c5cfc,#fc5cf0)", color:"white", border:"none", fontFamily:"'Syne',sans-serif", fontWeight:"900", fontSize:"13px", boxShadow:"0 4px 16px rgba(124,92,252,0.35)", transition:"all 0.2s" }}>
            + New Goal
          </button>
        )}
      </div>

      {goals.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"8px", marginBottom:"18px" }}>
          {[{label:"Total",v:goals.length,c:"#7c5cfc"},{label:"Active",v:active.length,c:"#fbbf24"},{label:"Done",v:completed.length,c:"#4ade80"}].map(function(s){
            return <div key={s.label} style={{ background:"var(--card)", borderRadius:"14px", padding:"12px 8px", textAlign:"center", border:"1px solid var(--border)" }}><div style={{ fontFamily:"'Syne',sans-serif", fontWeight:"900", fontSize:"clamp(20px,5vw,28px)", color:s.c, lineHeight:1 }}>{s.v}</div><div style={{ fontSize:"10px", color:"var(--muted)", marginTop:"4px" }}>{s.label}</div></div>;
          })}
        </div>
      )}

      <div style={{ display:"flex", borderBottom:"1px solid var(--border)", marginBottom:"18px", overflowX:"auto" }}>
        {[{id:"goals",label:"My Goals",badge:active.length},{id:"predictor",label:"🔮 AI Predictor",badge:0}].map(function(t){
          return <button key={t.id} onClick={function(){ setTab(t.id); }} style={{ padding:"9px 16px", border:"none", background:"transparent", cursor:"pointer", fontFamily:"'Syne',sans-serif", fontWeight:"700", fontSize:"13px", color:tab===t.id?"var(--accent)":"var(--muted)", borderBottom:tab===t.id?"2px solid var(--accent)":"2px solid transparent", marginBottom:"-1px", display:"flex", alignItems:"center", gap:"5px", transition:"all 0.15s", whiteSpace:"nowrap", minHeight:"42px" }}>
            {t.label}
            {t.badge>0 && <span style={{ fontSize:"9px", padding:"1px 6px", borderRadius:"10px", background:tab===t.id?"rgba(124,92,252,0.15)":"var(--bg)", color:tab===t.id?"var(--accent)":"var(--muted)", border:"1px solid var(--border)" }}>{t.badge}</span>}
          </button>;
        })}
      </div>

      {tab === "goals" && (
        <div>
          {error && <div style={{ padding:"12px 14px", borderRadius:"12px", marginBottom:"14px", background:"rgba(248,113,113,0.07)", border:"1px solid rgba(248,113,113,0.25)", color:"#f87171", fontSize:"13px" }}>{error}</div>}
          {showForm && (
            <div style={{ background:"var(--card)", borderRadius:"18px", padding:"18px", marginBottom:"18px", border:"1px solid rgba(124,92,252,0.25)", animation:"fadeIn 0.2s ease", boxShadow:"0 4px 20px rgba(124,92,252,0.08)" }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:"900", fontSize:"11px", color:"var(--accent)", letterSpacing:"0.14em", marginBottom:"14px" }}>NEW GOAL — Step 1 of 2</div>
              <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
                <div>
                  <div style={{ fontSize:"10px", fontWeight:"800", color:"var(--muted)", letterSpacing:"0.08em", marginBottom:"6px", fontFamily:"'Syne',sans-serif" }}>WHAT'S YOUR GOAL?</div>
                  <input ref={inputRef} className="input" placeholder="e.g. Learn Python, Run 5km, Crack JEE, Start a business..." value={form.title} onChange={function(e){ setForm(function(p){ return {...p,title:e.target.value}; }); }} onKeyDown={function(e){ if(e.key==="Enter"&&!saving) saveGoal(); }} style={{ width:"100%", boxSizing:"border-box", fontSize:"15px" }}/>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
                  <div>
                    <div style={{ fontSize:"10px", fontWeight:"800", color:"var(--muted)", letterSpacing:"0.08em", marginBottom:"6px", fontFamily:"'Syne',sans-serif" }}>CATEGORY</div>
                    <select className="input" value={form.category} onChange={function(e){ setForm(function(p){ return {...p,category:e.target.value}; }); }} style={{ width:"100%", boxSizing:"border-box", color:"var(--text)", background:"var(--card)", border:"1px solid var(--border)", fontSize:"14px" }}>
                      {Object.entries(CAT).map(function(entry){ return <option key={entry[0]} value={entry[0]}>{entry[1].icon} {entry[1].label}</option>; })}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize:"10px", fontWeight:"800", color:"var(--muted)", letterSpacing:"0.08em", marginBottom:"6px", fontFamily:"'Syne',sans-serif" }}>DEADLINE (OPTIONAL)</div>
                    <input className="input" type="date" value={form.deadline} onChange={function(e){ setForm(function(p){ return {...p,deadline:e.target.value}; }); }} style={{ width:"100%", boxSizing:"border-box", fontSize:"14px" }}/>
                  </div>
                </div>
                <div style={{ display:"flex", gap:"8px" }}>
                  <button className="btn-primary" onClick={saveGoal} disabled={saving||!form.title.trim()} style={{ flex:1, opacity:(saving||!form.title.trim())?0.6:1, minHeight:"44px" }}>
                    {saving?"Saving...":"Save Goal →"}
                  </button>
                  <button onClick={function(){ setShowForm(false); setForm({ title:"", category:"general", deadline:"" }); setError(null); }} style={{ padding:"10px 16px", minHeight:"44px", borderRadius:"12px", border:"1px solid var(--border)", background:"transparent", color:"var(--muted)", cursor:"pointer" }}>Cancel</button>
                </div>
              </div>
            </div>
          )}
          {active.length > 0 && (
            <div style={{ marginBottom:"22px" }}>
              <div style={{ fontSize:"10px", fontWeight:"800", color:"var(--muted)", letterSpacing:"0.1em", fontFamily:"'Syne',sans-serif", marginBottom:"12px" }}>ACTIVE QUESTS ({active.length})</div>
              {active.map(function(g){ return <GoalCard key={g.id} g={g} userId={userId} fetchGoals={fetchGoals} expandedId={expandedId} setExpandedId={setExpandedId} onComplete={function(){ completeGoal(g.id); }} onDelete={function(){ deleteGoal(g.id); }}/>; })}
            </div>
          )}
          {completed.length > 0 && (
            <div>
              <div style={{ fontSize:"10px", fontWeight:"800", color:"#4ade80", letterSpacing:"0.1em", fontFamily:"'Syne',sans-serif", marginBottom:"12px" }}>COMPLETED ✓ ({completed.length})</div>
              {completed.map(function(g){ return <GoalCard key={g.id} g={g} userId={userId} fetchGoals={fetchGoals} expandedId={expandedId} setExpandedId={setExpandedId} onComplete={function(){}} onDelete={function(){ deleteGoal(g.id); }}/>; })}
            </div>
          )}
          {goals.length === 0 && !showForm && (
            <div style={{ background:"var(--card)", borderRadius:"22px", padding:"48px 20px", textAlign:"center", border:"1px solid var(--border)" }}>
              <div style={{ fontSize:"56px", marginBottom:"16px" }}>🎯</div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:"800", fontSize:"20px", color:"var(--text)", marginBottom:"8px" }}>No goals yet</div>
              <div style={{ color:"var(--muted)", fontSize:"13px", marginBottom:"24px", lineHeight:"1.7", maxWidth:"300px", margin:"0 auto 24px" }}>Add any goal — AI asks <strong style={{color:"var(--accent)"}}>5 questions</strong> then builds your exact roadmap.</div>
              <button className="btn-primary" onClick={function(){ setShowForm(true); }} style={{ fontSize:"14px", padding:"13px 28px" }}>+ Create Your First Quest</button>
            </div>
          )}
        </div>
      )}
      {tab === "predictor" && <PredictorTab user={user}/>}
    </div>
  );
}

export default Goals;

