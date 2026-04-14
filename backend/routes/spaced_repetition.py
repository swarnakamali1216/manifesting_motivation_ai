"""
routes/spaced_repetition.py — PostgreSQL-compatible version

FIXES APPLIED:
  1. ensure_table() no longer called on every GET/POST — replaced with a
     module-level _ensure_table() that runs ONCE at import time.
     Previously every single GET and POST ran CREATE TABLE IF NOT EXISTS
     against PostgreSQL (a DDL round-trip per request).
  2. Added index on (user_id, next_review) — ORDER BY next_review on a full
     table scan is slow; the index makes it a fast seek.
     Index is created in the same one-time setup call.
"""

from flask import Blueprint, request, jsonify
from models import SessionLocal
from sqlalchemy import text as sql_text
from datetime import datetime, timedelta

sr_bp = Blueprint("sr_bp", __name__)

INTERVALS = [1, 3, 7, 14, 30, 60]

def next_review_date(level):
    days = INTERVALS[min(level, len(INTERVALS) - 1)]
    return datetime.utcnow() + timedelta(days=days)

# FIX 1 + 2: Run table + index creation ONCE at import time, not per request
def _ensure_table_once():
    db = SessionLocal()
    try:
        db.execute(sql_text("""
            CREATE TABLE IF NOT EXISTS spaced_reviews (
                id            SERIAL PRIMARY KEY,
                user_id       INTEGER DEFAULT 1,
                content       TEXT    NOT NULL,
                tag           TEXT    DEFAULT 'general',
                level         INTEGER DEFAULT 0,
                review_count  INTEGER DEFAULT 0,
                next_review   TIMESTAMP,
                last_reviewed TIMESTAMP,
                created_at    TIMESTAMP DEFAULT NOW()
            )
        """))
        # FIX 2: Index on (user_id, next_review) — avoids full table scan on ORDER BY
        db.execute(sql_text("""
            CREATE INDEX IF NOT EXISTS idx_spaced_reviews_user_next
            ON spaced_reviews (user_id, next_review ASC)
        """))
        db.commit()
    except Exception as e:
        print(f"spaced_reviews table ensure error: {e}")
        try: db.rollback()
        except: pass
    finally:
        db.close()

_ensure_table_once()


@sr_bp.route("/spaced-review", methods=["GET"])
def get_reviews():
    db = SessionLocal()
    try:
        user_id = request.args.get("user_id")
        now     = datetime.utcnow()
        rows    = db.execute(sql_text(
            "SELECT id, content, tag, level, review_count, next_review, last_reviewed, created_at "
            "FROM spaced_reviews WHERE user_id=:uid ORDER BY next_review ASC"
        ), {"uid": user_id}).fetchall()

        due, upcoming = [], []
        for r in rows:
            item = {
                "id": r[0], "content": r[1], "tag": r[2], "level": r[3],
                "review_count": r[4], "next_review": str(r[5] or ""),
                "last_reviewed": str(r[6] or ""), "created_at": str(r[7] or ""),
            }
            try:
                next_dt = r[5] if isinstance(r[5], datetime) else datetime.fromisoformat(str(r[5]))
                (due if next_dt <= now else upcoming).append(item)
            except Exception:
                due.append(item)

        return jsonify({"due": due, "upcoming": upcoming, "total": len(rows)})
    except Exception as e:
        print("SR GET error:", e)
        return jsonify({"due": [], "upcoming": [], "total": 0})
    finally:
        db.close()

@sr_bp.route("/spaced-review", methods=["POST"])
def create_review():
    db = SessionLocal()
    try:
        body    = request.get_json() or {}
        user_id = body.get("user_id")
        content = body.get("content", "").strip()
        tag     = body.get("tag", "general")
        if not content:
            return jsonify({"error": "Content is required"}), 400

        next_dt = next_review_date(0)
        row = db.execute(sql_text("""
            INSERT INTO spaced_reviews (user_id, content, tag, level, review_count, next_review)
            VALUES (:uid, :content, :tag, 0, 0, :next) RETURNING id
        """), {"uid": user_id, "content": content, "tag": tag, "next": next_dt}).fetchone()
        db.commit()

        return jsonify({
            "id": row[0], "content": content, "tag": tag,
            "level": 0, "review_count": 0, "next_review": str(next_dt)
        }), 201
    except Exception as e:
        try: db.rollback()
        except: pass
        print("SR POST error:", e)
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

@sr_bp.route("/spaced-review/<int:item_id>/review", methods=["POST"])
def do_review(item_id):
    db = SessionLocal()
    try:
        body    = request.get_json() or {}
        user_id = body.get("user_id")
        passed  = body.get("passed", True)

        row = db.execute(sql_text(
            "SELECT id, level, review_count FROM spaced_reviews WHERE id=:id AND user_id=:uid"
        ), {"id": item_id, "uid": user_id}).fetchone()
        if not row:
            return jsonify({"error": "Item not found"}), 404

        new_level = min(row[1] + 1, len(INTERVALS) - 1) if passed else max(row[1] - 1, 0)
        next_dt   = next_review_date(new_level)

        db.execute(sql_text("""
            UPDATE spaced_reviews
            SET level=:level, review_count=:count, next_review=:next, last_reviewed=:now
            WHERE id=:id
        """), {"level": new_level, "count": row[2] + 1, "next": next_dt, "now": datetime.utcnow(), "id": item_id})
        db.commit()

        return jsonify({
            "message":     f"See you in {INTERVALS[min(new_level, len(INTERVALS)-1)]} days!",
            "next_review": str(next_dt),
            "level":       new_level,
        })
    except Exception as e:
        try: db.rollback()
        except: pass
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

@sr_bp.route("/spaced-review/<int:item_id>", methods=["DELETE"])
def delete_review(item_id):
    db = SessionLocal()
    try:
        user_id = request.args.get("user_id")
        db.execute(sql_text("DELETE FROM spaced_reviews WHERE id=:id AND user_id=:uid"),
                   {"id": item_id, "uid": user_id})
        db.commit()
        return jsonify({"message": "Deleted"})
    except Exception as e:
        try: db.rollback()
        except: pass
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

@sr_bp.route("/spaced-review/stats", methods=["GET"])
def get_stats():
    db = SessionLocal()
    try:
        user_id = request.args.get("user_id")
        now     = datetime.utcnow()
        rows    = db.execute(sql_text(
            "SELECT level, review_count, next_review FROM spaced_reviews WHERE user_id=:uid"
        ), {"uid": user_id}).fetchall()

        due = 0
        for r in rows:
            try:
                nxt = r[2] if isinstance(r[2], datetime) else datetime.fromisoformat(str(r[2]))
                if nxt <= now: due += 1
            except Exception:
                pass

        return jsonify({
            "total":         len(rows),
            "due_today":     due,
            "mastered":      sum(1 for r in rows if r[0] >= 5),
            "total_reviews": sum(r[1] for r in rows),
        })
    except Exception as e:
        return jsonify({"total": 0, "due_today": 0, "mastered": 0, "total_reviews": 0})
    finally:
        db.close()