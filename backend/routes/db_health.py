from flask import Blueprint, request, jsonify
from models import SessionLocal
from sqlalchemy import text as sql_text

db_health_bp = Blueprint("db_health", __name__)


@db_health_bp.route("/db/health", methods=["GET"])
def db_health():
    db = SessionLocal()
    try:
        db.execute(sql_text("SELECT 1"))
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"status": "error", "detail": str(e)}), 500
    finally:
        db.close()


@db_health_bp.route("/db/make-admin", methods=["POST"])
def make_admin():
    data = request.get_json() or {}
    if data.get("secret") != "mm_admin_2026":
        return jsonify({"error": "unauthorized"}), 401
    email = data.get("email", "")
    db = SessionLocal()
    try:
        db.execute(sql_text("UPDATE users SET is_admin=TRUE WHERE email=:email"), {"email": email})
        db.commit()
        row = db.execute(sql_text("SELECT id, name, is_admin FROM users WHERE email=:email"), {"email": email}).fetchone()
        if not row:
            return jsonify({"error": "User not found"}), 404
        return jsonify({"success": True, "user": {"id": row[0], "name": row[1], "is_admin": row[2]}})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@db_health_bp.route("/db/set-admin/<path:email>", methods=["GET"])
def set_admin(email):
    db = SessionLocal()
    try:
        db.execute(sql_text("UPDATE users SET is_admin=TRUE WHERE email=:email"), {"email": email})
        db.commit()
        return jsonify({"success": True, "message": "Admin granted to " + email})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()