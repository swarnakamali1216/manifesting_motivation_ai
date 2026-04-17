"""
routes/goals.py
FIXES:
  1. get_groq() replaced with get_groq_client() — shared pool, no new Groq() per call
  2. All other logic (URL safety, roadmap generation, adaptive steps) unchanged
"""

from flask import Blueprint, request, jsonify
from models import SessionLocal
from sqlalchemy import text as sql_text
from groq_client import get_groq_client   # ← CHANGED: shared pool
import os, json, math
from urllib.parse import quote_plus
from dotenv import load_dotenv
load_dotenv()

goals_bp = Blueprint("goals", __name__)


# ── Step count calculation ─────────────────────────────────────
# goals.py — fix calc_step_count()
def calc_step_count(timeline, daily_time, depth):
    days_map  = {"1 week":7, "2 weeks":14, "1 month":30, "3 months":90, "6 months":180}
    mins_map  = {"15 mins":15, "30 mins":30, "1 hour":60, "2+ hours":120}
    depth_map = {"basics":0.5, "core":1.0, "mastery":1.6}
    days  = days_map.get(str(timeline), 30)
    mins  = mins_map.get(str(daily_time), 30)
    mult  = depth_map.get(str(depth), 1.0)
    count = math.ceil((days * mins * mult) / 60)
    return max(3, min(50, count))  # was max(4, min(15, count))

_SAFE_INDEX_DOMAINS = [
    "docs.python.org", "developer.mozilla.org", "react.dev", "dev.java",
    "www.theodinproject.com", "www.freecodecamp.org", "www.kaggle.com",
    "developers.google.com", "course.fast.ai", "www.coursera.org",
    "www.linkedin.com/learning", "leetcode.com", "hackerrank.com",
    "codecademy.com", "www.duolingo.com", "www.headspace.com",
    "jamesclear.com", "www.investopedia.com", "hbr.org", "www.udemy.com",
    "jakevdp.github.io", "www.habitica.com", "www.calm.com",
    "startingstrength.com", "web.dev", "vuejs.org", "angular.io",
    "nextjs.org", "fastapi.tiangolo.com", "flask.palletsprojects.com",
    "www.postgresql.org", "numpy.org", "pandas.pydata.org",
    "scikit-learn.org", "tensorflow.org", "pytorch.org",
]

_NEVER_TRUST_DOMAINS = [
    "youtube.com", "youtu.be", "github.com", "medium.com",
    "dev.to", "stackoverflow.com", "reddit.com", "towardsdatascience.com",
]


def make_search_url(topic: str, style: str, step_index: int = 0) -> str:
    enc = quote_plus(topic.strip())
    if style == "videos":
        return f"https://www.youtube.com/results?search_query={enc}+tutorial"
    elif style == "reading":
        sources = [
            f"https://www.freecodecamp.org/news/search/?query={enc}",
            f"https://www.google.com/search?q={enc}+site:docs.python.org+OR+site:developer.mozilla.org+OR+site:freecodecamp.org",
        ]
        return sources[step_index % len(sources)]
    elif style == "practice":
        sources = [
            f"https://github.com/search?q={enc}+beginner&type=repositories",
            f"https://www.kaggle.com/search?q={enc}",
            f"https://leetcode.com/problemset/?search={enc}",
        ]
        return sources[step_index % len(sources)]
    else:
        sources = [
            f"https://www.youtube.com/results?search_query={enc}+tutorial",
            f"https://www.freecodecamp.org/news/search/?query={enc}",
            f"https://github.com/search?q={enc}+beginner&type=repositories",
            f"https://www.coursera.org/search?query={enc}",
        ]
        return sources[step_index % len(sources)]


def _safe_resource_url(url, goal_title, category, learning_style="mix",
                       step_index=0, step_title=""):
    from urllib.parse import urlparse
    topic = (step_title or goal_title or "tutorial").strip()
    if not url or not url.startswith("http"):
        return make_search_url(topic, learning_style, step_index)
    try:
        parsed = urlparse(url)
        domain = parsed.netloc.lower().replace("www.", "")
        for bad in _NEVER_TRUST_DOMAINS:
            if bad in domain:
                return make_search_url(topic, learning_style, step_index)
        for safe in _SAFE_INDEX_DOMAINS:
            if safe.replace("www.", "") in domain:
                return url
        return make_search_url(topic, learning_style, step_index)
    except Exception:
        return make_search_url(topic, learning_style, step_index)


