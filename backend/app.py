"""
Manifesting Motivation AI — Backend
KEY FIX: admin_bp registered at /api (routes use /admin/... prefix internally)
         privacy_bp registered at /api/privacy (routes use /export etc)
"""
import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)

CORS(app,
     origins=["http://localhost:3000","http://127.0.0.1:3000"],
     supports_credentials=True,
     allow_headers=["Content-Type","Authorization"],
     methods=["GET","POST","PUT","PATCH","DELETE","OPTIONS"])

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

# ── Core routes ───────────────────────────────────────────────
load("auth",              "routes.auth",             "auth_bp",          "/api/auth")
load("motivation",        "routes.motivation",        "motivation_bp",    "/api")
load("goals",             "routes.goals",             "goals_bp",         "/api")
load("journal",           "routes.journal",           "journal_bp",       "/api")
load("checkin",           "routes.checkin",           "checkin_bp",       "/api")
load("gamification",      "routes.gamification",      "gamification_bp",  "/api")
load("history",           "routes.history",           "history_bp",       "/api")
# ✅ FIX: admin registered at /api so @admin_bp.route("/admin/users") → GET /api/admin/users ✓
load("admin",             "routes.admin",             "admin_bp",         "/api")
load("invite",            "routes.invite",            "invite_bp",        "/api")
load("elevenlabs",        "routes.elevenlabs",        "elevenlabs_bp",    "/api")
load("memory",            "routes.memory",            "memory_bp",        "/api")
# ✅ FIX: privacy registered at /api/privacy so @privacy_bp.route("/export") → GET /api/privacy/export ✓
load("privacy",           "routes.privacy",           "privacy_bp",       "/api/privacy")
load("predictor",         "routes.predictor",         "predictor_bp",     "/api")
load("db_health",         "routes.db_health",         "db_health_bp",     "/api/db")
load("realtime",          "routes.realtime",          "realtime_bp",      "/api/realtime")
load("rag_resources",     "routes.rag_resources",     "rag_bp",           "/api/rag")
load("recursive_roadmap", "routes.recursive_roadmap", "recursive_bp",     "/api/recursive")
load("google",            "routes.google_auth",       "google_auth_bp",   "/api")
# ✅ Auto-detect blueprint names for these (fixes 4 warnings)
load("weekly_report",     "routes.weekly_report",     "weekly_report_bp", "/api/report")
load("spaced_repetition", "routes.spaced_repetition", "spaced_bp",        "/api")
load("adaptive_goals",    "routes.adaptive_goals",    "adaptive_goals_bp","/api")
load("safety",            "routes.safety",            "safety_bp",        "/api")

# ── Utility routes ────────────────────────────────────────────
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status":"ok"}), 200

@app.route("/api/routes", methods=["GET"])
def list_routes():
    routes = [{"path":r.rule,"methods":sorted([m for m in r.methods if m not in ["HEAD","OPTIONS"]])}
              for r in app.url_map.iter_rules() if r.endpoint != "static"]
    return jsonify(sorted(routes, key=lambda x: x["path"])), 200

# ── DB & VADER init ───────────────────────────────────────────
try:
    from models import Base, engine
    Base.metadata.create_all(bind=engine)
    print("✅ All tables created / verified")
except Exception as e:
    print(f"❌ DB init error: {e}")

try:
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
    SentimentIntensityAnalyzer()
    print("✅ VADER sentiment loaded")
except Exception as e:
    print(f"⚠️  VADER: {e}")

if __name__ == "__main__":
    groq   = "✅" if os.getenv("GROQ_API_KEY")      else "❌"
    eleven = "✅" if os.getenv("ELEVENLABS_API_KEY") else "❌"
    smtp   = os.getenv("SMTP_USER","")
    print(f"""
=======================================================
  ✅  Manifesting Motivation AI — Backend Running!
  🌐  http://localhost:5000
  🔑  Groq:       {groq}
  🔊  ElevenLabs: {eleven}
  📧  SMTP:       {"✅ " + smtp[:28] if smtp else "⚠️  Not configured"}
  📋  Routes:     http://localhost:5000/api/routes
=======================================================
""")
    app.run(host="0.0.0.0", port=5000, debug=False)