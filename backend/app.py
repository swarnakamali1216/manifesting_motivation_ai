"""
Manifesting Motivation AI — Backend
CHANGES FROM PREVIOUS VERSION:
  1. Explicit OPTIONS handler added — fixes CORS preflight on Render cold start
  2. after_request hook ensures CORS headers on EVERY response including errors
  3. /api/health now reports encryption status
  4. Auto warm-up thread unchanged
"""

import os
import threading
import time
from flask import Flask, jsonify, request, make_response
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)

# ── ALLOWED ORIGINS ────────────────────────────────────────────────────────────
_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://manifesting-motivation-ai.vercel.app",
]

CORS(app,
     origins=_ALLOWED_ORIGINS,
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])


# ── SAFETY NET: adds CORS headers to EVERY response (including errors) ────────
@app.after_request
def add_cors_headers(response):
    origin = request.headers.get("Origin", "")
    if origin in _ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"]      = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"]     = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"]     = "Content-Type, Authorization"
        response.headers["Access-Control-Max-Age"]           = "86400"
    return response


# ── EXPLICIT OPTIONS handler ──────────────────────────────────────────────────
# Render cold start (2-5s) means the first OPTIONS preflight gets no response
# and the browser blocks the real request with a CORS error.
# This route responds instantly with 204 + CORS headers, before any DB/Groq init.
@app.route("/<path:path>", methods=["OPTIONS"])
def handle_options(path):
    response = make_response("", 204)
    origin   = request.headers.get("Origin", "")
    if origin in _ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"]      = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"]     = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"]     = "Content-Type, Authorization"
        response.headers["Access-Control-Max-Age"]           = "86400"
    return response


# ── Blueprint loader ───────────────────────────────────────────────────────────
def _find_bp(module_path):
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


# ── Core routes ────────────────────────────────────────────────────────────────
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


# ── Utility routes ─────────────────────────────────────────────────────────────
_warmup_done = False


@app.route("/api/health", methods=["GET"])
def health():
    try:
        from encryption import is_encryption_enabled
        enc = is_encryption_enabled()
    except Exception:
        enc = False
    return jsonify({
        "status":      "ok",
        "pid":         os.getpid(),
        "groq_warmed": _warmup_done,
        "groq_model":  os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
        "encryption":  enc,
    }), 200


@app.route("/api/routes", methods=["GET"])
def list_routes():
    routes = [
        {
            "path":    r.rule,
            "methods": sorted([m for m in r.methods if m not in ["HEAD", "OPTIONS"]])
        }
        for r in app.url_map.iter_rules()
        if r.endpoint != "static"
    ]
    return jsonify(sorted(routes, key=lambda x: x["path"])), 200


# ── DB & VADER init ────────────────────────────────────────────────────────────
try:
    from models import Base, engine
    Base.metadata.create_all(bind=engine)
    print("✅ All tables created / verified")
except Exception as e:
    print(f"❌ DB init error: {e}")

try:
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
    _vader = SentimentIntensityAnalyzer()
    print("✅ VADER sentiment loaded")
except Exception as e:
    print(f"⚠️  VADER: {e}")

try:
    from encryption import is_encryption_enabled
    if is_encryption_enabled():
        print("✅ Journal encryption: AES-256-GCM active")
    else:
        print("⚠️  Journal encryption: disabled (set JOURNAL_ENCRYPTION_KEY to enable)")
except Exception as e:
    print(f"⚠️  Encryption module: {e}")


# ── Auto warm-up ──────────────────────────────────────────────────────────────
def _auto_warmup():
    global _warmup_done
    time.sleep(2)
    print("🔥 Starting Groq warm-up...")
    try:
        from groq_client import warmup_groq
        success      = warmup_groq()
        _warmup_done = success
        if success:
            print("✅ Groq warm-up complete — first user request will be fast!")
        else:
            print("⚠️  Groq warm-up failed — first request may be slightly slower")
    except Exception as e:
        print(f"⚠️  Warm-up error: {e}")


# ── Entry point ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    groq_key = os.getenv("GROQ_API_KEY")
    eleven   = os.getenv("ELEVENLABS_API_KEY")
    smtp     = os.getenv("SMTP_USER", "")
    enc_key  = os.getenv("JOURNAL_ENCRYPTION_KEY", "")

    print(f"""
=======================================================
  🦋  Manifesting Motivation AI — Backend Running!
  🌐  http://localhost:5000
  🤖  Groq:       {"✅" if groq_key else "❌"}  model: {os.getenv('GROQ_MODEL', 'llama-3.3-70b-versatile')}
  🎙️  ElevenLabs: {"✅" if eleven else "❌"}
  📧  SMTP:       {"✅ " + smtp[:28] if smtp else "❌  Not configured"}
  🔐  Encryption: {"✅ AES-256-GCM" if enc_key else "❌  Set JOURNAL_ENCRYPTION_KEY"}
  🗺️  Routes:     http://localhost:5000/api/routes
  ⚡  Cold start: Auto warm-up fires in 2s...
=======================================================
""")

    threading.Thread(target=_auto_warmup, daemon=True).start()
    app.run(host="0.0.0.0", port=5000, debug=False)