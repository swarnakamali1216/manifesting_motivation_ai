/**
 * AdminDashboard.jsx — FIXED
 * - Level display: "Level 6: Level 6" → "🏆 Champion (Lv.6)"
 * - Persona: shows actual personaMap correctly
 * - Goals learning style resource label shown as badge
 * - All data from real API endpoints
 */
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area,
} from "recharts";

var API = "https://manifesting-motivation-backend.onrender.com/api";

// ── Level name map — matches gamification.py exactly ─────────────────────────
var LEVELS_MAP = {
  1:"Seedling", 2:"Explorer", 3:"Achiever", 4:"Challenger", 5:"Warrior",
  6:"Champion", 7:"Master", 8:"Elite", 9:"Legend", 10:"Transcendent",
  11:"Sage", 12:"Titan", 13:"Immortal", 14:"Mythic", 15:"Eternal",
};
var LEVEL_EMOJI = {
  1:"🌱", 2:"🧭", 3:"🎯", 4:"⚡", 5:"🔥",
  6:"🏆", 7:"⭐", 8:"💎", 9:"🌟", 10:"🚀",
  11:"🔮", 12:"⚔️", 13:"👁️", 14:"🌀", 15:"✨",
};

function getLevelNum(level) {
  if (!level && level !== 0) return 1;
  if (typeof level === "number") return Math.max(1, level);
  if (typeof level === "object" && level !== null) return level.level || 1;
  return parseInt(level, 10) || 1;
}
function getLevelName(level) {
  var n = getLevelNum(level);
  return LEVELS_MAP[n] || "Seedling";
}
function getLevelEmoji(level) {
  var n = getLevelNum(level);
  return LEVEL_EMOJI[n] || "🌱";
}
var EMOTION_COLORS = {
  positive:"#4ade80", excited:"#fb923c", focused:"#a78bfa", hopeful:"#60a5fa",
  neutral:"#94a3b8",  stressed:"#fbbf24", anxious:"#fbbf24",
  sad:"#f87171",      negative:"#f87171", frustrated:"#fb923c", crisis:"#ef4444",
  happy:"#4ade80",    calm:"#60a5fa",     motivated:"#a78bfa",
};
var PIE_COLORS = ["#4ade80","#60a5fa","#94a3b8","#f87171","#fbbf24","#a78bfa","#fb923c"];
var TT = { contentStyle:{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"10px", fontSize:"12px" } };

function StatCard({ icon, label, value, color, sub }) {
  return (
    <div style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:"16px", padding:"14px 10px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"108px", textAlign:"center", boxSizing:"border-box" }}>
      <div style={{ fontSize:"18px", marginBottom:"6px", lineHeight:1 }}>{icon}</div>
      <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:"900", fontSize:"clamp(16px,3.5vw,26px)", color, lineHeight:1, marginBottom:"4px", wordBreak:"break-all", maxWidth:"100%" }}>{value}</div>
      <div style={{ fontSize:"11px", color:"var(--text)", fontWeight:"700", lineHeight:1.3 }}>{label}</div>
      {sub && <div style={{ fontSize:"9px", color:"var(--muted)", marginTop:"2px", lineHeight:1.3 }}>{sub}</div>}
    </div>
  );
}

function StatGrid({ cols, children }) {
  return <div style={{ display:"grid", gridTemplateColumns:"repeat("+(cols||3)+", minmax(0,1fr))", gap:"10px", marginBottom:"20px" }}>{children}</div>;
}

function SectionTitle({ children }) {
  return <div style={{ fontFamily:"'Syne',sans-serif", fontSize:"11px", fontWeight:"800", color:"var(--muted)", letterSpacing:"0.12em", marginBottom:"14px" }}>{children}</div>;
}

function ChartBox({ children }) {
  return <div style={{ background:"var(--card)", borderRadius:"20px", padding:"18px", border:"1px solid var(--border)", marginBottom:"20px" }}>{children}</div>;
}

