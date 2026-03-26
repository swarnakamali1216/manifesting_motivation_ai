"""
INVITE LINK FIX — invite.py

THE PROBLEM:
  Your .env has: APP_URL=http://localhost:3000
  So invite emails send: http://localhost:3000?ref=3
  When your friend clicks it → "This site cannot be reached" ✗
  Because "localhost" = YOUR OWN computer. Not the internet.

THE SOLUTION (choose one):

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OPTION A: Use ngrok (free, works right now, 5 minutes)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ngrok creates a public URL that tunnels to your localhost.

Step 1: Download ngrok → https://ngrok.com/download
Step 2: Run in a new terminal:
    ngrok http 3000

Step 3: ngrok gives you a URL like:
    https://abc123.ngrok-free.app

Step 4: Update backend/.env:
    APP_URL=https://abc123.ngrok-free.app

Step 5: Restart Flask (python app.py)

Step 6: NOW send the invite — the link will work for anyone!

Note: Free ngrok URL changes every time you restart ngrok.
      For permanent URL, use ngrok paid plan or deploy to a server.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OPTION B: Deploy to the internet (permanent solution)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Deploy your app to a server so it has a real URL.
Options: Railway, Render, Heroku, DigitalOcean, AWS.
Once deployed: APP_URL=https://your-real-domain.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The invite.py code below is UNCHANGED from the last version.
Only your APP_URL in .env needs to change.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
from flask import Blueprint, request, jsonify
from models import SessionLocal
from sqlalchemy import text as sql_text
import os, smtplib, ssl, traceback
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

invite_bp = Blueprint("invite", __name__)

SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "465"))
SMTP_USER = os.environ.get("SMTP_USER", "")
_raw      = os.environ.get("SMTP_PASS","") or os.environ.get("SMTP_PASSWORD","")
SMTP_PASSWORD = _raw.replace(" ","")
APP_URL  = os.environ.get("APP_URL", "http://localhost:3000")
APP_NAME = "Manifesting Motivation"

print(f"📧 INVITE: user={SMTP_USER or 'NOT SET'} | pass={'SET' if SMTP_PASSWORD else 'NOT SET'} | test=http://localhost:5000/api/invite/test-smtp")
print(f"🌐 APP_URL = {APP_URL}  ← must be a public URL for invites to work")


def build_html(from_name: str, invite_url: str) -> str:
    features = [
        ("✓", f"<strong style='color:#4ade80;'>+25 XP</strong> free just for joining — instant head start"),
        ("✓", "AI coach available <strong style='color:#ffffff;'>24/7</strong> — career, fitness, mindset, anything"),
        ("✓", "50 badges to earn · 15 levels to unlock · real gamification"),
        ("✓", f"<strong style='color:#a78bfa;'>{from_name}</strong> earns +50 XP when you join ⚡"),
    ]
    feature_rows = "".join([f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
      <tr>
        <td style="width:28px;vertical-align:middle;">
          <span style="display:inline-block;width:20px;height:20px;background:rgba(74,222,128,0.18);border-radius:50%;text-align:center;line-height:20px;font-size:10px;color:#4ade80;font-weight:800;">{icon}</span>
        </td>
        <td style="padding-left:10px;vertical-align:middle;">
          <span style="font-size:14px;color:#d0cde8;line-height:1.5;">{text}</span>
        </td>
      </tr>
    </table>""" for icon, text in features])

    stats = [("🏆","50","#fbbf24","Badges"),("⚡","15","#a78bfa","Levels"),("🤖","24/7","#4ade80","AI Coach")]
    stat_cells = "".join([f"""
    <td style="text-align:center;padding:16px 10px;background:rgba(255,255,255,0.04);border-radius:12px;">
      <div style="font-size:20px;margin-bottom:5px;">{emoji}</div>
      <div style="font-size:20px;font-weight:800;color:{color};line-height:1;">{stat}</div>
      <div style="font-size:9px;color:rgba(255,255,255,0.35);margin-top:4px;text-transform:uppercase;letter-spacing:0.08em;">{label}</div>
    </td>
    {"<td style='width:8px;'></td>" if i < 2 else ""}
    """ for i,(emoji,stat,color,label) in enumerate(stats)])

    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>{from_name} invited you to {APP_NAME}</title></head>
