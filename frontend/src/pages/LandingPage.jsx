import React, { useState, useEffect } from "react";

// ── Animated butterfly component ────────────────────────────────────────────
function Butterfly({ x, y, size, delay, duration, color1, color2 }) {
  var s = size || 28;
  return (
    <div style={{
      position:"absolute", left:x+"%", top:y+"%",
      animation:`fly ${duration}s ease-in-out ${delay}s infinite`,
      opacity:0.7, pointerEvents:"none", zIndex:1,
    }}>
      <style>{`
        @keyframes fly {
          0%   { transform:translate(0,0) rotate(-5deg) scale(1); }
          25%  { transform:translate(20px,-30px) rotate(8deg) scale(1.05); }
          50%  { transform:translate(5px,-55px) rotate(-3deg) scale(0.95); }
          75%  { transform:translate(-15px,-35px) rotate(6deg) scale(1.05); }
          100% { transform:translate(0,0) rotate(-5deg) scale(1); }
        }
        @keyframes wingFlap {
          0%,100% { transform:scaleX(1); }
          50%      { transform:scaleX(0.7); }
        }
      `}</style>
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"
        style={{animation:`wingFlap ${0.6+Math.random()*0.4}s ease-in-out infinite`,animationDelay:delay+"s"}}>
        <path d="M20 20 C16 14,6 10,4 16 C2 22,10 26,20 20Z"   fill={color1} opacity="0.9"/>
        <path d="M20 20 C24 14,34 10,36 16 C38 22,30 26,20 20Z" fill={color2} opacity="0.9"/>
        <path d="M20 20 C15 24,6 26,5 32 C4 36,12 36,20 20Z"   fill={color1} opacity="0.75"/>
        <path d="M20 20 C25 24,34 26,35 32 C36 36,28 36,20 20Z" fill={color2} opacity="0.75"/>
        <ellipse cx="20" cy="20" rx="1.2" ry="6" fill="rgba(255,255,255,0.6)"/>
        <line x1="20" y1="14" x2="16" y2="9" stroke="rgba(255,255,255,0.5)" strokeWidth="1" strokeLinecap="round"/>
        <line x1="20" y1="14" x2="24" y2="9" stroke="rgba(255,255,255,0.5)" strokeWidth="1" strokeLinecap="round"/>
      </svg>
    </div>
  );
}

// Fixed butterfly positions (deterministic, not random)
var BUTTERFLIES = [
  {x:5,  y:15, size:22, delay:0,   dur:6,   c1:"rgba(124,92,252,0.6)",  c2:"rgba(252,92,240,0.5)"},
  {x:88, y:8,  size:32, delay:1.2, dur:7.5, c1:"rgba(167,139,250,0.6)", c2:"rgba(124,92,252,0.5)"},
  {x:15, y:72, size:18, delay:2.5, dur:5.5, c1:"rgba(252,92,240,0.5)",  c2:"rgba(196,181,253,0.6)"},
  {x:78, y:65, size:26, delay:0.8, dur:8,   c1:"rgba(124,92,252,0.5)",  c2:"rgba(252,92,240,0.6)"},
  {x:45, y:5,  size:20, delay:3,   dur:6.5, c1:"rgba(196,181,253,0.6)", c2:"rgba(167,139,250,0.5)"},
  {x:92, y:45, size:15, delay:1.8, dur:5,   c1:"rgba(252,92,240,0.5)",  c2:"rgba(124,92,252,0.5)"},
  {x:3,  y:45, size:24, delay:4,   dur:7,   c1:"rgba(167,139,250,0.55)","c2":"rgba(252,92,240,0.55)"},
  {x:60, y:88, size:19, delay:2,   dur:6,   c1:"rgba(124,92,252,0.5)",  c2:"rgba(196,181,253,0.6)"},
];

