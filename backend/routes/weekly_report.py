from flask import Blueprint, request, jsonify
from models import SessionLocal
from sqlalchemy import text as sql_text
from groq import Groq
from datetime import datetime, timedelta
import os

report_bp = Blueprint("report", __name__)
def get_groq():
    return Groq(api_key=)

def safe(val, default=""):
    return default if val is None else str(val).strip()

@report_bp.route("/report/weekly", methods=["GET"])
def weekly_report():
    db = SessionLocal()
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id required"}), 400
    try:
        uid = int(user_id)
        week_ago = datetime.utcnow() - timedelta(days=7)
        today = datetime.utcnow()

        sessions = []
        try:
            sessions = db.execute(sql_text("SELECT user_input, ai_response, created_at FROM motivation_sessions WHERE user_id=:uid AND created_at >= :wa ORDER BY created_at ASC"), {"uid": uid, "wa": week_ago}).fetchall()
        except Exception: pass

        goals_all = []
        try:
            goals_all = db.execute(sql_text("SELECT title, category, completed, created_at FROM goals WHERE user_id=:uid ORDER BY id DESC"), {"uid": uid}).fetchall()
        except Exception: pass
        completed_goals = [g for g in goals_all if g[2]]
        active_goals = [g for g in goals_all if not g[2]]

        journals = []
        try:
            journals = db.execute(sql_text("SELECT content, mood_score, emotion, created_at FROM journal_entries WHERE user_id=:uid AND created_at >= :wa ORDER BY created_at ASC"), {"uid": uid, "wa": week_ago}).fetchall()
        except Exception: pass

        checkins = []
        try:
            checkins = db.execute(sql_text("SELECT mood, energy, created_at FROM daily_checkins WHERE user_id=:uid AND created_at >= :wa"), {"uid": uid, "wa": week_ago}).fetchall()
        except Exception: pass

        user_row = None
        try:
            user_row = db.execute(sql_text("SELECT name, xp, level, persona, current_streak FROM users WHERE id=:uid"), {"uid": uid}).fetchone()
        except Exception: pass

        user_name = safe(user_row[0], "there") if user_row else "there"
        user_xp = user_row[1] if user_row else 0
        user_level = user_row[2] if user_row else 1
        user_streak = user_row[4] if user_row else 0

        mood_scores = [j[1] for j in journals if j[1]]
        emotions = [j[2] for j in journals if j[2]]
        avg_mood = round(sum(mood_scores) / len(mood_scores), 1) if mood_scores else 5.0
        top_emotion = max(set(emotions), key=emotions.count) if emotions else "neutral"
        session_sample = [f'User said: "{safe(s[0])[:80]}"' for s in sessions[-4:] if s[0]]

        data_summary = f"""USER: {user_name} | Level {user_level} | {user_xp} XP | {user_streak}-day streak

THIS WEEK:
- AI coaching sessions: {len(sessions)}
- Journal entries: {len(journals)}  
- Daily check-ins: {len(checkins)}
- Goals completed: {len(completed_goals)}
- Active goals: {len(active_goals)}
- Average mood: {avg_mood}/10
- Dominant emotion: {top_emotion}

ACTIVE GOALS: {', '.join([safe(g[0]) for g in active_goals[:4]]) or 'None yet'}
COMPLETED GOALS: {', '.join([safe(g[0]) for g in completed_goals[:3]]) or 'None yet'}
RECENT CHATS: {' | '.join(session_sample) or 'No sessions this week'}"""

        prompt = (
            "You are a warm AI life coach writing a personalised weekly progress report.\n\n"
            + data_summary
            + "\n\nWrite a report with EXACTLY these 4 sections:\n\n"
            "## This Weeks Wins\n"
            "2-3 sentences celebrating accomplishments, reference their actual data.\n\n"
            "## Your Emotional Journey\n"
            "2-3 sentences on mood trends and patterns.\n\n"
            "## Honest Feedback\n"
            "2-3 sentences of kind constructive feedback.\n\n"
            "## Your Plan for Next Week\n"
            "3 specific actions tailored to their active goals.\n\n"
            + "Be warm and personal, use their name (" + user_name + "). Reference actual goals."
        )

        resp = get_groq().chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=600, temperature=0.75,
        )
        report_text = resp.choices[0].message.content.strip()

        try:
            db.execute(sql_text("CREATE TABLE IF NOT EXISTS weekly_reports (id SERIAL PRIMARY KEY, user_id INTEGER, report_text TEXT, week_start TEXT, created_at DATETIME)"))
            db.execute(sql_text("INSERT INTO weekly_reports (user_id, report_text, week_start, created_at) VALUES (:uid, :r, :ws, :now)"), {"uid": uid, "r": report_text, "ws": week_ago.date().isoformat(), "now": datetime.utcnow()})
            db.commit()
        except Exception: pass

        return jsonify({
            "report": report_text,
            "user_name": user_name,
            "week_start": week_ago.date().isoformat(),
            "week_end": today.date().isoformat(),
            "stats": {
                "sessions": len(sessions), "journals": len(journals),
                "checkins": len(checkins), "goals_completed": len(completed_goals),
                "goals_active": len(active_goals), "avg_mood": avg_mood,
                "top_emotion": top_emotion, "streak": user_streak,
                "xp": user_xp, "level": user_level,
            }
        })
    except Exception as e:
        print(f"Weekly report error: {e}")
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

@report_bp.route("/report/history", methods=["GET"])
def report_history():
    db = SessionLocal()
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify([])
    try:
        rows = db.execute(sql_text("SELECT id, report_text, week_start, created_at FROM weekly_reports WHERE user_id=:uid ORDER BY created_at DESC LIMIT 4"), {"uid": int(user_id)}).fetchall()
        return jsonify([{"id": r[0], "report": r[1], "week_start": str(r[2]), "created_at": str(r[3])} for r in rows])
    except Exception:
        return jsonify([])
    finally:
        db.close()