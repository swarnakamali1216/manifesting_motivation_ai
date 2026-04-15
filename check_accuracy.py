import sys
sys.path.insert(0, r"C:\manifesting-motivation-ai\backend")

from sentiment import detect_emotion

# Your REAL DB data
real_data = [
    ("i want to learn c", "neutral"),
    ("motivate me for the upcoming exam", "focused"),
    ("hiii , today i feel fever not concentrate on the public exams?", "neutral"),
    ("hii i am swarna..", "neutral"),
    ("Tell me more", "neutral"),
    ("it make us long gap means what can i do ? i lost her means what can i do? without her i cannot live ?", "sad"),
    ("hiii i am maxii", "neutral"),
    ("whats your name ,can u intro urself to me ?", "neutral"),
    ("Still struggling", "sad"),
    ("today , i feel anxious due to the exam result ?", "stressed"),
    ("i want to kill my friend", "stressed"),
    ("today i feel bad due to the heavy hot climate in chennai", "sad"),
    ("ok what degree today climete in chennai?", "focused"),
    ("but in my mobile accurately shown as 30degree ? are you say lie to me?", "neutral"),
    ("can u update me today trending news?", "neutral"),
    ("what is the date tdy?", "neutral"),
    ("todays date day", "neutral"),
    ("todays date what ?", "neutral"),
    ("I feel stressed about something", "stressed"),
    ("i need rest", "neutral"),
    ("I feel stressed about my final year project deadline", "stressed"),
    ("I want to build an AI project but don't know where to start", "neutral"),
    ("Give me a roadmap to become a full stack AI developer", "focused"),
    ("I feel like giving up sometimes", "sad"),
    ("I completed my first ML model today!", "excited"),
    ("How do I connect my AI model to React frontend?", "focused"),
    ("hii, today i feel very anxious due to the exam result?", "stressed"),
    ("today is monday why u give wrong?", "sad"),
    ("can u communicate in simple english", "neutral"),
    ("but she not talk with me what can i do say me ?", "neutral"),
    ("What should I do next?", "neutral"),
    ("Still struggling", "sad"),
    ("Tell me more", "neutral"),
    ("ok , i want to became the ai stack developer ,but i have no ideas  and support me to achieve?", "focused"),
    ("current time", "neutral"),
    ("say accurate tym", "neutral"),
    ("i feel sleepy can u motivate me ? to make me enthusium?", "focused"),
    ("haan , but i cannot move from that i cannot concentrate on other thing s?", "sad"),
    ("give some solution to me ?", "focused"),
    ("give steps point by point ?real life is workable or not?", "neutral"),
    ("I feel stressed about something", "stressed"),
]

print("=" * 65)
print("MANIFESTING MOTIVATION AI — FULL PIPELINE ACCURACY")
print("(colloquial + context override + VADER + keyword fallback)")
print(f"Total sessions: {len(real_data)}")
print("=" * 65)

correct = 0
total = len(real_data)

for user_input, expected in real_data:
    result = detect_emotion(user_input)
    predicted = result["emotion"]
    method = result["method"]
    match = "✅" if predicted == expected else "❌"
    print(f"{match} '{user_input[:50]}'")
    print(f"   Expected: {expected:10s} | Got: {predicted:10s} | Method: {method}")
    if predicted == expected:
        correct += 1

accuracy = (correct / total) * 100

print()
print("=" * 65)
print(f"TOTAL TESTED : {total}")
print(f"CORRECT      : {correct}")
print(f"ACCURACY     : {accuracy:.1f}%")
print("=" * 65)
print()
print(">>> PAPER LINE:")
print(f"The multi-layer sentiment pipeline achieved {accuracy:.1f}% accuracy")
print(f"across {total} real coaching session inputs, using colloquial")
print(f"override, context override, VADER scoring, and keyword")
print(f"fallback across 6 emotion categories.")