var FEATURES = [
  {icon:"🎯",title:"Smart Goal Roadmaps",   desc:"AI builds a step-by-step plan for any goal in seconds.",color:"#7c5cfc"},
  {icon:"📔",title:"Encrypted Journal",     desc:"AES-256 encrypted. AI detects your mood with VADER.",color:"#60a5fa"},
  {icon:"🔥",title:"Streak & Gamification", desc:"50 badges, 15 levels, daily XP to make progress addictive.",color:"#fb923c"},
  {icon:"📊",title:"Mood Tracking",         desc:"Every AI session is scored and graphed across weeks.",color:"#4ade80"},
  {icon:"🔒",title:"Private by Design",     desc:"Export or delete your data anytime. Never sold.",color:"#fbbf24"},
  {icon:"🤖",title:"LLaMA 3.3 70B AI",     desc:"One of the world's best open models, running 24/7.",color:"#fc5cf0"},
];

function LandingPage({ onGetStarted, onLogin }) {
  var [scrolled, setScrolled] = useState(false);

  useEffect(function() {
    function onScroll() { setScrolled(window.scrollY > 30); }
    window.addEventListener("scroll", onScroll);
    return function(){ window.removeEventListener("scroll", onScroll); };
  }, []);

  return (
    <div style={{background:"#05050f",color:"#eeeeff",fontFamily:"'DM Sans',sans-serif",minHeight:"100vh",overflowX:"hidden",position:"relative"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@300;400;500&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes glow{0%,100%{opacity:0.4}50%{opacity:0.8}}
        @keyframes spin-slow{to{transform:rotate(360deg)}}
        .cta-btn:hover{transform:translateY(-2px)!important;box-shadow:0 16px 48px rgba(124,92,252,.5)!important;}
        .ghost-btn:hover{background:rgba(255,255,255,0.08)!important;}
        .feat-card:hover{transform:translateY(-4px);border-color:rgba(124,92,252,0.4)!important;}
        *{box-sizing:border-box;}
      `}</style>

      {/* Flying butterflies */}
      <div style={{position:"fixed",inset:0,overflow:"hidden",pointerEvents:"none",zIndex:0}}>
        {BUTTERFLIES.map(function(b,i){
          return <Butterfly key={i} x={b.x} y={b.y} size={b.size} delay={b.delay} duration={b.dur} color1={b.c1} color2={b.c2}/>;
        })}
      </div>

      {/* NAV */}
      <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:100,padding:"14px 28px",background:scrolled?"rgba(5,5,15,0.88)":"transparent",backdropFilter:scrolled?"blur(16px)":"none",borderBottom:scrolled?"1px solid rgba(255,255,255,0.06)":"none",transition:"all .3s",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:9}}>
          {/* Mini butterfly logo */}
          <svg width="26" height="26" viewBox="0 0 40 40" fill="none">
            <path d="M20 20 C16 14,6 10,4 16 C2 22,10 26,20 20Z"   fill="url(#nb1)"/>
            <path d="M20 20 C24 14,34 10,36 16 C38 22,30 26,20 20Z" fill="url(#nb2)"/>
            <path d="M20 20 C15 24,6 26,5 32 C4 36,12 36,20 20Z"   fill="url(#nb3)" opacity=".8"/>
            <path d="M20 20 C25 24,34 26,35 32 C36 36,28 36,20 20Z" fill="url(#nb4)" opacity=".8"/>
            <ellipse cx="20" cy="20" rx="1.2" ry="6" fill="#eeeeff" opacity=".7"/>
            <defs>
              <linearGradient id="nb1" x1="4" y1="10" x2="20" y2="26" gradientUnits="userSpaceOnUse"><stop stopColor="#7c5cfc"/><stop offset="1" stopColor="#c4b5fd"/></linearGradient>
              <linearGradient id="nb2" x1="36" y1="10" x2="20" y2="26" gradientUnits="userSpaceOnUse"><stop stopColor="#fc5cf0"/><stop offset="1" stopColor="#7c5cfc"/></linearGradient>
              <linearGradient id="nb3" x1="5" y1="26" x2="20" y2="36" gradientUnits="userSpaceOnUse"><stop stopColor="#a78bfa"/><stop offset="1" stopColor="#7c5cfc"/></linearGradient>
              <linearGradient id="nb4" x1="35" y1="26" x2="20" y2="36" gradientUnits="userSpaceOnUse"><stop stopColor="#fc5cf0"/><stop offset="1" stopColor="#a78bfa"/></linearGradient>
            </defs>
          </svg>
          <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:15,background:"linear-gradient(135deg,#eeeeff,#a78bfa)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Manifesting Motivation</span>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={onLogin} className="ghost-btn"
            style={{padding:"8px 18px",borderRadius:9,background:"transparent",border:"1px solid rgba(255,255,255,0.15)",color:"rgba(255,255,255,0.75)",cursor:"pointer",fontSize:13,transition:"all .2s"}}>
            Sign in
          </button>
          <button onClick={onGetStarted} className="cta-btn"
            style={{padding:"8px 18px",borderRadius:9,background:"linear-gradient(135deg,#7c5cfc,#fc5cf0)",border:"none",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"'Syne',sans-serif",transition:"all .2s",boxShadow:"0 4px 14px rgba(124,92,252,.35)"}}>
            Get started free →
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",padding:"120px 24px 80px",position:"relative",zIndex:2}}>
        {/* Glow orbs */}
        <div style={{position:"absolute",top:"20%",left:"8%",width:420,height:420,borderRadius:"50%",background:"radial-gradient(circle,rgba(124,92,252,0.12) 0%,transparent 70%)",pointerEvents:"none",animation:"glow 4s ease infinite"}}/>
        <div style={{position:"absolute",bottom:"10%",right:"5%",width:360,height:360,borderRadius:"50%",background:"radial-gradient(circle,rgba(252,92,240,0.1) 0%,transparent 70%)",pointerEvents:"none",animation:"glow 5s ease infinite 1.5s"}}/>

        <div style={{animation:"fadeUp .6s ease both"}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:7,padding:"5px 14px",borderRadius:100,background:"rgba(124,92,252,0.12)",border:"1px solid rgba(124,92,252,0.3)",marginBottom:24}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:"#4ade80",animation:"glow 2s infinite"}}/>
            <span style={{fontSize:12,color:"#a78bfa",fontWeight:600}}>AI Coaching Platform · Dream it. Build it. Live it. 🚀</span>
          </div>
        </div>

        {/* Big butterfly in hero */}
        <div style={{marginBottom:20,animation:"fadeUp .6s .1s ease both"}}>
          <svg width="80" height="80" viewBox="0 0 40 40" fill="none" style={{filter:"drop-shadow(0 0 20px rgba(124,92,252,0.4))"}}>
            <path d="M20 20 C16 14,6 10,4 16 C2 22,10 26,20 20Z"   fill="url(#hb1)" opacity="0.95"/>
            <path d="M20 20 C24 14,34 10,36 16 C38 22,30 26,20 20Z" fill="url(#hb2)" opacity="0.95"/>
            <path d="M20 20 C15 24,6 26,5 32 C4 36,12 36,20 20Z"   fill="url(#hb3)" opacity="0.85"/>
            <path d="M20 20 C25 24,34 26,35 32 C36 36,28 36,20 20Z" fill="url(#hb4)" opacity="0.85"/>
            <ellipse cx="20" cy="20" rx="1.3" ry="7" fill="#7c5cfc"/>
            <line x1="20" y1="13" x2="15" y2="7" stroke="#7c5cfc" strokeWidth="1.2" strokeLinecap="round"/>
            <line x1="20" y1="13" x2="25" y2="7" stroke="#7c5cfc" strokeWidth="1.2" strokeLinecap="round"/>
            <circle cx="15" cy="7" r="1.4" fill="#fc5cf0"/>
            <circle cx="25" cy="7" r="1.4" fill="#fc5cf0"/>
            <defs>
              <linearGradient id="hb1" x1="4" y1="10" x2="20" y2="26" gradientUnits="userSpaceOnUse"><stop stopColor="#7c5cfc"/><stop offset="1" stopColor="#c4b5fd"/></linearGradient>
              <linearGradient id="hb2" x1="36" y1="10" x2="20" y2="26" gradientUnits="userSpaceOnUse"><stop stopColor="#fc5cf0"/><stop offset="1" stopColor="#7c5cfc"/></linearGradient>
              <linearGradient id="hb3" x1="5" y1="26" x2="20" y2="36" gradientUnits="userSpaceOnUse"><stop stopColor="#a78bfa"/><stop offset="1" stopColor="#7c5cfc"/></linearGradient>
              <linearGradient id="hb4" x1="35" y1="26" x2="20" y2="36" gradientUnits="userSpaceOnUse"><stop stopColor="#fc5cf0"/><stop offset="1" stopColor="#a78bfa"/></linearGradient>
            </defs>
          </svg>
        </div>

        <h1 style={{fontFamily:"'Syne',sans-serif",fontWeight:900,fontSize:"clamp(32px,7vw,68px)",lineHeight:1.05,letterSpacing:"-1.5px",marginBottom:22,maxWidth:800,animation:"fadeUp .6s .15s ease both"}}>
          <span style={{background:"linear-gradient(135deg,#eeeeff 20%,#b8a0ff 60%,#fc5cf0 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Your AI Coach for Goals,</span><br/>
          <span style={{background:"linear-gradient(135deg,#fc5cf0,#7c5cfc)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Mood & Growth</span>
        </h1>

        <p style={{fontSize:"clamp(15px,2vw,19px)",color:"rgba(238,238,255,0.6)",maxWidth:520,lineHeight:1.75,marginBottom:36,animation:"fadeUp .6s .2s ease both"}}>
          Set goals · get AI-powered roadmaps · track your mood · earn XP and badges. Built for people who want to grow — not just track.
        </p>

        <div style={{display:"flex",gap:11,flexWrap:"wrap",justifyContent:"center",marginBottom:56,animation:"fadeUp .6s .25s ease both"}}>
          <button onClick={onGetStarted} className="cta-btn"
            style={{padding:"15px 36px",borderRadius:13,background:"linear-gradient(135deg,#7c5cfc,#fc5cf0)",border:"none",color:"#fff",cursor:"pointer",fontSize:16,fontWeight:800,fontFamily:"'Syne',sans-serif",boxShadow:"0 8px 32px rgba(124,92,252,.4)",transition:"all .2s"}}>
            🚀 Start free — no card needed
          </button>
          <button onClick={onLogin} className="ghost-btn"
            style={{padding:"15px 26px",borderRadius:13,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.15)",color:"#eeeeff",cursor:"pointer",fontSize:15,fontWeight:500,transition:"all .2s"}}>
            Already have an account →
          </button>
        </div>

        {/* Quick stats */}
        <div style={{display:"flex",gap:36,flexWrap:"wrap",justifyContent:"center",animation:"fadeUp .6s .3s ease both"}}>
          {[{v:"50",l:"Badges"},{v:"15",l:"Levels"},{v:"24/7",l:"AI coach"},{v:"0₹",l:"Free forever"}].map(function(s){
            return (
              <div key={s.l} style={{textAlign:"center"}}>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:900,fontSize:"clamp(24px,4vw,36px)",background:"linear-gradient(135deg,#eeeeff,#a78bfa)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1}}>{s.v}</div>
                <div style={{fontSize:12,color:"rgba(238,238,255,0.4)",marginTop:4}}>{s.l}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* FEATURES */}
      <section style={{padding:"80px 24px 100px",maxWidth:1060,margin:"0 auto",position:"relative",zIndex:2}}>
        <div style={{textAlign:"center",marginBottom:56}}>
          <div style={{fontSize:10,fontWeight:800,color:"#7c5cfc",letterSpacing:".16em",marginBottom:12,fontFamily:"'Syne',sans-serif"}}>EVERYTHING YOU NEED</div>
          <h2 style={{fontFamily:"'Syne',sans-serif",fontWeight:900,fontSize:"clamp(24px,4vw,40px)",lineHeight:1.1,letterSpacing:"-.5px"}}>Built for serious growth</h2>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(290px,1fr))",gap:13}}>
          {FEATURES.map(function(f){
            return (
              <div key={f.title} className="feat-card"
                style={{padding:"26px 22px",borderRadius:17,border:"1px solid rgba(255,255,255,0.07)",background:"rgba(255,255,255,0.02)",transition:"all .3s"}}>
                <div style={{width:46,height:46,borderRadius:13,background:f.color+"18",border:"1px solid "+f.color+"30",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,marginBottom:14}}>{f.icon}</div>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:15,color:"#eeeeff",marginBottom:7}}>{f.title}</div>
                <div style={{fontSize:13,color:"rgba(238,238,255,0.45)",lineHeight:1.7}}>{f.desc}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section style={{padding:"60px 24px 100px",textAlign:"center",position:"relative",zIndex:2}}>
        <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(124,92,252,0.1) 0%,transparent 70%)",pointerEvents:"none"}}/>
        <div style={{position:"relative",maxWidth:560,margin:"0 auto"}}>
          <div style={{fontSize:52,marginBottom:16,filter:"drop-shadow(0 0 16px rgba(124,92,252,.4))"}}>
            <svg width="52" height="52" viewBox="0 0 40 40" fill="none">
              <path d="M20 20 C16 14,6 10,4 16 C2 22,10 26,20 20Z"   fill="url(#cb1)" opacity="0.9"/>
              <path d="M20 20 C24 14,34 10,36 16 C38 22,30 26,20 20Z" fill="url(#cb2)" opacity="0.9"/>
              <path d="M20 20 C15 24,6 26,5 32 C4 36,12 36,20 20Z"   fill="url(#cb3)" opacity="0.8"/>
              <path d="M20 20 C25 24,34 26,35 32 C36 36,28 36,20 20Z" fill="url(#cb4)" opacity="0.8"/>
              <ellipse cx="20" cy="20" rx="1.2" ry="6.5" fill="#7c5cfc"/>
              <defs>
                <linearGradient id="cb1" x1="4" y1="10" x2="20" y2="26" gradientUnits="userSpaceOnUse"><stop stopColor="#7c5cfc"/><stop offset="1" stopColor="#c4b5fd"/></linearGradient>
                <linearGradient id="cb2" x1="36" y1="10" x2="20" y2="26" gradientUnits="userSpaceOnUse"><stop stopColor="#fc5cf0"/><stop offset="1" stopColor="#7c5cfc"/></linearGradient>
                <linearGradient id="cb3" x1="5" y1="26" x2="20" y2="36" gradientUnits="userSpaceOnUse"><stop stopColor="#a78bfa"/><stop offset="1" stopColor="#7c5cfc"/></linearGradient>
                <linearGradient id="cb4" x1="35" y1="26" x2="20" y2="36" gradientUnits="userSpaceOnUse"><stop stopColor="#fc5cf0"/><stop offset="1" stopColor="#a78bfa"/></linearGradient>
              </defs>
            </svg>
          </div>
          <h2 style={{fontFamily:"'Syne',sans-serif",fontWeight:900,fontSize:"clamp(24px,4vw,42px)",lineHeight:1.1,letterSpacing:"-.5px",marginBottom:14}}>Start your journey today</h2>
          <p style={{fontSize:16,color:"rgba(238,238,255,0.5)",marginBottom:32,lineHeight:1.7}}>Free forever. No credit card. Just your goals and an AI that actually helps.</p>
          <button onClick={onGetStarted} className="cta-btn"
            style={{padding:"17px 44px",borderRadius:14,background:"linear-gradient(135deg,#7c5cfc,#fc5cf0)",border:"none",color:"#fff",cursor:"pointer",fontSize:17,fontWeight:900,fontFamily:"'Syne',sans-serif",boxShadow:"0 10px 40px rgba(124,92,252,.45)",letterSpacing:"-.2px",transition:"all .2s"}}>
            Create your free account →
          </button>
          <div style={{marginTop:16,fontSize:12,color:"rgba(238,238,255,0.25)"}}>Crafted with passion · Where dreams become direction ✨</div>
        </div>
      </section>

      <footer style={{padding:"20px 28px",borderTop:"1px solid rgba(255,255,255,0.06)",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,position:"relative",zIndex:2}}>
        <span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:12,color:"rgba(238,238,255,0.35)"}}>Manifesting Motivation AI</span>
        <span style={{fontSize:11,color:"rgba(238,238,255,0.2)"}}>Powered by LLaMA 3.3 70B · Groq · VADER · ElevenLabs</span>
      </footer>
    </div>
  );
}

export default LandingPage;