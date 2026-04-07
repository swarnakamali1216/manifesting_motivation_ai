import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router, Routes, Route, Navigate,
  useNavigate, useLocation
} from "react-router-dom";
import axios from "axios";

import Sidebar, { HamburgerButton, NotificationBell } from "./components/Sidebar";
import Login          from "./pages/Login";
import Home           from "./pages/Home";
import Goals          from "./pages/Goals";
import Journal        from "./pages/Journal";
import Badges         from "./pages/Badges";
import AIHistory      from "./pages/AIHistory";
import MyStory        from "./pages/MyStory";
import Settings       from "./pages/Settings";
import AdminDashboard from "./pages/AdminDashboard";
import CheckIn        from "./pages/CheckIn";
import LandingPage    from "./pages/LandingPage";
import Onboarding     from "./components/Onboarding";

var API = "https://manifesting-motivation-backend.onrender.com/api";
delete axios.defaults.headers.common["X-Requested-With"];

var PAGE_MAP = {
  home:"/", dashboard:"/",
  checkin:"/checkin","check-in":"/checkin",
  goals:"/goals", journal:"/journal",
  history:"/ai-history","ai-history":"/ai-history",
  mystory:"/my-story","my-story":"/my-story",story:"/my-story",
  badges:"/badges",gamification:"/badges",
  settings:"/settings",admin:"/admin",
};

