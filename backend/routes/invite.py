"""
routes/invite.py — FULLY FIXED v3

Changes vs v2:
  1. Added /invite/stats/all — must be placed BEFORE /invite/stats/<int:user_id>
     so Flask doesn't try to cast "all" as an integer.
"""
import os
import requests as http_requests
from flask import Blueprint, request, jsonify
from models import SessionLocal
from sqlalchemy import text as sql_text

invite_bp = Blueprint("invite", __name__)

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")

def get_sender(user_id):
    try:
        db = SessionLocal()
        row = db.execute(
            sql_text("SELECT name, email FROM users WHERE id=:uid"),
            {"uid": user_id}
        ).fetchone()
        db.close()
        if row:
            return row[0] or "Someone", row[1] or ""
    except Exception as e:
        print(f"[invite] get_sender error: {e}")
    return "Someone", ""

def build_email_html(sender_name, invite_url):
    return f"""<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0a0a1a;font-family:Arial,sans-serif;">
  <table width="100%" style="padding:32px 16px;">
  <tr><td align="center">
    <table width="560" style="background:#0f0f20;border-radius:24px;border:1px solid #1a1a35;">
      <tr>
        <td style="background:linear-gradient(135deg,#1a0a3a,#2d0a4a);padding:40px;text-align:center;">
          <h1 style="color:#fff;font-size:26px;margin:0;">Manifesting Motivation</h1>
          <p style="color:#c4b5fd;margin:8px 0 0;">AI Coaching Platform</p>
        </td>
      </tr>
      <tr>
        <td style="padding:36px 40px;">
          <p style="font-size:22px;font-weight:700;color:#eeeeff;">You have been invited!</p>
          <p style="color:#9898c0;font-size:15px;line-height:1.75;">
            <strong style="color:#c4b5fd;">{sender_name}</strong> wants you to join
            <strong style="color:#fff;">Manifesting Motivation AI</strong> —
            a personal growth app with AI coaching, goal tracking, and daily check-ins.
          </p>
          <table width="100%" style="margin:24px 0;">
            <tr><td align="center">
              <a href="{invite_url}"
                style="display:inline-block;padding:16px 48px;
                background:linear-gradient(135deg,#7c5cfc,#9c7cfc);
                color:#fff;border-radius:100px;text-decoration:none;
                font-size:16px;font-weight:700;">
                Join Free — Start Your Journey
              </a>
            </td></tr>
          </table>
          <p style="text-align:center;color:#4a4a6a;font-size:12px;">
            Or copy: <a href="{invite_url}" style="color:#7c5cfc;">{invite_url}</a>
          </p>
          <div style="background:rgba(74,222,128,0.06);border:1px solid rgba(74,222,128,0.2);border-radius:12px;padding:14px 18px;margin-top:20px;">
            <p style="color:#4ade80;font-size:13px;font-weight:700;margin:0;">Welcome bonus: +25 XP when you sign up!</p>
          </div>
        </td>
      </tr>
      <tr>
        <td style="background:#070712;padding:20px 40px;text-align:center;">
          <p style="color:#3a3a5a;font-size:11px;margin:0;">Manifesting Motivation AI — Built with love in India</p>
        </td>
      </tr>
    </table>
  </td></tr>
  </table>
</body>
</html>"""


@invite_bp.route("/invite/send", methods=["POST", "OPTIONS"])
def send_invite():
    if request.method == "OPTIONS":
        return jsonify({}), 200

    data = request.get_json() or {}
    user_id = data.get("user_id")

    # Accept all three field names — 'invited_email' is what Badges.jsx sends
    to_email = (
        data.get("invited_email") or
        data.get("email") or
        data.get("to_email") or
        ""
    ).strip()

    print(f"[invite/send] user_id={user_id} to_email={to_email} body_keys={list(data.keys())}")

    if not to_email or "@" not in to_email:
        return jsonify({"error": "Enter a valid email address"}), 400
    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    sender_name, _ = get_sender(user_id)
    invite_url = f"https://manifesting-motivation-ai.vercel.app?ref={user_id}&mode=signup"

    # Record in DB first (even if Resend fails)
    db = None
    try:
        db = SessionLocal()
        db.execute(sql_text(
            "INSERT INTO invites (inviter_id, to_email, status, created_at) "
            "VALUES (:uid, :email, 'sent', NOW())"
        ), {"uid": int(user_id), "email": to_email})
        db.commit()
        print(f"[invite/send] DB row inserted for {to_email}")
    except Exception as e:
        print(f"[invite/send] DB error: {e}")
        if db:
            db.rollback()
    finally:
        if db:
            db.close()

    # Send email via Resend if key is configured
    if RESEND_API_KEY:
        try:
            response = http_requests.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {RESEND_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "from": "Manifesting Motivation <onboarding@resend.dev>",
                    "to": [to_email],
                    "subject": f"{sender_name} invited you to Manifesting Motivation AI",
                    "html": build_email_html(sender_name, invite_url)
                },
                timeout=15
            )
            if response.status_code in (200, 201):
                print(f"[invite/send] Resend OK → {to_email}")
            else:
                print(f"[invite/send] Resend error {response.status_code}: {response.text[:200]}")
        except Exception as e:
            print(f"[invite/send] Resend exception: {e}")
    else:
        print("[invite/send] No RESEND_API_KEY — email skipped, DB row still saved")

    return jsonify({
        "success": True,
        "message": f"Invite sent to {to_email}! You will earn +50 XP when they join."
    })


