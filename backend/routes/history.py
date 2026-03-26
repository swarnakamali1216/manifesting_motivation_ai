"""
routes/history.py
FIX: Accept ?limit= param so MyStory can load all sessions, not just 50.
Default still 50 for AI History page (performance), but MyStory requests 500.
"""
from flask import Blueprint, request, jsonify
from models import SessionLocal
from sqlalchemy import text as sql_text

history_bp = Blueprint("history", __name__)

@history_bp.route("/history", methods=["GET"])
def get_history():
    db = SessionLocal()
    try:
        user_id = request.args.get("user_id", None)
        if not user_id:
            return jsonify([])

        # Support ?limit= from caller. Default 100. Max 1000.
        try:
            limit = min(int(request.args.get("limit", 100)), 1000)
        except (ValueError, TypeError):
            limit = 100

        rows = db.execute(sql_text("""
            SELECT id, user_id, user_input, ai_response, emotion,
                   created_at, persona, vader_score
            FROM motivation_sessions
            WHERE user_id = :uid
            ORDER BY id DESC
            LIMIT :lim
        """), {"uid": int(user_id), "lim": limit}).fetchall()

        result = []
        for r in rows:
            result.append({
                "id":           r[0],
                "user_id":      r[1],
                "user_input":   r[2] or "",
                "ai_response":  r[3] or "",
                "emotion":      r[4] or "neutral",
                "created_at":   str(r[5] or ""),
                "persona":      r[6] or "general",
                "vader_score":  float(r[7]) if r[7] is not None else None,
            })
        return jsonify(result)

    except Exception as e:
        try: db.rollback()
        except: pass
        # Fallback: try without vader_score column (older schema)
        try:
            rows2 = db.execute(sql_text("""
                SELECT id, user_id, user_input, ai_response, emotion, created_at
                FROM motivation_sessions
                WHERE user_id = :uid
                ORDER BY id DESC
                LIMIT :lim
            """), {"uid": int(user_id), "lim": limit}).fetchall()
            return jsonify([{
                "id":          r[0], "user_id":    r[1],
                "user_input":  r[2] or "", "ai_response": r[3] or "",
                "emotion":     r[4] or "neutral", "created_at": str(r[5] or ""),
            } for r in rows2])
        except Exception as e2:
            print("History GET error:", e2)
            return jsonify([])
    finally:
        db.close()


# ── DELETE /history/clear — clears AI chat history for a user ─────────────────
@history_bp.route("/history/clear", methods=["DELETE", "OPTIONS"])
def clear_history():
    if request.method == "OPTIONS":
        return "", 200
    db = SessionLocal()
    try:
        user_id = request.args.get("user_id") or (request.get_json() or {}).get("user_id")
        if not user_id:
            return jsonify({"error": "user_id required"}), 400
        db.execute(sql_text(
            "DELETE FROM motivation_sessions WHERE user_id=:uid"
        ), {"uid": int(user_id)})
        db.commit()
        print(f"🗑  History cleared for user {user_id}")
        return jsonify({"success": True, "message": "Chat history cleared"})
    except Exception as e:
        try: db.rollback()
        except: pass
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()