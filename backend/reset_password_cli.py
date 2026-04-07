"""
reset_password_cli.py
Run from backend folder:
  python reset_password_cli.py swarnakamali12@gmail.com Max12345
  python reset_password_cli.py swarnakamali@gmail.com  Max12345
"""
import sys
import bcrypt
from models import SessionLocal
from sqlalchemy import text as sql_text

def reset_password(email, new_password):
    db = SessionLocal()
    try:
        row = db.execute(sql_text(
            "SELECT id, name, email FROM users WHERE email=:e"
        ), {"e": email}).fetchone()

        if not row:
            print(f"❌  No user found with email: {email}")
            return

        hashed = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        db.execute(sql_text(
            "UPDATE users SET password_hash=:h WHERE email=:e"
        ), {"h": hashed, "e": email})
        db.commit()
        print(f"✅  Password reset for {row[1]} ({row[2]})")
        print(f"    New password: {new_password}")

    except Exception as e:
        print(f"❌  Error: {e}")
        try: db.rollback()
        except: pass
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python reset_password_cli.py <email> <new_password>")
        print("Example: python reset_password_cli.py swarnakamali12@gmail.com Max12345")
        sys.exit(1)
    email    = sys.argv[1]
    password = sys.argv[2]
    reset_password(email, password)