"""
routes/admin.py
FIXES:
  - /admin/sessions was missing (caused 404 + empty emotion charts)
  - /admin/retention was missing (caused 404)
  - emotion column handled safely even if vader_score column missing
"""
from flask import Blueprint, request, jsonify
from sqlalchemy import text as sql_text
from models import SessionLocal
from datetime import datetime, timedelta
import json

admin_bp = Blueprint("admin", __name__)


def safe_count(db, sql, params=None):
    try:
        return db.execute(sql_text(sql), params or {}).fetchone()[0] or 0
    except Exception:
        try: db.rollback()
        except: pass
        return 0


@admin_bp.route("/admin/stats", methods=["GET"])
def admin_stats():
    db = SessionLocal()
    try:
        week_ago        = datetime.utcnow() - timedelta(days=7)
        total_users     = safe_count(db, "SELECT COUNT(*) FROM users")
        total_goals     = safe_count(db, "SELECT COUNT(*) FROM goals")
        total_sessions  = safe_count(db, "SELECT COUNT(*) FROM motivation_sessions")
        total_journals  = safe_count(db, "SELECT COUNT(*) FROM journal_entries")
        total_checkins  = safe_count(db, "SELECT COUNT(*) FROM check_ins")
        completed_goals = safe_count(db, "SELECT COUNT(*) FROM goals WHERE completed=TRUE OR is_complete=TRUE")
        active_users    = safe_count(db, "SELECT COUNT(*) FROM users WHERE is_active=TRUE")
        new_users_week  = safe_count(db, "SELECT COUNT(*) FROM users WHERE created_at >= :w", {"w": week_ago})
        sessions_week   = safe_count(db, "SELECT COUNT(*) FROM motivation_sessions WHERE created_at >= :w", {"w": week_ago})
        total_xp        = safe_count(db, "SELECT COALESCE(SUM(xp),0) FROM users")
        pos_sessions    = safe_count(db, "SELECT COUNT(*) FROM motivation_sessions WHERE emotion IN ('positive','focused','hopeful','excited')")
        mood_pct        = round((pos_sessions / max(1, total_sessions)) * 100, 1)
        goal_pct        = round((completed_goals / max(1, total_goals)) * 100, 1)

        try:
            avg_streak = round(float(
                db.execute(sql_text("SELECT COALESCE(AVG(current_streak),0) FROM users")).fetchone()[0] or 0
            ), 1)
        except Exception:
            try: db.rollback()
            except: pass
            avg_streak = 0

        try:
            retained      = safe_count(db, "SELECT COUNT(DISTINCT user_id) FROM motivation_sessions WHERE created_at >= :w", {"w": week_ago})
            retention_pct = round((retained / max(1, active_users)) * 100, 1)
        except Exception:
            retention_pct = 0

        try:
            top_rows  = db.execute(sql_text(
                "SELECT id, name, email, xp, level, current_streak FROM users ORDER BY xp DESC LIMIT 5"
            )).fetchall()
            top_users = [{"id":r[0],"name":r[1],"email":r[2],"xp":r[3] or 0,"level":r[4] or 1,"streak":r[5] or 0} for r in top_rows]
        except Exception:
            try: db.rollback()
            except: pass
            top_users = []

        try:
            emo_rows = db.execute(sql_text(
                "SELECT emotion, COUNT(*) FROM motivation_sessions GROUP BY emotion ORDER BY COUNT(*) DESC"
            )).fetchall()
            emotions = [{"emotion": r[0] or "unknown", "count": r[1]} for r in emo_rows]
        except Exception:
            try: db.rollback()
            except: pass
            emotions = []

        return jsonify({
            "total_users": total_users, "active_users": active_users,
            "new_users_week": new_users_week, "total_goals": total_goals,
            "completed_goals": completed_goals, "total_sessions": total_sessions,
            "sessions_week": sessions_week, "total_journals": total_journals,
            "total_checkins": total_checkins, "total_xp": total_xp,
            "mood_pct": mood_pct, "goal_completion_pct": goal_pct,
            "avg_streak": avg_streak, "retention_pct": retention_pct,
            "top_users": top_users, "emotions": emotions,
        })
    except Exception as e:
        try: db.rollback()
        except: pass
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


