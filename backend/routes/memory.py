from flask import Blueprint, request, jsonify
from models import SessionLocal
from sqlalchemy import text as sql_text
from groq import Groq
import os
from dotenv import load_dotenv
load_dotenv()

memory_bp = Blueprint("memory", __name__)
client    = Groq(api_key=os.getenv("GROQ_API_KEY"))

def generate_personalized_insight(sessions, journals, goals):
    try:
        # Build context from real user data
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

        response = client.chat.completions.create(
            model    = "llama-3.3-70b-versatile",
            messages = [
                {
                    "role":    "system",
                    "content": """You are an AI memory coach analyzing a user's complete journey.
Based on their data, give ONE powerful personalized insight (2-3 sentences).
Be specific — reference their actual numbers and patterns.
End with one actionable suggestion based on their data.
Never be generic. Never say 'take a breath'."""
                },
                {
                    "role":    "user",
                    "content": context
                }
            ],
            max_tokens  = 200,
            temperature = 0.7
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Insight error: {e}")
        if sessions:
            return f"You've had {len(sessions)} sessions so far. Your journey is building momentum — keep going!"
        return "Start your first session on the Dashboard to unlock personalized AI insights!"

def generate_accountability(sessions, goals):
    try:
        last_session  = sessions[0] if sessions else None
        active_goals  = [g for g in goals if not g.get("completed")]
        last_msg      = last_session.get("user_input", "") if last_session else ""
        last_emotion  = last_session.get("emotion", "neutral") if last_session else "neutral"

        context = f"""Last session: '{last_msg}' (mood: {last_emotion})
Active goals: {len(active_goals)}
Goal titles: {', '.join([g.get('title','') for g in active_goals[:3]])}"""

        response = client.chat.completions.create(
            model    = "llama-3.3-70b-versatile",
            messages = [
                {
                    "role":    "system",
                    "content": """You are an accountability partner following up on the user's last session.
Reference their specific last message and active goals by name.
Ask one meaningful follow-up question.
Be warm but direct — like a real coach would be.
Keep it to 2-3 sentences."""
                },
                {
                    "role":    "user",
                    "content": context
                }
            ],
            max_tokens  = 150,
            temperature = 0.8
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Accountability error: {e}")
        if last_session:
            return f"Last time you mentioned: '{last_msg[:60]}...' — how are things going with that now?"
        return "Complete your first Daily Check-in so I can start tracking your progress!"

@memory_bp.route("/memory/insight/<int:user_id>", methods=["GET"])
def get_insight(user_id):
    db = SessionLocal()
    try:
        sessions = db.execute(sql_text(
            "SELECT user_input, ai_response, emotion, created_at FROM motivation_sessions ORDER BY id DESC LIMIT 20"
        )).fetchall()
        journals = db.execute(sql_text(
            "SELECT content, mood FROM journal_entries WHERE user_id=:uid ORDER BY id DESC LIMIT 10"
        ), {"uid": user_id}).fetchall()
        goals = db.execute(sql_text(
            "SELECT title, completed FROM goals WHERE user_id=:uid"
        ), {"uid": user_id}).fetchall()

        sessions_list = [{"user_input": r[0], "ai_response": r[1], "emotion": r[2]} for r in sessions]
        journals_list = [{"content": r[0], "mood": r[1]} for r in journals]
        goals_list    = [{"title": r[0], "completed": bool(r[1])} for r in goals]

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
            "SELECT user_input, emotion FROM motivation_sessions ORDER BY id DESC LIMIT 5"
        )).fetchall()
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
    db = SessionLocal()
    try:
        data    = request.get_json()
        user_id = data.get("user_id")
        key     = data.get("key", "")
        value   = data.get("value", "")
        if not key or not value:
            return jsonify({"error": "Key and value required"}), 400
        db.execute(sql_text(
            "INSERT OR REPLACE INTO ai_memory (user_id, memory_key, memory_value) VALUES (:uid, :key, :val)"
        ), {"uid": user_id, "key": key, "val": value})
        db.commit()
        return jsonify({"message": "Memory stored!"})
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()