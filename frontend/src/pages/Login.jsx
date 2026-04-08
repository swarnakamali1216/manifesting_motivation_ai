/**
 * Login.jsx — Designer-quality dark glassmorphism login
 * Butterfly SVG logo · floating butterflies · purple/pink gradient theme
 * Matches LandingPage aesthetic exactly.
 */
import React, { useState, useEffect } from "react";
import axios from "axios";

var API = "https://manifesting-motivation-backend.onrender.com/api";

// ── Butterfly SVG Logo ─────────────────────────────────────────────────────
function ButterflyLogo({ size }) {
  var s = size || 52;
  return (
    <svg width={s} height={s} viewBox="0 0 40 40" fill="none"
      style={{ filter:"drop-shadow(0 0 12px rgba(124,92,252,0.45))" }}>
      <path d="M20 20 C16 14,6 10,4 16 C2 22,10 26,20 20Z"   fill="url(#lg1)" opacity="0.95"/>
      <path d="M20 20 C24 14,34 10,36 16 C38 22,30 26,20 20Z" fill="url(#lg2)" opacity="0.95"/>
      <path d="M20 20 C15 24,6 26,5 32 C4 36,12 36,20 20Z"   fill="url(#lg3)" opacity="0.85"/>
      <path d="M20 20 C25 24,34 26,35 32 C36 36,28 36,20 20Z" fill="url(#lg4)" opacity="0.85"/>
      <ellipse cx="20" cy="20" rx="1.3" ry="7" fill="#7c5cfc"/>
      <line x1="20" y1="13" x2="15" y2="7" stroke="#7c5cfc" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="20" y1="13" x2="25" y2="7" stroke="#7c5cfc" strokeWidth="1.2" strokeLinecap="round"/>
      <circle cx="15" cy="7" r="1.5" fill="#fc5cf0"/>
      <circle cx="25" cy="7" r="1.5" fill="#fc5cf0"/>
      <defs>
        <linearGradient id="lg1" x1="4"  y1="10" x2="20" y2="26" gradientUnits="userSpaceOnUse"><stop stopColor="#7c5cfc"/><stop offset="1" stopColor="#c4b5fd"/></linearGradient>
        <linearGradient id="lg2" x1="36" y1="10" x2="20" y2="26" gradientUnits="userSpaceOnUse"><stop stopColor="#fc5cf0"/><stop offset="1" stopColor="#7c5cfc"/></linearGradient>
        <linearGradient id="lg3" x1="5"  y1="26" x2="20" y2="36" gradientUnits="userSpaceOnUse"><stop stopColor="#a78bfa"/><stop offset="1" stopColor="#7c5cfc"/></linearGradient>
        <linearGradient id="lg4" x1="35" y1="26" x2="20" y2="36" gradientUnits="userSpaceOnUse"><stop stopColor="#fc5cf0"/><stop offset="1" stopColor="#a78bfa"/></linearGradient>
      </defs>
    </svg>
  );
}

// ── Floating background butterfly ─────────────────────────────────────────
function FloatB({ x, y, s, delay }) {
  return (
    <div style={{
      position:"absolute", left:x+"%", top:y+"%",
      opacity:0.14, pointerEvents:"none",
      animation:"lbfly "+(5+delay)+"s ease-in-out "+delay+"s infinite"
    }}>
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none"
        style={{animation:"lbwing .7s ease-in-out "+delay+"s infinite"}}>
        <path d="M20 20 C16 14,6 10,4 16 C2 22,10 26,20 20Z"   fill="#7c5cfc"/>
        <path d="M20 20 C24 14,34 10,36 16 C38 22,30 26,20 20Z" fill="#fc5cf0"/>
        <path d="M20 20 C15 24,6 26,5 32 C4 36,12 36,20 20Z"   fill="#a78bfa" opacity=".8"/>
        <path d="M20 20 C25 24,34 26,35 32 C36 36,28 36,20 20Z" fill="#fc5cf0" opacity=".8"/>
      </svg>
    </div>
  );
}

var BG = [
  {x:4,  y:10, s:24, d:0  }, {x:87, y:7,  s:30, d:1.5},
  {x:10, y:78, s:18, d:2.5}, {x:83, y:68, s:26, d:0.8},
  {x:50, y:4,  s:17, d:3  }, {x:93, y:42, s:15, d:1.8},
  {x:2,  y:50, s:21, d:4  }, {x:67, y:88, s:19, d:2  },
];

