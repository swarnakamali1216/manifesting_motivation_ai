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
def get_groq():
    return Groq(api_key=os.getenv('GROQ_API_KEY'))
analyzer = SentimentIntensityAnalyzer()

IST = 330  # UTC+5:30 minutes


def now_ist():
    return datetime.utcnow() + timedelta(minutes=IST)


def to_ist(dt):
    if dt is None: return None
    return dt + timedelta(minutes=IST)


def ist_date(dt):
    if dt is None: return None
    return to_ist(dt).date()


def _checkin_table(db):
    for tbl in ["check_ins", "checkins"]:
        try:
            result = db.execute(sql_text(
                "SELECT 1 FROM information_schema.tables WHERE table_name=:t LIMIT 1"
            ), {"t": tbl}).fetchone()
            if result:
                return tbl
        except Exception:
            pass
    return "check_ins"


def _all_activity_dates(db, user_id):
    from datetime import date as _date, datetime as _dt
    dates = set()
    checkin_tbl = _checkin_table(db)
    for tbl in ["motivation_sessions", checkin_tbl, "journal_entries"]:
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
    if not sorted_dates_desc: return 0
    today = now_ist().date()
    streak = 0
    check_day = today
    for d in sorted_dates_desc:
        if d == check_day:
            streak += 1
            check_day = check_day - timedelta(days=1)
        elif d == check_day - timedelta(days=1):
            streak += 1
            check_day = d - timedelta(days=1)
        elif d < check_day - timedelta(days=1):
            break
    return streak


# ── POST /api/checkin ────────────────────────────────────────────────────
@checkin_bp.route("/checkin", methods=["POST"])
def do_checkin():
    data    = request.get_json() or {}
    user_id = data.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id required"}), 400
    mood = data.get("mood", "neutral")
    note = data.get("note", "")

    # ── Step 1: Get AI reply (no DB needed) ─────────────────────────────
    memory_ctx = ""
    recent_ctx = ""
    db_ctx = SessionLocal()
    try:
        mem = db_ctx.execute(sql_text(
            "SELECT memory_text FROM ai_memory WHERE user_id=:uid LIMIT 1"
        ), {"uid": user_id}).fetchone()
        if mem and mem[0]:
            memory_ctx = "What I know about this user: " + mem[0][:300] + "\n"
    except Exception: pass
    try:
        r = db_ctx.execute(sql_text(
            "SELECT emotion FROM motivation_sessions WHERE user_id=:uid ORDER BY created_at DESC LIMIT 3"
        ), {"uid": user_id}).fetchall()
        if r: recent_ctx = "Recent mood: " + ", ".join([x[0] for x in r if x[0]]) + "\n"
    except Exception: pass
    finally:
        db_ctx.close()

    try:
        resp = get_groq().chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content":
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

    # ── Step 2: Save check-in in its OWN session and commit immediately ──
    # This is isolated so ai_memory errors CANNOT roll it back.
    db_save = SessionLocal()
    try:
        checkin = CheckIn(user_id=user_id, mood=mood, note=note, ai_reply=ai_reply)
        db_save.add(checkin)
        db_save.commit()
        print(f"[checkin] ✅ Saved check-in for user {user_id} mood={mood}")
    except Exception as e:
        print(f"[checkin] ❌ Save failed: {e}")
        try: db_save.rollback()
        except: pass
        db_save.close()
        return jsonify({"error": "Check-in save failed: " + str(e)}), 500
    finally:
        db_save.close()

    # ── Step 3: Update ai_memory in a SEPARATE session (failure is OK) ──
    today_str = now_ist().strftime("%Y-%m-%d")
    db_mem = SessionLocal()
    try:
        existing = db_mem.execute(sql_text(
            "SELECT id, memory_text FROM ai_memory WHERE user_id=:uid LIMIT 1"
        ), {"uid": user_id}).fetchone()

        if existing:
            new_text = (existing[1] or "") + f" Check-in: {mood} on {today_str}."
            db_mem.execute(sql_text("""
                UPDATE ai_memory SET
                    memory_text  = :mt,
                    last_emotion = :em,
                    session_count = COALESCE(session_count,0)+1,
                    updated_at   = :now
                WHERE user_id = :uid
            """), {"mt": new_text[:500], "em": mood, "now": datetime.utcnow(), "uid": user_id})
        else:
            # Only insert columns we know exist — skip "memory" column
            # which caused the original crash
            try:
                init = f"User mood: {mood}. First check-in: {today_str}."
                db_mem.execute(sql_text("""
                    INSERT INTO ai_memory (user_id, memory_text, session_count, last_emotion, updated_at)
                    VALUES (:uid, :mt, 1, :em, :now)
                """), {"uid": user_id, "mt": init, "em": mood, "now": datetime.utcnow()})
            except Exception as ie:
                print(f"[checkin] ai_memory insert skip: {ie}")
        db_mem.commit()
    except Exception as me:
        print(f"[checkin] ai_memory update skip (non-fatal): {me}")
        try: db_mem.rollback()
        except: pass
    finally:
        db_mem.close()

    return jsonify({"ai_reply": ai_reply, "mood": mood, "success": True})


