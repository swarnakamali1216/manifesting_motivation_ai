"""
routes/invite.py â€” REDESIGNED
- Allow multiple invites to same email address (no duplicate block)
- Beautiful HTML email with butterfly SVG logo + graphic design
Place at: backend/routes/invite.py
"""
import os
from flask import Blueprint, request, jsonify
import smtplib, ssl, os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from models import SessionLocal
from sqlalchemy import text as sql_text
from dotenv import load_dotenv
load_dotenv()

invite_bp = Blueprint("invite", __name__)

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))
SMTP_USER = os.getenv("SMTP_USER", "").strip()
SMTP_PASS = os.getenv("SMTP_PASS", "").replace(" ", "").strip()


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
    """
    Builds a beautiful branded HTML email with butterfly SVG logo.
    Designed to look professional â€” like a real product invite.
    """
    features = [
        ("ðŸ¤–", "AI coach that adapts to your emotions"),
        ("ðŸŽ¯", "Personalised goal roadmaps, step by step"),
        ("ðŸ“”", "Encrypted journal with AI emotional insight"),
        ("âœ…", "Daily check-ins with streaks & XP"),
        ("ðŸ†", "Badges, levels, and gamified growth"),
    ]
    rows = "".join(
        f'<tr><td style="padding:8px 0;font-size:14px;color:#c4b5fd;line-height:1.5;">'
        f'<span style="font-size:18px;vertical-align:middle;">{i}</span>'
        f'&nbsp;&nbsp;<span style="vertical-align:middle;">{t}</span></td></tr>'
        for i, t in features
    )

    # Inline butterfly SVG as data URI for email clients that support it
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

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>You've been invited to Manifesting Motivation AI</title>
</head>
<body style="margin:0;padding:0;background:#0a0a1a;font-family:'Segoe UI',Arial,sans-serif;-webkit-font-smoothing:antialiased;">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a1a;padding:32px 16px;">
  <tr><td align="center">

    <!-- Card -->
    <table width="560" cellpadding="0" cellspacing="0"
      style="background:#0f0f20;border-radius:24px;overflow:hidden;
             border:1px solid #1a1a35;
             box-shadow:0 24px 64px rgba(0,0,0,0.6);">

      <!-- HERO HEADER with gradient -->
      <tr>
        <td style="background:linear-gradient(135deg,#1a0a3a 0%,#2d0a4a 50%,#1a0a3a 100%);
                   padding:44px 40px 36px;text-align:center;
                   border-bottom:1px solid rgba(124,92,252,0.3);">

          <!-- Butterfly logo circle -->
          <div style="display:inline-flex;align-items:center;justify-content:center;
                      width:72px;height:72px;border-radius:20px;margin-bottom:18px;
                      background:rgba(255,255,255,0.06);
                      border:1.5px solid rgba(255,255,255,0.12);
                      box-shadow:0 8px 32px rgba(124,92,252,0.4);">
            {butterfly_svg}
          </div>

          <h1 style="color:#ffffff;margin:0 0 6px;font-size:26px;font-weight:800;
                     letter-spacing:-0.5px;line-height:1.2;">
            Manifesting Motivation
          </h1>
          <p style="color:rgba(196,181,253,0.85);margin:0;font-size:13px;
                    letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">
            AI Coaching Platform
          </p>

          <!-- Decorative dots -->
          <div style="margin-top:20px;display:flex;justify-content:center;gap:6px;align-items:center;">
            <div style="width:6px;height:6px;border-radius:50%;background:#7c5cfc;opacity:0.8;"></div>
            <div style="width:4px;height:4px;border-radius:50%;background:#a78bfa;opacity:0.5;"></div>
            <div style="width:3px;height:3px;border-radius:50%;background:#c4b5fd;opacity:0.3;"></div>
          </div>
        </td>
      </tr>

      <!-- BODY -->
      <tr>
        <td style="padding:36px 40px;">

          <!-- Invitation message -->
          <p style="font-size:22px;font-weight:700;color:#eeeeff;margin:0 0 10px;line-height:1.3;">
            You've been invited ðŸ¦‹
          </p>
          <p style="color:#9898c0;font-size:15px;line-height:1.75;margin:0 0 24px;">
            <span style="color:#c4b5fd;font-weight:600;">{sender_name}</span>
            {f'<span style="color:#6060a0;font-size:13px;"> &lt;{sender_email}&gt;</span>' if sender_email else ''}
            wants you to join them on
            <span style="color:#eeeeff;font-weight:600;">Manifesting Motivation AI</span>
            â€” a personal growth app that helps you set goals, track your mood,
            and get real AI coaching.
          </p>

          <!-- Feature list -->
          <table width="100%" cellpadding="0" cellspacing="0"
            style="background:rgba(124,92,252,0.06);border-radius:16px;
                   border:1px solid rgba(124,92,252,0.18);padding:4px;
                   margin-bottom:28px;">
            <tr><td style="padding:16px 20px 4px;">
              <div style="font-size:10px;font-weight:700;color:#7c5cfc;
                          letter-spacing:0.12em;margin-bottom:10px;">
                WHAT YOU GET
              </div>
            </td></tr>
            {rows}
            <tr><td style="padding:4px 20px 16px;"></td></tr>
          </table>

          <!-- CTA Button -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td align="center">
              <a href="{invite_url}"
                style="display:inline-block;padding:16px 52px;
                       background:linear-gradient(135deg,#7c5cfc,#9c7cfc);
                       color:#ffffff;border-radius:100px;text-decoration:none;
                       font-size:16px;font-weight:700;letter-spacing:0.02em;
                       box-shadow:0 8px 32px rgba(124,92,252,0.5);
                       border:1px solid rgba(255,255,255,0.1);">
                Join Free â€” Start Your Journey âœ¨
              </a>
            </td></tr>
          </table>

          <!-- URL fallback -->
          <p style="text-align:center;color:#4a4a6a;font-size:11px;margin:0 0 24px;line-height:1.8;">
            Or copy this link into your browser:<br/>
            <a href="{invite_url}" style="color:#7c5cfc;text-decoration:none;
               font-size:11px;word-break:break-all;">{invite_url}</a>
          </p>

          <!-- Divider -->
          <div style="height:1px;background:linear-gradient(90deg,transparent,#1a1a35,transparent);
                      margin:0 0 20px;"></div>

          <!-- XP reward notice -->
          <div style="background:rgba(74,222,128,0.06);border:1px solid rgba(74,222,128,0.2);
                      border-radius:12px;padding:14px 18px;display:flex;align-items:center;">
            <span style="font-size:20px;margin-right:12px;">âš¡</span>
            <div>
              <p style="color:#4ade80;font-size:13px;font-weight:700;margin:0 0 2px;">
                Welcome bonus: +25 XP when you sign up
              </p>
              <p style="color:#6060a0;font-size:11px;margin:0;">
                {sender_name} earns +50 XP when you join
              </p>
            </div>
          </div>
        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="background:#070712;padding:20px 40px;
                   border-top:1px solid #1a1a35;text-align:center;">
          <p style="color:#3a3a5a;font-size:11px;margin:0 0 6px;line-height:1.8;">
            Invited by <span style="color:#6060a0;">{sender_display}</span>
          </p>
          <p style="color:#2a2a42;font-size:10px;margin:0;line-height:1.8;">
            Manifesting Motivation AI Â· Built with ðŸ¦‹ in India<br/>
            This invite was sent on their behalf. Not interested?
            Simply ignore this email.
          </p>
        </td>
      </tr>

    </table>
    <!-- End card -->

  </td></tr>
  </table>
  <!-- End outer -->

</body>
</html>"""
    return html


@invite_bp.route("/invite/send", methods=["POST"])
def send_invite():
    """
    Allows multiple invites to same email.
    Records each invite in DB for XP tracking.
    """
    data     = request.get_json() or {}
    to_email = (data.get("email") or data.get("to_email") or "").strip()
    user_id  = data.get("user_id")

    if not to_email or "@" not in to_email:
        return jsonify({"error": "Enter a valid email address"}), 400
    if not user_id:
        return jsonify({"error": "user_id required"}), 400
    if not SMTP_USER or not SMTP_PASS:
        return jsonify({"error": "SMTP not configured in .env"}), 500

    sender_name, sender_email = get_sender(user_id)
    # APP_URL should be set in .env for production (e.g. https://yourdomain.com)
    # Falls back to localhost:3000 for local development
    app_url = os.getenv("APP_URL", "https://manifesting-motivation-ai.vercel.app/").rstrip("/")
    invite_url = f"{app_url}?ref={user_id}"

    # Build email
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"ðŸ¦‹ {sender_name} invited you to Manifesting Motivation AI"
    if sender_email:
        msg["From"]     = f"{sender_name} <{sender_email}>"
        msg["Reply-To"] = f"{sender_name} <{sender_email}>"
    else:
        msg["From"] = f"{sender_name} via Manifesting Motivation <{SMTP_USER}>"
    msg["To"]     = to_email
    msg["Sender"] = f"Manifesting Motivation <{SMTP_USER}>"

    html = build_email_html(sender_name, sender_email, invite_url)
    msg.attach(MIMEText(html, "html"))

    try:
        ctx = ssl.create_default_context()
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=ctx) as server:
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, to_email, msg.as_string())

        # Record invite in DB â€” allow duplicates (no unique constraint)
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

        print(f"[invite] âœ… {sender_name} â†’ {to_email}")
        return jsonify({
            "success": True,
            "message": f"Invite sent to {to_email} âœ…",
            "from":    sender_email or SMTP_USER,
            "to":      to_email
        })

    except smtplib.SMTPAuthenticationError:
        return jsonify({"error": "Gmail App Password wrong. Check SMTP_PASS in .env"}), 401
    except smtplib.SMTPRecipientsRefused:
        return jsonify({"error": f"Invalid recipient email: {to_email}"}), 400
    except Exception as e:
        print(f"[invite] âŒ {e}")
        return jsonify({"error": str(e)}), 500


@invite_bp.route("/invite/test", methods=["GET"])
def test_config():
    configured = bool(SMTP_USER and SMTP_PASS)
    return jsonify({
        "configured":  configured,
        "smtp_user":   SMTP_USER[:10] + "***" if SMTP_USER else "NOT SET",
        "pass_length": len(SMTP_PASS),
        "message":     "Ready âœ…" if configured else "Add SMTP_USER + SMTP_PASS to .env"
    })

@invite_bp.route("/invite/link/<int:user_id>", methods=["GET"])
def get_invite_link(user_id):
    """Return the invite link for a user."""
    link = f"https://manifesting-motivation-ai.vercel.app/?ref={user_id}&mode=signup"
    return jsonify({"link": link, "user_id": user_id})


@invite_bp.route("/invite/stats/<int:user_id>", methods=["GET"])
def get_invite_stats(user_id):
    """Return how many people this user has invited."""
    db = SessionLocal()
    try:
        row = db.execute(sql_text(
            "SELECT COUNT(*) FROM invites WHERE inviter_id=:uid"
        ), {"uid": user_id}).fetchone()
        count = row[0] if row else 0
        return jsonify({"total_invites": count, "user_id": user_id, "xp_earned": count * 50})
    except Exception as e:
        return jsonify({"total_invites": 0, "user_id": user_id, "xp_earned": 0})
    finally:
        db.close()


