from flask import Blueprint, request, jsonify
from models import SessionLocal
from sqlalchemy import text as sql_text
from groq import Groq
import os
from dotenv import load_dotenv
load_dotenv()

journal_bp = Blueprint("journal", __name__)
def get_groq():
    return Groq(api_key=)


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
            "SELECT id, user_id, content, mood, mood_score, ai_insight, created_at "
            "FROM journal_entries WHERE user_id=:uid ORDER BY created_at DESC"
        ), {"uid": user_id}).fetchall()
        return jsonify([{
            "id":         r[0],
            "user_id":    r[1],
            "content":    r[2],
            "mood":       r[3],
            "mood_score": r[4],
            "ai_insight": r[5],
            "created_at": str(r[6]),
        } for r in rows])
    except Exception as e:
        print(f"[journal GET] {e}")
        return jsonify([])
    finally:
        if db: db.close()


# ── POST /journal ────────────────────────────────────────────
@journal_bp.route("/journal", methods=["POST"])
def add_journal():
    data    = request.get_json() or {}
    user_id = data.get("user_id")
    content = (data.get("content") or "").strip()
    mood    = data.get("mood", "okay")

    if not user_id or not content:
        return jsonify({"error": "user_id and content required"}), 400

    db = None
    try:
        db = SessionLocal()

        # Mood score via VADER
        mood_score = 0.0
        try:
            from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
            scores = SentimentIntensityAnalyzer().polarity_scores(content)
            mood_score = round(scores["compound"], 3)
        except Exception:
            pass

        # AI insight
        ai_insight = None
        try:
            resp = get_groq().chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content":
                    f"A student wrote this journal entry (mood: {mood}):\n\"{content[:400]}\"\n\n"
                    "Give them one warm, specific, personal insight in 2 sentences. "
                    "Acknowledge what they wrote specifically, then offer one encouraging observation."}],
                max_tokens=100,
                temperature=0.75,
            )
            ai_insight = resp.choices[0].message.content.strip()
        except Exception as e:
            print(f"[journal AI insight] {e}")

        row = db.execute(sql_text(
            "INSERT INTO journal_entries (user_id, content, mood, mood_score, ai_insight) "
            "VALUES (:uid, :content, :mood, :score, :insight) RETURNING id"
        ), {"uid": user_id, "content": content, "mood": mood,
            "score": mood_score, "insight": ai_insight}).fetchone()
        db.commit()

        # Award XP
        try:
            db.execute(sql_text("UPDATE users SET xp=COALESCE(xp,0)+15 WHERE id=:uid"), {"uid": user_id})
            db.commit()
        except Exception:
            db.rollback()

        # Update streak after journal save
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
    content = (data.get("content") or "").strip()
    mood    = data.get("mood", "okay")
    if not content:
        return jsonify({"error": "content required"}), 400
    db = None
    try:
        db = SessionLocal()
        db.execute(sql_text(
            "UPDATE journal_entries SET content=:c, mood=:m WHERE id=:id"
        ), {"c": content, "m": mood, "id": entry_id})
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
    """
    GET /api/journal/weekly-recap?user_id=2
    Returns AI-generated weekly recap from last 7 journal entries.
    Fixes the 404 error on Journal page Weekly Recap tab.
    """
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

        # Stats
        scores     = [r[2] for r in rows if r[2] is not None]
        avg_mood   = round(sum(scores) / len(scores), 2) if scores else 0
        moods      = [r[1] for r in rows if r[1]]
        top_mood   = max(set(moods), key=moods.count) if moods else "neutral"
        word_count = sum(len((r[0] or "").split()) for r in rows)
        positive   = sum(1 for s in scores if s > 0.1)
        tough      = sum(1 for s in scores if s < -0.1)

        # Build context for AI
        entries_text = "\n".join([
            f"- [{r[3].strftime('%a %b %d') if r[3] else '?'}] Mood: {r[1]} | {(r[0] or '')[:100]}"
            for r in rows
        ])

        # AI recap
        recap_text = (
            f"You wrote {len(rows)} journal entries this week "
            f"with an average mood of {avg_mood}. "
            f"Keep reflecting — every entry builds self-awareness."
        )
        try:
            resp = get_groq().chat.completions.create(
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
        return jsonify({"error": str(e)}), 500
    finally:
        if db: db.close()