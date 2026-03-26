"""
auth.py — Fixed Authentication
- Removed strict 12-char + special char password requirement
- Works with any password 6+ characters
- Uses bcrypt + PostgreSQL (real database)
"""

from flask import Blueprint, request, jsonify
from models import SessionLocal, User
from sqlalchemy import text as sql_text
import bcrypt
import jwt
import datetime
import os
import re
from dotenv import load_dotenv

load_dotenv()

auth_bp = Blueprint("auth", __name__)

SECRET_KEY = os.getenv("SECRET_KEY", "manifesting_motivation_secret_2024")

# ── Password helpers ──────────────────────────────────────────
def hash_password(password):
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def check_password(password, hashed):
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except Exception:
        return False

def validate_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email)) and len(email) <= 254

def create_token(user_id, email, name, role="user"):
    payload = {
        "user_id": user_id,
        "email":   email,
        "name":    name,
        "role":    role,
        "exp":     datetime.datetime.utcnow() + datetime.timedelta(days=30),
        "iat":     datetime.datetime.utcnow()
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def verify_token(token):
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except Exception:
        return None

def get_authenticated_user():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None, "Missing token"
    token = auth_header.split(" ")[1]
    payload = verify_token(token)
    if not payload:
        return None, "Invalid or expired token"
    return payload, None

# ── REGISTER ──────────────────────────────────────────────────
@auth_bp.route("/register", methods=["POST"])
def register():
    db = SessionLocal()
    try:
        data     = request.get_json() or {}
        name     = data.get("name", "").strip()
        email    = data.get("email", "").strip().lower()
        password = data.get("password", "")

        print(f"📝 Register attempt: {email}")

        if not email or not password:
            return jsonify({"error": "Email and password required"}), 400

        if not validate_email(email):
            return jsonify({"error": "Invalid email format"}), 400

        # ✅ SIMPLE: just 6 chars minimum — no special char requirement
        if len(password) < 6:
            return jsonify({"error": "Password must be at least 6 characters"}), 400

        if not name:
            name = email.split("@")[0].capitalize()

        # Check existing
        existing = db.execute(
            sql_text("SELECT id FROM users WHERE email=:e"),
            {"e": email}
        ).fetchone()
        if existing:
            return jsonify({"error": "Email already registered"}), 409

        # Create user
        hashed = hash_password(password)
        row = db.execute(sql_text("""
            INSERT INTO users (name, email, password_hash, role, xp, level, badges, onboarding_done)
            VALUES (:name, :email, :password_hash, 'user', 0, 1, '[]', false)
            RETURNING id
        """), {"name": name, "email": email, "password_hash": hashed}).fetchone()
        db.commit()

        user_id = row[0]
        token   = create_token(user_id, email, name, "user")

        print(f"✅ Registered: {email} (id={user_id})")
        return jsonify({
            "token": token,
            "user": {
                "id":    user_id,
                "name":  name,
                "email": email,
                "role":  "user",
                "xp":    0,
                "level": 1
            }
        }), 201

    except Exception as e:
        db.rollback()
        print(f"❌ Register error: {e}")
        import traceback; traceback.print_exc()
        return jsonify({"error": "Registration failed. Check Flask terminal."}), 500
    finally:
        db.close()

# ── LOGIN ─────────────────────────────────────────────────────
@auth_bp.route("/login", methods=["POST"])
def login():
    db = SessionLocal()
    try:
        data     = request.get_json() or {}
        email    = data.get("email", "").strip().lower()
        password = data.get("password", "")

        print(f"\n🔐 Login attempt: {email}")

        if not email or not password:
            return jsonify({"error": "Email and password required"}), 400

        # Find user
        row = db.execute(
            sql_text("SELECT id, name, email, password_hash, role, xp, level FROM users WHERE email=:e"),
            {"e": email}
        ).fetchone()

        if not row:
            print(f"❌ User not found: {email}")
            return jsonify({"error": "Invalid email or password"}), 401

        user_id, name, user_email, pw_hash, role, xp, level = row

        print(f"   Found user: {name} (id={user_id})")
        print(f"   Hash preview: {pw_hash[:20] if pw_hash else 'NONE'}...")

        if not pw_hash:
            print(f"❌ No password hash stored!")
            return jsonify({"error": "Account has no password. Please reset."}), 401

        if not check_password(password, pw_hash):
            print(f"❌ Wrong password for {email}")
            return jsonify({"error": "Invalid email or password"}), 401

        token = create_token(user_id, user_email, name, role or "user")

        print(f"✅ Login success: {email}")
        return jsonify({
            "token": token,
            "user": {
                "id":    user_id,
                "name":  name,
                "email": user_email,
                "role":  role or "user",
                "xp":    xp or 0,
                "level": level or 1
            }
        }), 200

    except Exception as e:
        print(f"❌ Login error: {e}")
        import traceback; traceback.print_exc()
        return jsonify({"error": "Login failed"}), 500
    finally:
        db.close()

# ── ME (get current user from token) ─────────────────────────
@auth_bp.route("/me", methods=["GET"])
def auth_me():
    payload, error = get_authenticated_user()
    if error:
        return jsonify({"error": error}), 401
    db = SessionLocal()
    try:
        row = db.execute(
            sql_text("SELECT id, name, email, role, xp, level FROM users WHERE id=:uid"),
            {"uid": payload["user_id"]}
        ).fetchone()
        if not row:
            return jsonify({"error": "User not found"}), 404
        return jsonify({
            "id": row[0], "name": row[1], "email": row[2],
            "role": row[3], "xp": row[4] or 0, "level": row[5] or 1
        }), 200
    finally:
        db.close()

# ── PROFILE ───────────────────────────────────────────────────
@auth_bp.route("/profile", methods=["GET"])
def get_profile():
    payload, error = get_authenticated_user()
    if error:
        return jsonify({"error": error}), 401
    db = SessionLocal()
    try:
        row = db.execute(
            sql_text("SELECT id, name, email, role, xp, level FROM users WHERE id=:uid"),
            {"uid": payload["user_id"]}
        ).fetchone()
        if not row:
            return jsonify({"error": "User not found"}), 404
        return jsonify({
            "id": row[0], "name": row[1], "email": row[2],
            "role": row[3], "xp": row[4] or 0, "level": row[5] or 1
        }), 200
    finally:
        db.close()

# ── UPDATE PROFILE ────────────────────────────────────────────
@auth_bp.route("/update-profile", methods=["PATCH"])
def update_profile():
    payload, error = get_authenticated_user()
    if error:
        return jsonify({"error": error}), 401
    db = SessionLocal()
    try:
        data = request.get_json() or {}
        name = data.get("name", "").strip()
        if name:
            db.execute(
                sql_text("UPDATE users SET name=:n WHERE id=:uid"),
                {"n": name, "uid": payload["user_id"]}
            )
            db.commit()
        return jsonify({"message": "Profile updated"}), 200
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

# ── REFRESH TOKEN ─────────────────────────────────────────────
@auth_bp.route("/refresh", methods=["POST"])
def refresh_token():
    payload, error = get_authenticated_user()
    if error:
        return jsonify({"error": error}), 401
    db = SessionLocal()
    try:
        row = db.execute(
            sql_text("SELECT id, name, email, role FROM users WHERE id=:uid"),
            {"uid": payload["user_id"]}
        ).fetchone()
        if not row:
            return jsonify({"error": "User not found"}), 404
        new_token = create_token(row[0], row[2], row[1], row[3])
        return jsonify({"token": new_token}), 200
    finally:
        db.close()

# ── CSRF TOKEN (dummy — for compatibility) ────────────────────
@auth_bp.route("/csrf-token", methods=["GET"])
def csrf_token():
    return jsonify({"csrf_token": "ok"}), 200

# ── PRIVACY WIPE ──────────────────────────────────────────────
@auth_bp.route("/privacy/wipe", methods=["POST"])
def wipe_user_data():
    payload, error = get_authenticated_user()
    if error:
        return jsonify({"error": error}), 401
    db = SessionLocal()
    try:
        uid = payload["user_id"]
        db.execute(sql_text("DELETE FROM journal_entries WHERE user_id=:uid"), {"uid": uid})
        db.execute(sql_text("DELETE FROM goals WHERE user_id=:uid"),           {"uid": uid})
        db.execute(sql_text("DELETE FROM check_ins WHERE user_id=:uid"),       {"uid": uid})
        db.execute(sql_text("DELETE FROM motivation_sessions WHERE user_id=:uid"), {"uid": uid})
        db.commit()
        return jsonify({"message": "All data wiped"}), 200
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()