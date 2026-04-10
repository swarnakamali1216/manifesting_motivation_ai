"""
routes/gamification.py — Fixed: total_goals and journals now fetched from real tables
"""
from flask import Blueprint, request, jsonify
from models import SessionLocal
from sqlalchemy import text as sql_text
from datetime import date, timedelta
import json

gamification_bp = Blueprint("gamification", __name__)

LEVELS = [
    {"level":1,  "name":"Seedling",     "emoji":"🌱", "xp_required":0,     "desc":"Just getting started",      "color":"#4ade80"},
    {"level":2,  "name":"Explorer",     "emoji":"🧭", "xp_required":100,   "desc":"Curious & building habits", "color":"#60a5fa"},
    {"level":3,  "name":"Achiever",     "emoji":"🎯", "xp_required":300,   "desc":"Goal-setting machine",      "color":"#a78bfa"},
    {"level":4,  "name":"Challenger",   "emoji":"⚡", "xp_required":600,   "desc":"Pushing past comfort zones","color":"#fbbf24"},
    {"level":5,  "name":"Warrior",      "emoji":"🔥", "xp_required":1000,  "desc":"Unstoppable momentum",      "color":"#fb923c"},
    {"level":6,  "name":"Champion",     "emoji":"🏆", "xp_required":1800,  "desc":"Consistent & disciplined",  "color":"#e879f9"},
    {"level":7,  "name":"Master",       "emoji":"⭐", "xp_required":3000,  "desc":"Peak performance habits",   "color":"#7c5cfc"},
    {"level":8,  "name":"Elite",        "emoji":"💎", "xp_required":5000,  "desc":"Top 5% of users",           "color":"#06b6d4"},
    {"level":9,  "name":"Legend",       "emoji":"🌟", "xp_required":8000,  "desc":"Inspiring others",          "color":"#f59e0b"},
    {"level":10, "name":"Transcendent", "emoji":"🚀", "xp_required":12000, "desc":"You have transcended",      "color":"#ff6b6b"},
    {"level":11, "name":"Sage",         "emoji":"🔮", "xp_required":17000, "desc":"Wisdom through consistency","color":"#8b5cf6"},
    {"level":12, "name":"Titan",        "emoji":"⚔️", "xp_required":24000, "desc":"Unstoppable force",         "color":"#ec4899"},
    {"level":13, "name":"Immortal",     "emoji":"👁️", "xp_required":35000, "desc":"Beyond limits",             "color":"#14b8a6"},
    {"level":14, "name":"Mythic",       "emoji":"🌀", "xp_required":50000, "desc":"A living legend",           "color":"#f97316"},
    {"level":15, "name":"Eternal",      "emoji":"✨", "xp_required":75000, "desc":"You are the motivation",    "color":"#eab308"},
]

