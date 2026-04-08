from flask import Blueprint, request, jsonify
from models import SessionLocal
from sqlalchemy import text as sql_text
from groq import Groq
import os
from dotenv import load_dotenv
load_dotenv()

predictor_bp = Blueprint("predictor", __name__)
def get_groq():
    return Groq(api_key=os.getenv('GROQ_API_KEY'))

@predictor_bp.route("/predict/<int:user_id>", methods=["GET"])
def predict(user_id):
    db = SessionLocal()
    try:
        # Fetch goals using raw SQL to avoid ORM column issues
        goals = db.execute(sql_text(
            "SELECT id, title, category, completed FROM goals WHERE user_id=:uid"
        ), {"uid": user_id}).fetchall()

        # Fetch sessions
        sessions = db.execute(sql_text(
            "SELECT emotion FROM motivation_sessions ORDER BY id DESC LIMIT 20"
        )).fetchall()

        # Fetch journals
        journals = db.execute(sql_text(
            "SELECT mood FROM journal_entries WHERE user_id=:uid ORDER BY id DESC LIMIT 10"
        ), {"uid": user_id}).fetchall()

        if not goals:
            return jsonify({"predictions": [], "message": "No goals found"})

        # Count moods
        emotions     = [s[0] for s in sessions]
        positive     = emotions.count("positive")
        negative     = emotions.count("negative")
        total        = len(emotions) or 1
        positivity   = round((positive / total) * 100)

        journal_moods = [j[0] for j in journals]
        j_positive    = journal_moods.count("positive")
        j_negative    = journal_moods.count("negative")

        predictions = []
        for goal in goals:
            goal_id       = goal[0]
            title         = goal[1]
            category      = goal[2] or "general"
            is_completed  = bool(goal[3])

            if is_completed:
                likelihood = 100
                reason     = "You already completed this goal!"
                tip        = "Set a new challenge to keep your momentum going."
            else:
                # Calculate likelihood based on mood patterns
                base = positivity
                if category in ["fitness", "health"]:
                    base = min(base + 10, 95)
                if j_positive > j_negative:
                    base = min(base + 15, 95)
                if negative > positive:
                    base = max(base - 10, 20)
                likelihood = max(30, min(base, 92))

                # Generate AI tip
                try:
                    context = f"""Goal: "{title}" (category: {category})
User mood pattern: {positivity}% positive sessions
Journal: {j_positive} positive, {j_negative} negative entries
Predicted likelihood: {likelihood}%"""

                    resp = get_groq().chat.completions.create(
                        model    = "llama-3.3-70b-versatile",
                        messages = [
                            {
                                "role":    "system",
                                "content": """You are a goal prediction coach.
Give ONE specific, actionable tip (1-2 sentences) to help achieve this goal.
Reference the goal title specifically. Be direct and practical."""
                            },
                            {"role": "user", "content": context}
                        ],
                        max_tokens  = 80,
                        temperature = 0.7
                    )
                    tip    = resp.choices[0].message.content.strip()
                    reason = f"Based on your {positivity}% positive mood rate and {len(goals)} active goals"
                except Exception:
                    tip    = f"Break '{title}' into 3 smaller daily tasks to boost your success rate."
                    reason = f"Based on your recent mood patterns ({positivity}% positive)"

            predictions.append({
                "goal_id":    goal_id,
                "title":      title,
                "category":   category,
                "completed":  is_completed,
                "likelihood": likelihood,
                "reason":     reason,
                "tip":        tip
            })

        return jsonify({"predictions": predictions})

    except Exception as e:
        print(f"Predictor error: {e}")
        return jsonify({"predictions": [], "error": str(e)}), 500
    finally:
        db.close()