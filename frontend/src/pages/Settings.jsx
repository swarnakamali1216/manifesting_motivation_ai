import React, { useState, useEffect } from "react";
import axios from "axios";

var API = "https://manifesting-motivation-backend.onrender.com/api";

var ACCENT_COLORS = [
  { name:"purple", label:"Purple", hex:"#7c5cfc" },
  { name:"blue",   label:"Blue",   hex:"#3b82f6" },
  { name:"green",  label:"Green",  hex:"#22c55e" },
  { name:"orange", label:"Orange", hex:"#f97316" },
  { name:"pink",   label:"Pink",   hex:"#ec4899" },
];

// Only voices confirmed working on free tier
var VOICE_OPTIONS = [
  { id:"ErXwobaYiN019PkySvjV", name:"Antoni", desc:"Well-rounded male"  },
  { id:"pNInz6obpgDQGcFmaJgB", name:"Adam",   desc:"Neutral male"       },
  { id:"MF3mGyEYCl7XYWbV9V6O", name:"Elli",   desc:"Bright & uplifting" },
  { id:"VR6AewLTigWG4xSOukaG", name:"Arnold", desc:"Crisp male"         },
];

var TABS = [
  { id:"appearance",    label:"Appearance"    },
  { id:"voice",         label:"Voice"         },
  { id:"privacy",       label:"Privacy"       },
  { id:"data",          label:"Data"          },
  { id:"notifications", label:"Notifications" },
  { id:"account",       label:"Account"       },
];

// ── Browser TTS helper ────────────────────────────────────────────────────
function speakWithBrowser(text, voiceId, onEnd) {
  try {
    window.speechSynthesis.cancel();
    var femaleIds = ["MF3mGyEYCl7XYWbV9V6O"];
    var isFemale  = femaleIds.includes(voiceId);
    var voices    = window.speechSynthesis.getVoices();
    var enVoices  = voices.filter(function(v){ return v.lang && v.lang.startsWith("en"); });
    var match     = enVoices.filter(function(v){
      var n = v.name.toLowerCase();
      return isFemale
        ? /\b(sara|rachel|elli|aria|zira|susan|karen|victoria|samantha|female|woman)\b/.test(n)
        : /\b(josh|james|daniel|david|alex|mark|lee|male|man)\b/.test(n);
    });
    var u   = new SpeechSynthesisUtterance(text);
    u.rate  = 0.92; u.lang = "en-IN"; u.pitch = 1.05;
    if (match.length)         u.voice = match[0];
    else if (enVoices.length) u.voice = enVoices[0];
    u.onend   = function(){ if (onEnd) onEnd(); };
    u.onerror = function(){ if (onEnd) onEnd(); };
    window.speechSynthesis.speak(u);
  } catch(e) { if (onEnd) onEnd(); }
}

function Toggle({ value, onChange, color }) {
  var c = color || "var(--accent)";
  return (
    <div onClick={function(){ onChange(!value); }}
      style={{width:44,height:24,borderRadius:12,background:value?c:"var(--border)",cursor:"pointer",position:"relative",transition:"background .25s",flexShrink:0,WebkitTapHighlightColor:"transparent"}}>
      <div style={{width:18,height:18,borderRadius:"50%",background:"white",position:"absolute",top:3,left:value?23:3,transition:"left .25s",boxShadow:"0 1px 4px rgba(0,0,0,0.3)"}}/>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{fontSize:10,fontWeight:800,color:"var(--muted)",letterSpacing:".12em",marginBottom:11,fontFamily:"'Syne',sans-serif",textTransform:"uppercase"}}>
      {children}
    </div>
  );
}

