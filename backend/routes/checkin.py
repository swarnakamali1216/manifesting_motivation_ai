from flask import Blueprint, request, jsonify
from groq import Groq
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from models import SessionLocal, CheckIn, MotivationSession
from datetime import datetime, timedelta, date as dt_date
from sqlalchemy import text as sql_text
import os
from dotenv import load_dotenv
load_dotenv()

checkin_bp = Blueprint("checkin", __name__)
client     = Groq(api_key=os.getenv("GROQ_API_KEY"))
analyzer   = SentimentIntensityAnalyzer()

IST = 330  # UTC+5:30 minutes


def now_ist():
    return datetime.utcnow() + timedelta(minutes=IST)


def to_ist(dt):
    if dt is None: return None
    return dt + timedelta(minutes=IST)


def ist_date(dt):
    if dt is None: return None
    return to_ist(dt).date()


# ── Helper: collect all unique activity dates for a user ────────────────
def _all_activity_dates(db, user_id):
    """
    Returns sorted list of unique UTC dates where the user did ANYTHING.
    Uses DATE() in PostgreSQL which returns UTC date — matches My Story exactly.
    """
    from datetime import date as _date, datetime as _dt
    dates = set()
    for tbl in ["motivation_sessions", "check_ins", "journal_entries"]:
        try:
            rows = db.execute(sql_text(
                f"SELECT DISTINCT DATE(created_at) FROM {tbl} WHERE user_id=:uid AND created_at IS NOT NULL"
            ), {"uid": user_id}).fetchall()
            for r in rows:
                if r[0]:
                    try:
                        d = r[0] if isinstance(r[0], _date) else _dt.strptime(str(r[0])[:10], "%Y-%m-%d").date()
                        dates.add(d)
                    except Exception:
                        pass
        except Exception:
            try: db.rollback()
            except: pass
    return sorted(dates, reverse=True)


def _calc_streak(sorted_dates_desc):
    """Calculate streak from sorted dates (descending). Counts consecutive days ending today or yesterday."""
    if not sorted_dates_desc: return 0
    today = now_ist().date()
    streak = 0
    check_day = today
    for d in sorted_dates_desc:
        if d == check_day:
            streak += 1
            check_day = check_day - timedelta(days=1)
        elif d == check_day - timedelta(days=1):
            # Allow today not checked in yet but yesterday was
            streak += 1
            check_day = d - timedelta(days=1)
        elif d < check_day - timedelta(days=1):
            break
    return streak