# ✅ THIS WAS MISSING — caused "No emotion data" in admin charts
@admin_bp.route("/admin/sessions", methods=["GET"])
def admin_sessions():
    db = SessionLocal()
    try:
        limit  = int(request.args.get("limit", 500))
        offset = int(request.args.get("offset", 0))

        # Try with is_crisis column first, fall back without it
        try:
            rows = db.execute(sql_text("""
                SELECT id, user_id, emotion, is_crisis, created_at, persona, xp_earned
                FROM motivation_sessions
                ORDER BY created_at DESC
                LIMIT :lim OFFSET :off
            """), {"lim": limit, "off": offset}).fetchall()
            sessions = [{
                "id":        r[0],
                "user_id":   r[1],
                "emotion":   r[2] or "neutral",
                "is_crisis": bool(r[3]) if r[3] is not None else False,
                "created_at":str(r[4]) if r[4] else None,
                "persona":   r[5] or "general",
                "xp_earned": r[6] or 0,
            } for r in rows]
        except Exception:
            try: db.rollback()
            except: pass
            # Fallback: older schema without is_crisis / xp_earned
            rows = db.execute(sql_text("""
                SELECT id, user_id, emotion, created_at
                FROM motivation_sessions
                ORDER BY created_at DESC
                LIMIT :lim OFFSET :off
            """), {"lim": limit, "off": offset}).fetchall()
            sessions = [{
                "id":        r[0],
                "user_id":   r[1],
                "emotion":   r[2] or "neutral",
                "is_crisis": False,
                "created_at":str(r[3]) if r[3] else None,
                "persona":   "general",
                "xp_earned": 0,
            } for r in rows]

        return jsonify(sessions)
    except Exception as e:
        try: db.rollback()
        except: pass
        print(f"Admin sessions error: {e}")
        return jsonify([])
    finally:
        db.close()


