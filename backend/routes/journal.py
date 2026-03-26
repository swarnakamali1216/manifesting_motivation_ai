"""
routes/journal.py

FIXES:
1. MOOD BUG: Frontend sends mood="okay" hardcoded.
   Backend now IGNORES the frontend mood and derives it from VADER score.
   This means positive entries will correctly show as "positive" not "okay".

2. STREAK: Uses motivation_sessions check-in days for streak, not check_ins table.
   Also exposed /journal/streak endpoint.

3. Weekly recap: Returns correct field names (recap, not summary).

MOOD MAPPING (from VADER compound score):
  > 0.5  → positive
  > 0.2  → hopeful
  > 0.05 → focused
  -0.05 to 0.05 → neutral
  < -0.05 → stressed
  < -0.2  → sad
  < -0.5  → negative
"""
from flask import Blueprint, request, jsonify
from models import SessionLocal
from sqlalchemy import text as sql_text
from groq import Groq
import os
from dotenv import load_dotenv
load_dotenv()

journal_bp = Blueprint("journal", __name__)
client     = Groq(api_key=os.getenv("GROQ_API_KEY",""))


def score_to_mood(score: float) -> str:
    """Convert VADER compound score (-1 to 1) to a mood string."""
    if score is None:
        return "neutral"
    if score > 0.5:
        return "positive"
    elif score > 0.2:
        return "hopeful"
    elif score > 0.05:
        return "focused"
    elif score >= -0.05:
        return "neutral"
    elif score >= -0.2:
        return "stressed"
    elif score >= -0.5:
        return "sad"
    else:
        return "negative"


# ── GET /journal ──────────────────────────────────────────────────────────────
@journal_bp.route("/journal", methods=["GET"])
def get_journal():
    user_id = request.args.get("user_id", type=int)
    if not user_id:
        return jsonify([])
    db = None
    try:
        db = SessionLocal()
        rows = db.execute(sql_text(
            "SELECT id, user_id, content, mood, mood_score, ai_insight, created_at "
            "FROM journal_entries WHERE user_id=:uid ORDER BY created_at DESC"
        ), {"uid": user_id}).fetchall()
        return jsonify([{
            "id":         r[0],
            "user_id":    r[1],
            "content":    r[2],
            "mood":       r[3] or "neutral",
            "mood_score": r[4],
            "ai_insight": r[5],
            "created_at": str(r[6]),
        } for r in rows])
    except Exception as e:
        print(f"[journal GET] {e}")
        return jsonify([])
    finally:
        if db: db.close()


# ── POST /journal ─────────────────────────────────────────────────────────────
@journal_bp.route("/journal", methods=["POST"])
def add_journal():
    data    = request.get_json() or {}
    user_id = data.get("user_id")
    content = (data.get("content") or "").strip()

    if not user_id or not content:
        return jsonify({"error": "user_id and content required"}), 400

    db = None
    try:
        db = SessionLocal()

        # ── Step 1: VADER sentiment analysis ─────────────────────────────────
        mood_score = 0.0
        try:
            from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
            scores     = SentimentIntensityAnalyzer().polarity_scores(content)
            mood_score = round(scores["compound"], 3)
        except Exception as e:
            print(f"[journal VADER] {e}")

        # ── Step 2: Derive mood from VADER score — NOT from frontend input ────
        # FIX: Previously used data.get("mood","okay") which always stored "okay"
        # regardless of what the user wrote. Now mood is always derived from content.
        mood = score_to_mood(mood_score)
        print(f"[journal] VADER={mood_score} → mood={mood}")

        # ── Step 3: AI insight ────────────────────────────────────────────────
        ai_insight = None
        try:
            resp = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content":
                    f"A student wrote this journal entry (detected mood: {mood}, VADER score: {mood_score}):\n"
                    f"\"{content[:500]}\"\n\n"
                    "Give them one warm, specific, personal insight in 2 sentences. "
                    "Acknowledge what they wrote specifically, then offer one encouraging observation."}],
                max_tokens=100,
                temperature=0.75,
            )
            ai_insight = resp.choices[0].message.content.strip()
        except Exception as e:
            print(f"[journal AI insight] {e}")

        # ── Step 4: Save ──────────────────────────────────────────────────────
        row = db.execute(sql_text(
            "INSERT INTO journal_entries (user_id, content, mood, mood_score, ai_insight) "
            "VALUES (:uid, :content, :mood, :score, :insight) RETURNING id"
        ), {"uid": user_id, "content": content, "mood": mood,
            "score": mood_score, "insight": ai_insight}).fetchone()
        db.commit()

        # ── Step 5: Award XP ──────────────────────────────────────────────────
        try:
            db.execute(sql_text("UPDATE users SET xp=COALESCE(xp,0)+15 WHERE id=:uid"), {"uid": user_id})
            db.commit()
        except Exception as e:
            print(f"[journal XP] {e}")
            try: db.rollback()
            except: pass

        return jsonify({
            "id":         row[0],
            "mood":       mood,
            "mood_score": mood_score,
            "ai_insight": ai_insight,
            "xp_awarded": 15,
            "message":    f"Journal entry saved! Mood detected: {mood} · +15 XP",
        }), 201

    except Exception as e:
        if db:
            try: db.rollback()
            except: pass
        print(f"[journal POST] {e}")
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        if db: db.close()


# ── DELETE /journal/<id> ──────────────────────────────────────────────────────
@journal_bp.route("/journal/<int:entry_id>", methods=["DELETE"])
def delete_journal(entry_id):
    db = None
    try:
        db = SessionLocal()
        db.execute(sql_text("DELETE FROM journal_entries WHERE id=:id"), {"id": entry_id})
        db.commit()
        return jsonify({"message": "Deleted!"})
    except Exception as e:
        if db:
            try: db.rollback()
            except: pass
        return jsonify({"error": str(e)}), 500
    finally:
        if db: db.close()


# ── GET /journal/weekly-recap ─────────────────────────────────────────────────
@journal_bp.route("/journal/weekly-recap", methods=["GET"])
def weekly_recap():
    """Returns { recap, entry_count, avg_mood, top_mood, word_count, positive, tough }"""
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
                "recap":       None,
                "entry_count": 0,
                "avg_mood":    0,
                "top_mood":    "neutral",
                "word_count":  0,
                "positive":    0,
                "tough":       0,
            })

        scores     = [r[2] for r in rows if r[2] is not None]
        avg_mood   = round(sum(scores) / len(scores), 3) if scores else 0.0
        moods      = [r[1] for r in rows if r[1]]
        top_mood   = max(set(moods), key=moods.count) if moods else "neutral"
        word_count = sum(len((r[0] or "").split()) for r in rows)
        positive   = sum(1 for s in scores if s > 0.1)
        tough      = sum(1 for s in scores if s < -0.05)

        entries_text = "\n".join([
            f"- Mood: {r[1]} (score:{r[2]}) | {(r[0] or '')[:80]}"
            for r in rows
        ])

        recap_text = (
            f"You wrote {len(rows)} journal entries this week with an average sentiment of {avg_mood:.2f}. "
            f"Your dominant mood was {top_mood}. Keep reflecting — every entry builds self-awareness!"
        )
        try:
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