"""
routes/motivation.py  — FIXED VERSION
Changes from original:
  1. Module-level _groq singleton — no new Groq() per request
  2. timeout=15 on every completions.create call
  3. daily_quote also uses _groq + timeout
"""
from flask import Blueprint, request, jsonify
from models import SessionLocal
from sqlalchemy import text as sql_text
from groq import Groq
import os, sys, re, requests
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from sentiment import detect_emotion, get_emotion_prompt

motivation_bp = Blueprint("motivation", __name__)

# FIX 1: module-level singleton — created once, reused on every request
_groq = Groq(api_key=os.environ.get('GROQ_API_KEY', ''))

SELF_URL = os.environ.get("SELF_URL", "https://manifesting-motivation-backend.onrender.com/api")

def safe_str(val):
    return "" if val is None else str(val).strip()

# ── CRISIS DETECTION ─────────────────────────────────────────────────────────
COLLOQUIAL_SAFE = [
    r"\b(kill|murder|destroy|hurt|strangle)\b.{0,40}\b(friend|teacher|boss|colleague|classmate|brother|sister|him|her|them|you|u|someone|everyone)\b",
    r"\bi (kill|wanna kill|want to kill|gonna kill) (u|you)\b",
    r"\b(killing me|will kill me|is killing me)\b",
    r"\b(kill it|killed it|killing it|slayed it)\b",
]
CRISIS_PATTERNS = [
    r"\bkill myself\b", r"\bkilling myself\b",
    r"\b(want to|going to|thinking of|about to|gonna|planning to)\b.{0,20}\b(kill|end|hurt|harm)\b.{0,12}\b(myself|my life)\b",
    r"\b(suicid(e|al|ing)|self.harm|self harm|cut myself|cutting myself|overdos(e|ing))\b",
    r"\b(want to die|wish i was dead|better off dead|no reason to live|not worth living)\b",
    r"\b(end it all|end my life)\b", r"\bkms\b",
    r"\b(starving myself|hurting myself|punishing myself)\b",
]
SOFTER_DISTRESS = [
    r"\b(feeling hopeless|feel hopeless|so hopeless)\b",
    r"\b(completely worthless|feel worthless|i am worthless)\b",
    r"\b(give up on everything|giving up on life)\b",
]

CRISIS_RESPONSE = {
    "is_crisis": True,
    "response": (
        "I can hear that you're carrying something really heavy right now, and I'm glad you reached out. "
        "What you're feeling matters, and you deserve real support — more than an AI can give. "
        "Please reach out to iCall (India): 9152987821, or visit icallhelpline.org. "
        "If you're in immediate danger, please call 112. You are not alone in this. 💙"
    ),
    "emotion": "crisis",
    "resources": {"india_icall": "9152987821", "india_vandrevala": "1860-2662-345", "emergency": "112"}
}

def check_content_safety(text):
    if not text: return False, False, None
    low = text.lower().strip()
    for p in COLLOQUIAL_SAFE:
        if re.search(p, low): return False, False, None
    for p in CRISIS_PATTERNS:
        if re.search(p, low): return True, False, p
    for p in SOFTER_DISTRESS:
        if re.search(p, low): return False, True, p
    return False, False, None


