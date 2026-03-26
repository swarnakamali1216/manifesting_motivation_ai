"""
Run this to reset a user's password:
  cd C:\manifesting-motivation-ai\backend
  python reset_password.py
"""
import bcrypt
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import SessionLocal
from sqlalchemy import text as sql_text
from dotenv import load_dotenv
load_dotenv()

def reset_password():
    print("=" * 50)
    print("  PASSWORD RESET TOOL")
    print("=" * 50)

    db = SessionLocal()

    # Show all users
    rows = db.execute(sql_text("SELECT id, name, email FROM users ORDER BY id")).fetchall()
    print(f"\n📋 Users in database ({len(rows)} total):")
    for r in rows:
        print(f"   [{r[0]}] {r[1]} — {r[2]}")

    if not rows:
        print("\n❌ No users found! Register first.")
        db.close()
        return

    print("\n")
    email    = input("Enter email to reset: ").strip().lower()
    password = input("Enter new password (min 6 chars): ").strip()

    if len(password) < 6:
        print("❌ Password too short!")
        db.close()
        return

    # Hash with bcrypt
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    # Update
    result = db.execute(
        sql_text("UPDATE users SET password=:pw WHERE email=:e RETURNING id, name"),
        {"pw": hashed, "e": email}
    ).fetchone()

    if not result:
        print(f"❌ User not found: {email}")
        # Try to create
        create = input("\nCreate new user? (y/n): ").strip().lower()
        if create == "y":
            name = input("Name: ").strip() or email.split("@")[0]
            row = db.execute(sql_text("""
                INSERT INTO users (name, email, password, role, xp, level, badges)
                VALUES (:n, :e, :pw, 'user', 0, 1, '[]')
                RETURNING id
            """), {"n": name, "e": email, "pw": hashed}).fetchone()
            db.commit()
            print(f"\n✅ Created user: {name} ({email}) — id={row[0]}")
            print(f"   Password: {password}")
    else:
        db.commit()
        print(f"\n✅ Password reset for: {result[1]} ({email})")
        print(f"   New password: {password}")
        print(f"\n   Now login at: http://localhost:3000")

    db.close()
    print("\n" + "=" * 50)

if __name__ == "__main__":
    reset_password()