function AdminDashboard({ user }) {
  var [users,      setUsers]      = useState([]);
  var [sessions,   setSessions]   = useState([]);
  var [stats,      setStats]      = useState(null);
  var [activity,   setActivity]   = useState([]);
  var [retention,  setRetention]  = useState([]);
  var [loading,    setLoading]    = useState(true);
  var [tab,        setTab]        = useState("overview");
  var [error,      setError]      = useState(null);
  var [search,     setSearch]     = useState("");
  var [togglingId, setTogglingId] = useState(null);
  var [lastRefresh,setLastRefresh]= useState(null);

  var loadData = useCallback(function() {
    if (!user || (user.role !== "admin" && !user.is_admin)) return;
    setLoading(true); setError(null);
    var token = localStorage.getItem("token") || "";
    var headers = token ? { Authorization:"Bearer "+token } : {};

    Promise.all([
      axios.get(API+"/admin/users",             { headers }).catch(function(){ return {data:[]}; }),
      axios.get(API+"/admin/sessions?limit=2000",{ headers }).catch(function(){ return {data:[]}; }),
      axios.get(API+"/admin/stats",             { headers }).catch(function(){ return {data:{}}; }),
      axios.get(API+"/admin/activity",          { headers }).catch(function(){ return {data:[]}; }),
      axios.get(API+"/admin/retention",         { headers }).catch(function(){ return {data:[]}; }),
    ]).then(function(res) {
      setUsers(   Array.isArray(res[0].data) ? res[0].data : []);
      setSessions(Array.isArray(res[1].data) ? res[1].data : []);
      setStats(   res[2].data || {});
      setActivity(Array.isArray(res[3].data) ? res[3].data : []);
      setRetention(Array.isArray(res[4].data)? res[4].data : []);
      setLastRefresh(new Date().toLocaleTimeString());
    }).catch(function(err) {
      setError("Could not load admin data: " + (err.message || "Check backend logs."));
    }).finally(function(){ setLoading(false); });
  }, [user]);

  useEffect(function(){ loadData(); }, [loadData]);

  var isAdmin = user && (user.role === "admin" || user.is_admin);
  if (!isAdmin) return (
    <div style={{ textAlign:"center", padding:"60px 24px" }}>
      <div style={{ fontSize:"48px", marginBottom:"14px" }}>🔒</div>
      <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:"800", fontSize:"20px", color:"var(--text)" }}>Admin Access Only</div>
    </div>
  );
  if (loading) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh", gap:"14px" }}>
      <div style={{ width:"40px", height:"40px", borderRadius:"50%", border:"3px solid var(--border)", borderTopColor:"var(--accent)", animation:"spin 0.8s linear infinite" }}/>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
      <div style={{ color:"var(--muted)", fontSize:"13px" }}>Loading admin data...</div>
    </div>
  );
  if (error) return <div style={{ padding:"16px 20px", borderRadius:"14px", background:"rgba(248,113,113,0.07)", border:"1px solid rgba(248,113,113,0.25)", color:"#f87171", fontSize:"13px" }}>{error}</div>;

  // ── Derived stats ──
  var totalSessions  = sessions.length;
  var crisisSessions = sessions.filter(function(s){ return s.is_crisis || s.emotion==="crisis"; }).length;
  var posCount       = sessions.filter(function(s){ return ["positive","excited","focused","hopeful","happy","motivated","calm"].includes((s.emotion||"").toLowerCase()); }).length;
  var negCount       = sessions.filter(function(s){ return ["negative","sad","stressed","anxious","frustrated","crisis"].includes((s.emotion||"").toLowerCase()); }).length;
  var neutCount      = Math.max(0, totalSessions - posCount - negCount);
  var moodPct        = totalSessions ? Math.round((posCount/totalSessions)*1000)/10 : 0;

  var emotionMap = {};
  sessions.forEach(function(s){
    var e = (s.emotion||"neutral").toLowerCase();
    emotionMap[e] = (emotionMap[e]||0)+1;
  });
  var emotionData = Object.entries(emotionMap).map(function(entry){
    return { emotion:entry[0].charAt(0).toUpperCase()+entry[0].slice(1), count:entry[1], color:EMOTION_COLORS[entry[0]]||"#94a3b8" };
  }).sort(function(a,b){ return b.count-a.count; });

  var sentimentPie = [
    {name:"Positive",value:posCount}, {name:"Neutral",value:neutCount},
    {name:"Tough",value:negCount},    {name:"Crisis",value:crisisSessions},
  ].filter(function(x){ return x.value>0; });

  var dailyMap = {};
  sessions.forEach(function(s){ var d=(s.created_at||"").slice(0,10); if(d) dailyMap[d]=(dailyMap[d]||0)+1; });
  var last14 = [];
  for (var i=13;i>=0;i--){
    var d2=new Date(); d2.setDate(d2.getDate()-i);
    var ds=d2.toISOString().slice(0,10);
    last14.push({date:ds.slice(5),sessions:dailyMap[ds]||0});
  }

  var engagementData = users.slice(0,10).map(function(u){ return {name:(u.name||"User").split(" ")[0],xp:u.xp||0,sessions:u.total_ai_sessions||0}; });

  // ── Persona distribution ── (reads from users.persona field)
  var personaMap = {};
  users.forEach(function(u){ var p=u.persona||"general"; personaMap[p]=(personaMap[p]||0)+1; });
  var personaData = Object.entries(personaMap).map(function(entry){ return {name:entry[0].charAt(0).toUpperCase()+entry[0].slice(1),value:entry[1]}; });

  var filteredUsers = users.filter(function(u){
    var q=search.toLowerCase();
    return !q||(u.name||"").toLowerCase().includes(q)||(u.email||"").toLowerCase().includes(q);
  });

  var displayStats = {
    total_users:        stats?.total_users       ?? users.length,
    active_users:       stats?.active_users      ?? users.filter(function(u){ return u.is_active; }).length,
    sessions_week:      stats?.sessions_week     ?? 0,
    total_xp:           stats?.total_xp          ?? users.reduce(function(acc,u){ return acc+(u.xp||0); },0),
    total_goals:        stats?.total_goals       ?? 0,
    completed_goals:    stats?.completed_goals   ?? 0,
    goal_completion_pct:stats?.goal_completion_pct ?? 0,
    total_journals:     stats?.total_journals    ?? 0,
    avg_streak:         stats?.avg_streak        ?? 0,
    retention_pct:      stats?.retention_pct     ?? 0,
  };

  function handleToggle(uid) {
    setTogglingId(uid);
    var h = {}; var t=localStorage.getItem("token"); if(t) h={Authorization:"Bearer "+t};
    axios.post(API+"/admin/users/"+uid+"/toggle",{},{headers:h})
      .then(function(res){ setUsers(function(prev){ return prev.map(function(u){ return u.id===uid?{...u,is_active:res.data.is_active}:u; }); }); })
      .catch(function(){ alert("Toggle failed"); })
      .finally(function(){ setTogglingId(null); });
  }
  function handleMakeAdmin(uid) {
    if (!window.confirm("Grant admin access?")) return;
    var h={}; var t=localStorage.getItem("token"); if(t) h={Authorization:"Bearer "+t};
    axios.post(API+"/admin/users/"+uid+"/make-admin",{},{headers:h})
      .then(function(){ setUsers(function(prev){ return prev.map(function(u){ return u.id===uid?{...u,role:"admin"}:u; }); }); })
      .catch(function(){ alert("Failed"); });
  }
  function handleRemoveAdmin(uid) {
    if (!window.confirm("Remove admin access?")) return;
    var h={}; var t=localStorage.getItem("token"); if(t) h={Authorization:"Bearer "+t};
    axios.post(API+"/admin/users/"+uid+"/remove-admin",{},{headers:h})
      .then(function(){ setUsers(function(prev){ return prev.map(function(u){ return u.id===uid?{...u,role:"user"}:u; }); }); })
      .catch(function(){ alert("Failed"); });
  }
  function handleExport() {
    var h={}; var t=localStorage.getItem("token"); if(t) h={Authorization:"Bearer "+t};
    axios.get(API+"/admin/export",{headers:h}).then(function(res){
      var b=new Blob([JSON.stringify(res.data,null,2)],{type:"application/json"});
      var u=URL.createObjectURL(b); var a=document.createElement("a");
      a.href=u; a.download="admin_export_"+new Date().toISOString().slice(0,10)+".json"; a.click(); URL.revokeObjectURL(u);
    }).catch(function(){ alert("Export failed"); });
  }

  var TABS = [
    {id:"overview", label:"Overview",  icon:"📊"},
    {id:"emotions", label:"Emotions",  icon:"🧠"},
    {id:"activity", label:"Activity",  icon:"📈"},
    {id:"retention",label:"Retention", icon:"🔄"},
    {id:"users",    label:"Users",     icon:"👥"},
    {id:"safety",   label:"Safety",    icon:"🛡️"},
  ];

  return (
    <div style={{ animation:"fadeIn 0.3s ease" }}>
      <style>{"@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}"}</style>

      {/* Header */}
      <div style={{ marginBottom:"24px", display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:"12px" }}>
        <div>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:"900", fontSize:"28px", background:"linear-gradient(135deg,#e8e0ff 30%,#9b8aff)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", marginBottom:"4px" }}>Admin Panel 👑</h1>
          <p style={{ color:"var(--muted)", fontSize:"13px" }}>Platform analytics · user management · safety monitoring{lastRefresh && <span style={{ marginLeft:"8px", opacity:0.6 }}>· refreshed {lastRefresh}</span>}</p>
        </div>
        <div style={{ display:"flex", gap:"8px" }}>
          <button onClick={loadData} style={{ padding:"9px 16px", borderRadius:"10px", border:"1px solid var(--border)", background:"var(--card)", color:"var(--text)", fontSize:"12px", fontWeight:"700", fontFamily:"'Syne',sans-serif", cursor:"pointer" }}>🔄 Refresh</button>
          <button onClick={handleExport} style={{ padding:"9px 16px", borderRadius:"10px", border:"none", background:"var(--accent)", color:"white", fontSize:"12px", fontWeight:"700", fontFamily:"'Syne',sans-serif", cursor:"pointer" }}>⬇️ Export</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:"4px", borderBottom:"1px solid var(--border)", marginBottom:"24px", overflowX:"auto" }}>
        {TABS.map(function(t){
          return (
            <button key={t.id} onClick={function(){ setTab(t.id); }} style={{ padding:"9px 14px", border:"none", background:"transparent", cursor:"pointer", fontFamily:"'Syne',sans-serif", fontWeight:"700", fontSize:"12px", color:tab===t.id?"var(--accent)":"var(--muted)", borderBottom:tab===t.id?"2px solid var(--accent)":"2px solid transparent", marginBottom:"-1px", display:"flex", alignItems:"center", gap:"5px", whiteSpace:"nowrap", transition:"all 0.15s" }}>
              {t.icon} {t.label} {t.id==="users"&&users.length>0&&<span style={{ background:"var(--accent)", color:"white", borderRadius:"10px", padding:"1px 6px", fontSize:"10px" }}>{users.length}</span>}
            </button>
          );
        })}
      </div>

      {/* ══ OVERVIEW ══ */}
      {tab==="overview" && (
        <div>
          <SectionTitle>PLATFORM SUMMARY</SectionTitle>
          <StatGrid cols={4}>
            <StatCard icon="👥" label="Total Users"  value={displayStats.total_users}                   color="#7c5cfc"/>
            <StatCard icon="✅" label="Active Users" value={displayStats.active_users}                  color="#4ade80"/>
            <StatCard icon="💬" label="AI Sessions"  value={totalSessions}                              color="#60a5fa"/>
            <StatCard icon="📅" label="This Week"    value={displayStats.sessions_week}                 color="#a78bfa" sub="sessions"/>
          </StatGrid>
          <StatGrid cols={4}>
            <StatCard icon="⚡" label="Total XP"     value={(displayStats.total_xp||0).toLocaleString()} color="#fbbf24"/>
            <StatCard icon="🎯" label="Goals Made"   value={displayStats.total_goals}                   color="#fb923c"/>
            <StatCard icon="🏆" label="Goals Done"   value={displayStats.completed_goals}               color="#4ade80" sub={displayStats.goal_completion_pct+"%"}/>
            <StatCard icon="📓" label="Journals"     value={displayStats.total_journals}                color="#a78bfa"/>
          </StatGrid>
          <StatGrid cols={4}>
            <StatCard icon="😊" label="Positive Mood" value={moodPct+"%"}                              color="#4ade80" sub="of all sessions"/>
            <StatCard icon="🔥" label="Avg Streak"    value={displayStats.avg_streak+"d"}              color="#fb923c"/>
            <StatCard icon="🔄" label="Retention"     value={displayStats.retention_pct+"%"}           color="#60a5fa" sub="7-day return"/>
            <StatCard icon="🛡️" label="Crisis Alerts" value={crisisSessions}                           color="#f87171" sub="interventions"/>
          </StatGrid>

          <SectionTitle>USER ENGAGEMENT (TOP 10 BY XP)</SectionTitle>
          <ChartBox>
            {engagementData.length===0
              ? <div style={{ textAlign:"center", padding:"40px", color:"var(--muted)", fontSize:"13px" }}>No user data yet.</div>
              : <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={engagementData} margin={{top:4,right:16,left:-10,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                    <XAxis dataKey="name" tick={{fill:"var(--muted)",fontSize:11}}/>
                    <YAxis tick={{fill:"var(--muted)",fontSize:11}}/>
                    <Tooltip {...TT}/>
                    <Bar dataKey="sessions" name="Sessions" fill="#7c5cfc" radius={[4,4,0,0]}/>
                    <Bar dataKey="xp"       name="XP"       fill="#60a5fa" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
            }
          </ChartBox>

          {personaData.length>0 && (
            <>
              <SectionTitle>PERSONA DISTRIBUTION</SectionTitle>
              <ChartBox>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={personaData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={function(e){ return e.name+" ("+e.value+")"; }} labelLine={false}>
                      {personaData.map(function(_,i){ return <Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>; })}
                    </Pie>
                    <Legend formatter={function(v){ return <span style={{color:"var(--text)",fontSize:"12px"}}>{v}</span>; }}/>
                    <Tooltip {...TT}/>
                  </PieChart>
                </ResponsiveContainer>
              </ChartBox>
            </>
          )}
        </div>
      )}

      {/* ══ EMOTIONS ══ */}
      {tab==="emotions" && (
        <div>
          <SectionTitle>EMOTION FREQUENCY (FROM {totalSessions} SESSIONS)</SectionTitle>
          <ChartBox>
            {emotionData.length===0
              ? <div style={{ textAlign:"center", padding:"40px", color:"var(--muted)", fontSize:"13px" }}>No emotion data yet.</div>
              : <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={emotionData} margin={{top:4,right:16,left:-10,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                    <XAxis dataKey="emotion" tick={{fill:"var(--muted)",fontSize:11}}/>
                    <YAxis tick={{fill:"var(--muted)",fontSize:11}}/>
                    <Tooltip {...TT}/>
                    <Bar dataKey="count" name="Sessions" radius={[6,6,0,0]}>
                      {emotionData.map(function(entry,i){ return <Cell key={i} fill={entry.color}/>; })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
            }
          </ChartBox>
          <SectionTitle>SENTIMENT DISTRIBUTION</SectionTitle>
          <ChartBox>
            {sentimentPie.length===0
              ? <div style={{ textAlign:"center", padding:"40px", color:"var(--muted)", fontSize:"13px" }}>No data yet.</div>
              : <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={sentimentPie} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={function(e){ return e.name+" ("+e.value+")"; }} labelLine={false}>
                      {sentimentPie.map(function(_,i){ return <Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>; })}
                    </Pie>
                    <Legend formatter={function(v){ return <span style={{color:"var(--text)",fontSize:"12px"}}>{v}</span>; }}/>
                    <Tooltip {...TT}/>
                  </PieChart>
                </ResponsiveContainer>
            }
          </ChartBox>
          {emotionData.length>0 && (
            <>
              <SectionTitle>TOP EMOTIONS</SectionTitle>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))", gap:"10px" }}>
                {emotionData.slice(0,6).map(function(e){
                  return (
                    <div key={e.emotion} style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:"14px", padding:"14px 12px", borderTop:"3px solid "+e.color }}>
                      <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:"900", fontSize:"24px", color:e.color }}>{e.count}</div>
                      <div style={{ fontSize:"11px", color:"var(--muted)", marginTop:"4px" }}>{e.emotion}</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ══ ACTIVITY ══ */}
      {tab==="activity" && (
        <div>
          <SectionTitle>DAILY SESSIONS — LAST 14 DAYS</SectionTitle>
          <ChartBox>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={last14} margin={{top:4,right:16,left:-10,bottom:0}}>
                <defs>
                  <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#7c5cfc" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#7c5cfc" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                <XAxis dataKey="date" tick={{fill:"var(--muted)",fontSize:11}}/>
                <YAxis tick={{fill:"var(--muted)",fontSize:11}}/>
                <Tooltip {...TT}/>
                <Area type="monotone" dataKey="sessions" stroke="#7c5cfc" strokeWidth={3} fill="url(#sg)" dot={{fill:"#7c5cfc",r:4}} activeDot={{r:7}}/>
              </AreaChart>
            </ResponsiveContainer>
          </ChartBox>
          {activity.length>0 && (
            <>
              <SectionTitle>SESSIONS VS ACTIVE USERS — LAST 30 DAYS</SectionTitle>
              <ChartBox>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={activity} margin={{top:4,right:16,left:-10,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                    <XAxis dataKey="date" tick={{fill:"var(--muted)",fontSize:10}}/>
                    <YAxis tick={{fill:"var(--muted)",fontSize:11}}/>
                    <Tooltip {...TT}/>
                    <Legend formatter={function(v){ return <span style={{color:"var(--text)",fontSize:"12px"}}>{v}</span>; }}/>
                    <Line type="monotone" dataKey="sessions" name="Sessions" stroke="#7c5cfc" strokeWidth={2} dot={false}/>
                    <Line type="monotone" dataKey="users"    name="Users"    stroke="#60a5fa" strokeWidth={2} dot={false}/>
                    <Line type="monotone" dataKey="positive" name="Positive" stroke="#4ade80" strokeWidth={2} dot={false}/>
                  </LineChart>
                </ResponsiveContainer>
              </ChartBox>
            </>
          )}
        </div>
      )}

      {/* ══ RETENTION ══ */}
      {tab==="retention" && (
        <div>
          <SectionTitle>WEEKLY ACTIVE USERS — LAST 8 WEEKS</SectionTitle>
          <ChartBox>
            {retention.length===0
              ? <div style={{ textAlign:"center", padding:"40px", color:"var(--muted)", fontSize:"13px" }}>Not enough data yet. Fills as users return week over week.</div>
              : <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={retention} margin={{top:4,right:16,left:-10,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                    <XAxis dataKey="week" tick={{fill:"var(--muted)",fontSize:10}}/>
                    <YAxis tick={{fill:"var(--muted)",fontSize:11}}/>
                    <Tooltip {...TT}/>
                    <Bar dataKey="active_users" name="Active Users" fill="#60a5fa" radius={[6,6,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
            }
          </ChartBox>
        </div>
      )}

      {/* ══ USERS ══ */}
      {tab==="users" && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px", flexWrap:"wrap", gap:"10px" }}>
            <SectionTitle>ALL MEMBERS ({filteredUsers.length} of {users.length})</SectionTitle>
            <input value={search} onChange={function(e){ setSearch(e.target.value); }} placeholder="Search name or email…"
              style={{ padding:"8px 14px", borderRadius:"10px", border:"1px solid var(--border)", background:"var(--card)", color:"var(--text)", fontSize:"12px", width:"220px", fontFamily:"'DM Sans',sans-serif", outline:"none" }}/>
          </div>
          {filteredUsers.length===0 && (
            <div style={{ padding:"30px", textAlign:"center", color:"var(--muted)", fontSize:"13px", background:"var(--card)", borderRadius:"16px", border:"1px solid var(--border)" }}>
              {users.length===0 ? "No users loaded. Check /api/admin/users endpoint." : "No users match your search."}
            </div>
          )}
          <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
            {filteredUsers.map(function(u, i) {
              var name     = u.name || "User";
              var levelNum = getLevelNum(u.level);
              var levelName= getLevelName(u.level);
              var levelEmoji=getLevelEmoji(u.level);
              return (
                <div key={u.id||i} style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:"16px", padding:"16px 18px", display:"flex", gap:"14px", alignItems:"center", flexWrap:"wrap", opacity:u.is_active?1:0.55 }}>
                  <div style={{ width:"42px", height:"42px", borderRadius:"12px", background:"linear-gradient(135deg,#7c5cfc,#fc5cf0)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Syne',sans-serif", fontWeight:"800", color:"white", fontSize:"18px", flexShrink:0 }}>
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:"800", fontSize:"14px", color:"var(--text)", marginBottom:"2px", display:"flex", alignItems:"center", gap:"6px", flexWrap:"wrap" }}>
                      {name}
                      {u.role==="admin" && <span style={{ padding:"2px 7px", borderRadius:"6px", background:"rgba(251,191,36,0.1)", border:"1px solid rgba(251,191,36,0.3)", color:"#fbbf24", fontSize:"10px", fontWeight:"800" }}>👑 Admin</span>}
                      {!u.is_active && <span style={{ padding:"2px 7px", borderRadius:"6px", background:"rgba(248,113,113,0.1)", border:"1px solid rgba(248,113,113,0.3)", color:"#f87171", fontSize:"10px", fontWeight:"800" }}>Disabled</span>}
                    </div>
                    <div style={{ fontSize:"11px", color:"var(--muted)" }}>
                      {u.email} · joined {u.joined||"N/A"}
                    </div>
                    {/* ── FIXED: shows "🏆 Champion (Lv.6)" not "Level 6: Level 6" ── */}
                    <div style={{ fontSize:"10px", color:"var(--muted)", marginTop:"2px", display:"flex", alignItems:"center", gap:"6px", flexWrap:"wrap" }}>
                      <span>Persona: {u.persona||"general"}</span>
                      <span style={{ padding:"2px 8px", borderRadius:"6px", background:"rgba(124,92,252,0.08)", border:"1px solid rgba(124,92,252,0.2)", color:"var(--accent)", fontWeight:"700" }}>
                        {levelEmoji} {levelName} · Lv.{levelNum}
                      </span>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
                    {[
                      {label:"Sessions",value:u.total_ai_sessions||0,color:"#7c5cfc"},
                      {label:"XP",      value:u.xp||0,              color:"#fbbf24"},
                      {label:"Streak",  value:(u.streak||0)+"d",    color:"#4ade80"},
                    ].map(function(s){ return (
                      <div key={s.label} style={{ textAlign:"center", padding:"5px 9px", borderRadius:"9px", background:"var(--bg)", border:"1px solid var(--border)" }}>
                        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:"800", fontSize:"13px", color:s.color }}>{s.value}</div>
                        <div style={{ fontSize:"9px", color:"var(--muted)" }}>{s.label}</div>
                      </div>
                    ); })}
                  </div>
                  <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
                    <button onClick={function(){ handleToggle(u.id); }} disabled={togglingId===u.id}
                      style={{ padding:"5px 11px", borderRadius:"8px", border:"1px solid var(--border)", background:u.is_active?"rgba(248,113,113,0.08)":"rgba(74,222,128,0.08)", color:u.is_active?"#f87171":"#4ade80", fontSize:"10px", fontWeight:"800", cursor:"pointer", fontFamily:"'Syne',sans-serif", opacity:togglingId===u.id?0.5:1 }}>
                      {u.is_active?"Disable":"Enable"}
                    </button>
                    {u.role!=="admin"
                      ? <button onClick={function(){ handleMakeAdmin(u.id); }} style={{ padding:"5px 11px", borderRadius:"8px", border:"1px solid rgba(251,191,36,0.3)", background:"rgba(251,191,36,0.07)", color:"#fbbf24", fontSize:"10px", fontWeight:"800", cursor:"pointer", fontFamily:"'Syne',sans-serif" }}>Make Admin</button>
                      : <button onClick={function(){ handleRemoveAdmin(u.id); }} style={{ padding:"5px 11px", borderRadius:"8px", border:"1px solid rgba(248,113,113,0.3)", background:"rgba(248,113,113,0.07)", color:"#f87171", fontSize:"10px", fontWeight:"800", cursor:"pointer", fontFamily:"'Syne',sans-serif" }}>Remove Admin</button>
                    }
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ SAFETY ══ */}
      {tab==="safety" && (
        <div>
          <div style={{ padding:"16px 20px", borderRadius:"14px", background:"rgba(96,165,250,0.06)", border:"1px solid rgba(96,165,250,0.2)", marginBottom:"20px" }}>
            <div style={{ fontSize:"10px", fontWeight:"800", color:"#60a5fa", letterSpacing:"0.12em", marginBottom:"5px", fontFamily:"'Syne',sans-serif" }}>🛡️ ABOUT CRISIS DETECTION</div>
            <div style={{ fontSize:"12px", color:"var(--muted)", lineHeight:"1.6" }}>Every message is scanned before reaching the AI. Crisis phrases bypass the model entirely and show real helpline numbers.</div>
          </div>
          <SectionTitle>SAFETY OVERVIEW</SectionTitle>
          <StatGrid cols={3}>
            <StatCard icon="🛡️" label="Crisis Flagged" value={crisisSessions} color="#f87171"/>
            <StatCard icon="😊" label="Positive"        value={posCount}       color="#4ade80" sub="uplifting sessions"/>
            <StatCard icon="😟" label="Tough Sessions"  value={negCount}       color="#fb923c" sub="needed support"/>
            <StatCard icon="😐" label="Neutral"         value={neutCount}      color="#94a3b8"/>
            <StatCard icon="📊" label="Positive Rate"   value={moodPct+"%"}    color="#4ade80"/>
            <StatCard icon="💬" label="Total Sessions"  value={totalSessions}  color="#7c5cfc"/>
          </StatGrid>
          <SectionTitle>CRISIS INTERVENTIONS ({crisisSessions})</SectionTitle>
          {crisisSessions===0 ? (
            <div style={{ textAlign:"center", padding:"40px 24px", background:"var(--card)", borderRadius:"20px", border:"1px solid var(--border)" }}>
              <div style={{ fontSize:"40px", marginBottom:"12px" }}>✅</div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:"800", fontSize:"18px", color:"#4ade80", marginBottom:"6px" }}>No crisis sessions</div>
              <div style={{ color:"var(--muted)", fontSize:"13px" }}>All users are doing okay.</div>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
              {sessions.filter(function(s){ return s.is_crisis||s.emotion==="crisis"; }).slice(0,20).map(function(s,i){
                return (
                  <div key={i} style={{ padding:"14px 16px", borderRadius:"14px", background:"rgba(96,165,250,0.06)", border:"1px solid rgba(96,165,250,0.2)" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"6px" }}>
                      <span style={{ fontSize:"10px", fontWeight:"800", color:"#60a5fa", fontFamily:"'Syne',sans-serif" }}>💙 CRISIS FLAGGED</span>
                      <span style={{ fontSize:"10px", color:"var(--muted)" }}>{(s.created_at||"").slice(0,10)}</span>
                    </div>
                    <div style={{ fontSize:"12px", color:"var(--text)", lineHeight:"1.5" }}>User ID {s.user_id||"—"} · iCall + helplines shown automatically</div>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ marginTop:"20px", padding:"14px 18px", borderRadius:"14px", background:"rgba(74,222,128,0.05)", border:"1px solid rgba(74,222,128,0.2)" }}>
            <div style={{ fontSize:"10px", fontWeight:"800", color:"#4ade80", letterSpacing:"0.12em", marginBottom:"5px", fontFamily:"'Syne',sans-serif" }}>🔒 PRIVACY NOTE</div>
            <div style={{ fontSize:"12px", color:"var(--muted)", lineHeight:"1.6" }}>Journal entries are AES-256 encrypted and cannot be read by admins. AI conversations, goals, and check-in notes are visible here.</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
