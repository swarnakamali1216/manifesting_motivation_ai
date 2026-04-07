"""
streak_utils.py  —  Shared streak recalculation utility
Place at: backend/streak_utils.py

Call update_user_streak(db, user_id) after any activity.
Returns (streak, total_active_days).
"""
from sqlalchemy import text as sql_text
from datetime import datetime, timedelta, date as dt_date

IST_MIN = 330  # UTC+5:30


def now_ist():
    return datetime.utcnow() + timedelta(minutes=IST_MIN)


def _all_activity_dates(db, user_id):
    """Unique IST calendar dates across all 3 activity tables."""
    dates = set()
    for tbl in ["motivation_sessions", "check_ins", "journal_entries"]:
        try:
            rows = db.execute(sql_text(
                f"SELECT DISTINCT DATE(created_at + INTERVAL '330 minutes') "
                f"FROM {tbl} WHERE user_id=:uid AND created_at IS NOT NULL"
            ), {"uid": user_id}).fetchall()
            for r in rows:
                if r[0]:
                    try:
                        d = r[0] if isinstance(r[0], dt_date) \
                            else datetime.strptime(str(r[0])[:10], "%Y-%m-%d").date()
                        dates.add(d)
                    except Exception:
                        pass
        except Exception as e:
            print(f"[streak_utils] date query error on {tbl}: {e}")
            try: db.rollback()
            except: pass
    return sorted(dates, reverse=True)


def _calc_streak(sorted_dates_desc):
    """Consecutive-day streak ending today or yesterday (IST)."""
    if not sorted_dates_desc:
        return 0
    today     = now_ist().date()
    yesterday = today - timedelta(days=1)
    streak    = 0
    expected  = today
    for d in sorted_dates_desc:
        if d == expected:
            streak  += 1
            expected = d - timedelta(days=1)
        elif d == yesterday and streak == 0:
            # Allow streak starting yesterday (user hasn't done today yet)
            streak  = 1
            expected = yesterday - timedelta(days=1)
        elif d < expected:
            break
    return streak


def update_user_streak(db, user_id):
    """
    Recalculate current_streak from real activity and write to users table.
    Returns (streak: int, total_active_days: int).
    """
    if not user_id:
        return 0, 0
    try:
        all_dates         = _all_activity_dates(db, user_id)
        streak            = _calc_streak(all_dates)
        total_active_days = len(all_dates)

        # Only update current_streak — safe on all schema versions
        db.execute(sql_text(
            "UPDATE users SET current_streak = :s WHERE id = :uid"
        ), {"s": streak, "uid": user_id})
        db.commit()

        print(f"[streak_utils] user {user_id}: streak={streak}, active_days={total_active_days}")
        return streak, total_active_days

    except Exception as e:
        print(f"[streak_utils] update_user_streak error for user {user_id}: {e}")
        try: db.rollback()
        except: pass
        return 0, 0