# ── TOPIC DETECTION ──────────────────────────────────────────────────────────
TOPIC_PATTERNS = {
    "weather":      [r"\b(weather|temperature|degree|celsius|hot|cold|climate|rain|humid|forecast|temp)\b",
                     r"\bhow (hot|cold|warm)\b", r"\bwhat.*(weather|temperature|degree)\b"],
    "news":         [r"\b(news|trending|latest|headline|current event|what.{0,10}happen)\b",
                     r"\bupdate me\b", r"\btoday.{0,10}news\b"],
    "datetime":     [r"\b(date|day|today|what day|current date|which day)\b",
                     r"\b(time|current time|what.*time|accurate.*time)\b",
                     r"\bwhat.*month\b", r"\bwhat.*year\b"],
    "capability":   [r"\bwhat.*based.*ai\b", r"\bwhat.*can.*do\b", r"\bwhat.*you.*do\b",
                     r"\bwho.*are.*you\b", r"\bwhat.*ai\b", r"\bwhat.*llm\b",
                     r"\bwhat.*model\b", r"\bhow.*work\b"],
    "career":       [r"\b(career|job|interview|resume|cv|salary|promotion|workplace|profession|internship|placement|hire)\b",
                     r"\bhow to get.*(job|hired)\b", r"\b(linkedin|naukri|indeed)\b"],
    "academic":     [r"\b(study|exam|test|assignment|project|college|university|degree|marks|grade|jee|neet|upsc|gate|board)\b",
                     r"\b(learn|understand|concept|explain|what is|what are|how does|define)\b",
                     r"\b(python|java|javascript|coding|programming|algorithm|data structure)\b"],
    "health":       [r"\b(fever|cold|cough|headache|pain|sick|ill|disease|symptom|medicine|doctor|hospital|health|body)\b",
                     r"\b(sleep|rest|energy|tired|fatigue|immune|diet|nutrition|vitamin|protein)\b"],
    "fitness":      [r"\b(workout|exercise|gym|run|jog|yoga|weight|muscle|fat|calories|fitness|training|push.up|squat|cardio)\b",
                     r"\b(lose weight|gain muscle|get fit|get strong|body fat)\b"],
    "mental":       [r"\b(stress|anxiety|depression|mental health|therapy|therapist|counselor|mindfulness|meditation|breathing)\b",
                     r"\b(panic|overwhelm|burnout|lonely|loneliness|sad|grief|loss|trauma)\b"],
    "habits":       [r"\b(habit|routine|schedule|morning|night|daily|consistency|discipline|procrastinat|time management)\b",
                     r"\b(productive|productivity|focus|pomodoro|time block|goal setting|wake up)\b"],
    "finance":      [r"\b(money|finance|invest|saving|budget|expense|income|salary|stock|crypto|loan|debt|tax|bank)\b",
                     r"\b(sip|mutual fund|fd|nifty|sensex|rupee|upi|paytm)\b"],
    "motivation":   [r"\b(motivat|inspire|encourage|push|keep going|give up|quit|tired of|demotivat|confidence|self.esteem)\b",
                     r"\b(i can.t|i cant|i don.t know|lost|confused|stuck|help me)\b"],
    "food":         [r"\b(diet|meal|food|eat|recipe|calories|protein|carb|fat|breakfast|lunch|dinner|snack|vegetarian|vegan)\b"],
    "relationship": [r"\b(friend|family|relationship|love|breakup|partner|parents|loneliness|social|connect)\b"],
    "creativity":   [r"\b(creative|art|music|design|writing|draw|paint|hobby|passion|side project)\b"],
}

def detect_topic(msg):
    low = msg.lower()
    for topic, patterns in TOPIC_PATTERNS.items():
        for p in patterns:
            if re.search(p, low):
                return topic
    return None


def fetch_live_weather():
    try:
        resp = requests.get(SELF_URL + "/realtime/weather", timeout=6)
        if resp.status_code == 200:
            d = resp.json()
            return d.get("summary"), d
    except Exception as e:
        print(f"Weather fetch error: {e}")
    return None, None


def fetch_live_news():
    try:
        resp = requests.get(SELF_URL + "/realtime/news?q=india&n=4", timeout=8)
        if resp.status_code == 200:
            d = resp.json()
            articles = d.get("articles", [])
            if articles:
                headlines = [f"• {a['title']} ({a['source']})" for a in articles[:4]]
                return "\n".join(headlines), articles
    except Exception as e:
        print(f"News fetch error: {e}")
    return None, None


