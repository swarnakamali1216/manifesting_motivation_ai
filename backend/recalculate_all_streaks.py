"""
recalculate_all_streaks.py
Run ONCE from backend/ folder: python recalculate_all_streaks.py

Recalculates correct IST-based streak for every user from ALL activity tables.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models import SessionLocal
from sqlalchemy import text as sql_text
from streak_utils import update_user_streak

db = SessionLocal()
try:
    # First add longest_streak column if it doesn't exist
    try:
        db.execute(sql_text("ALTER TABLE users ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0"))
        db.commit()
        print("✅ longest_streak column ensured")
    except Exception as e:
        try: db.rollback()
        except: pass
        print(f"  (longest_streak column may already exist: {e})")

    users = db.execute(sql_text("SELECT id, name FROM users ORDER BY id")).fetchall()
    print(f"\nRecalculating streaks for {len(users)} users...")
    print("-" * 50)

    for row in users:
        uid, name = row[0], row[1]
        streak, active_days = update_user_streak(db, uid)
        marker = "🔥" if streak > 1 else ("📅" if active_days > 0 else "⬜")
        print(f"  {marker} {name:<15} (id={uid}) → streak={streak}d, active_days={active_days}")

    print("\n" + "=" * 50)
    print("✅ All streaks recalculated from real IST activity!")
    print("\nVerification — current streaks:")
    rows = db.execute(sql_text(
        "SELECT name, current_streak, xp FROM users WHERE xp > 0 ORDER BY xp DESC LIMIT 10"
    )).fetchall()
    for r in rows:
        print(f"  {r[0]}: streak={r[1]}d, xp={r[2]}")
finally:
    db.close()