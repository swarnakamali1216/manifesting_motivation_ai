"""
routes/invite.py - Brevo SMTP VERSION
Sends to anyone for free using Brevo SMTP
"""
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from flask import Blueprint, request, jsonify
from models import SessionLocal
from sqlalchemy import text as sql_text

invite_bp = Blueprint("invite", __name__)

SMTP_HOST = os.getenv("SMTP_HOST", "smtp-relay.brevo.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
FROM_EMAIL = os.getenv("SMTP_FROM", "Manifesting Motivation <7b00a3001@smtp-brevo.com>")

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


def send_smtp_email(to_email, subject, html_body):
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = FROM_EMAIL
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html"))
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.ehlo()
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.sendmail(SMTP_USER, to_email, msg.as_string())


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
            <strong style="color:#fff;">Manifesting Motivation AI</strong> - 
            a personal growth app with AI coaching, goal tracking, and daily check-ins.
          </p>
          <table width="100%" style="margin:24px 0;">
            <tr><td align="center">
              <a href="{invite_url}"
                style="display:inline-block;padding:16px 48px;
                background:linear-gradient(135deg,#7c5cfc,#9c7cfc);
                color:#fff;border-radius:100px;text-decoration:none;
                font-size:16px;font-weight:700;">
                Join Free - Start Your Journey
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
          <p style="color:#3a3a5a;font-size:11px;margin:0;">Manifesting Motivation AI - Built with love in India</p>
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
    if not SMTP_USER or not SMTP_PASS:
        return jsonify({"error": "Email not configured"}), 500

    sender_name, _ = get_sender(user_id)
    app_url    = "https://manifesting-motivation-ai.vercel.app"
    invite_url = f"{app_url}?ref={user_id}"

    try:
        subject = f"{sender_name} invited you to Manifesting Motivation AI"
        html    = build_email_html(sender_name, invite_url)
        send_smtp_email(to_email, subject, html)
        print(f"[invite] Sent: {sender_name} to {to_email}")

        try:
            db = SessionLocal()
            db.execute(sql_text(
                "INSERT INTO invites (inviter_id, to_email, status, created_at) "
                "VALUES (:uid, :email, \'sent\', NOW())"
            ), {"uid": int(user_id), "email": to_email})
            db.commit()
            db.close()
        except Exception as e:
            print(f"[invite] DB error: {e}")

        return jsonify({"success": True, "message": f"Invite sent to {to_email}!"})

    except Exception as e:
        print(f"[invite] Error: {e}")
        return jsonify({"error": str(e)}), 500


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