def get_user_context(db, user_id):
    parts = []
    try:
        goals = db.execute(sql_text(
            "SELECT title FROM goals WHERE user_id=:uid AND completed=FALSE ORDER BY id DESC LIMIT 3"
        ), {"uid": int(user_id)}).fetchall()
        if goals:
            parts.append("Active goals: " + ", ".join([safe_str(g[0]) for g in goals if g[0]]))
    except Exception: pass
    try:
        mood = db.execute(sql_text(
            "SELECT emotion FROM journal_entries WHERE user_id=:uid ORDER BY id DESC LIMIT 1"
        ), {"uid": int(user_id)}).fetchone()
        if mood and mood[0]: parts.append(f"Recent mood: {safe_str(mood[0])}")
    except Exception: pass
    try:
        row = db.execute(sql_text("SELECT current_streak FROM users WHERE id=:uid"), {"uid": int(user_id)}).fetchone()
        if row and row[0]: parts.append(f"Streak: {row[0]} days")
    except Exception: pass
    return "\n".join(parts) if parts else "New user."


# ── SYSTEM PROMPTS ────────────────────────────────────────────────────────────
BASE_RULES = """
IDENTITY: You are the AI Coach for Manifesting Motivation — a caring friend who is also wise.
LANGUAGE: Clear, warm English. Simple and genuine.
BANNED WORDS: Tamil slang, "dei", "da", "machi", "yaar", "bro", "ah?".

CORE RULES:
- Emotional message → acknowledge feeling FIRST, then help.
- Information question → give the ACTUAL ANSWER directly.
- NEVER respond to sadness with hype or toxic positivity.
- NEVER make up facts, temperatures, dates, or news.
- NEVER deflect — always give something useful.
"""

TOPIC_SYSTEM = {
    "weather":      BASE_RULES + "\nMODE: WEATHER\nIf [LIVE WEATHER DATA] is provided, use exact numbers. Give temperature, condition, comfort tip. If no live data: say you can't access live weather.",
    "news":         BASE_RULES + "\nMODE: NEWS\nIf [LIVE NEWS HEADLINES] are provided, present them naturally. If no live data: direct to timesofindia.com, ndtv.com. NEVER invent headlines.",
    "datetime":     BASE_RULES + "\nMODE: DATE AND TIME\nThe [SYSTEM CONTEXT] block has EXACT current date, day and time from user device. Extract it and answer directly. Never guess.",
    "capability":   BASE_RULES + "\nMODE: ABOUT THIS AI\nYou are Manifesting Motivation AI Coach, powered by LLaMA 3.3 70B via Groq. You can: emotional coaching, goal roadmaps, habit advice, career guidance, study help, fitness plans. Be honest and warm.",
    "career":       BASE_RULES + "\nMODE: CAREER COACH\nGive specific actionable advice. Resume tips, interview prep, LinkedIn. For roadmaps: name actual tools, platforms, certifications. 80-150 words. End with encouragement.",
    "academic":     BASE_RULES + "\nMODE: ACADEMIC MENTOR\nExplain concepts clearly with examples. For study plans: Pomodoro, spaced repetition, active recall. For project ideas: give 2-3 specific ideas with tech stack. 80-150 words.",
    "health":       BASE_RULES + "\nMODE: HEALTH COACH (NOT A DOCTOR)\nGive practical wellness advice. ALWAYS end with: 'I'm a coach, not a doctor. If symptoms persist, please see a qualified doctor.' NEVER diagnose. NEVER prescribe.",
    "fitness":      BASE_RULES + "\nMODE: FITNESS COACH\nGive specific workout advice: exercise names, sets, reps, rest time. Always include warm-up reminder. 80-150 words. Encouraging.",
    "mental":       BASE_RULES + "\nMODE: MENTAL WELLNESS (NOT A THERAPIST)\nLead with genuine empathy. Give one practical technique. For serious concerns: recommend iCall (9152987821). NEVER diagnose. 2-4 warm sentences.",
    "habits":       BASE_RULES + "\nMODE: HABITS COACH\nDraw on habit science: habit stacking, 2-minute rule. For procrastination: 5-second rule, body doubling. Specific and actionable. 80-150 words.",
    "finance":      BASE_RULES + "\nMODE: FINANCIAL WELLNESS (NOT A FINANCIAL ADVISOR)\nGeneral personal finance: budgeting, saving, emergency funds. For Indian users: mention SIP, PPF, NPS. NEVER recommend specific stocks. Say you're a coach not an advisor.",
    "motivation":   BASE_RULES + "\nMODE: MOTIVATIONAL COACH\nAcknowledge their struggle specifically. Share one truth that makes them feel less alone. Then give ONE practical next step — smallest possible action. 2-4 sentences.",
    "food":         BASE_RULES + "\nMODE: NUTRITION COACH\nPractical meal planning. For Indian context: dal, rice, roti, vegetables. Specific and achievable. 80-150 words.",
    "relationship": BASE_RULES + "\nMODE: RELATIONSHIP SUPPORT\nLead with empathy. NEVER take sides. 2-4 warm sentences.",
    "creativity":   BASE_RULES + "\nMODE: CREATIVITY COACH\nEncourage and inspire. Specific techniques for creative blocks. Warm, enthusiastic. 80-150 words.",
}