function Row({ label, sub, right, onClick }) {
  return (
    <div onClick={onClick} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 15px",background:"var(--card)",border:"1px solid var(--border)",borderRadius:13,marginBottom:7,cursor:onClick?"pointer":"default",gap:11}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:14,fontWeight:700,color:"var(--text)",fontFamily:"'DM Sans',sans-serif"}}>{label}</div>
        {sub && <div style={{fontSize:12,color:"var(--muted)",marginTop:2,lineHeight:1.5}}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

function Settings({ user, darkMode: darkModeProp, toggleTheme, onNavigate }) {
  var uid = user ? user.id : null;

  // ── ALL useState calls inside the component ───────────────────────────────
  var [isDark,       setIsDark]       = useState(function(){ return localStorage.getItem("theme") !== "light"; });
  var [tab,          setTab]          = useState("appearance");
  var [accentColor,  setAccentColor]  = useState(localStorage.getItem("accent_color")||"purple");
  var [voiceAuto,    setVoiceAuto]    = useState(localStorage.getItem("voice_auto")==="true");
  var [voiceId,      setVoiceId]      = useState(localStorage.getItem("voice_persona")||"ErXwobaYiN019PkySvjV");
  var [notifPerm,    setNotifPerm]    = useState(typeof Notification!=="undefined"?Notification.permission:"default");
  var [notifEnabled, setNotifEnabled] = useState(localStorage.getItem("notif_enabled")==="true");
  var [streakNum,    setStreakNum]     = useState(0);
  var [testingVoice, setTestingVoice] = useState(false);
  var [voiceSource,  setVoiceSource]  = useState("");

  useEffect(function(){
    setIsDark(localStorage.getItem("theme") !== "light");
  }, [darkModeProp]);

  useEffect(function(){
    if (!uid) return;
    axios.get(API+"/checkin/streak/"+uid)
      .then(function(r){ setStreakNum(r.data.streak||0); })
      .catch(function(){});
  }, [uid]);

  function handleDarkMode(val) {
    setIsDark(val);
    localStorage.setItem("theme", val ? "dark" : "light");
    if (toggleTheme) {
      toggleTheme();
    } else {
      document.documentElement.classList.toggle("dark", val);
      document.documentElement.classList.toggle("light", !val);
    }
  }

  function handleAccentColor(name) {
    setAccentColor(name);
    localStorage.setItem("accent_color", name);
    var c = ACCENT_COLORS.find(function(x){ return x.name===name; });
    if (c) document.documentElement.style.setProperty("--accent", c.hex);
  }

  function handleVoiceAuto(val) {
    setVoiceAuto(val);
    localStorage.setItem("voice_auto", String(val));
  }

  function handleTestVoice() {
    if (testingVoice) return;
    setTestingVoice(true);
    setVoiceSource("");
    var text = "Hello! I'm your AI coach. Let's achieve your goals together!";

    axios.post(
      API+"/speak",
      { text: text, voice_id: voiceId },
      {
        responseType: "blob",
        validateStatus: function(status) { return true; },
      }
    ).then(function(r) {
      if (r.status !== 200) {
        setVoiceSource("browser");
        speakWithBrowser(text, voiceId, function(){ setTestingVoice(false); });
        return;
      }
      var contentType = r.headers["content-type"] || "";
      if (contentType.includes("application/json")) {
        setVoiceSource("browser");
        speakWithBrowser(text, voiceId, function(){ setTestingVoice(false); });
        return;
      }
      setVoiceSource("elevenlabs");
      var url   = URL.createObjectURL(r.data);
      var audio = new Audio(url);
      audio.onended = function(){ URL.revokeObjectURL(url); setTestingVoice(false); };
      audio.onerror = function(){ URL.revokeObjectURL(url); setTestingVoice(false); };
      audio.play().catch(function(){
        URL.revokeObjectURL(url);
        setVoiceSource("browser");
        speakWithBrowser(text, voiceId, function(){ setTestingVoice(false); });
      });
    }).catch(function() {
      setVoiceSource("browser");
      speakWithBrowser(text, voiceId, function(){ setTestingVoice(false); });
    });
  }

  function handleRequestNotif() {
    if (typeof Notification==="undefined") return;
    Notification.requestPermission().then(function(perm){
      setNotifPerm(perm);
      if (perm==="granted") {
        setNotifEnabled(true);
        localStorage.setItem("notif_enabled","true");
        new Notification("Manifesting Motivation ✨",{body:"Daily check-in reminders enabled!",icon:"/favicon.ico"});
      }
    });
  }

  function handleToggleNotif(val) {
    if (val && notifPerm!=="granted") { handleRequestNotif(); return; }
    setNotifEnabled(val);
    localStorage.setItem("notif_enabled", String(val));
  }

  return (
    <div style={{padding:"28px 32px",maxWidth:1200,margin:"0 auto",background:"var(--bg)",minHeight:"100vh"}}>
      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        .stab:hover{background:rgba(124,92,252,0.04)!important;}
      `}</style>

      <div style={{marginBottom:20}}>
        <h1 style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"clamp(24px,5vw,34px)",color:"var(--text)",marginBottom:6}}>
          Settings
        </h1>
        <p style={{color:"var(--muted)",fontSize:13}}>Customize your experience and account preferences</p>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:20,borderBottom:"1px solid var(--border)",marginBottom:28,overflowX:"auto"}}>
        {TABS.map(function(t){
          return (
            <button key={t.id} onClick={function(){setTab(t.id);}} className="stab"
              style={{padding:"11px 0",background:"none",border:"none",borderBottom:tab===t.id?"2px solid var(--accent)":"2px solid transparent",color:tab===t.id?"var(--text)":"var(--muted)",fontSize:13,fontWeight:600,fontFamily:"'Syne',sans-serif",cursor:"pointer",whiteSpace:"nowrap",transition:"all .2s"}}>
              {t.label}
            </button>
          );
        })}
      </div>

      <div style={{maxWidth:580,animation:"fadeIn .2s ease"}}>

        {/* ── APPEARANCE ── */}
        {tab==="appearance" && (
          <>
            <div style={{marginBottom:24,paddingBottom:24,borderBottom:"1px solid var(--border)"}}>
              <SectionLabel>Theme</SectionLabel>
              <Row
                label={isDark ? "Dark Mode 🌙" : "Light Mode ☀️"}
                sub={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                right={<Toggle value={isDark} onChange={handleDarkMode}/>}
              />
              <div style={{fontSize:11,color:"var(--muted)",marginTop:6,paddingLeft:4,lineHeight:1.6}}>
                {isDark ? "Dark mode is ON." : "Light mode is ON."}
              </div>
            </div>
            <div>
              <SectionLabel>Accent Color</SectionLabel>
              <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:14,padding:16,marginBottom:14}}>
                <div style={{fontSize:12,color:"var(--muted)",marginBottom:12,lineHeight:1.6}}>
                  Choose your highlight color throughout the app.
                </div>
                <div style={{display:"flex",gap:9,flexWrap:"wrap"}}>
                  {ACCENT_COLORS.map(function(c){
                    var sel = accentColor===c.name;
                    return (
                      <button key={c.name} onClick={function(){handleAccentColor(c.name);}}
                        style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,padding:"9px 12px",borderRadius:12,cursor:"pointer",border:sel?"2px solid "+c.hex:"1px solid var(--border)",background:sel?c.hex+"18":"var(--card)",transition:"all .18s",transform:sel?"translateY(-2px)":"none",WebkitTapHighlightColor:"transparent"}}>
                        <div style={{width:26,height:26,borderRadius:"50%",background:c.hex,boxShadow:sel?"0 3px 12px "+c.hex+"66":"none"}}/>
                        <div style={{fontSize:9,fontWeight:800,color:sel?c.hex:"var(--muted)",fontFamily:"'Syne',sans-serif"}}>{c.label}</div>
                        {sel && <div style={{fontSize:7,color:c.hex,fontWeight:800}}>✓</div>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── VOICE ── */}
        {tab==="voice" && (
          <>
            <div style={{padding:"13px 15px",borderRadius:13,marginBottom:14,background:voiceAuto?"rgba(74,222,128,0.08)":"rgba(124,92,252,0.06)",border:"1px solid "+(voiceAuto?"rgba(74,222,128,0.25)":"rgba(124,92,252,0.2)")}}>
              <div style={{fontSize:13,fontWeight:700,color:voiceAuto?"#4ade80":"var(--muted)",marginBottom:3}}>
                {voiceAuto ? "🔊 AI voice is ON" : "🔇 AI voice is OFF"}
              </div>
              <div style={{fontSize:12,color:"var(--muted)",lineHeight:1.6}}>
                When ON: AI replies are spoken aloud via ElevenLabs or browser TTS.
              </div>
            </div>

            <SectionLabel>Voice Settings</SectionLabel>
            <Row label="Auto-speak AI replies" sub="AI responses are read aloud automatically" right={<Toggle value={voiceAuto} onChange={handleVoiceAuto} color="#4ade80"/>}/>

            {voiceAuto && (
              <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:14,padding:14,marginBottom:7}}>
                <div style={{fontSize:10,fontWeight:800,color:"var(--muted)",letterSpacing:".1em",marginBottom:11,fontFamily:"'Syne',sans-serif"}}>CHOOSE VOICE</div>
                <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:11}}>
                  {VOICE_OPTIONS.map(function(v){
                    var sel = voiceId===v.id;
                    return (
                      <button key={v.id} onClick={function(){ setVoiceId(v.id); localStorage.setItem("voice_persona",v.id); }}
                        style={{display:"flex",alignItems:"center",gap:11,padding:"10px 13px",borderRadius:11,cursor:"pointer",border:sel?"1px solid var(--accent)":"1px solid var(--border)",background:sel?"rgba(124,92,252,0.08)":"var(--card)",transition:"all .15s",textAlign:"left",WebkitTapHighlightColor:"transparent"}}>
                        <div style={{width:34,height:34,borderRadius:"50%",background:sel?"var(--accent)":"var(--border)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>🎙️</div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13,fontWeight:700,color:sel?"var(--accent)":"var(--text)"}}>{v.name}</div>
                          <div style={{fontSize:11,color:"var(--muted)"}}>{v.desc}</div>
                        </div>
                        {sel && <div style={{fontSize:12,color:"var(--accent)",fontWeight:800}}>✓</div>}
                      </button>
                    );
                  })}
                </div>

                {voiceSource === "elevenlabs" && (
                  <div style={{
                    padding:"7px 11px", borderRadius:9, marginBottom:9,
                    background:"rgba(74,222,128,0.08)",
                    border:"1px solid rgba(74,222,128,0.2)",
                    fontSize:11, color:"#4ade80", fontWeight:600,
                  }}>
                    ✅ Playing via ElevenLabs AI voice
                  </div>
                )}

                <button onClick={handleTestVoice} disabled={testingVoice}
                  style={{width:"100%",padding:10,borderRadius:11,border:"1px solid var(--border)",background:testingVoice?"rgba(124,92,252,0.1)":"var(--card)",color:testingVoice?"var(--accent)":"var(--text)",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,cursor:testingVoice?"not-allowed":"pointer",transition:"all .18s"}}>
                  {testingVoice ? "🔊 Playing..." : "▶ Test this voice"}
                </button>
              </div>
            )}
          </>
        )}

        {/* ── PRIVACY ── */}
        {tab==="privacy" && (
          <div>
            <div style={{padding:"14px 16px",borderRadius:14,marginBottom:14,background:"rgba(74,222,128,0.06)",border:"1px solid rgba(74,222,128,0.2)",display:"flex",gap:13,alignItems:"center"}}>
              <div style={{fontSize:28,flexShrink:0}}>🔒</div>
              <div>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:13,color:"#4ade80",marginBottom:2}}>AES-256 Encrypted</div>
                <div style={{fontSize:12,color:"var(--muted)",lineHeight:1.6}}>All journal entries are encrypted at rest. Your data is private.</div>
              </div>
            </div>
            <SectionLabel>What We Store</SectionLabel>
            {[
              {icon:"💬",label:"AI conversations",  sub:"Messages and replies for mood tracking"},
              {icon:"📔",label:"Journal entries",    sub:"Encrypted · Only you can read"},
              {icon:"🎯",label:"Goals and roadmaps", sub:"Your goals, steps, XP earned"},
              {icon:"✅",label:"Check-in history",   sub:"Daily mood and energy data"},
            ].map(function(item){
              return (
                <div key={item.label} style={{display:"flex",gap:11,padding:"12px 14px",background:"var(--card)",border:"1px solid var(--border)",borderRadius:13,marginBottom:7,alignItems:"flex-start"}}>
                  <div style={{fontSize:18,flexShrink:0,marginTop:1}}>{item.icon}</div>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:"var(--text)",marginBottom:2}}>{item.label}</div>
                    <div style={{fontSize:12,color:"var(--muted)",lineHeight:1.5}}>{item.sub}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── DATA ── */}
        {tab==="data" && (
          <div>
            <SectionLabel>Export Your Data</SectionLabel>
            <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:14,padding:16,marginBottom:14}}>
              <div style={{fontSize:14,fontWeight:700,color:"var(--text)",marginBottom:3}}>📥 Export All Data</div>
              <div style={{fontSize:12,color:"var(--muted)",marginBottom:12,lineHeight:1.6}}>Download all conversations, journals, and goals as JSON.</div>
              <button onClick={function(){
                if (!uid) return;
                axios.get(API+"/privacy/export?user_id="+uid)
                  .then(function(r){
                    var blob = new Blob([JSON.stringify(r.data,null,2)],{type:"application/json"});
                    var url  = URL.createObjectURL(blob);
                    var a    = document.createElement("a");
                    a.href=url; a.download="my_data_"+new Date().toISOString().slice(0,10)+".json";
                    a.click(); URL.revokeObjectURL(url);
                  }).catch(function(){ alert("Export failed. Check backend."); });
              }} style={{padding:"10px 18px",borderRadius:11,background:"linear-gradient(135deg,#7c5cfc,#9c6cfc)",border:"none",color:"white",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer"}}>
                ⬇ Export as JSON
              </button>
            </div>
            <SectionLabel>Danger Zone</SectionLabel>
            <div style={{background:"var(--card)",border:"1px solid rgba(248,113,113,0.3)",borderRadius:14,padding:16}}>
              <div style={{fontSize:14,fontWeight:700,color:"#f87171",marginBottom:3}}>⚠️ Delete Account</div>
              <div style={{fontSize:12,color:"var(--muted)",marginBottom:12,lineHeight:1.6}}>Permanently delete all your data. Cannot be undone.</div>
              <button onClick={function(){
                if (!window.confirm("DELETE YOUR ACCOUNT? All data removed.")) return;
                var ans = window.prompt("Type DELETE to confirm:");
                if (ans!=="DELETE") { alert("Cancelled."); return; }
                fetch(API+"/privacy/delete-account",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({user_id:uid})})
                  .then(function(){ localStorage.clear(); window.location.reload(); })
                  .catch(function(){ alert("Failed."); });
              }} style={{padding:"9px 16px",borderRadius:11,background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.3)",color:"#f87171",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer"}}>
                Delete My Account
              </button>
            </div>
          </div>
        )}

        {/* ── NOTIFICATIONS ── */}
        {tab==="notifications" && (
          <div>
            <div style={{padding:"13px 15px",borderRadius:13,marginBottom:13,background:notifPerm==="granted"?"rgba(74,222,128,0.08)":"rgba(251,191,36,0.08)",border:"1px solid "+(notifPerm==="granted"?"rgba(74,222,128,0.25)":"rgba(251,191,36,0.25)")}}>
              <div style={{fontSize:13,fontWeight:700,color:notifPerm==="granted"?"#4ade80":"#fbbf24",marginBottom:3}}>
                {notifPerm==="granted" ? "✅ Notifications allowed" : "⚠️ Permission pending"}
              </div>
              <div style={{fontSize:12,color:"var(--muted)"}}>{notifPerm==="granted"?"Daily reminders are active.":"Click toggle below to enable."}</div>
            </div>
            <SectionLabel>Settings</SectionLabel>
            <Row label="Enable notifications" sub="Get daily check-in reminders and alerts"
              right={<Toggle value={notifEnabled&&notifPerm==="granted"} onChange={handleToggleNotif} color="#4ade80"/>}/>
          </div>
        )}

        {/* ── ACCOUNT ── */}
        {tab==="account" && (
          <div>
            {user && (
              <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:16,padding:18,marginBottom:22}}>
                <div style={{display:"flex",gap:13,alignItems:"center"}}>
                  <div style={{width:54,height:54,borderRadius:14,background:"linear-gradient(135deg,#7c5cfc,#fc5cf0)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontFamily:"'Syne',sans-serif",fontWeight:900,color:"#fff",flexShrink:0}}>
                    {(user.name||"U").charAt(0).toUpperCase()}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:"'Syne',sans-serif",fontWeight:900,fontSize:17,color:"var(--text)",marginBottom:2}}>{user.name||"User"}</div>
                    <div style={{fontSize:12,color:"var(--muted)",marginBottom:5}}>{user.email||""}</div>
                    <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}>
                      <span style={{fontSize:12,fontWeight:700,color:"#fb923c"}}>🔥 {streakNum} day streak</span>
                      <span style={{fontSize:10,padding:"2px 9px",borderRadius:20,background:"rgba(124,92,252,.12)",color:"var(--accent)",fontWeight:700,border:"1px solid rgba(124,92,252,.25)"}}>
                        {user.role==="admin"?"👑 Admin":"✦ Member"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <SectionLabel>Quick Links</SectionLabel>
            {[
              {icon:"🎯",label:"My Goals",    sub:"View your goals",      page:"goals"   },
              {icon:"📔",label:"My Journal",  sub:"Your journal entries", page:"journal" },
              {icon:"⚡",label:"Badges & XP", sub:"Your achievements",    page:"badges"  },
              {icon:"📖",label:"My Story",    sub:"Your journey",         page:"my-story"},
            ].map(function(item){
              return (
                <div key={item.page} onClick={function(){ if(onNavigate) onNavigate(item.page); }}
                  style={{display:"flex",alignItems:"center",gap:13,padding:"13px 15px",background:"var(--card)",border:"1px solid var(--border)",borderRadius:13,marginBottom:7,cursor:"pointer",transition:"all .15s",WebkitTapHighlightColor:"transparent"}}
                  onMouseEnter={function(e){e.currentTarget.style.borderColor="rgba(124,92,252,.35)";}}
                  onMouseLeave={function(e){e.currentTarget.style.borderColor="var(--border)";}}>
                  <div style={{width:36,height:36,borderRadius:11,background:"rgba(124,92,252,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{item.icon}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:"var(--text)"}}>{item.label}</div>
                    <div style={{fontSize:11,color:"var(--muted)"}}>{item.sub}</div>
                  </div>
                  <div style={{color:"var(--muted)",fontSize:16}}>›</div>
                </div>
              );
            })}
            <button onClick={function(){
              localStorage.clear();
              document.documentElement.classList.remove("dark");
              window.location.reload();
            }} style={{marginTop:20,width:"100%",padding:13,borderRadius:13,border:"1px solid rgba(248,113,113,0.3)",background:"rgba(248,113,113,0.06)",color:"#f87171",fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:7,WebkitTapHighlightColor:"transparent"}}>
              ⎋ Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Settings;