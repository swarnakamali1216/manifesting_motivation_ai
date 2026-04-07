/**
 * frontend/src/pages/MyStory.jsx
 * FIXED:
 * 1. activeDays now counts unique IST calendar dates (not session count)
 *    Root cause: split("T")[0] on PostgreSQL "2026-03-30 17:29:00" (space, not T)
 *    returns whole string → every session is "unique" → activeDays = sessions.length
 * 2. posCount / moodScore use correct IST date parsing
 */
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";

var API = "https://manifesting-motivation-backend.onrender.com/api";
var POS_EMOTIONS = ["positive","excited","hopeful","focused"];
var NEG_EMOTIONS = ["negative","sad","stressed","anxious","concerned"];
var ECOL = {
  positive:"#4ade80", excited:"#fb923c", focused:"#a78bfa", hopeful:"#60a5fa",
  neutral:"#94a3b8",  stressed:"#fbbf24", anxious:"#fbbf24",
  sad:"#f87171",      negative:"#f87171", concerned:"#f97316",
};

// ── Robust IST date parser ── works for both "2026-03-30T17:29:00" AND "2026-03-30 17:29:00"
function toISTDate(created_at) {
  if (!created_at) return "";
  try {
    var iso = String(created_at).replace(" ", "T");
    if (!iso.includes("Z") && !iso.includes("+")) iso += "Z"; // treat as UTC
    var ts  = new Date(iso).getTime();
    if (isNaN(ts)) return String(created_at).slice(0, 10);
    return new Date(ts + 330 * 60000).toISOString().slice(0, 10);
  } catch(e) {
    return String(created_at).slice(0, 10);
  }
}

function safeXP(xp) {
  if (!xp && xp !== 0) return 0;
  if (typeof xp === "number") return xp;
  if (typeof xp === "object") return 0;
  return parseInt(xp, 10) || 0;
}
function safeLevelName(level) {
  if (!level) return "Seedling";
  if (typeof level === "string") return level;
  if (typeof level === "object" && level !== null) return level.name || "Seedling";
  return "Level " + level;
}
function safeLevelEmoji(level) {
  if (typeof level === "object" && level !== null && level.emoji) return level.emoji;
  return "🌱";
}

function Skeleton({ h, r, mb }) {
  return <div style={{ height:h||"14px", borderRadius:r||"8px", marginBottom:mb||"0", background:"var(--border)", animation:"shimmer 1.4s ease infinite", backgroundImage:"linear-gradient(90deg,var(--border) 25%,rgba(255,255,255,0.06) 50%,var(--border) 75%)", backgroundSize:"200% 100%" }}/>;
}
function SkeletonCard() {
  return (
    <div style={{ background:"var(--card)", borderRadius:"18px", padding:"18px", border:"1px solid var(--border)", marginBottom:"12px" }}>
      <Skeleton h="12px" r="6px" mb="10px"/><Skeleton h="32px" r="8px" mb="8px"/><Skeleton h="12px" r="6px"/>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );
}

