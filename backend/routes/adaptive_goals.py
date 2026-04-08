from flask import Blueprint, request, jsonify
from models import SessionLocal
from sqlalchemy import text as sql_text
from groq import Groq
import os, json, math
from dotenv import load_dotenv
load_dotenv()

adaptive_bp = Blueprint("adaptive", __name__)
def get_groq():
    return Groq(api_key=os.getenv('GROQ_API_KEY'))

# ── Step count calculator — THE CORE FIX ─────────────────────────────────────
# Maps (timeline, daily_time, depth) → realistic step count
TIMELINE_DAYS = {
    "3 days": 3, "1 week": 7, "2 weeks": 14, "1 month": 30,
    "3 months": 90, "6 months": 180, "1 year": 365
}
DAILY_MINS = {
    "15 mins": 15, "30 mins": 30, "1 hour": 60, "2+ hours": 120
}
DEPTH_MULTIPLIER = {
    "basics": 0.5,   # just fundamentals
    "core":   1.0,   # solid working knowledge
    "mastery": 1.6   # deep expertise
}
AVG_STEP_MINS = 60  # average a step takes 60 minutes of focused work

def calculate_num_steps(timeline, daily_time, depth):
    days        = TIMELINE_DAYS.get(timeline, 30)
    mins_per_day= DAILY_MINS.get(daily_time, 30)
    depth_mult  = DEPTH_MULTIPLIER.get(depth, 1.0)
    total_mins  = days * mins_per_day * depth_mult
    raw_steps   = total_mins / AVG_STEP_MINS
    # Clamp between 3 and 50 steps
    return max(3, min(50, math.ceil(raw_steps)))


def generate_adaptive_roadmap(title, category, daily_time, learning_style,
                               current_level, timeline, depth, num_steps):
    try:
        system_prompt = f"""You are a Senior Learning Architect who creates precise, actionable roadmaps.

RULES:
1. Generate EXACTLY {num_steps} steps — no more, no fewer.
2. Each step fits the user's daily time budget ({daily_time}).
3. Steps are sequenced logically — each builds on the previous.
4. Depth = "{depth}": {'Focus on just the essentials.' if depth=='basics' else 'Cover core working knowledge.' if depth=='core' else 'Go deep — theory, practice, and mastery.'}
5. Level = {current_level}: calibrate difficulty accordingly.
6. Timeline = {timeline}: pace steps to fit this timeline realistically.
7. Difficulty curve: easy start → gradually harder → challenge at the end.

CRITICAL RESOURCE RULES:
- "resource" must be a REAL working URL starting with https://
- Choose from these verified sources based on topic:
  Programming: https://www.freecodecamp.org  |  https://www.theodinproject.com  |  https://cs50.harvard.edu/x  |  https://javascript.info  |  https://docs.python.org/3/tutorial
  AI/ML: https://www.fast.ai  |  https://www.kaggle.com/learn  |  https://developers.google.com/machine-learning/crash-course  |  https://huggingface.co/learn
  Data: https://www.kaggle.com/learn  |  https://pandas.pydata.org/docs/getting_started  |  https://numpy.org/learn
  Web Dev: https://fullstackopen.com  |  https://developer.mozilla.org/en-US/docs/Learn
  General: https://www.coursera.org  |  https://www.edx.org  |  https://www.khanacademy.org
  Video: https://www.youtube.com/results?search_query={title.replace(' ','+').lower()}+tutorial
- NEVER use bare domains like "youtube.com" without https:// and a real path
- "resource_how_to" must explain in 1-2 sentences exactly HOW to use that resource for THIS step

Return ONLY a JSON array with EXACTLY {num_steps} items:
[
  {{
    "step": 1,
    "title": "Specific action-oriented title",
    "guidance": "Exact how-to in 2-3 sentences. What to do, what to look for, what to produce.",
    "resource": "https://actual-working-url.com/specific-page",
    "resource_how_to": "Open this page, go to section X, complete Y. You know you're done when you can Z.",
    "duration": "{daily_time}",
    "time_budget": "{daily_time}",
    "proof_question": "Concrete question to verify they completed AND understood this step.",
    "difficulty": "beginner/intermediate/advanced",
    "week": 1
  }}
]"""
        user_prompt = f"""Goal: {title}
Category: {category}
Daily time: {daily_time}
Learning style: {learning_style}
Current level: {current_level}
Timeline to complete: {timeline}
Depth goal: {depth}
Number of steps to generate: {num_steps}

Generate exactly {num_steps} steps for this person to achieve "{title}" in {timeline}.
Every step must fit in {daily_time}/day."""

        resp = get_groq().chat.completions.create(
            model    = "llama-3.3-70b-versatile",
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt}
            ],
            max_tokens  = min(4000, num_steps * 120),
            temperature = 0.7
        )
        raw = resp.choices[0].message.content.strip()
        if "```" in raw:
            raw = raw.split("```")[1].replace("json","").strip()
        start = raw.find("["); end = raw.rfind("]") + 1
        if start >= 0 and end > start:
            return json.loads(raw[start:end])
        return json.loads(raw)
    except Exception as e:
        print(f"Adaptive roadmap error: {e}")
        return generate_fallback_steps(title, daily_time, current_level, num_steps)


