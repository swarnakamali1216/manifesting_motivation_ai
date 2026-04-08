import React, { useState, useEffect, useRef } from "react";

import axios from "axios";



var API = process.env.REACT_APP_API_URL || "https://manifesting-motivation-backend.onrender.com/api";



var MOODS = [

  { key:"amazing",  emoji:"🌟", label:"Amazing",   color:"#fbbf24", bg:"rgba(251,191,36,0.12)"  },

  { key:"good",     emoji:"😊", label:"Good",      color:"#4ade80", bg:"rgba(74,222,128,0.12)"  },

  { key:"okay",     emoji:"😐", label:"Okay",      color:"#60a5fa", bg:"rgba(96,165,250,0.12)"  },

  { key:"low",      emoji:"😔", label:"Low",       color:"#a78bfa", bg:"rgba(167,139,250,0.12)" },

  { key:"anxious",  emoji:"😰", label:"Anxious",   color:"#fb923c", bg:"rgba(251,146,60,0.12)"  },

  { key:"grateful", emoji:"🙏", label:"Grateful",  color:"#34d399", bg:"rgba(52,211,153,0.12)"  },

  { key:"angry",    emoji:"😤", label:"Frustrated",color:"#f87171", bg:"rgba(248,113,113,0.12)" },

  { key:"excited",  emoji:"⚡", label:"Excited",   color:"#c084fc", bg:"rgba(192,132,252,0.12)" },

];



var TAGS = ["Personal","Goals","Gratitude","Reflection","Health","Work","Learning","Relationships","Win","Challenge"];



var PROMPTS = [

  "What made you smile today, even briefly?",

  "What's one thing you learned about yourself this week?",

  "Describe a challenge you're currently facing. What's one small step forward?",

  "What are you most grateful for right now?",

  "If your future self could give you advice today, what would they say?",

  "What drained your energy today? What restored it?",

  "What's one goal you're proud of working toward?",

  "Write about a moment that felt meaningful recently.",

  "What would make tomorrow feel like a win?",

  "What emotion do you most need to process right now?",

];



function toIST(iso) {

  if (!iso) return new Date();

  // Backend stores UTC. Add IST offset for display.

  return new Date(new Date(iso).getTime() + 330 * 60000);

}

function safeDate(iso) {
  if (!iso) return new Date();
  var s = (iso+"").replace(" ","T");
  if (!s.endsWith("Z") && !s.includes("+")) s += "Z";
  var d = new Date(s);
  return isNaN(d) ? new Date() : d;
}
function formatDate(iso) {
  if (!iso) return "Unknown Date";
  var d = safeDate(iso);
  return d.toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"long", year:"numeric" });
}

function formatTime(iso) {

  if (!iso) return "";

  var d = toIST(iso);

  return d.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" });

}

function wordCount(text) {

  return text ? text.trim().split(/\s+/).filter(Boolean).length : 0;

}

function getMood(key) {

  return MOODS.find(function(m){ return m.key===key; }) || null;

}



// ΓöÇΓöÇ Mood Streak ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function MoodStreak({ entries }) {

  var IST_MS = 330 * 60000;

  var days = {};

  entries.forEach(function(e){

    if (!e.created_at) return;

    // Convert UTC created_at to IST date string so keys match the week loop below

    var raw1 = e.created_at ? (e.created_at+"").replace(" ","T") : null; if(raw1 && !raw1.endsWith("Z") && !raw1.includes("+")) raw1+="Z"; var dt = raw1 ? new Date(raw1) : new Date(); var d = isNaN(dt) ? "" : new Date(dt.getTime() + IST_MS).toISOString().slice(0,10);

    if (d) days[d] = e.mood || "okay";

  });

  var result = [];

  // IST_MS already declared above — reuse it

  for (var i=6; i>=0; i--) {

    var nowIST = new Date(Date.now() + IST_MS);

    nowIST.setUTCDate(nowIST.getUTCDate() - i);

    var key      = nowIST.toISOString().slice(0,10); // IST date string

    var dayLabel = ["S","M","T","W","T","F","S"][nowIST.getUTCDay()];

    result.push({ key, dayLabel, mood: days[key]||null });

  }

  return (

    <div style={{ display:"flex", gap:"6px", alignItems:"flex-end" }}>

      {result.map(function(r){

        var m = r.mood ? getMood(r.mood) : null;

        return (

          <div key={r.key} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"3px" }}>

            <div style={{ fontSize:"14px", lineHeight:1, opacity:r.mood?1:0.2 }} title={r.key}>

              {m ? m.emoji : "○"}

            </div>

            <div style={{ fontSize:"8px", color:"var(--muted)", fontWeight:"700", fontFamily:"'Syne',sans-serif" }}>{r.dayLabel}</div>

          </div>

        );

      })}

    </div>

  );

}