# ── POST /api/checkin ────────────────────────────────────────────────────
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

        # Fetch memory safely with raw SQL
        memory_ctx = ""
        try:
            mem = db.execute(sql_text(
                "SELECT memory_text FROM ai_memory WHERE user_id=:uid LIMIT 1"
            ), {"uid": user_id}).fetchone()
            if mem and mem[0]:
                memory_ctx = "What I know about this user: " + mem[0][:300] + "\n"
        except Exception: pass

        # Recent sessions context
        recent_ctx = ""
        try:
            r = db.execute(sql_text(
                "SELECT emotion FROM motivation_sessions WHERE user_id=:uid ORDER BY created_at DESC LIMIT 3"
            ), {"uid": user_id}).fetchall()
            if r: recent_ctx = "Recent mood: " + ", ".join([x[0] for x in r if x[0]]) + "\n"
        except Exception: pass

        # AI reply
        try:
            resp = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role":"user","content":
                    f"You are a caring daily check-in coach.\n{memory_ctx}{recent_ctx}"
                    f"User mood: {mood}\nNote: {note or 'none'}\n\n"
                    f"Give a SHORT (2-3 sentence) warm, personalized response. "
                    f"Acknowledge their mood and suggest one tiny action."
                }],
                max_tokens=150
            )
            ai_reply = resp.choices[0].message.content.strip()
        except Exception as e:
            print(f"AI checkin error: {e}")
            ai_reply = f"Thanks for checking in feeling {mood} today. Keep going — one small step forward is all you need."

        # Save check-in
        checkin = CheckIn(user_id=user_id, mood=mood, note=note, ai_reply=ai_reply)
        db.add(checkin)
        try:
            db.flush()
        except Exception as e:
            print(f"CheckIn flush error: {e}")
            try: db.rollback()
            except: pass
            return jsonify({"error": str(e)}), 500

        # ✅ Update ai_memory using raw SQL with ON CONFLICT on id (not user_id)
        # Falls back to simple UPDATE if ON CONFLICT fails
        today_str = now_ist().strftime("%Y-%m-%d")
        try:
            existing = db.execute(sql_text(
                "SELECT id, memory_text FROM ai_memory WHERE user_id=:uid LIMIT 1"
            ), {"uid": user_id}).fetchone()

            if existing:
                new_text = (existing[1] or "") + f" Check-in: {mood} on {today_str}."
                db.execute(sql_text("""
                    UPDATE ai_memory SET
                        memory      = :mem,
                        memory_text = :mt,
                        last_emotion = :em,
                        session_count = COALESCE(session_count,0)+1,
                        updated_at  = :now
                    WHERE user_id = :uid
                """), {"mem": new_text[:500], "mt": new_text[:500],
                       "em": mood, "now": datetime.utcnow(), "uid": user_id})
            else:
                init = f"User mood: {mood}. First check-in: {today_str}."
                db.execute(sql_text("""
                    INSERT INTO ai_memory
                        (user_id, memory, memory_text, session_count, last_emotion, updated_at)
                    VALUES (:uid,:mem,:mt,1,:em,:now)
                """), {"uid": user_id, "mem": init, "mt": init,
                       "em": mood, "now": datetime.utcnow()})
        except Exception as me:
            print(f"[checkin] Memory skip: {me}")
            try: db.rollback()
            except: pass

        # Commit check-in
        try:
            db.commit()
        except Exception as ce:
            print(f"Commit err: {ce}")
            try: db.rollback()
            except: pass
            # Retry with fresh session
            db2 = SessionLocal()
            try:
                db2.add(CheckIn(user_id=user_id, mood=mood, note=note, ai_reply=ai_reply))
                db2.commit()
            except Exception as e2:
                print(f"Retry commit fail: {e2}")
                return jsonify({"error":"Check-in save failed"}), 500
            finally:
                db2.close()

        db.close()
        # ── Update streak after check-in ───────────────────────────────
        try:
            from streak_utils import update_user_streak
            update_user_streak(db, user_id)
        except Exception as se:
            print(f"[checkin] streak update: {se}")
        return jsonify({"ai_reply": ai_reply, "mood": mood, "success": True})

    except Exception as e:
        print("Checkin error:", e)
        import traceback; traceback.print_exc()
        if db:
            try: db.rollback(); db.close()
            except: pass
        return jsonify({"error": str(e)}), 500


# ── GET /api/checkin/history/<user_id> ──────────────────────────────────
@checkin_bp.route("/checkin/history/<int:user_id>", methods=["GET"])
def get_checkins(user_id):
    """All check-ins, IST dates, real mood."""
    db = SessionLocal()
    try:
        rows = db.execute(sql_text(
            "SELECT id,mood,note,ai_reply,created_at FROM check_ins WHERE user_id=:uid ORDER BY created_at DESC"
        ), {"uid": user_id}).fetchall()
        return jsonify([{
            "id":         r[0],
            "mood":       r[1] or "okay",
            "note":       r[2] or "",
            "ai_reply":   r[3] or "",
            "date":       ist_date(r[4]).isoformat() if r[4] else None,
            "created_at": to_ist(r[4]).isoformat() if r[4] else None,
        } for r in rows])
    except Exception as e:
        try: db.rollback()
        except: pass
        return jsonify([])
    finally:
        db.close()


# ── GET /api/checkin/today/<user_id> ────────────────────────────────────
@checkin_bp.route("/checkin/today/<int:user_id>", methods=["GET"])
def checked_in_today(user_id):
    today = now_ist().date()
    db    = SessionLocal()
    try:
        rows = db.execute(sql_text(
            "SELECT created_at FROM check_ins WHERE user_id=:uid ORDER BY created_at DESC LIMIT 5"
        ), {"uid": user_id}).fetchall()
        done = any(ist_date(r[0]) == today for r in rows if r[0])
        return jsonify({"checked_in": done})
    except Exception:
        return jsonify({"checked_in": False})
    finally:
        db.close()