@invite_bp.route("/invite/link/<int:user_id>", methods=["GET"])
def get_invite_link(user_id):
    link = f"https://manifesting-motivation-ai.vercel.app/?ref={user_id}&mode=signup"
    return jsonify({"link": link, "user_id": user_id})


@invite_bp.route("/invite/join", methods=["POST", "OPTIONS"])
def record_join():
    if request.method == "OPTIONS":
        return jsonify({}), 200

    data        = request.get_json() or {}
    new_user_id = data.get("new_user_id")
    ref_user_id = data.get("ref_user_id")

    print(f"[invite/join] new_user_id={new_user_id} ref_user_id={ref_user_id}")

    if not new_user_id or not ref_user_id:
        return jsonify({"error": "new_user_id and ref_user_id required"}), 400

    db = SessionLocal()
    try:
        # Prevent double XP — check for existing joined row
        existing = db.execute(sql_text(
            "SELECT id FROM invites "
            "WHERE inviter_id=:uid AND joined_user_id=:jid AND status='joined'"
        ), {"uid": int(ref_user_id), "jid": int(new_user_id)}).fetchone()

        if existing:
            print(f"[invite/join] Already recorded — skipping duplicate")
            return jsonify({"success": True, "message": "Already recorded"})

        # Insert joined row
        db.execute(sql_text(
            "INSERT INTO invites (inviter_id, to_email, status, joined_user_id, created_at) "
            "VALUES (:uid, 'direct_link', 'joined', :jid, NOW())"
        ), {"uid": int(ref_user_id), "jid": int(new_user_id)})

        # Award +50 XP to inviter
        db.execute(sql_text(
            "UPDATE users SET xp = COALESCE(xp, 0) + 50 WHERE id = :uid"
        ), {"uid": int(ref_user_id)})

        # Award +25 XP welcome bonus to new user
        db.execute(sql_text(
            "UPDATE users SET xp = COALESCE(xp, 0) + 25 WHERE id = :uid"
        ), {"uid": int(new_user_id)})

        db.commit()
        print(f"[invite/join] Recorded! Inviter {ref_user_id} +50 XP, new user {new_user_id} +25 XP")
        return jsonify({"success": True, "message": "Join recorded! Inviter +50 XP, you +25 XP"})

    except Exception as e:
        db.rollback()
        print(f"[invite/join] {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


# ── /invite/stats/all MUST be before /invite/stats/<int:user_id> ─────────────
# Flask matches routes top to bottom. If the int route comes first,
# it tries to cast "all" as an integer and returns 404/405.
@invite_bp.route("/invite/stats/all", methods=["GET", "OPTIONS"])
def get_all_invite_stats():
    if request.method == "OPTIONS":
        return jsonify({}), 200

    db = SessionLocal()
    try:
        total_sent = db.execute(sql_text(
            "SELECT COUNT(*) FROM invites WHERE status='sent'"
        )).fetchone()[0]

        total_joined = db.execute(sql_text(
            "SELECT COUNT(*) FROM invites WHERE status='joined'"
        )).fetchone()[0]

        total_users = db.execute(sql_text(
            "SELECT COUNT(*) FROM users"
        )).fetchone()[0]

        top_inviters = db.execute(sql_text(
            "SELECT u.name, COUNT(i.id) as joins "
            "FROM invites i "
            "JOIN users u ON u.id = i.inviter_id "
            "WHERE i.status = 'joined' "
            "GROUP BY u.name "
            "ORDER BY joins DESC "
            "LIMIT 5"
        )).fetchall()

        return jsonify({
            "total_invites_sent":  total_sent,
            "total_joins":         total_joined,
            "total_users":         total_users,
            "total_xp_awarded":    total_joined * 75,  # 50 to inviter + 25 to new user
            "top_inviters": [
                {"name": row[0], "joins": row[1], "xp_earned": row[1] * 50}
                for row in top_inviters
            ]
        })
    except Exception as e:
        print(f"[invite/stats/all] {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@invite_bp.route("/invite/stats/<int:user_id>", methods=["GET"])
def get_invite_stats(user_id):
    db = SessionLocal()
    try:
        sent_row = db.execute(sql_text(
            "SELECT COUNT(*) FROM invites WHERE inviter_id=:uid AND status='sent'"
        ), {"uid": user_id}).fetchone()

        joined_row = db.execute(sql_text(
            "SELECT COUNT(*) FROM invites WHERE inviter_id=:uid AND status='joined'"
        ), {"uid": user_id}).fetchone()

        sent_count   = sent_row[0]   if sent_row   else 0
        joined_count = joined_row[0] if joined_row else 0

        return jsonify({
            "total_invites": sent_count,
            "sent_count":    sent_count,
            "joined_count":  joined_count,
            "user_id":       user_id,
            "xp_earned":     joined_count * 50,
        })
    except Exception as e:
        print(f"[invite/stats] {e}")
        return jsonify({
            "total_invites": 0, "sent_count": 0,
            "joined_count": 0, "user_id": user_id, "xp_earned": 0
        })
    finally:
        db.close()