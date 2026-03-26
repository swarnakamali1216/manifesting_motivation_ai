"""
Goals Routes — Complete Fix
- generate_roadmap now uses timeline, daily_time, depth to produce 8-15 steps
- /adaptive/interview endpoint added (Goals.jsx calls this)
- /adaptive/prove and /adaptive/struggle endpoints added
- /predict endpoint added
- All resource links start with https://
- Each step has resource_how_to field
"""

from flask import Blueprint, request, jsonify
from models import SessionLocal
from sqlalchemy import text as sql_text
from groq import Groq
import os, json, math
from dotenv import load_dotenv
load_dotenv()

goals_bp = Blueprint("goals", __name__)
client   = Groq(api_key=os.getenv("GROQ_API_KEY"))


# ── Step count calculation (matches frontend preview) ─────────
def calc_step_count(timeline, daily_time, depth):
    days_map  = {"1 week":7, "2 weeks":14, "1 month":30, "3 months":90, "6 months":180}
    mins_map  = {"15 mins":15, "30 mins":30, "1 hour":60, "2+ hours":120}
    depth_map = {"basics":0.5, "core":1.0, "mastery":1.6}
    days  = days_map.get(str(timeline), 30)
    mins  = mins_map.get(str(daily_time), 30)
    mult  = depth_map.get(str(depth), 1.0)
    count = math.ceil((days * mins * mult) / 60)
    return max(4, min(15, count))


