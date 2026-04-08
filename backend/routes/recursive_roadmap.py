"""
recursive_roadmap.py — Recursive Roadmap Engine
Place in: backend/routes/recursive_roadmap.py

How it works:
- Tracks every step attempt: passed/failed/skipped/struggled
- After 2+ consecutive failures → AI regenerates roadmap at EASIER difficulty
- After 3+ consecutive passes quickly → AI regenerates at HARDER difficulty  
- Pace tracking: measures time between step completions
- Full recursive regeneration via Groq LLaMA
"""

from flask import Blueprint, request, jsonify
from models import SessionLocal
from sqlalchemy import text as sql_text
from datetime import datetime, timedelta
from groq import Groq
import os, json

recursive_bp = Blueprint("recursive", __name__)

def get_groq():
    return Groq(api_key=)

# ── Constants ──────────────────────────────────────────────────────────────────
STRUGGLE_THRESHOLD  = 2   # consecutive failures before simplifying
FAST_PASS_THRESHOLD = 3   # consecutive quick passes before advancing
QUICK_PASS_MINUTES  = 10  # completing a step in <10 min = "fast"

# ── DB helpers ─────────────────────────────────────────────────────────────────
def get_attempt_history(db, goal_id: int, user_id: int) -> list:
    """Get all step attempts for this goal ordered by time."""
    try:
        rows = db.execute(sql_text("""
            SELECT step_index, passed, time_taken_minutes, created_at
            FROM goal_step_attempts
            WHERE goal_id = :gid AND user_id = :uid
            ORDER BY created_at DESC
            LIMIT 20
        """), {"gid": goal_id, "uid": user_id}).fetchall()
        return [{"step": r[0], "passed": bool(r[1]), "minutes": r[2], "at": str(r[3])} for r in rows]
    except Exception:
        return []

def log_attempt(db, goal_id: int, user_id: int, step_index: int, passed: bool, minutes: float):
    """Log a step attempt."""
    try:
        db.execute(sql_text("""
            INSERT INTO goal_step_attempts (goal_id, user_id, step_index, passed, time_taken_minutes, created_at)
            VALUES (:gid, :uid, :step, :passed, :mins, :now)
        """), {"gid": goal_id, "uid": user_id, "step": step_index,
               "passed": 1 if passed else 0, "mins": minutes, "now": datetime.utcnow()})
        db.commit()
    except Exception as e:
        print(f"Log attempt error: {e}")

def analyse_pace(history: list) -> dict:
    """
    Analyse recent attempts to determine if user needs easier or harder content.
    Returns: {action: 'simplify'|'advance'|'maintain', reason: str, confidence: int}
    """
    if not history or len(history) < 2:
        return {"action": "maintain", "reason": "Not enough data yet", "confidence": 0}

    recent = history[:6]  # last 6 attempts

    consecutive_fails  = 0
    consecutive_passes = 0
    quick_passes       = 0

    for attempt in recent:
        if not attempt["passed"]:
            consecutive_fails  += 1
            consecutive_passes  = 0
            quick_passes        = 0
        else:
            consecutive_passes += 1
            consecutive_fails   = 0
            if attempt.get("minutes", 99) < QUICK_PASS_MINUTES:
                quick_passes += 1

    if consecutive_fails >= STRUGGLE_THRESHOLD:
        return {
            "action":     "simplify",
            "reason":     f"Failed {consecutive_fails} steps in a row — roadmap is too hard",
            "confidence": min(consecutive_fails * 30, 90),
        }
    elif quick_passes >= FAST_PASS_THRESHOLD:
        return {
            "action":     "advance",
            "reason":     f"Completed {quick_passes} steps very quickly — roadmap is too easy",
            "confidence": min(quick_passes * 25, 85),
        }
    elif consecutive_passes >= 4:
        return {
            "action":     "advance",
            "reason":     f"Consistent progress — ready for more challenge",
            "confidence": 60,
        }
    else:
        return {"action": "maintain", "reason": "Pace is good — keep going!", "confidence": 70}

def regenerate_roadmap_ai(goal_title: str, current_steps: list, action: str,
                           learning_style: str, daily_time: int, reason: str) -> list:
    """Use Groq LLaMA to regenerate roadmap at adjusted difficulty."""

    direction = {
        "simplify": "SIMPLER and more beginner-friendly with smaller steps and more guidance",
        "advance":  "MORE ADVANCED and challenging with deeper concepts and less hand-holding",
        "maintain": "at the same level but restructured for better flow",
    }.get(action, "at the same level")

    current_titles = [s.get("title", f"Step {i+1}") for i, s in enumerate(current_steps[:5])]

    prompt = f"""You are an expert learning coach. A student is learning: "{goal_title}"

CURRENT ROADMAP (first 5 steps):
{json.dumps(current_titles, indent=2)}

REASON FOR ADJUSTMENT: {reason}
REQUIRED CHANGE: Make the roadmap {direction}
LEARNING STYLE: {learning_style}
DAILY TIME: {daily_time} minutes/day

Generate a NEW adaptive roadmap with exactly 5 steps.
Respond ONLY with a JSON array, no explanation:
[
  {{
    "title": "step title",
    "description": "what to do",
    "guidance": "specific tip for {learning_style} learner",
    "resource": "one helpful free resource URL",
    "duration": "estimated time",
    "difficulty": "easy|medium|hard"
  }}
]"""

    try:
        resp = get_groq().chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1200,
            temperature=0.7,
        )
        raw = resp.choices[0].message.content.strip()
        # Clean JSON
        import re
        raw = re.sub(r"```json|```", "", raw).strip()
        steps = json.loads(raw)
        if isinstance(steps, list) and len(steps) > 0:
            return steps
    except Exception as e:
        print(f"Roadmap regeneration error: {e}")

    return []