<body style="margin:0;padding:0;background:#080816;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#080816;padding:40px 16px;">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:linear-gradient(160deg,#13122a 0%,#190f38 100%);border-radius:24px;overflow:hidden;border:1px solid rgba(124,92,252,0.3);box-shadow:0 40px 80px rgba(0,0,0,0.6);">
  <tr><td style="height:3px;background:linear-gradient(90deg,#7c5cfc,#fc5cf0,#60a5fa);"></td></tr>
  <tr><td style="padding:44px 40px 32px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06);">
    <h1 style="margin:0 0 8px;font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;line-height:1.2;">{APP_NAME}</h1>
    <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.4);letter-spacing:0.1em;text-transform:uppercase;">AI Coaching Platform</p>
  </td></tr>
  <tr><td style="padding:36px 40px 24px;">
    <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#ffffff;">Hey there! 👋</p>
    <p style="margin:0 0 28px;font-size:15px;color:rgba(255,255,255,0.65);line-height:1.75;">
      <strong style="color:#a78bfa;">{from_name}</strong> just invited you to join <strong style="color:#ffffff;">{APP_NAME}</strong> — an AI that coaches you through goals, tracks your mood, and helps you grow every single day.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(124,92,252,0.07);border:1px solid rgba(124,92,252,0.2);border-radius:16px;margin-bottom:32px;">
      <tr><td style="padding:22px 24px;">
        <p style="margin:0 0 16px;font-size:11px;font-weight:700;color:#a78bfa;letter-spacing:0.12em;text-transform:uppercase;">🎁 Your welcome package</p>
        {feature_rows}
      </td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr><td style="text-align:center;">
        <a href="{invite_url}" style="display:inline-block;padding:17px 52px;background:linear-gradient(135deg,#7c5cfc 0%,#9c6cfc 100%);color:#ffffff;text-decoration:none;border-radius:100px;font-weight:700;font-size:16px;box-shadow:0 12px 40px rgba(124,92,252,0.5);">
          🚀 &nbsp;Join Free Now
        </a>
        <p style="margin:12px 0 0;font-size:11px;color:rgba(255,255,255,0.3);">No credit card · Free forever</p>
      </td></tr>
    </table>
    <hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:0 0 20px;">
    <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.3);text-align:center;line-height:1.8;">
      Or copy this link:<br>
      <a href="{invite_url}" style="color:#7c5cfc;word-break:break-all;font-size:11px;">{invite_url}</a>
    </p>
  </td></tr>
  <tr><td style="padding:0 40px 32px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>{stat_cells}</tr>
    </table>
  </td></tr>
  <tr><td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
    <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.2);line-height:1.8;">
      Sent by <strong style="color:rgba(255,255,255,0.35);">{from_name}</strong> via {APP_NAME}<br>
      You received this because your friend wanted to share something they love 💜
    </p>
  </td></tr>
  <tr><td style="height:3px;background:linear-gradient(90deg,#60a5fa,#7c5cfc,#fc5cf0);"></td></tr>