EMOTIONAL_SYSTEM = BASE_RULES + """
MODE: EMOTIONAL COACH
Your only job: make this person feel genuinely heard and less alone.
1. Acknowledge their specific feeling in one warm genuine sentence.
2. Say something REAL that normalises their experience.
3. Offer ONE concrete thing — comfort, a small step, or a question.
Max 3-4 sentences. No bullet points. No lists.
BANNED: "It sounds like...", "I can hear that...", "That must be..."
BANNED: Responding to sadness with excitement or hype."""

ANSWER_SYSTEM = BASE_RULES + """
MODE: KNOWLEDGE MENTOR
Give real, specific, useful answers.
- Project ideas: name 2-3 specific projects with tech stack
- Roadmaps: clear phases in prose (no bullet points)
- Explanations: clear analogy first, then detail
- 80-150 words. NO bullet lists. NO numbered lists.
- End with one warm line of encouragement.
- NEVER deflect. JUST ANSWER."""

PERSONA_SUFFIX = {
    "mentor":  "Wise, warm mentor. Honest and grounded. Max 4 sentences.",
    "coach":   "Focused performance coach. Short, energising. Max 3 sentences.",
    "zen":     "Calm, grounded presence. One thoughtful insight. Max 2 sentences.",
    "hype":    "Their biggest supporter. Warm specific praise. Max 3 sentences.",
    "general": "Warm friend-mentor. Adapts to mood. Max 4 sentences.",
}

EMOTION_INSTRUCTIONS = {
    "positive":   "They're happy. Match warmth with real celebration.",
    "excited":    "CAREFUL: VADER sometimes scores loneliness as excited. Read the actual words.",
    "focused":    "Task mode. Quick acknowledgment + one concrete next step.",
    "hopeful":    "Nurture it. Be specific and encouraging.",
    "neutral":    "READ THE CONTENT carefully — respond to what they actually said.",
    "stressed":   "Acknowledge first. Then ONE practical thing they can do right now.",
    "anxious":    "One steady grounding sentence. Make them feel less alone first.",
    "frustrated": "Validate the frustration FIRST. Then gently redirect energy.",
    "sad":        "DO NOT motivate. DO NOT silver-line. Acknowledge how heavy this is.",
    "negative":   "Dark, low place. No toxic positivity. Just honest, kind presence.",
}

