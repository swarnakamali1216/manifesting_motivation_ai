"""
routes/journal.py — AES-256-GCM encryption + shared Groq pool
FIXES IN THIS VERSION:
  1. GET route logs the ACTUAL error before falling back (no more silent [])
  2. decrypt_journal never throws — safe placeholder if key missing
  3. encrypt_journal never throws — falls back to plaintext if key missing
  4. VADER + AI insight run on plaintext BEFORE encrypt
  5. Weekly recap decrypts before sending to LLaMA
  6. Uses shared groq_client — no new Groq() per request
  7. timeout=15 on all completions.create calls
  8. [FIX] created_at stored as UTC, returned as IST ISO-8601 string
  9. [FIX] to_ist_iso() always returns "YYYY-MM-DDTHH:MM:SS+05:30"
 10. [FIX] POST RETURNING clause fetches created_at and converts to IST
 11. [FIX] Mobile: date-grouping works because the ISO string is consistent
 12. [FIX] Auto-migration: adds title+tags columns if missing on startup
"""
from flask import Blueprint, request, jsonify
from models import SessionLocal
from sqlalchemy import text as sql_text
from groq_client import get_groq_client
from encryption import encrypt_journal, decrypt_journal
import os
from datetime import timezone, timedelta
from dotenv import load_dotenv
load_dotenv()

journal_bp = Blueprint("journal", __name__)

IST = timezone(timedelta(hours=5, minutes=30))


# ── Auto-migration: add missing columns on startup ────────────────────────────
def _migrate_journal_table():
    """Adds title and tags columns to journal_entries if they don't exist."""
    db = None
    try:
        db = SessionLocal()
        db.execute(sql_text("""
            ALTER TABLE journal_entries
            ADD COLUMN IF NOT EXISTS title VARCHAR(300),
            ADD COLUMN IF NOT EXISTS tags  TEXT
        """))
        db.commit()
        print("✅ journal_entries columns verified (title, tags)")
    except Exception as e:
        if db:
            db.rollback()
        print(f"[journal migrate] {e}")
    finally:
        if db:
            db.close()

# Run migration at import time (safe — IF NOT EXISTS)
_migrate_journal_table()


def to_ist_iso(dt):
    """
    Convert a datetime (naive UTC or aware) → IST ISO-8601 string.
    Always returns "YYYY-MM-DDTHH:MM:SS+05:30" so new Date() works on
    every browser, including mobile Safari/Chrome.
    """
    if dt is None:
        return None
    try:
        if hasattr(dt, 'tzinfo') and dt.tzinfo is not None:
            return dt.astimezone(IST).isoformat()
        else:
            return dt.replace(tzinfo=timezone.utc).astimezone(IST).isoformat()
    except Exception:
        return str(dt)


# ── GET /journal ─────────────────────────────────────────────
@journal_bp.route("/journal", methods=["GET"])
def get_journal():
    user_id = request.args.get("user_id", type=int)
    if not user_id:
        return jsonify([])
    db = None
    try:
        db = SessionLocal()

        # Full schema query (title + tags present after migration)
        try:
            rows = db.execute(sql_text(
                "SELECT id, user_id, title, content, mood, mood_score, tags, ai_insight, created_at "
                "FROM journal_entries WHERE user_id=:uid ORDER BY created_at DESC"
            ), {"uid": user_id}).fetchall()

            result = []
            for r in rows:
                try:
                    decrypted = decrypt_journal(r[3] or "")
                except Exception as de:
                    print(f"[journal GET] decrypt error for entry {r[0]}: {de}")
                    decrypted = "[could not decrypt]"
                result.append({
                    "id":         r[0],
                    "user_id":    r[1],
                    "title":      r[2],
                    "content":    decrypted,
                    "mood":       r[4],
                    "mood_score": r[5],
                    "tags":       r[6],
                    "ai_insight": r[7],
                    "created_at": to_ist_iso(r[8]),
                })
            return jsonify(result)

        except Exception as e:
            print(f"[journal GET] full-schema query failed: {e}")
            import traceback; traceback.print_exc()
            db.rollback()

            # Fallback without title/tags
            try:
                rows2 = db.execute(sql_text(
                    "SELECT id, user_id, content, mood, mood_score, ai_insight, created_at "
                    "FROM journal_entries WHERE user_id=:uid ORDER BY created_at DESC"
                ), {"uid": user_id}).fetchall()

                result2 = []
                for r in rows2:
                    try:
                        decrypted = decrypt_journal(r[2] or "")
                    except Exception as de:
                        print(f"[journal GET fallback] decrypt error for entry {r[0]}: {de}")
                        decrypted = "[could not decrypt]"
                    result2.append({
                        "id":         r[0],
                        "user_id":    r[1],
                        "title":      None,
                        "content":    decrypted,
                        "mood":       r[3],
                        "mood_score": r[4],
                        "tags":       None,
                        "ai_insight": r[5],
                        "created_at": to_ist_iso(r[6]),
                    })
                return jsonify(result2)

            except Exception as e2:
                print(f"[journal GET] fallback query also failed: {e2}")
                return jsonify({"error": f"Database error: {str(e2)}"}), 500

    except Exception as e:
        print(f"[journal GET] outer error: {e}")
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        if db: db.close()