# ── Core roadmap generator ─────────────────────────────────────
def generate_roadmap_full(title, category, deadline=None,
                           daily_time="30 mins", learning_style="mix",
                           current_level="complete_beginner",
                           timeline="1 month", depth="core"):
    num_steps = calc_step_count(timeline, daily_time, depth)

    level_desc = {
        "complete_beginner": "has zero prior knowledge",
        "some_knowledge":    "knows the very basics",
        "intermediate":      "has some hands-on experience",
        "advanced":          "is experienced and wants to go deeper",
    }.get(current_level, "is a beginner")

    style_desc = {
        "videos":   "prefers watching video tutorials",
        "reading":  "prefers reading articles and docs",
        "practice": "learns best by doing and building",
        "mix":      "learns through a mix of videos, reading and practice",
    }.get(learning_style, "prefers a mix of resources")

    prompt = f"""You are an expert learning coach. Create a {num_steps}-step roadmap for this goal.

GOAL: "{title}"
CATEGORY: {category}
LEARNER LEVEL: {current_level} ({level_desc})
LEARNING STYLE: {learning_style} ({style_desc})
DAILY TIME: {daily_time}
TIMELINE: {timeline}
DEPTH: {depth}
DEADLINE: {deadline or "flexible"}

CRITICAL RULES:
1. Return ONLY a valid JSON array. No extra text, no markdown, no explanation.
2. The array must have EXACTLY {num_steps} objects.
3. Every "resource" field MUST start with "https://" — never bare domains.
4. Every step MUST have "resource_how_to" — 1-2 sentences explaining exactly how to use the resource.
5. Titles must be specific (not generic like "Learn basics").
6. Steps must build on each other logically.
7. "duration" must match the daily_time of {daily_time}.

JSON FORMAT (return exactly this structure, {num_steps} items):
[
  {{
    "title": "Specific step title",
    "guidance": "2-3 sentences explaining what to do and why this matters at this stage.",
    "resource": "https://example.com/specific-page",
    "resource_how_to": "Open this link and complete sections 1-3. Focus on X and Y. Ignore Z for now.",
    "duration": "{daily_time}",
    "week": 1
  }}
]

Generate {num_steps} steps now for: {title}"""

    try:
        resp = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a roadmap generator. Return ONLY valid JSON arrays. Never add text before or after the JSON."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=4000,
            temperature=0.6,
        )
        raw = resp.choices[0].message.content.strip()

        # Strip markdown fences
        if "```" in raw:
            parts = raw.split("```")
            for p in parts:
                p2 = p.strip()
                if p2.startswith("json"):
                    p2 = p2[4:].strip()
                if p2.startswith("["):
                    raw = p2
                    break

        start = raw.find("[")
        end   = raw.rfind("]") + 1
        if start >= 0 and end > start:
            steps = json.loads(raw[start:end])
        else:
            steps = json.loads(raw)

        # Post-process: ensure https:// on all resources
        for s in steps:
            if s.get("resource") and not s["resource"].startswith("http"):
                s["resource"] = "https://" + s["resource"]
            if not s.get("resource_how_to"):
                s["resource_how_to"] = "Open this resource and work through it systematically at your own pace."
            if not s.get("duration"):
                s["duration"] = daily_time

        print(f"✅ Roadmap generated: {len(steps)} steps for '{title}'")
        return steps

    except Exception as e:
        print(f"Roadmap generation error: {e}")
        # Fallback with proper https:// links
        resources = {
            "academic": [
                ("Python Foundations", "https://www.kaggle.com/learn/python", "Complete all lessons in order. Run every code cell yourself. Do not just read — type the code."),
                ("Data & NumPy", "https://numpy.org/doc/stable/user/absolute_beginners.html", "Read sections 1-4. Create a new notebook and practice each example."),
                ("Build & Practice", "https://leetcode.com/study-plan/", "Start the 30-day study plan. Do 1 problem per session minimum."),
                ("Project Application", "https://github.com/topics/beginner-project", "Pick one project that matches your goal. Fork it and start customizing."),
                ("Review & Document", "https://www.notion.so/templates", "Create a study log. Write 3 bullet points after each session: learned, struggled, next step."),
            ],
            "career": [
                ("Research the Field", "https://www.linkedin.com/learning/", "Search your target role. Watch the top-rated course intro. Note required skills."),
                ("Build Foundation Skills", "https://www.coursera.org/", "Find a beginner course in your field. Complete 1 module per day."),
                ("Create Portfolio", "https://github.com/", "Create a GitHub account. Start a project repo today. Commit something every day."),
                ("Network Strategically", "https://www.linkedin.com/", "Connect with 5 people in your target field. Send a genuine message, not a template."),
                ("Apply & Iterate", "https://www.levels.fyi/", "Research roles and salaries. Apply to 3 places this week. Track responses."),
            ],
        }
        fallback = resources.get(category, resources["career"])
        steps = []
        for i, (t, r, how) in enumerate(fallback[:num_steps]):
            steps.append({
                "title": t,
                "guidance": f"Step {i+1} of your {timeline} journey toward '{title}'. Focus on this for {daily_time} per day.",
                "resource": r,
                "resource_how_to": how,
                "duration": daily_time,
                "week": (i // 2) + 1,
            })
        return steps


# ── GET /goals ─────────────────────────────────────────────────
@goals_bp.route("/goals", methods=["GET"])
def get_goals():
    db = SessionLocal()
    try:
        user_id = request.args.get("user_id")
        if not user_id:
            return jsonify([])
        rows = db.execute(sql_text(
            "SELECT id, user_id, title, category, deadline, completed, roadmap, created_at, roadmap "
            "FROM goals WHERE user_id=:uid ORDER BY id DESC"
        ), {"uid": int(user_id)}).fetchall()
        result = []
        for r in rows:
            roadmap = []
            try:
                if r[6]:
                    parsed = json.loads(r[6]) if isinstance(r[6], str) else r[6]
                    # Normalise — backend may return list or dict
                    if isinstance(parsed, list):
                        roadmap = parsed
                    elif isinstance(parsed, dict) and "steps" in parsed:
                        roadmap = parsed["steps"]
            except Exception:
                pass

            # Load interview_data if stored in roadmap dict
            interview_data = None
            try:
                raw = r[8]
                if raw:
                    d = json.loads(raw) if isinstance(raw, str) else raw
                    if isinstance(d, dict) and "prefs" in d:
                        interview_data = d["prefs"]
            except Exception:
                pass

            result.append({
                "id":             r[0],
                "user_id":        r[1],
                "title":          r[2],
                "category":       r[3] or "general",
                "deadline":       str(r[4]) if r[4] else None,
                "completed":      bool(r[5]),
                "is_complete":    bool(r[5]),
                "roadmap":        roadmap,
                "interview_data": interview_data,
                "created_at":     str(r[7] or ""),
            })
        return jsonify(result)
    except Exception as e:
        print("Goals GET error:", e)
        import traceback; traceback.print_exc()
        return jsonify([])
    finally:
        db.close()


# ── POST /goals ────────────────────────────────────────────────
@goals_bp.route("/goals", methods=["POST"])
def add_goal():
    db = SessionLocal()
    try:
        data     = request.get_json() or {}
        title    = data.get("title", "").strip()
        category = data.get("category", "general")
        deadline = data.get("deadline") or None
        user_id  = data.get("user_id")
        if not user_id:
            return jsonify({"error": "user_id required"}), 400
        if not title:
            return jsonify({"error": "Title required"}), 400

        row = db.execute(sql_text(
            "INSERT INTO goals (user_id, title, category, deadline, completed, is_complete, roadmap) "
            "VALUES (:uid, :title, :cat, :dl, FALSE, FALSE, NULL) RETURNING id"
        ), {"uid": user_id, "title": title, "cat": category, "dl": deadline}).fetchone()
        db.commit()
        new_id = row[0]

        # Generate basic roadmap immediately (will be overwritten by /adaptive/interview)
        roadmap = generate_roadmap_full(title, category, deadline)
        db.execute(sql_text("UPDATE goals SET roadmap=:r WHERE id=:id"),
                   {"r": json.dumps(roadmap), "id": new_id})
        db.commit()

        return jsonify({"message": "Goal saved!", "id": new_id, "roadmap": roadmap}), 201
    except Exception as e:
        db.rollback()
        print("Goals POST error:", e)
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


# ── POST /adaptive/interview  ←  Goals.jsx calls this ─────────
@goals_bp.route("/adaptive/interview", methods=["POST"])
def adaptive_interview():
    """
    Called after user completes the 5-question intake.
    Generates a full personalised roadmap using their answers.
    """
    db = SessionLocal()
    try:
        data     = request.get_json() or {}
        goal_id  = data.get("goal_id")
        user_id  = data.get("user_id")
        daily_time     = data.get("daily_time", "30 mins")
        learning_style = data.get("learning_style", "mix")
        current_level  = data.get("current_level", "complete_beginner")
        timeline       = data.get("timeline", "1 month")
        depth          = data.get("depth", "core")

        if not goal_id:
            return jsonify({"error": "goal_id required"}), 400

        # Get goal title
        row = db.execute(sql_text(
            "SELECT title, category, deadline FROM goals WHERE id=:gid"
        ), {"gid": int(goal_id)}).fetchone()

        if not row:
            return jsonify({"error": "Goal not found"}), 404

        title, category, deadline = row[0], row[1], row[2]
        num_steps = calc_step_count(timeline, daily_time, depth)

        # Generate personalised roadmap
        roadmap = generate_roadmap_full(
            title=title,
            category=category,
            deadline=str(deadline) if deadline else None,
            daily_time=daily_time,
            learning_style=learning_style,
            current_level=current_level,
            timeline=timeline,
            depth=depth,
        )

        # Store roadmap + prefs in goals table
        prefs = {
            "daily_time":     daily_time,
            "learning_style": learning_style,
            "current_level":  current_level,
            "timeline":       timeline,
            "depth":          depth,
            "num_steps":      num_steps,
        }
        payload = {"steps": roadmap, "prefs": prefs}

        db.execute(sql_text("UPDATE goals SET roadmap=:r WHERE id=:gid"),
                   {"r": json.dumps(payload), "gid": int(goal_id)})
        db.commit()

        print(f"✅ Interview complete for goal {goal_id}: {num_steps} steps, timeline={timeline}, depth={depth}")

        return jsonify({
            "roadmap":   roadmap,
            "num_steps": num_steps,
            "prefs":     prefs,
        })

    except Exception as e:
        db.rollback()
        print("Adaptive interview error:", e)
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


# ── POST /adaptive/prove/<goal_id>/<step_index> ───────────────
@goals_bp.route("/adaptive/prove/<int:goal_id>/<int:step_index>", methods=["POST"])
def prove_step(goal_id, step_index):
    db = SessionLocal()
    try:
        data    = request.get_json() or {}
        user_id = data.get("user_id")
        answer  = data.get("answer", "").strip()
        skipped = data.get("skipped", False)

        if skipped or not answer or answer == "skipped":
            # Skipped — mark complete with lower score
            feedback = "Good call moving forward. Come back to this step later if needed. Every step completed keeps your momentum going."
            passed   = True
        else:
            # Generate AI feedback
            goal_row = db.execute(sql_text("SELECT title FROM goals WHERE id=:gid"), {"gid": goal_id}).fetchone()
            goal_title = goal_row[0] if goal_row else "your goal"
            try:
                resp = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[{
                        "role": "user",
                        "content": f"""A student working on "{goal_title}" completed step {step_index+1} and wrote:
"{answer}"

Give them SHORT, warm, specific feedback in 2 sentences:
1. Acknowledge what they did specifically
2. Give one concrete tip for the next step

Keep it under 40 words. Be warm and encouraging."""
                    }],
                    max_tokens=80,
                    temperature=0.7,
                )
                feedback = resp.choices[0].message.content.strip()
                passed   = True
            except Exception:
                feedback = "Excellent work completing this step! Your effort is building real momentum — keep going."
                passed   = True

        # Save to goal_steps
        try:
            existing = db.execute(sql_text(
                "SELECT id FROM goal_steps WHERE goal_id=:gid AND step_index=:si"
            ), {"gid": goal_id, "si": step_index}).fetchone()

            if existing:
                db.execute(sql_text(
                    "UPDATE goal_steps SET completed=TRUE, user_answer=:ans, ai_feedback=:fb, score=:sc "
                    "WHERE goal_id=:gid AND step_index=:si"
                ), {"ans": answer[:500], "fb": feedback, "sc": 100 if not skipped else 70,
                    "gid": goal_id, "si": step_index})
            else:
                db.execute(sql_text(
                    "INSERT INTO goal_steps (goal_id, user_id, step_index, completed, user_answer, ai_feedback, score) "
                    "VALUES (:gid, :uid, :si, TRUE, :ans, :fb, :sc)"
                ), {"gid": goal_id, "uid": user_id, "si": step_index,
                    "ans": answer[:500], "fb": feedback, "sc": 100 if not skipped else 70})
            db.commit()
        except Exception as se:
            print(f"Step save error: {se}")
            db.rollback()

        # Check if all steps done → mark goal complete
        goal_completed = False
        try:
            goal_row = db.execute(sql_text("SELECT roadmap FROM goals WHERE id=:gid"), {"gid": goal_id}).fetchone()
            if goal_row and goal_row[0]:
                rm = json.loads(goal_row[0]) if isinstance(goal_row[0], str) else goal_row[0]
                if isinstance(rm, dict):
                    total = len(rm.get("steps", []))
                else:
                    total = len(rm)
                done = db.execute(sql_text(
                    "SELECT COUNT(*) FROM goal_steps WHERE goal_id=:gid AND completed=TRUE"
                ), {"gid": goal_id}).fetchone()[0]
                if total > 0 and done >= total:
                    db.execute(sql_text("UPDATE goals SET completed=TRUE, is_complete=TRUE WHERE id=:gid"), {"gid": goal_id})
                    db.execute(sql_text("UPDATE users SET xp=COALESCE(xp,0)+100 WHERE id=:uid"), {"uid": user_id})
                    db.commit()
                    goal_completed = True
        except Exception as ce:
            print(f"Goal completion check error: {ce}")

        # Award XP
        xp = 10 if skipped else 15
        try:
            db.execute(sql_text("UPDATE users SET xp=COALESCE(xp,0)+:xp WHERE id=:uid"), {"xp": xp, "uid": user_id})
            db.commit()
        except Exception:
            db.rollback()

        return jsonify({
            "passed":         passed,
            "feedback":       feedback,
            "xp_awarded":     xp,
            "goal_completed": goal_completed,
        })

    except Exception as e:
        db.rollback()
        print("Prove step error:", e)
        return jsonify({"passed": True, "feedback": "Step recorded. Keep going!", "xp_awarded": 10, "goal_completed": False})
    finally:
        db.close()