function MyStory({ user, appData, onNavigate }) {
  var [sessions,    setSessions]    = useState([]);
  var [gamData,     setGamData]     = useState(null);
  var [goals,       setGoals]       = useState([]);
  var [loading,     setLoading]     = useState(true);
  var [showHistory, setShowHistory] = useState(false);
  var [activeTab,   setActiveTab]   = useState("overview");
  var userId = user ? user.id : null;

  var loadData = useCallback(function() {
    if (!userId) { setLoading(false); return; }
    if (appData && Array.isArray(appData.sessions) && appData.sessions.length > 0) {
      var s = appData.sessions.filter(function(x){ return !x.user_id||String(x.user_id)===String(userId); });
      setSessions(s); setGamData(appData.stats||{}); setGoals(appData.goals||[]); setLoading(false); return;
    }
    setLoading(true);
    Promise.all([
      axios.get(API+"/history?user_id="+userId+"&limit=500").catch(function(){ return {data:[]}; }),
      axios.get(API+"/gamification/stats/"+userId).catch(function(){ return {data:{}}; }),
      axios.get(API+"/goals?user_id="+userId).catch(function(){ return {data:[]}; }),
    ]).then(function(r){
      setSessions((Array.isArray(r[0].data)?r[0].data:[]).filter(function(x){ return !x.user_id||String(x.user_id)===String(userId); }));
      setGamData(r[1].data||{});
      setGoals(Array.isArray(r[2].data)?r[2].data:[]);
    }).finally(function(){ setLoading(false); });
  }, [userId, appData]); // eslint-disable-line

  useEffect(function(){ loadData(); }, [loadData]);

  var posCount       = sessions.filter(function(s){ return POS_EMOTIONS.includes(s.emotion); }).length;
  // ✅ FIXED: Use IST calendar dates — split("T")[0] breaks when PostgreSQL returns "2026-03-30 17:29:00"
  var activeDays     = new Set(sessions.map(function(s){ return toISTDate(s.created_at); }).filter(Boolean)).size;
  var moodScore      = sessions.length ? Math.round((posCount/sessions.length)*100) : 0;
  var completedGoals = goals.filter(function(g){ return g.completed || g.is_complete; }).length;
  var activeGoals    = goals.filter(function(g){ return !g.completed && !g.is_complete; }).length;

  var xp          = safeXP(gamData?.xp);
  var levelName   = safeLevelName(gamData?.level);
  var levelEmoji  = safeLevelEmoji(gamData?.level);
  var earnedCount = gamData?.badges_earned || 0;
  var streak      = gamData?.streak || 0;

  var moodColor = moodScore>=65?"#4ade80":moodScore>=40?"#fbbf24":"#60a5fa";
  var moodLabel = moodScore>=65?"Thriving 🌟":moodScore>=40?"Growing 🌱":"Pushing Through 💙";
  var moodBg    = moodScore>=65?"rgba(74,222,128,0.12)":moodScore>=40?"rgba(251,191,36,0.1)":"rgba(96,165,250,0.1)";

  var days = {};
  sessions.forEach(function(s){
    var d = toISTDate(s.created_at);
    if (!d) return;
    if (!days[d]) days[d]={pos:0,neg:0,total:0};
    days[d].total++;
    if (POS_EMOTIONS.includes(s.emotion)) days[d].pos++;
    if (NEG_EMOTIONS.includes(s.emotion)) days[d].neg++;
  });
  var last7 = Object.keys(days).sort().slice(-7);

  var STATS = [
    {label:"AI Sessions",value:sessions.length, color:"#7c5cfc",icon:"💬",sub:"total chats"},
    {label:"Active Days", value:activeDays,      color:"#fb923c",icon:"🔥",sub:"showed up"},
    {label:"Goals Done",  value:completedGoals,  color:"#4ade80",icon:"🎯",sub:activeGoals+" active"},
    {label:"Positive %",  value:moodScore+"%",   color:moodColor,icon:"😊",sub:posCount+" positive"},
  ];

  var TABS=[{id:"overview",label:"Overview"},{id:"mood",label:"Mood"},{id:"goals",label:"Goals"},{id:"sessions",label:"Sessions"}];

  if (loading) return (
    <div style={{paddingBottom:"24px"}}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}} @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{marginBottom:"22px"}}><Skeleton h="32px" r="10px" mb="8px"/><Skeleton h="14px" r="6px"/></div>
      <SkeletonCard/><SkeletonCard/><SkeletonCard/>
    </div>
  );

  return (
    <div style={{animation:"fadeIn 0.3s ease",paddingBottom:"8px"}}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}`}</style>

      <div style={{marginBottom:"18px"}}>
        <h1 style={{fontFamily:"'Syne',sans-serif",fontWeight:"900",fontSize:"clamp(22px,5vw,28px)",background:"linear-gradient(135deg,#e8e0ff 30%,#9b8aff)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:"3px",letterSpacing:"-0.5px",lineHeight:1.2}}>My Story 📖</h1>
        <p style={{color:"var(--muted)",fontSize:"13px"}}>Your complete journey — mood, goals, XP, history.</p>
      </div>

      {/* Overall vibe */}
      <div style={{borderRadius:"20px",padding:"20px 22px",marginBottom:"12px",background:moodBg,border:"1px solid "+moodColor+"44",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:"-40px",right:"-40px",width:"130px",height:"130px",borderRadius:"50%",background:moodColor+"25",filter:"blur(35px)",pointerEvents:"none"}}/>
        <div style={{fontSize:"10px",fontWeight:"800",color:"var(--muted)",letterSpacing:"0.14em",marginBottom:"6px",fontFamily:"'Syne',sans-serif"}}>YOUR OVERALL VIBE</div>
        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:"900",fontSize:"clamp(22px,5vw,30px)",color:moodColor,marginBottom:"5px",lineHeight:1}}>{moodLabel}</div>
        <div style={{fontSize:"12px",color:"var(--muted)",lineHeight:"1.6"}}>
          {sessions.length} sessions · {activeDays} active days · {moodScore}% positive
          {streak>0&&" · 🔥 "+streak+" day streak"}
        </div>
      </div>

      {/* Stat cards */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"12px"}}>
        {STATS.map(function(s){ return (
          <div key={s.label} style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:"16px",padding:"16px 14px"}}>
            <div style={{fontSize:"20px",marginBottom:"6px"}}>{s.icon}</div>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:"900",fontSize:"clamp(20px,4vw,26px)",color:s.color,marginBottom:"3px",lineHeight:1}}>{s.value}</div>
            <div style={{fontSize:"12px",color:"var(--text)",fontWeight:"700",marginBottom:"1px"}}>{s.label}</div>
            <div style={{fontSize:"10px",color:"var(--muted)"}}>{s.sub}</div>
          </div>
        ); })}
      </div>

      {/* XP + Level banner */}
      <button onClick={function(){if(onNavigate)onNavigate("badges");}}
        style={{width:"100%",background:"none",border:"none",cursor:"pointer",padding:"0",display:"block",textAlign:"left",marginBottom:"12px",WebkitTapHighlightColor:"transparent"}}>
        <div style={{background:"linear-gradient(135deg,rgba(124,92,252,0.1),rgba(252,92,240,0.05))",border:"1px solid rgba(124,92,252,0.22)",borderRadius:"18px",padding:"16px 18px",display:"flex",alignItems:"center",gap:"14px"}}>
          <div style={{textAlign:"center",flexShrink:0}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:"900",fontSize:"clamp(24px,5vw,32px)",background:"linear-gradient(135deg,#7c5cfc,#fc5cf0)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1}}>{xp.toLocaleString()}</div>
            <div style={{fontSize:"9px",color:"var(--muted)",marginTop:"2px",letterSpacing:"0.06em"}}>XP</div>
          </div>
          <div style={{width:"1px",height:"40px",background:"rgba(124,92,252,0.2)",flexShrink:0}}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:"800",fontSize:"15px",color:"var(--accent)",marginBottom:"2px"}}>{levelEmoji} Level: {levelName}</div>
            <div style={{fontSize:"12px",color:"var(--muted)"}}>{earnedCount} badge{earnedCount!==1?"s":""} earned · tap to see all →</div>
          </div>
          <div style={{fontSize:"22px"}}>🏆</div>
        </div>
      </button>

      {/* Tabs */}
      <div style={{display:"flex",gap:"0",borderBottom:"1px solid var(--border)",marginBottom:"16px",overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
        {TABS.map(function(t){ return (
          <button key={t.id} onClick={function(){setActiveTab(t.id);}}
            style={{padding:"8px 14px",border:"none",background:"transparent",cursor:"pointer",fontFamily:"'Syne',sans-serif",fontWeight:"700",fontSize:"12px",color:activeTab===t.id?"var(--accent)":"var(--muted)",borderBottom:activeTab===t.id?"2px solid var(--accent)":"2px solid transparent",marginBottom:"-1px",transition:"all 0.15s",whiteSpace:"nowrap",WebkitTapHighlightColor:"transparent",minHeight:"40px"}}>
            {t.label}
          </button>
        ); })}
      </div>

      {/* OVERVIEW */}
      {activeTab==="overview"&&(
        <div style={{animation:"fadeIn 0.2s ease"}}>
          {goals.length>0&&(
            <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:"18px",padding:"18px",marginBottom:"12px"}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:"10px",fontWeight:"800",color:"var(--muted)",letterSpacing:"0.12em",marginBottom:"12px"}}>GOALS SNAPSHOT</div>
              <div style={{display:"flex",gap:"8px",marginBottom:"12px"}}>
                <div style={{flex:1,padding:"12px",borderRadius:"12px",background:"rgba(74,222,128,0.07)",border:"1px solid rgba(74,222,128,0.2)",textAlign:"center"}}>
                  <div style={{fontFamily:"'Syne',sans-serif",fontWeight:"900",fontSize:"24px",color:"#4ade80",lineHeight:1}}>{completedGoals}</div>
                  <div style={{fontSize:"10px",color:"var(--muted)",marginTop:"4px"}}>Done ✓</div>
                </div>
                <div style={{flex:1,padding:"12px",borderRadius:"12px",background:"rgba(124,92,252,0.07)",border:"1px solid rgba(124,92,252,0.2)",textAlign:"center"}}>
                  <div style={{fontFamily:"'Syne',sans-serif",fontWeight:"900",fontSize:"24px",color:"#7c5cfc",lineHeight:1}}>{activeGoals}</div>
                  <div style={{fontSize:"10px",color:"var(--muted)",marginTop:"4px"}}>In Progress</div>
                </div>
              </div>
              {goals.filter(function(g){return !g.completed&&!g.is_complete;}).slice(0,3).map(function(g){ return (
                <div key={g.id} style={{display:"flex",alignItems:"center",gap:"10px",padding:"9px 0",borderBottom:"1px solid var(--border)"}}>
                  <div style={{width:"6px",height:"6px",borderRadius:"50%",background:"var(--accent)",flexShrink:0}}/>
                  <div style={{flex:1,fontSize:"13px",color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{g.title}</div>
                  <div style={{fontSize:"10px",color:"var(--muted)",flexShrink:0}}>{g.category}</div>
                </div>
              ); })}
            </div>
          )}
          {sessions.length>0&&(
            <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:"18px",padding:"18px"}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:"10px",fontWeight:"800",color:"var(--muted)",letterSpacing:"0.12em",marginBottom:"12px"}}>RECENT ACTIVITY</div>
              {sessions.slice(0,3).map(function(s){
                var ec=ECOL[s.emotion]||"#94a3b8";
                return (
                  <div key={s.id||Math.random()} style={{display:"flex",gap:"10px",alignItems:"flex-start",padding:"10px 0",borderBottom:"1px solid var(--border)"}}>
                    <div style={{width:"8px",height:"8px",minWidth:"8px",borderRadius:"50%",background:ec,marginTop:"5px"}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:"12px",color:"var(--muted)",fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",lineHeight:"1.5"}}>"{(s.user_input||"").slice(0,80)}"</div>
                      <div style={{fontSize:"10px",color:ec,fontWeight:"700",marginTop:"2px",fontFamily:"'Syne',sans-serif"}}>{(s.emotion||"neutral").toUpperCase()}</div>
                    </div>
                    <div style={{fontSize:"10px",color:"var(--muted)",flexShrink:0}}>{toISTDate(s.created_at).slice(5)}</div>
                  </div>
                );
              })}
              <button onClick={function(){setActiveTab("sessions");}} style={{marginTop:"10px",fontSize:"11px",color:"var(--accent)",background:"none",border:"none",cursor:"pointer",fontWeight:"700",WebkitTapHighlightColor:"transparent"}}>See all sessions →</button>
            </div>
          )}
          {sessions.length===0&&goals.length===0&&(
            <div style={{textAlign:"center",padding:"40px 20px",background:"var(--card)",borderRadius:"20px",border:"1px solid var(--border)"}}>
              <div style={{fontSize:"48px",marginBottom:"12px"}}>🌱</div>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:"800",fontSize:"18px",color:"var(--text)",marginBottom:"8px"}}>Your story starts here</div>
              <div style={{fontSize:"13px",color:"var(--muted)",lineHeight:"1.7"}}>Chat with AI on the Home page and set goals — your journey will show up here.</div>
            </div>
          )}
        </div>
      )}

      {/* MOOD */}
      {activeTab==="mood"&&(
        <div style={{animation:"fadeIn 0.2s ease"}}>
          {last7.length>0?(
            <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:"18px",padding:"18px",marginBottom:"12px"}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:"10px",fontWeight:"800",color:"var(--muted)",letterSpacing:"0.12em",marginBottom:"16px"}}>MOOD — LAST 7 DAYS</div>
              <div style={{display:"flex",gap:"6px",alignItems:"flex-end",height:"80px"}}>
                {last7.map(function(d){
                  var t=days[d].total;
                  var posH=t?Math.round((days[d].pos/t)*64):0;
                  var negH=t?Math.round((days[d].neg/t)*64):0;
                  var neutH=t?Math.max(0,64-posH-negH):0;
                  return (
                    <div key={d} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"4px"}}>
                      <div style={{width:"100%",display:"flex",flexDirection:"column",gap:"2px",height:"66px",justifyContent:"flex-end"}}>
                        {posH>0&&<div style={{height:posH+"px",minHeight:"4px",background:"rgba(74,222,128,0.75)",borderRadius:"3px 3px 0 0",transition:"height 0.5s ease"}}/>}
                        {neutH>0&&<div style={{height:neutH+"px",minHeight:"4px",background:"rgba(148,163,184,0.4)",borderRadius:posH===0?"3px 3px 0 0":"0"}}/>}
                        {negH>0&&<div style={{height:negH+"px",minHeight:"4px",background:"rgba(248,113,113,0.65)",borderRadius:"3px 3px 0 0"}}/>}
                      </div>
                      <div style={{fontSize:"9px",color:"var(--muted)"}}>{d.slice(5)}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{display:"flex",gap:"14px",marginTop:"12px",flexWrap:"wrap"}}>
                {[{c:"rgba(74,222,128,0.75)",l:"Positive"},{c:"rgba(148,163,184,0.4)",l:"Neutral"},{c:"rgba(248,113,113,0.65)",l:"Tough"}].map(function(x){ return (
                  <div key={x.l} style={{display:"flex",alignItems:"center",gap:"5px"}}><div style={{width:"8px",height:"8px",background:x.c,borderRadius:"2px",flexShrink:0}}/><span style={{fontSize:"10px",color:"var(--muted)"}}>{x.l}</span></div>
                ); })}
              </div>
            </div>
          ):(
            <div style={{textAlign:"center",padding:"40px 20px",background:"var(--card)",borderRadius:"18px",border:"1px solid var(--border)"}}>
              <div style={{fontSize:"40px",marginBottom:"10px"}}>📊</div>
              <div style={{fontSize:"14px",color:"var(--muted)"}}>Chat with the AI to build your mood history.</div>
            </div>
          )}
          {sessions.length>0&&(
            <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:"18px",padding:"18px"}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:"10px",fontWeight:"800",color:"var(--muted)",letterSpacing:"0.12em",marginBottom:"14px"}}>EMOTION BREAKDOWN</div>
              {(function(){
                var counts={};
                sessions.forEach(function(s){counts[s.emotion||"neutral"]=(counts[s.emotion||"neutral"]||0)+1;});
                return Object.entries(counts).sort(function(a,b){return b[1]-a[1];}).slice(0,6).map(function(entry){
                  var e=entry[0];var cnt=entry[1];var pct=Math.round((cnt/sessions.length)*100);var ec=ECOL[e]||"#94a3b8";
                  return (
                    <div key={e} style={{marginBottom:"10px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:"4px"}}>
                        <span style={{fontSize:"12px",color:"var(--text)",textTransform:"capitalize",fontWeight:"600"}}>{e}</span>
                        <span style={{fontSize:"11px",color:ec,fontWeight:"800"}}>{cnt}x ({pct}%)</span>
                      </div>
                      <div style={{height:"6px",borderRadius:"3px",background:"var(--border)",overflow:"hidden"}}>
                        <div style={{height:"100%",width:pct+"%",background:ec,borderRadius:"3px",transition:"width 0.8s ease"}}/>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      )}

      {/* GOALS */}
      {activeTab==="goals"&&(
        <div style={{animation:"fadeIn 0.2s ease"}}>
          {goals.length===0?(
            <div style={{textAlign:"center",padding:"40px 20px",background:"var(--card)",borderRadius:"18px",border:"1px solid var(--border)"}}>
              <div style={{fontSize:"40px",marginBottom:"10px"}}>🎯</div>
              <div style={{fontSize:"14px",color:"var(--muted)"}}>No goals yet — head to My Goals to add one!</div>
            </div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
              {goals.map(function(g){ return (
                <div key={g.id} style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:"14px",padding:"14px 16px",display:"flex",alignItems:"center",gap:"12px"}}>
                  <div style={{fontSize:"20px",flexShrink:0}}>{(g.completed||g.is_complete)?"✅":"⏳"}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:"13px",fontWeight:"700",color:(g.completed||g.is_complete)?"var(--muted)":"var(--text)",textDecoration:(g.completed||g.is_complete)?"line-through":"none",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",lineHeight:1.3}}>{g.title}</div>
                    <div style={{fontSize:"10px",color:"var(--muted)",marginTop:"2px"}}>{g.category}{g.deadline?" · "+g.deadline:""}</div>
                  </div>
                  {(g.completed||g.is_complete)&&<span style={{fontSize:"9px",padding:"2px 8px",borderRadius:"8px",background:"rgba(74,222,128,0.1)",color:"#4ade80",fontWeight:"800",border:"1px solid rgba(74,222,128,0.3)",flexShrink:0}}>DONE</span>}
                </div>
              ); })}
            </div>
          )}
        </div>
      )}

      {/* SESSIONS */}
      {activeTab==="sessions"&&(
        <div style={{animation:"fadeIn 0.2s ease"}}>
          {sessions.length===0?(
            <div style={{textAlign:"center",padding:"40px 20px",background:"var(--card)",borderRadius:"18px",border:"1px solid var(--border)"}}>
              <div style={{fontSize:"40px",marginBottom:"10px"}}>💬</div>
              <div style={{fontSize:"14px",color:"var(--muted)"}}>No sessions yet — start chatting on the Home page!</div>
            </div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
              {sessions.slice(0,showHistory?sessions.length:8).map(function(s){
                var ec=ECOL[s.emotion]||"#94a3b8";
                return (
                  <div key={s.id||Math.random()} style={{padding:"12px 14px",borderRadius:"14px",background:"var(--card)",border:"1px solid var(--border)"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"5px",flexWrap:"wrap",gap:"4px"}}>
                      <span style={{fontSize:"10px",fontWeight:"800",color:ec,fontFamily:"'Syne',sans-serif"}}>{(s.emotion||"neutral").toUpperCase()}</span>
                      <span style={{fontSize:"10px",color:"var(--muted)"}}>{toISTDate(s.created_at)}</span>
                    </div>
                    {s.user_input&&<div style={{fontSize:"12px",color:"var(--muted)",fontStyle:"italic",lineHeight:"1.5"}}>"{s.user_input.slice(0,120)}{s.user_input.length>120?"...":""}"</div>}
                  </div>
                );
              })}
              {sessions.length>8&&(
                <button onClick={function(){setShowHistory(function(v){return !v;});}}
                  style={{padding:"10px",borderRadius:"12px",border:"1px solid var(--border)",background:"transparent",color:"var(--accent)",cursor:"pointer",fontFamily:"'Syne',sans-serif",fontWeight:"700",fontSize:"12px",WebkitTapHighlightColor:"transparent"}}>
                  {showHistory?"Show Less ↑":"Load All "+sessions.length+" Sessions ↓"}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MyStory;