@admin_bp.route("/admin/users", methods=["GET"])
def admin_users():
    db = SessionLocal()
    try:
        rows = db.execute(sql_text("""
            SELECT u.id, u.name, u.email, u.role, u.is_active,
                   u.xp, u.level, u.current_streak, u.created_at, u.last_login,
                   u.persona, u.badges,
                   COUNT(DISTINCT ms.id) AS sessions,
                   COUNT(DISTINCT g.id)  AS goals,
                   COUNT(DISTINCT je.id) AS journals
            FROM users u
            LEFT JOIN motivation_sessions ms ON ms.user_id = u.id
            LEFT JOIN goals g               ON g.user_id  = u.id
            LEFT JOIN journal_entries je    ON je.user_id = u.id
            GROUP BY u.id
            ORDER BY u.created_at DESC
        """)).fetchall()
        users = []
        for r in rows:
            try: badges = json.loads(r[11]) if r[11] else []
            except: badges = []
            users.append({
                "id": r[0], "name": r[1] or "Unknown", "email": r[2] or "",
                "role": r[3] or "user", "is_active": r[4],
                "xp": r[5] or 0, "level": r[6] or 1, "streak": r[7] or 0,
                "joined": str(r[8])[:10] if r[8] else "—",
                "last_login": str(r[9])[:10] if r[9] else "—",
                "persona": r[10] or "general", "badges": badges,
                "total_ai_sessions": r[12] or 0,
                "goals": r[13] or 0, "journals": r[14] or 0,
            })
        return jsonify(users)
    except Exception as e:
        try: db.rollback()
        except: pass
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@admin_bp.route("/admin/users/<int:uid>/toggle", methods=["POST"])
def toggle_user(uid):
    db = SessionLocal()
    try:
        row = db.execute(sql_text("SELECT is_active FROM users WHERE id=:uid"), {"uid": uid}).fetchone()
        if not row: return jsonify({"error": "User not found"}), 404
        new_val = not bool(row[0])
        db.execute(sql_text("UPDATE users SET is_active=:val WHERE id=:uid"), {"val": new_val, "uid": uid})
        db.commit()
        return jsonify({"success": True, "is_active": new_val})
    except Exception as e:
        try: db.rollback()
        except: pass
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@admin_bp.route("/admin/users/<int:uid>/make-admin", methods=["POST"])
def make_admin_route(uid):
    db = SessionLocal()
    try:
        db.execute(sql_text("UPDATE users SET role='admin' WHERE id=:uid"), {"uid": uid})
        db.commit()
        return jsonify({"success": True})
    except Exception as e:
        try: db.rollback()
        except: pass
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@admin_bp.route("/admin/users/<int:uid>/remove-admin", methods=["POST"])
def remove_admin_route(uid):
    db = SessionLocal()
    try:
        db.execute(sql_text("UPDATE users SET role='user' WHERE id=:uid"), {"uid": uid})
        db.commit()
        return jsonify({"success": True})
    except Exception as e:
        try: db.rollback()
        except: pass
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@admin_bp.route("/admin/activity", methods=["GET"])
def admin_activity():
    db = SessionLocal()
    try:
        rows = db.execute(sql_text("""
            SELECT DATE(created_at), COUNT(*), COUNT(DISTINCT user_id),
                   SUM(CASE WHEN emotion IN ('positive','focused','hopeful','excited') THEN 1 ELSE 0 END)
            FROM motivation_sessions
            WHERE created_at >= NOW() - INTERVAL '30 days'
            GROUP BY DATE(created_at) ORDER BY 1 ASC
        """)).fetchall()
        return jsonify([{
            "date": str(r[0]), "sessions": r[1], "users": r[2], "positive": r[3] or 0
        } for r in rows])
    except Exception as e:
        try: db.rollback()
        except: pass
        return jsonify([])
    finally:
        db.close()


# ✅ THIS WAS MISSING — caused 404 on Retention tab
@admin_bp.route("/admin/retention", methods=["GET"])
def admin_retention():
    db = SessionLocal()
    try:
        rows = db.execute(sql_text("""
            SELECT
                DATE_TRUNC('week', created_at) AS week,
                COUNT(DISTINCT user_id) AS active_users
            FROM motivation_sessions
            WHERE created_at >= NOW() - INTERVAL '8 weeks'
            GROUP BY 1 ORDER BY 1 ASC
        """)).fetchall()
        return jsonify([{"week": str(r[0])[:10], "active_users": r[1]} for r in rows])
    except Exception as e:
        try: db.rollback()
        except: pass
        return jsonify([])
    finally:
        db.close()


@admin_bp.route("/admin/export", methods=["GET"])
def admin_export():
    db = SessionLocal()
    try:
        week_ago = datetime.utcnow() - timedelta(days=7)
        return jsonify({
            "exported_at":    datetime.utcnow().isoformat(),
            "total_users":    safe_count(db, "SELECT COUNT(*) FROM users"),
            "active_users":   safe_count(db, "SELECT COUNT(*) FROM users WHERE is_active=TRUE"),
            "total_sessions": safe_count(db, "SELECT COUNT(*) FROM motivation_sessions"),
            "sessions_week":  safe_count(db, "SELECT COUNT(*) FROM motivation_sessions WHERE created_at >= :w", {"w": week_ago}),
            "total_goals":    safe_count(db, "SELECT COUNT(*) FROM goals"),
            "completed_goals":safe_count(db, "SELECT COUNT(*) FROM goals WHERE completed=TRUE OR is_complete=TRUE"),
            "total_xp":       safe_count(db, "SELECT COALESCE(SUM(xp),0) FROM users"),
            "crisis_count":   safe_count(db, "SELECT COUNT(*) FROM motivation_sessions WHERE emotion='crisis'"),
        })
    except Exception as e:
        try: db.rollback()
        except: pass
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()