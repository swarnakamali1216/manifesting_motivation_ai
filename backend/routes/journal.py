"""
routes/journal.py — WITH AES-256-GCM ENCRYPTION
FIXES APPLIED:
  1. encrypt_journal / decrypt_journal wired in correctly
  2. VADER runs on PLAINTEXT (before encrypt) — mood score stays accurate
  3. AI insight prompt uses PLAINTEXT (before encrypt) — LLaMA gets real text
  4. Weekly recap decrypts content before sending to LLaMA
  5. GET route decrypts before returning to frontend
  6. PUT route re-encrypts updated content
  7. Uses shared groq_client.get_groq_client() — no new Groq() per request
  8. timeout=15 on all completions.create calls
"""
from flask import Blueprint, request, jsonify
from models import SessionLocal
from sqlalchemy import text as sql_text
from groq_client import get_groq_client
from encryption import encrypt_journal, decrypt_journal   # ← ADDED
import os
from dotenv import load_dotenv
load_dotenv()

journal_bp = Blueprint("journal", __name__)


# ── GET /journal ─────────────────────────────────────────────
@journal_bp.route("/journal", methods=["GET"])
def get_journal():
    user_id = request.args.get("user_id", type=int)
    if not user_id:
        return jsonify([])
    db = None
    try:
        db = SessionLocal()
        rows = db.execute(sql_text(
            "SELECT id, user_id, title, content, mood, mood_score, tags, ai_insight, created_at "
            "FROM journal_entries WHERE user_id=:uid ORDER BY created_at DESC"
        ), {"uid": user_id}).fetchall()
        return jsonify([{
            "id":         r[0],
            "user_id":    r[1],
            "title":      r[2],
            "content":    decrypt_journal(r[3]),   # ← DECRYPT before sending to frontend
            "mood":       r[4],
            "mood_score": r[5],
            "tags":       r[6],
            "ai_insight": r[7],
            "created_at": str(r[8]),
        } for r in rows])
    except Exception as e:
        print(f"[journal GET] {e}")
        try:
            rows2 = db.execute(sql_text(
                "SELECT id, user_id, content, mood, mood_score, ai_insight, created_at "
                "FROM journal_entries WHERE user_id=:uid ORDER BY created_at DESC"
            ), {"uid": user_id}).fetchall()
            return jsonify([{
                "id":         r[0],
                "user_id":    r[1],
                "title":      None,
                "content":    decrypt_journal(r[2]),   # ← DECRYPT here too
                "mood":       r[3],
                "mood_score": r[4],
                "tags":       None,
                "ai_insight": r[5],
                "created_at": str(r[6]),
            } for r in rows2])
        except Exception:
            return jsonify([])
    finally:
        if db: db.close()


# ── POST /journal ────────────────────────────────────────────
@journal_bp.route("/journal", methods=["POST"])
def add_journal():
    data    = request.get_json() or {}
    user_id = data.get("user_id")
    content = (data.get("content") or "").strip()   # ← plaintext from frontend
    mood    = data.get("mood", "okay")
    title   = data.get("title", "")
    tags    = data.get("tags", "")

    if not user_id or not content:
        return jsonify({"error": "user_id and content required"}), 400

    db = None
    try:
        db = SessionLocal()

        # ── STEP 1: VADER on PLAINTEXT ──────────────────────────
        # Must run BEFORE encrypt — ciphertext would give wrong score
        mood_score = 0.0
        try:
            from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
            scores = SentimentIntensityAnalyzer().polarity_scores(content)
            mood_score = round(scores["compound"], 3)
        except Exception:
            pass

        # ── STEP 2: AI insight on PLAINTEXT ─────────────────────
        # Must run BEFORE encrypt — LLaMA needs real text, not ciphertext
        ai_insight = None
        try:
            client = get_groq_client()
            resp = client.chat.completions.create(
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

        # ── STEP 3: ENCRYPT content for storage ─────────────────
        # Only the DB-stored value is encrypted — plaintext never reaches disk
        encrypted_content = encrypt_journal(content)   # ← ENCRYPT here

        try:
            row = db.execute(sql_text(
                "INSERT INTO journal_entries (user_id, title, content, mood, mood_score, tags, ai_insight, created_at) "
                "VALUES (:uid, :title, :content, :mood, :score, :tags, :insight, NOW()) RETURNING id"
            ), {"uid": user_id, "title": title, "content": encrypted_content,   # ← store encrypted
                "mood": mood, "score": mood_score, "tags": tags, "insight": ai_insight}).fetchone()
        except Exception:
            db.rollback()
            row = db.execute(sql_text(
                "INSERT INTO journal_entries (user_id, content, mood, mood_score, ai_insight, created_at) "
                "VALUES (:uid, :content, :mood, :score, :insight, NOW()) RETURNING id"
            ), {"uid": user_id, "content": encrypted_content,   # ← store encrypted
                "mood": mood, "score": mood_score, "insight": ai_insight}).fetchone()

        db.commit()

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
            "ai_insight": ai_insight,
            "mood_score": mood_score,
            "xp_awarded": 15,
            "message":    "Journal entry saved! +15 XP",
        }), 201

    except Exception as e:
        if db: db.rollback()
        print(f"[journal POST] {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if db: db.close()


# ── PUT /journal/<id> ────────────────────────────────────────
@journal_bp.route("/journal/<int:entry_id>", methods=["PUT"])
def update_journal(entry_id):
    data    = request.get_json() or {}
    content = (data.get("content") or "").strip()   # ← plaintext from frontend
    mood    = data.get("mood", "okay")
    title   = data.get("title", "")
    tags    = data.get("tags", "")
    if not content:
        return jsonify({"error": "content required"}), 400

    # ── ENCRYPT updated content before saving ────────────────
    encrypted_content = encrypt_journal(content)   # ← ENCRYPT here

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

        # ── DECRYPT content before sending to LLaMA ─────────────
        # Must decrypt here — DB stores ciphertext, LLaMA needs real text
        decrypted_contents = [decrypt_journal(r[0] or "") for r in rows]   # ← DECRYPT

        word_count = sum(len(c.split()) for c in decrypted_contents)
        positive   = sum(1 for s in scores if s > 0.1)
        tough      = sum(1 for s in scores if s < -0.1)

        entries_text = "\n".join([
            f"- [{rows[i][3].strftime('%a %b %d') if hasattr(rows[i][3], 'strftime') else str(rows[i][3])[:10]}] "
            f"Mood: {rows[i][1]} | {decrypted_contents[i][:100]}"   # ← use decrypted
            for i in range(len(rows))
        ])

        recap_text = (
            f"You wrote {len(rows)} journal entries this week "
            f"with an average mood of {avg_mood}. "
            f"Keep reflecting — every entry builds self-awareness."
        )

        try:
            client = get_groq_client()
            resp = client.chat.completions.create(
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
        return jsonify({"error": str(e)}), 500
    finally:
        if db: db.close()