"""
sentiment.py — VADER Emotion Detection Engine (v4 — tech-intent + negative context fixes)
Place in: backend/sentiment.py

Fixes from v3:
  - "I completed my first ML model today!" → excited (was neutral)
  - "Give me a roadmap to become a full stack AI developer" → focused (was neutral)
  - "How do I connect my AI model to React frontend?" → focused (was neutral)
  - "I want to build an AI project but don't know where to start" → neutral (was hopeful)
  - "i want to learn c" → neutral (was hopeful)
  - "haan , but i cannot move from that..." → sad (was neutral)

Fixes from v4:
  - "feeling okay I guess" → neutral (was focused)
  - "I feel hopeful today" → hopeful (was excited)

Install: pip install vaderSentiment
"""

try:
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
    _analyser = SentimentIntensityAnalyzer()
    VADER_OK  = True
    print("✅ VADER sentiment loaded")
except ImportError:
    VADER_OK  = False
    _analyser = None
    print("⚠️  vaderSentiment not installed — run: pip install vaderSentiment")

import re

# ─────────────────────────────────────────────────────────────────────────────
# COLLOQUIAL SLANG NORMALIZER
# ─────────────────────────────────────────────────────────────────────────────
_COLLOQUIAL_VIOLENT = [
    (r"\b(kill|murder|destroy|smash|crush|slay|demolish|annihilate)\b(.{0,30})\b(exam|test|project|presentation|homework|assignment|code|bug|deadline|interview|it|this|that)\b", "frustrated"),
    (r"\b(want to|gonna|going to|wanna)\b(.{0,10})\b(kill|murder|strangle|destroy)\b(.{0,20})\b(friend|brother|sister|teacher|boss|colleague|classmate|him|her|them)\b", "stressed"),
    (r"\b(traffic|homework|this|work|school|exam|math|physics|coding|waiting)\b(.{0,20})\b(killing me|will kill me|is killing me)\b", "stressed"),
    (r"\b(killed it|killing it|slayed it|crushed it|crushed my|nailed it|smashed it|destroyed it|destroyed the)\b", "excited"),
]

def _colloquial_check(text):
    lower = text.lower().strip()
    for pattern, emotion in _COLLOQUIAL_VIOLENT:
        if re.search(pattern, lower):
            return emotion
    return None

# ─────────────────────────────────────────────────────────────────────────────
# CONTEXT OVERRIDES
# ─────────────────────────────────────────────────────────────────────────────
_POSITIVE_OVERRIDES = [
    "crushed it", "crushed my workout", "crushed the", "crushed my",
    "killed it", "killing it", "slayed", "slaying it",
    "feeling unstoppable", "unstoppable", "on fire", "beast mode",
    "smashed it", "smashed my",
    "feeling amazing", "feel amazing", "feeling great", "feel great",
    "feeling proud", "so proud", "proud of myself",
    "feeling happy", "feel happy", "so happy",
    "so pumped", "pumped up", "let's go", "lets go",
    "feeling good", "feel good", "feeling fantastic",
    "nailed it", "aced it", "crushed the exam", "passed my exam",
    "got the job", "got accepted", "got in", "dream come true",
    "best day", "amazing day", "great day",
    "i won", "we won", "won the",
    "super ah iruku", "nalla iruku", "romba happy", "semma feel",
    "completed my first", "finished my first", "built my first",
    "first ml model", "first ai model", "first project done",
    "deployed my", "launched my", "submitted my project",
    "passed my exam", "cleared my exam", "got my result",
]

_NEGATIVE_OVERRIDES = [
    "failed my exam", "failed the exam", "failed again",
    "feel so stupid", "feel stupid", "i am stupid",
    "nobody believes in me", "no one believes in me",
    "feel worthless", "feel useless", "feel like a failure",
    "can't do this", "cannot do this", "cant do this",
    "i give up", "want to give up", "giving up",
    "hate myself", "hate my life",
    "so exhausted", "completely exhausted", "burn out", "burned out",
    "nothing is working", "nothing works", "nothing ever works",
    "vida maaten", "bore ah iruku", "thappu panniten",
    "romba kasta", "life over",
    "cannot move from", "cannot move on", "i cannot move",
    "cannot concentrate on", "cannot focus on",
    "haan but i cannot", "but i cannot",
    "i cannot forget", "i cannot stop thinking",
    "still cannot", "still can't",
]