def generate_fallback_steps(title, daily_time, level, num_steps=5):
    """Generates num_steps fallback steps when AI fails — with real working URLs."""
    base = [
        {
            "title": f"Understand what {title} really means",
            "guidance": f"Search for a beginner overview of {title}. Watch one 10-minute intro video. Write down 3 things you learned in your own words.",
            "resource": f"https://www.youtube.com/results?search_query={title.replace(' ','+').lower()}+beginner+tutorial",
            "resource_how_to": f"Click the first relevant beginner video. Watch it fully once, then re-watch the parts that were unclear. You are done when you can explain {title} in one sentence.",
            "proof_question": f"In your own words, what is {title} and why does it matter?"
        },
        {
            "title": "Choose your main learning resource",
            "guidance": "Pick ONE structured course or guide and commit to it. Don't bounce between resources — depth beats breadth.",
            "resource": "https://www.freecodecamp.org",
            "resource_how_to": "Go to freecodecamp.org and search for your topic. Start the first module. Complete at least one section today. You are done when you have finished your first lesson.",
            "proof_question": "Which resource did you choose and what is the first thing it teaches?"
        },
        {
            "title": "Complete your first hands-on exercise",
            "guidance": "Don't just read — DO something. Find the smallest exercise in your chosen resource and complete it. Typing code or doing an exercise beats reading 10 pages.",
            "resource": "https://www.kaggle.com/learn",
            "resource_how_to": "Open Kaggle Learn, find the notebook for your topic, click 'Edit', run each cell, and read what each line does. You are done when you run the full notebook without errors.",
            "proof_question": "What did you actually build or complete? What was the hardest part?"
        },
        {
            "title": "Build one small project from scratch",
            "guidance": "Use only what you have learned so far to build the smallest useful thing you can. Don't copy-paste — write it yourself. Struggling is the learning.",
            "resource": "https://github.com/explore",
            "resource_how_to": "Go to github.com/explore, search for beginner projects in your topic, pick one as inspiration (not to copy), and build your own version. You are done when your project runs end-to-end.",
            "proof_question": "What did you build? What broke first and how did you fix it?"
        },
        {
            "title": "Find and fill your gaps",
            "guidance": "Review everything you have learned. Write down what you still find confusing. Then go learn specifically those things — targeted practice beats random review.",
            "resource": "https://developer.mozilla.org/en-US/docs/Learn",
            "resource_how_to": "Use MDN as a reference — search for exactly the concept you are confused about. Read the explanation and the example. You are done when you can explain the concept without looking it up.",
            "proof_question": "What were your two biggest gaps? How did you fill them?"
        },
        {
            "title": "Apply your knowledge in a real scenario",
            "guidance": "Take what you know and apply it to something real — a problem you actually care about. This is where learning becomes skill.",
            "resource": "https://www.hackerrank.com/dashboard",
            "resource_how_to": "Go to HackerRank, pick the challenge track for your topic, and complete one Easy-level challenge. Read the editorial after if you get stuck. You are done when you pass all test cases.",
            "proof_question": "What real problem did you solve? What would you do differently next time?"
        },
        {
            "title": "Share your work and get feedback",
            "guidance": "Show what you built to someone — a community, a friend, or online. Feedback accelerates growth more than solo practice.",
            "resource": "https://www.reddit.com/r/learnprogramming",
            "resource_how_to": "Post your project or question on r/learnprogramming with a clear title like 'Feedback on my first X project'. Read every reply. You are done when you have acted on at least one piece of feedback.",
            "proof_question": "What feedback did you receive? What will you change based on it?"
        },
        {
            "title": "Teach what you learned",
            "guidance": "Explain everything you know about this topic to someone else — a friend, a rubber duck, or by writing a short blog post. Teaching is the highest form of understanding.",
            "resource": "https://dev.to",
            "resource_how_to": "Go to dev.to, click 'Write a Post', and write a short article (even 200 words) explaining what you learned. Publishing it makes it real. You are done when someone else can understand your explanation.",
            "proof_question": "Explain the entire topic in simple words as if the listener has never heard of it."
        },
    ]
    steps = []
    for i in range(num_steps):
        b = base[i % len(base)]
        steps.append({
            "step":             i + 1,
            "title":            b["title"],
            "guidance":         b["guidance"],
            "resource":         b["resource"],
            "resource_how_to":  b.get("resource_how_to", "Open the link and complete the task described."),
            "duration":         daily_time,
            "time_budget":      daily_time,
            "proof_question":   b["proof_question"],
            "difficulty":       level,
            "week":             (i // 7) + 1,
        })
    return steps


@adaptive_bp.route("/adaptive/interview", methods=["POST"])
def intake_interview():
    db = SessionLocal()
    try:
        data           = request.get_json()
        goal_id        = data.get("goal_id")
        daily_time     = data.get("daily_time",     "30 mins")
        learning_style = data.get("learning_style", "mix")
        current_level  = data.get("current_level",  "complete_beginner")
        timeline       = data.get("timeline",       "1 month")
        depth          = data.get("depth",          "core")
        user_id        = data.get("user_id")  # noqa: F841

        # Calculate realistic step count from user inputs
        num_steps = calculate_num_steps(timeline, daily_time, depth)

        goal = db.execute(sql_text(
            "SELECT title, category FROM goals WHERE id=:gid"
        ), {"gid": goal_id}).fetchone()
        if not goal:
            return jsonify({"error": "Goal not found"}), 404

        roadmap = generate_adaptive_roadmap(
            goal[0], goal[1] or "general",
            daily_time, learning_style, current_level,
            timeline, depth, num_steps
        )

        interview_data = json.dumps({
            "daily_time": daily_time, "learning_style": learning_style,
            "current_level": current_level, "timeline": timeline,
            "depth": depth, "num_steps": num_steps
        })
        db.execute(sql_text(
            "UPDATE goals SET roadmap=:r, interview_data=:i WHERE id=:gid"
        ), {"r": json.dumps(roadmap), "i": interview_data, "gid": goal_id})
        db.commit()

        return jsonify({
            "roadmap":        roadmap,
            "num_steps":      num_steps,
            "timeline":       timeline,
            "depth":          depth,
            "daily_time":     daily_time,
            "learning_style": learning_style,
            "current_level":  current_level,
            "message":        f"{num_steps}-step quest built for {timeline} at {daily_time}/day!"
        })
    except Exception as e:
        db.rollback()
        print(f"Interview error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@adaptive_bp.route("/adaptive/prove/<int:goal_id>/<int:step_index>", methods=["POST"])
def prove_knowledge(goal_id, step_index):
    db = SessionLocal()
    try:
        data        = request.get_json()
        user_answer = (data.get("answer", "") or "").strip()
        user_id     = data.get("user_id")
        skipped     = data.get("skipped", False)

        goal = db.execute(sql_text(
            "SELECT title, roadmap FROM goals WHERE id=:gid"
        ), {"gid": goal_id}).fetchone()
        if not goal:
            return jsonify({"error": "Goal not found"}), 404

        roadmap    = json.loads(goal[1]) if goal[1] else []
        step_info  = roadmap[step_index] if step_index < len(roadmap) else {}
        step_title = step_info.get("title", "this step")
        total      = len(roadmap)

        if skipped or not user_answer:
            feedback = f"Step {step_index + 1} marked done! Every step forward counts. Keep going!"
            xp_gain  = 10
        else:
            try:
                resp = get_groq().chat.completions.create(
                    model    = "llama-3.3-70b-versatile",
                    messages = [
                        {"role": "system", "content": """You are a warm, encouraging coach.
The user just completed a step. Give specific, warm feedback in 2 sentences max.
Be real — find something genuine to praise."""},
                        {"role": "user", "content": f"Goal: {goal[0]}\nStep done: {step_title}\nReflection: {user_answer}\nGive warm encouragement."}
                    ],
                    max_tokens=120, temperature=0.8
                )
                feedback = resp.choices[0].message.content.strip()
                xp_gain  = 15
            except Exception:
                feedback = f"Great work completing '{step_title}'! Your reflection shows real effort. Keep this momentum!"
                xp_gain  = 10

        # Save step
        existing = db.execute(sql_text(
            "SELECT id FROM goal_steps WHERE goal_id=:gid AND step_index=:si"
        ), {"gid": goal_id, "si": step_index}).fetchone()

        if existing:
            db.execute(sql_text("""
                UPDATE goal_steps
                SET completed=TRUE, completed_at=CURRENT_TIMESTAMP,
                    user_answer=:ans, ai_feedback=:fb, score=:sc
                WHERE goal_id=:gid AND step_index=:si
            """), {"ans": user_answer, "fb": feedback, "sc": xp_gain * 6,
                   "gid": goal_id, "si": step_index})
        else:
            db.execute(sql_text("""
                INSERT INTO goal_steps
                (goal_id, step_index, completed, completed_at, user_answer, ai_feedback, score)
                VALUES (:gid, :si, TRUE, CURRENT_TIMESTAMP, :ans, :fb, :sc)
            """), {"gid": goal_id, "si": step_index,
                   "ans": user_answer, "fb": feedback, "sc": xp_gain * 6})
        db.commit()

        # Award XP
        if user_id:
            try:
                xp_row = db.execute(sql_text(
                    "SELECT xp FROM users WHERE id=:uid"
                ), {"uid": user_id}).fetchone()
                if xp_row:
                    db.execute(sql_text(
                        "UPDATE users SET xp=:xp WHERE id=:uid"
                    ), {"xp": (xp_row[0] or 0) + xp_gain, "uid": user_id})
                    db.commit()
            except Exception as xe:
                db.rollback(); print(f"XP error: {xe}")

        # Check goal done
        done_cnt  = db.execute(sql_text(
            "SELECT COUNT(*) FROM goal_steps WHERE goal_id=:gid AND completed=TRUE"
        ), {"gid": goal_id}).fetchone()[0]
        goal_done = done_cnt >= total and total > 0

        if goal_done:
            try:
                db.execute(sql_text("UPDATE goals SET completed=TRUE WHERE id=:gid"), {"gid": goal_id})
                if user_id:
                    xp_row2 = db.execute(sql_text("SELECT xp FROM users WHERE id=:uid"), {"uid": user_id}).fetchone()
                    if xp_row2:
                        db.execute(sql_text("UPDATE users SET xp=:xp WHERE id=:uid"), {"xp": (xp_row2[0] or 0) + 100, "uid": user_id})
                db.commit()
            except Exception as ce:
                db.rollback(); print(f"Goal complete error: {ce}")

        return jsonify({
            "passed": True, "feedback": feedback, "xp_gained": xp_gain,
            "next_step": step_index + 1 if step_index + 1 < total else None,
            "goal_completed": goal_done,
            "message": f"Step {step_index + 1} done! +{xp_gain} XP"
        })

    except Exception as e:
        db.rollback(); print(f"Prove error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@adaptive_bp.route("/adaptive/struggle/<int:goal_id>/<int:step_index>", methods=["POST"])
def report_struggle(goal_id, step_index):
    db = SessionLocal()
    try:
        data         = request.get_json()
        struggle_msg = data.get("message", "I am struggling with this step")

        goal = db.execute(sql_text(
            "SELECT title, roadmap FROM goals WHERE id=:gid"
        ), {"gid": goal_id}).fetchone()
        if not goal:
            return jsonify({"error": "Goal not found"}), 404

        roadmap   = json.loads(goal[1]) if goal[1] else []
        step_info = roadmap[step_index] if step_index < len(roadmap) else {}

        resp = get_groq().chat.completions.create(
            model    = "llama-3.3-70b-versatile",
            messages = [
                {"role": "system", "content": """The user is struggling. Break the step into 3 TINY micro-tasks.
Each must take 5-10 minutes max. Be extremely simple and encouraging.
Return JSON array: [{"title":"...","guidance":"...","duration":"5-10 mins"}]"""},
                {"role": "user", "content": f"Goal: {goal[0]}\nStruggling step: {step_info.get('title','current step')}\nUser says: {struggle_msg}\nBreak into 3 tiny micro-tasks."}
            ],
            max_tokens=350, temperature=0.7
        )
        raw = resp.choices[0].message.content.strip()
        if "```" in raw: raw = raw.split("```")[1].replace("json","").strip()
        start = raw.find("["); end = raw.rfind("]") + 1
        micro_tasks = json.loads(raw[start:end]) if start >= 0 else []

        return jsonify({
            "micro_tasks":   micro_tasks,
            "message":       "No worries! I've broken this into 3 smaller pieces.",
            "encouragement": "Every expert was once a beginner. Let's slow down and go step by step."
        })
    except Exception as e:
        print(f"Struggle error: {e}")
        return jsonify({"micro_tasks": [], "message": "Take a breath. Let's try a different approach.", "encouragement": "Struggling means you are learning."})
    finally:
        db.close()