// ΓöÇΓöÇ Entry Card ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function EntryCard({ entry, onDelete, onEdit }) {

  var [expanded, setExpanded] = useState(false);

  var [confirmDel, setConfirmDel] = useState(false);

  var mood = entry.mood ? getMood(entry.mood) : null;

  var preview = entry.content ? entry.content.slice(0,160) : "";

  var isLong = entry.content && entry.content.length > 160;

  var tags = entry.tags ? (Array.isArray(entry.tags) ? entry.tags : entry.tags.split(",")) : [];



  return (

    <div style={{

      background:"var(--card)", borderRadius:"16px",

      border:"1px solid var(--border)",

      overflow:"hidden", transition:"all 0.2s",

      boxShadow:"0 2px 8px rgba(0,0,0,0.04)",

      marginBottom:"10px",

    }}

      onMouseEnter={function(e){ e.currentTarget.style.boxShadow="0 4px 20px rgba(124,92,252,0.1)"; e.currentTarget.style.borderColor="rgba(124,92,252,0.2)"; }}

      onMouseLeave={function(e){ e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,0.04)"; e.currentTarget.style.borderColor="var(--border)"; }}

    >

      {/* Top bar */}

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 14px 8px" }}>

        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>

          {mood && (

            <div style={{ fontSize:"22px", lineHeight:1 }} title={mood.label}>{mood.emoji}</div>

          )}

          <div>

            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:"700", fontSize:"13px", color:"var(--text)" }}>

              {entry.title || formatDate(entry.created_at)}

            </div>

            <div style={{ display:"flex", alignItems:"center", gap:"6px", marginTop:"2px" }}>

              <span style={{ fontSize:"10px", color:"var(--muted)" }}>{formatDate(entry.created_at)}</span>

              <span style={{ fontSize:"10px", color:"var(--muted)" }}>·</span>

              <span style={{ fontSize:"10px", color:"var(--muted)" }}>{formatTime(entry.created_at)}</span>

              <span style={{ fontSize:"10px", color:"var(--muted)" }}>·</span>

              <span style={{ fontSize:"10px", color:"var(--muted)" }}>{wordCount(entry.content)} words</span>

              {mood && <span style={{ fontSize:"10px", color:mood.color, fontWeight:"700" }}>{mood.label}</span>}

            </div>

          </div>

        </div>

        <div style={{ display:"flex", gap:"4px" }}>

          <button onClick={function(){ onEdit(entry); }}

            style={{ padding:"4px 8px", borderRadius:"7px", border:"1px solid var(--border)", background:"transparent", color:"var(--muted)", fontSize:"10px", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>

            Edit

          </button>

          {confirmDel ? (

            <div style={{ display:"flex", gap:"3px" }}>

              <button onClick={function(){ onDelete(entry.id); setConfirmDel(false); }}

                style={{ padding:"4px 8px", borderRadius:"7px", border:"1px solid rgba(248,113,113,0.4)", background:"rgba(248,113,113,0.1)", color:"#f87171", fontSize:"10px", cursor:"pointer" }}>

                Yes, delete

              </button>

              <button onClick={function(){ setConfirmDel(false); }}

                style={{ padding:"4px 8px", borderRadius:"7px", border:"1px solid var(--border)", background:"transparent", color:"var(--muted)", fontSize:"10px", cursor:"pointer" }}>

                Cancel

              </button>

            </div>

          ) : (

            <button onClick={function(){ setConfirmDel(true); }}

              style={{ padding:"4px 8px", borderRadius:"7px", border:"1px solid var(--border)", background:"transparent", color:"var(--muted)", fontSize:"10px", cursor:"pointer" }}>

              🗑

            </button>

          )}

        </div>

      </div>



      {/* Tags */}

      {tags.length > 0 && (

        <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", padding:"0 14px 8px" }}>

          {tags.filter(Boolean).map(function(t){

            return <span key={t} style={{ fontSize:"9px", padding:"2px 8px", borderRadius:"8px", background:"rgba(124,92,252,0.08)", border:"1px solid rgba(124,92,252,0.15)", color:"var(--accent)", fontWeight:"700", fontFamily:"'Syne',sans-serif" }}>{t}</span>;

          })}

        </div>

      )}



      {/* Content */}

      <div style={{ padding:"0 14px 12px" }}>

        <div style={{ fontSize:"13px", lineHeight:"1.7", color:"var(--text2)", whiteSpace:"pre-wrap", wordBreak:"break-word" }}>

          {expanded ? entry.content : preview}{isLong && !expanded ? "..." : ""}

        </div>

        {isLong && (

          <button onClick={function(){ setExpanded(function(v){return !v;}); }}

            style={{ marginTop:"6px", fontSize:"11px", color:"var(--accent)", background:"none", border:"none", cursor:"pointer", fontWeight:"600", padding:0, fontFamily:"'DM Sans',sans-serif" }}>

            {expanded ? "Show less ↑" : "Read more ↓"}

          </button>

        )}

      </div>



      {/* Mood bar */}

      {mood && (

        <div style={{ height:"3px", background:"linear-gradient(90deg,"+mood.color+"44,"+mood.color+")" }} />

      )}

    </div>

  );

}



