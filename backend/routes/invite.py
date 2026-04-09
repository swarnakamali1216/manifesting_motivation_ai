"""
routes/invite.py — RESEND VERSION
- Uses Resend HTTP API instead of SMTP (no port issues on Render free tier)
- No manual _cors() — app.py flask-cors handles it
"""
import os
import resend
from flask import Blueprint, request, jsonify
from models import SessionLocal
from sqlalchemy import text as sql_text
from dotenv import load_dotenv
load_dotenv()

invite_bp = Blueprint("invite", __name__)

resend.api_key = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL = os.getenv("RESEND_FROM", "Manifesting Motivation <onboarding@resend.dev>")


def get_sender(user_id):
    try:
        db = SessionLocal()
        row = db.execute(
            sql_text("SELECT name, email FROM users WHERE id=:uid"),
            {"uid": user_id}
        ).fetchone()
        db.close()
        if row:
            return row.name or "Someone", row.email or ""
    except Exception as e:
        print(f"[invite] get_sender error: {e}")
    return "Someone", ""


def build_email_html(sender_name, sender_email, invite_url):
    features = [
        ("🤖", "AI coach that adapts to your emotions"),
        ("🎯", "Personalised goal roadmaps, step by step"),
        ("📔", "Encrypted journal with AI emotional insight"),
        ("✅", "Daily check-ins with streaks & XP"),
        ("🏆", "Badges, levels, and gamified growth"),
    ]
    rows = "".join(
        f'<tr><td style="padding:8px 0;font-size:14px;color:#c4b5fd;line-height:1.5;">'
        f'<span style="font-size:18px;vertical-align:middle;">{i}</span>'
        f'&nbsp;&nbsp;<span style="vertical-align:middle;">{t}</span></td></tr>'
        for i, t in features
    )

    butterfly_svg = """
<svg width="48" height="48" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M20 20 C16 14,6 10,4 16 C2 22,10 26,20 20Z" fill="#c4b5fd" opacity="0.92"/>
  <path d="M20 20 C24 14,34 10,36 16 C38 22,30 26,20 20Z" fill="#f9a8d4" opacity="0.92"/>
  <path d="M20 20 C15 24,6 26,5 32 C4 36,12 36,20 20Z" fill="#a78bfa" opacity="0.85"/>
  <path d="M20 20 C25 24,34 26,35 32 C36 36,28 36,20 20Z" fill="#f9a8d4" opacity="0.85"/>
  <ellipse cx="20" cy="20" rx="1.2" ry="6" fill="white" opacity="0.9"/>
  <line x1="20" y1="15" x2="16" y2="9" stroke="white" stroke-width="1.1" stroke-linecap="round" opacity="0.85"/>
  <line x1="20" y1="15" x2="24" y2="9" stroke="white" stroke-width="1.1" stroke-linecap="round" opacity="0.85"/>
  <circle cx="16" cy="9" r="1.2" fill="white" opacity="0.9"/>
  <circle cx="24" cy="9" r="1.2" fill="white" opacity="0.9"/>
</svg>"""

    sender_display = f"{sender_name} ({sender_email})" if sender_email else sender_name

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>You've been invited to Manifesting Motivation AI</title>
</head>
<body style="margin:0;padding:0;background:#0a0a1a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a1a;padding:32px 16px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0"
      style="background:#0f0f20;border-radius:24px;overflow:hidden;border:1px solid #1a1a35;">
      <tr>
        <td style="background:linear-gradient(135deg,#1a0a3a 0%,#2d0a4a 50%,#1a0a3a 100%);
                   padding:44px 40px 36px;text-align:center;border-bottom:1px solid rgba(124,92,252,0.3);">
          {butterfly_svg}
          <h1 style="color:#ffffff;margin:16px 0 6px;font-size:26px;font-weight:800;">Manifesting Motivation</h1>
          <p style="color:rgba(196,181,253,0.85);margin:0;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">AI Coaching Platform</p>
        </td>
      </tr>
      <tr>
        <td style="padding:36px 40px;">
          <p style="font-size:22px;font-weight:700;color:#eeeeff;margin:0 0 10px;">You've been invited 🦋</p>
          <p style="color:#9898c0;font-size:15px;line-height:1.75;margin:0 0 24px;">
            <span style="color:#c4b5fd;font-weight:600;">{sender_name}</span>
            {f'<span style="color:#6060a0;font-size:13px;"> &lt;{sender_email}&gt;</span>' if sender_email else ''}
            wants you to join them on
            <span style="color:#eeeeff;font-weight:600;">Manifesting Motivation AI</span>
            — a personal growth app that helps you set goals, track your mood, and get real AI coaching.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0"
            style="background:rgba(124,92,252,0.06);border-radius:16px;border:1px solid rgba(124,92,252,0.18);margin-bottom:28px;">
            <tr><td style="padding:16px 20px 4px;">
              <div style="font-size:10px;font-weight:700;color:#7c5cfc;letter-spacing:0.12em;margin-bottom:10px;">WHAT YOU GET</div>
            </td></tr>
            {rows}
            <tr><td style="padding:4px 20px 16px;"></td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td align="center">
              <a href="{invite_url}"
                style="display:inline-block;padding:16px 52px;background:linear-gradient(135deg,#7c5cfc,#9c7cfc);
                       color:#ffffff;border-radius:100px;text-decoration:none;font-size:16px;font-weight:700;
                       box-shadow:0 8px 32px rgba(124,92,252,0.5);">
                Join Free — Start Your Journey ✨
              </a>
            </td></tr>
          </table>
          <p style="text-align:center;color:#4a4a6a;font-size:11px;margin:0 0 24px;line-height:1.8;">
            Or copy this link:<br/>
            <a href="{invite_url}" style="color:#7c5cfc;text-decoration:none;font-size:11px;word-break:break-all;">{invite_url}</a>
          </p>
          <div style="background:rgba(74,222,128,0.06);border:1px solid rgba(74,222,128,0.2);border-radius:12px;padding:14px 18px;">
            <p style="color:#4ade80;font-size:13px;font-weight:700;margin:0 0 2px;">⚡ Welcome bonus: +25 XP when you sign up</p>
            <p style="color:#6060a0;font-size:11px;margin:0;">{sender_name} earns +50 XP when you join</p>
          </div>
        </td>
      </tr>
      <tr>
        <td style="background:#070712;padding:20px 40px;border-top:1px solid #1a1a35;text-align:center;">
          <p style="color:#3a3a5a;font-size:11px;margin:0 0 6px;">Invited by <span style="color:#6060a0;">{sender_display}</span></p>
          <p style="color:#2a2a42;font-size:10px;margin:0;">Manifesting Motivation AI · Built with 🦋 in India<br/>Not interested? Simply ignore this email.</p>
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

    data     = request.get_json() or {}
    to_email = (data.get("email") or data.get("to_email") or "").strip()
    user_id  = data.get("user_id")

    if not to_email or "@" not in to_email:
        return jsonify({"error": "Enter a valid email address"}), 400
    if not user_id:
        return jsonify({"error": "user_id required"}), 400
    if not resend.api_key:
        return jsonify({"error": "RESEND_API_KEY not configured in environment"}), 500

    sender_name, sender_email = get_sender(user_id)
    app_url    = os.getenv("APP_URL", "https://manifesting-motivation-ai.vercel.app").rstrip("/")
    invite_url = f"{app_url}?ref={user_id}"

    try:
        params = {
            "from":    FROM_EMAIL,
            "to":      [to_email],
            "subject": f"🦋 {sender_name} invited you to Manifesting Motivation AI",
            "html":    build_email_html(sender_name, sender_email, invite_url),
        }
        if sender_email:
            params["reply_to"] = sender_email

        response = resend.Emails.send(params)
        print(f"[invite] ✅ Resend: {sender_name} → {to_email} | id={response.get('id','?')}")

        # Record in DB
        try:
            db = SessionLocal()
            db.execute(sql_text(
                "INSERT INTO invites (inviter_id, to_email, status, created_at) "
                "VALUES (:uid, :email, 'sent', NOW())"
            ), {"uid": int(user_id), "email": to_email})
            db.commit()
            db.close()
        except Exception as db_err:
            print(f"[invite] DB record skipped: {db_err}")

        return jsonify({
            "success": True,
            "message": f"Invite sent to {to_email} ✅",
            "to":      to_email
        })

    except Exception as e:
        print(f"[invite] ❌ Resend error: {e}")
        return jsonify({"error": str(e)}), 500


@invite_bp.route("/invite/test", methods=["GET"])
def test_config():
    configured = bool(resend.api_key)
    return jsonify({
        "configured": configured,
        "from":       FROM_EMAIL,
        "message":    "Ready ✅" if configured else "Add RESEND_API_KEY to environment"
    })


@invite_bp.route("/invite/link/<int:user_id>", methods=["GET"])
def get_invite_link(user_id):
    link = f"https://manifesting-motivation-ai.vercel.app/?ref={user_id}&mode=signup"
    return jsonify({"link": link, "user_id": user_id})


@invite_bp.route("/invite/stats/<int:user_id>", methods=["GET"])
def get_invite_stats(user_id):
    db = SessionLocal()
    try:
        row = db.execute(sql_text(
            "SELECT COUNT(*) FROM invites WHERE inviter_id=:uid"
        ), {"uid": user_id}).fetchone()
        count = row[0] if row else 0
        return jsonify({"total_invites": count, "user_id": user_id, "xp_earned": count * 50})
    except Exception:
        return jsonify({"total_invites": 0, "user_id": user_id, "xp_earned": 0})
    finally:
        db.close()