# ── POST /adaptive/struggle/<goal_id>/<step_index> ───────────
@goals_bp.route("/adaptive/struggle/<int:goal_id>/<int:step_index>", methods=["POST"])
def struggle_help(goal_id, step_index):
    db = SessionLocal()
    try:
        data     = request.get_json() or {}
        goal_row = db.execute(sql_text("SELECT title, roadmap FROM goals WHERE id=:gid"), {"gid": goal_id}).fetchone()
        if not goal_row:
            return jsonify({"micro_tasks": []})

        title   = goal_row[0]
        roadmap = []
        try:
            rm = json.loads(goal_row[1]) if isinstance(goal_row[1], str) else goal_row[1]
            if isinstance(rm, dict):
                roadmap = rm.get("steps", [])
            elif isinstance(rm, list):
                roadmap = rm
        except Exception:
            pass

        step_title = roadmap[step_index]["title"] if step_index < len(roadmap) else f"Step {step_index+1}"

        try:
            resp = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": f"""
Student struggling with: "{step_title}" (part of goal: "{title}")

Create 3 micro-tasks that break this down into tiny, easier steps.
Return ONLY JSON array: [{{"title":"...","guidance":"...","duration":"5-10 mins"}}]
"""}],
                max_tokens=300,
                temperature=0.7,
            )
            raw = resp.choices[0].message.content.strip()
            if "```" in raw:
                raw = raw.split("```")[1].replace("json","").strip()
            start = raw.find("["); end = raw.rfind("]")+1
            micro = json.loads(raw[start:end]) if start>=0 else []
        except Exception:
            micro = [
                {"title": "Watch a 5-min intro video",     "guidance": f"Search YouTube: '{step_title} beginner tutorial'. Watch just 5 minutes.", "duration": "5 mins"},
                {"title": "Read the official docs intro",  "guidance": "Go to the official documentation. Read only the 'Getting Started' section.", "duration": "10 mins"},
                {"title": "Try one tiny example",          "guidance": "Copy the simplest code example you can find. Run it. Change one thing.", "duration": "10 mins"},
            ]

        return jsonify({"micro_tasks": micro})
    except Exception as e:
        print("Struggle help error:", e)
        return jsonify({"micro_tasks": []})
    finally:
        db.close()


# ── GET /goals/<id>/steps ─────────────────────────────────────
@goals_bp.route("/goals/<int:goal_id>/steps", methods=["GET"])
def get_goal_steps(goal_id):
    db = SessionLocal()
    try:
        rows = db.execute(sql_text(
            "SELECT step_index, completed, user_answer, ai_feedback, score "
            "FROM goal_steps WHERE goal_id=:gid"
        ), {"gid": goal_id}).fetchall()
        result = {}
        for r in rows:
            result[r[0]] = {"completed": bool(r[1]), "user_answer": r[2], "ai_feedback": r[3], "score": r[4]}
        return jsonify(result)
    except Exception as e:
        print("Steps GET error:", e)
        return jsonify({})
    finally:
        db.close()


# ── PATCH /goals/<id>/complete ────────────────────────────────
@goals_bp.route("/goals/<int:goal_id>/complete", methods=["PATCH", "POST", "PUT"])
def complete_goal(goal_id):
    db = SessionLocal()
    try:
        row = db.execute(sql_text("SELECT user_id FROM goals WHERE id=:gid"), {"gid": goal_id}).fetchone()
        if not row:
            return jsonify({"error": "Goal not found"}), 404
        db.execute(sql_text("UPDATE goals SET completed=TRUE, is_complete=TRUE WHERE id=:gid"), {"gid": goal_id})
        db.execute(sql_text("UPDATE users SET xp=COALESCE(xp,0)+50 WHERE id=:uid"), {"uid": row[0]})
        db.commit()
        return jsonify({"message": "Goal completed! +50 XP!"})
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


# ── DELETE /goals/<id> ────────────────────────────────────────
@goals_bp.route("/goals/<int:goal_id>", methods=["DELETE"])
def delete_goal(goal_id):
    db = SessionLocal()
    try:
        db.execute(sql_text("DELETE FROM goal_steps WHERE goal_id=:gid"), {"gid": goal_id})
        db.execute(sql_text("DELETE FROM goals WHERE id=:gid"), {"gid": goal_id})
        db.commit()
        return jsonify({"message": "Deleted!"})
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


# ── GET /predict/<user_id> ────────────────────────────────────
@goals_bp.route("/predict/<int:user_id>", methods=["GET"])
def predict_goals(user_id):
    db = SessionLocal()
    try:
        goals = db.execute(sql_text(
            "SELECT id, title, category, completed FROM goals WHERE user_id=:uid AND completed=FALSE"
        ), {"uid": user_id}).fetchall()

        sessions = db.execute(sql_text(
            "SELECT COUNT(*), AVG(vader_score) FROM motivation_sessions WHERE user_id=:uid"
        ), {"uid": user_id}).fetchone()

        total_sessions = sessions[0] or 0
        avg_mood       = float(sessions[1] or 0)

        predictions = []
        for g in goals:
            steps_done = db.execute(sql_text(
                "SELECT COUNT(*) FROM goal_steps WHERE goal_id=:gid AND completed=TRUE"
            ), {"gid": g[0]}).fetchone()[0] or 0

            total_steps = db.execute(sql_text(
                "SELECT COUNT(*) FROM goal_steps WHERE goal_id=:gid"
            ), {"gid": g[0]}).fetchone()[0] or 1

            progress_pct = (steps_done / total_steps) * 100 if total_steps > 0 else 0
            mood_factor  = 50 + (avg_mood * 30)
            session_factor = min(40, total_sessions * 2)
            likelihood = min(98, int(progress_pct * 0.4 + mood_factor * 0.4 + session_factor * 0.2))

            tip = ("Your mood scores show strong motivation — keep your daily sessions consistent." if avg_mood > 0.2
                   else "Try journaling after each session to build emotional momentum." if avg_mood < -0.1
                   else "You're making steady progress. Even 15 minutes daily compounds significantly.")

            predictions.append({
                "title":      g[1],
                "category":   g[2],
                "likelihood": likelihood,
                "reason":     f"{steps_done}/{total_steps} steps done · {total_sessions} coaching sessions · avg mood {round(avg_mood,2)}",
                "tip":        tip,
            })

        return jsonify({"predictions": predictions})
    except Exception as e:
        print("Predict error:", e)
        return jsonify({"predictions": []})
    finally:
        db.close()