ALL_BADGES = [
    {"id":"first_step","name":"First Step","emoji":"🌱","desc":"Complete your first AI session","xp":10,"category":"journey","req":"1 session"},
    {"id":"chat_5","name":"Conversationalist","emoji":"💬","desc":"5 AI sessions","xp":25,"category":"journey","req":"5 sessions"},
    {"id":"chat_25","name":"Deep Diver","emoji":"🤿","desc":"25 AI sessions","xp":50,"category":"journey","req":"25 sessions"},
    {"id":"chat_50","name":"Dedicated","emoji":"🎓","desc":"50 AI sessions","xp":80,"category":"journey","req":"50 sessions"},
    {"id":"chat_100","name":"AI Veteran","emoji":"🏅","desc":"100 AI sessions","xp":150,"category":"journey","req":"100 sessions"},
    {"id":"chat_250","name":"Philosopher","emoji":"🧘","desc":"250 AI sessions","xp":300,"category":"journey","req":"250 sessions"},
    {"id":"chat_500","name":"Coach's Best","emoji":"🤝","desc":"500 sessions","xp":500,"category":"journey","req":"500 sessions"},
    {"id":"chat_1000","name":"Thousand Talks","emoji":"🌐","desc":"1000 sessions","xp":1000,"category":"journey","req":"1000 sessions"},
    {"id":"streak_3","name":"3-Day Streak","emoji":"🔥","desc":"3 days in a row","xp":30,"category":"streaks","req":"3-day streak"},
    {"id":"streak_7","name":"Week Warrior","emoji":"⚡","desc":"7-day streak","xp":70,"category":"streaks","req":"7-day streak"},
    {"id":"streak_14","name":"Fortnight Fighter","emoji":"💪","desc":"14-day streak","xp":120,"category":"streaks","req":"14-day streak"},
    {"id":"streak_21","name":"Habit Formed","emoji":"🧠","desc":"21-day streak","xp":200,"category":"streaks","req":"21-day streak"},
    {"id":"streak_30","name":"Monthly Master","emoji":"🏆","desc":"30-day streak","xp":300,"category":"streaks","req":"30-day streak"},
    {"id":"streak_60","name":"Iron Will","emoji":"⚙️","desc":"60-day streak","xp":500,"category":"streaks","req":"60-day streak"},
    {"id":"streak_90","name":"Ninety Days","emoji":"🌙","desc":"90-day streak","xp":800,"category":"streaks","req":"90-day streak"},
    {"id":"streak_180","name":"Half Year Hero","emoji":"🌅","desc":"180-day streak","xp":1500,"category":"streaks","req":"180-day streak"},
    {"id":"goal_first","name":"Dream Starter","emoji":"🎯","desc":"Create your first goal","xp":10,"category":"goals","req":"1 goal"},
    {"id":"goal_done_1","name":"Goal Crusher","emoji":"✅","desc":"Complete first goal","xp":50,"category":"goals","req":"1 done"},
    {"id":"goal_done_3","name":"Trifecta","emoji":"🎪","desc":"3 goals done","xp":100,"category":"goals","req":"3 done"},
    {"id":"goal_done_5","name":"Achievement Hunter","emoji":"🦁","desc":"5 goals done","xp":150,"category":"goals","req":"5 done"},
    {"id":"goal_done_10","name":"Goal Master","emoji":"👑","desc":"10 goals done","xp":300,"category":"goals","req":"10 done"},
    {"id":"goal_done_25","name":"Manifestor","emoji":"🌠","desc":"25 goals done","xp":600,"category":"goals","req":"25 done"},
    {"id":"goal_done_50","name":"Goal God","emoji":"🔱","desc":"50 goals done","xp":1000,"category":"goals","req":"50 done"},
    {"id":"journal_first","name":"First Entry","emoji":"📓","desc":"Write first journal entry","xp":10,"category":"journal","req":"1 entry"},
    {"id":"journal_7","name":"Reflective Soul","emoji":"🌙","desc":"7 journal entries","xp":50,"category":"journal","req":"7 entries"},
    {"id":"journal_30","name":"Chronicler","emoji":"📚","desc":"30 journal entries","xp":150,"category":"journal","req":"30 entries"},
    {"id":"journal_100","name":"Memoir Writer","emoji":"✍️","desc":"100 journal entries","xp":400,"category":"journal","req":"100 entries"},
    {"id":"journal_365","name":"Year in Review","emoji":"📅","desc":"365 journal entries","xp":1000,"category":"journal","req":"365 entries"},
    {"id":"journal_night","name":"Night Owl","emoji":"🦉","desc":"Journal entry after 10 PM","xp":30,"category":"journal","req":"after 10pm"},
    {"id":"mood_pos_5","name":"Good Vibes","emoji":"😊","desc":"5 positive sessions","xp":30,"category":"mood","req":"5 positive"},
    {"id":"mood_pos_25","name":"Optimist","emoji":"☀️","desc":"25 positive sessions","xp":100,"category":"mood","req":"25 positive"},
    {"id":"mood_pos_100","name":"Sunshine","emoji":"🌞","desc":"100 positive sessions","xp":400,"category":"mood","req":"100 positive"},
    {"id":"mood_resilient","name":"Resilient","emoji":"🌈","desc":"Bounce back after tough sessions","xp":60,"category":"mood","req":"bounce back"},
    {"id":"mood_7days","name":"Mood Tracker","emoji":"📊","desc":"7 days tracked","xp":80,"category":"mood","req":"7 days"},
    {"id":"checkin_30","name":"Check-in Champion","emoji":"✅","desc":"Check in 30 times","xp":100,"category":"mood","req":"30 check-ins"},
    {"id":"xp_100","name":"First Hundred","emoji":"💯","desc":"Earn 100 XP","xp":0,"category":"levels","req":"100 XP"},
    {"id":"xp_500","name":"High Achiever","emoji":"🎖️","desc":"Earn 500 XP","xp":0,"category":"levels","req":"500 XP"},
    {"id":"xp_1000","name":"Grand","emoji":"🏵️","desc":"Earn 1000 XP","xp":0,"category":"levels","req":"1000 XP"},
    {"id":"xp_5000","name":"Elite Earner","emoji":"💎","desc":"Earn 5000 XP","xp":0,"category":"levels","req":"5000 XP"},
    {"id":"xp_10000","name":"XP Legend","emoji":"🌟","desc":"Earn 10000 XP","xp":0,"category":"levels","req":"10000 XP"},
    {"id":"level_10","name":"Transcendent","emoji":"🚀","desc":"Reach Level 10","xp":500,"category":"levels","req":"Level 10"},
    {"id":"invite_1","name":"Connector","emoji":"🤝","desc":"Invite first friend","xp":50,"category":"social","req":"1 invited"},
    {"id":"invite_5","name":"Recruiter","emoji":"📢","desc":"5 friends joined","xp":200,"category":"social","req":"5 joined"},
    {"id":"invite_10","name":"Community Builder","emoji":"🌍","desc":"10 friends joined","xp":500,"category":"social","req":"10 joined"},
    {"id":"invite_squad","name":"Squad Goals","emoji":"👥","desc":"3+ active friends","xp":150,"category":"social","req":"3 active"},
    {"id":"early_bird","name":"Early Bird","emoji":"🌅","desc":"Session before 7 AM","xp":40,"category":"special","req":"before 7am"},
    {"id":"night_session","name":"Night Hustler","emoji":"🌃","desc":"Session after midnight","xp":40,"category":"special","req":"after midnight"},
    {"id":"comeback","name":"Phoenix","emoji":"🦅","desc":"Return after 7+ day break","xp":100,"category":"special","req":"comeback"},
    {"id":"weekend_warrior","name":"Weekend Warrior","emoji":"🏖️","desc":"Sessions Sat & Sun","xp":60,"category":"special","req":"Sat+Sun"},
    {"id":"all_rounder","name":"All-Rounder","emoji":"🎭","desc":"All 5 personas used","xp":150,"category":"special","req":"5 personas"},
]

