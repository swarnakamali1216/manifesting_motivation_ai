import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";

var API = "https://manifesting-motivation-backend.onrender.com/api";

var EMO = {
  positive:  { emoji:"😊", color:"#4ade80", bg:"rgba(74,222,128,0.1)"   },
  focused:   { emoji:"🎯", color:"#7c5cfc", bg:"rgba(124,92,252,0.1)"  },
  excited:   { emoji:"🤩", color:"#fb923c", bg:"rgba(251,146,60,0.1)"  },
  hopeful:   { emoji:"✨", color:"#60a5fa", bg:"rgba(96,165,250,0.1)"   },
  neutral:   { emoji:"😐", color:"#94a3b8", bg:"rgba(148,163,184,0.1)" },
  anxious:   { emoji:"😰", color:"#fbbf24", bg:"rgba(251,191,36,0.1)"   },
  stressed:  { emoji:"😓", color:"#f97316", bg:"rgba(249,115,22,0.1)"   },
  sad:       { emoji:"😔", color:"#818cf8", bg:"rgba(129,140,248,0.1)"  },
  negative:  { emoji:"😞", color:"#f87171", bg:"rgba(248,113,113,0.1)"  },
};

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div style={{ padding:"14px 16px", borderRadius:"12px", border:"1px solid var(--border)", background:"var(--card)", marginBottom:"8px" }}>
      <div style={{ height:"13px", borderRadius:"6px", background:"var(--border)", marginBottom:"8px", width:"60%", animation:"shimmer 1.4s ease infinite", backgroundImage:"linear-gradient(90deg,var(--border) 25%,rgba(255,255,255,0.05) 50%,var(--border) 75%)", backgroundSize:"200% 100%" }} />
      <div style={{ height:"10px", borderRadius:"5px", background:"var(--border)", width:"40%", animation:"shimmer 1.4s ease infinite 0.2s", backgroundImage:"linear-gradient(90deg,var(--border) 25%,rgba(255,255,255,0.05) 50%,var(--border) 75%)", backgroundSize:"200% 100%" }} />
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );
}

// ── Emotion Tag ───────────────────────────────────────────────────────────────
function EmotionTag({ emotion }) {
  if (!emotion) return null;
  var cfg = EMO[emotion] || { emoji:"💬", color:"#94a3b8", bg:"rgba(148,163,184,0.1)" };
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:"3px", padding:"3px 8px", borderRadius:"20px", fontSize:"10px", fontWeight:"700", background:cfg.bg, color:cfg.color, border:"1px solid "+cfg.color+"33", fontFamily:"'Syne',sans-serif", letterSpacing:"0.04em", textTransform:"capitalize" }}>
      {cfg.emoji} {emotion}
    </span>
  );
}