REQUEST_PATTERNS = [
    r"\bgive\b.*\bidea\b", r"\bgive\b.*\bme\b", r"\bany idea\b", r"\bsuggest\b",
    r"\brecommend\b", r"\bwhat.*should\b", r"\bhow.*can\b", r"\broad\s?map\b",
    r"\bstep.*by.*step\b", r"\bshow\s+me\b", r"\bwhat.*do\b", r"\bwhat.*is\b",
    r"\bwhat.*are\b", r"\bhow.*do\b", r"\bhelp.*me\b", r"\bexplain\b",
    r"\btell.*me\b", r"\bsolution\b", r"\bproject.*idea\b", r"\bfinal.*year\b",
    r"\bplan\b", r"\bnext.*step\b", r"\bidea\b", r"\btopic\b",
    r"\bwhat.*based\b", r"\bwhat.*can.*do\b",
]
FOLLOWUP_PATTERNS = [
    r"^(yes|yeah|yep|sure|ok|okay|please|go ahead|do it|give|tell|show|send|share|explain|continue|go on|proceed|pls|plz|go)[\s?!.]*$",
]
GRIEF_PATTERNS = [
    r"\b(lost|loss|lose)\b.{0,25}\b(friend|family|mother|father|parent|brother|sister|grandma|grandpa|someone|them|her|him)\b",
    r"\b(someone).{0,25}\b(died|passed|gone|dead|accident|passed away)\b",
    r"\b(accident|passed away|died|death|funeral|grieving|grief|mourning)\b",
    r"\b(miss them|miss him|miss her|i miss my)\b",
]


