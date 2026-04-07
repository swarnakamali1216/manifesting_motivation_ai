"""
routes/google.py — Google OAuth route
FIXED: Removed UserProfile import (table no longer exists — gamification lives on users table)
Place at: backend/routes/google.py
"""
from flask import Blueprint, request, jsonify, redirect
from models import SessionLocal, User
from sqlalchemy import text as sql_text
import os, requests as req
from datetime import datetime

google_bp = Blueprint("google", __name__)

GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI  = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:5000/api/auth/google/callback")


@google_bp.route("/auth/google/url", methods=["GET"])
def google_url():
    if not GOOGLE_CLIENT_ID:
        return jsonify({"error": "Google OAuth not configured"}), 500
    url = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={GOOGLE_CLIENT_ID}"
        f"&redirect_uri={GOOGLE_REDIRECT_URI}"
        "&response_type=code"
        "&scope=openid%20email%20profile"
        "&access_type=offline"
    )
    return jsonify({"url": url})


@google_bp.route("/auth/google/callback", methods=["GET", "POST"])
def google_callback():
    code = request.args.get("code") or (request.get_json() or {}).get("code")
    if not code:
        return jsonify({"error": "No code provided"}), 400

    db = SessionLocal()
    try:
        # Exchange code for tokens
        token_resp = req.post("https://oauth2.googleapis.com/token", data={
            "code":          code,
            "client_id":     GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri":  GOOGLE_REDIRECT_URI,
            "grant_type":    "authorization_code",
        }, timeout=10)
        token_data = token_resp.json()
        access_token = token_data.get("access_token")
        if not access_token:
            return jsonify({"error": "Token exchange failed", "detail": token_data}), 400

        # Get user info
        info_resp = req.get("https://www.googleapis.com/oauth2/v3/userinfo",
                            headers={"Authorization": f"Bearer {access_token}"}, timeout=10)
        info = info_resp.json()
        email     = info.get("email", "")
        name      = info.get("name", "")
        google_id = info.get("sub", "")

        if not email:
            return jsonify({"error": "Could not get email from Google"}), 400

        # Find or create user — no UserProfile, gamification is on users table directly
        row = db.execute(sql_text("SELECT id, name, email, role FROM users WHERE email=:e"), {"e": email}).fetchone()
        if row:
            uid = row[0]
            db.execute(sql_text("UPDATE users SET last_login=:t WHERE id=:uid"), {"t": datetime.utcnow(), "uid": uid})
            db.commit()
            user = {"id": uid, "name": row[1], "email": row[2], "role": row[3]}
        else:
            result = db.execute(sql_text(
                "INSERT INTO users (name, email, google_id, role, is_active, xp, level, current_streak, created_at) "
                "VALUES (:name, :email, :gid, 'user', TRUE, 0, 1, 0, NOW()) RETURNING id"
            ), {"name": name, "email": email, "gid": google_id}).fetchone()
            uid = result[0]
            db.commit()
            user = {"id": uid, "name": name, "email": email, "role": "user"}

        return jsonify({"success": True, "user": user})

    except Exception as e:
        try: db.rollback()
        except: pass
        print(f"[google] Error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()