BADGE_MAP = {b["id"]: b for b in ALL_BADGES}


def xp_to_level(xp):
    current = LEVELS[0]
    for lvl in LEVELS:
        if xp >= lvl["xp_required"]: current = lvl
        else: break
    return current


def next_level_info(xp):
    for lvl in LEVELS:
        if xp < lvl["xp_required"]: return lvl
    return None


def _get_badge_ids(db, user_id):
    try:
        row = db.execute(sql_text("SELECT badges FROM users WHERE id=:uid"), {"uid": user_id}).fetchone()
        if row and row[0]:
            data = json.loads(row[0]) if isinstance(row[0], str) else (row[0] or [])
            result = []
            for item in data:
                if isinstance(item, str): result.append(item)
                elif isinstance(item, dict): result.append(item.get("id") or "")
            return [x for x in result if x]
    except Exception: pass
    return []


def _save_badge_ids(db, user_id, badge_ids):
    try:
        db.execute(sql_text("UPDATE users SET badges=:b WHERE id=:uid"), {"b": json.dumps(badge_ids), "uid": user_id})
        db.commit()
    except Exception:
        try: db.rollback()
        except: pass


def award_badge(db, user_id, badge_id):
    existing = _get_badge_ids(db, user_id)
    if badge_id in existing: return None
    badge = BADGE_MAP.get(badge_id)
    if not badge: return None
    existing.append(badge_id)
    _save_badge_ids(db, user_id, existing)
    if badge["xp"] > 0:
        try:
            db.execute(sql_text("UPDATE users SET xp=COALESCE(xp,0)+:xp WHERE id=:uid"), {"xp": badge["xp"], "uid": user_id})
            db.commit()
        except Exception:
            try: db.rollback()
            except: pass
    print(f"🏅 Badge awarded: {badge_id} → user {user_id} (+{badge['xp']} XP)")
    return badge