function Login({ onLoginSuccess, onBack }) {
  var [mode,    setMode]    = useState("login");
  var [email,   setEmail]   = useState("");
  var [password,setPassword]= useState("");
  var [name,    setName]    = useState("");
  var [loading, setLoading] = useState(false);
  var [error,   setError]   = useState("");
  var [showPw,  setShowPw]  = useState(false);

  useEffect(function() {
    delete axios.defaults.headers.common["X-Requested-With"];
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { setError("Please fill in email and password"); return; }
    setLoading(true); setError("");
    var ep      = mode === "register" ? "/auth/register" : "/auth/login";
    var payload = mode === "register"
      ? { email:email.trim().toLowerCase(), password, name:name.trim()||"User" }
      : { email:email.trim().toLowerCase(), password };
    axios.post(API + ep, payload)
      .then(function(res) {
        var { token, user } = res.data;
        if (token) localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        onLoginSuccess(user);
      })
      .catch(function(err) {
        setError(err?.response?.data?.error || "Authentication failed. Make sure Flask is running on port 5000.");
      })
      .finally(function(){ setLoading(false); });
  }

  return (
    <div style={{
      minHeight:"100vh", position:"relative", overflow:"hidden",
      background:"linear-gradient(145deg,#050510 0%,#0a0a1e 40%,#08081a 100%)",
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:20, fontFamily:"'DM Sans',sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes lbfly{0%,100%{transform:translate(0,0) rotate(-5deg)}50%{transform:translate(10px,-22px) rotate(5deg)}}
        @keyframes lbwing{0%,100%{transform:scaleX(1)}50%{transform:scaleX(0.6)}}
        @keyframes lfadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes lglow{0%,100%{opacity:0.4}50%{opacity:0.8}}
        @keyframes lbfloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        .linp{width:100%;padding:13px 44px 13px 16px;border:1.5px solid rgba(124,92,252,0.2);border-radius:12px;font-size:14px;font-family:'DM Sans',sans-serif;background:rgba(255,255,255,0.04);outline:none;box-sizing:border-box;transition:all 0.2s;color:#eeeeff;}
        .linp:focus{border-color:#7c5cfc;box-shadow:0 0 0 3px rgba(124,92,252,0.12);background:rgba(124,92,252,0.06);}
        .linp::placeholder{color:rgba(238,238,255,0.22);}
        .ltab{flex:1;padding:10px 6px;border:none;background:transparent;cursor:pointer;font-family:'Syne',sans-serif;font-weight:800;font-size:13px;border-bottom:2px solid transparent;transition:all 0.15s;letter-spacing:-0.2px;}
        .lsbtn{width:100%;padding:15px;border-radius:14px;border:none;background:linear-gradient(135deg,#7c5cfc,#fc5cf0);color:#fff;font-family:'Syne',sans-serif;font-weight:900;font-size:15px;cursor:pointer;box-shadow:0 8px 30px rgba(124,92,252,.42);transition:all 0.2s;letter-spacing:-0.2px;}
        .lsbtn:disabled{background:rgba(124,92,252,0.2);cursor:not-allowed;box-shadow:none;color:rgba(238,238,255,0.4);}
        .lsbtn:not(:disabled):hover{transform:translateY(-2px);box-shadow:0 14px 40px rgba(124,92,252,.55);}
        .llbl{font-size:10px;font-weight:800;color:rgba(124,92,252,0.65);letter-spacing:0.13em;display:block;margin-bottom:7px;font-family:'Syne',sans-serif;text-transform:uppercase;}
        .lbackbtn:hover{background:rgba(255,255,255,0.06)!important;color:rgba(238,238,255,0.5)!important;}
        .lpwbtn:hover{opacity:0.8;}
      `}</style>

      {/* Ambient glow orbs */}
      <div style={{position:"absolute",top:"15%",left:"8%",width:420,height:420,borderRadius:"50%",background:"radial-gradient(circle,rgba(124,92,252,0.1) 0%,transparent 70%)",pointerEvents:"none",animation:"lglow 4s ease infinite"}}/>
      <div style={{position:"absolute",bottom:"12%",right:"6%",width:350,height:350,borderRadius:"50%",background:"radial-gradient(circle,rgba(252,92,240,0.08) 0%,transparent 70%)",pointerEvents:"none",animation:"lglow 5s ease infinite 1.5s"}}/>

      {/* Floating butterflies */}
      {BG.map(function(b,i){ return <FloatB key={i} x={b.x} y={b.y} s={b.s} delay={b.d}/>; })}

      {/* Card */}
      <div style={{ width:"100%", maxWidth:420, position:"relative", zIndex:2, animation:"lfadeUp .5s ease both" }}>

        {/* Brand header */}
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:14, animation:"lbfloat 3s ease infinite" }}>
            <ButterflyLogo size={58}/>
          </div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:21, background:"linear-gradient(135deg,#eeeeff 30%,#c4b5fd 70%,#fc5cf0 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", lineHeight:1.1, marginBottom:4 }}>
            Manifesting Motivation
          </div>
          <div style={{ fontSize:11, color:"rgba(238,238,255,0.28)", fontWeight:500, letterSpacing:"0.06em" }}>
            Dream it. Build it. Live it. ✨
          </div>
        </div>

        {/* Glass card */}
        <div style={{
          background:"rgba(10,10,28,0.75)", backdropFilter:"blur(24px)",
          borderRadius:22, padding:"30px 28px",
          boxShadow:"0 24px 64px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,0.05)",
          border:"1px solid rgba(124,92,252,0.18)",
        }}>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:20, color:"#eeeeff", textAlign:"center", marginBottom:20, letterSpacing:"-.4px" }}>
            {mode === "login" ? "Welcome back 👋" : "Create your account ✨"}
          </h2>

          {/* Mode tabs */}
          <div style={{ display:"flex", borderBottom:"1px solid rgba(124,92,252,0.15)", marginBottom:22 }}>
            <button className="ltab" type="button" onClick={function(){ setMode("login"); setError(""); }}
              style={{ color:mode==="login"?"#a78bfa":"rgba(238,238,255,0.25)", borderBottomColor:mode==="login"?"#7c5cfc":"transparent" }}>
              Sign In
            </button>
            <button className="ltab" type="button" onClick={function(){ setMode("register"); setError(""); }}
              style={{ color:mode==="register"?"#a78bfa":"rgba(238,238,255,0.25)", borderBottomColor:mode==="register"?"#7c5cfc":"transparent" }}>
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:16 }} noValidate>
            {mode === "register" && (
              <div>
                <label className="llbl">Your Name</label>
                <input className="linp" type="text" placeholder="What should I call you?" value={name}
                  onChange={function(e){ setName(e.target.value); }} autoComplete="name"/>
              </div>
            )}

            <div>
              <label className="llbl">Email</label>
              <input className="linp" type="email" placeholder="your@email.com" value={email}
                onChange={function(e){ setEmail(e.target.value); }} autoComplete="email" required/>
            </div>

            <div>
              <label className="llbl">Password</label>
              <div style={{ position:"relative" }}>
                <input className="linp" type={showPw?"text":"password"} placeholder="••••••••" value={password}
                  onChange={function(e){ setPassword(e.target.value); }} autoComplete="current-password" required/>
                <button type="button" className="lpwbtn" onClick={function(){ setShowPw(function(v){ return !v; }); }}
                  style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:16, color:"rgba(238,238,255,0.35)", padding:2 }}>
                  {showPw ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.25)", borderRadius:11, padding:"10px 14px", fontSize:12, color:"#f87171", display:"flex", alignItems:"flex-start", gap:7 }}>
                <span style={{ flexShrink:0 }}>⚠️</span><span>{error}</span>
              </div>
            )}

            <button className="lsbtn" type="submit" disabled={loading}>
              {loading
                ? <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                    <span style={{ width:14, height:14, border:"2px solid rgba(255,255,255,0.3)", borderTopColor:"#fff", borderRadius:"50%", display:"inline-block", animation:"lspin .7s linear infinite" }}/> Please wait...
                  </span>
                : mode === "login" ? "Sign in →" : "Create account →"
              }
            </button>
            <style>{`@keyframes lspin{to{transform:rotate(360deg)}}`}</style>
          </form>

          {/* Toggle mode */}
          <p style={{ textAlign:"center", marginTop:14, fontSize:12, color:"rgba(238,238,255,0.25)" }}>
            {mode === "login" ? "New here? " : "Already have an account? "}
            <button type="button" onClick={function(){ setMode(mode==="login"?"register":"login"); setError(""); }}
              style={{ background:"none", border:"none", color:"#a78bfa", fontWeight:700, cursor:"pointer", fontSize:12, textDecoration:"underline" }}>
              {mode === "login" ? "Create a free account" : "Sign in"}
            </button>
          </p>

          {onBack && (
            <button onClick={onBack} className="lbackbtn"
              style={{ width:"100%", marginTop:10, padding:"9px", borderRadius:10, border:"1px solid rgba(255,255,255,0.08)", background:"transparent", color:"rgba(238,238,255,0.22)", fontSize:11, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", transition:"all 0.15s" }}>
              ← Back to home
            </button>
          )}
        </div>


      </div>
    </div>
  );
}

export default Login;