# ── POST /journal ────────────────────────────────────────────
@journal_bp.route("/journal", methods=["POST"])
def add_journal():
    data    = request.get_json() or {}
    user_id = data.get("user_id")
    content = (data.get("content") or "").strip()
    mood    = data.get("mood", "okay")
    title   = data.get("title", "")
    tags    = data.get("tags", "")

    if not user_id or not content:
        return jsonify({"error": "user_id and content required"}), 400

    db = None
    try:
        db = SessionLocal()

        # STEP 1: VADER on PLAINTEXT
        mood_score = 0.0
        try:
            from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
            scores     = SentimentIntensityAnalyzer().polarity_scores(content)
            mood_score = round(scores["compound"], 3)
        except Exception:
            pass

        # STEP 2: AI insight on PLAINTEXT
        ai_insight = None
        try:
            client = get_groq_client()
            resp   = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content":
                    f"A student wrote this journal entry (mood: {mood}):\n\"{content[:400]}\"\n\n"
                    "Give them one warm, specific, personal insight in 2 sentences. "
                    "Acknowledge what they wrote specifically, then offer one encouraging observation."}],
                max_tokens=100,
                temperature=0.75,
                timeout=15,
            )
            ai_insight = resp.choices[0].message.content.strip()
        except Exception as e:
            print(f"[journal AI insight] {e}")

        # STEP 3: ENCRYPT for storage
        encrypted_content = encrypt_journal(content)

        # STEP 4: INSERT
        try:
            row = db.execute(sql_text(
                "INSERT INTO journal_entries (user_id, title, content, mood, mood_score, tags, ai_insight, created_at) "
                "VALUES (:uid, :title, :content, :mood, :score, :tags, :insight, NOW()) "
                "RETURNING id, created_at"
            ), {"uid": user_id, "title": title, "content": encrypted_content,
                "mood": mood, "score": mood_score, "tags": tags, "insight": ai_insight}).fetchone()
        except Exception:
            db.rollback()
            row = db.execute(sql_text(
                "INSERT INTO journal_entries (user_id, content, mood, mood_score, ai_insight, created_at) "
                "VALUES (:uid, :content, :mood, :score, :insight, NOW()) "
                "RETURNING id, created_at"
            ), {"uid": user_id, "content": encrypted_content,
                "mood": mood, "score": mood_score, "insight": ai_insight}).fetchone()

        db.commit()

        saved_at = to_ist_iso(row[1]) if row and len(row) > 1 else None

        try:
            db.execute(sql_text("UPDATE users SET xp=COALESCE(xp,0)+15 WHERE id=:uid"), {"uid": user_id})
            db.commit()
        except Exception:
            db.rollback()

        try:
            from streak_utils import update_user_streak
            update_user_streak(db, user_id)
        except Exception as se:
            print(f"[journal] streak update: {se}")

        return jsonify({
            "id":         row[0],
            "created_at": saved_at,
            "ai_insight": ai_insight,
            "mood_score": mood_score,
            "xp_awarded": 15,
            "message":    "Journal entry saved! +15 XP",
        }), 201

    except Exception as e:
        if db: db.rollback()
        print(f"[journal POST] {e}")
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        if db: db.close()


