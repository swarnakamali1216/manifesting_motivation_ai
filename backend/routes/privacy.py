"""
routes/privacy.py
Registered at /api/privacy → routes become:
  GET  /api/privacy/export?user_id=X
  GET  /api/privacy/stats?user_id=X
  DELETE /api/privacy/delete-account
"""
from flask import Blueprint, request, jsonify
from models import SessionLocal
from sqlalchemy import text as sql_text
from datetime import datetime

privacy_bp = Blueprint("privacy", __name__)


def _uid():
    uid = request.args.get("user_id") or (request.get_json(silent=True) or {}).get("user_id")
    if uid:
        return int(uid)
    return None


@privacy_bp.route("/export", methods=["GET"])
def export_user_data():
    uid = _uid()
    if not uid:
        return jsonify({"error": "user_id required"}), 400
    db = SessionLocal()
    try:
        user_row = db.execute(sql_text(
            "SELECT id,name,email,xp,level,current_streak,created_at FROM users WHERE id=:uid"
        ), {"uid": uid}).fetchone()
        if not user_row:
            return jsonify({"error": "User not found"}), 404

        def rows(sql, p=None):
            try: return db.execute(sql_text(sql), p or {}).fetchall()
            except: db.rollback(); return []

        goals = [{"id":r[0],"title":r[1],"category":r[2],"completed":bool(r[3]),"created_at":str(r[4])}
                 for r in rows("SELECT id,title,category,is_complete,created_at FROM goals WHERE user_id=:u ORDER BY created_at DESC",{"u":uid})]

        journals = [{"id":r[0],"mood":r[1],"created_at":str(r[2])}
                    for r in rows("SELECT id,mood,created_at FROM journal_entries WHERE user_id=:u ORDER BY created_at DESC",{"u":uid})]

        checkins = [{"id":r[0],"mood":r[1],"created_at":str(r[2])}
                    for r in rows("SELECT id,mood,created_at FROM check_ins WHERE user_id=:u ORDER BY created_at DESC",{"u":uid})]

        sessions = [{"id":r[0],"emotion":r[1],"created_at":str(r[2])}
                    for r in rows("SELECT id,emotion,created_at FROM motivation_sessions WHERE user_id=:u ORDER BY created_at DESC LIMIT 500",{"u":uid})]

        return jsonify({
            "exported_at": datetime.utcnow().isoformat()+"Z",
            "user": {
                "id":user_row[0],"name":user_row[1],"email":user_row[2],
                "xp":user_row[3],"level":user_row[4],"streak":user_row[5],
                "member_since":str(user_row[6])
            },
            "goals": goals,
            "journals": journals,
            "checkins": checkins,
            "ai_sessions": sessions,
            "summary": {
                "goals":len(goals),"journals":len(journals),
                "checkins":len(checkins),"sessions":len(sessions)
            },
        })
    except Exception as e:
        try: db.rollback()
        except: pass
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@privacy_bp.route("/stats", methods=["GET"])
def privacy_stats():
    uid = _uid()
    if not uid:
        return jsonify({"error": "user_id required"}), 400
    db = SessionLocal()
    try:
        def sc(sql, p=None):
            try: return db.execute(sql_text(sql), p or {}).fetchone()[0] or 0
            except: db.rollback(); return 0
        return jsonify({
            "goals":    sc("SELECT COUNT(*) FROM goals WHERE user_id=:u", {"u":uid}),
            "journals": sc("SELECT COUNT(*) FROM journal_entries WHERE user_id=:u", {"u":uid}),
            "checkins": sc("SELECT COUNT(*) FROM check_ins WHERE user_id=:u", {"u":uid}),
            "sessions": sc("SELECT COUNT(*) FROM motivation_sessions WHERE user_id=:u", {"u":uid}),
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@privacy_bp.route("/delete-account", methods=["DELETE"])
def delete_account():
    uid = _uid()
    if not uid:
        return jsonify({"error": "user_id required"}), 400
    db = SessionLocal()
    try:
        for tbl in ["journal_entries","goals","check_ins","motivation_sessions","ai_memory"]:
            try: db.execute(sql_text(f"DELETE FROM {tbl} WHERE user_id=:u"),{"u":uid})
            except: db.rollback()
        try: db.execute(sql_text("DELETE FROM users WHERE id=:u"),{"u":uid})
        except: db.rollback()
        db.commit()
        return jsonify({"message": "Account deleted"}), 200
    except Exception as e:
        try: db.rollback()
        except: pass
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()