def safe_count(db, sql, params):
    try:
        r = db.execute(sql_text(sql), params).fetchone()
        return r[0] if r else 0
    except Exception:
        try: db.rollback()
        except: pass
        return 0


def check_and_award_badges(db, user_id):
    newly = []
    try:
        sessions      = safe_count(db, "SELECT COUNT(*) FROM motivation_sessions WHERE user_id=:uid", {"uid": user_id})
        goals_created = safe_count(db, "SELECT COUNT(*) FROM goals WHERE user_id=:uid", {"uid": user_id})
        goals_done    = safe_count(db, "SELECT COUNT(*) FROM goals WHERE user_id=:uid AND (completed=TRUE OR is_complete=TRUE)", {"uid": user_id})
        journals      = safe_count(db, "SELECT COUNT(*) FROM journal_entries WHERE user_id=:uid", {"uid": user_id})
        checkins      = safe_count(db, "SELECT COUNT(*) FROM check_ins WHERE user_id=:uid", {"uid": user_id})
        pos_sessions  = safe_count(db, "SELECT COUNT(*) FROM motivation_sessions WHERE user_id=:uid AND emotion IN ('positive','excited','hopeful')", {"uid": user_id})
        xp            = safe_count(db, "SELECT COALESCE(xp,0) FROM users WHERE id=:uid", {"uid": user_id})
        streak        = safe_count(db, "SELECT COALESCE(current_streak,0) FROM users WHERE id=:uid", {"uid": user_id})

        invites_joined = 0
        try:
            r = db.execute(sql_text("SELECT COUNT(*) FROM invites WHERE inviter_id=:uid AND status='joined'"), {"uid": user_id}).fetchone()
            invites_joined = r[0] if r else 0
        except Exception: pass

        early_count = safe_count(db, "SELECT COUNT(*) FROM motivation_sessions WHERE user_id=:uid AND EXTRACT(HOUR FROM created_at) < 7", {"uid": user_id})
        night_count = safe_count(db, "SELECT COUNT(*) FROM motivation_sessions WHERE user_id=:uid AND EXTRACT(HOUR FROM created_at) = 0", {"uid": user_id})
        night_journal = safe_count(db, "SELECT COUNT(*) FROM journal_entries WHERE user_id=:uid AND EXTRACT(HOUR FROM created_at) >= 22", {"uid": user_id})

        weekend_both = False
        try:
            w = db.execute(sql_text("SELECT COUNT(DISTINCT EXTRACT(DOW FROM created_at)::int) FROM motivation_sessions WHERE user_id=:uid AND EXTRACT(DOW FROM created_at) IN (0,6)"), {"uid": user_id}).fetchone()
            weekend_both = (w[0] if w else 0) >= 2
        except Exception: pass

        comeback = False
        try:
            dates = db.execute(sql_text("SELECT DATE(created_at) FROM motivation_sessions WHERE user_id=:uid ORDER BY created_at DESC LIMIT 100"), {"uid": user_id}).fetchall()
            sd = sorted(set(str(r[0]) for r in dates))
            for i in range(1, len(sd)):
                if (date.fromisoformat(sd[i]) - date.fromisoformat(sd[i-1])).days > 7:
                    comeback = True; break
        except Exception: pass

        persona_count = safe_count(db, "SELECT COUNT(DISTINCT persona) FROM motivation_sessions WHERE user_id=:uid AND persona IS NOT NULL", {"uid": user_id})

        tough_then_pos = False
        try:
            emos = [r[0] for r in db.execute(sql_text("SELECT emotion FROM motivation_sessions WHERE user_id=:uid ORDER BY created_at DESC LIMIT 10"), {"uid": user_id}).fetchall()]
            tough_then_pos = len(emos)>=4 and any(e in ("sad","stressed","negative") for e in emos[3:]) and emos[0] in ("positive","excited","hopeful")
        except Exception: pass

        mood_7_count = 0
        try:
            m7 = db.execute(sql_text("SELECT COUNT(DISTINCT DATE(created_at)) FROM motivation_sessions WHERE user_id=:uid AND created_at >= :d"), {"uid": user_id, "d": date.today()-timedelta(days=7)}).fetchone()
            mood_7_count = m7[0] if m7 else 0
        except Exception: pass

        checks = [
            ("first_step", sessions>=1), ("chat_5", sessions>=5), ("chat_25", sessions>=25),
            ("chat_50", sessions>=50), ("chat_100", sessions>=100), ("chat_250", sessions>=250),
            ("chat_500", sessions>=500), ("chat_1000", sessions>=1000),
            ("streak_3", streak>=3), ("streak_7", streak>=7), ("streak_14", streak>=14),
            ("streak_21", streak>=21), ("streak_30", streak>=30), ("streak_60", streak>=60),
            ("streak_90", streak>=90), ("streak_180", streak>=180),
            ("goal_first", goals_created>=1), ("goal_done_1", goals_done>=1),
            ("goal_done_3", goals_done>=3), ("goal_done_5", goals_done>=5),
            ("goal_done_10", goals_done>=10), ("goal_done_25", goals_done>=25), ("goal_done_50", goals_done>=50),
            ("journal_first", journals>=1), ("journal_7", journals>=7), ("journal_30", journals>=30),
            ("journal_100", journals>=100), ("journal_365", journals>=365), ("journal_night", night_journal>=1),
            ("mood_pos_5", pos_sessions>=5), ("mood_pos_25", pos_sessions>=25), ("mood_pos_100", pos_sessions>=100),
            ("mood_resilient", tough_then_pos), ("mood_7days", mood_7_count>=7), ("checkin_30", checkins>=30),
            ("xp_100", xp>=100), ("xp_500", xp>=500), ("xp_1000", xp>=1000),
            ("xp_5000", xp>=5000), ("xp_10000", xp>=10000), ("level_10", xp_to_level(xp)["level"]>=10),
            ("invite_1", invites_joined>=1), ("invite_5", invites_joined>=5), ("invite_10", invites_joined>=10),
            ("early_bird", early_count>=1), ("night_session", night_count>=1),
            ("comeback", comeback), ("weekend_warrior", weekend_both), ("all_rounder", persona_count>=5),
        ]
        for badge_id, condition in checks:
            if condition:
                b = award_badge(db, user_id, badge_id)
                if b: newly.append(b)
    except Exception as e:
        print(f"Badge check error: {e}")
        import traceback; traceback.print_exc()
    return newly