</table>
</td></tr></table>
</body></html>"""


def send_email(to_email: str, from_name: str, ref_code: str):
    if not SMTP_USER:
        return False, "SMTP_USER not set in .env"
    if not SMTP_PASSWORD:
        return False, "SMTP_PASS not set in .env"

    invite_url = f"{APP_URL}?ref={ref_code}"

    # Warn if still localhost
    if "localhost" in APP_URL or "127.0.0.1" in APP_URL:
        print(f"⚠️  WARNING: APP_URL={APP_URL} — invite links won't work for external users!")
        print("   Run: ngrok http 3000  →  copy the URL  →  set APP_URL=https://xxx.ngrok-free.app in .env")

    html_body  = build_html(from_name, invite_url)
    text_body  = f"Hey! {from_name} invited you to {APP_NAME}.\nJoin free: {invite_url}"

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"✨ {from_name} invited you to {APP_NAME}"
        msg["From"]    = f"{from_name} via {APP_NAME} <{SMTP_USER}>"
        msg["To"]      = to_email
        msg.attach(MIMEText(text_body, "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html",  "utf-8"))

        ctx = ssl.create_default_context()
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=ctx, timeout=20) as s:
            s.login(SMTP_USER, SMTP_PASSWORD)
            s.sendmail(SMTP_USER, to_email, msg.as_string())

        print(f"✅ Invite sent: {SMTP_USER} → {to_email} | URL: {invite_url}")
        return True, None

    except Exception as e:
        print(f"❌ Email error: {e}")
        return False, str(e)


@invite_bp.route("/invite/test-smtp", methods=["GET"])
def test_smtp():
    conn_ok, conn_err = False, None
    issues = []
    if not SMTP_USER: issues.append("SMTP_USER missing")
    if not SMTP_PASSWORD: issues.append("SMTP_PASS missing")
    if "localhost" in APP_URL: issues.append(f"APP_URL={APP_URL} — invite links won't work externally! Use ngrok.")
    if SMTP_USER and SMTP_PASSWORD:
        try:
            ctx = ssl.create_default_context()
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=ctx, timeout=10) as s:
                s.login(SMTP_USER, SMTP_PASSWORD); conn_ok = True
        except Exception as e: conn_err = str(e)
    return jsonify({
        "status":         "READY ✅" if conn_ok else "BROKEN ❌",
        "smtp_user":      SMTP_USER or "NOT SET",
        "app_url":        APP_URL,
        "invite_url_ok":  "localhost" not in APP_URL,
        "connection_ok":  conn_ok,
        "connection_err": conn_err,
        "config_issues":  issues,
        "fix_invite_url": "Run: ngrok http 3000  →  set APP_URL=https://xxx.ngrok-free.app in backend/.env",
    })


@invite_bp.route("/invite/send", methods=["POST"])
def send_invite():
    db   = SessionLocal()
    data = request.get_json() or {}
    user_id      = data.get("user_id")
    friend_email = (data.get("email") or "").strip().lower()

    if not friend_email or "@" not in friend_email:
        return jsonify({"error": "Please enter a valid email address."}), 400
    if not user_id:
        return jsonify({"error": "You must be logged in."}), 401

    try:
        user_row = db.execute(sql_text("SELECT id, name, email FROM users WHERE id=:uid"), {"uid":int(user_id)}).fetchone()
        if not user_row: return jsonify({"error":"User not found."}), 404

        sender_name = user_row[1] or "A friend"
        ref_code    = str(user_row[0])
        invite_url  = f"{APP_URL}?ref={ref_code}"

        try:
            ex = db.execute(sql_text("SELECT id FROM invites WHERE inviter_id=:uid AND invited_email=:e"),{"uid":int(user_id),"e":friend_email}).fetchone()
            if ex: return jsonify({"error":f"You already invited {friend_email}."}), 400
        except Exception: pass

        try:
            db.execute(sql_text("INSERT INTO invites (inviter_id,invited_email,created_at,status) VALUES (:uid,:e,NOW(),'pending')"),{"uid":int(user_id),"e":friend_email})
            db.commit()
        except Exception:
            try: db.rollback()
            except: pass
            try:
                db.execute(sql_text("CREATE TABLE IF NOT EXISTS invites (id SERIAL PRIMARY KEY, inviter_id INTEGER NOT NULL, invited_email TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW(), status TEXT DEFAULT 'pending', UNIQUE(inviter_id,invited_email))"))
                db.execute(sql_text("INSERT INTO invites (inviter_id,invited_email,created_at,status) VALUES (:uid,:e,NOW(),'pending')"),{"uid":int(user_id),"e":friend_email})
                db.commit()
            except Exception as e2:
                try: db.rollback()
                except: pass

        ok, err = send_email(friend_email, sender_name, ref_code)
        if ok:
            localhost_warning = "localhost" in APP_URL
            return jsonify({
                "success":    True,
                "email_sent": True,
                "message":    f"Invite sent to {friend_email}! 🎉" + (" ⚠️ But the link goes to localhost — use ngrok so they can actually open it!" if localhost_warning else " You'll earn +50 XP when they join."),
                "invite_url": invite_url,
                "localhost_warning": localhost_warning,
            })
        else:
            return jsonify({"success":True,"email_sent":False,"message":"Invite saved but email failed.","invite_url":invite_url,"debug":err})

    except Exception as e:
        try: db.rollback()
        except: pass
        return jsonify({"error":str(e)}), 500
    finally:
        db.close()


@invite_bp.route("/invite/link/<int:user_id>", methods=["GET"])
def get_invite_link(user_id):
    return jsonify({"link":f"{APP_URL}?ref={user_id}","ref_code":str(user_id),"localhost_warning":"localhost" in APP_URL})


@invite_bp.route("/invite/stats/<int:user_id>", methods=["GET"])
def invite_stats(user_id):
    db = SessionLocal()
    try:
        total=joined=0
        try:
            r=db.execute(sql_text("SELECT COUNT(*) FROM invites WHERE inviter_id=:uid"),{"uid":user_id}).fetchone(); total=r[0] if r else 0
        except Exception: pass
        try:
            r=db.execute(sql_text("SELECT COUNT(*) FROM invites WHERE inviter_id=:uid AND status='joined'"),{"uid":user_id}).fetchone(); joined=r[0] if r else 0
        except Exception: pass
        return jsonify({"total_invited":total,"joined":joined,"xp_earned":joined*50})
    except Exception as e:
        return jsonify({"error":str(e)}), 500
    finally:
        db.close()


@invite_bp.route("/invite/claim", methods=["POST"])
def claim_invite():
    db=SessionLocal(); data=request.get_json() or {}
    new_user_id=data.get("new_user_id"); ref_code=data.get("ref_code")
    if not ref_code or not new_user_id: return jsonify({"ok":False}), 400
    try:
        inv=int(ref_code)
        db.execute(sql_text("UPDATE users SET xp=COALESCE(xp,0)+50 WHERE id=:uid"),{"uid":inv})
        db.execute(sql_text("UPDATE users SET xp=COALESCE(xp,0)+25 WHERE id=:uid"),{"uid":int(new_user_id)})
        try:
            db.execute(sql_text("UPDATE invites SET status='joined' WHERE inviter_id=:inv AND invited_email=(SELECT email FROM users WHERE id=:nuid)"),{"inv":inv,"nuid":int(new_user_id)})
        except Exception: pass
        db.commit()
        return jsonify({"ok":True})
    except Exception as e:
        try: db.rollback()
        except: pass
        return jsonify({"ok":False,"error":str(e)}), 500
    finally:
        db.close()