// ΓöÇΓöÇ Write / Edit Modal ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function WriteModal({ user, editEntry, onClose, onSaved }) {

  var isEdit = !!editEntry;

  var [title,   setTitle]   = useState(editEntry ? editEntry.title   || "" : "");

  var [content, setContent] = useState(editEntry ? editEntry.content || "" : "");

  var [mood,    setMood]    = useState(editEntry ? editEntry.mood    || "" : "");

  var [selTags, setSelTags] = useState(editEntry ? (Array.isArray(editEntry.tags) ? editEntry.tags : (editEntry.tags||"").split(",").filter(Boolean)) : []);

  var [saving,  setSaving]  = useState(false);

  var [prompt,  setPrompt]  = useState(null);

  var textRef = useRef(null);



  // eslint-disable-next-line react-hooks/exhaustive-deps

  useEffect(function(){

    setTimeout(function(){ textRef.current && textRef.current.focus(); }, 100);

    if (!isEdit) setPrompt(PROMPTS[Math.floor(Math.random()*PROMPTS.length)]);

  }, [isEdit]);



  function toggleTag(t) {

    setSelTags(function(p){ return p.includes(t) ? p.filter(function(x){return x!==t;}) : p.concat(t); });

  }



  function save() {

    if (!content.trim()) return;

    setSaving(true);

    var payload = {

      user_id: user.id,

      title:   title || new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"}),

      content: content,

      mood:    mood,

      tags:    selTags.join(","),

    };

    var req = isEdit

      ? axios.put(API+"/journal/"+editEntry.id, payload)

      : axios.post(API+"/journal", payload);

    req.then(function(){

      onSaved();

      onClose();

    }).catch(function(e){

      console.error(e);

      alert("Save failed — check Flask terminal");

    }).finally(function(){ setSaving(false); });

  }



  return (

    <div style={{

      position:"fixed", inset:0, zIndex:1000,

      background:"rgba(5,5,15,0.7)", backdropFilter:"blur(8px)",

      display:"flex", alignItems:"flex-end", justifyContent:"center",

      animation:"fadeIn 0.15s ease",

    }} onClick={function(e){ if(e.target===e.currentTarget) onClose(); }}>

      <div style={{

        background:"var(--surface)", borderRadius:"24px 24px 0 0",

        width:"100%", maxWidth:"680px", maxHeight:"92vh",

        display:"flex", flexDirection:"column",

        border:"1px solid var(--border)", borderBottom:"none",

        animation:"slideUp 0.25s ease",

      }}>

        {/* Header */}

        <div style={{ padding:"16px 20px 12px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid var(--border)" }}>

          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:"900", fontSize:"16px", color:"var(--text)" }}>

            {isEdit ? "✅ Edit Entry" : "✍️ New Entry"}

          </div>

          <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>

            <span style={{ fontSize:"10px", color:"var(--muted)" }}>{wordCount(content)} words</span>

            <button onClick={onClose} style={{ background:"none", border:"none", color:"var(--muted)", fontSize:"18px", cursor:"pointer", lineHeight:1 }}>×</button>

          </div>

        </div>



        <div style={{ overflowY:"auto", flex:1, padding:"16px 20px" }}>

          {/* Writing prompt */}

          {!isEdit && prompt && (

            <div style={{ background:"rgba(124,92,252,0.06)", border:"1px solid rgba(124,92,252,0.15)", borderRadius:"12px", padding:"10px 14px", marginBottom:"14px", cursor:"pointer" }}

              onClick={function(){ setContent(function(p){ return p ? p+"\n\n"+prompt : prompt; }); setPrompt(null); }}>

              <div style={{ fontSize:"9px", color:"var(--accent)", fontWeight:"800", fontFamily:"'Syne',sans-serif", marginBottom:"3px" }}>💡 TODAY'S PROMPT — tap to use</div>

              <div style={{ fontSize:"12px", color:"var(--text2)", lineHeight:"1.5" }}>{prompt}</div>

            </div>

          )}



          {/* Title */}

          <input

            placeholder="Entry title (optional)"

            value={title}

            onChange={function(e){ setTitle(e.target.value); }}

            style={{ width:"100%", boxSizing:"border-box", background:"var(--card)", border:"1px solid var(--border)", borderRadius:"10px", padding:"10px 14px", fontSize:"14px", fontFamily:"'Syne',sans-serif", fontWeight:"700", color:"var(--text)", marginBottom:"10px", outline:"none" }}

          />



          {/* Mood picker */}

          <div style={{ marginBottom:"12px" }}>

            <div style={{ fontSize:"9px", color:"var(--muted)", fontFamily:"'Syne',sans-serif", fontWeight:"800", letterSpacing:"0.1em", marginBottom:"6px" }}>HOW ARE YOU FEELING?</div>

            <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>

              {MOODS.map(function(m){

                var sel = mood===m.key;

                return (

                  <button key={m.key} onClick={function(){ setMood(sel?"":m.key); }}

                    style={{ display:"flex", alignItems:"center", gap:"5px", padding:"6px 12px", borderRadius:"20px", border:"1px solid "+(sel?m.color+"66":"var(--border)"), background:sel?m.bg:"transparent", color:sel?m.color:"var(--muted)", fontSize:"11px", cursor:"pointer", fontWeight:"700", fontFamily:"'DM Sans',sans-serif", transition:"all 0.15s" }}>

                    <span style={{ fontSize:"14px" }}>{m.emoji}</span>{m.label}

                  </button>

                );

              })}

            </div>

          </div>



          {/* Content */}

          <textarea

            ref={textRef}

            placeholder={"Write freely... your thoughts are safe here.\n\nThis is your private space — be honest with yourself."}

            value={content}

            onChange={function(e){ setContent(e.target.value); }}

            style={{ width:"100%", boxSizing:"border-box", minHeight:"200px", background:"var(--card)", border:"1px solid var(--border)", borderRadius:"12px", padding:"14px", fontSize:"14px", fontFamily:"'DM Sans',sans-serif", lineHeight:"1.8", color:"var(--text)", resize:"vertical", outline:"none", marginBottom:"12px" }}

          />



          {/* Tags */}

          <div>

            <div style={{ fontSize:"9px", color:"var(--muted)", fontFamily:"'Syne',sans-serif", fontWeight:"800", letterSpacing:"0.1em", marginBottom:"6px" }}>ADD TAGS</div>

            <div style={{ display:"flex", flexWrap:"wrap", gap:"5px" }}>

              {TAGS.map(function(t){

                var sel = selTags.includes(t);

                return (

                  <button key={t} onClick={function(){ toggleTag(t); }}

                    style={{ padding:"4px 11px", borderRadius:"8px", border:"1px solid "+(sel?"rgba(124,92,252,0.4)":"var(--border)"), background:sel?"rgba(124,92,252,0.1)":"transparent", color:sel?"var(--accent)":"var(--muted)", fontSize:"11px", cursor:"pointer", fontWeight:"600", fontFamily:"'DM Sans',sans-serif", transition:"all 0.15s" }}>

                    {t}

                  </button>

                );

              })}

            </div>

          </div>

        </div>



        {/* Footer */}

        <div style={{ padding:"12px 20px", borderTop:"1px solid var(--border)", display:"flex", justifyContent:"space-between", alignItems:"center", background:"var(--surface)" }}>

          <div style={{ fontSize:"10px", color:"var(--muted)", display:"flex", alignItems:"center", gap:"5px" }}>

            🔒 <span>Private & encrypted — only you can see this</span>

          </div>

          <div style={{ display:"flex", gap:"8px" }}>

            <button onClick={onClose}

              style={{ padding:"9px 18px", borderRadius:"10px", border:"1px solid var(--border)", background:"transparent", color:"var(--muted)", fontSize:"12px", cursor:"pointer", fontFamily:"'Syne',sans-serif", fontWeight:"700" }}>

              Cancel

            </button>

            <button onClick={save} disabled={saving||!content.trim()}

              style={{ padding:"9px 22px", borderRadius:"10px", border:"none", background:"linear-gradient(135deg,#7c5cfc,#9c7cfc)", color:"#fff", fontSize:"12px", cursor:"pointer", fontFamily:"'Syne',sans-serif", fontWeight:"800", opacity:(saving||!content.trim())?0.5:1, boxShadow:"0 3px 12px rgba(124,92,252,0.3)" }}>

              {saving ? "Saving..." : isEdit ? "Update ✓" : "Save Entry ✓"}

            </button>

          </div>

        </div>

      </div>

    </div>

  );

}



// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

// MAIN JOURNAL PAGE

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

function Journal({ user }) {

  var [entries,    setEntries]    = useState([]);

  var [loading,    setLoading]    = useState(true);

  var [showWrite,  setShowWrite]  = useState(false);

  var [editEntry,  setEditEntry]  = useState(null);

  var [search,     setSearch]     = useState("");

  var [filterMood, setFilterMood] = useState("");

  var [filterTag,  setFilterTag]  = useState("");

  var [sortDir,    setSortDir]    = useState("desc");



  useEffect(function(){ load(); }, [user]);  // eslint-disable-line



  function load() {

    if (!user) return;

    setLoading(true);

    axios.get(API+"/journal?user_id="+user.id)

      .then(function(r){ setEntries(r.data||[]); })

      .catch(function(){ setEntries([]); })

      .finally(function(){ setLoading(false); });

  }



  function handleDelete(id) {

    axios.delete(API+"/journal/"+id)

      .then(function(){ setEntries(function(p){ return p.filter(function(e){return e.id!==id;}); }); })

      .catch(function(){ alert("Delete failed"); });

  }



  function handleEdit(entry) { setEditEntry(entry); setShowWrite(true); }

  function handleNew()       { setEditEntry(null);  setShowWrite(true); }



  // Filter + search + sort

  var filtered = entries

    .filter(function(e){

      if (filterMood && e.mood !== filterMood) return false;

      if (filterTag && !(e.tags||"").includes(filterTag)) return false;

      if (search) {

        var q = search.toLowerCase();

        return (e.title||"").toLowerCase().includes(q) || (e.content||"").toLowerCase().includes(q);

      }

      return true;

    })

    .sort(function(a,b){

      var da = a.created_at ? new Date((a.created_at+"").replace(" ","T")) : new Date(0); var db = b.created_at ? new Date((b.created_at+"").replace(" ","T")) : new Date(0);

      return sortDir==="desc" ? db-da : da-db;

    });



  // Stats

  var totalWords  = entries.reduce(function(s,e){ return s+wordCount(e.content); }, 0);

  var moodCounts  = {};

  entries.forEach(function(e){ if(e.mood) moodCounts[e.mood]=(moodCounts[e.mood]||0)+1; });

  // Use mood_score (VADER) for positive/tough — not the mood string which is often "okay"

  var posCount    = entries.filter(function(e){ return (e.mood_score||0) >= 0.2; }).length;

  var toughCount  = entries.filter(function(e){ return (e.mood_score||0) <= -0.2; }).length;

  // streakDays: unique IST dates (add 330min offset so date boundary is correct)

  var IST_MS2 = 330 * 60000;

  var streakDays  = new Set(entries.map(function(e){

    if (!e.created_at) return "";

    // slice(0,10) works for "2026-03-30T..." AND "2026-03-30 ..." (space separator from PostgreSQL)

    var raw = (e.created_at).slice(0,10);

    if (raw.length < 10) return "";

    // Apply IST to get correct calendar date

    var raw2 = e.created_at ? (e.created_at+"").replace(" ","T") : new Date().toISOString(); if(!raw2.endsWith("Z") && !raw2.includes("+")) raw2+="Z"; var ts = new Date(raw2).getTime(); if(isNaN(ts)) ts = Date.now();

    var dd = new Date(ts + IST_MS2); return isNaN(dd) ? "" : dd.toISOString().slice(0,10);

  }).filter(function(d){ return d.length === 10; })).size;



  // Group by month

  var groups = {};

  var IST_GRP = 330 * 60000;

  filtered.forEach(function(e){

    var ts = e.created_at

      ? (()=>{ var raw3 = e.created_at ? (e.created_at+"").replace(" ","T") : new Date().toISOString(); if(!raw3.endsWith("Z") && !raw3.includes("+")) raw3+="Z"; var t=new Date(raw3).getTime(); return (isNaN(t)?Date.now():t)+IST_GRP; })()

      : Date.now();

    var d = new Date(ts);

    var key = d.toLocaleDateString("en-IN",{month:"long",year:"numeric"});

    if (!groups[key]) groups[key]=[];

    groups[key].push(e);

  });



  return (

    <div style={{ animation:"fadeIn 0.3s ease", paddingBottom:"24px" }}>

      <style>{`

        @keyframes fadeIn  {from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}

        @keyframes slideUp {from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}

        .j-input{background:var(--card)!important;color:var(--text)!important;border:1px solid var(--border)!important;}

        .j-input:focus{border-color:rgba(124,92,252,0.4)!important;outline:none!important;}

        .j-input::placeholder{color:var(--muted)!important;}

      `}</style>



      {/* Header */}

      <div style={{ marginBottom:"16px" }}>

        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"4px" }}>

          <div>

            <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:"900", fontSize:"clamp(20px,5vw,26px)", background:"linear-gradient(135deg,#7c5cfc,#fc5cf0)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", lineHeight:1.1, marginBottom:"4px" }}>

              My Journal

            </h1>

            <p style={{ fontSize:"12px", color:"var(--muted)" }}>Your private space to reflect, grow, and process</p>

          </div>

          <button onClick={handleNew}

            style={{ display:"flex", alignItems:"center", gap:"6px", padding:"10px 18px", borderRadius:"12px", border:"none", background:"linear-gradient(135deg,#7c5cfc,#9c7cfc)", color:"#fff", fontFamily:"'Syne',sans-serif", fontWeight:"800", fontSize:"13px", cursor:"pointer", boxShadow:"0 3px 14px rgba(124,92,252,0.3)", flexShrink:0 }}>

            ✍️ Write

          </button>

        </div>



        {/* Privacy badge */}

        <div style={{ display:"inline-flex", alignItems:"center", gap:"5px", background:"rgba(74,222,128,0.08)", border:"1px solid rgba(74,222,128,0.2)", borderRadius:"8px", padding:"4px 10px", marginTop:"4px" }}>

          <span style={{ fontSize:"10px" }}>🔒</span>

          <span style={{ fontSize:"10px", color:"#4ade80", fontWeight:"700", fontFamily:"'Syne',sans-serif" }}>Private & Secure — only you can read this</span>

        </div>

      </div>



      {/* Stats row */}

      {entries.length > 0 && (

        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"8px", marginBottom:"14px" }}>

          {[

            { v:posCount,       l:"Positive",   c:"#4ade80", e:"😊" },

            { v:toughCount,     l:"Tough",       c:"#f87171", e:"💪" },

            { v:streakDays+"d", l:"Streak",      c:"#fb923c", e:"🔥" },

            { v:totalWords,     l:"Words",       c:"#60a5fa", e:"✍️" },

          ].map(function(s){

            return (

              <div key={s.l} style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:"14px", padding:"12px 10px", textAlign:"center" }}>

                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:"900", fontSize:"clamp(14px,4vw,20px)", color:s.c, lineHeight:1, marginBottom:"3px" }}>{s.e}{s.v}</div>

                <div style={{ fontSize:"9px", color:"var(--muted)", fontWeight:"600", letterSpacing:"0.04em" }}>{s.l.toUpperCase()}</div>

              </div>

            );

          })}

        </div>

      )}



      {/* Mood streak */}

      {entries.length > 0 && (

        <div style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:"14px", padding:"12px 14px", marginBottom:"14px" }}>

          <div style={{ fontSize:"9px", color:"var(--muted)", fontFamily:"'Syne',sans-serif", fontWeight:"800", letterSpacing:"0.1em", marginBottom:"8px" }}>THIS WEEK'S MOOD STREAK</div>

          <MoodStreak entries={entries} />

        </div>

      )}



      {/* Search + Filters */}

      {entries.length > 0 && (

        <div style={{ marginBottom:"12px", display:"flex", flexDirection:"column", gap:"8px" }}>

          <input

            className="j-input"

            placeholder="🔍 Search entries..."

            value={search}

            onChange={function(e){ setSearch(e.target.value); }}

            style={{ width:"100%", boxSizing:"border-box", borderRadius:"10px", padding:"9px 14px", fontSize:"13px", fontFamily:"'DM Sans',sans-serif" }}

          />

          <div style={{ display:"flex", gap:"6px", overflowX:"auto", paddingBottom:"2px" }}>

            <button onClick={function(){ setFilterMood(""); setFilterTag(""); setSearch(""); }}

              style={{ padding:"5px 12px", borderRadius:"8px", border:"1px solid "+(filterMood||filterTag||search?"var(--border)":"rgba(124,92,252,0.4)"), background:filterMood||filterTag||search?"transparent":"rgba(124,92,252,0.1)", color:filterMood||filterTag||search?"var(--muted)":"var(--accent)", fontSize:"11px", cursor:"pointer", whiteSpace:"nowrap", fontWeight:"700", fontFamily:"'Syne',sans-serif" }}>

              All

            </button>

            {MOODS.map(function(m){

              return (

                <button key={m.key} onClick={function(){ setFilterMood(filterMood===m.key?"":m.key); }}

                  style={{ padding:"5px 11px", borderRadius:"8px", border:"1px solid "+(filterMood===m.key?m.color+"66":"var(--border)"), background:filterMood===m.key?m.bg:"transparent", color:filterMood===m.key?m.color:"var(--muted)", fontSize:"11px", cursor:"pointer", whiteSpace:"nowrap", fontWeight:"700", fontFamily:"'DM Sans',sans-serif" }}>

                  {m.emoji}

                </button>

              );

            })}

            <div style={{ width:"1px", background:"var(--border)", flexShrink:0, margin:"0 2px" }} />

            <button onClick={function(){ setSortDir(function(v){return v==="desc"?"asc":"desc";}); }}

              style={{ padding:"5px 11px", borderRadius:"8px", border:"1px solid var(--border)", background:"transparent", color:"var(--muted)", fontSize:"11px", cursor:"pointer", whiteSpace:"nowrap", fontWeight:"700" }}>

              {sortDir==="desc"?"↓ Newest":"↑ Oldest"}

            </button>

          </div>

          {/* Tag filter */}

          <div style={{ display:"flex", gap:"5px", flexWrap:"wrap" }}>

            {TAGS.map(function(t){

              var sel = filterTag===t;

              return (

                <button key={t} onClick={function(){ setFilterTag(sel?"":t); }}

                  style={{ padding:"3px 10px", borderRadius:"7px", border:"1px solid "+(sel?"rgba(124,92,252,0.4)":"var(--border)"), background:sel?"rgba(124,92,252,0.1)":"transparent", color:sel?"var(--accent)":"var(--muted)", fontSize:"10px", cursor:"pointer", fontWeight:"600" }}>

                  {t}

                </button>

              );

            })}

          </div>

        </div>

      )}



      {/* Entries */}

      {loading ? (

        <div style={{ textAlign:"center", padding:"40px", color:"var(--muted)", fontSize:"13px" }}>Loading your journal...</div>

      ) : filtered.length === 0 && entries.length === 0 ? (

        <div style={{ textAlign:"center", padding:"48px 20px", background:"var(--card)", borderRadius:"20px", border:"1px solid var(--border)" }}>

          <div style={{ fontSize:"48px", marginBottom:"12px" }}>📖</div>

          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:"800", fontSize:"16px", color:"var(--text)", marginBottom:"6px" }}>Your journal is empty</div>

          <div style={{ fontSize:"13px", color:"var(--muted)", marginBottom:"20px", lineHeight:"1.6" }}>

            Writing regularly helps you understand your emotions,<br/>track your growth, and stay connected to your goals.

          </div>

          <button onClick={handleNew}

            style={{ padding:"11px 28px", borderRadius:"12px", border:"none", background:"linear-gradient(135deg,#7c5cfc,#9c7cfc)", color:"#fff", fontFamily:"'Syne',sans-serif", fontWeight:"800", fontSize:"14px", cursor:"pointer", boxShadow:"0 3px 14px rgba(124,92,252,0.3)" }}>

            ✍️ Write Your First Entry

          </button>

        </div>

      ) : filtered.length === 0 ? (

        <div style={{ textAlign:"center", padding:"30px", color:"var(--muted)", fontSize:"13px" }}>

          No entries match your filter. <button onClick={function(){setFilterMood("");setFilterTag("");setSearch("");}} style={{color:"var(--accent)",background:"none",border:"none",cursor:"pointer",fontWeight:"700"}}>Clear filters</button>

        </div>

      ) : (

        Object.entries(groups).map(function(pair){

          var monthLabel = pair[0]; var monthEntries = pair[1];

          return (

            <div key={monthLabel} style={{ marginBottom:"16px" }}>

              <div style={{ fontSize:"10px", fontFamily:"'Syne',sans-serif", fontWeight:"800", color:"var(--muted)", letterSpacing:"0.12em", marginBottom:"8px", display:"flex", alignItems:"center", gap:"8px" }}>

                {monthLabel.toUpperCase()}

                <div style={{ flex:1, height:"1px", background:"var(--border)" }} />

                <span style={{ fontWeight:"600" }}>{monthEntries.length} {monthEntries.length===1?"entry":"entries"}</span>

              </div>

              {monthEntries.map(function(e){

                return <EntryCard key={e.id} entry={e} onDelete={handleDelete} onEdit={handleEdit} />;

              })}

            </div>

          );

        })

      )}



      {/* Write modal */}

      {showWrite && (

        <WriteModal

          user={user}

          editEntry={editEntry}

          onClose={function(){ setShowWrite(false); setEditEntry(null); }}

          onSaved={load}

        />

      )}

    </div>

  );

}



export default Journal;