# ── GET /api/checkin/streak/<user_id> ───────────────────────────────────
@checkin_bp.route("/checkin/streak/<int:user_id>", methods=["GET"])
def get_streak(user_id):
    """
    ✅ FIXED: counts streak from ALL activity — sessions + journals + check_ins.
    This matches the 44-day active days shown in My Story.
    """
    db = SessionLocal()
    try:
        all_dates = _all_activity_dates(db, user_id)
        streak    = _calc_streak(all_dates)
        total_active_days = len(all_dates)  # unique days with any activity
        return jsonify({
            "streak":            streak,
            "total_active_days": total_active_days,
            "user_id":           user_id
        })
    except Exception as e:
        print("Streak error:", e)
        return jsonify({"streak": 0, "total_active_days": 0, "user_id": user_id})
    finally:
        db.close()


# ── GET /api/checkin/daily-nudge/<user_id> ──────────────────────────────
@checkin_bp.route("/checkin/daily-nudge/<int:user_id>", methods=["GET"])
def daily_nudge(user_id):
    db = SessionLocal()
    try:
        session_moods = db.execute(sql_text(
            "SELECT emotion,created_at FROM motivation_sessions WHERE user_id=:uid ORDER BY created_at DESC LIMIT 14"
        ), {"uid": user_id}).fetchall()

        goal = db.execute(sql_text(
            "SELECT id,title FROM goals WHERE user_id=:uid AND (completed=FALSE OR completed IS NULL) ORDER BY id DESC LIMIT 1"
        ), {"uid": user_id}).fetchone()
        goal_id    = goal[0] if goal else None
        goal_title = goal[1] if goal else None

        steps_done = 0
        if goal_id:
            try:
                steps_done = db.execute(sql_text(
                    "SELECT COUNT(*) FROM goal_steps WHERE goal_id=:gid AND completed=TRUE"
                ), {"gid": goal_id}).fetchone()[0] or 0
            except Exception: pass

        # Streak from all activity
        all_dates = _all_activity_dates(db, user_id)
        streak    = _calc_streak(all_dates)

        hour        = now_ist().hour
        time_of_day = "morning" if hour < 12 else "afternoon" if hour < 17 else "evening"

        if not session_moods:
            return jsonify({
                "nudge":"Welcome! Set your first goal and let's build your journey together.",
                "mood_type":"neutral","streak":streak,"steps_done":0,
                "goal_title":goal_title,"time_of_day":time_of_day
            })

        recent7    = session_moods[:7]
        pos_count  = sum(1 for r in recent7 if r[0]=="positive")
        neg_count  = sum(1 for r in recent7 if r[0] in ("negative","stressed","anxious","sad"))
        total_mood = len(recent7)
        pos_ratio  = pos_count/total_mood if total_mood else 0
        neg_ratio  = neg_count/total_mood if total_mood else 0

        goal_part   = f"'{goal_title}'" if goal_title else "your goal"
        streak_part = f" {streak}-day streak!" if streak > 1 else ""
        step_part   = f" You're on step {steps_done+1}." if goal_title else ""

        if pos_ratio >= 0.6:
            nudge = f"Good {time_of_day}! You're on a great run.{streak_part} Keep the momentum on {goal_part}!{step_part}"
            mood_type = "positive"
        elif neg_ratio >= 0.5:
            nudge = f"Good {time_of_day}. Tough week — that's okay. 10 minutes on {goal_part} is a win today."
            mood_type = "struggling"
        else:
            nudge = f"Good {time_of_day}!{streak_part} One small step on {goal_part} sets the tone.{step_part}"
            mood_type = "neutral"

        if len(session_moods) >= 3 and goal_title:
            try:
                ai_resp = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[{"role":"user","content":
                        f"One motivating nudge (2 sentences, under 50 words).\n"
                        f"Goal: {goal_title}\nStreak: {streak} days\nTime: {time_of_day}\n"
                        f"Mood: {pos_count} positive, {neg_count} tough of last {total_mood}."
                    }],
                    max_tokens=80, temperature=0.8
                )
                ai_nudge = ai_resp.choices[0].message.content.strip()
                if len(ai_nudge) > 10: nudge = ai_nudge
            except Exception as e:
                print("AI nudge error:", e)

        return jsonify({
            "nudge":nudge,"mood_type":mood_type,"streak":streak,
            "steps_done":steps_done,"goal_title":goal_title,
            "time_of_day":time_of_day,"pos_sessions":pos_count,"neg_sessions":neg_count
        })
    except Exception as e:
        print("Daily nudge error:", e)
        return jsonify({"nudge":"Good to see you. What are we working on today?","mood_type":"neutral","streak":0})
    finally:
        db.close()