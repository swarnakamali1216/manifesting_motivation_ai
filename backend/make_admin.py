from models import SessionLocal
from sqlalchemy import text as sql_text

db = SessionLocal()
result = db.execute(sql_text("UPDATE users SET role='admin' WHERE email='swarnakamali12@gmail.com'"))
db.commit()
print("Rows updated:", result.rowcount)
if result.rowcount > 0:
    print("✅ swarnakamali12@gmail.com is now ADMIN!")
else:
    print("❌ User not found - register first!")
db.close()