# ── GET /api/checkin/history/<user_id> ──────────────────────────────────
@checkin_bp.route("/checkin/history/<int:user_id>", methods=["GET"])
def get_checkins(user_id):
    db = SessionLocal()
    try:
        tbl = _checkin_table(db)
        print(f"[checkin/history] Querying table: {tbl} for user {user_id}")
        rows = db.execute(sql_text(
            f"SELECT id, mood, note, ai_reply, created_at FROM {tbl} WHERE user_id=:uid ORDER BY created_at DESC"
        ), {"uid": user_id}).fetchall()
        print(f"[checkin/history] Found {len(rows)} rows")
        return jsonify([{
            "id":       r[0],
            "mood":     r[1] or "okay",
            "note":     r[2] or "",
            "ai_reply": r[3] or "",
            "date":     ist_date(r[4]).isoformat() if r[4] else None,
            "created_at": to_ist(r[4]).isoformat() if r[4] else None,
        } for r in rows])
    except Exception as e:
        print(f"[checkin/history] Error: {e}")
        try: db.rollback()
        except: pass
        return jsonify([])
    finally:
        db.close()


# ── GET /api/checkin/today/<user_id> ────────────────────────────────────
@checkin_bp.route("/checkin/today/<int:user_id>", methods=["GET"])
def checked_in_today(user_id):
    today = now_ist().date()
    db = SessionLocal()
    try:
        tbl = _checkin_table(db)
        rows = db.execute(sql_text(
            f"SELECT created_at FROM {tbl} WHERE user_id=:uid ORDER BY created_at DESC LIMIT 5"
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
    db = SessionLocal()
    try:
        all_dates = _all_activity_dates(db, user_id)
        streak = _calc_streak(all_dates)
        return jsonify({
            "streak": streak,
            "total_active_days": len(all_dates),
            "user_id": user_id
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
            "SELECT id,title FROM goals WHERE user_id=:uid AND (completed_at IS NULL OR completed IS NULL) ORDER BY id DESC LIMIT 1"
        ), {"uid": user_id}).fetchone()
        goal_id    = goal[0] if goal else None
        goal_title = goal[1] if goal else None

        steps_done = 0
        if goal_id:
            try:
                steps_done = db.execute(sql_text(
                    "SELECT COUNT(*) FROM goal_steps WHERE goal_id=:gid AND completed_at IS NOT NULL"
                ), {"gid": goal_id}).fetchone()[0] or 0
            except Exception: pass

        all_dates = _all_activity_dates(db, user_id)
        streak = _calc_streak(all_dates)
        hour = now_ist().hour
        time_of_day = "morning" if hour < 12 else "afternoon" if hour < 17 else "evening"

        if not session_moods:
            return jsonify({
                "nudge": "Welcome! Set your first goal and let's build your journey together.",
                "mood_type": "neutral", "streak": streak, "steps_done": 0,
                "goal_title": goal_title, "time_of_day": time_of_day
            })

        recent7   = session_moods[:7]
        pos_count = sum(1 for r in recent7 if r[0] == "positive")
        neg_count = sum(1 for r in recent7 if r[0] in ("negative", "stressed", "anxious", "sad"))
        total_mood = len(recent7)
        pos_ratio  = pos_count / total_mood if total_mood else 0
        neg_ratio  = neg_count / total_mood if total_mood else 0

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
                ai_resp = get_groq().chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[{"role": "user", "content":
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
            "nudge": nudge, "mood_type": mood_type, "streak": streak,
            "steps_done": steps_done, "goal_title": goal_title,
            "time_of_day": time_of_day, "pos_sessions": pos_count, "neg_sessions": neg_count
        })
    except Exception as e:
        print("Daily nudge error:", e)
        return jsonify({"nudge": "Good to see you. What are we working on today?", "mood_type": "neutral", "streak": 0})
    finally:
        db.close()