# ── PUT /journal/<id> ────────────────────────────────────────
@journal_bp.route("/journal/<int:entry_id>", methods=["PUT"])
def update_journal(entry_id):
    data    = request.get_json() or {}
    content = (data.get("content") or "").strip()
    mood    = data.get("mood", "okay")
    title   = data.get("title", "")
    tags    = data.get("tags", "")
    if not content:
        return jsonify({"error": "content required"}), 400

    encrypted_content = encrypt_journal(content)

    db = None
    try:
        db = SessionLocal()
        try:
            db.execute(sql_text(
                "UPDATE journal_entries SET content=:c, mood=:m, title=:t, tags=:tags WHERE id=:id"
            ), {"c": encrypted_content, "m": mood, "t": title, "tags": tags, "id": entry_id})
        except Exception:
            db.rollback()
            db.execute(sql_text(
                "UPDATE journal_entries SET content=:c, mood=:m WHERE id=:id"
            ), {"c": encrypted_content, "m": mood, "id": entry_id})
        db.commit()
        return jsonify({"message": "Updated!"})
    except Exception as e:
        if db: db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if db: db.close()


# ── DELETE /journal/<id> ─────────────────────────────────────
@journal_bp.route("/journal/<int:entry_id>", methods=["DELETE"])
def delete_journal(entry_id):
    db = None
    try:
        db = SessionLocal()
        db.execute(sql_text("DELETE FROM journal_entries WHERE id=:id"), {"id": entry_id})
        db.commit()
        return jsonify({"message": "Deleted!"})
    except Exception as e:
        if db: db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if db: db.close()


# ── GET /journal/weekly-recap ────────────────────────────────
@journal_bp.route("/journal/weekly-recap", methods=["GET"])
def weekly_recap():
    user_id = request.args.get("user_id", type=int)
    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    db = None
    try:
        db = SessionLocal()
        rows = db.execute(sql_text(
            "SELECT content, mood, mood_score, created_at "
            "FROM journal_entries WHERE user_id=:uid "
            "ORDER BY created_at DESC LIMIT 7"
        ), {"uid": user_id}).fetchall()

        if not rows:
            return jsonify({
                "recap":       "No journal entries found this week. Start writing to get your weekly recap!",
                "entry_count": 0,
                "avg_mood":    0,
                "top_mood":    "neutral",
                "word_count":  0,
                "positive":    0,
                "tough":       0,
            })

        scores     = [r[2] for r in rows if r[2] is not None]
        avg_mood   = round(sum(scores) / len(scores), 2) if scores else 0
        moods      = [r[1] for r in rows if r[1]]
        top_mood   = max(set(moods), key=moods.count) if moods else "neutral"

        decrypted_contents = []
        for r in rows:
            try:
                decrypted_contents.append(decrypt_journal(r[0] or ""))
            except Exception:
                decrypted_contents.append("")

        word_count = sum(len(c.split()) for c in decrypted_contents)
        positive   = sum(1 for s in scores if s > 0.1)
        tough      = sum(1 for s in scores if s < -0.1)

        entries_text = "\n".join([
            f"- [{to_ist_iso(rows[i][3])[:10] if rows[i][3] else 'unknown'}] "
            f"Mood: {rows[i][1]} | {decrypted_contents[i][:100]}"
            for i in range(len(rows))
        ])

        recap_text = (
            f"You wrote {len(rows)} journal entries this week "
            f"with an average mood of {avg_mood}. "
            f"Keep reflecting — every entry builds self-awareness."
        )

        try:
            client = get_groq_client()
            resp   = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content":
                    f"You are a warm AI coach reviewing a student's journal entries from the past week.\n\n"
                    f"Entries:\n{entries_text}\n\n"
                    "Write a personal 3-sentence weekly recap:\n"
                    "1. Acknowledge their emotional journey this week (be specific)\n"
                    "2. Highlight one strength or growth you noticed\n"
                    "3. Give one encouraging insight for the week ahead\n\n"
                    "Keep it warm, personal, under 75 words."}],
                max_tokens=120,
                temperature=0.7,
                timeout=15,
            )
            recap_text = resp.choices[0].message.content.strip()
        except Exception as e:
            print(f"[weekly_recap AI] {e}")

        return jsonify({
            "recap":       recap_text,
            "entry_count": len(rows),
            "avg_mood":    avg_mood,
            "top_mood":    top_mood,
            "word_count":  word_count,
            "positive":    positive,
            "tough":       tough,
        })

    except Exception as e:
        print(f"[weekly_recap] {e}")
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        if db: db.close()