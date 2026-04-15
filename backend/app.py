"""
Manifesting Motivation AI — Backend
KEY FIX: admin_bp registered at /api (routes use /admin/... prefix internally)
         privacy_bp registered at /api/privacy (routes use /export etc)

CHANGES FROM ORIGINAL:
  1. groq_client is pre-initialized at startup (eliminates cold start)
  2. Auto warm-up thread fires 2s after Flask starts
  3. GROQ_MODEL env var supported (change model without code edits)
  4. /api/health now returns worker PID and warmup status for debugging
"""

import os
import threading
import time
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)

# -- CORS: single configuration only --------------------------
CORS(app,
     origins=[
         "http://localhost:3000",
         "http://127.0.0.1:3000",
         "https://manifesting-motivation-ai.vercel.app"
     ],
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])


# ---------------------------------------------------------------------------
# Blueprint loader (unchanged from original)
# ---------------------------------------------------------------------------
def _find_bp(module_path):
    """Auto-detect any Flask Blueprint in a module."""
    from flask import Blueprint as BP
    import importlib
    mod = importlib.import_module(module_path)
    for attr in dir(mod):
        obj = getattr(mod, attr)
        if isinstance(obj, BP):
            return obj
    return None


def load(name, module_path, bp_name, prefix):
    try:
        import importlib
        mod = importlib.import_module(module_path)
        bp  = getattr(mod, bp_name, None) or _find_bp(module_path)
        if bp is None:
            print(f"⚠️  {name}: no blueprint found in {module_path}")
            return
        app.register_blueprint(bp, url_prefix=prefix)
        print(f"✅ {name}")
    except Exception as e:
        print(f"⚠️  {name}: {e}")


# -- Core routes (ALL UNCHANGED) -----------------------------------------------
load("auth",              "routes.auth",             "auth_bp",           "/api/auth")
load("motivation",        "routes.motivation",        "motivation_bp",     "/api")
load("goals",             "routes.goals",             "goals_bp",          "/api")
load("journal",           "routes.journal",           "journal_bp",        "/api")
load("checkin",           "routes.checkin",           "checkin_bp",        "/api")
load("gamification",      "routes.gamification",      "gamification_bp",   "/api")
load("history",           "routes.history",           "history_bp",        "/api")
load("admin",             "routes.admin",             "admin_bp",          "/api")
load("invite",            "routes.invite",            "invite_bp",         "/api")
load("elevenlabs",        "routes.elevenlabs",        "elevenlabs_bp",     "/api")
load("memory",            "routes.memory",            "memory_bp",         "/api")
load("privacy",           "routes.privacy",           "privacy_bp",        "/api/privacy")
load("predictor",         "routes.predictor",         "predictor_bp",      "/api")
load("db_health",         "routes.db_health",         "db_health_bp",      "/api/db")
load("realtime",          "routes.realtime",          "realtime_bp",       "/api/realtime")
load("rag_resources",     "routes.rag_resources",     "rag_bp",            "/api/rag")
load("recursive_roadmap", "routes.recursive_roadmap", "recursive_bp",      "/api/recursive")
load("google",            "routes.google_auth",       "google_auth_bp",    "/api")
load("weekly_report",     "routes.weekly_report",     "weekly_report_bp",  "/api/report")
load("spaced_repetition", "routes.spaced_repetition", "spaced_bp",         "/api")
load("adaptive_goals",    "routes.adaptive_goals",    "adaptive_goals_bp", "/api")
load("safety",            "routes.safety",            "safety_bp",         "/api")


# ---------------------------------------------------------------------------
# Utility routes
# ---------------------------------------------------------------------------
_warmup_done = False   # tracked so /api/health can report status


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "pid": os.getpid(),
        "groq_warmed": _warmup_done,
        "groq_model": os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    }), 200


@app.route("/api/routes", methods=["GET"])
def list_routes():
    routes = [
        {
            "path": r.rule,
            "methods": sorted([m for m in r.methods if m not in ["HEAD", "OPTIONS"]])
        }
        for r in app.url_map.iter_rules()
        if r.endpoint != "static"
    ]
    return jsonify(sorted(routes, key=lambda x: x["path"])), 200


# ---------------------------------------------------------------------------
# DB & VADER init (unchanged)
# ---------------------------------------------------------------------------
try:
    from models import Base, engine
    Base.metadata.create_all(bind=engine)
    print("✅ All tables created / verified")
except Exception as e:
    print(f"❌ DB init error: {e}")

try:
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
    _vader = SentimentIntensityAnalyzer()   # keep reference — pre-loads the lexicon
    print("✅ VADER sentiment loaded")
except Exception as e:
    print(f"⚠️  VADER: {e}")


# ---------------------------------------------------------------------------
# Auto warm-up — fires in background 2s after Flask starts
# Eliminates cold-start delay for the very first real user request
# ---------------------------------------------------------------------------
def _auto_warmup():
    """
    Runs in a daemon thread after startup.
    1. Pre-warms the Groq TCP connection (the main cold-start cause)
    2. No login needed — hits Groq directly via the shared client
    """
    global _warmup_done
    time.sleep(2)   # wait for Flask to fully bind and be ready

    print("🔥 Starting Groq warm-up...")
    try:
        from groq_client import warmup_groq
        success = warmup_groq()
        _warmup_done = success
        if success:
            print("✅ Groq warm-up complete — first user request will be fast!")
        else:
            print("⚠️  Groq warm-up failed — first request may be slightly slower")
    except Exception as e:
        print(f"⚠️  Warm-up error: {e}")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    groq_key = os.getenv("GROQ_API_KEY")
    eleven   = os.getenv("ELEVENLABS_API_KEY")
    smtp     = os.getenv("SMTP_USER", "")

    groq_status  = "✅" if groq_key  else "❌"
    eleven_status = "✅" if eleven else "❌"

    print(f"""
=======================================================
  🦋  Manifesting Motivation AI — Backend Running!
  🌐  http://localhost:5000
  🤖  Groq:       {groq_status}  model: {os.getenv('GROQ_MODEL', 'llama-3.3-70b-versatile')}
  🎙️  ElevenLabs: {eleven_status}
  📧  SMTP:       {"✅ " + smtp[:28] if smtp else "❌  Not configured"}
  🗺️  Routes:     http://localhost:5000/api/routes
  ⚡  Cold start: Auto warm-up will fire in 2s...
=======================================================
""")

    # Start warm-up thread BEFORE app.run so it fires as soon as Flask is ready
    threading.Thread(target=_auto_warmup, daemon=True).start()

    app.run(host="0.0.0.0", port=5000, debug=False)