"""
routes/db_health.py

ONE URL TO CHECK EVERYTHING:
Open this in your browser: http://localhost:5000/api/db/health

Shows you:
- Whether each table exists
- How many rows it has
- Whether critical columns exist
- Any errors

This answers your question: "how do I know if the database is working?"
Register in app.py:
  from routes.db_health import db_health_bp
  app.register_blueprint(db_health_bp, url_prefix="/api")
"""
from flask import Blueprint, jsonify
from models import SessionLocal
from sqlalchemy import text as sql_text

db_health_bp = Blueprint("db_health", __name__)

TABLES_TO_CHECK = [
    ("users",               "id, name, email, xp, level, current_streak, badges"),
    ("motivation_sessions", "id, user_id, user_input, ai_response, emotion, created_at"),
    ("goals",               "id, user_id, title, completed"),
    ("journal_entries",     "id, user_id, content, mood, mood_score, ai_insight, created_at"),
    ("check_ins",           "id, user_id, date, mood, energy"),
    ("invites",             "id, inviter_id, invited_email, status"),
]


@db_health_bp.route("/db/health", methods=["GET"])
def db_health():
    db = SessionLocal()
    results = {}
    overall_ok = True

    for table_name, columns in TABLES_TO_CHECK:
        info = {"exists": False, "row_count": 0, "columns_ok": False, "error": None}
        try:
            # Check existence + count
            count_row = db.execute(sql_text(f"SELECT COUNT(*) FROM {table_name}")).fetchone()
            info["exists"]    = True
            info["row_count"] = count_row[0] if count_row else 0

            # Check columns exist
            for col in columns.split(", "):
                db.execute(sql_text(f"SELECT {col} FROM {table_name} LIMIT 1"))
            info["columns_ok"] = True

        except Exception as e:
            info["error"] = str(e)
            overall_ok    = False
            try: db.rollback()
            except: pass

        results[table_name] = info

    # Extra: check user streaks
    streak_info = {}
    try:
        rows = db.execute(sql_text(
            "SELECT id, name, current_streak, xp FROM users LIMIT 5"
        )).fetchall()
        for r in rows:
            streak_info[r[1] or f"user_{r[0]}"] = {
                "streak": r[2] or 0,
                "xp":     r[3] or 0,
            }
    except Exception as e:
        streak_info["error"] = str(e)

    db.close()
    return jsonify({
        "status":       "OK ✅" if overall_ok else "ISSUES FOUND ❌",
        "overall_ok":   overall_ok,
        "tables":       results,
        "user_sample":  streak_info,
        "instructions": {
            "streak_is_0": "Streak 0 means check_ins table is empty. After today's fix, streak counts from AI sessions too. Or do a check-in on the home page.",
            "journal_mood_wrong": "Old entries stored as 'okay'. New entries after this fix will use VADER-detected mood.",
            "fix_old_entries": "Run: UPDATE journal_entries SET mood = CASE WHEN mood_score > 0.5 THEN 'positive' WHEN mood_score > 0.05 THEN 'hopeful' WHEN mood_score < -0.2 THEN 'sad' WHEN mood_score < -0.05 THEN 'stressed' ELSE 'neutral' END WHERE mood = 'okay' OR mood IS NULL;"
        }
    })


@db_health_bp.route("/db/fix-journal-moods", methods=["POST"])
def fix_journal_moods():
    """
    POST /api/db/fix-journal-moods
    Recalculates mood for all existing journal entries based on their stored mood_score.
    Run this once to fix all the old 'okay' entries.
    """
    db = SessionLocal()
    try:
        result = db.execute(sql_text("""
            UPDATE journal_entries
            SET mood = CASE
                WHEN mood_score >  0.5  THEN 'positive'
                WHEN mood_score >  0.2  THEN 'hopeful'
                WHEN mood_score >  0.05 THEN 'focused'
                WHEN mood_score >= -0.05 THEN 'neutral'
                WHEN mood_score >= -0.2  THEN 'stressed'
                WHEN mood_score >= -0.5  THEN 'sad'
                ELSE 'negative'
            END
            WHERE mood = 'okay' OR mood IS NULL OR mood = 'okay'
        """))
        db.commit()
        rows_fixed = result.rowcount
        return jsonify({
            "fixed": rows_fixed,
            "message": f"Fixed {rows_fixed} journal entries. Mood now derived from VADER score.",
            "status": "ok"
        })
    except Exception as e:
        try: db.rollback()
        except: pass
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@db_health_bp.route("/db/fix-streaks", methods=["POST"])
def fix_streaks():
    """
    POST /api/db/fix-streaks
    Recalculates current_streak for all users based on their AI session history.
    Run this once to fix all 0 streaks.
    """
    db = SessionLocal()
    try:
        users = db.execute(sql_text("SELECT id FROM users")).fetchall()
        fixed = 0
        for (uid,) in users:
            all_dates = []
            try:
                rows = db.execute(sql_text(
                    "SELECT DATE(created_at) FROM motivation_sessions WHERE user_id=:uid"
                ), {"uid": uid}).fetchall()
                all_dates.extend([str(r[0])[:10] for r in rows if r[0]])
            except Exception: pass
            try:
                rows = db.execute(sql_text(
                    "SELECT date FROM check_ins WHERE user_id=:uid"
                ), {"uid": uid}).fetchall()
                all_dates.extend([str(r[0])[:10] for r in rows if r[0]])
            except Exception: pass

            from datetime import date as dt, timedelta
            unique = sorted(set(all_dates), reverse=True)
            streak = 0
            if unique:
                today_s     = dt.today().isoformat()
                yesterday_s = (dt.today() - timedelta(days=1)).isoformat()
                if unique[0] in (today_s, yesterday_s):
                    current = dt.fromisoformat(unique[0])
                    for ds in unique:
                        d = dt.fromisoformat(ds)
                        if (current - d).days <= 1:
                            streak += 1
                            current = d - timedelta(days=1)
                        else:
                            break
            try:
                db.execute(sql_text(
                    "UPDATE users SET current_streak=:s WHERE id=:uid"
                ), {"s": streak, "uid": uid})
                fixed += 1
            except Exception: pass

        db.commit()
        return jsonify({"message": f"Fixed streaks for {fixed} users", "status": "ok"})
    except Exception as e:
        try: db.rollback()
        except: pass
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()