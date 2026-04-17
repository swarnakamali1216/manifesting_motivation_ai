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

def build_email_html(sender_name, invite_url, ref_id):
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>You're Invited!</title>
<style>
  * {{ margin:0; padding:0; box-sizing:border-box; }}
  body {{ background:#06060f; font-family:'Segoe UI',Arial,sans-serif; }}
  .wrapper {{ width:100%; background:#06060f; padding:40px 16px; }}
  .container {{ max-width:580px; margin:0 auto; background:#0c0c1e; border-radius:28px; overflow:hidden; border:1px solid rgba(139,92,246,0.25); box-shadow:0 32px 80px rgba(0,0,0,0.6); }}
  .header {{ background:linear-gradient(160deg,#0d0520 0%,#160830 40%,#1e0635 70%,#0d0520 100%); padding:52px 40px 44px; text-align:center; position:relative; border-bottom:1px solid rgba(139,92,246,0.15); }}
  .logo-wrap {{ margin-bottom:20px; }}
  .brand-name {{ color:#ffffff; font-size:26px; font-weight:800; letter-spacing:-0.5px; margin-bottom:6px; }}
  .brand-sub {{ color:rgba(196,181,253,0.55); font-size:11px; letter-spacing:0.18em; text-transform:uppercase; }}
  .invite-badge {{ display:inline-block; margin-top:22px; background:linear-gradient(135deg,rgba(124,92,252,0.18),rgba(236,72,153,0.12)); border:1px solid rgba(139,92,246,0.35); border-radius:50px; padding:9px 28px; color:#c4b5fd; font-size:12px; font-weight:700; letter-spacing:0.06em; }}
  .body {{ padding:44px 40px; }}
  .greeting {{ color:#eeeeff; font-size:26px; font-weight:800; letter-spacing:-0.5px; margin-bottom:14px; }}
  .intro {{ color:#7878a8; font-size:15px; line-height:1.85; margin-bottom:32px; }}
  .intro strong {{ color:#c4b5fd; }}
  .intro strong.white {{ color:#eeeeff; }}
  .features-box {{ background:linear-gradient(135deg,rgba(124,92,252,0.05),rgba(236,72,153,0.03)); border:1px solid rgba(124,92,252,0.15); border-radius:18px; padding:22px 26px; margin-bottom:34px; }}
  .features-label {{ color:#7c5cfc; font-size:10px; font-weight:800; letter-spacing:0.16em; text-transform:uppercase; margin-bottom:18px; }}
  .feature-row {{ display:block; padding:9px 0; color:#a89ed0; font-size:14px; line-height:1.5; border-bottom:1px solid rgba(255,255,255,0.04); }}
  .feature-row:last-child {{ border-bottom:none; padding-bottom:0; }}
  .cta-wrap {{ text-align:center; margin-bottom:20px; }}
  .cta-btn {{ display:inline-block; padding:18px 56px; background:linear-gradient(135deg,#7c5cfc 0%,#a855f7 50%,#ec4899 100%); color:#ffffff !important; border-radius:100px; text-decoration:none !important; font-size:16px; font-weight:800; letter-spacing:-0.2px; box-shadow:0 12px 40px rgba(124,92,252,0.45); }}
  .link-box {{ background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:14px 18px; text-align:center; margin-bottom:28px; }}
  .link-box p {{ color:#3a3a5a; font-size:11px; margin-bottom:6px; }}
  .link-box a {{ color:#7c5cfc; font-size:11px; word-break:break-all; text-decoration:none; }}
  .bonus-box {{ background:linear-gradient(135deg,rgba(74,222,128,0.05),rgba(16,185,129,0.03)); border:1px solid rgba(74,222,128,0.2); border-radius:16px; padding:18px 22px; margin-bottom:28px; display:table; width:100%; }}
  .bonus-icon {{ display:table-cell; width:36px; vertical-align:middle; font-size:22px; }}
  .bonus-text {{ display:table-cell; vertical-align:middle; padding-left:12px; }}
  .bonus-text p {{ color:#4ade80; font-size:14px; font-weight:800; margin-bottom:3px; }}
  .bonus-text span {{ color:#2a5a3a; font-size:12px; }}
  .stats-wrap {{ margin-bottom:8px; border-radius:16px; overflow:hidden; border:1px solid rgba(255,255,255,0.05); }}
  .stats-table {{ width:100%; border-collapse:collapse; }}
  .stats-table td {{ padding:18px 8px; text-align:center; background:rgba(255,255,255,0.02); border-right:1px solid rgba(255,255,255,0.05); }}
  .stats-table td:last-child {{ border-right:none; }}
  .stat-num {{ font-size:22px; font-weight:900; margin-bottom:5px; }}
  .stat-lbl {{ color:#3a3a5a; font-size:9px; font-weight:800; letter-spacing:0.1em; text-transform:uppercase; }}
  .footer {{ background:#070710; padding:26px 40px; border-top:1px solid rgba(255,255,255,0.04); text-align:center; }}
  .footer p {{ color:#2a2a42; font-size:11px; line-height:1.8; }}
  .footer span {{ color:#4a4a70; }}
  .divider {{ height:1px; background:linear-gradient(90deg,transparent,rgba(124,92,252,0.2),transparent); margin:32px 0; }}
  @media only screen and (max-width:600px) {{
    .wrapper {{ padding:16px 10px !important; }}
    .container {{ border-radius:20px !important; }}
    .header {{ padding:36px 22px 32px !important; }}
    .brand-name {{ font-size:21px !important; }}
    .body {{ padding:28px 20px !important; }}
    .greeting {{ font-size:21px !important; }}
    .intro {{ font-size:14px !important; }}
    .cta-btn {{ padding:16px 28px !important; font-size:15px !important; display:block !important; }}
    .features-box {{ padding:16px 18px !important; }}
    .feature-row {{ font-size:13px !important; }}
    .stat-num {{ font-size:18px !important; }}
    .footer {{ padding:20px 18px !important; }}
    .stats-table td {{ padding:12px 4px !important; }}
    .bonus-box {{ padding:14px 16px !important; }}
  }}
</style>
</head>
<body>
<div class="wrapper">
<div class="container">

  <div class="header">
    <div class="logo-wrap">
      <img src="https://manifesting-motivation-ai.vercel.app/butterfly-logo.png"
           width="64" height="64" alt="Manifesting Motivation"
           style="display:block;margin:0 auto;filter:drop-shadow(0 0 16px rgba(124,92,252,0.55));"/>
    </div>
    <div class="brand-name">Manifesting Motivation</div>
    <div class="brand-sub">AI Coaching Platform · Dream it. Build it. Live it.</div>
    <div class="invite-badge">✨ &nbsp; You have a special invite</div>
  </div>

  <div class="body">
    <div class="greeting">Hey there! 👋</div>
    <p class="intro">
      <strong>{sender_name}</strong> thinks you'd love
      <strong class="white">Manifesting Motivation AI</strong> —
      a personal growth platform with AI coaching, goal tracking,
      mood check-ins and gamified progress. Completely free to join.
    </p>

    <div class="features-box">
      <div class="features-label">What you get for free</div>
      <span class="feature-row">🤖 &nbsp; AI coach that adapts to your emotions daily</span>
      <span class="feature-row">🎯 &nbsp; Personalised goal roadmaps, step by step</span>
      <span class="feature-row">📔 &nbsp; Private journal with AI emotional insight</span>
      <span class="feature-row">✅ &nbsp; Daily check-ins with streaks and XP</span>
      <span class="feature-row">🏆 &nbsp; Badges, levels, and gamified growth</span>
    </div>

    <div class="cta-wrap">
      <a href="https://manifesting-motivation-ai.vercel.app/?ref={ref_id}&mode=signup" class="cta-btn">
        Join Free &mdash; Start Your Journey &nbsp;✨
      </a>
    </div>

    <div class="link-box">
      <p>Or copy this link into your browser</p>
      <a href="https://manifesting-motivation-ai.vercel.app/?ref={ref_id}&mode=signup">
        manifesting-motivation-ai.vercel.app/?ref={ref_id}&mode=signup
      </a>
    </div>

    <div class="divider"></div>

    <div class="bonus-box">
      <div class="bonus-icon">⚡</div>
      <div class="bonus-text">
        <p>Welcome Bonus: +25 XP the moment you sign up!</p>
        <span>{sender_name} also earns +50 XP when you join 🎉</span>
      </div>
    </div>

    <div class="stats-wrap">
      <table class="stats-table">
        <tr>
          <td><div class="stat-num" style="color:#7c5cfc;">50+</div><div class="stat-lbl">Badges</div></td>
          <td><div class="stat-num" style="color:#4ade80;">24/7</div><div class="stat-lbl">AI Coach</div></td>
          <td><div class="stat-num" style="color:#fbbf24;">15</div><div class="stat-lbl">Levels</div></td>
          <td><div class="stat-num" style="color:#fb923c;">100%</div><div class="stat-lbl">Free</div></td>
        </tr>
      </table>
    </div>
  </div>

  <div class="footer">
    <p>Invited by &nbsp;<span>{sender_name}</span></p>
    <p style="margin-top:6px;color:#1e1e32;font-size:10px;">
      Manifesting Motivation AI &nbsp;·&nbsp; Built with 🦋 in India<br/>
      Not interested? Simply ignore this email.
    </p>
  </div>

</div>
</div>
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
                    # NEW
                    "html": build_email_html(sender_name, invite_url, user_id)
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