@gamification_bp.route("/gamification/badges", methods=["GET"])
def get_all_badges():
    return jsonify(ALL_BADGES)


@gamification_bp.route("/gamification/levels", methods=["GET"])
def get_levels():
    return jsonify(LEVELS)


@gamification_bp.route("/gamification/stats/<int:uid>", methods=["GET"])
def user_gamification_stats(uid):
    db = SessionLocal()
    try:
        row = db.execute(sql_text("SELECT xp, level, current_streak, badges FROM users WHERE id=:uid"), {"uid": uid}).fetchone()
        if not row:
            return jsonify({"error": "User not found"}), 404

        raw_xp  = row[0] or 0
        streak  = row[2] or 0
        held_ids = _get_badge_ids(db, uid)
        current_lvl = xp_to_level(raw_xp)
        nxt = next_level_info(raw_xp)
        xp_to_next = (nxt["xp_required"] - raw_xp) if nxt else 0
        progress_pct = 0
        if nxt:
            span = nxt["xp_required"] - current_lvl["xp_required"]
            done = raw_xp - current_lvl["xp_required"]
            progress_pct = round((done / max(1, span)) * 100, 1)

        # ✅ KEY FIX: fetch real counts from actual tables
        total_sessions  = safe_count(db, "SELECT COUNT(*) FROM motivation_sessions WHERE user_id=:uid", {"uid": uid})
        pos_sessions    = safe_count(db, "SELECT COUNT(*) FROM motivation_sessions WHERE user_id=:uid AND emotion IN ('positive','excited','hopeful')", {"uid": uid})
        tough_sessions  = safe_count(db, "SELECT COUNT(*) FROM motivation_sessions WHERE user_id=:uid AND emotion IN ('negative','sad','stressed')", {"uid": uid})
        total_goals     = safe_count(db, "SELECT COUNT(*) FROM goals WHERE user_id=:uid", {"uid": uid})
        goals_done      = safe_count(db, "SELECT COUNT(*) FROM goals WHERE user_id=:uid AND (completed=TRUE OR is_complete=TRUE)", {"uid": uid})
        total_journals  = safe_count(db, "SELECT COUNT(*) FROM journal_entries WHERE user_id=:uid", {"uid": uid})

        enriched = [{**b, "earned": b["id"] in held_ids} for b in ALL_BADGES]
        newly = check_and_award_badges(db, uid)

        try:
            db.execute(sql_text("UPDATE users SET level=:lv WHERE id=:uid"), {"lv": current_lvl["level"], "uid": uid})
            db.commit()
        except Exception:
            try: db.rollback()
            except: pass

        row2 = db.execute(sql_text("SELECT xp FROM users WHERE id=:uid"), {"uid": uid}).fetchone()
        final_xp = row2[0] if row2 else raw_xp

        return jsonify({
            "xp": final_xp,
            "level": current_lvl,
            "next_level": nxt,
            "xp_to_next": xp_to_next,
            "progress_pct": progress_pct,
            "streak": streak,
            "total_sessions": total_sessions,
            "positive_sessions": pos_sessions,
            "tough_sessions": tough_sessions,
            "total_goals": total_goals,        # ✅ real count
            "goals_done": goals_done,           # ✅ real count
            "journals": total_journals,         # ✅ real count
            "badges": enriched,
            "badges_earned": len(held_ids),
            "badges_total": len(ALL_BADGES),
            "levels": LEVELS,
            "newly_awarded": newly,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@gamification_bp.route("/gamification/profile", methods=["GET"])
def gamification_profile():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id required"}), 400
    return user_gamification_stats(int(user_id))


@gamification_bp.route("/gamification/award", methods=["POST", "OPTIONS"])
def award_post():
    if request.method == "OPTIONS": return "", 200
    data = request.get_json() or {}
    uid = data.get("user_id") or data.get("uid")
    if not uid: return jsonify({"error": "user_id required"}), 400
    db = SessionLocal()
    try:
        newly = check_and_award_badges(db, int(uid))
        db.commit()
        return jsonify({"newly_awarded": newly, "count": len(newly)})
    except Exception as e:
        try: db.rollback()
        except: pass
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@gamification_bp.route("/gamification/leaderboard", methods=["GET"])
def leaderboard():
    db = SessionLocal()
    try:
        rows = db.execute(sql_text("SELECT id, name, xp, level, current_streak, badges FROM users ORDER BY xp DESC LIMIT 20")).fetchall()
        result = []
        for i, r in enumerate(rows):
            held = _get_badge_ids(db, r[0])
            lvl = xp_to_level(r[2] or 0)
            result.append({"rank":i+1,"id":r[0],"name":r[1]or"User","xp":r[2]or 0,"level":lvl,"streak":r[4]or 0,"badge_count":len(held)})
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@gamification_bp.route("/gamification/check-badges/<int:uid>", methods=["POST"])
def trigger_badge_check(uid):
    db = SessionLocal()
    try:
        newly = check_and_award_badges(db, uid)
        return jsonify({"newly_awarded": newly, "count": len(newly)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()