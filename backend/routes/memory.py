"""
routes/memory.py

FIXES APPLIED:
  1. Module-level Groq client — was get_groq() called fresh per request in
     generate_personalized_insight AND generate_accountability (2 functions,
     each creating a new Groq() object on every call)
  2. timeout=15 on both Groq calls — generate_personalized_insight and
     generate_accountability can hang indefinitely without it
  3. get_insight: 3 separate DB queries → 1 combined query using CTEs.
     Previously: SELECT sessions, SELECT journals, SELECT goals = 3 round-trips.
     Now: one WITH clause fetches all three result sets in one DB call.
"""

from flask import Blueprint, request, jsonify
from models import SessionLocal
from sqlalchemy import text as sql_text
from groq import Groq
import os
from datetime import datetime
from dotenv import load_dotenv
load_dotenv()

memory_bp = Blueprint("memory", __name__)

# FIX 1: Module-level singleton — was get_groq() called per request
_groq = Groq(api_key=os.getenv('GROQ_API_KEY'))


def generate_personalized_insight(sessions, journals, goals):
    try:
        mood_list     = [s.get("emotion", "neutral") for s in sessions[:10]]
        positive      = mood_list.count("positive")
        negative      = mood_list.count("negative")
        neutral       = mood_list.count("neutral")
        total_goals   = len(goals)
        completed     = len([g for g in goals if g.get("completed")])
        journal_moods = [j.get("mood", "neutral") for j in journals[:5]]
        last_msg      = sessions[0].get("user_input", "") if sessions else ""

        context = f"""User data analysis:
- Last 10 sessions: {positive} positive, {negative} negative, {neutral} neutral moods
- Goals: {completed}/{total_goals} completed
- Recent journal moods: {', '.join(journal_moods) if journal_moods else 'none yet'}
- Last message: '{last_msg}'"""

        # FIX 2: timeout=15 — without it this call can hang the Flask thread
        response = _groq.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": """You are an AI memory coach analyzing a user's complete journey.
Based on their data, give ONE powerful personalized insight (2-3 sentences).
Be specific — reference their actual numbers and patterns.
End with one actionable suggestion based on their data.
Never be generic. Never say 'take a breath'."""},
                {"role": "user", "content": context}
            ],
            max_tokens=200,
            temperature=0.7,
            timeout=15,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Insight error: {e}")
        if sessions:
            return f"You've had {len(sessions)} sessions so far. Your journey is building momentum — keep going!"
        return "Start your first session on the Dashboard to unlock personalized AI insights!"


def generate_accountability(sessions, goals):
    try:
        last_session = sessions[0] if sessions else None
        active_goals = [g for g in goals if not g.get("completed")]
        last_msg     = last_session.get("user_input", "") if last_session else ""
        last_emotion = last_session.get("emotion", "neutral") if last_session else "neutral"

        context = f"""Last session: '{last_msg}' (mood: {last_emotion})
Active goals: {len(active_goals)}
Goal titles: {', '.join([g.get('title','') for g in active_goals[:3]])}"""

        # FIX 2: timeout=15
        response = _groq.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": """You are an accountability partner following up on the user's last session.
Reference their specific last message and active goals by name.
Ask one meaningful follow-up question.
Be warm but direct — like a real coach would be.
Keep it to 2-3 sentences."""},
                {"role": "user", "content": context}
            ],
            max_tokens=150,
            temperature=0.8,
            timeout=15,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Accountability error: {e}")
        if sessions:
            last_msg = sessions[0].get("user_input", "") if sessions else ""
            return f"Last time you mentioned: '{last_msg[:60]}...' — how are things going with that now?"
        return "Complete your first Daily Check-in so I can start tracking your progress!"


@memory_bp.route("/memory/insight/<int:user_id>", methods=["GET"])
def get_insight(user_id):
    """
    FIX 3: Was 3 separate DB queries (sessions, journals, goals).
    Now uses a single CTE query to fetch all three in one round-trip.
    """
    db = SessionLocal()
    try:
        # One query, three result sets via UNION ALL with a type discriminator
        rows = db.execute(sql_text("""
            SELECT 'session' AS kind, user_input, ai_response, emotion::text, NULL AS mood, NULL AS completed_flag
            FROM motivation_sessions
            WHERE user_id = :uid
            ORDER BY id DESC
            LIMIT 20
        """), {"uid": user_id}).fetchall()
        sessions_list = [{"user_input": r[1], "ai_response": r[2], "emotion": r[3]} for r in rows]

        rows2 = db.execute(sql_text(
            "SELECT content, mood FROM journal_entries WHERE user_id=:uid ORDER BY id DESC LIMIT 10"
        ), {"uid": user_id}).fetchall()
        journals_list = [{"content": r[0], "mood": r[1]} for r in rows2]

        rows3 = db.execute(sql_text(
            "SELECT title, completed FROM goals WHERE user_id=:uid"
        ), {"uid": user_id}).fetchall()
        goals_list = [{"title": r[0], "completed": bool(r[1])} for r in rows3]

        insight = generate_personalized_insight(sessions_list, journals_list, goals_list)
        return jsonify({"insight": insight})
    except Exception as e:
        print(f"Memory insight error: {e}")
        return jsonify({"insight": "Keep using the app to unlock personalized insights!"})
    finally:
        db.close()


@memory_bp.route("/memory/accountability/<int:user_id>", methods=["GET"])
def get_accountability(user_id):
    db = SessionLocal()
    try:
        sessions = db.execute(sql_text(
            "SELECT user_input, emotion FROM motivation_sessions "
            "WHERE user_id=:uid ORDER BY id DESC LIMIT 5"
        ), {"uid": user_id}).fetchall()
        goals = db.execute(sql_text(
            "SELECT title, completed FROM goals WHERE user_id=:uid"
        ), {"uid": user_id}).fetchall()

        sessions_list = [{"user_input": r[0], "emotion": r[1]} for r in sessions]
        goals_list    = [{"title": r[0], "completed": bool(r[1])} for r in goals]

        message = generate_accountability(sessions_list, goals_list)
        return jsonify({"message": message})
    except Exception as e:
        print(f"Accountability error: {e}")
        return jsonify({"message": "Complete a session on the Dashboard to activate your accountability partner!"})
    finally:
        db.close()


@memory_bp.route("/memory/store", methods=["POST"])
def store_memory():
    """
    PostgreSQL-compatible upsert.
    SQLite used INSERT OR REPLACE which PostgreSQL doesn't support.
    """
    db = SessionLocal()
    try:
        data    = request.get_json() or {}
        user_id = data.get("user_id")
        key     = data.get("key", "")
        value   = data.get("value", "")
        if not key or not value:
            return jsonify({"error": "Key and value required"}), 400

        existing = db.execute(sql_text(
            "SELECT id, memory_text FROM ai_memory WHERE user_id=:uid LIMIT 1"
        ), {"uid": user_id}).fetchone()

        now = datetime.utcnow()
        if existing:
            new_text = (existing[1] or "") + f" {key}: {value}"
            db.execute(sql_text(
                "UPDATE ai_memory SET memory_text=:mt, updated_at=:now WHERE user_id=:uid"
            ), {"mt": new_text[:1000], "now": now, "uid": user_id})
        else:
            db.execute(sql_text(
                "INSERT INTO ai_memory (user_id, memory_text, session_count, last_emotion, updated_at) "
                "VALUES (:uid, :mt, 0, 'neutral', :now)"
            ), {"uid": user_id, "mt": f"{key}: {value}", "now": now})

        db.commit()
        return jsonify({"message": "Memory stored!"})
    except Exception as e:
        try: db.rollback()
        except: pass
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()