// ── Session Card ──────────────────────────────────────────────────────────────
function SessionCard({ session, isOpen, onToggle }) {
  var cfg    = EMO[session.emotion] || { emoji:"💬", color:"#7c5cfc", bg:"rgba(124,92,252,0.08)" };
  var date   = session.created_at ? new Date(session.created_at) : null;
  var timeStr = date ? date.toLocaleTimeString("en",{hour:"2-digit",minute:"2-digit"}) : "";
  var dateStr = date ? date.toLocaleDateString("en",{month:"short",day:"numeric"}) : "";

  return (
    <div style={{ borderRadius:"14px", border:"1px solid "+(isOpen?cfg.color+"44":"var(--border)"), overflow:"hidden", transition:"border-color 0.2s", background:"var(--card)" }}>
      {/* Header */}
      <div onClick={onToggle} style={{ display:"flex", alignItems:"center", gap:"10px", padding:"13px 14px", cursor:"pointer", background:isOpen?cfg.bg:"transparent", WebkitTapHighlightColor:"transparent", minHeight:"54px" }}>
        <div style={{ fontSize:"18px", flexShrink:0 }}>{cfg.emoji}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:"12px", color:"var(--text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontStyle:"italic", lineHeight:1.4 }}>
            "{session.user_input || "..."}"
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:"6px", marginTop:"4px", flexWrap:"wrap" }}>
            <EmotionTag emotion={session.emotion} />
            {session.persona_used && (
              <span style={{ fontSize:"9px", color:"var(--muted)" }}>via {session.persona_used}</span>
            )}
          </div>
        </div>
        <div style={{ textAlign:"right", flexShrink:0 }}>
          <div style={{ fontSize:"10px", color:"var(--muted)" }}>{dateStr}</div>
          <div style={{ fontSize:"9px", color:"var(--muted)" }}>{timeStr}</div>
        </div>
        <div style={{ fontSize:"11px", color:"var(--muted)", transition:"transform 0.2s", transform:isOpen?"rotate(180deg)":"rotate(0deg)", marginLeft:"2px" }}>▼</div>
      </div>

      {/* Expanded */}
      {isOpen && (
        <div style={{ padding:"0 14px 14px 14px", borderTop:"1px solid var(--border)" }}>
          <div style={{ paddingTop:"12px" }}>
            <div style={{ fontSize:"9px", fontFamily:"'Syne',sans-serif", fontWeight:"700", color:"var(--muted)", letterSpacing:"0.1em", marginBottom:"6px" }}>YOU SAID</div>
            <div style={{ fontSize:"13px", color:"var(--text2)", lineHeight:1.6, padding:"10px 12px", borderRadius:"8px", background:"var(--bg)", border:"1px solid var(--border)", marginBottom:"10px", fontStyle:"italic" }}>
              {session.user_input}
            </div>
            <div style={{ fontSize:"9px", fontFamily:"'Syne',sans-serif", fontWeight:"700", color:cfg.color, letterSpacing:"0.1em", marginBottom:"6px" }}>
              ✦ AI COACH RESPONSE
            </div>
            <div style={{ fontSize:"13px", color:"var(--text)", lineHeight:1.8, fontStyle:"italic", padding:"12px 14px", borderRadius:"8px", background:cfg.bg, border:"1px solid "+cfg.color+"22" }}>
              "{session.ai_response || session.response || "..."}"
            </div>
            {(session.emotion_score || session.mood_score) && (
              <div style={{ display:"flex", gap:"6px", marginTop:"8px", flexWrap:"wrap" }}>
                {session.emotion_score != null && (
                  <div style={{ fontSize:"10px", padding:"4px 10px", borderRadius:"6px", background:"rgba(124,92,252,0.08)", color:"#a78bfa", border:"1px solid rgba(124,92,252,0.2)" }}>
                    🎭 VADER: {parseFloat(session.emotion_score).toFixed(3)}
                  </div>
                )}
                {session.mood_score != null && (
                  <div style={{ fontSize:"10px", padding:"4px 10px", borderRadius:"6px", background:"rgba(74,222,128,0.08)", color:"#4ade80", border:"1px solid rgba(74,222,128,0.2)" }}>
                    😊 Mood: {session.mood_score}/10
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main AIHistory ────────────────────────────────────────────────────────────
function AIHistory({ user }) {
  var userId = user ? user.id : null;
  var [sessions, setSessions] = useState([]);
  var [loading,  setLoading]  = useState(true);
  var [openId,   setOpenId]   = useState(null);
  var [filter,   setFilter]   = useState("all");
  var [search,   setSearch]   = useState("");
  var [limit,    setLimit]    = useState(20);

  var loadHistory = useCallback(function() {
    if (!userId) return;
    setLoading(true);
    axios.get(API+"/history?user_id="+userId)
      .then(function(r){
        var data = Array.isArray(r.data) ? r.data : [];
        data.sort(function(a,b){ return new Date(b.created_at)-new Date(a.created_at); });
        setSessions(data);
      })
      .catch(function(){ setSessions([]); })
      .finally(function(){ setLoading(false); });
  }, [userId]);

  useEffect(function(){ loadHistory(); }, [loadHistory]);

  var filtered = sessions.filter(function(s){
    var matchEmo = filter==="all" || s.emotion===filter;
    var matchSearch = !search.trim() ||
      (s.user_input||"").toLowerCase().includes(search.toLowerCase()) ||
      (s.ai_response||"").toLowerCase().includes(search.toLowerCase());
    return matchEmo && matchSearch;
  });

  var total    = sessions.length;
  var posCount = sessions.filter(function(s){ return ["positive","focused","hopeful","excited"].includes(s.emotion); }).length;
  var negCount = sessions.filter(function(s){ return ["negative","sad","anxious","stressed"].includes(s.emotion); }).length;
  var moodPct  = total>0 ? Math.round((posCount/total)*100) : 0;

  var byDate = {};
  filtered.slice(0, limit).forEach(function(s){
    var d = s.created_at ? s.created_at.split("T")[0] : "Unknown";
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(s);
  });
  var dateKeys = Object.keys(byDate).sort(function(a,b){ return b>a?1:-1; });

  function formatDateLabel(ds) {
    if (!ds || ds==="Unknown") return "Unknown Date";
    var today = new Date().toISOString().split("T")[0];
    var yesterday = new Date(Date.now()-86400000).toISOString().split("T")[0];
    if (ds===today) return "Today";
    if (ds===yesterday) return "Yesterday";
    return new Date(ds).toLocaleDateString("en",{weekday:"long",month:"long",day:"numeric"});
  }

  var emotions = ["all","positive","excited","focused","hopeful","neutral","stressed","anxious","sad","negative"];

  if (loading) return (
    <div>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}} @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div style={{ marginBottom:"20px" }}>
        <div style={{ height:"28px", borderRadius:"8px", background:"var(--border)", marginBottom:"8px", width:"60%", animation:"shimmer 1.4s ease infinite", backgroundImage:"linear-gradient(90deg,var(--border) 25%,rgba(255,255,255,0.05) 50%,var(--border) 75%)", backgroundSize:"200% 100%" }} />
      </div>
      {Array.from({length:5}).map(function(_,i){ return <SkeletonRow key={i} />; })}
    </div>
  );

  return (
    <div style={{ animation:"fadeIn 0.3s ease", paddingBottom:"8px" }}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ marginBottom:"18px" }}>
        <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:"900", fontSize:"clamp(22px,5vw,28px)", background:"linear-gradient(135deg,#e8e0ff 30%,#9b8aff)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", marginBottom:"3px", letterSpacing:"-0.5px", lineHeight:1.2 }}>AI History 💬</h1>
        <p style={{ color:"var(--muted)", fontSize:"13px" }}>Every conversation with your coach — searchable and organised.</p>
      </div>

      {/* Stats — responsive 2x2 on mobile */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:"8px", marginBottom:"16px" }}>
        {[
          {emoji:"💬",value:total,       label:"Total Sessions", color:"#7c5cfc"},
          {emoji:"😊",value:moodPct+"%", label:"Positive Mood",  color:"#4ade80"},
          {emoji:"😔",value:negCount,    label:"Tough Sessions", color:"#f87171"},
          {emoji:"🔁",value:filtered.length, label:"Showing",  color:"#fbbf24"},
        ].map(function(s){ return (
          <div key={s.label} style={{ background:"var(--card)", borderRadius:"14px", padding:"14px 12px", textAlign:"center", border:"1px solid var(--border)" }}>
            <div style={{ fontSize:"20px", marginBottom:"4px" }}>{s.emoji}</div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:"900", fontSize:"clamp(18px,4vw,22px)", color:s.color }}>{s.value}</div>
            <div style={{ fontSize:"9px", color:"var(--muted)", marginTop:"2px" }}>{s.label}</div>
          </div>
        ); })}
      </div>

      {/* Search */}
      <div style={{ position:"relative", marginBottom:"10px" }}>
        <input
          className="input"
          placeholder="🔍  Search conversations..."
          value={search}
          onChange={function(e){ setSearch(e.target.value); }}
          style={{ width:"100%", boxSizing:"border-box", fontSize:"14px", minHeight:"44px" }}
        />
        {search && (
          <button onClick={function(){ setSearch(""); }} style={{ position:"absolute", right:"12px", top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"var(--muted)", cursor:"pointer", fontSize:"16px", padding:"4px", WebkitTapHighlightColor:"transparent" }}>✕</button>
        )}
      </div>

      {/* Emotion filter — horizontal scroll */}
      <div style={{ display:"flex", gap:"6px", overflowX:"auto", WebkitOverflowScrolling:"touch", paddingBottom:"4px", marginBottom:"18px" }}>
        {emotions.map(function(e){
          var cfg = EMO[e] || {color:"#7c5cfc",emoji:"✦"};
          var active = filter===e;
          return (
            <button key={e} onClick={function(){ setFilter(e); }}
              style={{ padding:"6px 12px", borderRadius:"20px", border:"1px solid "+(active?cfg.color:"var(--border)"), background:active?cfg.bg:"transparent", color:active?cfg.color:"var(--muted)", cursor:"pointer", fontSize:"11px", fontFamily:"'Syne',sans-serif", fontWeight:"700", transition:"all 0.15s", textTransform:"capitalize", whiteSpace:"nowrap", WebkitTapHighlightColor:"transparent", minHeight:"34px" }}>
              {e==="all"?"✦ All":cfg.emoji+" "+e}
            </button>
          );
        })}
      </div>

      {/* Sessions */}
      {total===0 ? (
        <div style={{ textAlign:"center", padding:"48px 20px", background:"var(--card)", borderRadius:"18px", border:"1px solid var(--border)" }}>
          <div style={{ fontSize:"40px", marginBottom:"12px" }}>🌱</div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:"700", fontSize:"16px", color:"var(--text)", marginBottom:"8px" }}>No conversations yet</div>
          <div style={{ fontSize:"12px", color:"var(--muted)", lineHeight:"1.6" }}>Go to Home and send your first message to the AI coach!</div>
        </div>
      ) : filtered.length===0 ? (
        <div style={{ textAlign:"center", padding:"36px", color:"var(--muted)" }}>
          <div style={{ fontSize:"32px", marginBottom:"8px" }}>🔍</div>
          <div style={{ fontSize:"13px" }}>No results for "{search}" in {filter} sessions</div>
        </div>
      ) : (
        <>
          {dateKeys.map(function(ds){
            return (
              <div key={ds} style={{ marginBottom:"18px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"10px" }}>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:"800", fontSize:"10px", color:"var(--muted)", letterSpacing:"0.1em", whiteSpace:"nowrap" }}>
                    {formatDateLabel(ds).toUpperCase()}
                  </div>
                  <div style={{ flex:1, height:"1px", background:"var(--border)" }} />
                  <div style={{ fontSize:"10px", color:"var(--muted)", whiteSpace:"nowrap" }}>{byDate[ds].length} session{byDate[ds].length!==1?"s":""}</div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                  {byDate[ds].map(function(s){
                    var key = s.id||s.created_at;
                    return (
                      <SessionCard key={key} session={s} isOpen={openId===key}
                        onToggle={function(){ setOpenId(openId===key?null:key); }} />
                    );
                  })}
                </div>
              </div>
            );
          })}

          {filtered.length>limit && (
            <div style={{ textAlign:"center", marginTop:"8px", marginBottom:"16px" }}>
              <button onClick={function(){ setLimit(limit+20); }}
                style={{ padding:"11px 24px", borderRadius:"20px", border:"1px solid var(--border)", background:"transparent", color:"var(--accent)", cursor:"pointer", fontFamily:"'Syne',sans-serif", fontWeight:"700", fontSize:"12px", WebkitTapHighlightColor:"transparent", minHeight:"44px" }}>
                Load More ({filtered.length-limit} remaining)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AIHistory;

