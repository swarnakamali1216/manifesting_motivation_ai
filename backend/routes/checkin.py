from flask import Blueprint, request, jsonify
from groq import Groq
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from models import SessionLocal, CheckIn, MotivationSession
from datetime import datetime, timedelta
from sqlalchemy import text as sql_text
import os
from dotenv import load_dotenv
load_dotenv()

checkin_bp = Blueprint("checkin", __name__)
client     = Groq(api_key=os.getenv("GROQ_API_KEY"))
analyzer   = SentimentIntensityAnalyzer()

IST = 330  # UTC+5:30 in minutes


def _now_ist():
    return datetime.utcnow() + timedelta(minutes=IST)


def _to_ist(dt):
    if dt is None: return None
    return dt + timedelta(minutes=IST)


@checkin_bp.route("/checkin", methods=["POST"])
def do_checkin():
    db = None
    try:
        data    = request.get_json()
        user_id = data.get("user_id")
        if not user_id:
            return jsonify({"error": "user_id required"}), 400
        mood = data.get("mood", "neutral")
        note = data.get("note", "")

        db = SessionLocal()

        # Fetch AI memory safely using raw SQL (avoids ORM column mismatch)
        memory_text_ctx = ""
        try:
            mem = db.execute(sql_text(
                "SELECT memory_text FROM ai_memory WHERE user_id=:uid LIMIT 1"
            ), {"uid": user_id}).fetchone()
            if mem and mem[0]:
                memory_text_ctx = "What I know about this user: " + mem[0] + "\n"
        except Exception:
            try: db.rollback()
            except: pass

        # Recent sessions for context
        recent_ctx = ""
        try:
            recent = db.execute(sql_text(
                "SELECT emotion FROM motivation_sessions WHERE user_id=:uid ORDER BY created_at DESC LIMIT 3"
            ), {"uid": user_id}).fetchall()
            if recent:
                recent_ctx = "Their recent mood pattern: " + ", ".join([r[0] for r in recent if r[0]]) + "\n"
        except Exception:
            try: db.rollback()
            except: pass

        # AI reply
        prompt = (
            "You are a caring daily check-in coach.\n"
            + memory_text_ctx + recent_ctx
            + f"User's current mood: {mood}\n"
            + f"User's note: {note if note else 'No note provided'}\n\n"
            + "Give a SHORT (2-3 sentence) warm, personalized daily check-in response. "
            + "Acknowledge their mood and give one tiny action for today."
        )
        try:
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role":"user","content":prompt}],
                max_tokens=150
            )
            ai_reply = response.choices[0].message.content.strip()
        except Exception as e:
            print(f"AI reply error: {e}")
            ai_reply = f"I hear you're feeling {mood} today. Take one small step forward — that's all you need."

        # Save check-in
        checkin = CheckIn(user_id=user_id, mood=mood, note=note, ai_reply=ai_reply)
        db.add(checkin)
        try:
            db.flush()  # flush check-in only first
        except Exception as e:
            print(f"CheckIn flush error: {e}")
            try: db.rollback()
            except: pass
            return jsonify({"error": str(e)}), 500

        # ✅ FIX: Update ai_memory using raw SQL — avoids NOT NULL constraint on 'memory' column
        today_str = _now_ist().strftime("%Y-%m-%d")
        try:
            existing_mem = db.execute(sql_text(
                "SELECT id, memory_text FROM ai_memory WHERE user_id=:uid LIMIT 1"
            ), {"uid": user_id}).fetchone()

            if not existing_mem:
                # ✅ INSERT with ALL columns including 'memory' to satisfy NOT NULL constraint
                db.execute(sql_text("""
                    INSERT INTO ai_memory (user_id, memory, memory_text, session_count, last_emotion, updated_at)
                    VALUES (:uid, :mem, :mem_text, 1, :emotion, :now)
                    ON CONFLICT (user_id) DO UPDATE SET
                        memory_text = EXCLUDED.memory_text,
                        last_emotion = EXCLUDED.last_emotion,
                        session_count = ai_memory.session_count + 1,
                        updated_at = EXCLUDED.updated_at
                """), {
                    "uid": user_id,
                    "mem": f"User prefers {mood} check-ins.",  # 'memory' column value
                    "mem_text": f"User prefers {mood} check-ins. First check-in on {today_str}.",
                    "emotion": mood,
                    "now": datetime.utcnow()
                })
            else:
                cur = existing_mem[1] or ""
                new_text = cur + f" Latest check-in mood: {mood} on {today_str}."
                db.execute(sql_text("""
                    UPDATE ai_memory SET
                        memory = :mem,
                        memory_text = :mem_text,
                        last_emotion = :emotion,
                        session_count = COALESCE(session_count, 0) + 1,
                        updated_at = :now
                    WHERE user_id = :uid
                """), {
                    "mem": new_text[:500],
                    "mem_text": new_text[:500],
                    "emotion": mood,
                    "now": datetime.utcnow(),
                    "uid": user_id
                })
        except Exception as mem_err:
            print(f"[checkin] Memory update skipped: {mem_err}")
            try: db.rollback()
            except: pass

        # Final commit (check-in is saved even if memory update fails)
        try:
            db.commit()
        except Exception as commit_err:
            print(f"[checkin] Commit error: {commit_err}")
            try: db.rollback()
            except: pass
            # Try saving check-in alone
            try:
                db2 = SessionLocal()
                c2  = CheckIn(user_id=user_id, mood=mood, note=note, ai_reply=ai_reply)
                db2.add(c2)
                db2.commit()
                db2.close()
            except Exception as e2:
                print(f"[checkin] Fallback commit error: {e2}")
                return jsonify({"error": "Check-in save failed"}), 500

        db.close()
        return jsonify({"ai_reply": ai_reply, "mood": mood, "success": True})

    except Exception as e:
        print("Checkin error:", e)
        import traceback; traceback.print_exc()
        if db:
            try: db.rollback(); db.close()
            except: pass
        return jsonify({"error": str(e)}), 500


