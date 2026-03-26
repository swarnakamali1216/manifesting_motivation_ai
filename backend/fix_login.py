"""
Run this to fix login:
  cd C:\manifesting-motivation-ai\backend
  python fix_login.py
"""
import bcrypt
import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from models import SessionLocal
from sqlalchemy import text as sql_text
from dotenv import load_dotenv
load_dotenv()

def fix_login():
    print("=" * 55)
    print("  LOGIN FIX TOOL")
    print("=" * 55)
    db = SessionLocal()

    # Step 1: Find real password column name
    cols = db.execute(sql_text("""
        SELECT column_name FROM information_schema.columns
        WHERE table_name='users' ORDER BY ordinal_position
    """)).fetchall()
    col_names = [c[0] for c in cols]
    print(f"\n📋 users table columns: {col_names}")

    # Detect password column
    pw_col = None
    for candidate in ["password_hash", "password", "passwd", "pw", "hashed_password"]:
        if candidate in col_names:
            pw_col = candidate
            break

    if not pw_col:
        print("\n❌ No password column found!")
        print("   Columns available:", col_names)
        db.close()
        return

    print(f"\n✅ Password column found: '{pw_col}'")

    # Step 2: Show all users
    rows = db.execute(sql_text("SELECT id, name, email FROM users ORDER BY id")).fetchall()
    print(f"\n👥 Users ({len(rows)} total):")
    for r in rows:
        print(f"   [{r[0]}] {r[1]} — {r[2]}")

    # Step 3: Reset password for ALL users to "Max12345"
    new_password = "Max12345"
    hashed = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()

    print(f"\n🔄 Resetting ALL users' passwords to: {new_password}")
    db.execute(sql_text(f"UPDATE users SET {pw_col}=:pw"), {"pw": hashed})
    db.commit()

    print(f"\n✅ ALL passwords reset to: {new_password}")
    print(f"\n   Login with ANY of these:")
    for r in rows:
        print(f"   📧 {r[2]}  🔑 {new_password}")

    print(f"\n   Then go to: http://localhost:3000")
    print("=" * 55)
    db.close()

if __name__ == "__main__":
    fix_login()