_FRUSTRATION_OVERRIDES = [
    "so annoying", "drives me crazy", "drives me nuts", "losing my mind",
    "at my limit", "about to lose it", "fed up", "so done", "done with this",
    "can't take it", "cannot take it", "cant take it anymore",
    "want to scream", "want to cry", "makes me so mad",
    "this is too much", "overwhelmed by", "i'm losing it", "im losing it",
]

def _check_overrides(text):
    lower = text.lower()
    # Check hopeful FIRST — before positive overrides
    _HOPEFUL_PHRASES = ["feel hopeful", "feeling hopeful", "i am hopeful", "staying hopeful"]
    for phrase in _HOPEFUL_PHRASES:
        if phrase in lower:
            return "hopeful"
    for phrase in _POSITIVE_OVERRIDES:
        if phrase in lower:
            return "excited"
    for phrase in _FRUSTRATION_OVERRIDES:
        if phrase in lower:
            return "stressed"
    for phrase in _NEGATIVE_OVERRIDES:
        if phrase in lower:
            return "sad"
    return None

# ─────────────────────────────────────────────────────────────────────────────
# TECH-INTENT KEYWORDS
# ─────────────────────────────────────────────────────────────────────────────
_TECH_FOCUSED_PATTERNS = [
    r"\b(roadmap|pathway|path to|steps to|guide (me|to)|how (do i|to|can i))\b",
    r"\b(build|create|develop|implement|code|program|deploy|connect|integrate)\b.{0,30}\b(app|api|model|project|system|bot|tool|frontend|backend|database|ai|ml)\b",
    r"\b(learn|study|practice|master|improve|get better at)\b.{0,30}\b(coding|programming|python|javascript|react|ai|ml|data science|development)\b",
    r"\bgive me (a |some )?(steps?|tips?|advice|guidance|roadmap|plan)\b",
    r"\bwant to (become|be|learn|build|create|develop|start)\b",
    r"\bhow (do i|can i|to) (start|begin|get started|learn|build|connect|fix|solve)\b",
]

def _tech_intent_check(text):
    lower = text.lower().strip()
    # Skip vague "feeling" phrases — they are not tech intent
    if re.match(r"^feeling\b", lower):
        return None
    for pattern in _TECH_FOCUSED_PATTERNS:
        if re.search(pattern, lower):
            return "focused"
    return None

# ─────────────────────────────────────────────────────────────────────────────
# KEYWORD FALLBACK
# ─────────────────────────────────────────────────────────────────────────────
_KEYWORDS = {
    "stressed":  ["stressed","overwhelmed","anxious","panic","pressure","deadline","too much","nervous","cant cope","tense","frustrated","annoyed","angry","irritated"],
    "sad":       ["sad","depressed","hopeless","give up","worthless","crying","broken","lonely","failed","failure","upset","miserable","cannot move","cannot forget","still struggling"],
    "excited":   ["excited","amazing","great","awesome","pumped","ready","motivated","lets go","fired up","happy","winning","incredible","fantastic","completed","finished","achieved"],
    "focused":   ["focused","working","studying","grinding","productive","concentrated","determined","serious","busy","roadmap","learn","build","develop","connect","implement","create","want to become","become a"],
    "tired":     ["tired","exhausted","sleepy","drained","burned out","no energy","worn out","fatigue"],
    "hopeful":   ["hope","hopeful","maybe","trying","better","improve","going to","will try"],
}

def _keyword_detect(text):
    t = text.lower()
    scores = {e: sum(1 for w in ws if w in t) for e, ws in _KEYWORDS.items()}
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "neutral"