@checkin_bp.route("/checkin/history/<int:user_id>", methods=["GET"])
def get_checkins(user_id):
    """Returns ALL checkins with REAL mood and IST-adjusted dates."""
    db = SessionLocal()
    try:
        rows = db.execute(sql_text(
            "SELECT id, mood, note, ai_reply, created_at FROM check_ins WHERE user_id=:uid ORDER BY created_at DESC"
        ), {"uid": user_id}).fetchall()
        return jsonify([{
            "id":         r[0],
            "mood":       r[1] or "okay",
            "note":       r[2] or "",
            "ai_reply":   r[3] or "",
            "date":       _to_ist(r[4]).strftime("%Y-%m-%d") if r[4] else None,
            "created_at": _to_ist(r[4]).isoformat() if r[4] else None,
        } for r in rows])
    except Exception as e:
        try: db.rollback()
        except: pass
        return jsonify([])
    finally:
        db.close()


@checkin_bp.route("/checkin/today/<int:user_id>", methods=["GET"])
def checked_in_today(user_id):
    """IST-aware: has user checked in today in IST timezone?"""
    today_ist = _now_ist().date()
    db = SessionLocal()
    try:
        rows = db.execute(sql_text(
            "SELECT created_at FROM check_ins WHERE user_id=:uid ORDER BY created_at DESC LIMIT 5"
        ), {"uid": user_id}).fetchall()
        done = any(_to_ist(r[0]).date() == today_ist for r in rows if r[0])
        return jsonify({"checked_in": done})
    except Exception:
        return jsonify({"checked_in": False})
    finally:
        db.close()


@checkin_bp.route("/checkin/streak/<int:user_id>", methods=["GET"])
def get_streak(user_id):
    """
    Real streak from check_ins table using IST dates.
    Counts consecutive days back from today.
    """
    db = SessionLocal()
    try:
        rows = db.execute(sql_text(
            "SELECT created_at FROM check_ins WHERE user_id=:uid ORDER BY created_at DESC"
        ), {"uid": user_id}).fetchall()

        if not rows:
            return jsonify({"streak": 0, "user_id": user_id})

        # Convert to IST dates
        ist_dates = sorted(set(
            _to_ist(r[0]).date() for r in rows if r[0]
        ), reverse=True)

        today_ist = _now_ist().date()
        streak    = 0
        check_day = today_ist

        for d in ist_dates:
            if d == check_day:
                streak   += 1
                check_day = check_day - timedelta(days=1)
            elif d == check_day - timedelta(days=1):
                # Allow gap of 1 day to start
                streak   += 1
                check_day = d - timedelta(days=1)
            elif d < check_day - timedelta(days=1):
                break

        return jsonify({"streak": streak, "user_id": user_id})
    except Exception as e:
        print("Streak error:", e)
        return jsonify({"streak": 0, "user_id": user_id})
    finally:
        db.close()


