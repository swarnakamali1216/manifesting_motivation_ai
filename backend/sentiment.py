"""
sentiment.py — VADER Emotion Detection Engine (v3 — context-aware + colloquial slang)
Place in: backend/sentiment.py

Key fix: "i want to kill my friend" → stressed/frustrated, NOT crisis.
Crisis patterns in motivation.py now require SELF-directed harm only.

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

# ─────────────────────────────────────────────────────────────────────────────
# COLLOQUIAL SLANG NORMALIZER
# "kill my friend" / "murder this exam" / "destroy the competition" are NOT violent.
# We neutralize them BEFORE VADER runs, so scores are accurate.
# ─────────────────────────────────────────────────────────────────────────────
import re

# Patterns where violent-sounding words are clearly used colloquially
# e.g. "kill it", "killing this", "want to kill my friend" (frustration)
_COLLOQUIAL_VIOLENT = [
    # "kill/murder/destroy + exam/project/presentation/homework/code/bug/deadline"
    (r"\b(kill|murder|destroy|smash|crush|slay|demolish|annihilate)\b(.{0,30})\b(exam|test|project|presentation|homework|assignment|code|bug|deadline|interview|it|this|that)\b", "frustrated"),
    # "want to kill my [other person]" — frustration, not self-harm
    (r"\b(want to|gonna|going to|wanna)\b(.{0,10})\b(kill|murder|strangle|destroy)\b(.{0,20})\b(friend|brother|sister|teacher|boss|colleague|classmate|him|her|them)\b", "stressed"),
    # "kill me" in casual context: "this traffic is killing me", "math is killing me"
    (r"\b(traffic|homework|this|work|school|exam|math|physics|coding|waiting)\b(.{0,20})\b(killing me|will kill me|is killing me)\b", "stressed"),
    # Positive slang: "killed it", "slayed", "crushed it"
    (r"\b(killed it|killing it|slayed it|crushed it|crushed my|nailed it|smashed it|destroyed it|destroyed the)\b", "excited"),
]

def _colloquial_check(text):
    """
    Returns emotion string if colloquial violent language detected, else None.
    This runs BEFORE crisis detection to avoid false alarms.
    """
    lower = text.lower().strip()
    for pattern, emotion in _COLLOQUIAL_VIOLENT:
        if re.search(pattern, lower):
            return emotion
    return None

# ─────────────────────────────────────────────────────────────────────────────
# CONTEXT OVERRIDES — phrases VADER scores wrong
# ─────────────────────────────────────────────────────────────────────────────
_POSITIVE_OVERRIDES = [
    "crushed it", "crushed my workout", "crushed the", "crushed my",
    "killed it", "killing it", "slayed", "slaying it",
    "feeling unstoppable", "unstoppable", "on fire", "beast mode",
    "smashed it", "smashed my",
    "feeling amazing", "feel amazing", "feeling great", "feel great",
    "feeling proud", "so proud", "proud of myself",
    "feeling happy", "feel happy", "so happy",
    "feeling good", "feel good", "feeling fantastic",
    "nailed it", "aced it", "crushed the exam", "passed my exam",
    "got the job", "got accepted", "got in", "dream come true",
    "best day", "amazing day", "great day",
    "i won", "we won", "won the",
    "super ah iruku", "nalla iruku", "romba happy", "semma feel",
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
]

_FRUSTRATION_OVERRIDES = [
    # Classic frustration phrases that VADER may score as positive (exclamation energy)
    "so annoying", "drives me crazy", "drives me nuts", "losing my mind",
    "at my limit", "about to lose it", "fed up", "so done", "done with this",
    "can't take it", "cannot take it", "cant take it anymore",
    "want to scream", "want to cry", "makes me so mad",
    "this is too much", "overwhelmed by", "i'm losing it", "im losing it",
]

def _check_overrides(text):
    """Returns (emotion_override: str|None)"""
    lower = text.lower()
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

# Keyword fallback dict
_KEYWORDS = {
    "stressed":  ["stressed","overwhelmed","anxious","panic","pressure","deadline","too much","nervous","cant cope","tense","frustrated","annoyed","angry","irritated"],
    "sad":       ["sad","depressed","hopeless","give up","worthless","crying","broken","lonely","failed","failure","upset","miserable"],
    "excited":   ["excited","amazing","great","awesome","pumped","ready","motivated","lets go","fired up","happy","winning","incredible","fantastic"],
    "focused":   ["focused","working","studying","grinding","productive","concentrated","determined","serious","busy"],
    "tired":     ["tired","exhausted","sleepy","drained","burned out","no energy","worn out","fatigue"],
    "hopeful":   ["hope","hopeful","maybe","trying","better","improve","want to","going to","will try"],
}

def _keyword_detect(text):
    t = text.lower()
    scores = {e: sum(1 for w in ws if w in t) for e, ws in _KEYWORDS.items()}
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "neutral"


def detect_emotion(text):
    """
    Returns: { emotion, score, intensity, positive, negative, neutral, method }

    Priority order:
      1. Colloquial check  — "kill my friend" = frustrated, not crisis
      2. Context overrides — phrases VADER gets wrong
      3. VADER scoring
      4. Keyword fallback
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

    # STEP 3: VADER scoring
    if VADER_OK and _analyser:
        s = _analyser.polarity_scores(text)
        c = s["compound"]

        if   c >= 0.5:   emotion = "excited"
        elif c >= 0.2:   emotion = "focused"
        elif c >= 0.05:  emotion = "hopeful"
        elif c >= -0.1:
            kw = _keyword_detect(text)
            emotion = kw if kw in ("stressed","tired","focused","hopeful") else "neutral"
        elif c >= -0.35: emotion = "stressed"
        elif c >= -0.6:  emotion = "sad"
        else:            emotion = "sad"

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

    # STEP 4: Keyword fallback
    emotion = _keyword_detect(text)
    return {"emotion":emotion,"score":0.0,"intensity":"medium","positive":0.0,"negative":0.0,"neutral":1.0,"method":"keyword"}


# ─────────────────────────────────────────────────────────────────────────────
# Emotion → coaching config
# ─────────────────────────────────────────────────────────────────────────────
EMOTION_PROMPTS = {
    "stressed":  {"tone":"calm, grounding", "style":"Break into tiny steps. Acknowledge the pressure.", "avoid":"Don't add more to-dos."},
    "sad":       {"tone":"gentle, warm",    "style":"Validate their feelings first. Be soft.",          "avoid":"Don't rush them or be fake positive."},
    "tired":     {"tone":"gentle, honest",  "style":"Acknowledge exhaustion. Rest is productive too.",  "avoid":"Don't say just push through."},
    "neutral":   {"tone":"friendly, clear", "style":"Be direct and practical. Spark curiosity.",        "avoid":"Don't be overly emotional."},
    "focused":   {"tone":"energetic",       "style":"Match their energy. Build momentum.",              "avoid":"Don't slow them down."},
    "excited":   {"tone":"high-energy",     "style":"Match and amplify. Channel into action.",          "avoid":"Don't dampen the excitement."},
    "hopeful":   {"tone":"warm, nurturing", "style":"Make the hope feel real and achievable.",          "avoid":"Don't be vague."},
    "anxious":   {"tone":"steady, calm",    "style":"One grounding truth. Don't overwhelm.",            "avoid":"Don't list steps — keep it simple."},
    "frustrated":{"tone":"understanding",   "style":"Validate the frustration. Help redirect energy.",  "avoid":"Don't dismiss or minimize."},
}

def get_emotion_prompt(emotion):
    return EMOTION_PROMPTS.get(emotion, EMOTION_PROMPTS["neutral"])