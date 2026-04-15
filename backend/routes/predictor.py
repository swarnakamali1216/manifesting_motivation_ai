from flask import Blueprint, request, jsonify
from models import SessionLocal
from sqlalchemy import text as sql_text
from groq_client import get_groq_client   # ← CHANGED: shared pool
import os
from dotenv import load_dotenv
load_dotenv()

predictor_bp = Blueprint("predictor", __name__)


@predictor_bp.route("/predict/<int:user_id>", methods=["GET"])
def predict(user_id):
    db = SessionLocal()
    try:
        goals = db.execute(sql_text(
            "SELECT id, title, category, completed FROM goals WHERE user_id=:uid ORDER BY id DESC"
        ), {"uid": user_id}).fetchall()

        sessions = db.execute(sql_text(
            "SELECT emotion FROM motivation_sessions WHERE user_id=:uid ORDER BY id DESC LIMIT 20"
        ), {"uid": user_id}).fetchall()

        journals = db.execute(sql_text(
            "SELECT mood FROM journal_entries WHERE user_id=:uid ORDER BY id DESC LIMIT 10"
        ), {"uid": user_id}).fetchall()

        checkins = db.execute(sql_text(
            "SELECT mood FROM check_ins WHERE user_id=:uid ORDER BY id DESC LIMIT 10"
        ), {"uid": user_id}).fetchall()

        print("[predictor] user=" + str(user_id) + " goals=" + str(len(goals)))

        if not goals:
            return jsonify({"predictions": [], "message": "No goals found. Add a goal to get predictions!"})

        emotions  = [s[0] for s in sessions if s[0]]
        positive  = sum(1 for e in emotions if e in ("positive","happy","great","amazing","motivated","excited","calm","good"))
        negative  = sum(1 for e in emotions if e in ("negative","stressed","anxious","sad","awful","bad","angry","tired"))

        jmoods = [j[0] for j in journals if j[0]]
        j_pos  = sum(1 for m in jmoods if m in ("positive","happy","great","amazing","good"))
        j_neg  = sum(1 for m in jmoods if m in ("negative","sad","awful","bad","tough","stressed"))

        cmoods = [c[0] for c in checkins if c[0]]
        c_pos  = sum(1 for m in cmoods if m in ("amazing","happy","okay","good","great","motivated","calm","excited"))
        c_neg  = sum(1 for m in cmoods if m in ("sad","stressed","anxious","tired","bad","awful","angry"))

        tot_pos = positive + j_pos + c_pos
        tot_neg = negative + j_neg + c_neg
        signals = tot_pos + tot_neg or 1
        pct     = round((tot_pos / signals) * 100)

        print("[predictor] mood pct=" + str(pct) + " signals=" + str(signals))

        streak_bonus = 0
        try:
            row  = db.execute(sql_text(
                "SELECT COUNT(DISTINCT DATE(created_at)) FROM check_ins WHERE user_id=:uid"
            ), {"uid": user_id}).fetchone()
            days = row[0] if row else 0
            if days >= 7:   streak_bonus = 15
            elif days >= 3: streak_bonus = 8
            elif days >= 1: streak_bonus = 3
        except Exception as se:
            print("[predictor] streak error: " + str(se))

        active_goals = [g for g in goals if not bool(g[3])]
        predictions  = []

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
                base = pct
                if category in ("fitness", "health"):
                    base = min(base + 10, 95)
                elif category in ("learning", "education"):
                    base = min(base + 5, 95)
                if j_pos > j_neg:
                    base = min(base + 12, 95)
                if c_pos > c_neg:
                    base = min(base + 8, 95)
                if tot_neg > tot_pos:
                    base = max(base - 15, 20)
                base       = min(base + streak_bonus, 95)
                likelihood = max(30, min(int(base), 92))
                tip        = "Break your goal into 3 smaller daily tasks to boost your success rate."
                reason     = "Based on your " + str(pct) + "% positive mood rate across " + str(signals) + " signals"

                # CHANGED: get_groq_client() — reuses shared connection pool
                try:
                    client  = get_groq_client()
                    context = (
                        "Goal: \"" + title + "\" category=" + category + "\n"
                        "Mood: " + str(pct) + "% positive (" + str(signals) + " signals)\n"
                        "Likelihood: " + str(likelihood) + "%"
                    )
                    resp = client.chat.completions.create(
                        model="llama-3.3-70b-versatile",
                        messages=[
                            {"role": "system", "content": "Give ONE actionable tip (1-2 sentences) to help achieve this specific goal. Be direct."},
                            {"role": "user",   "content": context}
                        ],
                        max_tokens=80, temperature=0.7
                    )
                    ai_tip = resp.choices[0].message.content.strip()
                    if ai_tip and len(ai_tip) > 10:
                        tip    = ai_tip
                        reason = "Based on your " + str(pct) + "% positive mood and " + str(len(active_goals)) + " active goals"
                except Exception as ae:
                    print("[predictor] AI tip skipped: " + str(ae))

            predictions.append({
                "goal_id":    goal_id,
                "title":      title,
                "category":   category,
                "completed":  is_completed,
                "likelihood": likelihood,
                "reason":     reason,
                "tip":        tip,
            })

        predictions.sort(key=lambda x: (x["completed"], -x["likelihood"]))

        print("[predictor] returning " + str(len(predictions)) + " predictions")

        return jsonify({
            "predictions":     predictions,
            "total_goals":     len(goals),
            "active_goals":    len(active_goals),
            "mood_positivity": pct,
            "mood_signals":    signals,
        })

    except Exception as e:
        print("[predictor] CRASH: " + str(e))
        import traceback; traceback.print_exc()
        return jsonify({"predictions": [], "error": str(e)}), 500
    finally:
        db.close()