@checkin_bp.route("/checkin/daily-nudge/<int:user_id>", methods=["GET"])
def daily_nudge(user_id):
    db = SessionLocal()
    try:
        session_moods = db.execute(sql_text(
            "SELECT emotion, created_at FROM motivation_sessions WHERE user_id=:uid ORDER BY created_at DESC LIMIT 14"
        ), {"uid": user_id}).fetchall()

        goal = db.execute(sql_text(
            "SELECT id, title FROM goals WHERE user_id=:uid AND (completed=FALSE OR completed IS NULL) ORDER BY id DESC LIMIT 1"
        ), {"uid": user_id}).fetchone()

        goal_id    = goal[0] if goal else None
        goal_title = goal[1] if goal else None

        steps_done = 0
        if goal_id:
            try:
                steps_done = db.execute(sql_text(
                    "SELECT COUNT(*) FROM goal_steps WHERE goal_id=:gid AND completed=TRUE"
                ), {"gid": goal_id}).fetchone()[0] or 0
            except Exception:
                pass

        # Streak from check_ins
        streak = 0
        try:
            checkin_rows = db.execute(sql_text(
                "SELECT created_at FROM check_ins WHERE user_id=:uid ORDER BY created_at DESC"
            ), {"uid": user_id}).fetchall()
            ist_dates = sorted(set(_to_ist(r[0]).date() for r in checkin_rows if r[0]), reverse=True)
            today_ist = _now_ist().date()
            check_day = today_ist
            for d in ist_dates:
                if d == check_day or d == check_day - timedelta(days=1):
                    streak   += 1
                    check_day = d - timedelta(days=1)
                else:
                    break
        except Exception:
            pass

        hour = _now_ist().hour
        time_of_day = "morning" if hour < 12 else "afternoon" if hour < 17 else "evening"

        if not session_moods:
            return jsonify({
                "nudge":       "Welcome! Set your first goal and let's build your journey together.",
                "mood_type":   "neutral",
                "streak":      streak,
                "steps_done":  0,
                "goal_title":  goal_title,
                "time_of_day": time_of_day
            })

        recent7    = session_moods[:7]
        pos_count  = sum(1 for r in recent7 if r[0] == "positive")
        neg_count  = sum(1 for r in recent7 if r[0] in ("negative","stressed","anxious","sad"))
        total_mood = len(recent7)
        pos_ratio  = pos_count / total_mood if total_mood > 0 else 0
        neg_ratio  = neg_count / total_mood if total_mood > 0 else 0

        goal_part   = f"'{goal_title}'" if goal_title else "your goal"
        streak_part = f" Your streak is {streak} day{'s' if streak != 1 else ''}!" if streak > 1 else ""
        step_part   = f" You're on step {steps_done + 1}." if goal_title else ""

        if pos_ratio >= 0.6:
            nudge     = f"Good {time_of_day}! You've been on a great run lately.{streak_part} Keep the momentum on {goal_part} today!{step_part}"
            mood_type = "positive"
        elif neg_ratio >= 0.5:
            nudge     = f"Good {time_of_day}. This week has been tough — and that's okay. Even just 10 minutes on {goal_part} is a win today."
            mood_type = "struggling"
        else:
            nudge     = f"Good {time_of_day}!{streak_part} One small step on {goal_part} sets the tone for the whole day.{step_part}"
            mood_type = "neutral"

        if len(session_moods) >= 3 and goal_title:
            try:
                ai_resp = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[{"role":"user","content":
                        f"You are a warm daily coach. Write ONE motivating nudge (2 sentences, under 50 words).\n"
                        f"User's goal: {goal_title}\nStreak: {streak} days\nTime: {time_of_day}\n"
                        f"Mood trend: {pos_count} positive, {neg_count} difficult out of last {total_mood} sessions.\n"
                        f"Be warm and specific. Reference their actual goal."
                    }],
                    max_tokens=80, temperature=0.8
                )
                ai_nudge = ai_resp.choices[0].message.content.strip()
                if ai_nudge and len(ai_nudge) > 10:
                    nudge = ai_nudge
            except Exception as e:
                print("AI nudge error:", e)

        return jsonify({
            "nudge": nudge, "mood_type": mood_type,
            "streak": streak, "steps_done": steps_done,
            "goal_title": goal_title, "time_of_day": time_of_day,
            "pos_sessions": pos_count, "neg_sessions": neg_count
        })

    except Exception as e:
        print("Daily nudge error:", e)
        return jsonify({"nudge": "Good to see you. What are we working on today?", "mood_type": "neutral", "streak": 0})
    finally:
        db.close()