def make_how_to(url: str, step_title: str) -> str:
    if "youtube.com/results" in url:
        return f"🔍 YouTube search for '{step_title}'. Click the first video under 20 minutes. Watch fully, pause to take notes, try any examples shown."
    elif "freecodecamp.org/news/search" in url:
        return f"🔍 FreeCodeCamp search for '{step_title}'. Click the most relevant article. Read top-to-bottom and run every code example in your editor."
    elif "github.com/search" in url:
        return f"🔍 GitHub search for '{step_title}' projects. Sort by Stars. Open the top result, read the README fully, then try running it locally."
    elif "coursera.org/search" in url:
        return f"🔍 Coursera search for '{step_title}'. Find a free/audit course. Watch the Week 1 intro to check the level before committing."
    elif "kaggle.com/search" in url:
        return f"🔍 Kaggle search for '{step_title}'. Open the top notebook. Run each cell, read what it does, modify one thing and re-run."
    elif "leetcode.com/problemset" in url:
        return f"💻 LeetCode problems for '{step_title}'. Filter by Easy. Try solving for 15 minutes before reading hints. Check Discussion after."
    elif "docs.python.org" in url:
        return f"📚 Python official docs for '{step_title}'. Read the intro section. Run every code example in your terminal."
    elif "developer.mozilla.org" in url:
        return f"📚 MDN Web Docs for '{step_title}'. Read the overview, then the Examples section. Open browser DevTools and try the examples yourself."
    elif "freecodecamp.org" in url:
        return f"📖 FreeCodeCamp lesson on '{step_title}'. Work through each interactive exercise. Don't skip — each builds on the last."
    elif "coursera.org" in url:
        return f"🎓 Coursera course for '{step_title}'. Audit for free. Watch 1-2 videos per session. Take notes and do the quizzes."
    elif "theodinproject.com" in url:
        return f"🛤️ The Odin Project lesson for '{step_title}'. Read the lesson, then complete every exercise listed."
    elif "leetcode.com" in url:
        return f"💻 LeetCode for '{step_title}'. Start with Easy problems. Try for 20 minutes before looking at hints."
    else:
        return f"🌐 Resource for '{step_title}'. Read or watch the main content, try any exercises shown, then explain what you learned in your own words."


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

    resource_instructions = {
        "videos":   f"ALL resource URLs must be YouTube search URLs: https://www.youtube.com/results?search_query=TOPIC+tutorial",
        "reading":  f"ALL resource URLs must be official documentation homepages: docs.python.org, developer.mozilla.org, www.freecodecamp.org, www.kaggle.com/learn, www.theodinproject.com.",
        "practice": f"ALL resource URLs must be practice platform search pages: https://github.com/search?q=TOPIC+beginner&type=repositories OR https://leetcode.com/problemset/?search=TOPIC OR https://www.kaggle.com/search?q=TOPIC.",
        "mix":      f"Rotate across these 4 URL types, one per step: (1) https://www.youtube.com/results?search_query=TOPIC+tutorial (2) https://www.freecodecamp.org/news/search/?query=TOPIC (3) https://github.com/search?q=TOPIC+beginner&type=repositories (4) https://www.coursera.org/search?query=TOPIC.",
    }

    prompt = f"""You are an expert learning coach. Create a {num_steps}-step roadmap for this goal.

GOAL: "{title}"
CATEGORY: {category}
LEARNER LEVEL: {current_level} ({level_desc})
LEARNING STYLE: {learning_style} ({style_desc})
DAILY TIME: {daily_time}
TIMELINE: {timeline}
DEPTH: {depth}
DEADLINE: {deadline or "flexible"}

RESOURCE FORMAT (CRITICAL):
{resource_instructions.get(learning_style, resource_instructions["mix"])}

RULES:
1. Return ONLY a valid JSON array. No extra text, no markdown, no explanation.
2. The array must have EXACTLY {num_steps} objects.
3. Every "resource" URL must use the SEARCH FORMAT described above.
4. "resource_how_to": 1-2 sentences on how to use this specific resource.
5. Step titles must be specific. Steps must build logically.
6. "duration" must match {daily_time}.

JSON FORMAT:
[
  {{
    "title": "Specific step title",
    "guidance": "2-3 sentences: what to do and why this matters right now.",
    "resource": "https://www.youtube.com/results?search_query=specific+topic+here+tutorial",
    "resource_how_to": "Click the first relevant video. Watch fully and take notes.",
    "duration": "{daily_time}",
    "week": 1
  }}
]

Generate {num_steps} steps now for: {title}"""

    try:
        # CHANGED: get_groq_client() — reuses shared connection pool
        client = get_groq_client()
        resp = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a roadmap generator. Return ONLY valid JSON arrays. Never add text before or after the JSON."},
                {"role": "user",   "content": prompt}
            ],
            max_tokens=4000,
            temperature=0.6,
        )
        raw = resp.choices[0].message.content.strip()

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

        for idx_s, s in enumerate(steps):
            raw_url    = s.get("resource", "")
            step_title = s.get("title", "")
            if raw_url and not raw_url.startswith("http"):
                raw_url = "https://" + raw_url
            safe_url = _safe_resource_url(
                raw_url, title, category,
                learning_style=learning_style,
                step_index=idx_s,
                step_title=step_title,
            )
            s["resource"]         = safe_url
            s["resource_how_to"]  = make_how_to(safe_url, step_title)
            if not s.get("duration"):
                s["duration"] = daily_time

        print(f"✅ Roadmap generated: {len(steps)} steps for '{title}'")
        return steps

    except Exception as e:
        print(f"Roadmap generation error: {e}")
        fallback_topics = [
            f"{title} introduction for beginners",
            f"{title} basic concepts",
            f"{title} first project",
            f"{title} intermediate practice",
            f"{title} advanced techniques",
        ]
        steps = []
        for i in range(num_steps):
            topic    = fallback_topics[i % len(fallback_topics)]
            safe_url = make_search_url(topic, learning_style, i)
            steps.append({
                "title":           f"Step {i+1}: {topic.title()}",
                "guidance":        f"Step {i+1} of your {timeline} journey toward '{title}'. Spend {daily_time} focused on this topic.",
                "resource":        safe_url,
                "resource_how_to": make_how_to(safe_url, topic),
                "duration":        daily_time,
                "week":            (i // 2) + 1,
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
                    if isinstance(parsed, list):
                        roadmap = parsed
                    elif isinstance(parsed, dict) and "steps" in parsed:
                        roadmap = parsed["steps"]
            except Exception:
                pass

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


# ── POST /adaptive/interview ───────────────────────────────────
@goals_bp.route("/adaptive/interview", methods=["POST"])
def adaptive_interview():
    db = SessionLocal()
    try:
        data           = request.get_json() or {}
        goal_id        = data.get("goal_id")
        user_id        = data.get("user_id")
        daily_time     = data.get("daily_time",     "30 mins")
        learning_style = data.get("learning_style", "mix")
        current_level  = data.get("current_level",  "complete_beginner")
        timeline       = data.get("timeline",       "1 month")
        depth          = data.get("depth",          "core")

        if not goal_id:
            return jsonify({"error": "goal_id required"}), 400

        row = db.execute(sql_text(
            "SELECT title, category, deadline FROM goals WHERE id=:gid"
        ), {"gid": int(goal_id)}).fetchone()

        if not row:
            return jsonify({"error": "Goal not found"}), 404

        title, category, deadline = row[0], row[1], row[2]
        num_steps = calc_step_count(timeline, daily_time, depth)

        roadmap = generate_roadmap_full(
            title=title, category=category,
            deadline=str(deadline) if deadline else None,
            daily_time=daily_time, learning_style=learning_style,
            current_level=current_level, timeline=timeline, depth=depth,
        )

        prefs   = {
            "daily_time": daily_time, "learning_style": learning_style,
            "current_level": current_level, "timeline": timeline,
            "depth": depth, "num_steps": num_steps,
        }
        payload = {"steps": roadmap, "prefs": prefs}

        db.execute(sql_text("UPDATE goals SET roadmap=:r WHERE id=:gid"),
                   {"r": json.dumps(payload), "gid": int(goal_id)})
        db.commit()

        print(f"✅ Interview complete for goal {goal_id}: {num_steps} steps, timeline={timeline}")
        return jsonify({"roadmap": roadmap, "num_steps": num_steps, "prefs": prefs})

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
            feedback = "Good call moving forward. Come back to this step later if needed. Every step completed keeps your momentum going."
            passed   = True
        else:
            goal_row   = db.execute(sql_text("SELECT title FROM goals WHERE id=:gid"), {"gid": goal_id}).fetchone()
            goal_title = goal_row[0] if goal_row else "your goal"
            try:
                # CHANGED: get_groq_client() — reuses shared connection pool
                client = get_groq_client()
                resp = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[{"role": "user", "content":
                        f'A student working on "{goal_title}" completed step {step_index+1} and wrote:\n"{answer}"\n\n'
                        f'Give SHORT, warm, specific feedback in 2 sentences:\n'
                        f'1. Acknowledge what they did specifically\n'
                        f'2. Give one concrete tip for the next step\n\nKeep it under 40 words. Be warm and encouraging.'
                    }],
                    max_tokens=80, temperature=0.7,
                )
                feedback = resp.choices[0].message.content.strip()
                passed   = True
            except Exception:
                feedback = "Excellent work completing this step! Your effort is building real momentum — keep going."
                passed   = True

        try:
            existing = db.execute(sql_text(
                "SELECT id FROM goal_steps WHERE goal_id=:gid AND step_index=:si"
            ), {"gid": goal_id, "si": step_index}).fetchone()

            if existing:
                db.execute(sql_text(
                    "UPDATE goal_steps SET user_answer=:ans, ai_feedback=:fb, score=:sc "
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

        goal_completed = False
        try:
            goal_row = db.execute(sql_text("SELECT roadmap FROM goals WHERE id=:gid"), {"gid": goal_id}).fetchone()
            if goal_row and goal_row[0]:
                rm    = json.loads(goal_row[0]) if isinstance(goal_row[0], str) else goal_row[0]
                total = len(rm.get("steps", [])) if isinstance(rm, dict) else len(rm)
                done  = db.execute(sql_text(
                    "SELECT COUNT(*) FROM goal_steps WHERE goal_id=:gid AND completed=TRUE"
                ), {"gid": goal_id}).fetchone()[0]
                if total > 0 and done >= total:
                    db.execute(sql_text("UPDATE goals SET completed=TRUE, is_complete=TRUE WHERE id=:gid"), {"gid": goal_id})
                    db.execute(sql_text("UPDATE users SET xp=COALESCE(xp,0)+100 WHERE id=:uid"), {"uid": user_id})
                    db.commit()
                    goal_completed = True
        except Exception as ce:
            print(f"Goal completion check error: {ce}")

        xp = 10 if skipped else 15
        try:
            db.execute(sql_text("UPDATE users SET xp=COALESCE(xp,0)+:xp WHERE id=:uid"), {"xp": xp, "uid": user_id})
            db.commit()
        except Exception:
            db.rollback()

        return jsonify({"passed": passed, "feedback": feedback, "xp_awarded": xp, "goal_completed": goal_completed})

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
        goal_row = db.execute(sql_text("SELECT title, roadmap FROM goals WHERE id=:gid"), {"gid": goal_id}).fetchone()
        if not goal_row:
            return jsonify({"micro_tasks": []})

        title   = goal_row[0]
        roadmap = []
        try:
            rm      = json.loads(goal_row[1]) if isinstance(goal_row[1], str) else goal_row[1]
            roadmap = rm.get("steps", []) if isinstance(rm, dict) else rm
        except Exception:
            pass

        step_title = roadmap[step_index]["title"] if step_index < len(roadmap) else f"Step {step_index+1}"

        try:
            # CHANGED: get_groq_client() — reuses shared connection pool
            client = get_groq_client()
            resp = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content":
                    f'Student struggling with: "{step_title}" (goal: "{title}")\n\n'
                    f'Create 3 micro-tasks to break this down into tiny 5-10 minute steps.\n'
                    f'Return ONLY JSON array: [{{"title":"...","guidance":"...","duration":"5-10 mins"}}]'
                }],
                max_tokens=300, temperature=0.7,
            )
            raw = resp.choices[0].message.content.strip()
            if "```" in raw:
                raw = raw.split("```")[1].replace("json", "").strip()
            start = raw.find("["); end = raw.rfind("]") + 1
            micro = json.loads(raw[start:end]) if start >= 0 else []
        except Exception:
            micro = [
                {"title": "Watch a 5-min intro video",    "guidance": f"Search YouTube: '{step_title} beginner'. Watch just 5 minutes.", "duration": "5 mins"},
                {"title": "Read the official docs intro", "guidance": "Go to the official documentation. Read only the Getting Started section.", "duration": "10 mins"},
                {"title": "Try one tiny example",         "guidance": "Copy the simplest code example you can find. Run it. Change one thing.", "duration": "10 mins"},
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