# ── POST /api/recursive/log-attempt ───────────────────────────────────────────
@recursive_bp.route("/recursive/log-attempt", methods=["POST"])
def log_step_attempt():
    """
    Log a step attempt and check if roadmap needs adjustment.
    Body: { goal_id, user_id, step_index, passed, time_minutes }
    Returns: { action, reason, should_regenerate, confidence }
    """
    db   = SessionLocal()
    data = request.get_json() or {}

    goal_id    = data.get("goal_id")
    user_id    = data.get("user_id")
    step_index = data.get("step_index", 0)
    passed     = data.get("passed", False)
    minutes    = data.get("time_minutes", 30)

    if not goal_id or not user_id:
        return jsonify({"error": "goal_id and user_id required"}), 400

    try:
        log_attempt(db, int(goal_id), int(user_id), step_index, passed, minutes)
        history = get_attempt_history(db, int(goal_id), int(user_id))
        analysis = analyse_pace(history)

        return jsonify({
            "logged":             True,
            "action":             analysis["action"],
            "reason":             analysis["reason"],
            "confidence":         analysis["confidence"],
            "should_regenerate":  analysis["action"] != "maintain" and analysis["confidence"] >= 50,
            "total_attempts":     len(history),
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

# ── POST /api/recursive/regenerate ────────────────────────────────────────────
@recursive_bp.route("/recursive/regenerate", methods=["POST"])
def regenerate_roadmap():
    """
    Recursively regenerate roadmap at adjusted difficulty.
    Body: { goal_id, user_id, goal_title, current_steps, learning_style, daily_time }
    Returns: { new_steps, action, reason, difficulty_changed }
    """
    db   = SessionLocal()
    data = request.get_json() or {}

    goal_id       = data.get("goal_id")
    user_id       = data.get("user_id")
    goal_title    = data.get("goal_title", "")
    current_steps = data.get("current_steps", [])
    learning_style = data.get("learning_style", "visual")
    daily_time    = data.get("daily_time", 30)

    if not goal_id or not user_id or not goal_title:
        return jsonify({"error": "goal_id, user_id, goal_title required"}), 400

    try:
        history  = get_attempt_history(db, int(goal_id), int(user_id))
        analysis = analyse_pace(history)
        action   = analysis["action"]
        reason   = analysis["reason"]

        if action == "maintain":
            return jsonify({
                "action":           "maintain",
                "reason":           reason,
                "difficulty_changed": False,
                "new_steps":        current_steps,
                "message":          "Your pace is good — no adjustment needed!",
            })

        # Generate new roadmap
        new_steps = regenerate_roadmap_ai(
            goal_title, current_steps, action, learning_style, daily_time, reason
        )

        if not new_steps:
            return jsonify({"error": "AI generation failed"}), 500

        # Save new roadmap to DB
        db.execute(sql_text(
            "UPDATE goals SET roadmap = :r WHERE id = :id AND user_id = :uid"
        ), {"r": json.dumps(new_steps), "id": int(goal_id), "uid": int(user_id)})
        db.commit()

        direction_label = {
            "simplify": "📉 Simplified — smaller steps, more guidance",
            "advance":  "📈 Advanced — deeper concepts, more challenge",
        }.get(action, "Updated")

        return jsonify({
            "action":             action,
            "reason":             reason,
            "confidence":         analysis["confidence"],
            "difficulty_changed": True,
            "new_steps":          new_steps,
            "direction":          direction_label,
            "message":            f"Roadmap adjusted! {direction_label}",
        })

    except Exception as e:
        print(f"Regenerate error: {e}")
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

# ── GET /api/recursive/pace/<goal_id>/<user_id> ────────────────────────────────
@recursive_bp.route("/recursive/pace/<int:goal_id>/<int:user_id>", methods=["GET"])
def get_pace_analysis(goal_id, user_id):
    """Get pace analysis for a goal — shows in UI as adaptive indicator."""
    db = SessionLocal()
    try:
        history  = get_attempt_history(db, goal_id, user_id)
        analysis = analyse_pace(history)
        passed   = sum(1 for h in history if h["passed"])
        failed   = sum(1 for h in history if not h["passed"])
        avg_time = sum(h.get("minutes", 0) for h in history) / max(len(history), 1)

        return jsonify({
            **analysis,
            "total_attempts": len(history),
            "passed":         passed,
            "failed":         failed,
            "avg_minutes":    round(avg_time, 1),
            "history":        history[:5],
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()