// ─────────────────────────────────────────────────────────────────────────────
// AppInner — rendered inside <Router>
// ─────────────────────────────────────────────────────────────────────────────
function AppInner({ user, onLogout, darkMode, toggleTheme, onOnboardingComplete }) {
  var navigate = useNavigate();
  var location = useLocation();

  // ── REACTIVE isMobile — window.innerWidth read once causes hamburger to vanish ──
  var [isMobile,    setIsMobile]    = useState(window.innerWidth <= 768);
  var [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);

  useEffect(function() {
    function onResize() {
      var mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(true);   // desktop: always show
      else setSidebarOpen(false);           // mobile: hide on resize-to-small
    }
    window.addEventListener("resize", onResize);
    return function(){ window.removeEventListener("resize", onResize); };
  }, []);

  function handleNavigate(page) {
    navigate(PAGE_MAP[page] || "/");
    if (isMobile) setSidebarOpen(false);   // ← close on nav (mobile only)
  }

  var path = location.pathname;
  var activePage =
    path==="/checkin"    ? "checkin"    :
    path==="/goals"      ? "goals"      :
    path==="/journal"    ? "journal"    :
    path==="/ai-history" ? "ai-history" :
    path==="/my-story"   ? "my-story"   :
    path==="/badges"     ? "badges"     :
    path==="/settings"   ? "settings"   :
    path==="/admin"      ? "admin"      : "home";

  var needsOnboarding = user && !user.onboarding_done &&
    localStorage.getItem("onboarding_done") !== "true";

  if (needsOnboarding) {
    return (
      <Onboarding
        user={user}
        onComplete={function(){
          localStorage.setItem("onboarding_done","true");
          if (onOnboardingComplete) onOnboardingComplete();
        }}
      />
    );
  }

  return (
    <div style={{minHeight:"100vh", background:"var(--bg)", display:"flex", position:"relative"}}>

      {/* ── HAMBURGER — always rendered, CSS hides it on desktop ── */}
      <HamburgerButton
        isOpen={sidebarOpen}
        onClick={function(){ setSidebarOpen(function(prev){ return !prev; }); }}
      />
      {/* ── NOTIFICATION BELL — always visible, top-right ── */}
      <NotificationBell userId={user?.id} onNavigate={handleNavigate}/>

      {/* ── SIDEBAR ── */}
      <Sidebar
        isOpen={sidebarOpen}
        activePage={activePage}
        onNavigate={handleNavigate}
        onClose={function(){ setSidebarOpen(false); }}
        user={user}
        onLogout={onLogout}
        darkMode={darkMode}
        toggleTheme={toggleTheme}
      />

      {/* ── MAIN CONTENT ── */}
      <div style={{
        marginLeft: isMobile ? 0 : "230px",
        flex:1, minHeight:"100vh",
        transition:"margin-left 0.26s ease",
        width: isMobile ? "100%" : "calc(100% - 230px)",
      }}>
        {/* Spacer so content doesn't hide under hamburger on mobile */}
        {isMobile && <div style={{height:60}}/>}

        <main style={{padding:"24px 20px", maxWidth:"960px", width:"100%", margin:"0 auto", boxSizing:"border-box"}}>
          <Routes>
            <Route path="/"           element={<Home           user={user} onNavigate={handleNavigate}/>}/>
            <Route path="/checkin"    element={<CheckIn        user={user} onNavigate={handleNavigate}/>}/>
            <Route path="/goals"      element={<Goals          user={user}/>}/>
            <Route path="/journal"    element={<Journal        user={user}/>}/>
            <Route path="/ai-history" element={<AIHistory      user={user}/>}/>
            <Route path="/my-story"   element={<MyStory        user={user}/>}/>
            <Route path="/badges"     element={<Badges         user={user}/>}/>
            <Route path="/settings"   element={<Settings       user={user} darkMode={darkMode} toggleTheme={toggleTheme} onNavigate={handleNavigate}/>}/>
            <Route path="/admin"      element={<AdminDashboard user={user}/>}/>
            <Route path="*"           element={<Navigate to="/" replace/>}/>
          </Routes>
        </main>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root App
// ─────────────────────────────────────────────────────────────────────────────
function App() {
  var [user,       setUser]       = useState(null);
  var [loading,    setLoading]    = useState(true);
  var [showLanding,setShowLanding]= useState(false);
  var [showLogin,  setShowLogin]  = useState(false);
  var [darkMode,   setDarkMode]   = useState(function(){
    return localStorage.getItem("theme") !== "light";
  });

  // Apply theme
  useEffect(function() {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // Restore session from localStorage or token
  useEffect(function() {
    try {
      var s = localStorage.getItem("user");
      if (s) {
        var p = JSON.parse(s);
        if (p && p.id) { setUser(p); setLoading(false); return; }
      }
    } catch(e) { localStorage.removeItem("user"); }

    var token = localStorage.getItem("token");
    if (token) {
      axios.get(API+"/auth/me", {headers:{Authorization:"Bearer "+token}})
        .then(function(r){ setUser(r.data); localStorage.setItem("user",JSON.stringify(r.data)); })
        .catch(function(){ localStorage.removeItem("token"); localStorage.removeItem("user"); setShowLanding(true); })
        .finally(function(){ setLoading(false); });
    } else {
      setLoading(false);
      setShowLanding(true);
    }
  }, []); // eslint-disable-line

  function handleLoginSuccess(u) {
    setUser(u);
    setShowLanding(false);
    setShowLogin(false);
    localStorage.setItem("user", JSON.stringify(u));
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("onboarding_done");
    setUser(null);
    setShowLanding(true);
    setShowLogin(false);
  }

  function toggleTheme() {
    var next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("theme", next ? "dark" : "light");
    if (next) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
  }

  // Loading spinner
  if (loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"var(--bg,#f9f8fc)"}}>
      <div style={{width:38,height:38,borderRadius:"50%",border:"3px solid #e5e3f0",borderTopColor:"#7c5cfc",animation:"spin 0.8s linear infinite"}}/>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );

  if (showLogin && !user) {
    return (
      <>
        <style>{GLOBAL_CSS}</style>
        <Login onLoginSuccess={handleLoginSuccess} onBack={function(){ setShowLogin(false); setShowLanding(true); }}/>
      </>
    );
  }

  if (showLanding && !user) {
    return (
      <>
        <style>{GLOBAL_CSS}</style>
        <LandingPage
          onGetStarted={function(){ setShowLanding(false); setShowLogin(true); }}
          onLogin={function(){ setShowLanding(false); setShowLogin(true); }}
        />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <style>{GLOBAL_CSS}</style>
        <Login onLoginSuccess={handleLoginSuccess}/>
      </>
    );
  }

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <Router>
        <AppInner
          user={user}
          onLogout={handleLogout}
          darkMode={darkMode}
          toggleTheme={toggleTheme}
          onOnboardingComplete={function(){
            try {
              var u = JSON.parse(localStorage.getItem("user")||"{}");
              u.onboarding_done = true;
              localStorage.setItem("user", JSON.stringify(u));
              setUser(function(prev){ return {...prev, onboarding_done:true}; });
            } catch(e) {}
          }}
        />
      </Router>
    </>
  );
}

// ── Global CSS (dark/light theme variables) ───────────────────────────────────
var GLOBAL_CSS = `
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  html,body,#root { min-height:100vh; }
  :root {
    --bg:#f9f8fc; --surface:#fff; --card:#fff;
    --text:#1a1a2e; --text2:#6b6b7e; --muted:#9b9bad;
    --accent:#7c5cfc; --border:#e5e3f0;
  }
  html.dark {
    --bg:#05050f; --surface:#0c0c1d; --card:#0f0f20;
    --text:#eeeeff; --text2:#c4c4e0; --muted:#8080a8;
    --accent:#7c5cfc; --border:#1a1a35;
  }
  html.light {
    --bg:#f0eeff; --surface:#faf9ff; --card:#ffffff;
    --text:#18182e; --text2:#3a3a5a; --muted:#8080a8;
    --accent:#7c5cfc; --border:#e2dcff;
  }
  body { background:var(--bg); color:var(--text); font-family:'DM Sans',sans-serif; transition:background .3s,color .3s; }
  button,input,textarea,select { font-family:'DM Sans',sans-serif; }
  .btn-primary { display:inline-flex;align-items:center;justify-content:center;padding:10px 22px;border-radius:12px;border:none;background:linear-gradient(135deg,#7c5cfc,#fc5cf0);color:white!important;font-family:'Syne',sans-serif;font-weight:700;font-size:14px;cursor:pointer;box-shadow:0 4px 14px rgba(124,92,252,.35);transition:all .2s; }
  .btn-primary:hover { transform:translateY(-1px); }
  .btn-primary:disabled { opacity:.5;cursor:not-allowed;transform:none; }
  .input { width:100%;padding:11px 14px;border-radius:12px;border:1.5px solid var(--border);background:var(--card);color:var(--text);font-size:14px;outline:none;transition:border-color .2s; }
  .input:focus { border-color:var(--accent);box-shadow:0 0 0 3px rgba(124,92,252,.1); }
  .input::placeholder { color:var(--muted); }
  @media(max-width:768px){ main { padding:16px !important; } }
  ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:#d5cefc;border-radius:4px}
`;

export default App;
