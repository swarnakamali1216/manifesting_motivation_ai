content = '''from flask import Blueprint, request, jsonify
from models import SessionLocal
from sqlalchemy import text as sql_text
from groq import Groq
import os
from dotenv import load_dotenv
load_dotenv()

predictor_bp = Blueprint("predictor", __name__)

def get_groq():
    return Groq(api_key=os.getenv("GROQ_API_KEY"))

@predictor_bp.route("/predict/<int:user_id>", methods=["GET"])
def predict(user_id):
    db = SessionLocal()
    try:
        # Fetch ALL goals for user
        goals = db.execute(sql_text(
            "SELECT id, title, category, completed FROM goals WHERE user_id=:uid ORDER BY id DESC"
        ), {"uid": user_id}).fetchall()

        # FIX: Added WHERE user_id -- was missing before, fetched all users sessions
        sessions = db.execute(sql_text(
            "SELECT emotion FROM motivation_sessions WHERE user_id=:uid ORDER BY id DESC LIMIT 20"
        ), {"uid": user_id}).fetchall()

        journals = db.execute(sql_text(
            "SELECT mood FROM journal_entries WHERE user_id=:uid ORDER BY id DESC LIMIT 10"
        ), {"uid": user_id}).fetchall()

        checkins = db.execute(sql_text(
            "SELECT mood FROM check_ins WHERE user_id=:uid ORDER BY id DESC LIMIT 10"
        ), {"uid": user_id}).fetchall()

        if not goals:
            return jsonify({"predictions": [], "message": "No goals found. Add a goal to get predictions!"})

        # Count moods -- handle all mood variants not just positive/negative
        emotions   = [s[0] for s in sessions if s[0]]
        positive   = sum(1 for e in emotions if e in ("positive","happy","great","amazing","motivated","excited","calm","good"))
        negative   = sum(1 for e in emotions if e in ("negative","stressed","anxious","sad","awful","bad","angry","tired"))
        total      = len(emotions) or 1
        positivity = round((positive / total) * 100)

        journal_moods = [j[0] for j in journals if j[0]]
        j_positive    = sum(1 for m in journal_moods if m in ("positive","happy","great","amazing","good"))
        j_negative    = sum(1 for m in journal_moods if m in ("negative","sad","awful","bad","tough","stressed"))

        checkin_moods = [c[0] for c in checkins if c[0]]
        c_positive    = sum(1 for m in checkin_moods if m in ("amazing","happy","okay","good","great","motivated","calm","excited"))
        c_negative    = sum(1 for m in checkin_moods if m in ("sad","stressed","anxious","tired","bad","awful","angry"))

        # Combine all mood signals for better accuracy
        total_positive  = positive + j_positive + c_positive
        total_negative  = negative + j_negative + c_negative
        total_signals   = total_positive + total_negative or 1
        combined_pct    = round((total_positive / total_signals) * 100)

        active_goals = [g for g in goals if not bool(g[3])]

        # Streak bonus
        streak_bonus = 0
        try:
            streak_row  = db.execute(sql_text(
                "SELECT COUNT(DISTINCT DATE(created_at)) FROM check_ins WHERE user_id=:uid"
            ), {"uid": user_id}).fetchone()
            streak_days = streak_row[0] if streak_row else 0
            if streak_days >= 7:   streak_bonus = 15
            elif streak_days >= 3: streak_bonus = 8
            elif streak_days >= 1: streak_bonus = 3
        except Exception:
            pass

        predictions = []
        for goal in goals:
            goal_id      = goal[0]
            title        = goal[1]
            category     = goal[2] or "general"
            is_completed = bool(goal[3])

            if is_completed:
                likelihood = 100
                reason     = "You already completed this goal! Great work."
                tip        = "Set a new challenge to keep your momentum going."
            else:
                base = combined_pct

                if category in ("fitness", "health"):
                    base = min(base + 10, 95)
                elif category in ("learning", "education"):
                    base = min(base + 5, 95)

                if j_positive > j_negative:
                    base = min(base + 12, 95)
                if c_positive > c_negative:
                    base = min(base + 8, 95)
                if total_negative > total_positive:
                    base = max(base - 15, 20)

                base       = min(base + streak_bonus, 95)
                likelihood = max(30, min(int(base), 92))

                # Fallback tip in case AI fails
                tip    = "Break \'" + title + "\' into 3 smaller daily tasks to boost your success rate."
                reason = "Based on your " + str(combined_pct) + "% positive mood rate across " + str(total_signals) + " signals"

                try:
                    context = (
                        "Goal: \\"" + title + "\\" (category: " + category + ")\\n"
                        "Mood signals: " + str(combined_pct) + "% positive (" + str(total_signals) + " total)\\n"
                        "Sessions: " + str(positive) + " positive, " + str(negative) + " negative\\n"
                        "Journal: " + str(j_positive) + " positive, " + str(j_negative) + " negative\\n"
                        "Check-ins: " + str(c_positive) + " positive, " + str(c_negative) + " tough\\n"
                        "Streak bonus: +" + str(streak_bonus) + "%\\n"
                        "Predicted success likelihood: " + str(likelihood) + "%"
                    )
                    resp = get_groq().chat.completions.create(
                        model    = "llama-3.3-70b-versatile",
                        messages = [
                            {
                                "role":    "system",
                                "content": (
                                    "You are a goal success prediction coach. "
                                    "Give ONE specific actionable tip (1-2 sentences max) "
                                    "to help the user achieve their goal. "
                                    "Reference the goal title. Be direct and practical. "
                                    "Do not repeat the likelihood number."
                                )
                            },
                            {"role": "user", "content": context}
                        ],
                        max_tokens  = 80,
                        temperature = 0.7
                    )
                    ai_tip = resp.choices[0].message.content.strip()
                    if ai_tip and len(ai_tip) > 10:
                        tip    = ai_tip
                        reason = "Based on your " + str(combined_pct) + "% positive mood rate and " + str(len(active_goals)) + " active goals"
                except Exception as ai_err:
                    print("[predictor] AI tip error for goal " + str(goal_id) + ": " + str(ai_err))

            predictions.append({
                "goal_id":    goal_id,
                "title":      title,
                "category":   category,
                "completed":  is_completed,
                "likelihood": likelihood,
                "reason":     reason,
                "tip":        tip,
            })

        # Incomplete goals first, then by likelihood descending
        predictions.sort(key=lambda x: (x["completed"], -x["likelihood"]))

        return jsonify({
            "predictions":     predictions,
            "total_goals":     len(goals),
            "active_goals":    len(active_goals),
            "mood_positivity": combined_pct,
            "mood_signals":    total_signals,
        })

    except Exception as e:
        print("Predictor error: " + str(e))
        import traceback; traceback.print_exc()
        return jsonify({"predictions": [], "error": str(e)}), 500
    finally:
        db.close()
'''

with open("backend/routes/predictor.py", "w", encoding="utf-8") as f:
    f.write(content)

print("Done! Verifying...")
with open("backend/routes/predictor.py", encoding="utf-8") as f:
    check = f.read()

checks = [
    ("WHERE user_id=:uid" in check and "motivation_sessions" in check, "user_id filter on sessions"),
    ("check_ins" in check, "checkins mood data"),
    ("combined_pct" in check, "combined mood scoring"),
    ("streak_bonus" in check, "streak bonus"),
    ("predictions.sort" in check, "sorted results"),
    ("active_goals" in check, "active goals count"),
]
for ok, name in checks:
    print(("OK: " if ok else "ERROR: ") + name)