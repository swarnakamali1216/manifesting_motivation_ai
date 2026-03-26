# Custom safety filter - no external library needed
BAD_WORDS = [
    "fuck", "shit", "bitch", "asshole", "damn", "crap",
    "bastard", "dick", "pussy", "cunt", "faggot", "retard"
]

DANGEROUS_KEYWORDS = [
    "suicide", "kill myself", "self harm", "hurt myself",
    "want to die", "end my life", "bomb", "weapon", "illegal"
]

def check_safety(text):
    text_lower = text.lower()

    # Check dangerous/crisis keywords first
    for keyword in DANGEROUS_KEYWORDS:
        if keyword in text_lower:
            return False, "support"

    # Check profanity
    for word in BAD_WORDS:
        if word in text_lower.split():
            return False, "profanity"

    return True, "safe"

def get_safety_response(reason):
    if reason == "support":
        return (
            "I noticed your message contains something that concerns me deeply. "
            "If you are going through a difficult time, please know you are not alone. "
            "Consider reaching out to a trusted person or counselor. "
            "I am here to support your positive goals — let us refocus on what you want to achieve."
        )
    if reason == "profanity":
        return (
            "Let us keep our conversation respectful and constructive. "
            "I am here to help you achieve your goals with positivity. "
            "Try rephrasing and I will be happy to help!"
        )
    return "Let us keep things positive and focused on your goals!"