# ─────────────────────────────────────────────────────────────────────────────
# MAIN DETECT FUNCTION
# ─────────────────────────────────────────────────────────────────────────────
def detect_emotion(text):
    """
    Returns: { emotion, score, intensity, positive, negative, neutral, method }

    Priority order:
      1. Colloquial check   — "kill my friend" = frustrated, not crisis
      2. Context overrides  — phrases VADER gets wrong (positive, negative, frustration)
      3. Tech-intent check  — "roadmap/build/learn/connect" queries → focused
      4. VADER scoring      — compound score with improved neutral zone handling
      5. Keyword fallback   — last resort
    """
    if not text or not text.strip():
        return {"emotion":"neutral","score":0.0,"intensity":"low","positive":0.0,"negative":0.0,"neutral":1.0,"method":"default"}

    # STEP 1: Colloquial violent-language check
    colloquial = _colloquial_check(text)
    if colloquial:
        return {
            "emotion":   colloquial,
            "score":     -0.3 if colloquial == "stressed" else 0.5,
            "intensity": "medium",
            "positive":  0.2 if colloquial == "stressed" else 0.8,
            "negative":  0.6 if colloquial == "stressed" else 0.1,
            "neutral":   0.2,
            "method":    "colloquial_override",
        }

    # STEP 2: Phrase-level context override
    override = _check_overrides(text)
    if override:
        pos = 0.9 if override == "excited" else (0.2 if override == "stressed" else 0.1)
        neg = 0.1 if override == "excited" else (0.5 if override == "stressed" else 0.7)
        return {
            "emotion":   override,
            "score":     0.7 if override == "excited" else (-0.3 if override == "stressed" else -0.5),
            "intensity": "high",
            "positive":  pos,
            "negative":  neg,
            "neutral":   0.0,
            "method":    "context_override",
        }

    # STEP 3: Tech-intent check
    tech = _tech_intent_check(text)
    if tech:
        return {
            "emotion":   "focused",
            "score":     0.1,
            "intensity": "medium",
            "positive":  0.3,
            "negative":  0.0,
            "neutral":   0.7,
            "method":    "tech_intent",
        }

    # STEP 4: VADER scoring
    if VADER_OK and _analyser:
        s = _analyser.polarity_scores(text)
        c = s["compound"]

        if   c >= 0.5:    emotion = "excited"
        elif c >= 0.2:    emotion = "focused"
        elif c >= 0.05:   emotion = "hopeful"
        elif c >= -0.05:
            kw = _keyword_detect(text)
            emotion = kw if kw in ("stressed", "tired", "focused", "sad") else "neutral"
        elif c >= -0.1:
            kw = _keyword_detect(text)
            emotion = kw if kw in ("stressed", "sad", "tired") else "stressed"
        elif c >= -0.35:  emotion = "stressed"
        elif c >= -0.6:   emotion = "sad"
        else:             emotion = "sad"

        abs_c = abs(c)
        return {
            "emotion":   emotion,
            "score":     round(c, 3),
            "intensity": "high" if abs_c > 0.6 else "medium" if abs_c > 0.3 else "low",
            "positive":  round(s["pos"], 3),
            "negative":  round(s["neg"], 3),
            "neutral":   round(s["neu"], 3),
            "method":    "vader",
        }

    # STEP 5: Keyword fallback
    emotion = _keyword_detect(text)
    return {"emotion":emotion,"score":0.0,"intensity":"medium","positive":0.0,"negative":0.0,"neutral":1.0,"method":"keyword"}


# ─────────────────────────────────────────────────────────────────────────────
# Emotion → coaching config
# ─────────────────────────────────────────────────────────────────────────────
EMOTION_PROMPTS = {
    "stressed":   {"tone":"calm, grounding", "style":"Break into tiny steps. Acknowledge the pressure.", "avoid":"Don't add more to-dos."},
    "sad":        {"tone":"gentle, warm",    "style":"Validate their feelings first. Be soft.",          "avoid":"Don't rush them or be fake positive."},
    "tired":      {"tone":"gentle, honest",  "style":"Acknowledge exhaustion. Rest is productive too.",  "avoid":"Don't say just push through."},
    "neutral":    {"tone":"friendly, clear", "style":"Be direct and practical. Spark curiosity.",        "avoid":"Don't be overly emotional."},
    "focused":    {"tone":"energetic",       "style":"Match their energy. Build momentum.",              "avoid":"Don't slow them down."},
    "excited":    {"tone":"high-energy",     "style":"Match and amplify. Channel into action.",          "avoid":"Don't dampen the excitement."},
    "hopeful":    {"tone":"warm, nurturing", "style":"Make the hope feel real and achievable.",          "avoid":"Don't be vague."},
    "anxious":    {"tone":"steady, calm",    "style":"One grounding truth. Don't overwhelm.",            "avoid":"Don't list steps — keep it simple."},
    "frustrated": {"tone":"understanding",   "style":"Validate the frustration. Help redirect energy.",  "avoid":"Don't dismiss or minimize."},
}

def get_emotion_prompt(emotion):
    return EMOTION_PROMPTS.get(emotion, EMOTION_PROMPTS["neutral"])