# ── MAIN ROUTE ────────────────────────────────────────────────────────────────
@motivation_bp.route("/motivate", methods=["POST"])
def motivate():
    db   = SessionLocal()
    data = request.get_json() or {}
    user_id              = data.get("user_id")
    message              = data.get("message", "").strip()
    persona              = data.get("persona", "mentor")
    conversation_history = data.get("conversation_history", "")
    real_date_context    = data.get("real_date_context", "")

    if not real_date_context:
        now = datetime.now()
        real_date_context = (
            f"[SYSTEM CONTEXT: Today is {now.strftime('%A')}, "
            f"{now.strftime('%d %B %Y')}. "
            f"Current time: {now.strftime('%I:%M %p')} IST.]"
        )

    try:
        # Crisis check
        is_crisis, is_soft_distress, _ = check_content_safety(message)
        if is_crisis:
            print(f"CRISIS for user {user_id}: {message[:60]}")
            if user_id:
                try:
                    db.execute(sql_text(
                        "INSERT INTO motivation_sessions (user_id, user_input, ai_response, emotion, created_at) "
                        "VALUES (:uid, :msg, :resp, 'crisis', NOW())"
                    ), {"uid": int(user_id), "msg": message, "resp": "[CRISIS — helplines shown]"})
                    db.commit()
                except Exception:
                    try: db.rollback()
                    except: pass
            return jsonify(CRISIS_RESPONSE), 200

        # Emotion detection
        emotion_data = detect_emotion(message)
        emotion      = emotion_data["emotion"]
        vader_score  = emotion_data["score"]
        vader_method = emotion_data["method"]
        print(f"VADER: '{message[:50]}' → {emotion} ({vader_score}) [{vader_method}]")

        msg_lower = message.lower()
        is_grief  = any(re.search(p, msg_lower) for p in GRIEF_PATTERNS)
        if not is_grief and conversation_history:
            is_grief = any(re.search(p, conversation_history.lower()) for p in GRIEF_PATTERNS)
        if is_grief:
            emotion = "sad"; vader_score = -0.8
            print("  → GRIEF OVERRIDE")

        context_str = get_user_context(db, user_id) if user_id else "New user."

        # Detect mode
        is_followup       = any(re.search(p, msg_lower) for p in FOLLOWUP_PATTERNS)
        user_wants_answer = any(re.search(p, msg_lower) for p in REQUEST_PATTERNS)
        ends_with_q       = msg_lower.rstrip().endswith("?")
        topic             = detect_topic(message)
        is_emotional      = emotion in ("sad", "stressed", "anxious", "frustrated", "negative") and not user_wants_answer and not ends_with_q
        answer_mode       = (user_wants_answer or ends_with_q or is_followup) and not is_emotional

        # Fetch live data
        live_data = ""
        if topic == "weather":
            ws, _ = fetch_live_weather()
            live_data = f"\n[LIVE WEATHER DATA]: {ws}" if ws else "\n[WEATHER UNAVAILABLE]: Tell user to check phone weather app."
        elif topic == "news":
            ns, _ = fetch_live_news()
            live_data = f"\n[LIVE NEWS]:\n{ns}" if ns else "\n[NEWS UNAVAILABLE]: Direct to timesofindia.com, ndtv.com."

        # Build system prompt
        if topic and topic in TOPIC_SYSTEM:
            system_msg = real_date_context + live_data + "\n\n" + TOPIC_SYSTEM[topic]
        elif is_emotional or emotion in ("sad", "stressed", "anxious", "frustrated", "negative"):
            system_msg = real_date_context + "\n\n" + EMOTIONAL_SYSTEM
        elif answer_mode:
            system_msg = real_date_context + "\n\n" + ANSWER_SYSTEM
        else:
            suffix = PERSONA_SUFFIX.get(persona, PERSONA_SUFFIX["general"])
            system_msg = real_date_context + "\n\n" + BASE_RULES + f"\nYOUR PERSONA: {suffix}"

        conv_messages = [{"role": "system", "content": system_msg}]
        if conversation_history:
            for line in conversation_history.strip().split("\n"):
                line = line.strip()
                if line.startswith("user:"):
                    conv_messages.append({"role": "user", "content": line[5:].strip()})
                elif line.startswith("bot:"):
                    conv_messages.append({"role": "assistant", "content": line[4:].strip()})

        emotion_tip  = EMOTION_INSTRUCTIONS.get(emotion, "Meet them where they are.")
        conv_summary = ""
        if conversation_history and is_followup:
            recent = [l.strip() for l in conversation_history.strip().split("\n") if l.strip()][-6:]
            conv_summary = "\nRECENT CONVERSATION:\n" + "\n".join(recent) + "\n\nUser confirmed — deliver what was discussed."

        if topic in ("weather", "news", "datetime", "capability"):
            user_prompt = (
                f"{real_date_context}\n{live_data}\n\n"
                f"User asked: \"{message}\"\n\n"
                f"Answer using the data provided. Be specific and accurate. 2-3 sentences."
            )
        elif answer_mode:
            user_prompt = (
                f"User said: \"{message or 'Help me.'}\"\n"
                f"Context: {context_str}\nEmotion: {emotion}{conv_summary}\n\n"
                f"Give the actual answer. Specific. 80-150 words. No bullet lists. End with encouragement."
            )
        elif is_emotional:
            user_prompt = (
                f"They said: \"{message}\"\n"
                f"Detected emotion: {emotion}\nGuidance: {emotion_tip}\nContext: {context_str}\n\n"
                f"Lead with genuine empathy. 2-4 warm sentences. Make them feel heard first."
            )
        else:
            user_prompt = (
                f"They said: \"{message or 'I need some motivation.'}\"\n"
                f"Emotion: {emotion} (score:{vader_score})\nGuidance: {emotion_tip}\nContext: {context_str}\n\n"
                f"Respond warmly. 2-4 sentences."
            )

        conv_messages.append({"role": "user", "content": user_prompt})

        # FIX 2: Use module-level _groq + timeout=15
        rt = topic in ("weather", "news", "datetime", "capability")
        max_tok = 100 if rt else (180 if answer_mode else 100)
        resp = _groq.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=conv_messages,
            max_tokens=max_tok,
            temperature=0.75,
            timeout=15,
        )
        reply = resp.choices[0].message.content.strip()

        # Clean numbered lists
        lines = reply.split("\n"); clean = []
        for l in lines:
            c = re.sub(r"^\s*\d+\.\s*", "", l.strip())
            if c: clean.append(c)
        reply = " ".join(clean)
        reply = " ".join(reply.split())

        # Word cap
        word_limit = 80 if rt else (140 if answer_mode else 65)
        words = reply.split()
        if len(words) > word_limit:
            trunc    = " ".join(words[:word_limit])
            last_end = max(trunc.rfind("."), trunc.rfind("?"), trunc.rfind("!"))
            if last_end > 20: reply = trunc[:last_end + 1]

        # Save session + XP + streak
        xp_awarded = 0; streak_count = 0; sessions_count = 0
        if user_id and message:
            try:
                db.execute(sql_text(
                    "INSERT INTO motivation_sessions "
                    "(user_id, user_input, ai_response, emotion, vader_score, created_at) "
                    "VALUES (:uid, :msg, :resp, :emo, :vs, NOW())"
                ), {"uid": int(user_id), "msg": message[:1000], "resp": reply[:2000],
                    "emo": emotion, "vs": float(vader_score) if vader_score is not None else 0.0})
                db.commit()
            except Exception:
                try: db.rollback()
                except: pass
                try:
                    db.execute(sql_text(
                        "INSERT INTO motivation_sessions (user_id, user_input, ai_response, emotion, created_at) "
                        "VALUES (:uid, :msg, :resp, :emo, NOW())"
                    ), {"uid": int(user_id), "msg": message[:1000], "resp": reply[:2000], "emo": emotion})
                    db.commit()
                except Exception: pass

            # Award XP
            try:
                xp_awarded = 10
                db.execute(sql_text("UPDATE users SET xp=COALESCE(xp,0)+:xp WHERE id=:uid"),
                           {"xp": xp_awarded, "uid": int(user_id)})
                db.commit()
            except Exception:
                try: db.rollback()
                except: pass

            # Update streak
            try:
                from streak_utils import update_user_streak
                streak_count, _ = update_user_streak(db, int(user_id))
            except Exception as se:
                print(f"[motivate] streak_utils error: {se}")

            try:
                row = db.execute(sql_text("SELECT COUNT(*) FROM motivation_sessions WHERE user_id=:uid"),
                                 {"uid": int(user_id)}).fetchone()
                sessions_count = row[0] if row else 0
            except Exception: pass

            # Check badges
            try:
                from routes.gamification import check_and_award_badges as cab
                cab(db, int(user_id))
            except Exception: pass

        return jsonify({
            "response":         reply,
            "persona":          persona,
            "emotion":          emotion,
            "vader_score":      vader_score,
            "intensity":        emotion_data["intensity"],
            "method":           vader_method,
            "topic_detected":   topic,
            "is_soft_distress": is_soft_distress,
            "xp_awarded":       xp_awarded,
            "current_streak":   streak_count,
            "sessions_count":   sessions_count,
        })

    except Exception as e:
        print(f"Motivation error: {e}")
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@motivation_bp.route("/motivate/analyse", methods=["POST"])
def analyse_emotion():
    data   = request.get_json() or {}
    result = detect_emotion(data.get("text", ""))
    result["emotion_config"] = get_emotion_prompt(result["emotion"])
    return jsonify(result)


@motivation_bp.route("/motivate/quote", methods=["GET"])
def daily_quote():
    # FIX: use _groq singleton + timeout=15
    try:
        resp = _groq.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": "One powerful motivational quote under 20 words. Just the quote, no author, no quote marks."}],
            max_tokens=40,
            timeout=15,
        )
        return jsonify({"quote": resp.choices[0].message.content.strip().strip('"').strip("'")})
    except Exception as e:
        return jsonify({"quote": "Every step forward is progress. Keep going.", "error": str(e)})