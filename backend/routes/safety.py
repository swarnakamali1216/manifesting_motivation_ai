"""
routes/safety.py — Comprehensive Safety & Crisis Filter
Blueprint: safety_bp  (registered at /api in app.py)
"""
from flask import Blueprint, request, jsonify
import re

safety_bp = Blueprint("safety", __name__)

# ── CRISIS / SELF-HARM KEYWORDS ───────────────────────────────────────────────
CRISIS_KEYWORDS = [
    "suicide","suicidal","kill myself","killing myself","end my life","end it all","ending it all",
    "take my life","take my own life","want to die","wanna die","wish i was dead",
    "wish i were dead","better off dead","better off without me","no reason to live",
    "no point in living","not worth living","life is not worth","not worth it anymore",
    "i want to disappear","want to disappear","ready to give up","give up on life",
    "self harm","self-harm","selfharm","hurt myself","hurting myself","cut myself",
    "cutting myself","burn myself","burning myself","overdose","od myself","harm myself",
    "starving myself","starve myself","binge and purge","purging",
    "can't go on","cant go on","can't take it anymore","cant take it","at the end",
    "no way out","there is no hope","nothing left to live for","nothing to live for",
    "having a breakdown","mental breakdown","nervous breakdown","losing my mind",
    "going insane","going crazy","can't function","falling apart","completely lost",
    "i am worthless","i'm worthless","i am useless","i'm useless","i am nothing",
    "i'm nothing","nobody cares","no one cares about me","completely alone",
    "utterly hopeless","feeling hopeless","no hope","no future","no point",
    "bomb","bombing","build a bomb","make a bomb","explosive device","ied",
    "weapon of mass","bioweapon","chemical weapon","nuclear bomb","dirty bomb",
    "mass shooting","school shooting","attack people","planning attack",
    "how to make poison","how to make weapon",
    "please help me","i need help right now","in danger",
    "someone is hurting me","being abused","domestic violence",
]

# ── PROFANITY WORD LIST ───────────────────────────────────────────────────────
BAD_WORDS_EXACT = {
    "fuck","fucking","fucker","fucked","fucks","f**k","f***","f**king",
    "shit","shitting","shitty","bullshit","horseshit","sh*t","s**t",
    "bitch","bitching","bitches","b*tch","b**ch",
    "asshole","assholes","ass","asses","a**hole","a**",
    "bastard","bastards","cunt","cunts","c**t",
    "dick","dicks","d**k","cock","cocks","c**k",
    "pussy","pussies","p***y","whore","whores","wh**e",
    "slut","sluts","sl*t","nigger","nigga","n****","n***a",
    "faggot","fag","f*ggot","retard","retarded","r*tard",
    "motherfucker","motherf**ker","prick","pr*ck","twat","tw*t",
    "wanker","w*nker","arsehole","arse","bollocks","douchebag","douche",
    "jackass","dipshit","bullcrap","crap","kike","spic","chink","gook",
    "wetback","homo","tranny",
}

PROFANITY_PATTERNS = [
    r"f+[u@4][c<k]+[kq]*",
    r"sh[i1!][t7]+",
    r"b[i1!][t7]+ch",
    r"a+[s\$][s\$]+h+[o0]l",
    r"[c<][u@4]n+[t7]+",
    r"d+[i1!]+[c<][k]+",
    r"m+[o0]+[t7]+h+[e3]+r+.?f",
    r"n+[i1!]+[g9]+[g9]+[a@3]",
]
_compiled = [re.compile(p, re.IGNORECASE) for p in PROFANITY_PATTERNS]


def check_safety(text: str):
    if not text:
        return True, "safe"
    t = text.lower().strip()
    for kw in CRISIS_KEYWORDS:
        if kw in t:
            return False, "support"
    words = set(re.findall(r"[a-z\*@\$!0-9]+", t))
    if words & BAD_WORDS_EXACT:
        return False, "profanity"
    for pat in _compiled:
        if pat.search(t):
            return False, "profanity"
    return True, "safe"


def get_safety_response(reason: str) -> str:
    if reason == "support":
        return (
            "I noticed your message concerns me deeply. You are not alone.\n\n"
            "Please reach out now:\n"
            "iCall (India): 9152987821\n"
            "Vandrevala Foundation: 1860-2662-345 (24/7)\n"
            "AASRA: 9820466627\n"
            "International: https://findahelpline.com\n\n"
            "I'm here — whenever you're ready, let's focus on what we can build together."
        )
    return (
        "Let's keep our conversation respectful and constructive. "
        "I'm here to help you achieve your goals — try rephrasing!"
    )


@safety_bp.route("/safety/check", methods=["POST"])
def safety_check():
    data = request.get_json() or {}
    safe, reason = check_safety(data.get("text", ""))
    return jsonify({"safe": safe, "reason": reason,
                    "response": None if safe else get_safety_response(reason)})


@safety_bp.route("/safety/status", methods=["GET"])
def safety_status():
    return jsonify({"status": "active", "crisis_keywords": len(CRISIS_KEYWORDS),
                    "profanity_words": len(BAD_WORDS_EXACT), "regex_patterns": len(PROFANITY_PATTERNS)})