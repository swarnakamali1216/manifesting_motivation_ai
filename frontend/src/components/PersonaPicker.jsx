import React from "react";

var personas = [
  { id:"student",      emoji:"🎓", label:"Student",      desc:"Study & exams"    },
  { id:"professional", emoji:"💼", label:"Professional",  desc:"Career & focus"   },
  { id:"fitness",      emoji:"💪", label:"Fitness",       desc:"Health & energy"  },
  { id:"creative",     emoji:"🎨", label:"Creative",      desc:"Art & projects"   },
];

function PersonaPicker({ selected, onSelect }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10 }}>
      {personas.map(function(p) {
        var sel = selected === p.id;
        return (
          <button key={p.id} onClick={function(){ onSelect(p.id); }}
            style={{
              padding:"14px 10px", borderRadius:14, cursor:"pointer", textAlign:"center",
              border:sel?"2px solid var(--accent)":"1px solid var(--border)",
              background:sel?"rgba(124,92,252,0.1)":"var(--card)",
              transition:"all 0.18s", WebkitTapHighlightColor:"transparent",
              transform:sel?"translateY(-2px)":"none",
              boxShadow:sel?"0 4px 14px rgba(124,92,252,0.2)":"none",
            }}>
            <div style={{ fontSize:26, marginBottom:6 }}>{p.emoji}</div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:12, color:sel?"var(--accent)":"var(--text)", marginBottom:2 }}>{p.label}</div>
            <div style={{ fontSize:10, color:"var(--muted)" }}>{p.desc}</div>
            {sel && <div style={{ fontSize:9, color:"var(--accent)", fontWeight:800, marginTop:4 }}>✓ ACTIVE</div>}
          </button>
        );
      })}
    </div>
  );
}

export default PersonaPicker;

